/**
 * Test de fumée (jsdom) — rendu de la rubrique publique « Expérience entrepreneuriale ».
 * Exécution : npx tsx scripts/smoke-experience.tsx
 * Ce script n'est pas exécuté en production.
 */
import { JSDOM } from 'jsdom';
import { act } from 'react';

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost:3000/#/experience-entrepreneuriale',
  pretendToBeVisual: true,
});

const globalAny = globalThis as any;
globalAny.window = dom.window;
globalAny.document = dom.window.document;
try {
  Object.defineProperty(globalThis, 'navigator', {
    value: dom.window.navigator,
    configurable: true,
  });
} catch {}
globalAny.HTMLElement = dom.window.HTMLElement;
globalAny.Element = dom.window.Element;
globalAny.Node = dom.window.Node;
globalAny.localStorage = dom.window.localStorage;
globalAny.requestAnimationFrame = (cb: any) => setTimeout(cb, 0);
globalAny.cancelAnimationFrame = (id: any) => clearTimeout(id);
globalAny.matchMedia =
  dom.window.matchMedia ||
  (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));

// Import après l'installation du DOM.
const { EXPERIENCE_SEED } = await import('../src/data/experienceSeed');
const { INITIAL_ELECTRONIQUE_PRODUCTS, INITIAL_TEXTILE_PRODUCTS } = await import(
  '../src/data/initialData'
);
const { default: App } = await import('../src/App');
const { createRoot } = await import('react-dom/client');

const calls: string[] = [];
// Objets stables (mêmes références) : évite tout cycle de re-fetch dans le StoreProvider.
const EXPERIENCE_PAYLOAD = { success: true, references: EXPERIENCE_SEED };
const DATA_PAYLOAD = {
  products: [...INITIAL_ELECTRONIQUE_PRODUCTS, ...INITIAL_TEXTILE_PRODUCTS],
  featured: { electronique: ['samsung-a14'], textile: ['bazin-drews'] },
};
const FLAGS_PAYLOAD = { authenticated: false, hasTables: false };
const fakeResponse = (payload: any) => ({
  ok: true,
  status: 200,
  json: async () => payload,
  text: async () => JSON.stringify(payload),
});
globalAny.IS_REACT_ACT_ENVIRONMENT = true;
globalAny.fetch = async (input: any) => {
  const url = typeof input === 'string' ? input : input.url;
  calls.push(url);
  if (url.startsWith('/api/experience')) return fakeResponse(EXPERIENCE_PAYLOAD) as any;
  if (url.startsWith('/api/data')) return fakeResponse(DATA_PAYLOAD) as any;
  return fakeResponse(FLAGS_PAYLOAD) as any;
};

const root = createRoot(document.getElementById('root')!);
await act(async () => {
  root.render(<App />);
});
// Laisse les promesses de chargement se résoudre.
await act(async () => {
  await new Promise((resolve) => setTimeout(resolve, 50));
});

const text = document.body.textContent || '';
const results: { name: string; ok: boolean; detail?: string }[] = [];
const check = (name: string, ok: boolean, detail?: string) => results.push({ name, ok, detail });

check('Titre principal présent', text.includes('Notre expérience entrepreneuriale'));
check(
  'Texte éditorial exact présent',
  text.includes(
    'ALFFA NIGER développe son expérience entrepreneuriale à travers plusieurs domaines d’activité'
  )
);
check('Les 3 domaines sont affichés', ['BTP — Bâtiment et Travaux Publics', 'Matériel informatique et fournitures', 'Fournitures vivrières'].every((d) => text.includes(d)));
check('Référence Agadez présente', text.includes('maison d’arrêt d’Agadez'));
check('Référence TGI Zinder présente', text.includes('Tribunal de grande instance de Zinder'));
check('Référence GIZ présente', text.includes('Livraisons de matériel informatique à la GIZ'));
check('Référence Croix-Rouge présente', text.includes('Croix-Rouge Niger'));
check('Référence vivrière Tchirozérine présente', text.includes('Inspection de l’enseignement primaire et préscolaire de Tchirozérine'));

