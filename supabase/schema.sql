-- =========================================================================
-- ALFFA NIGER — SCHÉMA SUPABASE DE RÉFÉRENCE
--
-- Remplace le fichier historique `supabase-schema.sql` (conservé pour mémoire).
--
-- CE QUI CHANGE PAR RAPPORT À L'ANCIEN SCRIPT
-- L'ancien script accordait les écritures au rôle `authenticated` à condition
-- que `auth.uid()` soit égal à 'REMPLACER_PAR_UUID_ADMIN' — un UUID factice
-- jamais remplacé. Conséquence : plus personne ne pouvait écrire, y compris
-- le serveur du site, qui utilise la clé anon. Les synchronisations
-- échouaient donc silencieusement.
--
-- MODÈLE RETENU ICI
--   • Lecture publique (anon + authenticated) sur le catalogue.
--   • Lecture publique des seules références d'expérience PUBLIÉES.
--   • AUCUNE écriture possible avec la clé anon, quelle qu'elle soit.
--   • Les écritures passent exclusivement par le serveur du site, authentifié
--     avec la clé service_role (qui contourne RLS par conception). Cette clé
--     ne doit JAMAIS être exposée au navigateur.
--
-- Le script est idempotent : il peut être rejoué sans perte de données.
-- =========================================================================

-- =========================================================================
-- BLOC 1 : STRUCTURE
-- =========================================================================

-- 1.1 Produits (boutique électronique & boutique textile)
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  shop TEXT NOT NULL CHECK (shop IN ('electronique', 'textile')),
  name TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  price NUMERIC,
  availability TEXT DEFAULT 'disponible',
  capacity TEXT,
  colors TEXT,
  condition TEXT,
  reference TEXT,
  description TEXT,
  specs TEXT,
  model TEXT,
  image TEXT,
  source_image TEXT,
  is_new BOOLEAN DEFAULT false,
  hidden BOOLEAN DEFAULT false,
  created_at BIGINT DEFAULT (extract(epoch from now()) * 1000)::bigint,
  -- Ordre d'affichage DANS la boutique (1 = premier). Il est propre à chaque
  -- boutique : électronique et textile sont ordonnées séparément.
  display_order INT
);

-- 1.1 bis Ordre d'affichage des produits
--     Ajout idempotent pour les bases déjà créées (la colonne est alors placée
--     en dernière position, exactement comme dans le CREATE TABLE ci-dessus —
--     indispensable car `admin_save_product` insère via `SELECT *`).
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS display_order INT;

-- Reprise de l'ordre historique : `created_at` reflète l'ordre de saisie
-- d'origine (1, 2, 3… par boutique).
WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY shop ORDER BY created_at NULLS LAST, id) AS rn
  FROM public.products
  WHERE display_order IS NULL
)
UPDATE public.products p
   SET display_order = r.rn
  FROM ranked r
 WHERE p.id = r.id;

-- Un nouvel article se place en fin de liste de sa boutique s'il n'est pas
-- positionné explicitement. Le déclencheur couvre tous les chemins d'écriture
-- (serveur Node, fonctions admin_*, amorçage).
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

DROP TRIGGER IF EXISTS products_fill_display_order ON public.products;
CREATE TRIGGER products_fill_display_order
  BEFORE INSERT ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.products_fill_display_order();

CREATE INDEX IF NOT EXISTS products_shop_order_idx
  ON public.products (shop, display_order);

-- 1.2 Marques textiles
CREATE TABLE IF NOT EXISTS public.brands (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  logo TEXT,
  source_logo TEXT,
  display_order INT DEFAULT 1
);

-- 1.3 Sélections « À la une »
CREATE TABLE IF NOT EXISTS public.featured (
  id SERIAL PRIMARY KEY,
  shop TEXT NOT NULL CHECK (shop IN ('electronique', 'textile')),
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  display_order INT DEFAULT 1,
  UNIQUE (shop, product_id)
);

