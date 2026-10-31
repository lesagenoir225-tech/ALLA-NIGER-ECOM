=================================================================================
                 GUIDE OFFICIEL DE DÉPLOIEMENT SUR LWS
                       ALFFA NIGER (E-COMMERCE)
=================================================================================

Ce pack de production contient tous les fichiers pré-compilés et optimisés
pour un hébergement mutualisé ou cPanel chez LWS (LWS.fr / LWS Panel / cPanel).

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
- Base de données & Supabase :
  L'application fonctionne immédiatement avec toutes les données intégrées.
  Si vous souhaitez synchroniser avec Supabase, votre projet distant est déjà
  pré-configuré et s'active en 1 clic dans l'espace admin.

---------------------------------------------------------------------------------
En cas de question, vérifiez que le fichier .htaccess est bien actif sur LWS
pour assurer le bon fonctionnement de la navigation (React SPA).
=================================================================================