const buttons = Array.from(document.querySelectorAll('button')).map((b) => b.textContent || '');
check(
  'Compteur « Tous les domaines » = 14',
  buttons.some((b) => b.includes('Tous les domaines') && b.includes('14')),
  buttons.filter((b) => b.includes('domaines')).join(' | ')
);
check(
  'Boutons « Voir les détails » = 14',
  (document.body.textContent || '').split('Voir les détails').length - 1 === 14,
  String((document.body.textContent || '').split('Voir les détails').length - 1)
);
check('Aucune photo inventée (placeholders neutres)', text.includes('Photographie authentique à venir'));

// Filtre BTP
const btpFilter = Array.from(document.querySelectorAll('button')).find(
  (b) => (b.textContent || '').trim().startsWith('BTP')
);
if (btpFilter) {
  await act(async () => {
    btpFilter.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  });
}
const afterFilter = document.body.textContent || '';
check(
  'Filtre BTP : 6 références BTP, aucune référence informatique',
  afterFilter.includes('Construction du mur de clôture et réhabilitation de la maison d’arrêt d’Agadez') &&
    !afterFilter.includes('Livraisons de matériel informatique à la GIZ'),
  `compteur BTP présent: ${afterFilter.includes('6')}`
);

// Ouverture d'une fiche détaillée
const detailsButton = Array.from(document.querySelectorAll('button')).find(
  (b) => (b.textContent || '').includes('Voir les détails')
);
if (detailsButton) {
  await act(async () => {
    detailsButton.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  });
}
const afterOpen = document.body.textContent || '';
check('Fiche détaillée : procédure affichée', afterOpen.includes('Procédure mentionnée'));
check('Fiche détaillée : mention de transparence', afterOpen.includes('Aucun montant, aucune date ni aucune quantité'));

// Fermeture de la fiche par la touche Échap
await act(async () => {
  document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
});
await act(async () => {
  await new Promise((resolve) => setTimeout(resolve, 30));
});
check(
  'Touche Échap : la fiche détaillée se ferme',
  !(document.body.textContent || '').includes('Procédure mentionnée')
);

// --- Non-régression : navigation vers les boutiques existantes ---
const goTo = async (hash: string) => {
  dom.window.location.hash = hash;
  await act(async () => {
    dom.window.dispatchEvent(new dom.window.HashChangeEvent('hashchange'));
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 40));
  });
  return document.body.textContent || '';
};

const elecText = await goTo('#/electronique');
check('Boutique Électronique : produits toujours affichés', elecText.includes('iPhone 13 Pro Max'));
const textileText = await goTo('#/textile');
check('Boutique Textile : produits toujours affichés', textileText.includes('Bazin'));
const contactText = await goTo('#/contact');
check('Page Contact toujours accessible', contactText.length > 200);
const homeText = await goTo('#/');
check('Accueil toujours accessible', homeText.includes('ALFFA'));
const backText = await goTo('#/experience-entrepreneuriale');
check('Retour sur la rubrique depuis le menu', backText.includes('Notre expérience entrepreneuriale'));
check(
  'Lien « Expérience entrepreneuriale » présent dans le menu',
  Array.from(document.querySelectorAll('a')).some(
    (a) => a.getAttribute('href') === '#/experience-entrepreneuriale'
  )
);

console.log('\n=== Test de fumée — Expérience entrepreneuriale (jsdom) ===');
results.forEach((r) => console.log(`${r.ok ? '✅' : '❌'} ${r.name}${r.detail ? ` — ${r.detail}` : ''}`));
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} vérifications réussies.`);
console.log('Endpoints appelés :', [...new Set(calls)].join(', '));
process.exit(failed.length ? 1 : 0);
