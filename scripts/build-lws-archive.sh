#!/usr/bin/env bash
# Fabrique l'archive de déploiement LWS à partir du build courant.
#
# Usage :  bash scripts/build-lws-archive.sh
# Résultat : release/alffa-niger-lws.zip
#
# L'archive contient le site compilé (SPA statique) + .htaccess + le guide.
# Elle ne contient JAMAIS : le code source, les secrets (.env), ni l'archive
# elle-même (piège : public/ était recopié dans dist/, créant une récursion).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

echo "→ Build de production…"
rm -rf dist
npm run build >/dev/null

# Filet de sécurité : aucun mot de passe ne doit se retrouver dans le paquet
# livré. L'ancien mot de passe par défaut est reconstitué ici par morceaux pour
# ne pas l'écrire en clair dans ce dépôt public.
MOT_DE_PASSE_INTERDIT="$(printf 'alf%s20%s' 'fa' '25')"
if grep -rIl -i -- "$MOT_DE_PASSE_INTERDIT" dist public/.htaccess public/README_DEPLOIEMENT_LWS.txt data/database.json 2>/dev/null | grep -q .; then
  echo "✗ ERREUR : un mot de passe par défaut figure dans les fichiers livrés :" >&2
  grep -rIl -i -- "$MOT_DE_PASSE_INTERDIT" dist public data 2>/dev/null >&2
  exit 1
fi

echo "→ Préparation du dossier de déploiement…"
cp -r dist/. "$STAGE/"
cp public/.htaccess "$STAGE/.htaccess"
cp public/README_DEPLOIEMENT_LWS.txt "$STAGE/"
mkdir -p "$STAGE/data"
# Catalogue de secours pour le premier chargement hors-ligne.
cp data/database.json "$STAGE/data/database.json"

# Sécurité : ne jamais embarquer une archive dans l'archive.
rm -f "$STAGE"/*.zip "$STAGE"/alffa-niger-lws.zip

echo "→ Compression…"
mkdir -p release
rm -f release/alffa-niger-lws.zip
(cd "$STAGE" && zip -r -q "$ROOT/release/alffa-niger-lws.zip" . -x "*.DS_Store" "*alffa-niger-lws.zip")

NB_FILES=$(unzip -l release/alffa-niger-lws.zip | tail -1 | awk '{print $2}')
TAILLE=$(du -h release/alffa-niger-lws.zip | cut -f1)

# Attention : « unzip -l » affiche le nom de l'archive dans son en-tête,
# d'où le filtrage de la ligne « Archive: ». On ne cherche que des entrées.
if unzip -l release/alffa-niger-lws.zip | grep -v '^Archive:' | grep -qiE '\.zip$'; then
  echo "✗ ERREUR : l'archive contient une copie d'elle-même." >&2
  exit 1
fi

echo "✔ release/alffa-niger-lws.zip — $NB_FILES fichiers, $TAILLE"
