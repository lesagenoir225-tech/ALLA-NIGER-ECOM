-- =========================================================================
-- ALFFA NIGER — SCRIPT SQL CORRIGÉ ET SÉCURISÉ POUR SUPABASE
-- URL du projet : https://dhpeptfgmwvptqilfpho.supabase.co
-- =========================================================================

-- =========================================================================
-- BLOC 1 : STRUCTURE DES TABLES (CRÉATION CONDITIONNELLE SANS SUPPRESSION)
-- =========================================================================

-- 1.1 Table des produits (Boutique Électronique & Boutique Textile)
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  shop TEXT NOT NULL CHECK (shop IN ('electronique', 'textile')),
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  category TEXT NOT NULL,
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

-- 1.2 Table des marques textiles (Drews, Gagny Lah, Getzner, etc.)
CREATE TABLE IF NOT EXISTS public.brands (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  logo TEXT,
  source_logo TEXT,
  display_order INT DEFAULT 1
);

-- 1.3 Table des sélections de produits « À la une »
CREATE TABLE IF NOT EXISTS public.featured (
  id SERIAL PRIMARY KEY,
  shop TEXT NOT NULL CHECK (shop IN ('electronique', 'textile')),
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  display_order INT DEFAULT 1,
  UNIQUE (shop, product_id)
);

-- 1.4 Table des paramètres et coordonnées du site ALFFA NIGER
CREATE TABLE IF NOT EXISTS public.site_settings (
  id INT PRIMARY KEY DEFAULT 1,
  name TEXT DEFAULT 'ALFFA NIGER',
  slogan TEXT DEFAULT 'La qualité au meilleur prix.',
  whatsapp_electronique TEXT DEFAULT '22796222310',
  whatsapp_textile TEXT DEFAULT '22796222310',
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  email TEXT DEFAULT '',
  hours TEXT DEFAULT '',
  facebook TEXT DEFAULT 'https://www.facebook.com/share/1BpsCF3tBK/?mibextid=wwXIfr',
  instagram TEXT DEFAULT 'https://www.instagram.com/khalil_baye?srtk=NzVnbzJ2dmFvNnhr',
  tiktok TEXT DEFAULT 'https://www.tiktok.com/@alffaniger?_r=1&_t=ZS-9AQ5RF69CYY',
  maps_electronique TEXT DEFAULT 'https://maps.app.goo.gl/yr1v33pcPDGsSSpe8?g_st=ic',
  maps_textile TEXT DEFAULT '',
  site_url TEXT DEFAULT 'https://alffaniger.com',
  legal_name TEXT DEFAULT '',
  legal_info TEXT DEFAULT '',
  privacy_text TEXT DEFAULT '',
  hero_title TEXT DEFAULT 'La qualité au meilleur prix.',
  hero_subtitle TEXT DEFAULT 'Téléphones, électronique, bazins et tissus de premier choix au Niger. Deux boutiques distinctes, une seule exigence de qualité.',
  elec_intro TEXT DEFAULT 'Smartphones et appareils électroniques de grandes marques certifiées, avec prix transparents affichés en FCFA.',
  textile_intro TEXT DEFAULT 'Bazins et tissus rigoureusement sélectionnés pour leur qualité, leur tenue, leur éclat et leurs motifs prestigieux.'
);

-- =========================================================================
-- BLOC 2 : SÉCURISATION ROW LEVEL SECURITY (RLS) & POLITIQUES STRICTES
-- =========================================================================

-- Activation impérative de RLS sur toutes les tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.featured ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- Nettoyage préventif des anciennes règles pour garantir la réexécutabilité
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Lecture publique des produits" ON public.products;
DROP POLICY IF EXISTS "Écriture des produits" ON public.products;
DROP POLICY IF EXISTS "Écriture restreinte admin produits" ON public.products;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.products;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.products;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.products;

DROP POLICY IF EXISTS "Lecture publique des marques" ON public.brands;
DROP POLICY IF EXISTS "Écriture des marques" ON public.brands;
DROP POLICY IF EXISTS "Écriture restreinte admin marques" ON public.brands;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.brands;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.brands;

