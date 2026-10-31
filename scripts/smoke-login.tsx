/**
 * Test de fumée (jsdom) — CONNEXION À L'ADMINISTRATION
 *
 * Reproduit les conditions réelles du site LWS (hébergement statique) et
 * vérifie les corrections apportées au « parfois le mot de passe ne passe
 * pas » :
 *
 *   1. espaces et caractères invisibles ajoutés par le clavier du téléphone
 *      ignorés avant l'envoi ;
 *   2. message réel du serveur affiché — mot de passe erroné, blocage
 *      temporaire et panne réseau ne sont plus confondus ;
 *   3. nouvel essai automatique en cas de coupure passagère ;
 *   4. bouton « œil » pour voir ce qui est réellement saisi ;
 *   5. le champ est vidé après un refus (mot de passe pré-rempli par le
 *      téléphone) ;
 *   6. une panne réseau lors du contrôle de session ne déconnecte plus ;
 *   7. la réponse JSON de la nouvelle fonction admin_login est comprise.
 *
 * Exécution :
 *   npx esbuild scripts/smoke-login.tsx --bundle --platform=node \
 *     --format=esm --target=node20 --external:jsdom \
 *     --outfile=scripts/.smoke-login.mjs \
 *     --define:import.meta.env='{"MODE":"test"}'
 *   node scripts/.smoke-login.mjs
 */
import { JSDOM } from 'jsdom';
import { act } from 'react';

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost:3000/#/admin',
  pretendToBeVisual: true,
});
const g = globalThis as any;
g.window = dom.window;
g.document = dom.window.document;
try {
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
} catch {}
g.HTMLElement = dom.window.HTMLElement;
g.Element = dom.window.Element;
g.Node = dom.window.Node;
g.localStorage = dom.window.localStorage;
g.requestAnimationFrame = (cb: any) => setTimeout(cb, 0);
g.cancelAnimationFrame = (id: any) => clearTimeout(id);
g.IS_REACT_ACT_ENVIRONMENT = true;

const STORAGE_KEY = 'alffa_niger_admin_token';

// --- Simulation réseau ------------------------------------------------------
const rpcCalls: { fn: string; body: any }[] = [];
/** Réponse simulée de admin_login : jeton, erreur métier ou panne réseau. */
type LoginMode =
  | { kind: 'ok' }
  | { kind: 'password'; message: string }
  | { kind: 'locked'; message: string }
  | { kind: 'offline' };
let loginMode: LoginMode = { kind: 'ok' };
/** Simule une base qui n'a pas encore la fonction admin_login_v2. */
let legacyOnly = false;
let offlineOnce = false;
/** Réponse simulée de admin_check. */
let checkMode: 'valid' | 'invalid' | 'offline' = 'valid';

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
/** Hébergement statique : toute route /api renvoie la page HTML du site. */
const html = () =>
  new Response('<!doctype html><html><body>ALFFA NIGER</body></html>', {
    status: 200,
    headers: { 'content-type': 'text/html' },
  });

g.fetch = async (input: any, init?: any) => {
  const url = typeof input === 'string' ? input : input.url;
  const body = init?.body ? JSON.parse(String(init.body)) : null;

  if (url.startsWith('/api')) return html(); // site statique : pas d'API Node

  if (url.includes('/rest/v1/rpc/')) {
    const fn = url.split('/rest/v1/rpc/')[1];
    rpcCalls.push({ fn, body });

    if (fn === 'admin_login_v3' || fn === 'admin_login_v2') {
      if (legacyOnly) {
        // Base pas encore mise à jour : la fonction n'existe pas.
        return json({ code: 'PGRST202', message: `Could not find the function public.${fn} in the schema cache` }, 404);
      }
      if (loginMode.kind === 'offline' && !offlineOnce) {
        offlineOnce = true;
        throw new TypeError('Failed to fetch');
      }
      if (loginMode.kind === 'offline') throw new TypeError('Failed to fetch');
      if (loginMode.kind === 'locked') return json({ ok: false, reason: 'locked', message: loginMode.message });
      if (loginMode.kind === 'password') {
        return json({ ok: false, reason: 'password', message: loginMode.message, remaining: 9 });
      }
      return json({
        ok: true,
        token: 'jeton-connexion-0123456789abcdef',
        role: 'gerant',
        username: 'gerant',
        displayName: 'Le Gérant',
      });
    }

    if (fn === 'admin_login') {
      // Contrat historique : texte (jeton) ou erreur.
      if (loginMode.kind === 'offline') throw new TypeError('Failed to fetch');
      if (loginMode.kind === 'password') {
        return json({ code: '28P01', message: loginMode.message }, 400);
      }
      return json('jeton-heritage-0123456789abcdef');
    }

    if (fn === 'admin_check') {
      if (checkMode === 'offline') throw new TypeError('Failed to fetch');
      return json(checkMode === 'valid');
    }
    return json(null);
  }
  if (url.includes('/rest/v1/')) return json([]);
  return html();
};

