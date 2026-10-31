/**
 * Test de fumée (jsdom) — MODULES MÉTIER du site statique (LWS).
 *
 * Vérifie, sans serveur Node, les six modules demandés par le gérant :
 *   1. statistiques de ventes (chiffres lus depuis la base) ;
 *   2. dépenses et bénéfice réel ;
 *   3. reçu vérifiable (code + QR code sur le document imprimé) ;
 *   4. alertes de stock (seuils exposés par la vue de stock) ;
 *   5. multi-utilisateurs (comptes gérant / vendeur) ;
 *   6. sauvegarde automatique (liste et déclenchement).
 *
 * Exécution :
 *   npx esbuild scripts/smoke-metier.tsx --bundle --platform=node \
 *     --format=esm --target=node20 --external:jsdom \
 *     --outfile=scripts/.smoke-metier.mjs \
 *     --define:import.meta.env='{"MODE":"test"}'
 *   node scripts/.smoke-metier.mjs
 */
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'https://alffaniger.com/#/admin',
  pretendToBeVisual: true,
});
const g = globalThis as any;
g.window = dom.window;
g.document = dom.window.document;
g.localStorage = dom.window.localStorage;
try {
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
} catch {}
g.HTMLElement = dom.window.HTMLElement;
g.Element = dom.window.Element;
g.Node = dom.window.Node;

const results: { name: string; ok: boolean; detail?: string }[] = [];
const check = (name: string, ok: boolean, detail = '') => results.push({ name, ok, detail });

// --- Jeton administrateur --------------------------------------------------
const TOKEN = 'jeton-test-0123456789abcdef';
g.localStorage.setItem('alffa_niger_admin_token', TOKEN);

// --- Simulation de la base (PostgREST) -------------------------------------
const calls: { fn: string; body: any; auth: string | null }[] = [];

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

const STATS = {
  from: 0,
  to: 0,
  kpis: { revenue: 450000, receipts: 6, paid: 400000, receivable: 50000, discounts: 5000, avgTicket: 75000 },
  daily: [
    { date: '2026-10-29', revenue: 200000, count: 3 },
    { date: '2026-10-30', revenue: 250000, count: 3 },
  ],
  topProducts: [{ productId: 'samsung-a14', name: 'Samsung A14', quantity: 4, revenue: 400000 }],
  byPayment: [{ method: 'espece', revenue: 450000, count: 6 }],
  topClients: [{ name: 'Amina', revenue: 300000, count: 3 }],
};

const FINANCE = {
  from: 0,
  to: 0,
  revenue: 450000,
  cogs: 300000,
  grossMargin: 150000,
  expenses: 50000,
  netProfit: 100000,
  receivable: 50000,
  expensesByCategory: [{ category: 'transport', total: 50000 }],
};

const RECEIPT = {
  id: 'rec-1',
  number: 'REC-2026-0002',
  clientName: 'Amina Diallo',
  clientPhone: '22790000000',
  items: [{ productId: 'samsung-a14', name: 'Samsung A14', quantity: 1, unitPrice: 90000, total: 90000 }],
  subtotal: 90000,
  discount: 0,
  total: 90000,
  paymentMethod: 'espece',
  amountPaid: 90000,
  changeDue: 0,
  note: '',
  status: 'paye',
  affectStock: true,
  author: 'gerant',
  verifyCode: 'A1B2C3D4',
  createdAt: 1767225600000,
  updatedAt: 1767225600000,
};

g.fetch = async (input: any, init?: any) => {
  const url = typeof input === 'string' ? input : input.url;
  const authHeader = init?.headers?.Authorization || init?.headers?.authorization || null;

  if (url.startsWith('/api')) {
    // Hébergement statique : aucune route Node ne répond en JSON.
    return new Response('<!doctype html><html><body>ALFFA NIGER</body></html>', {
      status: 200,
      headers: { 'content-type': 'text/html' },
    });
  }

  if (url.includes('/rest/v1/rpc/')) {
    const fn = url.split('/rest/v1/rpc/')[1];
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    calls.push({ fn, body, auth: authHeader });

    switch (fn) {
      case 'admin_check':
        return json(true);
      case 'admin_role':
        return json({ role: 'gerant', username: 'gerant', displayName: 'Le Gérant' });
      case 'admin_sales_stats':
        return json(STATS);
      case 'admin_finance_overview':
        return json(FINANCE);
      case 'admin_list_expenses':
        return json([
          {
            id: 'dep-1',
            label: 'Transport Niamey',
            category: 'transport',
            amount: 50000,
            spentAt: 1767225600000,
            note: '',
            author: 'gerant',
          },
        ]);
      case 'admin_save_expense':
        return json({
          id: body?.p?.id || 'dep-2',
          label: body?.p?.label,
          category: body?.p?.category,
          amount: body?.p?.amount,
          spentAt: Date.now(),
          note: '',
          author: 'gerant',
        });
      case 'public_verify_receipt':
        return json(
          body?.p_code === 'A1B2C3D4'
            ? {
                found: true,
                number: 'REC-2026-0002',
                issuedAt: RECEIPT.createdAt,
                total: 90000,
                status: 'paye',
                clientInitials: 'AD',
                items: [{ name: 'Samsung A14', quantity: 1, total: 90000 }],
              }
            : { found: false },
        );
      case 'admin_backup_list':
        return json({
          backups: [{ day: '2026-10-31', byte_size: 25027, origin: 'auto' }],
          today: '2026-10-31',
        });
      case 'admin_backup_now':
        return json({ day: '2026-10-31', bytes: 25027, stored: 1 });
      case 'admin_list_accounts':
        return json([
          { id: 'acc-1', username: 'gerant', displayName: 'Le Gérant', role: 'gerant', active: true },
          { id: 'acc-2', username: 'amina', displayName: 'Amina — caisse', role: 'vendeur', active: true },
        ]);
      case 'admin_save_account':
        return json({
          id: body?.p?.id || 'acc-3',
          username: body?.p?.username,
          displayName: body?.p?.displayName || body?.p?.username,
          role: body?.p?.role,
          active: true,
        });
      case 'admin_stock_overview':
        return json({
          items: [
            {
              productId: 'samsung-a14',
              shop: 'electronique',
              name: 'Samsung A14',
              price: 90000,
              costPrice: 70000,
              quantity: 1,
              alertThreshold: 3,
              updatedAt: 0,
            },
          ],
          movements: [],
          totals: { lines: 1, quantity: 1, costValue: 70000, saleValue: 90000, alertCount: 1, outCount: 0 },
        });
      default:
        return json(null);
    }
  }

  if (url.includes('/rest/v1/')) return json([]);
  return json(null);
};