DROP POLICY IF EXISTS "Lecture publique des sélections à la une" ON public.featured;
DROP POLICY IF EXISTS "Écriture des sélections à la une" ON public.featured;
DROP POLICY IF EXISTS "Écriture restreinte admin featured" ON public.featured;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.featured;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.featured;

DROP POLICY IF EXISTS "Lecture publique des paramètres" ON public.site_settings;
DROP POLICY IF EXISTS "Écriture des paramètres" ON public.site_settings;
DROP POLICY IF EXISTS "Écriture restreinte admin paramètres" ON public.site_settings;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.site_settings;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.site_settings;

-- -------------------------------------------------------------------------
-- 2.1 Politiques de lecture publique (accessible aux visiteurs et au site)
-- -------------------------------------------------------------------------
CREATE POLICY "Lecture publique des produits"
ON public.products
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Lecture publique des marques"
ON public.brands
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Lecture publique des sélections à la une"
ON public.featured
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Lecture publique des paramètres"
ON public.site_settings
FOR SELECT
TO anon, authenticated
USING (true);

-- -------------------------------------------------------------------------
-- 2.2 Politiques d'écriture sécurisées réservées UNIQUEMENT à l'administrateur
--
-- RÈGLE DE SÉCURITÉ :
-- Tant que 'REMPLACER_PAR_UUID_ADMIN' n'est pas remplacé par le véritable UUID
-- de votre compte Supabase Auth, la condition (auth.uid()::text = 'REMPLACER_PAR_UUID_ADMIN')
-- renvoie false pour TOUT LE MONDE. Toutes les écritures (INSERT, UPDATE, DELETE)
-- restent ainsi hermétiquement bloquées. Aucun utilisateur anonyme ni aucun autre
-- utilisateur authentifié ne peut altérer vos données.
-- -------------------------------------------------------------------------
CREATE POLICY "Écriture restreinte admin produits"
ON public.products
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid()::text = 'REMPLACER_PAR_UUID_ADMIN')
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid()::text = 'REMPLACER_PAR_UUID_ADMIN');

CREATE POLICY "Écriture restreinte admin marques"
ON public.brands
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid()::text = 'REMPLACER_PAR_UUID_ADMIN')
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid()::text = 'REMPLACER_PAR_UUID_ADMIN');

CREATE POLICY "Écriture restreinte admin featured"
ON public.featured
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid()::text = 'REMPLACER_PAR_UUID_ADMIN')
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid()::text = 'REMPLACER_PAR_UUID_ADMIN');

CREATE POLICY "Écriture restreinte admin paramètres"
ON public.site_settings
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid()::text = 'REMPLACER_PAR_UUID_ADMIN')
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid()::text = 'REMPLACER_PAR_UUID_ADMIN');

-- =========================================================================
-- BLOC 3 : INSERTION DES DONNÉES INITIALES (SANS ÉCRASEMENT DES DONNÉES EXISTANTES)
-- =========================================================================

-- 3.1 Paramètres initiaux ALFFA NIGER (inséré uniquement si absent)
INSERT INTO public.site_settings (
  id, name, slogan,
  whatsapp_electronique, whatsapp_textile,
  facebook, instagram, tiktok,
  maps_electronique, maps_textile,
  site_url, hero_title, hero_subtitle, elec_intro, textile_intro
)
VALUES (
  1,
  'ALFFA NIGER',
  'La qualité au meilleur prix.',
  '22796222310',
  '22796222310',
  'https://www.facebook.com/share/1BpsCF3tBK/?mibextid=wwXIfr',
  'https://www.instagram.com/khalil_baye?srtk=NzVnbzJ2dmFvNnhr',
  'https://www.tiktok.com/@alffaniger?_r=1&_t=ZS-9AQ5RF69CYY',
  'https://maps.app.goo.gl/yr1v33pcPDGsSSpe8?g_st=ic',
  '',
  'https://alffaniger.com',
  'La qualité au meilleur prix.',
  'Téléphones, électronique, bazins et tissus de premier choix au Niger. Deux boutiques distinctes, une seule exigence de qualité.',
  'Smartphones et appareils électroniques de grandes marques certifiées, avec prix transparents affichés en FCFA.',
  'Bazins et tissus rigoureusement sélectionnés pour leur qualité, leur tenue, leur éclat et leurs motifs prestigieux.'
)
ON CONFLICT (id) DO NOTHING;

