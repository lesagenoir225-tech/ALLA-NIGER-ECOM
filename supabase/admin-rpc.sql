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
  success BOOLEAN NOT NULL,
  -- Appareil à l'origine de la tentative : l'anti-force brute est par appareil.
  ip TEXT NOT NULL DEFAULT 'inconnu'
);

CREATE INDEX IF NOT EXISTS admin_login_attempts_ip_idx
  ON public.admin_login_attempts (ip, attempted_at DESC);

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
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  -- Session glissante : chaque usage repousse l'expiration à 12 h.
  UPDATE public.admin_sessions
     SET expires_at = now() + interval '12 hours'
   WHERE token = p_token AND expires_at > now()
     AND expires_at < now() + interval '11 hours';

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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  UPDATE public.admin_sessions
     SET expires_at = now() + interval '12 hours'
   WHERE token = p_token AND expires_at > now()
     AND expires_at < now() + interval '11 hours';

  RETURN EXISTS (
    SELECT 1 FROM public.admin_sessions
    WHERE token = p_token AND expires_at > now()
  );
END;
$$;

-- -------------------------------------------------------------------------
-- 3. Connexion / déconnexion / mot de passe
-- -------------------------------------------------------------------------
-- IP du client telle que PostgREST la transmet (Kong ajoute x-forwarded-for).
CREATE OR REPLACE FUNCTION public.admin_request_ip()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(
      btrim(split_part(
        COALESCE(current_setting('request.headers', true), '{}')::json ->> 'x-forwarded-for',
        ',', 1
      )),
      ''
    ),
    NULLIF(btrim(COALESCE(current_setting('request.headers', true), '{}')::json ->> 'cf-connecting-ip'), ''),
    'inconnu'
  );
$$;

