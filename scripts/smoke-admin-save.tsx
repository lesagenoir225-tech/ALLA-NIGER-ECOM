/**
 * Test de fumée (jsdom) — ENREGISTREMENT DEPUIS L'ADMINISTRATION
 *
 * Reproduit les conditions réelles de production : le site est servi en
 * statique (LWS), donc AUCUNE route `/api/...` ne répond en JSON. Les
 * écritures doivent alors passer par les fonctions PostgreSQL `admin_*`.
 *
 * Le défaut corrigé : `saveProduct` utilisait `fetch('/api/products')`
 * directement. Sur un hébergement statique cette route renvoie la page HTML
 * du site, l'enregistrement échouait et l'interface affichait
 * « Unexpected token '<' … is not valid JSON ».
 *
 * Exécution :
 *   npx esbuild scripts/smoke-admin-save.tsx --bundle --platform=node \
 *     --format=esm --target=node20 --external:jsdom \
 *     --outfile=scripts/.smoke-admin-save.mjs \
 *     --define:import.meta.env='{"MODE":"test"}'
 *   node scripts/.smoke-admin-save.mjs
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

dom.window.localStorage.setItem('alffa_niger_admin_token', 'jeton-de-test-0123456789');

// --- Simulation réseau ------------------------------------------------------
const rpcCalls: { fn: string; body: any }[] = [];
const apiCalls: string[] = [];
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
/** Hébergement statique : toute route /api renvoie la page HTML du site. */
const html = () =>
  new Response('<!doctype html><html><body>ALFFA NIGER</body></html>', {
    status: 200,
    headers: { 'content-type': 'text/html' },
  });

let rpcFailure: { message: string; status: number } | null = null;

g.fetch = async (input: any, init?: any) => {
  const url = typeof input === 'string' ? input : input.url;
  const body = init?.body ? JSON.parse(String(init.body)) : null;

  if (url.startsWith('/api')) {
    apiCalls.push(`${init?.method || 'GET'} ${url}`);
    return html();
  }
  if (url.includes('/rest/v1/rpc/')) {
    const fn = url.split('/rest/v1/rpc/')[1];
    rpcCalls.push({ fn, body });
    if (fn === 'admin_check') return json(true);
    if (rpcFailure) return json({ message: rpcFailure.message, code: '28000' }, rpcFailure.status);
    // Les fonctions d'écriture sont VOID : PostgREST renvoie null.
    return new Response('null', { status: 200, headers: { 'content-type': 'application/json' } });
  }
  // Lectures de santé + catalogue (clé publique, lecture seule) : renvoie du vide.
  if (url.includes('/rest/v1/')) return json([]);
  return html();
};

const { StoreProvider, useStore } = await import('../src/context/StoreContext');
const { createRoot } = await import('react-dom/client');

// --- Sonde : expose le magasin et la notification courante ------------------
let store: any = null;
function Probe() {
  store = useStore();
  return <div id="probe">{store.notification ? store.notification.message : ''}</div>;
}

const root = createRoot(document.getElementById('root')!);
await act(async () => {
  root.render(
    <StoreProvider>
      <Probe />
    </StoreProvider>
  );
});
await act(async () => {
  await new Promise((r) => setTimeout(r, 60));
});

const results: { name: string; ok: boolean; detail?: string }[] = [];
const check = (name: string, ok: boolean, detail = '') => results.push({ name, ok, detail });
const notification = () => document.getElementById('probe')?.textContent || '';
const lastRpc = (fn: string) => [...rpcCalls].reverse().find((c) => c.fn === fn);

const NEW_PRODUCT = {
  id: 'zz-test-ordre',
  shop: 'electronique' as const,
  name: 'Produit de test',
  brand: 'samsung',
  category: 'smartphones',
  price: 125000,
  availability: 'disponible' as const,
  capacity: '128 Go',
  colors: 'Noir',
  condition: 'Neuf scellé',
  reference: 'TEST-1',
  description: 'Produit ajouté par le test de fumée.',
  specs: '',
  model: '',
  image: '/images/products/electronique/samsung-a14.webp',
  sourceImage: '',
  isNew: true,
  hidden: false,
  createdAt: Date.now(),
};