-- 3.2 Marques textiles de prestige
INSERT INTO public.brands (id, name, logo, source_logo, display_order)
VALUES
  ('drews', 'Drews', '/images/brands/drews.jpg', 'https://i.ibb.co/m5YVjNyq/33914-DC5-AC3-B-4-FED-900-B-FAE666-D7-FDCE.png', 1),
  ('gagny-lah', 'Gagny Lah', '/images/brands/gagny-lah.jpg', 'https://i.ibb.co/CKrV5K7C/562-A8232-EBA6-4354-997-D-7-E162-C8-F92-CD.png', 2),
  ('getzner', 'Getzner', '/images/brands/getzner.jpg', 'https://i.ibb.co/qMXLbNsn/E694684-B-5-A0-A-41-C3-829-F-338-C0-A4659-B4.png', 3)
ON CONFLICT (id) DO NOTHING;

-- 3.3 Catalogue des 14 produits initiaux
INSERT INTO public.products (
  id, shop, name, brand, category, price, availability,
  capacity, colors, condition, reference, description, specs, model,
  image, source_image, is_new, hidden, created_at
)
VALUES
  -- Boutique Électronique
  (
    'samsung-a14', 'electronique', 'Samsung A14', 'samsung', 'smartphones', 90000, 'disponible',
    '', 'Noir, Argent, Vert', 'Neuf scellé', 'SM-A145F',
    'Smartphone Samsung Galaxy A14, grand écran fluide et autonomie longue durée.',
    E'Écran 6.6" FHD+\nTriple caméra 50 MP\nBatterie 5000 mAh\nRecharge rapide', NULL,
    '/images/products/electronique/samsung-a14.webp', 'https://i.ibb.co/LdztL2Kf/IMG-6725.webp',
    false, false, 1000
  ),
  (
    'iphone-13-pro-max', 'electronique', 'iPhone 13 Pro Max — 256 Go', 'apple', 'smartphones', 300000, 'disponible',
    '256 Go', 'Bleu Alpin, Graphite, Or', 'Excellent état', 'A2643',
    'Apple iPhone 13 Pro Max avec écran Super Retina XDR ProMotion 120Hz et triple capteur photo professionnel.',
    E'Écran 6.7" Super Retina XDR ProMotion\nPuce A15 Bionic\nTriple appareil photo 12 MP avec zoom optique\nAutonomie exceptionnelle', NULL,
    '/images/products/electronique/iphone-13-pro-max.jpg', 'https://i.ibb.co/d1W1N3k/IMG-6726.jpg',
    false, false, 2000
  ),
  (
    'samsung-note-20-ultra', 'electronique', 'Samsung Note 20 Ultra — 256 Go', 'samsung', 'smartphones', 150000, 'disponible',
    '256 Go', 'Mystic Bronze, Mystic Black', 'Très bon état', 'SM-N986B',
    'Samsung Galaxy Note 20 Ultra avec stylet S-Pen ultra-réactif et écran Dynamic AMOLED 2X.',
    E'Écran 6.9" Dynamic AMOLED 120Hz\nStylet S-Pen intégré\nCapteur 108 MP avec Space Zoom 50x\nCompatibilité 5G', NULL,
    '/images/products/electronique/samsung-note-20-ultra.jpg', 'https://i.ibb.co/whbRgZjB/IMG-6727.jpg',
    false, false, 3000
  ),
  (
    'iphone-12-pro-max', 'electronique', 'iPhone 12 Pro Max — 256 Go', 'apple', 'smartphones', 230000, 'disponible',
    '256 Go', 'Bleu Pacifique, Graphite, Argent', 'Très bon état', 'A2411',
    'iPhone 12 Pro Max, design élégant en acier chirurgical avec Ceramic Shield et compatibilité MagSafe.',
    E'Écran 6.7" Super Retina XDR\nPuce A14 Bionic\nScanner LiDAR pour réalité augmentée et portraits de nuit\nEnregistrement vidéo Dolby Vision HDR', NULL,
    '/images/products/electronique/iphone-12-pro-max.webp', 'https://i.ibb.co/chF0jcnM/IMG-6728.webp',
    false, false, 4000
  ),
  (
    'samsung-s24-ultra', 'electronique', 'Samsung S24 Ultra — 256 Go', 'samsung', 'smartphones', 400000, 'disponible',
    '256 Go', 'Titane Gris, Titane Noir, Titane Violet', 'Neuf scellé', 'SM-S928B',
    'Le fleuron de Samsung avec cadre en titane ultra-résistant, processeur Snapdragon 8 Gen 3 et fonctionnalités Galaxy AI.',
    E'Écran plat 6.8" QHD+ Dynamic AMOLED 2X\nCapteur principal 200 MP avec zoom optique haute résolution\nStylet S-Pen inclus\nBatterie 5000 mAh', NULL,
    '/images/products/electronique/samsung-s24-ultra.jpg', 'https://i.ibb.co/3YdBZDgs/IMG-6729.jpg',
    true, false, 5000
  ),
  (
    'iphone-x', 'electronique', 'iPhone X — 256 Go', 'apple', 'smartphones', 100000, 'disponible',
    '256 Go', 'Gris Sidéral, Argent', 'Bon état révisé', 'A1901',
    'iPhone X avec écran OLED Super Retina bord à bord, Face ID et double appareil photo avec stabilisation optique.',
    E'Écran 5.8" Super Retina OLED\nReconnaissance faciale Face ID sécurisée\nDouble caméra 12 MP grand-angle et téléobjectif\nRecharge sans fil', NULL,
    '/images/products/electronique/iphone-x.jpg', 'https://i.ibb.co/BVy1S4x8/IMG-6730.jpg',
    false, false, 6000
  ),
  (
    'iphone-16-pro-max', 'electronique', 'iPhone 16 Pro Max — 256 Go', 'apple', 'smartphones', 630000, 'disponible',
    '256 Go', 'Titane Naturel, Titane Désert, Titane Noir', 'Neuf scellé sous boîte', 'A3296',
    'Le dernier né haut de gamme d’Apple : écran immersif 6.9", commande de l’appareil photo tactile et puce A18 Pro.',
    E'Écran 6.9" Super Retina XDR ProMotion\nPuce A18 Pro surpuissante\nBouton Commande de l’appareil photo\nAutonomie record', NULL,
    '/images/products/electronique/iphone-16-pro-max.webp', 'https://i.ibb.co/xSpFRwQd/IMG-6731.webp',
    true, false, 7000
  ),
  (
    'iphone-14-pro-max', 'electronique', 'iPhone 14 Pro Max', 'apple', 'smartphones', NULL, 'non_precise',
    '', 'Violet Intense, Noir Sidéral, Or', 'Selon arrivage', 'A2894',
    'iPhone 14 Pro Max avec Dynamic Island interactive et capteur photo principal 48 MP.',
    E'Écran 6.7" Super Retina XDR avec Dynamic Island\nPuce A16 Bionic\nCapteur 48 MP\nMode Action pour vidéos ultra-stables', NULL,
    '/images/products/electronique/iphone-14-pro-max.webp', 'https://i.ibb.co/4nWv0TMs/IMG-6732.webp',
    false, false, 8000
  ),
  (
    'samsung-s23-ultra', 'electronique', 'Samsung S23 Ultra', 'samsung', 'smartphones', NULL, 'non_precise',
    '', 'Vert, Noir Fantôme, Crème', 'Selon arrivage', 'SM-S918B',
    'Samsung Galaxy S23 Ultra, capteur 200 MP révolutionnaire et performances gaming de premier ordre.',
    E'Écran 6.8" Dynamic AMOLED 2X 120Hz\nPuce Snapdragon 8 Gen 2 for Galaxy\nCapteur 200 MP et zoom 100x\nStylet S-Pen', NULL,
    '/images/products/electronique/samsung-s23-ultra.webp', 'https://i.ibb.co/TxXR4NPj/IMG-6734.webp',
    false, false, 9000
  ),
  (
    'iphone-x-max', 'electronique', 'iPhone X Max', 'apple', 'smartphones', NULL, 'non_precise',
    '', 'Or, Gris Sidéral, Argent', 'Selon arrivage', 'A2101',
    'Grand écran Super Retina OLED 6.5 pouces et finition de prestige.',
    E'Écran 6.5" Super Retina OLED\nPuce A12 Bionic\nFace ID\nDouble appareil photo 12 MP', NULL,
    '/images/products/electronique/iphone-x-max.jpg', 'https://i.ibb.co/MyPdrSxq/IMG-6735.jpg',
    false, false, 10000
  ),
  (
    'iphone-15', 'electronique', 'iPhone 15', 'apple', 'smartphones', NULL, 'non_precise',
    '', 'Rose, Jaune, Vert, Bleu, Noir', 'Selon arrivage', 'A3090',
    'iPhone 15 avec Dynamic Island, port universel USB-C et appareil photo 48 MP.',
    E'Écran 6.1" Super Retina XDR avec Dynamic Island\nPuce A16 Bionic\nCapteur 48 MP\nPort USB-C', NULL,
    '/images/products/electronique/iphone-15.webp', 'https://i.ibb.co/5X7Q3wtJ/IMG-6736.webp',
    false, false, 11000
  ),

  -- Boutique Textile
  (
    'bazin-drews', 'textile', 'Bazin Drews', 'drews', 'bazins', 11000, 'disponible',
    NULL, NULL, NULL, NULL,
    'Bazin Drews de première qualité, réputé pour sa tenue claire, sa brillance éclatante et la finesse de son tissage.',
    E'100% Coton peigné supérieur\nBrillance longue tenue\nIdéal pour grands boubous et cérémonies\nLargeur standard export', 'Bazin Riche Damassé',
    '/images/products/textile/bazin-drews.jpg', 'https://i.ibb.co/m5YVjNyq/33914-DC5-AC3-B-4-FED-900-B-FAE666-D7-FDCE.png',
    false, false, 12000
  ),
  (
    'bazin-gagny-lah', 'textile', 'Bazin Gagny Lah', 'gagny-lah', 'bazins', 12500, 'disponible',
    NULL, NULL, NULL, NULL,
    'Véritable Bazin Riche Gagny Lah, célèbre pour son éclat prestigieux, sa texture soyeuse et ses motifs damassés incomparables.',
    E'Qualité Gagny Lah originale certifiée\nTeinture riche et reflets éclatants\nTenue majestueuse pour les occasions d’exception', 'Bazin Riche Authentique',
    '/images/products/textile/bazin-gagny-lah.jpg', 'https://i.ibb.co/CKrV5K7C/562-A8232-EBA6-4354-997-D-7-E162-C8-F92-CD.png',
    true, false, 13000
  ),
  (
    'bazin-getzner', 'textile', 'Bazin Getzner', 'getzner', 'bazins', 10000, 'disponible',
    NULL, NULL, NULL, NULL,
    'Bazin autrichien Getzner authentique, la référence internationale du damas pour son raffinement absolu.',
    E'Tissage d’Autriche Getzner authentique\nMotifs jacquard haute définition\nToucher soyeux et tenue noble', 'Bazin Autrichien Damassé',
    '/images/products/textile/bazin-getzner.jpg', 'https://i.ibb.co/qMXLbNsn/E694684-B-5-A0-A-41-C3-829-F-338-C0-A4659-B4.png',
    false, false, 14000
  ),
  (
    'bazin-getzner-1', 'textile', 'Bazin Getzner — Bleu Turquoise', 'getzner', 'bazins', 10000, 'disponible',
    NULL, NULL, NULL, NULL,
    'Bazin autrichien Getzner authentique, brillance éclatante et tissage damassé soyeux en nuance bleu turquoise.',
    E'Tissage d’Autriche Getzner authentique\nMotifs jacquard haute définition\nToucher soyeux et tenue noble\nLargeur standard grand boubou', 'Bazin Autrichien Damassé',
    '/images/products/textile/bazin-getzner-1.jpg', 'https://i.ibb.co/HDy0NDV7/878b1df5-ba13-426c-94e0-831334e27b3a.jpg',
    true, false, 15000
  ),
  (
    'bazin-getzner-2', 'textile', 'Bazin Getzner — Lilas Nacré', 'getzner', 'bazins', 10000, 'disponible',
    NULL, NULL, NULL, NULL,
    'Bazin autrichien Getzner authentique en nuance lilas nacré avec reflets scintillants et damas précieux.',
    E'Tissage d’Autriche Getzner authentique\nMotifs jacquard haute définition\nToucher soyeux et tenue noble\nLargeur standard grand boubou', 'Bazin Autrichien Damassé',
    '/images/products/textile/bazin-getzner-2.jpg', 'https://i.ibb.co/nN1jbNnX/1fde637b-c79f-4b62-9da7-26ba0843c72e.jpg',
    true, false, 16000
  ),
  (
    'bazin-getzner-3', 'textile', 'Bazin Getzner — Gris Anthracite', 'getzner', 'bazins', 10000, 'disponible',
    NULL, NULL, NULL, NULL,
    'Bazin autrichien Getzner authentique en gris anthracite profond, tissage damassé noble pour cérémonies.',
    E'Tissage d’Autriche Getzner authentique\nMotifs jacquard haute définition\nToucher soyeux et tenue noble\nLargeur standard grand boubou', 'Bazin Autrichien Damassé',
    '/images/products/textile/bazin-getzner-3.jpg', 'https://i.ibb.co/MDgBRzZ1/71d867e8-ca26-45e9-9b04-98d8cd2f2b34.jpg',
    true, false, 17000
  ),
  (
    'bazin-getzner-4', 'textile', 'Bazin Getzner — Bleu Glacier', 'getzner', 'bazins', 10000, 'disponible',
    NULL, NULL, NULL, NULL,
    'Bazin autrichien Getzner authentique ton bleu glacier doux avec damas géométrique lumineux.',
    E'Tissage d’Autriche Getzner authentique\nMotifs jacquard haute définition\nToucher soyeux et tenue noble\nLargeur standard grand boubou', 'Bazin Autrichien Damassé',
    '/images/products/textile/bazin-getzner-4.jpg', 'https://i.ibb.co/53srJVf/0fc307b5-c713-49ae-8f61-d951283df64d.jpg',
    true, false, 18000
  ),
  (
    'bazin-getzner-5', 'textile', 'Bazin Getzner — Bleu Canard', 'getzner', 'bazins', 10000, 'disponible',
    NULL, NULL, NULL, NULL,
    'Bazin autrichien Getzner authentique bleu canard aux reflets océaniques, broderie damassée prestigieuse.',
    E'Tissage d’Autriche Getzner authentique\nMotifs jacquard haute définition\nToucher soyeux et tenue noble\nLargeur standard grand boubou', 'Bazin Autrichien Damassé',
    '/images/products/textile/bazin-getzner-5.jpg', 'https://i.ibb.co/pBQJFq5t/b48e8966-9e87-4afc-a49b-6bf5ae7b4c55.jpg',
    true, false, 19000
  ),
  (
    'bazin-getzner-6', 'textile', 'Bazin Getzner — Bleu Royal', 'getzner', 'bazins', 10000, 'disponible',
    NULL, NULL, NULL, NULL,
    'Bazin autrichien Getzner authentique bleu royal vif, éclat majestueux et texture damassée 100% coton peigné.',
    E'Tissage d’Autriche Getzner authentique\nMotifs jacquard haute définition\nToucher soyeux et tenue noble\nLargeur standard grand boubou', 'Bazin Autrichien Damassé',
    '/images/products/textile/bazin-getzner-6.jpg', 'https://i.ibb.co/Rp2q5p9N/1ac6d4cd-bd35-4393-b4da-a2f0259d23c2.jpg',
    true, false, 20000
  ),
  (
    'bazin-getzner-7', 'textile', 'Bazin Getzner — Gris Ardoise', 'getzner', 'bazins', 10000, 'disponible',
    NULL, NULL, NULL, NULL,
    'Bazin autrichien Getzner authentique gris ardoise élégant, brillance sobre et tenue remarquable.',
    E'Tissage d’Autriche Getzner authentique\nMotifs jacquard haute définition\nToucher soyeux et tenue noble\nLargeur standard grand boubou', 'Bazin Autrichien Damassé',
    '/images/products/textile/bazin-getzner-7.jpg', 'https://i.ibb.co/WWZWbZzr/eae83e82-c7fd-4790-9175-d0f4c6d72261.jpg',
    true, false, 21000
  ),
  (
    'bazin-getzner-8', 'textile', 'Bazin Getzner — Violet Prune', 'getzner', 'bazins', 10000, 'disponible',
    NULL, NULL, NULL, NULL,
    'Bazin autrichien Getzner authentique violet prune profond, damas raffiné pour tenues traditionnelles de prestige.',
    E'Tissage d’Autriche Getzner authentique\nMotifs jacquard haute définition\nToucher soyeux et tenue noble\nLargeur standard grand boubou', 'Bazin Autrichien Damassé',
    '/images/products/textile/bazin-getzner-8.jpg', 'https://i.ibb.co/SGkHhjb/26b13441-a900-4067-9e00-ede449e060c2.jpg',
    true, false, 22000
  ),
  (
    'bazin-getzner-9', 'textile', 'Bazin Getzner — Bleu Azur', 'getzner', 'bazins', 10000, 'disponible',
    NULL, NULL, NULL, NULL,
    'Bazin autrichien Getzner authentique bleu azur lumineux, finesse du tissage jacquard et éclat intense.',
    E'Tissage d’Autriche Getzner authentique\nMotifs jacquard haute définition\nToucher soyeux et tenue noble\nLargeur standard grand boubou', 'Bazin Autrichien Damassé',
    '/images/products/textile/bazin-getzner-9.jpg', 'https://i.ibb.co/CKf2YvxZ/2a37cce8-6c6e-447a-ab15-d52187146907.jpg',
    true, false, 23000
  ),
  (
    'bazin-getzner-10', 'textile', 'Bazin Getzner — Gris Perle Argenté', 'getzner', 'bazins', 10000, 'disponible',
    NULL, NULL, NULL, NULL,
    'Bazin autrichien Getzner authentique gris perle aux reflets argentés, souplesse et tenue de grand apparat.',
    E'Tissage d’Autriche Getzner authentique\nMotifs jacquard haute définition\nToucher soyeux et tenue noble\nLargeur standard grand boubou', 'Bazin Autrichien Damassé',
    '/images/products/textile/bazin-getzner-10.jpg', 'https://i.ibb.co/fGXcMTkn/fc191a94-7175-49a5-99ba-6b349f580550.jpg',
    true, false, 24000
  ),
  (
    'bazin-getzner-11', 'textile', 'Bazin Getzner — Mauve Parme', 'getzner', 'bazins', 10000, 'disponible',
    NULL, NULL, NULL, NULL,
    'Bazin autrichien Getzner authentique nuance mauve parme éclatant, motifs damassés autrichiens d’exception.',
    E'Tissage d’Autriche Getzner authentique\nMotifs jacquard haute définition\nToucher soyeux et tenue noble\nLargeur standard grand boubou', 'Bazin Autrichien Damassé',
    '/images/products/textile/bazin-getzner-11.jpg', 'https://i.ibb.co/vxYJTPxX/afdaf383-fcee-4d72-87a6-3febdb816eac.jpg',
    true, false, 25000
  ),
  (
    'bazin-getzner-12', 'textile', 'Bazin Getzner — Lavande Doux', 'getzner', 'bazins', 10000, 'disponible',
    NULL, NULL, NULL, NULL,
    'Bazin autrichien Getzner authentique ton lavande doux, soyeux au toucher et brillance naturelle longue durée.',
    E'Tissage d’Autriche Getzner authentique\nMotifs jacquard haute définition\nToucher soyeux et tenue noble\nLargeur standard grand boubou', 'Bazin Autrichien Damassé',
    '/images/products/textile/bazin-getzner-12.jpg', 'https://i.ibb.co/S4Db2wvr/30928e90-ba51-4a32-8793-4b9ecaf3e8b9.jpg',
    true, false, 26000
  ),
  (
    'bazin-getzner-13', 'textile', 'Bazin Getzner — Noir Ébène', 'getzner', 'bazins', 10000, 'disponible',
    NULL, NULL, NULL, NULL,
    'Bazin autrichien Getzner authentique noir ébène profond, damas sombre au lustre exceptionnel pour grandes cérémonies.',
    E'Tissage d’Autriche Getzner authentique\nMotifs jacquard haute définition\nToucher soyeux et tenue noble\nLargeur standard grand boubou', 'Bazin Autrichien Damassé',
    '/images/products/textile/bazin-getzner-13.jpg', 'https://i.ibb.co/ns7zmGSp/07e6fdcc-d3e3-4125-b7c3-d83414c5a1ed.jpg',
    true, false, 27000
  ),
  (
    'bazin-getzner-14', 'textile', 'Bazin Getzner — Violet Impérial', 'getzner', 'bazins', 10000, 'disponible',
    NULL, NULL, NULL, NULL,
    'Bazin autrichien Getzner authentique violet impérial, nuances majestueuses et tissage damassé haute définition.',
    E'Tissage d’Autriche Getzner authentique\nMotifs jacquard haute définition\nToucher soyeux et tenue noble\nLargeur standard grand boubou', 'Bazin Autrichien Damassé',
    '/images/products/textile/bazin-getzner-14.jpg', 'https://i.ibb.co/fdMcNVfr/6064af33-0e3b-4105-81a0-6248d213e00b.jpg',
    true, false, 28000
  ),
  (
    'bazin-getzner-15', 'textile', 'Bazin Getzner — Bleu Cobalt', 'getzner', 'bazins', 10000, 'disponible',
    NULL, NULL, NULL, NULL,
    'Bazin autrichien Getzner authentique bleu cobalt éclatant, damas noble d’Autriche avec tombé parfait.',
    E'Tissage d’Autriche Getzner authentique\nMotifs jacquard haute définition\nToucher soyeux et tenue noble\nLargeur standard grand boubou', 'Bazin Autrichien Damassé',
    '/images/products/textile/bazin-getzner-15.jpg', 'https://i.ibb.co/tPN3cPww/5c515e47-de35-40ed-93a8-0455a8bc1367.jpg',
    true, false, 29000
  )
ON CONFLICT (id) DO NOTHING;

-- 3.4 Sélections initiales « À la une »
INSERT INTO public.featured (shop, product_id, display_order)
VALUES
  ('electronique', 'iphone-16-pro-max', 1),
  ('electronique', 'samsung-s24-ultra', 2),
  ('electronique', 'iphone-13-pro-max', 3),
  ('electronique', 'samsung-a14', 4),
  ('textile', 'bazin-drews', 1),
  ('textile', 'bazin-gagny-lah', 2),
  ('textile', 'bazin-getzner', 3)
ON CONFLICT (shop, product_id) DO NOTHING;
