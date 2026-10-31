# ALFFA NIGER — Plateforme E-Commerce Officielle

Plateforme web e-commerce moderne, dynamique, responsive et rapide pour **ALFFA NIGER** (« *La qualité au meilleur prix.* »), séparant strictement ses deux univers commerciaux :
1. **ALFFA NIGER Électronique** (`/electronique`) : Smartphones neufs et révisés (iPhone / Apple, Samsung Galaxy), accessoires et appareils électroniques avec prix en FCFA et commandes directes par WhatsApp.
2. **ALFFA NIGER Textile** (`/textile`) : Bazins riches et étoffes damassées d'exception (Drews, Gagny Lah, Getzner d'Autriche).

---

## 1. Caractéristiques Principales

- **Deux univers distincts et étanches** : Catalogues, fiches produits, marques, filtres, sélections « À la une » et numéros WhatsApp entièrement séparés.
- **Photos réelles intégrées** : Toutes les photos fournies ont été téléchargées et intégrées en local dans `public/images/products/` et `public/images/brands/` pour éviter toute coupure ou erreur 403, avec `object-fit: contain` pour les smartphones et `object-fit: cover` pour valoriser les motifs des bazins.
- **Ordre d'affichage maîtrisé** : la position de chaque article est enregistrée en base (`products.display_order`, une liste par boutique) ; la flèche ↑ ↓ de l'administration est donc conservée après rechargement, y compris sur un hébergement statique.
- **Prix en FCFA** : Affichage soigné en francs CFA (ex: `90 000 FCFA`) et mention explicite « *Prix à confirmer / Nous consulter* » pour les modèles sans prix arrêté.
- **Commande WhatsApp pré-remplie** : Génère automatiquement un message personnalisé incluant le nom de la boutique, le modèle, la capacité/variante, le prix, la quantité demandée et le lien de la fiche. Contrôle du format international (ex. 227XXXXXXXX pour le Niger).
- **Administration complète (10 sections)** :
  1. *Tableau de bord* : Indicateurs clés (nombre de produits par boutique, en stock, prix à confirmer, sélections à la une) et checklist de complétion.
  2. *Produits Électronique* : Ajout, modification complète, suppression avec confirmation, masquage, réorganisation de l'ordre d'affichage.
  3. *Produits Textile* : Gestion complète des bazins et tissus.
  4. *Produits à la une* : Gestion et ordonnancement de la sélection mise en avant sur chaque boutique.
  5. *Marques textiles* : Gestion des marques (Drews, Gagny Lah, Getzner) et téléversement de logos.
  6. *Coordonnées & Paramètres* : Numéros WhatsApp, téléphone, email, adresse, horaires, liens sociaux, textes de présentation, mentions légales.
  7. *Images & Médias* : Téléversement et optimisation d'images jusqu'à 8 Mo.
  8. *Expérience entrepreneuriale* : parcours, étapes, galerie et publication.
  9. *Stock* : quantités par article, prix d'achat et de revente, valeur totale de la marchandise, alertes de réapprovisionnement et journal des mouvements (voir §5 bis).
  10. *Reçus* : atelier d'encaissement produisant un reçu imprimable et partageable, signé et daté (voir §5 bis).
- **Persistance réelle des données** : Base de données locale persistante (`data/database.json`) avec sauvegarde/restauration JSON et cache réactif côté client.
- **SEO & Référencement** : Balises Open Graph, Twitter cards, balises canoniques, microdonnées Schema.org (`Product`, `Organization`), fichiers `sitemap.xml` et `robots.txt`.

---

## 1 bis. Stock et Reçus

Deux modules pensés pour le quotidien de la boutique, disponibles en mode serveur **comme** sur l'hébergement statique LWS (fonctions PostgreSQL dédiées).

### Stock

