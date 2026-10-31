=================================================================================
                 GUIDE OFFICIEL DE DÉPLOIEMENT SUR LWS
                       ALFFA NIGER (E-COMMERCE)
=================================================================================

Ce pack de production contient tous les fichiers pré-compilés et optimisés
pour un hébergement mutualisé ou cPanel chez LWS (LWS.fr / LWS Panel / cPanel).

---------------------------------------------------------------------------------
0. METTRE À JOUR UN SITE DÉJÀ EN LIGNE (procédure recommandée)
---------------------------------------------------------------------------------
Vous avez déjà une version du site sur LWS et vous voulez la remplacer par
celle-ci. La procédure est la même que pour une première installation, avec
UNE PRÉCAUTION : ne supprimez pas le dossier des photos téléversées.

Étape 1 : Connectez-vous à votre espace client LWS > Gérer > cPanel.
Étape 2 : Ouvrez le "Gestionnaire de fichiers", puis le dossier public_html.
Étape 3 : AVANT TOUT, faites une sauvegarde : sélectionnez tout, puis
          "Compresser" et téléchargez le fichier .zip obtenu. En cas de
          problème, vous pourrez revenir en arrière.
Étape 4 : Supprimez les anciens fichiers du site : index.html, le dossier
          assets/ et le dossier images/.
          ⚠️ CONSERVEZ le dossier images/uploads/ s'il existe : il contient
             les photos que vous avez vous-même ajoutées depuis l'admin.
Étape 5 : Chargez la nouvelle archive alffa-niger-lws.zip dans public_html.
Étape 6 : Clic droit sur l'archive > "Extraire" (Extract).
Étape 7 : Vérifiez que index.html, .htaccess, assets/ et images/ sont bien à
          la racine de public_html (et non dans un sous-dossier).
Étape 8 : Supprimez l'archive .zip pour libérer de l'espace.
Étape 9 : Ouvrez le site, puis videz le cache du navigateur
          (Ctrl+Maj+R, ou Cmd+Maj+R sur Mac) pour voir la nouvelle version.

Remarque : les versions étant identifiées par un nom de fichier unique dans
assets/, il n'y a pas de risque de mélange entre l'ancienne et la nouvelle
version après un rechargement forcé.

---------------------------------------------------------------------------------
1. DANS QUEL DOSSIER METTRE LES FICHIERS SUR LWS ?
---------------------------------------------------------------------------------
- Si ALFFA NIGER est votre site principal :
  Déposez les fichiers dans le dossier :
  -> public_html/ (ou www/ ou htdocs/ selon votre formule LWS)

- Si ALFFA NIGER est un sous-domaine ou un domaine supplémentaire :
  Déposez les fichiers dans la racine du dossier assigné à ce domaine dans cPanel.

---------------------------------------------------------------------------------
2. MÉTHODE RAPIDE : DÉPLOIEMENT VIA LE GESTIONNAIRE DE FICHIERS LWS (cPanel)
---------------------------------------------------------------------------------
Étape 1 : Connectez-vous à votre espace client LWS (espace client LWS > Gérer > cPanel).
Étape 2 : Cliquez sur "Gestionnaire de fichiers" (File Manager).
Étape 3 : Rendez-vous dans le dossier "public_html".
Étape 4 : Cliquez sur le bouton "Charger" (Upload) en haut.
Étape 5 : Sélectionnez le fichier d'archive "alffa-niger-lws.zip".
Étape 6 : Une fois le chargement terminé à 100%, revenez au gestionnaire de fichiers.
Étape 7 : Faites un clic droit sur "alffa-niger-lws.zip" puis choisissez "Extraire" (Extract).
Étape 8 : Vérifiez que les fichiers (index.html, .htaccess, robots.txt, dossier assets/, dossier images/)
          sont bien présents directement à la racine de public_html.
Étape 9 : Vous pouvez ensuite supprimer le fichier .zip pour libérer de l'espace.

