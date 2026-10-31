-- =========================================================================
-- ALFFA NIGER — JEUCONTENU INITIAL (généré par scripts/generate-seed-sql.py)
-- Idempotent : peut être rejoué sans perte de données.
-- Catalogue : 29 produits, 3 marques
-- Expérience : 14 références
-- =========================================================================
BEGIN;

-- Paramètres du site
INSERT INTO public.site_settings (id, name, slogan, whatsapp_electronique, whatsapp_textile, phone, address, email, hours, facebook, instagram, tiktok, maps_electronique, maps_textile, site_url, legal_name, legal_info, privacy_text, hero_title, hero_subtitle, elec_intro, textile_intro, updated_at)
VALUES (1, 'ALFFA NIGER', 'La qualité au meilleur prix.', '22796222310', '22796222310', NULL, NULL, NULL, NULL, 'https://www.facebook.com/share/1BpsCF3tBK/?mibextid=wwXIfr', 'https://www.instagram.com/khalil_baye?srtk=NzVnbzJ2dmFvNnhr', 'https://www.tiktok.com/@alffaniger?_r=1&_t=ZS-9AQ5RF69CYY', 'https://maps.app.goo.gl/yr1v33pcPDGsSSpe8?g_st=ic', 'https://maps.app.goo.gl/p6hfGK1j1j32RyWu7', 'https://alffaniger.com', NULL, NULL, NULL, 'La qualité au meilleur prix.', 'Téléphones, électronique, bazins et tissus de premier choix au Niger. Deux boutiques distinctes, une seule exigence de qualité.', 'Smartphones et appareils électroniques de grandes marques certifiées, avec prix transparents affichés en FCFA.', 'Bazins et tissus rigoureusement sélectionnés pour leur qualité, leur tenue, leur éclat et leurs motifs prestigieux.', now())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slogan = EXCLUDED.slogan, whatsapp_electronique = EXCLUDED.whatsapp_electronique, whatsapp_textile = EXCLUDED.whatsapp_textile, phone = EXCLUDED.phone, address = EXCLUDED.address, email = EXCLUDED.email, hours = EXCLUDED.hours, facebook = EXCLUDED.facebook, instagram = EXCLUDED.instagram, tiktok = EXCLUDED.tiktok, maps_electronique = EXCLUDED.maps_electronique, maps_textile = EXCLUDED.maps_textile, site_url = EXCLUDED.site_url, legal_name = EXCLUDED.legal_name, legal_info = EXCLUDED.legal_info, privacy_text = EXCLUDED.privacy_text, hero_title = EXCLUDED.hero_title, hero_subtitle = EXCLUDED.hero_subtitle, elec_intro = EXCLUDED.elec_intro, textile_intro = EXCLUDED.textile_intro, updated_at = now();