- **Vue d'ensemble** : chaque article des deux univers apparaît avec sa quantité, son prix d'achat, son prix de vente et son seuil d'alerte.
- **Quatre indicateurs** : nombre d'articles suivis, **valeur d'achat du stock** (ce que la marchandise a coûté), **valeur de revente** avec la marge potentielle en FCFA et en pourcentage, nombre d'articles à réapprovisionner ou en rupture.
- **Mouvements** : entrée (livraison), sortie (casse, perte, usage interne), vente, retour, inventaire (quantité absolue) et ajustement. La quantité finale ne peut jamais devenir négative.
- **Seuil d'alerte par article** : une ligne passe en « à réapprovisionner » dès que la quantité atteint le seuil.
- **Journal** : les 60 derniers mouvements (article, type, quantité, motif, date) sont affichés ; les 2 000 derniers sont conservés.
- **Export CSV** de l'inventaire pour impression ou tableur.
- **Cohérence** : supprimer un produit du catalogue supprime aussi sa fiche de stock ; une vente enregistrée par un reçu décrémente automatiquement la quantité.

### Reçus

- **Atelier** : choix des articles dans le catalogue (quantité, prix unitaire modifiable, remise globale), mode de paiement (espèces, Orange Money, Moov Money, virement, chèque, à crédit), montant versé et note.
- **Calculs côté serveur** : sous-total, remise, total, monnaie à rendre et statut (`payé`, `partiel`, `crédit`) sont recalculés côté serveur ; le navigateur ne fait qu'afficher.
- **Numérotation continue** : `REC-ANNÉE-NNNN`, jamais réutilisée.
- **Document imprimable** : logo, dénomination, slogan, adresse, téléphone, **NIF et RCCM** (renseignés dans *Coordonnées & Paramètres*), numéro, date **et heure** d'émission, détail des articles, total en chiffres **et en lettres**, montant versé, reste à payer, mention « Le Gérant » avec le cachet (`public/images/tampon.jpg`). L'impression est isolée par une feuille de style dédiée (`@media print`) : seule la feuille du reçu sort, en A5.
- **Partage** : bouton *Partager* (partage natif du téléphone, repli WhatsApp avec le texte du reçu) et *Copier le texte* pour un envoi rapide au client.
- **Immuabilité** : un reçu enregistré ne se modifie pas. Une erreur se corrige par **annulation** : le reçu reste consultable avec la mention « ANNULÉ », et la marchandise concernée est automatiquement remise en stock.

### Où sont stockées ces données ?

- **Mode serveur** : `data/stock.json` et `data/receipts.json` (hors dépôt, voir `.gitignore`), écriture atomique.
- **Hébergement statique / Supabase** : tables `stock_items`, `stock_movements` et `receipts`, accessibles uniquement via les fonctions `admin_stock_overview`, `admin_stock_move`, `admin_list_receipts`, `admin_save_receipt` et `admin_void_receipt`, protégées par le jeton d'administration.

---

## 2. Démarrage et Utilisation

### Mode Développement
```bash
npm run dev
```
Le serveur démarre sur `http://localhost:3000` (Express + Vite).

### Construction pour Production
```bash
npm run build
```

### Lancement Production
```bash
npm start
```

---

## 3. Accès à l'Espace Administration

1. Rendez-vous sur `/#/admin` ou cliquez sur « **Accès Gestion** » dans le pied de page.
2. Saisissez le mot de passe administrateur :
   - Mot de passe par défaut : `alffa2025` (ou la valeur de la variable `ADMIN_PASSWORD` dans `.env`).
3. Vous pouvez changer ce mot de passe à tout moment directement depuis l'en-tête de l'administration via le bouton **« Changer mot de passe »**.

---

## 4. Déploiement Externe (Optionnel Firebase)

Si vous souhaitez héberger le catalogue sur votre propre projet Firebase (Firestore + Storage) :
1. Renseignez les variables dans `.env` (voir `.env.example`).
2. Déployez les règles de sécurité incluses :
   ```bash
   firebase deploy --only firestore:rules,storage
   ```
Les règles `firestore.rules` et `storage.rules` fournies protègent vos données en lecture publique et écriture restreinte aux administrateurs.

---

## 5. Rubrique « Expérience entrepreneuriale »

Nouvelle rubrique institutionnelle, accessible depuis l'en-tête, le pied de page et le tiroir mobile.