const { StoreProvider } = await import('../src/context/StoreContext');
const { normalizePassword } = await import('../src/context/StoreContext');
const { Admin } = await import('../src/pages/Admin');
const { createRoot } = await import('react-dom/client');

const results: { name: string; ok: boolean; detail?: string }[] = [];
const check = (name: string, ok: boolean, detail = '') => results.push({ name, ok, detail });
// La connexion interroge d'abord admin_login_v3 (identifiant + rôle), puis
// admin_login_v2 sur une base plus ancienne : les deux comptent comme « un appel ».
const loginCalls = () =>
  rpcCalls.filter((c) => c.fn === 'admin_login_v3' || c.fn === 'admin_login_v2');
const legacyCalls = () => rpcCalls.filter((c) => c.fn === 'admin_login');

// --- 1. Normalisation du mot de passe ---------------------------------------
check('Nettoyage : espaces autour ignorés', normalizePassword('  secret2026  ') === 'secret2026', normalizePassword('  secret2026  '));
check('Nettoyage : espace insécable convertie', normalizePassword('secret\u00a02026 ').trim() === 'secret 2026');
check(
  'Nettoyage : caractère invisible supprimé',
  normalizePassword('secret\u200b2026') === 'secret2026',
  normalizePassword('secret\u200b2026')
);
check('Nettoyage : mot de passe vide', normalizePassword('   \u00a0 ') === '');

// --- Utilitaires d'interface ------------------------------------------------
const typePassword = (value: string) => {
  const input = document.querySelector('input[placeholder="Entrez le mot de passe..."]') as HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value')!.set!;
  setter.call(input, value);
  input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  return input;
};
const submitLogin = async () => {
  const form = document.querySelector('form')!;
  await act(async () => {
    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 60));
  });
};

// --- 2. Écran de connexion --------------------------------------------------
const root = createRoot(document.getElementById('root')!);
await act(async () => {
  root.render(
    <StoreProvider>
      <Admin />
    </StoreProvider>
  );
});
await act(async () => {
  await new Promise((resolve) => setTimeout(resolve, 80));
});

const initialText = document.body.textContent || '';
check('Connexion : écran d’accès affiché', /Accès Administration/i.test(initialText));
check('Connexion : bouton « voir le mot de passe »', Boolean(document.querySelector('button[title="Afficher le mot de passe"]')));

// Le mot de passe doit être masqué par défaut, et aucun indice ne doit
// apparaître à l'écran (ni mot de passe par défaut, ni « mot d'initialisation »).
const champ = document.querySelector('input[placeholder="Entrez le mot de passe..."]') as HTMLInputElement;
check('Masquage : champ en type « password » à l’arrivée', champ?.type === 'password', champ?.type);
check(
  'Masquage : aucun indice de mot de passe à l’écran',
  !/(mot de passe\s+(par défaut|d[’']initialisation)|initialisation\s*:)/i.test(initialText),
  initialText.slice(0, 200),
);
// Le champ identifiant peut être pré-rempli (« gerant »), jamais le mot de passe :
// on ne contrôle donc que les champs de type « password ».
const passwordInputs = Array.from(
  document.querySelectorAll('input[type="password"]'),
) as HTMLInputElement[];
check(
  'Masquage : aucun mot de passe en clair dans le HTML',
  passwordInputs.length > 0 &&
    passwordInputs.every((input) => input.value.length === 0) &&
    !/type="password"[^>]*value="[^"]{4,}"/.test(document.querySelector('form')?.innerHTML || ''),
);
check('Clavier : pas de majuscule automatique', typePassword('').getAttribute('autocapitalize') === 'none');
check('Clavier : correction automatique désactivée', typePassword('').getAttribute('autocorrect') === 'off');

// Bascule œil
const eye = document.querySelector('button[title="Afficher le mot de passe"]')!;
await act(async () => {
  eye.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
});
check(
  'Connexion : l’œil affiche le mot de passe en clair',
  (document.querySelector('input[placeholder="Entrez le mot de passe..."]') as HTMLInputElement).type === 'text'
);
await act(async () => {
  document
    .querySelector('button[title="Masquer le mot de passe"]')!
    .dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
});
check(
  'Connexion : l’œil remasque le mot de passe',
  (document.querySelector('input[placeholder="Entrez le mot de passe..."]') as HTMLInputElement).type === 'password'
);

// --- 3. Mot de passe correct entouré d'espaces ------------------------------
loginMode = { kind: 'ok' };
await act(async () => {
  typePassword('  secret2026  ');
});
await submitLogin();
check(
  'Connexion : espaces retirés avant l’envoi',
  loginCalls()[0]?.body?.p_password === 'secret2026',
  JSON.stringify(loginCalls()[0]?.body)
);
check(
  'Connexion : jeton enregistré',
  dom.window.localStorage.getItem(STORAGE_KEY) === 'jeton-connexion-0123456789abcdef'
);
check('Connexion : nouvel essai automatique non déclenché', loginCalls().length === 1, `${loginCalls().length} appel(s)`);

// --- 4. Retour à l'écran de connexion ---------------------------------------
const logoutButton = Array.from(document.querySelectorAll('button')).find((b) => /Déconnexion/i.test(b.textContent || ''));
if (logoutButton) {
  await act(async () => {
    logoutButton.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 60));
  });
}
dom.window.localStorage.removeItem(STORAGE_KEY);
rpcCalls.length = 0;

