-- =========================================================================
-- ALFFA NIGER — ADMINISTRATION SANS SERVEUR NODE
--
-- Contexte : le site est hébergé en statique (LWS, Vercel). Il n'y a donc
-- aucun processus Node pour vérifier un mot de passe ou écrire en base.
-- La connexion à /api/admin/login renvoyait la page HTML d'accueil, d'où
-- l'erreur « Unexpected token '<' ... is not valid JSON ».
--
-- SOLUTION : l'administration passe par des fonctions PostgreSQL
-- (SECURITY DEFINER), appelables depuis le navigateur avec la clé publique.
-- Le mot de passe est vérifié EN BASE, la clé service_role n'est jamais
-- exposée, et les tables d'administration sont invisibles en lecture directe.
--
-- Le script est idempotent.
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -------------------------------------------------------------------------
-- 1. Tables d'administration (aucune politique : invisibles pour anon)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_credentials (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  password_hash TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_sessions (
  token TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS public.admin_login_attempts (
  id BIGSERIAL PRIMARY KEY,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  success BOOLEAN NOT NULL
);

ALTER TABLE public.admin_credentials    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_sessions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_login_attempts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.admin_credentials    FROM anon, authenticated;
REVOKE ALL ON public.admin_sessions       FROM anon, authenticated;
REVOKE ALL ON public.admin_login_attempts FROM anon, authenticated;

