# Comparaison — site en ligne (alffaniger.com / LWS) vs dépôt GitHub

Analyse réalisée le 31 octobre 2026 à partir des pages publiques récupérées en ligne
(accueil, rubrique Expérience, boutique Textile) et du code source du dépôt (`main`, commit `cc6138a`).

---

## 1. Nature de l'écart

Le site en ligne **n'est pas déployé automatiquement** depuis ce dépôt.

| | Site en ligne | Dépôt GitHub |
|---|---|---|
| Hébergeur | Hébergement mutualisé **LWS** (fichiers statiques) | GitHub |
| Mise à jour | Téléversement manuel d'une archive | `git push` |
| Contenu | Bundle **compilé et minifié** | Code source complet |
| Correspondance | Build d'une **autre base de code** (antérieure/différente) | Référence de développement |

Un commit sur `main` ne modifie donc jamais le site en ligne.
Le projet Vercel connecté au dépôt ne produit que des *previews* de pull request : il ne sert pas le domaine.

---

## 2. Différences constatées

### 2.1 Accueil

| Élément | Site en ligne | Dépôt |
|---|---|---|
| Libellé du bouton | « Expériences professionnelles » | « Expérience entrepreneuriale » |
| Position | Premier de la zone boutiques | Premier de la zone boutiques ✅ identique |
| Bloc dédié | Section « Nos expériences professionnelles » avec 3 illustrations | Pas de section supplémentaire |
| Illustrations | `/images/experience/btp.svg`, `informatique.svg`, `vivrier.svg` | **Absentes du dépôt** — icônes Lucide à la place |

### 2.2 Rubrique Expérience entrepreneuriale

| Élément | Site en ligne | Dépôt |
|---|---|---|
| Titre | « Notre expérience entrepreneuriale » | ✅ identique |
| Texte introductif | Ancienne version (« ALFFA NIGER développe son expérience… ») | Version validée (« À travers ses différentes interventions… ») |
| Catégorie 2 | « Matériel informatique et fournitures » | « Matériel informatique » |
| Catégorie 3 | « Fourniture de produits vivriers » | « Fournitures vivrières » |
| Sigles | Bruts : « DC », « Appel d'offres et DRP », « MCA », « Faj » | Développés : demande de cotation, renseignement et prix, Millennium Challenge Account, FAJ |
| Nombre de références | 14 | 14 ✅ identique |
| Filtres par domaine | Présents | Présents ✅ |
| Mise en page des fiches | Listes à puces « Prestations documentées » + illustration SVG | Cartes avec icônes, badges, bouton « Voir les détails » |
| Fiche détaillée | Non observée | Modale complète (Échap pour fermer) |
| Encart transparence | Absent | Présent |
| Bloc final | « Nous contacter » | WhatsApp + coordonnées + « Retour à l'accueil » |
| Données | Figées dans le build | Fichier `data/experience-references.json` + administration |

### 2.3 Boutiques

| Élément | Site en ligne | Dépôt |
|---|---|---|
| Produits textile | 18 dont **16 Getzner** à 10 000 FCFA, Drews 11 000 FCFA | 18 dont 16 Getzner, Drews 11 000 FCFA ✅ identique |
| Produits électronique | iPhone 16 Pro Max 630 000, S24 Ultra 400 000, etc. | ✅ identique |
| Marques | Drews, Gagny Lah, Getzner | ✅ identique |
| Numéro WhatsApp | +227 96 22 23 10 | ✅ identique |
| Localisation Textile | — | Lien Google Maps ajouté (côté dépôt) |

Le catalogue commercial est donc **aligné** : le déploiement ne fait pas perdre de produits.

---

## 3. Conséquences d'un déploiement du dépôt sur LWS

### Ce qui s'améliore
- Textes de la rubrique conformes au cahier des charges (sigles développés, catégories renommées).
- Fiches détaillées, encart transparence, bouton de retour à l'accueil.
- Lien Google Maps de la boutique Textile opérationnel (au lieu de « bientôt disponible »).
- Correctif d'affichage hors serveur : la rubrique s'affiche même sans API.
- Base de code maintenue et versionnée.

### Ce qui change visuellement (à valider)
- Les **3 illustrations SVG** de la rubrique ne sont pas dans le dépôt : les cartes utilisent des icônes Lucide sobres. Aucune image inventée n'est introduite.
- Libellé du bouton d'accueil : « Expérience entrepreneuriale » (plus long que « Expériences professionnelles »).

### Limite structurante
Sur LWS (hébergement statique), **l'administration ne peut pas fonctionner** : elle repose sur les routes `/api/*` servies par `server.ts`, absentes d'un hébergement de fichiers.
Conséquence : le site est en **lecture seule** (catalogue, rubrique, contacts). Toute modification de contenu se fait par déploiement.

Pour une administration en ligne, il faut héberger le serveur Node (VPS, Render, Railway, LWS Node…) ou ajouter des fonctions serverless.

---

## 4. Ce qui n'a pas pu être vérifié

- Le contenu interne du bundle en ligne (code minifié) : seule la surface publique a été analysée.
- L'existence et le fonctionnement de l'espace administrateur sur le site en ligne.
- Le contenu exact de `data/database.json` actuellement servi en ligne.
- Les en-têtes HTTP, la configuration `.htaccess` réellement active et le certificat SSL.

---

## 5. Recommandation

1. **Adopter le dépôt comme référence unique** de développement.
2. Mettre en place le déploiement FTP automatique (`.github/workflows/deploy-lws.yml`) pour supprimer les téléversements manuels.
3. Décider du sort des illustrations SVG (les recréer ou conserver les icônes actuelles).
4. Si l'administration en ligne est nécessaire, prévoir un hébergement Node pour `server.ts`.
