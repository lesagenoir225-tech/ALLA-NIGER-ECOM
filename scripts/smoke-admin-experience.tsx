/**
 * Test de fumée (jsdom) — onglet d'administration « Expérience entrepreneuriale ».
 * Exécution : npx esbuild … && node …  (voir README / compte rendu)
 * Ce script n'est exécuté ni en production ni dans le bundle client.
 */
import { JSDOM } from 'jsdom';
import { act } from 'react';

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost:3000/#/admin',
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
globalAny.IS_REACT_ACT_ENVIRONMENT = true;

dom.window.localStorage.setItem('alffa_niger_admin_token', 'jeton-de-test');

const { EXPERIENCE_SEED } = await import('../src/data/experienceSeed');
const { INITIAL_ELECTRONIQUE_PRODUCTS, INITIAL_TEXTILE_PRODUCTS } = await import(
  '../src/data/initialData'
);
const { StoreProvider } = await import('../src/context/StoreContext');
const { Admin } = await import('../src/pages/Admin');
const { createRoot } = await import('react-dom/client');

const DATA_PAYLOAD = {
  products: [...INITIAL_ELECTRONIQUE_PRODUCTS, ...INITIAL_TEXTILE_PRODUCTS],
  featured: { electronique: [], textile: [] },
};
const ADMIN_PAYLOAD = { success: true, references: EXPERIENCE_SEED };
const fakeResponse = (payload: any) => ({
  ok: true,
  status: 200,
  json: async () => payload,
  text: async () => JSON.stringify(payload),
});
const calls: string[] = [];
globalAny.fetch = async (input: any) => {
  const url = typeof input === 'string' ? input : input.url;
  calls.push(url);
  if (url.startsWith('/api/admin/experience')) return fakeResponse(ADMIN_PAYLOAD) as any;
  if (url.startsWith('/api/admin/check')) return fakeResponse({ authenticated: true }) as any;
  if (url.startsWith('/api/data')) return fakeResponse(DATA_PAYLOAD) as any;
  return fakeResponse({ authenticated: true, hasTables: false }) as any;
};

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

const results: { name: string; ok: boolean; detail?: string }[] = [];
const check = (name: string, ok: boolean, detail?: string) => results.push({ name, ok, detail });
const buttons = () => Array.from(document.querySelectorAll('button'));
const click = async (el: any) => {
  await act(async () => {
    el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 40));
  });
};

let text = document.body.textContent || '';
check('Session administrateur reconnue', !text.includes('Accès réservé'));

const tab = buttons().find((b) => (b.textContent || '').includes('Expérience entrepreneuriale'));
check('Onglet « Expérience entrepreneuriale » présent', Boolean(tab));
if (tab) await click(tab);

text = document.body.textContent || '';
check('Liste chargée depuis /api/admin/experience', text.includes('Maison d’arrêt d’Agadez'));
check('Statut de publication affiché', text.includes('Publié'));
check('Compteur de références', text.includes('14'));
check('Boutons d’action disponibles', ['Modifier', 'Aperçu', 'Supprimer'].every((l) => text.includes(l)));

const newBtn = buttons().find((b) => (b.textContent || '').includes('Nouvelle référence'));
check('Bouton « Nouvelle référence » présent', Boolean(newBtn));
if (newBtn) await click(newBtn);

text = document.body.textContent || '';
check('Formulaire d’ajout ouvert', text.includes('Domaine d’activité'));
check('Champs statut et exécution', text.includes('Statut de validation') && text.includes('État d’exécution'));
check('Gestion des photographies', text.includes('Photographies authentiques'));
check('Gestion des documents', text.includes('Documents justificatifs'));
check('Rappel de confidentialité', text.includes('Ne publiez aucun document confidentiel'));

const publishBtn = buttons().find((b) => (b.textContent || '').includes('Valider & publier'));
check(
  'Publication désactivée avant enregistrement',
  Boolean(publishBtn) && (publishBtn as HTMLButtonElement).disabled
);

console.log('\n=== Test de fumée — Administration « Expérience entrepreneuriale » (jsdom) ===');
results.forEach((r) => console.log(`${r.ok ? '✅' : '❌'} ${r.name}${r.detail ? ` — ${r.detail}` : ''}`));
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} vérifications réussies.`);
console.log(
  'Endpoints appelés :',
  [...new Set(calls.filter((c) => c.startsWith('/api')))].join(', ')
);
process.exit(failed.length ? 1 : 0);