-- -------------------------------------------------------------------------
-- 2. Vérification de session
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_assert(p_token TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_token IS NULL
     OR NOT EXISTS (
       SELECT 1 FROM public.admin_sessions
       WHERE token = p_token AND expires_at > now()
     )
  THEN
    RAISE EXCEPTION 'Session expirée ou invalide. Veuillez vous reconnecter.'
      USING ERRCODE = '28000';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_check(p_token TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_sessions
    WHERE token = p_token AND expires_at > now()
  );
$$;

-- -------------------------------------------------------------------------
-- 3. Connexion / déconnexion / mot de passe
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_login(p_password TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_hash TEXT;
  v_failures INT;
  v_token TEXT;
BEGIN
  -- Anti-force brute : 10 échecs sur 15 minutes bloquent la connexion.
  SELECT count(*) INTO v_failures
  FROM public.admin_login_attempts
  WHERE success = false AND attempted_at > now() - interval '15 minutes';

  IF v_failures >= 10 THEN
    RAISE EXCEPTION 'Trop de tentatives échouées. Réessayez dans quelques minutes.'
      USING ERRCODE = '53300';
  END IF;

  SELECT password_hash INTO v_hash FROM public.admin_credentials WHERE id = 1;

  IF v_hash IS NULL OR crypt(coalesce(p_password, ''), v_hash) <> v_hash THEN
    INSERT INTO public.admin_login_attempts (success) VALUES (false);
    RAISE EXCEPTION 'Mot de passe incorrect.' USING ERRCODE = '28P01';
  END IF;

  INSERT INTO public.admin_login_attempts (success) VALUES (true);
  DELETE FROM public.admin_sessions WHERE expires_at < now();

  v_token := encode(gen_random_bytes(32), 'hex');
  INSERT INTO public.admin_sessions (token, expires_at)
  VALUES (v_token, now() + interval '12 hours');

  RETURN v_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_logout(p_token TEXT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  DELETE FROM public.admin_sessions WHERE token = p_token;
$$;

CREATE OR REPLACE FUNCTION public.admin_change_password(p_token TEXT, p_new_password TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.admin_assert(p_token);

  IF p_new_password IS NULL OR length(p_new_password) < 8 THEN
    RAISE EXCEPTION 'Le nouveau mot de passe doit comporter au moins 8 caractères.'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.admin_credentials
  SET password_hash = crypt(p_new_password, gen_salt('bf', 10)),
      updated_at = now()
  WHERE id = 1;

  -- Toutes les autres sessions sont invalidées.
  DELETE FROM public.admin_sessions WHERE token <> p_token;
END;
$$;

-- -------------------------------------------------------------------------
-- 4. Écritures — une fonction par entité
-- -------------------------------------------------------------------------

-- Produits
CREATE OR REPLACE FUNCTION public.admin_save_product(p_token TEXT, p JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.admin_assert(p_token);

  INSERT INTO public.products
  SELECT * FROM jsonb_populate_record(NULL::public.products, p)
  ON CONFLICT (id) DO UPDATE SET
    shop = EXCLUDED.shop,
    name = EXCLUDED.name,
    brand = EXCLUDED.brand,
    category = EXCLUDED.category,
    price = EXCLUDED.price,
    availability = EXCLUDED.availability,
    capacity = EXCLUDED.capacity,
    colors = EXCLUDED.colors,
    condition = EXCLUDED.condition,
    reference = EXCLUDED.reference,
    description = EXCLUDED.description,
    specs = EXCLUDED.specs,
    model = EXCLUDED.model,
    image = EXCLUDED.image,
    source_image = EXCLUDED.source_image,
    is_new = EXCLUDED.is_new,
    hidden = EXCLUDED.hidden,
    -- La fiche produit envoyée par l'administration ne porte pas d'ordre :
    -- on conserve alors la position existante. Un ordre explicite est respecté.
    display_order = COALESCE(EXCLUDED.display_order, public.products.display_order);
END;
$$;

CREATE OR REPLACE FUNCTION public.products_fill_display_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.display_order IS NULL THEN
    -- Un UPSERT (« INSERT … ON CONFLICT ») déclenche AUSSI ce BEFORE INSERT,
    -- y compris lorsque la fiche existe déjà. Dans ce cas la position
    -- actuelle doit être conservée : sinon une simple modification
    -- déplacerait l'article en fin de liste.
    IF EXISTS (SELECT 1 FROM public.products WHERE id = NEW.id) THEN
      SELECT display_order INTO NEW.display_order
        FROM public.products WHERE id = NEW.id;
    ELSE
      SELECT COALESCE(MAX(display_order), 0) + 1
        INTO NEW.display_order
        FROM public.products
       WHERE shop = NEW.shop;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Réorganisation manuelle : reçoit la liste ordonnée des identifiants d'une
-- boutique et écrit la position 1, 2, 3… dans `display_order`.
-- Les articles non cités (cas rare : ajout concurrent) sont replacés à la
-- suite, dans leur ordre relatif actuel.
CREATE OR REPLACE FUNCTION public.admin_reorder_products(
  p_token TEXT,
  p_shop TEXT,
  p_ordered_ids TEXT[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_base INT;
BEGIN
  PERFORM public.admin_assert(p_token);

  IF p_shop IS NULL OR p_shop NOT IN ('electronique', 'textile') THEN
    RAISE EXCEPTION 'Boutique inconnue.' USING ERRCODE = '22023';
  END IF;

  IF p_ordered_ids IS NULL OR cardinality(p_ordered_ids) = 0 THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM unnest(p_ordered_ids) AS x WHERE x IS NULL) THEN
    RAISE EXCEPTION 'Liste d''identifiants invalide.' USING ERRCODE = '22023';
  END IF;

  UPDATE public.products p
     SET display_order = t.ord
    FROM (
      SELECT id, ord::INT AS ord
        FROM unnest(p_ordered_ids) WITH ORDINALITY AS u(id, ord)
    ) t
   WHERE p.id = t.id
     AND p.shop = p_shop;

  v_base := cardinality(p_ordered_ids);

  WITH rest AS (
    SELECT id, row_number() OVER (ORDER BY display_order NULLS LAST, id) AS rn
      FROM public.products
     WHERE shop = p_shop
       AND NOT (id = ANY (p_ordered_ids))
  )
  UPDATE public.products p
     SET display_order = v_base + r.rn
    FROM rest r
   WHERE p.id = r.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_product(p_token TEXT, p_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.admin_assert(p_token);
  DELETE FROM public.products WHERE id = p_id;
END;
$$;

-- Marques
CREATE OR REPLACE FUNCTION public.admin_save_brand(p_token TEXT, p JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.admin_assert(p_token);

  INSERT INTO public.brands
  SELECT * FROM jsonb_populate_record(NULL::public.brands, p)
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    logo = EXCLUDED.logo,
    source_logo = EXCLUDED.source_logo,
    display_order = EXCLUDED.display_order;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_brand(p_token TEXT, p_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.admin_assert(p_token);
  DELETE FROM public.brands WHERE id = p_id;
END;
$$;

-- Paramètres du site
CREATE OR REPLACE FUNCTION public.admin_save_settings(p_token TEXT, p JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.admin_assert(p_token);

  UPDATE public.site_settings SET
    name                  = coalesce(p->>'name', name),
    slogan                = coalesce(p->>'slogan', slogan),
    whatsapp_electronique = coalesce(p->>'whatsapp_electronique', whatsapp_electronique),
    whatsapp_textile      = coalesce(p->>'whatsapp_textile', whatsapp_textile),
    phone                 = coalesce(p->>'phone', phone),
    address               = coalesce(p->>'address', address),
    email                 = coalesce(p->>'email', email),
    hours                 = coalesce(p->>'hours', hours),
    facebook              = coalesce(p->>'facebook', facebook),
    instagram             = coalesce(p->>'instagram', instagram),
    tiktok                = coalesce(p->>'tiktok', tiktok),
    maps_electronique     = coalesce(p->>'maps_electronique', maps_electronique),
    maps_textile          = coalesce(p->>'maps_textile', maps_textile),
    site_url              = coalesce(p->>'site_url', site_url),
    legal_name            = coalesce(p->>'legal_name', legal_name),
    legal_info            = coalesce(p->>'legal_info', legal_info),
    privacy_text          = coalesce(p->>'privacy_text', privacy_text),
    hero_title            = coalesce(p->>'hero_title', hero_title),
    hero_subtitle         = coalesce(p->>'hero_subtitle', hero_subtitle),
    elec_intro            = coalesce(p->>'elec_intro', elec_intro),
    textile_intro         = coalesce(p->>'textile_intro', textile_intro),
    updated_at            = now()
  WHERE id = 1;
END;
$$;

-- Sélections « à la une » : remplacement complet
CREATE OR REPLACE FUNCTION public.admin_save_featured(p_token TEXT, p JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item JSONB;
  v_index INT;
BEGIN
  PERFORM public.admin_assert(p_token);

  DELETE FROM public.featured;

  v_index := 0;
  FOR v_item IN SELECT * FROM jsonb_array_elements(coalesce(p->'electronique', '[]'::jsonb)) LOOP
    v_index := v_index + 1;
    INSERT INTO public.featured (shop, product_id, display_order)
    VALUES ('electronique', trim(both '"' from v_item::text), v_index)
    ON CONFLICT (shop, product_id) DO NOTHING;
  END LOOP;

  v_index := 0;
  FOR v_item IN SELECT * FROM jsonb_array_elements(coalesce(p->'textile', '[]'::jsonb)) LOOP
    v_index := v_index + 1;
    INSERT INTO public.featured (shop, product_id, display_order)
    VALUES ('textile', trim(both '"' from v_item::text), v_index)
    ON CONFLICT (shop, product_id) DO NOTHING;
  END LOOP;
END;
$$;

-- Références entrepreneuriales
CREATE OR REPLACE FUNCTION public.admin_save_reference(p_token TEXT, p JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.admin_assert(p_token);

  INSERT INTO public.experience_references
  SELECT * FROM jsonb_populate_record(NULL::public.experience_references, p)
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    domain = EXCLUDED.domain,
    description = EXCLUDED.description,
    beneficiary = EXCLUDED.beneficiary,
    procedure = EXCLUDED.procedure,
    location = EXCLUDED.location,
    execution = EXCLUDED.execution,
    validation = EXCLUDED.validation,
    published = EXCLUDED.published,
    photos = EXCLUDED.photos,
    documents = EXCLUDED.documents,
    display_order = EXCLUDED.display_order,
    updated_at = EXCLUDED.updated_at,
    published_at = EXCLUDED.published_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_reference(p_token TEXT, p_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.admin_assert(p_token);
  DELETE FROM public.experience_references WHERE id = p_id;
END;
$$;

-- -------------------------------------------------------------------------
-- 5. Droits d'exécution
-- -------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.admin_assert(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_login(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_check(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_logout(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_change_password(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_save_product(TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_delete_product(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_reorder_products(TEXT, TEXT, TEXT[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_save_brand(TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_delete_brand(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_save_settings(TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_save_featured(TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_save_reference(TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_delete_reference(TEXT, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_login(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_check(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_logout(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_change_password(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_product(TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_product(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reorder_products(TEXT, TEXT, TEXT[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_brand(TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_brand(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_settings(TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_featured(TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_reference(TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_reference(TEXT, TEXT) TO anon, authenticated;