// 1. CRÉATION d'un produit depuis l'administration
const outcome: { saved: boolean } = { saved: false };
await act(async () => {
  outcome.saved = await store.saveProduct(NEW_PRODUCT as any);
});
const createCall = lastRpc('admin_save_product');
check('Statique : création d’un produit réussie', outcome.saved === true, notification());
check(
  'Statique : création passée par la fonction admin_save_product',
  Boolean(createCall),
  JSON.stringify(rpcCalls.map((c) => c.fn))
);
check(
  'Statique : aucune requête perdue vers /api/products (route inexistante)',
  !apiCalls.some((c) => c.includes('/api/products')),
  JSON.stringify(apiCalls)
);
check(
  'Statique : jeton administrateur transmis à la base',
  createCall?.body?.p_token === 'jeton-de-test-0123456789',
  JSON.stringify(createCall?.body)
);
check(
  'Statique : champs camelCase convertis en colonnes',
  createCall?.body?.p?.source_image === '' && createCall?.body?.p?.is_new === true,
  JSON.stringify(createCall?.body?.p || {}).slice(0, 160)
);

// 2. MODIFICATION d'un produit existant
rpcCalls.length = 0;
await act(async () => {
  outcome.saved = await store.saveProduct({ ...NEW_PRODUCT, name: 'Produit de test modifié' } as any);
});
const updateCall = lastRpc('admin_save_product');
check('Statique : modification réussie', outcome.saved === true, notification());
check(
  'Statique : modification transmise à la base',
  updateCall?.body?.p?.name === 'Produit de test modifié',
  JSON.stringify(updateCall?.body?.p?.name)
);

// 3. RÉORGANISATION (flèches ↑ ↓)
rpcCalls.length = 0;
await act(async () => {
  await store.reorderProducts('electronique', ['zz-test-ordre', 'samsung-a14']);
});
const reorderCall = lastRpc('admin_reorder_products');
check('Statique : réorganisation enregistrée', Boolean(reorderCall), notification());
check(
  'Statique : ordre transmis à la base',
  JSON.stringify(reorderCall?.body?.p_ordered_ids) === '["zz-test-ordre","samsung-a14"]',
  JSON.stringify(reorderCall?.body)
);

// 4. PARAMÈTRES
rpcCalls.length = 0;
await act(async () => {
  await store.saveSettings({ whatsappTextile: '22790000000' });
});
check('Statique : paramètres enregistrés', Boolean(lastRpc('admin_save_settings')), notification());

// 5. SESSION EXPIRÉE : message lisible, jamais « Unexpected token »
rpcFailure = { message: 'Session expirée ou invalide. Veuillez vous reconnecter.', status: 400 };
rpcCalls.length = 0;
await act(async () => {
  outcome.saved = await store.saveProduct(NEW_PRODUCT as any);
});
check('Session expirée : l’enregistrement échoue proprement', outcome.saved === false);
check(
  'Session expirée : message métier affiché tel quel',
  /session expirée/i.test(notification()),
  notification()
);
check(
  'Session expirée : aucun message technique « Unexpected token »',
  !/unexpected token|is not valid json/i.test(notification()),
  notification()
);
rpcFailure = null;

// 6. BASE INJOIGNABLE : message explicite, pas de plantage
const realFetch = g.fetch;
g.fetch = async (input: any) => {
  const url = typeof input === 'string' ? input : input.url;
  if (url.startsWith('/api')) return html();
  throw new TypeError('Failed to fetch');
};
await act(async () => {
  outcome.saved = await store.saveProduct(NEW_PRODUCT as any);
});
check('Base injoignable : l’enregistrement échoue proprement', outcome.saved === false);
check(
  'Base injoignable : message compréhensible pour l’administrateur',
  /connexion|base de données|enregistr/i.test(notification()) &&
    !/unexpected token/i.test(notification()),
  notification()
);
g.fetch = realFetch;

const failed = results.filter((r) => !r.ok);
for (const r of results) {
  console.log(`${r.ok ? '✅' : '❌'} ${r.name}${r.ok || !r.detail ? '' : ` — ${r.detail}`}`);
}
console.log(`\n${results.length - failed.length}/${results.length} vérifications réussies.`);
// Sortie explicite : jsdom conserve des minuteries ouvertes (notifications).
process.exit(failed.length > 0 ? 1 : 0);
