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
| `admin-rpc.sql` | Administration **sans serveur Node** : fonctions `admin_*` en `SECURITY DEFINER`, utilisables depuis un site statique. |
| `admin-mdp-synchronise.sql` | Mot de passe : une seule vérité entre `admin_credentials` et `admin_accounts` (corrige « parfois le mot de passe ne passe pas »). |
| `admin-login-jamais-bloque.sql` | Anti-force brute : le mot de passe est vérifié **avant** le compteur ; un bon mot de passe n'est jamais refusé. |
| `metier-e-sauvegardes.sql` | Sauvegarde automatique quotidienne (`admin_backups`, `pg_cron`, rétention 90 jours). |
| `functions/upload/index.ts` | Fonction Edge (Deno) d'envoi de fichiers vers Storage. |

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

## Administration sur hébergement statique

Le site est aussi déployé en statique (LWS). Il n'y a alors aucun processus Node,
donc `/api/admin/login` renvoyait la page HTML — d'où l'erreur
« Unexpected token '<' … is not valid JSON ».

L'adaptateur `src/services/backend.ts` détecte l'absence de serveur et bascule
sur les fonctions PostgreSQL de `admin-rpc.sql` :

```
Navigateur ──clé publishable──> rpc('admin_login',      { password })  ──> jeton
           ──clé publishable──> rpc('admin_save_product',{ token, p })  ──> écriture
```

- Le mot de passe est vérifié en base (bcrypt via `pgcrypto`), jamais dans la page.
- Les jetons sont stockés dans `admin_sessions` (12 h, prolongés à chaque usage),
  révocables. Les tentatives échouées sont comptées **par appareil** (en-tête
  `x-forwarded-for`), 10 par quart d'heure ; le mot de passe est vérifié avant
  le compteur, donc un bon mot de passe n'est jamais bloqué.
- Les tables `admin_credentials`, `admin_sessions` et `admin_login_attempts`
  n'ont **aucune politique RLS** : elles sont inaccessibles avec la clé publique.
- Toute écriture exige un jeton valide, sinon la fonction lève une exception.

Si un serveur Node est présent, l'adaptateur l'utilise en priorité : le
comportement de Vercel est inchangé.

### Réorganisation des produits (disponible partout)

L'ordre d'affichage est stocké en base dans `products.display_order`, **propre à
chaque boutique** (1 = premier article). Il est donc conservé quel que soit
l'hébergement, et la fonction `admin_reorder_products(token, shop, ids)` écrit
les positions depuis l'administration, y compris sur un site 100 % statique.

- Nouvel article ajouté sans position : un déclencheur le place en fin de liste
  de sa boutique.
- Modification d'une fiche existante : la position est préservée
  (`COALESCE(EXCLUDED.display_order, products.display_order)`).
- `seed.sql` renseigne les positions initiales mais ne les écrase jamais lors
  d'une régénération (`ON CONFLICT` sans `display_order`).

### Non disponible sans serveur Node

| Fonction | Raison |
|---|---|
| Section BTP | non modélisée en base |

## Stockage des fichiers (open source)

Le téléversement fonctionne sur hébergement statique grâce à **Supabase Storage**
(licence Apache 2.0, auto-hébergeable) et une **fonction Edge** (runtime Deno).

| Bucket | Visibilité | Contenu |
|---|---|---|
| `public-images` | public en lecture | photos produits |
| `private-documents` | privé | justificatifs (PDF, images) |

Déroulé d'un envoi :

```
Navigateur ──x-admin-token──> functions/v1/upload
                               ├─ vérifie admin_sessions (jeton valide ?)
                               ├─ contrôle le type MIME et la taille (8 Mo)
                               ├─ écrit dans le bucket (clé service_role)
                               └─ renvoie l'URL publique
```

- Sans jeton valide : **401**, rien n'est écrit.
- Les justificatifs privés ne sont jamais exposés : l'URL stockée pointe vers
  la fonction, qui revérifie le jeton et délivre une **URL signée de 60 s**.
- L'interface sait reconnaître un fichier stocké en privé (`isPrivatelyStoredUrl`,
  serveur Node **ou** fonction Edge) : elle refuse de le republier sans réimport,
  et signale qu'un fichier du bucket public reste joignable à son ancienne
  adresse même si sa visibilité est repassée à « Privé ».
- La clé `service_role` reste dans Supabase ; elle n'est jamais transmise au navigateur.

Déploiement de la fonction :

```bash
supabase functions deploy upload --no-verify-jwt --project-ref blcrwjsrxcumtapymofn
```

Le drapeau `--no-verify-jwt` est volontaire : le jeton administrateur n'est pas
un JWT Supabase, il est vérifié par la fonction elle-même dans `admin_sessions`.

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

**Deux emplacements, selon le mode** — savoir lequel est utilisé évite la
plaisanterie « ça marche ici, pas là » :

| Mode | Où le mot de passe est vérifié | Fonction |
|---|---|---|
| Site **statique** (LWS, Vercel) | table `admin_accounts` (bcrypt), avec repli sur `admin_credentials` pour les bases héritées | `admin_login_v3` → `admin_login_v2` → `admin_login` |
| Serveur **Node** (local, Vercel complet) | `site_settings.admin_password_hash` (SHA-256), sinon variable `ADMIN_PASSWORD` | route `/api/admin/login` |

Conséquence : un mot de passe modifié sur une prévisualisation **Node** n'est pas
connu du site statique, et inversement. En production LWS, c'est **toujours**
`admin_accounts` qui fait foi.

Depuis la correction `admin-mdp-synchronise.sql`, « Changer le mot de passe »
écrit la même empreinte dans `admin_accounts` et `admin_credentials`, et une base
désynchronisée se répare au premier login réussi.

### Ancien mécanisme (mode Node uniquement)

Le mot de passe y est stocké dans `site_settings.admin_password_hash`, sous forme
d'empreinte SHA-256, et il est prioritaire sur la variable `ADMIN_PASSWORD`.

| Situation | Mot de passe accepté |
|---|---|
| Empreinte présente en base | celui correspondant à l'empreinte |
| Aucune empreinte, `ADMIN_PASSWORD` défini | valeur de la variable |
| Aucune empreinte, aucune variable | mot de passe aléatoire généré au démarrage (affiché une fois dans la console) |

Aucun mot de passe par défaut n'est écrit dans le code : un mot de passe livré
avec l'application devient immédiatement un mot de passe public.

Changer le mot de passe depuis l'écran d'administration met à jour l'empreinte
en base : le changement survit donc aux redéploiements.

Pour réinitialiser l'empreinte **du mode Node** directement en SQL :

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
