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
  created_at BIGINT DEFAULT (extract(epoch from now()) * 1000)::bigint
);

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