-- Produits
INSERT INTO public.products (id, shop, name, brand, category, price, availability, capacity, colors, condition, reference, description, specs, model, image, source_image, is_new, hidden, created_at, display_order) VALUES
('samsung-a14', 'electronique', 'Samsung A14', 'samsung', 'smartphones', 90000, 'disponible', NULL, 'Noir, Argent, Vert', 'Neuf scellé', 'SM-A145F', 'Smartphone Samsung Galaxy A14, grand écran fluide et autonomie longue durée.', 'Écran 6.6" FHD+
Triple caméra 50 MP
Batterie 5000 mAh
Recharge rapide', NULL, '/images/products/electronique/samsung-a14.webp', 'https://i.ibb.co/LdztL2Kf/IMG-6725.webp', false, false, 1, 1),
('iphone-13-pro-max', 'electronique', 'iPhone 13 Pro Max — 256 Go', 'apple', 'smartphones', 300000, 'disponible', '256 Go', 'Bleu Alpin, Graphite, Or', 'Excellent état', 'A2643', 'Apple iPhone 13 Pro Max avec écran Super Retina XDR ProMotion 120Hz et triple capteur photo professionnel.', 'Écran 6.7" Super Retina XDR ProMotion
Puce A15 Bionic
Triple appareil photo 12 MP avec zoom optique
Autonomie exceptionnelle', NULL, '/images/products/electronique/iphone-13-pro-max.jpg', 'https://i.ibb.co/d1W1N3k/IMG-6726.jpg', false, false, 2, 2),
('samsung-note-20-ultra', 'electronique', 'Samsung Note 20 Ultra — 256 Go', 'samsung', 'smartphones', 150000, 'disponible', '256 Go', 'Mystic Bronze, Mystic Black', 'Très bon état', 'SM-N986B', 'Samsung Galaxy Note 20 Ultra avec stylet S-Pen ultra-réactif et écran Dynamic AMOLED 2X.', 'Écran 6.9" Dynamic AMOLED 120Hz
Stylet S-Pen intégré
Capteur 108 MP avec Space Zoom 50x
Compatibilité 5G', NULL, '/images/products/electronique/samsung-note-20-ultra.jpg', 'https://i.ibb.co/whbRgZjB/IMG-6727.jpg', false, false, 3, 3),
('iphone-12-pro-max', 'electronique', 'iPhone 12 Pro Max — 256 Go', 'apple', 'smartphones', 230000, 'disponible', '256 Go', 'Bleu Pacifique, Graphite, Argent', 'Très bon état', 'A2411', 'iPhone 12 Pro Max, design élégant en acier chirurgical avec Ceramic Shield et compatibilité MagSafe.', 'Écran 6.7" Super Retina XDR
Puce A14 Bionic
Scanner LiDAR pour réalité augmentée et portraits de nuit
Enregistrement vidéo Dolby Vision HDR', NULL, '/images/products/electronique/iphone-12-pro-max.webp', 'https://i.ibb.co/chF0jcnM/IMG-6728.webp', false, false, 4, 4),
('samsung-s24-ultra', 'electronique', 'Samsung S24 Ultra — 256 Go', 'samsung', 'smartphones', 400000, 'disponible', '256 Go', 'Titane Gris, Titane Noir, Titane Violet', 'Neuf scellé', 'SM-S928B', 'Le fleuron de Samsung avec cadre en titane ultra-résistant, processeur Snapdragon 8 Gen 3 et fonctionnalités Galaxy AI.', 'Écran plat 6.8" QHD+ Dynamic AMOLED 2X
Capteur principal 200 MP avec zoom optique haute résolution
Stylet S-Pen inclus
Batterie 5000 mAh', NULL, '/images/products/electronique/samsung-s24-ultra.jpg', 'https://i.ibb.co/3YdBZDgs/IMG-6729.jpg', true, false, 5, 5),
('iphone-x', 'electronique', 'iPhone X — 256 Go', 'apple', 'smartphones', 100000, 'disponible', '256 Go', 'Gris Sidéral, Argent', 'Bon état révisé', 'A1901', 'iPhone X avec écran OLED Super Retina bord à bord, Face ID et double appareil photo avec stabilisation optique.', 'Écran 5.8" Super Retina OLED
Reconnaissance faciale Face ID sécurisée
Double caméra 12 MP grand-angle et téléobjectif
Recharge sans fil', NULL, '/images/products/electronique/iphone-x.jpg', 'https://i.ibb.co/BVy1S4x8/IMG-6730.jpg', false, false, 6, 6),
('iphone-16-pro-max', 'electronique', 'iPhone 16 Pro Max — 256 Go', 'apple', 'smartphones', 630000, 'disponible', '256 Go', 'Titane Naturel, Titane Désert, Titane Noir', 'Neuf scellé sous boîte', 'A3296', 'Le dernier né haut de gamme d’Apple : écran immersif 6.9", commande de l’appareil photo tactile et puce A18 Pro.', 'Écran 6.9" Super Retina XDR ProMotion
Puce A18 Pro surpuissante
Bouton Commande de l’appareil photo
Autonomie record', NULL, '/images/products/electronique/iphone-16-pro-max.webp', 'https://i.ibb.co/xSpFRwQd/IMG-6731.webp', true, false, 7, 7),
('iphone-14-pro-max', 'electronique', 'iPhone 14 Pro Max', 'apple', 'smartphones', NULL, 'non_precise', NULL, 'Violet Intense, Noir Sidéral, Or', 'Selon arrivage', 'A2894', 'iPhone 14 Pro Max avec Dynamic Island interactive et capteur photo principal 48 MP.', 'Écran 6.7" Super Retina XDR avec Dynamic Island
Puce A16 Bionic
Capteur 48 MP
Mode Action pour vidéos ultra-stables', NULL, '/images/products/electronique/iphone-14-pro-max.webp', 'https://i.ibb.co/4nWv0TMs/IMG-6732.webp', false, false, 8, 8),
('samsung-s23-ultra', 'electronique', 'Samsung S23 Ultra', 'samsung', 'smartphones', NULL, 'non_precise', NULL, 'Vert, Noir Fantôme, Crème', 'Selon arrivage', 'SM-S918B', 'Samsung Galaxy S23 Ultra, capteur 200 MP révolutionnaire et performances gaming de premier ordre.', 'Écran 6.8" Dynamic AMOLED 2X 120Hz
Puce Snapdragon 8 Gen 2 for Galaxy
Capteur 200 MP et zoom 100x
Stylet S-Pen', NULL, '/images/products/electronique/samsung-s23-ultra.webp', 'https://i.ibb.co/TxXR4NPj/IMG-6734.webp', false, false, 9, 9),
('iphone-x-max', 'electronique', 'iPhone X Max', 'apple', 'smartphones', NULL, 'non_precise', NULL, 'Or, Gris Sidéral, Argent', 'Selon arrivage', 'A2101', 'Grand écran Super Retina OLED 6.5 pouces et finition de prestige.', 'Écran 6.5" Super Retina OLED
Puce A12 Bionic
Face ID
Double appareil photo 12 MP', NULL, '/images/products/electronique/iphone-x-max.jpg', 'https://i.ibb.co/MyPdrSxq/IMG-6735.jpg', false, false, 10, 10),
('iphone-15', 'electronique', 'iPhone 15', 'apple', 'smartphones', NULL, 'non_precise', NULL, 'Rose, Jaune, Vert, Bleu, Noir', 'Selon arrivage', 'A3090', 'iPhone 15 avec Dynamic Island, port universel USB-C et appareil photo 48 MP.', 'Écran 6.1" Super Retina XDR avec Dynamic Island
Puce A16 Bionic
Capteur 48 MP
Port USB-C', NULL, '/images/products/electronique/iphone-15.webp', 'https://i.ibb.co/5X7Q3wtJ/IMG-6736.webp', false, false, 11, 11),
('bazin-drews', 'textile', 'Bazin Drews', 'drews', 'bazins', 11000, 'disponible', NULL, NULL, NULL, NULL, 'Bazin Drews de première qualité, réputé pour sa tenue impeccable, sa brillance éclatante et la finesse de son tissage.', '100% Coton peigné supérieur
Brillance longue tenue
Idéal pour grands boubous et cérémonies
Largeur standard export', 'Bazin Riche Damassé', '/images/products/textile/bazin-drews.jpg', 'https://i.ibb.co/m5YVjNyq/33914-DC5-AC3-B-4-FED-900-B-FAE666-D7-FDCE.png', false, false, 1, 1),
('bazin-gagny-lah', 'textile', 'Bazin Gagny Lah', 'gagny-lah', 'bazins', 12500, 'disponible', NULL, NULL, NULL, NULL, 'Véritable Bazin Riche Gagny Lah, célèbre pour son éclat prestigieux, sa texture soyeuse et ses motifs damassés incomparables.', 'Qualité Gagny Lah originale certifiée
Teinture riche et reflets éclatants
Tenue majestueuse pour les occasions d’exception', 'Bazin Riche Authentique', '/images/products/textile/bazin-gagny-lah.jpg', 'https://i.ibb.co/CKrV5K7C/562-A8232-EBA6-4354-997-D-7-E162-C8-F92-CD.png', true, false, 2, 2),
('bazin-getzner', 'textile', 'Bazin Getzner', 'getzner', 'bazins', 10000, 'disponible', NULL, NULL, NULL, NULL, 'Bazin autrichien Getzner authentique, la référence internationale du damas pour son raffinement absolu.', 'Tissage d’Autriche Getzner authentique
Motifs jacquard haute définition
Toucher soyeux et tenue noble', 'Bazin Autrichien Damassé', '/images/products/textile/bazin-getzner.jpg', 'https://i.ibb.co/qMXLbNsn/E694684-B-5-A0-A-41-C3-829-F-338-C0-A4659-B4.png', false, false, 3, 3),
('bazin-getzner-1', 'textile', 'Bazin Getzner — Bleu Turquoise', 'getzner', 'bazins', 10000, 'disponible', NULL, NULL, NULL, NULL, 'Bazin autrichien Getzner authentique, brillance éclatante et tissage damassé soyeux en nuance bleu turquoise.', 'Tissage d’Autriche Getzner authentique
Motifs jacquard haute définition
Toucher soyeux et tenue noble
Largeur standard grand boubou', 'Bazin Autrichien Damassé', '/images/products/textile/bazin-getzner-1.jpg', 'https://i.ibb.co/HDy0NDV7/878b1df5-ba13-426c-94e0-831334e27b3a.jpg', true, false, 4, 4),
('bazin-getzner-2', 'textile', 'Bazin Getzner — Lilas Nacré', 'getzner', 'bazins', 10000, 'disponible', NULL, NULL, NULL, NULL, 'Bazin autrichien Getzner authentique en nuance lilas nacré avec reflets scintillants et damas précieux.', 'Tissage d’Autriche Getzner authentique
Motifs jacquard haute définition
Toucher soyeux et tenue noble
Largeur standard grand boubou', 'Bazin Autrichien Damassé', '/images/products/textile/bazin-getzner-2.jpg', 'https://i.ibb.co/nN1jbNnX/1fde637b-c79f-4b62-9da7-26ba0843c72e.jpg', true, false, 5, 5),
('bazin-getzner-3', 'textile', 'Bazin Getzner — Gris Anthracite', 'getzner', 'bazins', 10000, 'disponible', NULL, NULL, NULL, NULL, 'Bazin autrichien Getzner authentique en gris anthracite profond, tissage damassé noble pour cérémonies.', 'Tissage d’Autriche Getzner authentique
Motifs jacquard haute définition
Toucher soyeux et tenue noble
Largeur standard grand boubou', 'Bazin Autrichien Damassé', '/images/products/textile/bazin-getzner-3.jpg', 'https://i.ibb.co/MDgBRzZ1/71d867e8-ca26-45e9-9b04-98d8cd2f2b34.jpg', true, false, 6, 6),
('bazin-getzner-4', 'textile', 'Bazin Getzner — Bleu Glacier', 'getzner', 'bazins', 10000, 'disponible', NULL, NULL, NULL, NULL, 'Bazin autrichien Getzner authentique ton bleu glacier doux avec damas géométrique lumineux.', 'Tissage d’Autriche Getzner authentique
Motifs jacquard haute définition
Toucher soyeux et tenue noble
Largeur standard grand boubou', 'Bazin Autrichien Damassé', '/images/products/textile/bazin-getzner-4.jpg', 'https://i.ibb.co/53srJVf/0fc307b5-c713-49ae-8f61-d951283df64d.jpg', true, false, 7, 7),
('bazin-getzner-5', 'textile', 'Bazin Getzner — Bleu Canard', 'getzner', 'bazins', 10000, 'disponible', NULL, NULL, NULL, NULL, 'Bazin autrichien Getzner authentique bleu canard aux reflets océaniques, broderie damassée prestigieuse.', 'Tissage d’Autriche Getzner authentique
Motifs jacquard haute définition
Toucher soyeux et tenue noble
Largeur standard grand boubou', 'Bazin Autrichien Damassé', '/images/products/textile/bazin-getzner-5.jpg', 'https://i.ibb.co/pBQJFq5t/b48e8966-9e87-4afc-a49b-6bf5ae7b4c55.jpg', true, false, 8, 8),
('bazin-getzner-6', 'textile', 'Bazin Getzner — Bleu Royal', 'getzner', 'bazins', 10000, 'disponible', NULL, NULL, NULL, NULL, 'Bazin autrichien Getzner authentique bleu royal vif, éclat majestueux et texture damassée 100% coton peigné.', 'Tissage d’Autriche Getzner authentique
Motifs jacquard haute définition
Toucher soyeux et tenue noble
Largeur standard grand boubou', 'Bazin Autrichien Damassé', '/images/products/textile/bazin-getzner-6.jpg', 'https://i.ibb.co/Rp2q5p9N/1ac6d4cd-bd35-4393-b4da-a2f0259d23c2.jpg', true, false, 9, 9),
('bazin-getzner-7', 'textile', 'Bazin Getzner — Gris Ardoise', 'getzner', 'bazins', 10000, 'disponible', NULL, NULL, NULL, NULL, 'Bazin autrichien Getzner authentique gris ardoise élégant, brillance sobre et tenue remarquable.', 'Tissage d’Autriche Getzner authentique
Motifs jacquard haute définition
Toucher soyeux et tenue noble
Largeur standard grand boubou', 'Bazin Autrichien Damassé', '/images/products/textile/bazin-getzner-7.jpg', 'https://i.ibb.co/WWZWbZzr/eae83e82-c7fd-4790-9175-d0f4c6d72261.jpg', true, false, 10, 10),
('bazin-getzner-8', 'textile', 'Bazin Getzner — Violet Prune', 'getzner', 'bazins', 10000, 'disponible', NULL, NULL, NULL, NULL, 'Bazin autrichien Getzner authentique violet prune profond, damas raffiné pour tenues traditionnelles de prestige.', 'Tissage d’Autriche Getzner authentique
Motifs jacquard haute définition
Toucher soyeux et tenue noble
Largeur standard grand boubou', 'Bazin Autrichien Damassé', '/images/products/textile/bazin-getzner-8.jpg', 'https://i.ibb.co/SGkHhjb/26b13441-a900-4067-9e00-ede449e060c2.jpg', true, false, 11, 11),
('bazin-getzner-9', 'textile', 'Bazin Getzner — Bleu Azur', 'getzner', 'bazins', 10000, 'disponible', NULL, NULL, NULL, NULL, 'Bazin autrichien Getzner authentique bleu azur lumineux, finesse du tissage jacquard et éclat intense.', 'Tissage d’Autriche Getzner authentique
Motifs jacquard haute définition
Toucher soyeux et tenue noble
Largeur standard grand boubou', 'Bazin Autrichien Damassé', '/images/products/textile/bazin-getzner-9.jpg', 'https://i.ibb.co/CKf2YvxZ/2a37cce8-6c6e-447a-ab15-d52187146907.jpg', true, false, 12, 12),
('bazin-getzner-10', 'textile', 'Bazin Getzner — Gris Perle Argenté', 'getzner', 'bazins', 10000, 'disponible', NULL, NULL, NULL, NULL, 'Bazin autrichien Getzner authentique gris perle aux reflets argentés, souplesse et tenue de grand apparat.', 'Tissage d’Autriche Getzner authentique
Motifs jacquard haute définition
Toucher soyeux et tenue noble
Largeur standard grand boubou', 'Bazin Autrichien Damassé', '/images/products/textile/bazin-getzner-10.jpg', 'https://i.ibb.co/fGXcMTkn/fc191a94-7175-49a5-99ba-6b349f580550.jpg', true, false, 13, 13),
('bazin-getzner-11', 'textile', 'Bazin Getzner — Mauve Parme', 'getzner', 'bazins', 10000, 'disponible', NULL, NULL, NULL, NULL, 'Bazin autrichien Getzner authentique nuance mauve parme éclatant, motifs damassés autrichiens d’exception.', 'Tissage d’Autriche Getzner authentique
Motifs jacquard haute définition
Toucher soyeux et tenue noble
Largeur standard grand boubou', 'Bazin Autrichien Damassé', '/images/products/textile/bazin-getzner-11.jpg', 'https://i.ibb.co/vxYJTPxX/afdaf383-fcee-4d72-87a6-3febdb816eac.jpg', true, false, 14, 14),
('bazin-getzner-12', 'textile', 'Bazin Getzner — Lavande Doux', 'getzner', 'bazins', 10000, 'disponible', NULL, NULL, NULL, NULL, 'Bazin autrichien Getzner authentique ton lavande doux, soyeux au toucher et brillance naturelle longue durée.', 'Tissage d’Autriche Getzner authentique
Motifs jacquard haute définition
Toucher soyeux et tenue noble
Largeur standard grand boubou', 'Bazin Autrichien Damassé', '/images/products/textile/bazin-getzner-12.jpg', 'https://i.ibb.co/S4Db2wvr/30928e90-ba51-4a32-8793-4b9ecaf3e8b9.jpg', true, false, 15, 15),
('bazin-getzner-13', 'textile', 'Bazin Getzner — Noir Ébène', 'getzner', 'bazins', 10000, 'disponible', NULL, NULL, NULL, NULL, 'Bazin autrichien Getzner authentique noir ébène profond, damas sombre au lustre exceptionnel pour grandes cérémonies.', 'Tissage d’Autriche Getzner authentique
Motifs jacquard haute définition
Toucher soyeux et tenue noble
Largeur standard grand boubou', 'Bazin Autrichien Damassé', '/images/products/textile/bazin-getzner-13.jpg', 'https://i.ibb.co/ns7zmGSp/07e6fdcc-d3e3-4125-b7c3-d83414c5a1ed.jpg', true, false, 16, 16),
('bazin-getzner-14', 'textile', 'Bazin Getzner — Violet Impérial', 'getzner', 'bazins', 10000, 'disponible', NULL, NULL, NULL, NULL, 'Bazin autrichien Getzner authentique violet impérial, nuances majestueuses et tissage damassé haute définition.', 'Tissage d’Autriche Getzner authentique
Motifs jacquard haute définition
Toucher soyeux et tenue noble
Largeur standard grand boubou', 'Bazin Autrichien Damassé', '/images/products/textile/bazin-getzner-14.jpg', 'https://i.ibb.co/fdMcNVfr/6064af33-0e3b-4105-81a0-6248d213e00b.jpg', true, false, 17, 17),
('bazin-getzner-15', 'textile', 'Bazin Getzner — Bleu Cobalt', 'getzner', 'bazins', 10000, 'disponible', NULL, NULL, NULL, NULL, 'Bazin autrichien Getzner authentique bleu cobalt éclatant, damas noble d’Autriche avec tombé parfait.', 'Tissage d’Autriche Getzner authentique
Motifs jacquard haute définition
Toucher soyeux et tenue noble
Largeur standard grand boubou', 'Bazin Autrichien Damassé', '/images/products/textile/bazin-getzner-15.jpg', 'https://i.ibb.co/tPN3cPww/5c515e47-de35-40ed-93a8-0455a8bc1367.jpg', true, false, 18, 18)
ON CONFLICT (id) DO UPDATE SET shop = EXCLUDED.shop, name = EXCLUDED.name, brand = EXCLUDED.brand, category = EXCLUDED.category, price = EXCLUDED.price, availability = EXCLUDED.availability, capacity = EXCLUDED.capacity, colors = EXCLUDED.colors, condition = EXCLUDED.condition, reference = EXCLUDED.reference, description = EXCLUDED.description, specs = EXCLUDED.specs, model = EXCLUDED.model, image = EXCLUDED.image, source_image = EXCLUDED.source_image, is_new = EXCLUDED.is_new, hidden = EXCLUDED.hidden;

-- Marques textiles
INSERT INTO public.brands (id, name, logo, source_logo, display_order) VALUES
('drews', 'Drews', '/images/brands/drews.jpg', 'https://i.ibb.co/m5YVjNyq/33914-DC5-AC3-B-4-FED-900-B-FAE666-D7-FDCE.png', 1),
('gagny-lah', 'Gagny Lah', '/images/brands/gagny-lah.jpg', 'https://i.ibb.co/CKrV5K7C/562-A8232-EBA6-4354-997-D-7-E162-C8-F92-CD.png', 2),
('getzner', 'Getzner', '/images/brands/getzner.jpg', 'https://i.ibb.co/qMXLbNsn/E694684-B-5-A0-A-41-C3-829-F-338-C0-A4659-B4.png', 3)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, logo = EXCLUDED.logo, source_logo = EXCLUDED.source_logo, display_order = EXCLUDED.display_order;

-- Sélections « à la une »
DELETE FROM public.featured;
INSERT INTO public.featured (shop, product_id, display_order) VALUES
('electronique', 'iphone-16-pro-max', 1),
('electronique', 'samsung-s24-ultra', 2),
('electronique', 'iphone-13-pro-max', 3),
('electronique', 'samsung-a14', 4),
('textile', 'bazin-getzner-1', 1),
('textile', 'bazin-getzner-2', 2),
('textile', 'bazin-getzner-3', 3),
('textile', 'bazin-getzner-4', 4),
('textile', 'bazin-getzner-5', 5),
('textile', 'bazin-getzner-6', 6),
('textile', 'bazin-drews', 7),
('textile', 'bazin-gagny-lah', 8);

-- Références « Expérience entrepreneuriale »
INSERT INTO public.experience_references (id, title, domain, description, beneficiary, procedure, location, execution, validation, published, photos, documents, display_order, created_at, updated_at, published_at) VALUES
('exp-btp-agadez', 'Construction du mur de clôture et réhabilitation de la Maison d’arrêt d’Agadez', 'btp', 'Construction du mur de clôture de la Maison d’arrêt d’Agadez et réhabilitation de l’établissement, à la suite d’un appel d’offres.', 'Maison d’arrêt d’Agadez', 'Appel d’offres', 'Agadez', 'non_confirme', 'valide', true, '[]'::jsonb, '[]'::jsonb, 1, 1768435200000, 1768435200000, 1768435200000),
('exp-btp-tchirozerine-tribunal', 'Construction du mur de clôture et réhabilitation du Tribunal d’instance de Tchirozérine', 'btp', 'Construction du mur de clôture du Tribunal d’instance de Tchirozérine et réhabilitation de l’établissement, à la suite d’une demande de cotation (DC).', 'Tribunal d’instance de Tchirozérine', 'Demande de cotation (DC)', 'Tchirozérine', 'non_confirme', 'valide', true, '[]'::jsonb, '[]'::jsonb, 2, 1768435200000, 1768435200000, 1768435200000),
('exp-btp-madarounfa', 'Construction du mur de clôture et réhabilitation de la Maison d’arrêt de Madarounfa', 'btp', 'Construction de la clôture de la Maison d’arrêt de Madarounfa et réhabilitation de l’établissement, à la suite d’une demande de cotation (DC).', 'Maison d’arrêt de Madarounfa', 'Demande de cotation (DC)', 'Madarounfa', 'non_confirme', 'valide', true, '[]'::jsonb, '[]'::jsonb, 3, 1768435200000, 1768435200000, 1768435200000),
('exp-btp-aguie', 'Réhabilitation de la Maison d’arrêt d’Aguié', 'btp', 'Réhabilitation de la Maison d’arrêt d’Aguié.', 'Maison d’arrêt d’Aguié', NULL, 'Aguié', 'non_confirme', 'valide', true, '[]'::jsonb, '[]'::jsonb, 4, 1768435200000, 1768435200000, 1768435200000),
('exp-btp-zinder-tgi', 'Construction du bloc d’audience et réhabilitation de l’ensemble du Tribunal de grande instance (TGI) de Zinder', 'btp', 'Construction du bloc d’audience du Tribunal de grande instance (TGI) de Zinder et réhabilitation de l’ensemble du TGI, à la suite d’un appel d’offres et d’une demande de renseignement et de prix (DRP).', 'Tribunal de grande instance (TGI) de Zinder', 'Appel d’offres et demande de renseignement et de prix (DRP)', 'Zinder', 'non_confirme', 'valide', true, '[]'::jsonb, '[]'::jsonb, 5, 1768435200000, 1768435200000, 1768435200000),
('exp-btp-faj', 'Construction de guérites et réhabilitation des installations de la FAJ', 'btp', 'Construction de guérites à la FAJ et réhabilitation de l’ensemble de la Direction.', 'FAJ', NULL, NULL, 'non_confirme', 'valide', true, '[]'::jsonb, '[]'::jsonb, 6, 1768435200000, 1768435200000, 1768435200000),
('exp-info-giz', 'Livraisons répétées de matériels informatiques à la GIZ', 'informatique', 'Livraisons répétées de matériels informatiques auprès de la GIZ, à la suite de plusieurs appels d’offres.', 'GIZ', 'Plusieurs appels d’offres', NULL, 'non_confirme', 'valide', true, '[]'::jsonb, '[]'::jsonb, 10, 1768435200000, 1768435200000, 1768435200000),
('exp-info-fao', 'Livraisons répétées de matériels informatiques à la FAO', 'informatique', 'Livraisons répétées de matériels informatiques auprès de la FAO, à la suite de plusieurs appels d’offres.', 'FAO', 'Plusieurs appels d’offres', NULL, 'non_confirme', 'valide', true, '[]'::jsonb, '[]'::jsonb, 11, 1768435200000, 1768435200000, 1768435200000),
('exp-info-croix-rouge', 'Livraisons de matériels informatiques à la Croix-Rouge Niger', 'informatique', 'Livraisons de matériels informatiques auprès de la Croix-Rouge Niger à plusieurs reprises.', 'Croix-Rouge Niger', NULL, NULL, 'non_confirme', 'valide', true, '[]'::jsonb, '[]'::jsonb, 12, 1768435200000, 1768435200000, 1768435200000),
('exp-info-mca', 'Fourniture de matériels informatiques au Millennium Challenge Account (MCA)', 'informatique', 'Fourniture de matériels informatiques au Millennium Challenge Account (MCA), à la suite d’un appel d’offres.', 'Millennium Challenge Account (MCA)', 'Appel d’offres', NULL, 'non_confirme', 'valide', true, '[]'::jsonb, '[]'::jsonb, 13, 1768435200000, 1768435200000, 1768435200000),
('exp-info-justice', 'Livraisons répétées de matériels informatiques au ministère de la Justice du Niger', 'informatique', 'Livraisons répétées de matériels informatiques auprès du ministère de la Justice du Niger, à la suite de plusieurs appels d’offres ouverts.', 'Ministère de la Justice du Niger', 'Plusieurs appels d’offres ouverts', NULL, 'non_confirme', 'valide', true, '[]'::jsonb, '[]'::jsonb, 14, 1768435200000, 1768435200000, 1768435200000),
('exp-info-faj', 'Livraison de matériels informatiques à la FAJ', 'informatique', 'Livraison de matériels informatiques auprès de la FAJ, à la suite d’appels d’offres.', 'FAJ', 'Appels d’offres', NULL, 'non_confirme', 'valide', true, '[]'::jsonb, '[]'::jsonb, 15, 1768435200000, 1768435200000, 1768435200000),
('exp-info-jeunesse-sports', 'Fourniture de matériels destinés à l’organisation des examens', 'informatique', 'Fourniture de matériels destinés à l’organisation des examens auprès du ministère de la Jeunesse et des Sports du Niger.', 'Ministère de la Jeunesse et des Sports du Niger', NULL, NULL, 'non_confirme', 'valide', true, '[]'::jsonb, '[]'::jsonb, 16, 1768435200000, 1768435200000, 1768435200000),
('exp-vivrier-tchirozerine-inspection', 'Livraisons répétées de fournitures vivrières à l’Inspection de l’enseignement primaire et préscolaire de Tchirozérine', 'vivrier', 'Livraisons répétées de fournitures vivrières auprès de l’Inspection de l’enseignement primaire et préscolaire de Tchirozérine, à la suite d’un appel d’offres ouvert.', 'Inspection de l’enseignement primaire et préscolaire de Tchirozérine', 'Appel d’offres ouvert', 'Tchirozérine', 'non_confirme', 'valide', true, '[]'::jsonb, '[]'::jsonb, 20, 1768435200000, 1768435200000, 1768435200000)
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, domain = EXCLUDED.domain, description = EXCLUDED.description, beneficiary = EXCLUDED.beneficiary, procedure = EXCLUDED.procedure, location = EXCLUDED.location, execution = EXCLUDED.execution, validation = EXCLUDED.validation, published = EXCLUDED.published, photos = EXCLUDED.photos, documents = EXCLUDED.documents, display_order = EXCLUDED.display_order, updated_at = EXCLUDED.updated_at, published_at = EXCLUDED.published_at;

COMMIT;
