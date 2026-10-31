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