REVOKE ALL ON FUNCTION public.admin_request_ip() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_login(p_password TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_hash      TEXT;
  v_failures  INT;
  v_ip        TEXT := public.admin_request_ip();
  v_password  TEXT := btrim(COALESCE(p_password, ''));
  v_token     TEXT;
BEGIN
  -- Ménage : au-delà de deux jours, l'historique ne sert plus.
  DELETE FROM public.admin_login_attempts WHERE attempted_at < now() - interval '2 days';

  -- Anti-force brute limité à CET appareil : une faute de frappe (ou les
  -- essais d'un inconnu) ne verrouille plus l'accès du gérant.
  SELECT count(*) INTO v_failures
  FROM public.admin_login_attempts
  WHERE success = false
    AND ip = v_ip
    AND attempted_at > now() - interval '15 minutes';

  IF v_failures >= 10 THEN
    RAISE EXCEPTION 'Trop de tentatives échouées depuis cet appareil. Réessayez dans quelques minutes.'
      USING ERRCODE = '53300';
  END IF;

  SELECT password_hash INTO v_hash FROM public.admin_credentials WHERE id = 1;

  IF v_hash IS NULL OR crypt(v_password, v_hash) <> v_hash THEN
    INSERT INTO public.admin_login_attempts (success, ip) VALUES (false, v_ip);
    IF v_failures + 1 >= 9 THEN
      RAISE EXCEPTION 'Mot de passe incorrect. Encore % essai(s) avant un blocage temporaire.', GREATEST(0, 10 - (v_failures + 1))
        USING ERRCODE = '28P01';
    END IF;
    RAISE EXCEPTION 'Mot de passe incorrect.' USING ERRCODE = '28P01';
  END IF;

  -- Succès : les échecs de cet appareil sont effacés.
  DELETE FROM public.admin_login_attempts WHERE success = false AND ip = v_ip;
  INSERT INTO public.admin_login_attempts (success, ip) VALUES (true, v_ip);
  DELETE FROM public.admin_sessions WHERE expires_at < now();

  v_token := encode(gen_random_bytes(32), 'hex');
  INSERT INTO public.admin_sessions (token, expires_at)
  VALUES (v_token, now() + interval '12 hours');

  RETURN v_token;
END;
$$;
-- Version JSON de la connexion (utilisée par l'interface à jour).
-- Aucune exception n'est levée : une exception annulerait l'enregistrement de
-- la tentative ratée, et l'anti-force brute ne compterait donc rien.
CREATE OR REPLACE FUNCTION public.admin_login_v2(p_password TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_hash     TEXT;
  v_failures INT;
  v_ip       TEXT := public.admin_request_ip();
  v_password TEXT := btrim(COALESCE(p_password, ''));
  v_token    TEXT;
BEGIN
  DELETE FROM public.admin_login_attempts WHERE attempted_at < now() - interval '2 days';

  SELECT count(*) INTO v_failures
  FROM public.admin_login_attempts
  WHERE success = false AND ip = v_ip AND attempted_at > now() - interval '15 minutes';

  IF v_failures >= 10 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'locked',
      'message', 'Trop de tentatives échouées depuis cet appareil. Patientez quelques minutes, ou connectez-vous depuis un autre appareil.');
  END IF;

  SELECT password_hash INTO v_hash FROM public.admin_credentials WHERE id = 1;

  IF v_hash IS NULL OR crypt(v_password, v_hash) <> v_hash THEN
    INSERT INTO public.admin_login_attempts (success, ip) VALUES (false, v_ip);
    v_failures := v_failures + 1;
    RETURN jsonb_build_object('ok', false, 'reason', 'password',
      'remaining', GREATEST(0, 10 - v_failures),
      'message', CASE WHEN v_failures >= 8
        THEN 'Mot de passe incorrect. Encore ' || GREATEST(0, 10 - v_failures) || ' essai(s) avant un blocage temporaire de cet appareil.'
        ELSE 'Mot de passe incorrect.' END);
  END IF;

  DELETE FROM public.admin_login_attempts WHERE success = false AND ip = v_ip;
  INSERT INTO public.admin_login_attempts (success, ip) VALUES (true, v_ip);
  DELETE FROM public.admin_sessions WHERE expires_at < now();

  v_token := encode(gen_random_bytes(32), 'hex');
  INSERT INTO public.admin_sessions (token, expires_at)
  VALUES (v_token, now() + interval '12 hours');

  RETURN jsonb_build_object('ok', true, 'token', v_token);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_login_v2(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_login_v2(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_logout(p_token TEXT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
  DELETE FROM public.admin_sessions WHERE token = p_token;
$$;

CREATE OR REPLACE FUNCTION public.admin_change_password(p_token TEXT, p_new_password TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
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
SET search_path = public, extensions, pg_temp
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
SET search_path = public, extensions, pg_temp
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
SET search_path = public, extensions, pg_temp
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
SET search_path = public, extensions, pg_temp
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
SET search_path = public, extensions, pg_temp
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
SET search_path = public, extensions, pg_temp
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
SET search_path = public, extensions, pg_temp
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
SET search_path = public, extensions, pg_temp
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
SET search_path = public, extensions, pg_temp
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
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  PERFORM public.admin_assert(p_token);
  DELETE FROM public.experience_references WHERE id = p_id;
END;
$$;

-- -------------------------------------------------------------------------
-- 4 bis. GESTION DE STOCK ET REÇUS
--        Ces fonctions sont les seules à pouvoir lire/écrire le stock depuis
--        un site statique. Elles vérifient le jeton administrateur en base.
-- -------------------------------------------------------------------------

-- Vue d'ensemble : produits + quantités + totaux + derniers mouvements.
CREATE OR REPLACE FUNCTION public.admin_stock_overview(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_items JSONB;
  v_movements JSONB;
  v_totals JSONB;
BEGIN
  PERFORM public.admin_assert(p_token);

  SELECT COALESCE(jsonb_agg(row ORDER BY row->>'shop', row->>'name'), '[]'::jsonb)
    INTO v_items
    FROM (
      SELECT jsonb_build_object(
        'productId', p.id,
        'shop', p.shop,
        'name', p.name,
        'price', p.price,
        'costPrice', s.cost_price,
        'quantity', COALESCE(s.quantity, 0),
        'alertThreshold', COALESCE(s.alert_threshold, 3),
        'updatedAt', COALESCE(s.updated_at, 0)
      ) AS row
      FROM public.products p
      LEFT JOIN public.stock_items s ON s.product_id = p.id
    ) t;

  SELECT jsonb_build_object(
    'lines', COUNT(*),
    'quantity', COALESCE(SUM(COALESCE(s.quantity, 0)), 0),
    'costValue', COALESCE(SUM(COALESCE(s.quantity, 0) * COALESCE(s.cost_price, 0)), 0),
    'saleValue', COALESCE(SUM(COALESCE(s.quantity, 0) * COALESCE(p.price, 0)), 0),
    'alertCount', COUNT(*) FILTER (
      WHERE COALESCE(s.quantity, 0) > 0 AND COALESCE(s.quantity, 0) <= COALESCE(s.alert_threshold, 3)
    ),
    'outCount', COUNT(*) FILTER (WHERE COALESCE(s.quantity, 0) = 0)
  )
    INTO v_totals
    FROM public.products p
    LEFT JOIN public.stock_items s ON s.product_id = p.id;

  SELECT COALESCE(jsonb_agg(m ORDER BY (m->>'createdAt')::BIGINT DESC), '[]'::jsonb)
    INTO v_movements
    FROM (
      SELECT jsonb_build_object(
        'id', id::TEXT,
        'productId', product_id,
        'productName', product_name,
        'shop', shop,
        'type', type,
        'quantity', quantity,
        'unitCost', unit_cost,
        'reason', reason,
        'note', note,
        'receiptId', receipt_id,
        'author', author,
        'createdAt', created_at
      ) AS m
      FROM public.stock_movements
      ORDER BY created_at DESC, id DESC
      LIMIT 200
    ) t;

  RETURN jsonb_build_object('items', v_items, 'totals', v_totals, 'movements', v_movements);
END;
$$;

-- Mouvement de stock. `quantity` est toujours positif, sauf pour un
-- ajustement (delta signé). Le stock ne descend jamais sous zéro.
CREATE OR REPLACE FUNCTION public.admin_stock_move(p_token TEXT, p JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_product_id TEXT := p->>'productId';
  v_type TEXT := COALESCE(p->>'type', 'entree');
  v_qty INT := COALESCE((p->>'quantity')::INT, 0);
  v_current INT;
  v_delta INT;
  v_new INT;
  v_name TEXT;
  v_shop TEXT;
  v_alert INT;
BEGIN
  PERFORM public.admin_assert(p_token);

  IF v_product_id IS NULL OR v_product_id = '' THEN
    RAISE EXCEPTION 'Produit requis.' USING ERRCODE = '22023';
  END IF;
  IF v_type NOT IN ('entree', 'sortie', 'vente', 'retour', 'inventaire', 'ajustement') THEN
    RAISE EXCEPTION 'Type de mouvement inconnu.' USING ERRCODE = '22023';
  END IF;
  IF v_type <> 'ajustement' AND v_qty < 0 THEN
    RAISE EXCEPTION 'La quantité doit être positive.' USING ERRCODE = '22023';
  END IF;

  SELECT name, shop INTO v_name, v_shop FROM public.products WHERE id = v_product_id;
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'Produit introuvable.' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.stock_items (product_id) VALUES (v_product_id)
  ON CONFLICT (product_id) DO NOTHING;

  SELECT quantity INTO v_current FROM public.stock_items WHERE product_id = v_product_id;
  v_current := COALESCE(v_current, 0);

  v_delta := CASE v_type
    WHEN 'entree'     THEN v_qty
    WHEN 'retour'     THEN v_qty
    WHEN 'sortie'     THEN -v_qty
    WHEN 'vente'      THEN -v_qty
    WHEN 'inventaire' THEN v_qty - v_current
    ELSE v_qty -- ajustement : delta signé fourni tel quel
  END;

  v_new := GREATEST(0, v_current + v_delta);
  -- Delta réellement appliqué (une sortie plus grande que le stock est plafonnée).
  v_delta := v_new - v_current;

  UPDATE public.stock_items
     SET quantity = v_new,
         alert_threshold = COALESCE((p->>'alertThreshold')::INT, alert_threshold),
         cost_price = COALESCE((p->>'costPrice')::NUMERIC, cost_price),
         updated_at = (extract(epoch from now()) * 1000)::BIGINT
   WHERE product_id = v_product_id;

  IF v_delta <> 0 OR v_type = 'inventaire' THEN
    INSERT INTO public.stock_movements (
      product_id, product_name, shop, type, quantity, unit_cost,
      reason, note, receipt_id, author, created_at
    ) VALUES (
      v_product_id, v_name, COALESCE(v_shop, ''), v_type, v_delta,
      (p->>'unitCost')::NUMERIC,
      COALESCE(p->>'reason', ''), COALESCE(p->>'note', ''),
      NULLIF(p->>'receiptId', ''), COALESCE(p->>'author', ''),
      (extract(epoch from now()) * 1000)::BIGINT
    );
  END IF;

  RETURN jsonb_build_object(
    'productId', v_product_id,
    'quantity', v_new,
    'delta', v_delta,
    'alertThreshold', COALESCE((SELECT alert_threshold FROM public.stock_items WHERE product_id = v_product_id), 3)
  );
END;
$$;

-- Liste des reçus (du plus récent au plus ancien).
CREATE OR REPLACE FUNCTION public.admin_list_receipts(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_result JSONB;
BEGIN
  PERFORM public.admin_assert(p_token);

  SELECT COALESCE(jsonb_agg(r ORDER BY (r->>'createdAt')::BIGINT DESC), '[]'::jsonb)
    INTO v_result
    FROM (
      SELECT jsonb_build_object(
        'id', id,
        'number', number,
        'clientName', client_name,
        'clientPhone', client_phone,
        'items', items,
        'subtotal', subtotal,
        'discount', discount,
        'total', total,
        'paymentMethod', payment_method,
        'amountPaid', amount_paid,
        'changeDue', change_due,
        'note', note,
        'status', status,
        'affectStock', affect_stock,
        'author', author,
        'createdAt', created_at,
        'updatedAt', updated_at
      ) AS r
      FROM public.receipts
    ) t;

  RETURN v_result;
END;
$$;

-- Création d'un reçu. Les montants sont TOUJOURS recalculés en base à partir
-- des lignes : un total falsifié côté navigateur est ignoré. Les quantités
-- vendues sont déduites du stock dans la même transaction.
CREATE OR REPLACE FUNCTION public.admin_save_receipt(p_token TEXT, p JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_id TEXT := NULLIF(p->>'id', '');
  v_number TEXT;
  v_items JSONB := COALESCE(p->'items', '[]'::jsonb);
  v_subtotal NUMERIC := 0;
  v_discount NUMERIC := GREATEST(0, COALESCE((p->>'discount')::NUMERIC, 0));
  v_total NUMERIC;
  v_paid NUMERIC := GREATEST(0, COALESCE((p->>'amountPaid')::NUMERIC, 0));
  v_affect BOOLEAN := COALESCE((p->>'affectStock')::BOOLEAN, true);
  v_status TEXT;
  v_created BIGINT := (extract(epoch from now()) * 1000)::BIGINT;
  v_year TEXT := to_char(now(), 'YYYY');
  v_seq INT;
  v_line JSONB;
  v_existing TEXT;
BEGIN
  PERFORM public.admin_assert(p_token);

  IF jsonb_array_length(v_items) = 0 THEN
    RAISE EXCEPTION 'Un reçu doit contenir au moins un article.' USING ERRCODE = '22023';
  END IF;

  -- Recalcul des totaux côté serveur.
  SELECT COALESCE(SUM(
           GREATEST(0, COALESCE((item->>'quantity')::INT, 0)) *
           GREATEST(0, COALESCE((item->>'unitPrice')::NUMERIC, 0))
         ), 0)
    INTO v_subtotal
    FROM jsonb_array_elements(v_items) AS item;

  v_total := GREATEST(0, v_subtotal - v_discount);

  v_status := CASE
    WHEN v_paid >= v_total AND v_total > 0 THEN 'paye'
    WHEN v_paid > 0 THEN 'partiel'
    ELSE 'credit'
  END;

  IF v_id IS NULL THEN
    v_id := 'rec-' || v_created::TEXT || '-' || substr(md5(random()::TEXT), 1, 6);
  END IF;

  IF EXISTS (SELECT 1 FROM public.receipts WHERE id = v_id) THEN
    RAISE EXCEPTION 'Ce reçu existe déjà : un reçu ne se modifie pas, il s’annule.'
      USING ERRCODE = '23505';
  END IF;

  -- Numérotation séquentielle annuelle : REC-2026-0001
  SELECT COUNT(*) + 1 INTO v_seq FROM public.receipts WHERE number LIKE 'REC-' || v_year || '-%';
  LOOP
    v_number := 'REC-' || v_year || '-' || lpad(v_seq::TEXT, 4, '0');
    SELECT number INTO v_existing FROM public.receipts WHERE number = v_number;
    EXIT WHEN v_existing IS NULL;
    v_seq := v_seq + 1;
  END LOOP;

  INSERT INTO public.receipts (
    id, number, client_name, client_phone, items, subtotal, discount, total,
    payment_method, amount_paid, change_due, note, status, affect_stock,
    author, created_at, updated_at
  ) VALUES (
    v_id, v_number,
    COALESCE(p->>'clientName', ''),
    COALESCE(p->>'clientPhone', ''),
    v_items, v_subtotal, v_discount, v_total,
    COALESCE(NULLIF(p->>'paymentMethod', ''), 'espece'),
    v_paid, GREATEST(0, v_paid - v_total),
    COALESCE(p->>'note', ''),
    v_status, v_affect,
    COALESCE(p->>'author', ''),
    v_created, v_created
  );

  -- Déduction du stock, article par article, dans la même transaction.
  IF v_affect THEN
    FOR v_line IN SELECT * FROM jsonb_array_elements(v_items)
    LOOP
      IF COALESCE(v_line->>'productId', '') <> '' THEN
        PERFORM public.admin_stock_move(p_token, jsonb_build_object(
          'productId', v_line->>'productId',
          'type', 'vente',
          'quantity', GREATEST(0, COALESCE((v_line->>'quantity')::INT, 0)),
          'receiptId', v_id,
          'reason', 'Reçu ' || v_number,
          'author', COALESCE(p->>'author', '')
        ));
      END IF;
    END LOOP;
  END IF;

  RETURN (
    SELECT jsonb_build_object(
      'id', id, 'number', number, 'clientName', client_name, 'clientPhone', client_phone,
      'items', items, 'subtotal', subtotal, 'discount', discount, 'total', total,
      'paymentMethod', payment_method, 'amountPaid', amount_paid, 'changeDue', change_due,
      'note', note, 'status', status, 'affectStock', affect_stock, 'author', author,
      'createdAt', created_at, 'updatedAt', updated_at
    )
    FROM public.receipts WHERE id = v_id
  );
END;
$$;

-- Annulation : le reçu reste dans l'historique (statut « annule ») et les
-- quantités vendues retournent en stock.
CREATE OR REPLACE FUNCTION public.admin_void_receipt(p_token TEXT, p_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_receipt public.receipts;
  v_line JSONB;
  v_author TEXT;
BEGIN
  PERFORM public.admin_assert(p_token);

  SELECT * INTO v_receipt FROM public.receipts WHERE id = p_id;
  IF v_receipt.id IS NULL THEN
    RAISE EXCEPTION 'Reçu introuvable.' USING ERRCODE = 'P0002';
  END IF;
  IF v_receipt.status = 'annule' THEN
    RETURN jsonb_build_object('id', v_receipt.id, 'status', 'annule');
  END IF;

  SELECT author INTO v_author FROM public.admin_sessions WHERE token = p_token;

  IF v_receipt.affect_stock THEN
    FOR v_line IN SELECT * FROM jsonb_array_elements(v_receipt.items)
    LOOP
      IF COALESCE(v_line->>'productId', '') <> '' THEN
        PERFORM public.admin_stock_move(p_token, jsonb_build_object(
          'productId', v_line->>'productId',
          'type', 'retour',
          'quantity', GREATEST(0, COALESCE((v_line->>'quantity')::INT, 0)),
          'receiptId', p_id,
          'reason', 'Annulation du reçu ' || v_receipt.number
        ));
      END IF;
    END LOOP;
  END IF;

  UPDATE public.receipts
     SET status = 'annule',
         updated_at = (extract(epoch from now()) * 1000)::BIGINT
   WHERE id = p_id;

  RETURN jsonb_build_object('id', p_id, 'status', 'annule');
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
REVOKE ALL ON FUNCTION public.admin_stock_overview(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_stock_move(TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_receipts(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_save_receipt(TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_void_receipt(TEXT, TEXT) FROM PUBLIC;

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
GRANT EXECUTE ON FUNCTION public.admin_stock_overview(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_stock_move(TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_receipts(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_receipt(TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_void_receipt(TEXT, TEXT) TO anon, authenticated;