-- 1.4 Paramètres et coordonnées du site
CREATE TABLE IF NOT EXISTS public.site_settings (
  id INT PRIMARY KEY DEFAULT 1,
  name TEXT DEFAULT 'ALFFA NIGER',
  slogan TEXT DEFAULT 'La qualité au meilleur prix.',
  whatsapp_electronique TEXT DEFAULT '',
  whatsapp_textile TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  email TEXT DEFAULT '',
  hours TEXT DEFAULT '',
  facebook TEXT DEFAULT '',
  instagram TEXT DEFAULT '',
  tiktok TEXT DEFAULT '',
  maps_electronique TEXT DEFAULT '',
  maps_textile TEXT DEFAULT '',
  site_url TEXT DEFAULT 'https://alffaniger.com',
  legal_name TEXT DEFAULT '',
  legal_info TEXT DEFAULT '',
  -- Identifiants imprimés sur les reçus (cachet de l'entreprise).
  nif TEXT DEFAULT '',
  rccm TEXT DEFAULT '',
  privacy_text TEXT DEFAULT '',
  hero_title TEXT DEFAULT '',
  hero_subtitle TEXT DEFAULT '',
  elec_intro TEXT DEFAULT '',
  textile_intro TEXT DEFAULT '',
  -- Empreinte SHA-256 du mot de passe administrateur. Jamais en clair :
  -- le dépôt est public et le navigateur n'y a pas accès (RLS de lecture
  -- limitée aux colonnes publiques côté site, accès serveur uniquement).
  admin_password_hash TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.4 bis Identifiants légaux (NIF / RCCM) — ajout idempotent
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS nif TEXT DEFAULT '';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS rccm TEXT DEFAULT '';

-- 1.5 Références « Expérience entrepreneuriale »
--     `photos` et `documents` sont stockés en JSONB : ce sont des listes
--     ordonnées de petite taille, propres à chaque référence.
CREATE TABLE IF NOT EXISTS public.experience_references (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  domain TEXT NOT NULL CHECK (domain IN ('btp', 'informatique', 'vivrier')),
  description TEXT NOT NULL DEFAULT '',
  beneficiary TEXT,
  procedure TEXT,
  location TEXT,
  execution TEXT NOT NULL DEFAULT 'non_confirme'
    CHECK (execution IN ('non_confirme', 'en_cours', 'acheve')),
  validation TEXT NOT NULL DEFAULT 'brouillon'
    CHECK (validation IN ('brouillon', 'en_attente', 'valide')),
  published BOOLEAN NOT NULL DEFAULT false,
  photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  documents JSONB NOT NULL DEFAULT '[]'::jsonb,
  display_order INT NOT NULL DEFAULT 1,
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
  updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
  published_at BIGINT,
  -- Défense en profondeur : la règle métier « pas de publication sans
  -- validation » est aussi garantie par la base, pas seulement par le serveur.
  CONSTRAINT experience_published_requires_validation
    CHECK (NOT published OR validation = 'valide')
);

CREATE INDEX IF NOT EXISTS experience_references_domain_idx
  ON public.experience_references (domain);
CREATE INDEX IF NOT EXISTS experience_references_published_idx
  ON public.experience_references (published, display_order);
CREATE INDEX IF NOT EXISTS products_shop_idx ON public.products (shop);

-- =========================================================================
-- 1.6 GESTION DE STOCK
--     Tables séparées du catalogue, volontairement NON lisibles en public :
--     les prix d'achat et les quantités sont des informations internes.
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.stock_items (
  product_id TEXT PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  -- Seuil à partir duquel l'administration signale un réapprovisionnement.
  alert_threshold INT NOT NULL DEFAULT 3 CHECK (alert_threshold >= 0),
  -- Prix d'achat unitaire : jamais exposé au navigateur visiteur.
  cost_price NUMERIC CHECK (cost_price IS NULL OR cost_price >= 0),
  updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

-- Journal des mouvements : c'est la « mémoire » du stock.
-- Le nom du produit est recopié pour que l'historique survive à une suppression.
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id BIGSERIAL PRIMARY KEY,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL DEFAULT '',
  shop TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL CHECK (type IN ('entree', 'sortie', 'vente', 'retour', 'inventaire', 'ajustement')),
  quantity INT NOT NULL,
  unit_cost NUMERIC,
  reason TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  receipt_id TEXT,
  author TEXT NOT NULL DEFAULT '',
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

CREATE INDEX IF NOT EXISTS stock_movements_product_idx
  ON public.stock_movements (product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS stock_movements_created_idx
  ON public.stock_movements (created_at DESC);

-- =========================================================================
-- 1.7 REÇUS (ventes au comptant et à crédit)
--     Un reçu est une pièce comptable : il n'est JAMAIS modifiable librement.
--     Il est créé, puis éventuellement annulé (le stock est alors restitué).
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.receipts (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL UNIQUE,
  client_name TEXT NOT NULL DEFAULT '',
  client_phone TEXT NOT NULL DEFAULT '',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount NUMERIC NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total NUMERIC NOT NULL DEFAULT 0 CHECK (total >= 0),
  payment_method TEXT NOT NULL DEFAULT 'espece'
    CHECK (payment_method IN ('espece', 'mobile_money', 'virement', 'credit')),
  amount_paid NUMERIC NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  change_due NUMERIC NOT NULL DEFAULT 0 CHECK (change_due >= 0),
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'paye'
    CHECK (status IN ('paye', 'partiel', 'credit', 'annule')),
  affect_stock BOOLEAN NOT NULL DEFAULT true,
  author TEXT NOT NULL DEFAULT '',
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
  updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

CREATE INDEX IF NOT EXISTS receipts_created_idx ON public.receipts (created_at DESC);
CREATE INDEX IF NOT EXISTS receipts_number_idx ON public.receipts (number);

-- =========================================================================
-- BLOC 2 : SÉCURITÉ (RLS)
-- =========================================================================

ALTER TABLE public.products              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.featured              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experience_references ENABLE ROW LEVEL SECURITY;

-- Réexécutable : on retire d'abord toute politique portant ces noms.
DROP POLICY IF EXISTS "Lecture publique des produits"        ON public.products;
DROP POLICY IF EXISTS "Lecture publique des marques"         ON public.brands;
DROP POLICY IF EXISTS "Lecture publique des selections"      ON public.featured;
DROP POLICY IF EXISTS "Lecture publique des parametres"      ON public.site_settings;
DROP POLICY IF EXISTS "Lecture publique des experiences"     ON public.experience_references;

-- 2.1 Lecture publique du catalogue
CREATE POLICY "Lecture publique des produits"
  ON public.products FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Lecture publique des marques"
  ON public.brands FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Lecture publique des selections"
  ON public.featured FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Lecture publique des parametres"
  ON public.site_settings FOR SELECT TO anon, authenticated USING (true);

-- 2.2 Seules les références publiées sont visibles publiquement.
--     Un brouillon ou une fiche « en attente de vérification » n'est jamais
--     exposé, même si quelqu'un interroge l'API REST Supabase directement.
CREATE POLICY "Lecture publique des experiences"
  ON public.experience_references FOR SELECT TO anon, authenticated
  USING (published = true);

-- 2.2 bis Stock et reçus : RLS active, AUCUNE politique de lecture publique.
--       Seul le serveur (service_role) ou les fonctions `admin_*`
--       (SECURITY DEFINER) y accèdent.
ALTER TABLE public.stock_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts        ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.stock_items     FROM anon, authenticated;
REVOKE ALL ON public.stock_movements FROM anon, authenticated;
REVOKE ALL ON public.receipts        FROM anon, authenticated;

-- 2.3 Aucune écriture pour les rôles publics.
--     service_role contourne RLS et conserve donc tous les droits d'écriture.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE
  ON public.products, public.brands, public.featured,
     public.site_settings, public.experience_references
  FROM anon, authenticated;

GRANT SELECT ON public.products, public.brands, public.featured,
     public.site_settings, public.experience_references
  TO anon, authenticated;

-- La séquence de `featured.id` reste utilisable en lecture.
GRANT USAGE, SELECT ON SEQUENCE public.featured_id_seq TO anon, authenticated;