// --- 5. Mot de passe refusé par la base -------------------------------------
loginMode = { kind: 'password', message: 'Mot de passe incorrect.' };
await act(async () => {
  typePassword('mauvais');
});
await submitLogin();
const wrongText = document.body.textContent || '';
check('Refus : message du serveur affiché', /Mot de passe incorrect\./.test(wrongText));
check(
  'Refus : champ vidé pour la tentative suivante',
  (document.querySelector('input[placeholder="Entrez le mot de passe..."]') as HTMLInputElement).value === ''
);

// --- 6. Blocage temporaire --------------------------------------------------
rpcCalls.length = 0;
loginMode = {
  kind: 'locked',
  message: 'Trop de tentatives échouées depuis cet appareil. Patientez quelques minutes, ou connectez-vous depuis un autre appareil.',
};
await act(async () => {
  typePassword('secret2026');
});
await submitLogin();
const lockedText = document.body.textContent || '';
check('Blocage : message de blocage affiché', /Trop de tentatives échouées/i.test(lockedText));
check('Blocage : pas de nouvel essai inutile', loginCalls().length === 1, `${loginCalls().length} appel(s)`);

// --- 7. Coupure réseau puis retour -----------------------------------------
rpcCalls.length = 0;
offlineOnce = true;
loginMode = { kind: 'offline' };
await act(async () => {
  typePassword('secret2026');
});
await submitLogin();
await act(async () => {
  await new Promise((resolve) => setTimeout(resolve, 1100));
});
check('Réseau : nouvel essai automatique', loginCalls().length >= 2, `${loginCalls().length} appel(s)`);
const offlineText = document.body.textContent || '';
check('Réseau : le mot de passe n’est pas mis en cause', /n’a pas été refusé|Vérifiez votre connexion/i.test(offlineText), offlineText.slice(0, 160));
check('Réseau : message d’erreur réseau', /base de données ne répond pas|base de données injoignable|Connexion impossible/i.test(offlineText), offlineText.slice(0, 300));

// --- 7 bis. Base pas encore mise à jour : contrat historique ----------------
rpcCalls.length = 0;
legacyOnly = true;
loginMode = { kind: 'ok' };
await act(async () => {
  typePassword('secret2026');
});
await submitLogin();
check('Compatibilité : repli sur admin_login', legacyCalls().length === 1, `${legacyCalls().length} appel(s)`);
check(
  'Compatibilité : jeton de l’ancienne fonction accepté',
  dom.window.localStorage.getItem(STORAGE_KEY) === 'jeton-heritage-0123456789abcdef',
  String(dom.window.localStorage.getItem(STORAGE_KEY))
);
legacyOnly = false;
dom.window.localStorage.removeItem(STORAGE_KEY);

// --- 8. Panne pendant le contrôle de session -------------------------------
const sessionRoot = createRoot(document.createElement('div'));
dom.window.localStorage.setItem(STORAGE_KEY, 'jeton-session-0123456789');
checkMode = 'offline';
await act(async () => {
  sessionRoot.render(
    <StoreProvider>
      <Admin />
    </StoreProvider>
  );
});
await act(async () => {
  await new Promise((resolve) => setTimeout(resolve, 1600));
});
check(
  'Session : une panne réseau ne déconnecte pas',
  dom.window.localStorage.getItem(STORAGE_KEY) === 'jeton-session-0123456789',
  String(dom.window.localStorage.getItem(STORAGE_KEY))
);
await act(async () => {
  sessionRoot.unmount();
});

// --- 9. Jeton invalide : déconnexion propre --------------------------------
checkMode = 'invalid';
const invalidRoot = createRoot(document.createElement('div'));
await act(async () => {
  invalidRoot.render(
    <StoreProvider>
      <Admin />
    </StoreProvider>
  );
});
await act(async () => {
  await new Promise((resolve) => setTimeout(resolve, 300));
});
check(
  'Session : un jeton invalide est bien effacé',
  dom.window.localStorage.getItem(STORAGE_KEY) === null,
  String(dom.window.localStorage.getItem(STORAGE_KEY))
);
await act(async () => {
  invalidRoot.unmount();
});

await act(async () => {
  root.unmount();
});

const failed = results.filter((r) => !r.ok);
for (const r of results) {
  console.log(`${r.ok ? '✅' : '❌'} ${r.name}${r.ok || !r.detail ? '' : ` — ${r.detail}`}`);
}
console.log(`\n${results.length - failed.length}/${results.length} vérifications réussies.`);
process.exit(failed.length > 0 ? 1 : 0);
