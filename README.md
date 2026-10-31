# ALFFA NIGER — Plateforme E-Commerce Officielle

Plateforme web e-commerce moderne, dynamique, responsive et rapide pour **ALFFA NIGER** (« *La qualité au meilleur prix.* »), séparant strictement ses deux univers commerciaux :
1. **ALFFA NIGER Électronique** (`/electronique`) : Smartphones neufs et révisés (iPhone / Apple, Samsung Galaxy), accessoires et appareils électroniques avec prix en FCFA et commandes directes par WhatsApp.
2. **ALFFA NIGER Textile** (`/textile`) : Bazins riches et étoffes damassées d'exception (Drews, Gagny Lah, Getzner d'Autriche).

---

## 1. Caractéristiques Principales

- **Deux univers distincts et étanches** : Catalogues, fiches produits, marques, filtres, sélections « À la une » et numéros WhatsApp entièrement séparés.
- **Photos réelles intégrées** : Toutes les photos fournies ont été téléchargées et intégrées en local dans `public/images/products/` et `public/images/brands/` pour éviter toute coupure ou erreur 403, avec `object-fit: contain` pour les smartphones et `object-fit: cover` pour valoriser les motifs des bazins.
- **Prix en FCFA** : Affichage soigné en francs CFA (ex: `90 000 FCFA`) et mention explicite « *Prix à confirmer / Nous consulter* » pour les modèles sans prix arrêté.
- **Commande WhatsApp pré-remplie** : Génère automatiquement un message personnalisé incluant le nom de la boutique, le modèle, la capacité/variante, le prix, la quantité demandée et le lien de la fiche. Contrôle du format international (ex. 227XXXXXXXX pour le Niger).
- **Administration complète (7 sections)** :
  1. *Tableau de bord* : Indicateurs clés (nombre de produits par boutique, en stock, prix à confirmer, sélections à la une) et checklist de complétion.
  2. *Produits Électronique* : Ajout, modification complète, suppression avec confirmation, masquage, réorganisation de l'ordre d'affichage.
  3. *Produits Textile* : Gestion complète des bazins et tissus.
  4. *Produits à la une* : Gestion et ordonnancement de la sélection mise en avant sur chaque boutique.
  5. *Marques textiles* : Gestion des marques (Drews, Gagny Lah, Getzner) et téléversement de logos.
  6. *Coordonnées & Paramètres* : Numéros WhatsApp, téléphone, email, adresse, horaires, liens sociaux, textes de présentation, mentions légales.
  7. *Images & Médias* : Téléversement et optimisation d'images jusqu'à 8 Mo.
- **Persistance réelle des données** : Base de données locale persistante (`data/database.json`) avec sauvegarde/restauration JSON et cache réactif côté client.
- **SEO & Référencement** : Balises Open Graph, Twitter cards, balises canoniques, microdonnées Schema.org (`Product`, `Organization`), fichiers `sitemap.xml` et `robots.txt`.

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

### Où est réellement publié le site

Le domaine **alffaniger.com** est servi par un **hébergement mutualisé LWS** (fichiers statiques), et non par Vercel.
Conséquence : un commit sur `main` **ne met pas le site à jour automatiquement**. Il faut régénérer l'archive de production et l'envoyer sur LWS.

```bash
npm run build
# puis reconstituer l'archive : dist/ + public/.htaccess + public/README_DEPLOIEMENT_LWS.txt + data/database.json
```

L'archive prête à téléverser est servie par le site lui-même : **`/api/download/lws-zip`** (fichier `public/alffa-niger-lws.zip`).
Procédure détaillée : `public/README_DEPLOIEMENT_LWS.txt` (Gestionnaire de fichiers LWS → public_html → Charger → Extraire).

Le projet Vercel `alla-niger-ecom` reste connecté au dépôt et produit des **previews** pour chaque pull request, mais le domaine public n'est pas servi par Vercel.

### Hébergement statique (Vercel, Netlify, Firebase Hosting)

Le site compilé (`npm run build` → `dist/`) est une **application statique** : le serveur Express (`server.ts`) n'y est pas déployé.
En conséquence :

- **Page publique** : si `/api/experience` est indisponible (ou renvoie une page HTML), la rubrique bascule automatiquement sur le **catalogue publié intégré au build** (`src/data/experienceSeed.ts`). Aucun message d'erreur n'est présenté au visiteur ; une mention discrète indique que les références sont celles publiées à la date de mise en ligne.
- **Administration** : la gestion des références, des médias et des paramètres **nécessite le serveur** (`npm start`). Sur un hébergement statique, l'onglet affiche un message explicite.
- Les liens Google Maps des deux boutiques disposent de valeurs par défaut dans `src/data/initialData.ts`, donc ils s'affichent même sans API.

Pour que l'administration et les modifications soient aussi disponibles en production, déployez `server.ts` sur un hébergement Node (VPS, Render, Railway, LWS…) ou ajoutez des fonctions serverless.

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
```

**Configuration de prévisualisation** : `vite.config.ts` autorise désormais les hôtes de prévisualisation (`server.allowedHosts: true`), sans impact sur le comportement local.
