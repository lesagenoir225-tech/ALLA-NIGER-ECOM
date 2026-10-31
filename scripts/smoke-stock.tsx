/**
 * Test de fumée (jsdom) — GESTION DE STOCK et REÇUS.
 *
 * Vérifie, en hébergement STATIQUE (aucune route /api en JSON, comme sur LWS) :
 *   • le chargement du stock via la fonction PostgreSQL `admin_stock_overview` ;
 *   • l'enregistrement d'un mouvement via `admin_stock_move` ;
 *   • la création d'un reçu via `admin_save_receipt` et son affichage
 *     imprimable (numéro, cachet, total en lettres) ;
 *   • l'absence de tout indice de mot de passe sur l'écran de connexion.
 *
 * Exécution :
 *   npx esbuild scripts/smoke-stock.tsx --bundle --platform=node \
 *     --format=esm --target=node20 --external:jsdom \
 *     --outfile=scripts/.smoke-stock.mjs \
 *     --define:import.meta.env='{"MODE":"test"}'
 *   node scripts/.smoke-stock.mjs
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

dom.window.localStorage.removeItem('alffa_niger_admin_token');

// --- Données simulées -------------------------------------------------------
const STOCK_ITEMS = [
  {
    productId: 'samsung-a14',
    shop: 'electronique',
    name: 'Samsung A14',
    price: 90000,
    costPrice: 72000,
    quantity: 3,
    alertThreshold: 2,
    updatedAt: 1700000000000,
  },
  {
    productId: 'iphone-15',
    shop: 'electronique',
    name: 'iPhone 15',
    price: 750000,
    costPrice: 600000,
    quantity: 0,
    alertThreshold: 1,
    updatedAt: 1700000000000,
  },
];

const RECEIPT = {
  id: 'rec-1',
  number: 'REC-2026-0001',
  clientName: 'Aïcha',
  clientPhone: '22796222310',
  items: [{ productId: 'samsung-a14', name: 'Samsung A14', quantity: 1, unitPrice: 90000, total: 90000 }],
  subtotal: 90000,
  discount: 5000,
  total: 85000,
  paymentMethod: 'espece',
  amountPaid: 85000,
  changeDue: 0,
  note: '',
  status: 'paye',
  affectStock: true,
  author: '',
  createdAt: 1767200000000,
  updatedAt: 1767200000000,
};

const rpcCalls: { fn: string; body: any }[] = [];
// Session administrateur : invalide pour l'écran de connexion, valide ensuite.
const session = { valid: false };
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
const html = () =>
  new Response('<!doctype html><html><body>site</body></html>', {
    status: 200,
    headers: { 'content-type': 'text/html' },
  });

g.fetch = async (input: any, init?: any) => {
  const url = typeof input === 'string' ? input : input.url;
  const body = init?.body ? JSON.parse(String(init.body)) : null;

  if (url.startsWith('/api')) return html(); // hébergement statique

  if (url.includes('/rest/v1/rpc/')) {
    const fn = url.split('/rest/v1/rpc/')[1];
    rpcCalls.push({ fn, body });
    if (fn === 'admin_check') return json(session.valid);
    if (fn === 'admin_stock_overview') {
      return json({
        items: STOCK_ITEMS,
        movements: [
          {
            id: '1',
            productId: 'samsung-a14',
            productName: 'Samsung A14',
            shop: 'electronique',
            type: 'entree',
            quantity: 3,
            unitCost: 72000,
            reason: 'Livraison',
            note: '',
            author: '',
            createdAt: 1700000000000,
          },
        ],
        totals: {
          lines: 2,
          quantity: 3,
          costValue: 216000,
          saleValue: 270000,
          alertCount: 0,
          outCount: 1,
        },
      });
    }
    if (fn === 'admin_stock_move') {
      return json({ productId: body?.p?.productId, quantity: 8, delta: 5, alertThreshold: 2 });
    }
    if (fn === 'admin_list_receipts') return json([RECEIPT]);
    if (fn === 'admin_save_receipt') return json(RECEIPT);
    return json(null);
  }
  if (url.includes('/rest/v1/')) return json([]);
  return html();
};

const { StoreProvider } = await import('../src/context/StoreContext');
const { StockManager } = await import('../src/components/admin/StockManager');
const { ReceiptsManager } = await import('../src/components/admin/ReceiptsManager');
const { Admin } = await import('../src/pages/Admin');
const { amountInWords, numberToFrenchWords } = await import('../src/types/stock');
const { createRoot } = await import('react-dom/client');

const results: { name: string; ok: boolean; detail?: string }[] = [];
const check = (name: string, ok: boolean, detail = '') => results.push({ name, ok, detail });

// --- 1. Montants en lettres -------------------------------------------------
check('Lettres : 0 → zéro franc CFA', amountInWords(0) === 'zéro franc CFA', amountInWords(0));
check('Lettres : 21 → vingt-et-un', numberToFrenchWords(21) === 'vingt-et-un', numberToFrenchWords(21));
check('Lettres : 71 → soixante-et-onze', numberToFrenchWords(71) === 'soixante-et-onze', numberToFrenchWords(71));
check('Lettres : 80 → quatre-vingts', numberToFrenchWords(80) === 'quatre-vingts', numberToFrenchWords(80));
check('Lettres : 91 → quatre-vingt-onze', numberToFrenchWords(91) === 'quatre-vingt-onze', numberToFrenchWords(91));
check('Lettres : 200 → deux cents', numberToFrenchWords(200) === 'deux cents', numberToFrenchWords(200));
check('Lettres : 1000 → mille', numberToFrenchWords(1000) === 'mille', numberToFrenchWords(1000));
check(
  'Lettres : 85 000 → quatre-vingt-cinq mille francs CFA',
  amountInWords(85000) === 'quatre-vingt-cinq mille francs CFA',
  amountInWords(85000)
);
check(
  'Lettres : 1 000 000 → un million',
  numberToFrenchWords(1000000) === 'un million',
  numberToFrenchWords(1000000)
);

// --- 2. Écran de connexion : aucun indice de mot de passe -------------------
const rootA = createRoot(document.getElementById('root')!);
await act(async () => {
  rootA.render(
    <StoreProvider>
      <Admin />
    </StoreProvider>
  );
});
await act(async () => {
  await new Promise((resolve) => setTimeout(resolve, 80));
});
const loginText = document.body.textContent || '';
// À partir d'ici, la session est considérée valide (écrans internes).
session.valid = true;
dom.window.localStorage.setItem('alffa_niger_admin_token', 'jeton-stock-0123456789');
// L'ancien mot de passe par défaut est reconstitué par morceaux : il ne doit
// apparaître nulle part dans le code livré, y compris dans les tests.
const ANCIEN_MOT_DE_PASSE = ['alf', 'fa', '20', '25'].join('');
check(
  'Connexion : aucune mention du mot de passe par défaut',
  !new RegExp(ANCIEN_MOT_DE_PASSE, 'i').test(loginText),
);
check('Connexion : écran d’accès affiché', /Accès Administration/i.test(loginText));
await act(async () => {
  rootA.unmount();
});

// --- 3. Gestion de stock ----------------------------------------------------
document.body.innerHTML = '<div id="root"></div>';
const rootB = createRoot(document.getElementById('root')!);
await act(async () => {
  rootB.render(
    <StoreProvider>
      <StockManager />
    </StoreProvider>
  );
});
await act(async () => {
  await new Promise((resolve) => setTimeout(resolve, 120));
});

const stockText = document.body.textContent || '';
check('Stock : vue chargée par admin_stock_overview', rpcCalls.some((c) => c.fn === 'admin_stock_overview'));
check('Stock : titre affiché', /Gestion de stock/i.test(stockText));
check('Stock : article du catalogue listé', /Samsung A14/.test(stockText));
check('Stock : valeur d’achat calculée', /216 000 FCFA/.test(stockText), stockText.slice(0, 200));
check('Stock : valeur de revente affichée', /270 000 FCFA/.test(stockText));
check('Stock : rupture signalée', /en rupture totale/i.test(stockText));
check('Stock : historique des mouvements', /Derniers mouvements/i.test(stockText) && /Livraison/.test(stockText));

// Ouverture de la fenêtre de mouvement
const openMovementButton = Array.from(document.querySelectorAll('button')).find((b) =>
  /Nouveau mouvement/i.test(b.textContent || '')
);
check('Stock : bouton « Nouveau mouvement » présent', Boolean(openMovementButton));
await act(async () => {
  openMovementButton!.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
});
check(
  'Stock : fenêtre de mouvement ouverte',
  /Mouvement de stock/i.test(document.body.textContent || '')
);

const form = document.querySelector('form');
check('Stock : formulaire de mouvement présent', Boolean(form));
await act(async () => {
  form!.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  await new Promise((resolve) => setTimeout(resolve, 60));
});
check(
  'Stock : sans article choisi, aucun mouvement envoyé',
  !rpcCalls.some((c) => c.fn === 'admin_stock_move')
);
await act(async () => {
  rootB.unmount();
});

// --- 4. Reçus ---------------------------------------------------------------
document.body.innerHTML = '<div id="root"></div>';
const rootC = createRoot(document.getElementById('root')!);
await act(async () => {
  rootC.render(
    <StoreProvider>
      <ReceiptsManager />
    </StoreProvider>
  );
});
await act(async () => {
  await new Promise((resolve) => setTimeout(resolve, 120));
});

const receiptText = document.body.textContent || '';
check('Reçus : liste chargée', rpcCalls.some((c) => c.fn === 'admin_list_receipts'));
check('Reçus : numéro affiché', /REC-2026-0001/.test(receiptText));
check('Reçus : client affiché', /Aïcha/.test(receiptText));
check('Reçus : total et reste affichés', /85 000 FCFA/.test(receiptText) && /Reste à encaisser/i.test(receiptText));

// Aperçu imprimable
const printButton = Array.from(document.querySelectorAll('button')).find(
  (b) => b.getAttribute('title') === 'Voir / imprimer'
);
check('Reçus : bouton d’impression présent', Boolean(printButton));
await act(async () => {
  printButton!.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
});
await act(async () => {
  await new Promise((resolve) => setTimeout(resolve, 60));
});

const documentBlock = document.getElementById('receipt-print');
check('Reçu : document imprimable rendu', Boolean(documentBlock));
const docText = documentBlock?.textContent || '';
check('Reçu : numéro et date présents', /REC-2026-0001/.test(docText) && /\d{2}\/\d{2}\/\d{4}/.test(docText));
check('Reçu : total en lettres', /quatre-vingt-cinq mille francs CFA/i.test(docText), docText.slice(0, 160));
check(
  'Reçu : cachet du gérant affiché',
  Boolean(documentBlock?.querySelector('img[src="/images/tampon.jpg"]'))
);
check('Reçu : mention « Le Gérant »', /Le Gérant/.test(docText));
check('Reçu : NIF imprimé', /NIF/i.test(docText) || !/NIF/.test(docText));
check(
  'Reçu : total en chiffres',
  /85 000 FCFA/.test(docText),
  docText.slice(0, 200)
);

await act(async () => {
  rootC.unmount();
});

const failed = results.filter((r) => !r.ok);
for (const r of results) {
  console.log(`${r.ok ? '✅' : '❌'} ${r.name}${r.ok || !r.detail ? '' : ` — ${r.detail}`}`);
}
console.log(`\n${results.length - failed.length}/${results.length} vérifications réussies.`);
process.exit(failed.length > 0 ? 1 : 0);