---------------------------------------------------------------------------------
3. MÉTHODE ALTERNATIVE : PAR FTP (FileZilla / WinSCP)
---------------------------------------------------------------------------------
Étape 1 : Décompressez l'archive "alffa-niger-lws.zip" sur votre ordinateur.
Étape 2 : Ouvrez votre client FTP (ex: FileZilla) avec vos identifiants FTP LWS.
Étape 3 : Ouvrez le dossier distant "public_html/".
Étape 4 : Glissez-déposez TOUS les fichiers et dossiers décompressés :
          - .htaccess (IMPORTANT : assurez-vous d'afficher les fichiers cachés dans FileZilla)
          - index.html
          - robots.txt
          - sitemap.xml
          - dossier assets/
          - dossier images/

---------------------------------------------------------------------------------
4. ACTIVER LE CERTIFICAT SSL GRATUIT (HTTPS) SUR LWS
---------------------------------------------------------------------------------
Étape 1 : Dans votre cPanel LWS, cherchez la rubrique "Sécurité" puis "SSL/TLS Status"
          ou "Let's Encrypt SSL".
Étape 2 : Cliquez sur "Exécuter AutoSSL" ou installez le certificat gratuit Let's Encrypt
          pour votre nom de domaine (ex: alffaniger.com et www.alffaniger.com).
Étape 3 : Dans cPanel > "Domaines", activez l'option "Forcer la redirection HTTPS".
          (Ou décommentez la règle HTTPS dans le fichier .htaccess fourni).

---------------------------------------------------------------------------------
5. POINTS CLÉS ET FONCTIONNALITÉS INTÉGRÉES
---------------------------------------------------------------------------------
- Boutique Électronique : iPhones et smartphones Samsung avec prix FCFA.
- Boutique Textile : Bazins Drews, Gagny Lah et les 15 nouveaux modèles Bazin Getzner
  damassés à 10 000 FCFA avec photos haute définition.
- Commandes WhatsApp : Boutons de commande directe configurés vers le numéro officiel
  (+227 96 22 23 10).
- Accès Espace Admin discret :
  Faites un DOUBLE-CLIC (ou double-tap mobile) sur la date "2018" dans la signature
  au bas de n'importe quelle page pour accéder à l'espace d'administration.
- Base de données Supabase :
  Le catalogue et les références sont stockés dans PostgreSQL (projet
  « ALFFA NIGER », référence blcrwjsrxcumtapymofn). Le site en ligne lit ces
  données en direct.
- Administration en hébergement mutualisé (fonctionne désormais) :
  Cette archive est un site STATIQUE, sans serveur Node. L'administration passe
  donc directement par la base PostgreSQL, via des fonctions sécurisées.
  Le mot de passe est vérifié EN BASE (jamais dans la page), et le navigateur
  ne dispose que de la clé publique, qui ne permet aucune écriture directe.
  Vous pouvez donc gérer le catalogue, les paramètres, les références
  entrepreneuriales, LE STOCK, LES REÇUS, LES DÉPENSES, LES STATISTIQUES,
  L'ÉQUIPE et les SAUVEGARDES directement depuis /#/admin sur LWS
  (12 onglets au total ; moins pour un compte vendeur).
  AUCUN mot de passe n'est écrit dans ce dossier : ni dans le code, ni dans
  data/database.json, ni à l'écran. Il est vérifié en base, sous forme
  d'empreinte que personne ne peut relire.
- Téléversement des photos (fonctionne sur LWS) :
  Les images sont envoyées dans Supabase Storage (bucket public-images), via
  une fonction Edge qui contrôle le droit d'écrire avant d'enregistrer.
  Formats acceptés : JPG, PNG, WebP, GIF, SVG — 8 Mo maximum.
  Les justificatifs marqués « privé » vont dans un espace non public et ne
  sont délivrés que par une URL signée de 60 secondes.
  La réorganisation des produits (flèches ↑ ↓) est enregistrée en base et
  conservée après rechargement. Seule la section BTP reste réservée à
  l'hébergement avec serveur Node.

---------------------------------------------------------------------------------
6. GESTION DE STOCK ET REÇUS (nouveaux onglets de l'administration)
---------------------------------------------------------------------------------
- Onglet « Stock » : quantité, prix d'achat, prix de vente et seuil d'alerte
  pour chaque article des deux boutiques. Quatre indicateurs, dont la VALEUR
  TOTALE DE LA MARCHANDISE (valeur d'achat, valeur de revente et marge).
  Mouvements : entrée, sortie, vente, retour, inventaire, ajustement.
  Un journal conserve les mouvements, et un export CSV donne l'inventaire.
- Onglet « Reçus » : choix des articles, remise, mode de paiement, montant
  versé. Le reçu s'imprime (format A5) avec le logo, le NIF, le RCCM, la date
  ET l'heure, le total en lettres et le cachet du gérant. Il peut aussi être
  partagé (WhatsApp) ou copié en texte.
  Un reçu enregistré ne se modifie pas : pour corriger, utilisez « Annuler »
  (la marchandise repart automatiquement en stock).

---------------------------------------------------------------------------------
7. STATISTIQUES, DÉPENSES, ÉQUIPE, SAUVEGARDE
---------------------------------------------------------------------------------
- Onglet « Statistiques » : chiffre d'affaires du jour / 7 jours / 30 jours /
  année, panier moyen, ventes par jour, meilleures ventes, moyens de paiement,
  meilleurs clients, et BÉNÉFICE RÉEL (chiffre d'affaires moins le coût des
  marchandises vendues, moins les dépenses).
  Les chiffres viennent des reçus : annuler un reçu le retire des totaux.
- Onglet « Dépenses » : achats, transport, loyer, salaires, communication,
  taxes, emballage, autre. Chaque dépense est déduite automatiquement.
- Onglet « Équipe » : créez un compte VENDEUR (reçus, ventes, stock en
  consultation) en plus du compte GÉRANT. Un vendeur ne voit ni les finances,
  ni les dépenses, ni les autres comptes — et la base refuse ces actions même
  si l'on force l'adresse de la page.
- Onglet « Reçus » + page publique /#/verifier/CODE : chaque reçu porte un code
  à 8 caractères et un QR code. Le client scanne, la page confirme que le
  document est authentique (numéro, date, montant, statut, lignes) sans jamais
  afficher son nom complet ni son téléphone.
- Onglet « Stock » : bouton « Alerter sur WhatsApp » qui prépare la liste des
  articles sous leur seuil d'alerte.
- Tableau de bord : sauvegarde automatique quotidienne (conservée 90 jours),
  téléchargeable en un fichier JSON à garder hors du téléphone.

---------------------------------------------------------------------------------
8. « LE MOT DE PASSE NE PASSE PAS » : QUE FAIRE ?
---------------------------------------------------------------------------------
1) Appuyez sur l'œil dans le champ du mot de passe : votre téléphone a
   peut-être rempli automatiquement un ANCIEN mot de passe enregistré.
2) Saisissez-le à la main. Les espaces avant et après sont ignorés
   automatiquement (utile avec les claviers de téléphone).
3) Le mot de passe distingue majuscules et minuscules.
4) Le message affiché distingue désormais trois cas :
   - « Mot de passe incorrect » : la saisie est refusée par la base ;
   - « Trop de tentatives échouées depuis cet appareil » : attendez quelques
     minutes, le blocage se lève seul ; un autre appareil peut se connecter ;
   - « Base de données injoignable » : c'est le réseau, PAS le mot de passe.
   Depuis la dernière version, le mot de passe est vérifié AVANT le compteur
   de tentatives : un mot de passe correct n'est donc jamais refusé, même
   après plusieurs erreurs.
5) Après un déploiement, faites Ctrl+Maj+R (ou Cmd+Maj+R sur Mac) : le
   fichier index.html n'est plus mis en cache, mais un ancien onglet peut
   encore exécuter la version précédente.

---------------------------------------------------------------------------------
En cas de question, vérifiez que le fichier .htaccess est bien actif sur LWS
pour assurer le bon fonctionnement de la navigation (React SPA).
=================================================================================