- **URL** : `/#/experience-entrepreneuriale`
- **Accès** : bouton **« Expérience entrepreneuriale »** placé en **premier** dans la zone des boutiques de la page d'accueil (dimensions, arrondis et typographie identiques aux boutons d'entrée des boutiques), plus entrée dans le menu et le pied de page.
- **Page** : `src/pages/Experience.tsx` (module isolé, n'affecte pas les boutiques)
- **Domaines** : BTP · Matériel informatique et fournitures · Fournitures vivrières
- **Filtres** : « Tous les domaines », BTP, Matériel informatique, Fournitures vivrières (fonctionnels)
- **Fiches** : titre, bénéficiaire, description factuelle, procédure mentionnée (si connue), état d'exécution, photographies authentiques ou emplacement neutre, documents publics autorisés, « Voir les détails ».
- **Illustrations** : trois visuels vectoriels sobres dans `public/images/experience/` (`btp.svg`, `informatique.svg`, `vivrier.svg`), produits pour la marque — aucune photographie de chantier simulée.

### Modèle de données

Fichier dédié **`data/experience-references.json`**, créé automatiquement au premier démarrage à partir de `src/data/experienceSeed.ts`.
Aucune migration ni suppression n'est effectuée sur `data/database.json`.

**Migration versionnée et non destructive** : le fichier contient `{ version, references }`. Quand `EXPERIENCE_SEED_VERSION` augmente, le serveur aligne les fiches **jamais modifiées par l'administrateur** (`updatedAt === createdAt`) et **préserve intégralement** celles qui ont été éditées, ainsi que les photos, documents et états de publication. Aucune fiche n'est supprimée.

Statuts : `brouillon` → `en_attente` → `valide`, plus l'indicateur de publication `published`.
**Une référence n'est visible sur le site public que si `validation = "valide"` ET `published = true`** — contrôle appliqué côté serveur (HTTP 400 sinon).
Documents : `visibility: "prive" | "public"`. La visibilité n'est pas déclarative : elle est **déduite du dossier de stockage réel** par le serveur.
- document public → `public/images/uploads/` (URL `/images/uploads/...`)
- document privé → `data/private-documents/`, hors de `public/`, servi uniquement par `/api/experience/documents/:fichier` après vérification du jeton.

Une photographie publiée doit obligatoirement comporter un texte alternatif descriptif (contrôlé côté serveur : HTTP 400 sinon).

### API

| Méthode | Route | Accès |
|---|---|---|
| GET | `/api/experience` | Public — références validées + publiées, documents publics uniquement |
| GET | `/api/admin/experience` | Administrateur (`Bearer <token>`) |
| POST | `/api/experience` | Administrateur |
| PUT | `/api/experience/:id` | Administrateur |
| DELETE | `/api/experience/:id` | Administrateur |
| POST | `/api/experience/documents/upload` | Administrateur (PDF/JPG/PNG/WebP, 8 Mo max) |
| GET | `/api/experience/documents/:fichier` | Administrateur — pièces privées |

### Administration

Onglet **« Expérience entrepreneuriale »** de `/#/admin` : ajout, modification, suppression (avec confirmation), domaine, description, bénéficiaire, procédure, photographies authentiques (texte alternatif obligatoire), documents privés/publics, statuts, enregistrement, prévisualisation, publication/dépublication.

### Déploiement automatique vers LWS (GitHub Actions)

Le workflow `.github/workflows/deploy-lws.yml` construit le site et l'envoie par FTP chez LWS
à chaque fusion sur `main` (ou manuellement via l'onglet **Actions**).

Mise en place, une seule fois — les identifiants sont saisis par le propriétaire du site,
dans GitHub → **Settings → Secrets and variables → Actions** :

| Secret | Contenu | Obligatoire |
|---|---|---|
| `FTP_SERVER` | hôte FTP LWS (ex. `ftp.alffaniger.com`) | oui |
| `FTP_USERNAME` | identifiant FTP | oui |
| `FTP_PASSWORD` | mot de passe FTP | oui |
| `FTP_SERVER_DIR` | dossier distant (défaut `./public_html/`) | non |

Le workflow vérifie les types (`tsc`), construit le site, contrôle la présence de `dist/index.html`
et de `dist/.htaccess` (routage SPA), puis synchronise. Il n'efface aucun fichier distant non suivi.

> Comparaison détaillée entre le site actuellement en ligne et ce dépôt : `docs/COMPARAISON-SITE-EN-LIGNE.md`.

### Où est réellement publié le site

Le domaine **alffaniger.com** est servi par un **hébergement mutualisé LWS** (fichiers statiques), et non par Vercel.
Conséquence : un commit sur `main` **ne met pas le site à jour automatiquement**. Il faut régénérer l'archive de production et l'envoyer sur LWS.

```bash
npm run build
# puis reconstituer l'archive : dist/ + public/.htaccess + public/README_DEPLOIEMENT_LWS.txt + data/database.json
```

L'archive prête à téléverser est servie par le site lui-même : **`/api/download/lws-zip`** (fichier `release/alffa-niger-lws.zip`).

> L'archive est volontairement stockée **hors de `public/`** : placée dans `public/`, Vite la recopiait dans `dist/` à chaque build (16 Mo inutiles, et croissance exponentielle à la régénération suivante).
Procédure détaillée : `public/README_DEPLOIEMENT_LWS.txt` (Gestionnaire de fichiers LWS → public_html → Charger → Extraire).

Le projet Vercel `alla-niger-ecom` reste connecté au dépôt et produit des **previews** pour chaque pull request, mais le domaine public n'est pas servi par Vercel.

### Hébergement statique (Vercel, Netlify, Firebase Hosting)

Le site compilé (`npm run build` → `dist/`) est une **application statique** : le serveur Express (`server.ts`) n'y est pas déployé.
En conséquence :

- **Page publique** : si `/api/experience` est indisponible (ou renvoie une page HTML), la rubrique bascule automatiquement sur le **catalogue publié intégré au build** (`src/data/experienceSeed.ts`). Aucun message d'erreur n'est présenté au visiteur ; une mention discrète indique que les références sont celles publiées à la date de mise en ligne.
- **Administration** : sans serveur Node, elle bascule automatiquement sur les fonctions PostgreSQL `admin_*` (mot de passe vérifié en base, jeton de session de 12 h) et sur la fonction Edge `upload` pour les fichiers. Produits, marques, sélections, paramètres, **réorganisation de l'ordre d'affichage** et références restent donc modifiables depuis un site 100 % statique. Détails et modèle de sécurité : `supabase/README.md`.
- Seule exception : la section **BTP** n'est pas modélisée en base et reste réservée à l'hébergement Node.
- Les liens Google Maps des deux boutiques disposent de valeurs par défaut dans `src/data/initialData.ts`, donc ils s'affichent même sans API.

### Dépannage : « j'enregistre dans l'administration et rien ne change »

L'administration fonctionne sur les deux hébergements (serveur Node et site
statique LWS), mais elle emprunte deux chemins différents :

| Hébergement | Chemin d'écriture |
|---|---|
| Node (`npm start`, Vercel) | `/api/...` (Express, jeton vérifié par `verifyAdmin`) |
| Statique (LWS) | fonctions PostgreSQL `admin_*` appelées avec la clé publique |

Le choix est automatique : `src/services/backend.ts` teste une fois
`/api/supabase/status`; si la réponse est du HTML (site statique), il bascule
sur la base.

À vérifier dans l'ordre quand un enregistrement ne prend pas :

1. **Le message affiché.** Il est désormais explicite (« Session expirée… »,
   « Base de données injoignable… ») et ne montre plus
   « Unexpected token '<' … is not valid JSON ».
2. **La session.** Elle expire après 12 h : se reconnecter sur `/#/admin`.
3. **La connexion.** L'onglet *Tableau de bord* contient un diagnostic
   Supabase (bouton de test) : il vérifie l'accès en lecture et la présence des
   tables.
4. **Le bon fichier déployé.** Le site doit contenir `assets/index-*.js`
   correspondant au dernier build ; un ancien bundle garde l'ancien
   comportement (vider le cache du navigateur).

> Correctif apporté : l'enregistrement d'une **fiche produit** et d'une
> **réalisation BTP** passait par `fetch('/api/products')` directement, au lieu
> de l'adaptateur `api()`. Sur LWS cette route n'existe pas : l'envoi partait
> dans le vide et l'interface affichait une erreur de syntaxe JSON. Les deux
> chemins passent maintenant par l'adaptateur, et un test de fumée dédié
> (`scripts/smoke-admin-save.tsx`) rejoue ce scénario en hébergement statique.

### Sécurité de l'administration

- Jeton de session à durée **glissante** : expiration après 12 h d'inactivité (`SESSION_TTL_MS`, valeur par défaut `43200000`).
- **Limitation des tentatives de connexion** : 10 échecs par IP sur 15 minutes (`LOGIN_MAX_ATTEMPTS`, `LOGIN_WINDOW_MS`) → HTTP 429.
- Contrôle d'autorisation serveur sur **toutes** les routes d'écriture (`verifyAdmin`), y compris l'upload de pièces.
- Visibilité des documents déduite du stockage réel ; aucun fichier privé n'est exposé par une URL statique.

### Variables d'environnement

Aucune variable nouvelle n'est **obligatoire**. `ADMIN_PASSWORD` (facultatif) protège l'administration ; les données restent dans `data/`.
Réglages facultatifs : `PORT` (défaut 3000), `SESSION_TTL_MS` (défaut 12 h), `LOGIN_MAX_ATTEMPTS` (défaut 10), `LOGIN_WINDOW_MS` (défaut 15 min).

### Tests de fumée (jsdom)

```bash
npm install --no-save jsdom
npx esbuild scripts/smoke-experience.tsx --bundle --platform=node --format=esm --target=node20 \
  --external:jsdom --outfile=scripts/.smoke.mjs --define:import.meta.env='{"MODE":"test"}'
node scripts/.smoke.mjs

npx esbuild scripts/smoke-admin-experience.tsx --bundle --platform=node --format=esm --target=node20 \
  --external:jsdom --outfile=scripts/.smoke-admin.mjs --define:import.meta.env='{"MODE":"test"}'
node scripts/.smoke-admin.mjs

# Adaptateur de données (site statique) : aucun navigateur requis
npx esbuild scripts/smoke-backend.ts --bundle --platform=node --format=esm --target=node20 \
  --outfile=scripts/.smoke-backend.mjs --define:import.meta.env='{"MODE":"test"}'
node scripts/.smoke-backend.mjs

# Enregistrement depuis l'administration sur un hébergement STATIQUE (jsdom)
npx esbuild scripts/smoke-admin-save.tsx --bundle --platform=node --format=esm --target=node20 \
  --external:jsdom --outfile=scripts/.smoke-admin-save.mjs --define:import.meta.env='{"MODE":"test"}'
node scripts/.smoke-admin-save.mjs

# Stock et reçus : chargement, mouvements, document imprimable (jsdom)
npx esbuild scripts/smoke-stock.tsx --bundle --platform=node --format=esm --target=node20 \
  --external:jsdom --outfile=scripts/.smoke-stock.mjs --define:import.meta.env='{"MODE":"test"}'
node scripts/.smoke-stock.mjs
```

**Configuration de prévisualisation** : `vite.config.ts` autorise désormais les hôtes de prévisualisation (`server.allowedHosts: true`), sans impact sur le comportement local.

## Base de données (Supabase)

Le catalogue et les références sont stockés dans PostgreSQL (projet `ALFFA NIGER`,
référence `blcrwjsrxcumtapymofn`). Le serveur lit et écrit via l'API Supabase avec
la clé `service_role` ; le navigateur n'a qu'un accès en lecture.

- Schéma : `supabase/schema.sql` — contenu initial : `supabase/seed.sql`
- Guide complet, variables d'environnement et modèle de sécurité : `supabase/README.md`
- Diagnostic en ligne : `GET /api/supabase/status`