g.IS_REACT_ACT_ENVIRONMENT = true;

const stockService = await import('../src/services/stock');
const { ReceiptDocument } = await import('../src/components/admin/ReceiptDocument');
const React = await import('react');
const { act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { INITIAL_SETTINGS } = await import('../src/data/initialData');

// --- 1. Statistiques de ventes ---------------------------------------------
const stats = await stockService.fetchSalesStats(Date.now() - 86400000, Date.now());
check('Statistiques : chiffre d’affaires lu en base', stats.kpis.revenue === 450000, String(stats.kpis.revenue));
check('Statistiques : panier moyen', stats.kpis.avgTicket === 75000, String(stats.kpis.avgTicket));
check('Statistiques : meilleure vente', stats.topProducts[0]?.name === 'Samsung A14');
check('Statistiques : ventes par jour', stats.daily.length === 2, `${stats.daily.length} jour(s)`);
check(
  'Statistiques : jeton administrateur transmis',
  calls.some((c) => c.fn === 'admin_sales_stats' && c.body?.p_token === TOKEN),
);

// --- 2. Dépenses et bénéfice réel ------------------------------------------
const finance = await stockService.fetchFinance(Date.now() - 86400000, Date.now());
check('Bénéfice : marge brute', finance.grossMargin === 150000, String(finance.grossMargin));
check('Bénéfice : bénéfice net après dépenses', finance.netProfit === 100000, String(finance.netProfit));

const expenses = await stockService.fetchExpenses();
check('Dépenses : liste chargée', expenses.length === 1 && expenses[0].label === 'Transport Niamey');

const saved = await stockService.saveExpense({ label: 'Loyer boutique', category: 'loyer', amount: 75000 });
check('Dépenses : enregistrement', saved.amount === 75000 && saved.label === 'Loyer boutique');

// --- 3. Reçu vérifiable -----------------------------------------------------
const found = await stockService.verifyReceipt('a1b2c3d4');
check('Reçu : code valide reconnu', found.found === true && found.number === 'REC-2026-0002');
check('Reçu : initiales seulement (pas de nom complet)', found.clientInitials === 'AD', found.clientInitials || '');
const missing = await stockService.verifyReceipt('ZZZZZZZZ');
check('Reçu : code inconnu refusé', missing.found === false);

// Rendu réel du document (comme à l'impression) dans le DOM simulé.
const host = document.createElement('div');
document.body.appendChild(host);
const root = createRoot(host);
await act(async () => {
  root.render(React.createElement(ReceiptDocument, { receipt: RECEIPT as any, settings: INITIAL_SETTINGS }));
});
const markup = host.innerHTML;
check('Reçu : code de vérification imprimé', markup.includes('A1B2C3D4'));
check('Reçu : QR code présent (SVG)', /<svg[^>]*viewBox/.test(markup));
check(
  'Reçu : lien de vérification public',
  /verifier\/A1B2C3D4/.test(markup),
  markup.match(/[^"']*verifier\/[A-Z0-9]+/)?.[0] || '',
);
check('Reçu : cachet du gérant toujours présent', markup.includes('tampon'));

// --- 4. Alertes de stock ----------------------------------------------------
const overview = await stockService.fetchStockOverview();
check(
  'Stock : seuil d’alerte connu',
  overview.totals.alertCount === 1 && overview.items[0].quantity <= overview.items[0].alertThreshold,
);

// --- 5. Multi-utilisateurs --------------------------------------------------
const accounts = await stockService.fetchAccounts();
check('Équipe : comptes listés', accounts.length === 2 && accounts[1].role === 'vendeur');
const created = await stockService.saveAccount({
  username: 'amina',
  displayName: 'Amina — caisse',
  role: 'vendeur',
  password: 'motdepasse2026',
});
check('Équipe : création d’un vendeur', created.role === 'vendeur' && created.username === 'amina');
const identity = await stockService.fetchIdentity();
check('Équipe : rôle du compte connecté', identity?.role === 'gerant');

// --- 6. Sauvegarde automatique ---------------------------------------------
const backups = await stockService.fetchBackups();
check('Sauvegarde : copie du jour listée', backups.today === '2026-10-31' && backups.backups.length === 1);
const run = await stockService.runBackup();
check('Sauvegarde : déclenchement manuel', run.bytes === 25027, String(run.bytes));

// --- Bilan ------------------------------------------------------------------
for (const result of results) {
  console.log(`${result.ok ? '✅' : '❌'} ${result.name}${result.ok || !result.detail ? '' : ` — ${result.detail}`}`);
}
const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} vérifications réussies.`);
process.exit(passed === results.length ? 0 : 1);
