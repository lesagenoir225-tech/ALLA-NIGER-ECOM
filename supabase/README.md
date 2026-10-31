# Base de données Supabase — ALFFA NIGER

Le site lit désormais son catalogue et ses références dans **PostgreSQL (Supabase)**.
Les fichiers JSON locaux ne servent plus que de secours hors-ligne.

| Élément | Valeur |
|---|---|
| Projet | `ALFFA NIGER` |
| Référence | `blcrwjsrxcumtapymofn` |
| Région | `eu-west-1` |
| URL | `https://blcrwjsrxcumtapymofn.supabase.co` |
| Tableau de bord | https://supabase.com/dashboard/project/blcrwjsrxcumtapymofn |

## Fichiers de ce dossier

| Fichier | Rôle |
|---|---|
| `schema.sql` | Structure des tables, index, RLS et droits. **Idempotent** : rejouable sans perte. |
| `seed.sql` | Contenu initial (29 produits, 3 marques, 12 sélections, 1 fiche paramètres, 14 références). Généré, idempotent. |
| `store.ts` | Couche de persistance côté serveur (clé `service_role`, jamais exposée au navigateur). |

Le fichier historique `../supabase-schema.sql` est **obsolète** : il contenait des
politiques d'écriture liées à un UUID factice (`REMPLACER_PAR_UUID_ADMIN`), ce qui
bloquait toute écriture. Il est conservé uniquement pour mémoire.

## Modèle de sécurité

```
Navigateur ──(clé publishable)──> PostgREST ──> LECTURE seule
Serveur    ──(clé service_role)─> PostgREST ──> ÉCRITURE (contourne RLS)
```

- **Lecture publique** : `products`, `brands`, `featured`, `site_settings`.
- **Expérience entrepreneuriale** : seules les lignes `published = true` sont
  lisibles par le public. Un brouillon n'est jamais exposé, même si quelqu'un
  interroge l'API REST directement.
- **Écriture** : aucune pour `anon` ni `authenticated` (droits révoqués, en plus
  de l'absence de politique). Seul le serveur écrit, avec la clé `service_role`.
- **Double contrôle métier** : la contrainte `experience_published_requires_validation`
  empêche en base une publication sans validation, même en cas de bug applicatif.

Vérification effectuée sur la base réelle :

| Contrôle | Résultat |
|---|---|
| `anon` peut lire `products` | ✅ oui |
| `anon` peut insérer / modifier `products` | ✅ refusé |
| `authenticated` peut insérer `products` | ✅ refusé |
| RLS activée sur `experience_references` | ✅ oui |
| Politique publique sur les références | ✅ `(published = true)` |

## Variables d'environnement

À définir **sur Vercel** (Settings → Environment Variables), et en local dans `.env` :

| Variable | Portée | Rôle |
|---|---|---|
| `SUPABASE_URL` | serveur | URL du projet |
| `SUPABASE_SERVICE_ROLE_KEY` | serveur | **Secret.** Écritures. Ne jamais exposer côté navigateur. |
| `SUPABASE_ANON_KEY` | serveur | Repli de lecture si la clé service est absente |
| `VITE_SUPABASE_URL` | navigateur | Même URL (publique) |
| `VITE_SUPABASE_ANON_KEY` | navigateur | Clé publishable (publique, lecture seule) |
| `ADMIN_PASSWORD` | serveur | Mot de passe de secours de `/#/admin`, utilisé seulement si aucun mot de passe n'est défini en base |

> ⚠️ Toute variable préfixée `VITE_` est intégrée au JavaScript envoyé aux
> visiteurs. N'y mettez jamais la clé `service_role`.

## Mot de passe de l'administration

Le mot de passe n'est **pas** écrit dans le code : le dépôt est public.

Il est stocké dans `site_settings.admin_password_hash`, sous forme d'empreinte
SHA-256, et il est prioritaire sur la variable `ADMIN_PASSWORD`.

| Situation | Mot de passe accepté |
|---|---|
| Empreinte présente en base | celui correspondant à l'empreinte |
| Aucune empreinte, `ADMIN_PASSWORD` défini | valeur de la variable |
| Aucune empreinte, aucune variable | `alffa2025` (défaut historique) |

Changer le mot de passe depuis l'écran d'administration met à jour l'empreinte
en base : le changement survit donc aux redéploiements.

Pour réinitialiser l'empreinte directement en SQL :

```sql
update public.site_settings
set admin_password_hash = encode(digest('VOTRE_MOT_DE_PASSE', 'sha256'), 'hex')
where id = 1;
-- nécessite l'extension pgcrypto ; sinon calculez l'empreinte en local :
--   python3 -c "import hashlib;print(hashlib.sha256('VOTRE_MOT_DE_PASSE'.encode()).hexdigest())"
```

## Régénérer le contenu initial

```bash
python3 scripts/generate-seed-sql.py        # réécrit supabase/seed.sql
```

Puis coller `supabase/seed.sql` dans le **SQL Editor** du tableau de bord.

## Amorçage automatique

Si la base est vide au premier démarrage, le serveur y pousse automatiquement
le contenu des fichiers JSON locaux. Aucune manipulation manuelle n'est requise
après un déploiement sur une base neuve.

## Comportement en cas de panne

| Situation | Conséquence |
|---|---|
| Variables absentes | Le serveur bascule sur `data/*.json` : le site reste consultable. |
| Supabase injoignable | Idem, avec un avertissement dans les journaux. |
| Base vide | Amorçage automatique depuis les fichiers locaux. |

Le site ne tombe donc jamais en panne à cause de la base — il bascule en mode
dégradé, en lecture seule.

## Limite connue de l'environnement de développement

Le bac à sable utilisé pour le développement a un accès réseau restreint : il ne
peut pas joindre `*.supabase.co`. Les tests locaux de cette session se sont donc
appuyés sur le repli JSON, tandis que le contenu de la base a été vérifié
directement via l'API d'administration Supabase (29 produits, 14 références,
droits RLS contrôlés). Sur Vercel, l'accès réseau est complet.
