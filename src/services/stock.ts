/**
 * Service client — stock, reçus, dépenses, rapports et comptes.
 *
 * Tout passe par l'adaptateur `api()` : la même interface fonctionne avec le
 * serveur Node (`/api/admin/...`) et avec un site statique (fonctions
 * PostgreSQL `admin_*`). Les écritures exigent toujours le jeton admin.
 */
import { api, readApiError } from './backend';
import type { StockMoveType, StockOverview, Receipt, ReceiptLine } from '../types/stock';
import type {
  AdminAccount,
  AdminIdentity,
  Expense,
  FinanceOverview,
  SalesStats,
  VerifiedReceipt,
} from '../types/reports';

const TOKEN_KEY = 'alffa_niger_admin_token';

export function adminToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

function authHeaders(): Record<string, string> {
  const token = adminToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function readJson<T>(res: any, fallback: string): Promise<T> {
  if (!res.ok) {
    throw new Error(await readApiError(res, fallback));
  }
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(fallback);
  }
}

const range = (from?: number, to?: number) => {
  const params = new URLSearchParams();
  if (from) params.set('from', String(from));
  if (to) params.set('to', String(to));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
};

// ---------------------------------------------------------------------------
// Stock
// ---------------------------------------------------------------------------
export async function fetchStockOverview(): Promise<StockOverview> {
  const res = await api('/api/admin/stock', { headers: authHeaders() });
  const data = await readJson<any>(res, 'Chargement du stock impossible.');
  return {
    items: Array.isArray(data.items) ? data.items : [],
    movements: Array.isArray(data.movements) ? data.movements : [],
    totals: data.totals || {
      lines: 0,
      quantity: 0,
      costValue: 0,
      saleValue: 0,
      alertCount: 0,
      outCount: 0,
    },
  };
}

export interface MovementPayload {
  productId: string;
  type: StockMoveType;
  quantity: number;
  unitCost?: number | null;
  costPrice?: number | null;
  alertThreshold?: number | null;
  reason?: string;
  note?: string;
}

export async function moveStock(
  payload: MovementPayload
): Promise<{ productId: string; quantity: number; delta: number; alertThreshold: number }> {
  const res = await api('/api/admin/stock/move', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return readJson(res, 'Mouvement de stock refusé.');
}

/** Inventaire : la quantité saisie devient la quantité réelle. */
export async function setStockQuantity(
  productId: string,
  quantity: number,
  extra?: { costPrice?: number | null; alertThreshold?: number | null }
): Promise<void> {
  const res = await api('/api/admin/stock/set', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ productId, quantity, ...extra }),
  });
  await readJson(res, 'Mise à jour du stock impossible.');
}

// ---------------------------------------------------------------------------
// Reçus
// ---------------------------------------------------------------------------
export async function fetchReceipts(): Promise<Receipt[]> {
  const res = await api('/api/admin/receipts', { headers: authHeaders() });
  const data = await readJson<any>(res, 'Chargement des reçus impossible.');
  return Array.isArray(data.receipts) ? data.receipts : [];
}

export interface ReceiptPayload {
  clientName: string;
  clientPhone: string;
  items: ReceiptLine[];
  discount: number;
  paymentMethod: Receipt['paymentMethod'];
  amountPaid: number;
  note: string;
  affectStock: boolean;
  author?: string;
}

export async function createReceipt(payload: ReceiptPayload): Promise<Receipt> {
  const res = await api('/api/admin/receipts', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await readJson<any>(res, 'Création du reçu impossible.');
  return data.receipt as Receipt;
}

/** Annulation : le reçu reste dans l'historique et le stock est restitué. */
export async function voidReceipt(id: string): Promise<Receipt> {
  const res = await api(`/api/admin/receipts/${encodeURIComponent(id)}/void`, {
    method: 'POST',
    headers: authHeaders(),
  });
  const data = await readJson<any>(res, 'Annulation impossible.');
  return data.receipt as Receipt;
}

/** Vérification publique d'un reçu (aucune authentification). */
export async function verifyReceipt(code: string): Promise<VerifiedReceipt> {
  // Le code est saisi à la main sur un clavier de téléphone : on ignore la
  // casse et les espaces avant de l'envoyer.
  const clean = String(code || '').trim().toUpperCase();
  const res = await api('/api/public/verify-receipt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: clean }),
  });
  const data = await readJson<any>(res, 'Vérification impossible pour le moment.');
  return data as VerifiedReceipt;
}

// ---------------------------------------------------------------------------
// Dépenses
// ---------------------------------------------------------------------------
export async function fetchExpenses(from?: number, to?: number): Promise<Expense[]> {
  const res = await api(`/api/admin/expenses${range(from, to)}`, { headers: authHeaders() });
  const data = await readJson<any>(res, 'Chargement des dépenses impossible.');
  return Array.isArray(data.expenses) ? data.expenses : [];
}

export async function saveExpense(expense: Partial<Expense> & { label: string; amount: number }): Promise<Expense> {
  const res = await api('/api/admin/expenses', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(expense),
  });
  const data = await readJson<any>(res, 'Enregistrement de la dépense impossible.');
  return data.expense as Expense;
}

export async function deleteExpense(id: string): Promise<void> {
  const res = await api(`/api/admin/expenses/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  await readJson(res, 'Suppression impossible.');
}

// ---------------------------------------------------------------------------
// Rapports
// ---------------------------------------------------------------------------
export async function fetchSalesStats(from?: number, to?: number): Promise<SalesStats> {
  const res = await api(`/api/admin/reports/stats${range(from, to)}`, { headers: authHeaders() });
  return readJson<SalesStats>(res, 'Chargement des statistiques impossible.');
}

export async function fetchFinance(from?: number, to?: number): Promise<FinanceOverview> {
  const res = await api(`/api/admin/reports/finance${range(from, to)}`, { headers: authHeaders() });
  return readJson<FinanceOverview>(res, 'Chargement des finances impossible.');
}

/** Sauvegarde complète, renvoyée en JSON téléchargeable. */
export async function exportAll(): Promise<any> {
  const res = await api('/api/admin/export', { headers: authHeaders() });
  return readJson<any>(res, 'Export impossible.');
}

// ---------------------------------------------------------------------------
// Comptes et rôle
// ---------------------------------------------------------------------------
export async function fetchIdentity(): Promise<AdminIdentity | null> {
  try {
    const res = await api('/api/admin/me', { headers: authHeaders() });
    if (!res.ok) return null;
    const data = await readJson<AdminIdentity>(res, 'Rôle inconnu.');
    return data?.role ? data : null;
  } catch {
    return null;
  }
}

export async function fetchAccounts(): Promise<AdminAccount[]> {
  const res = await api('/api/admin/accounts', { headers: authHeaders() });
  const data = await readJson<any>(res, 'Chargement de l’équipe impossible.');
  return Array.isArray(data.accounts) ? data.accounts : [];
}

export async function saveAccount(
  account: Partial<AdminAccount> & { username: string; role: string; password?: string }
): Promise<AdminAccount> {
  const res = await api('/api/admin/accounts', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(account),
  });
  const data = await readJson<any>(res, 'Enregistrement du compte impossible.');
  return data.account as AdminAccount;
}

export async function deleteAccount(id: string): Promise<void> {
  const res = await api(`/api/admin/accounts/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  await readJson(res, 'Suppression du compte impossible.');
}

// ---------------------------------------------------------------------------
// Sauvegarde automatique
// ---------------------------------------------------------------------------
export interface BackupEntry {
  day: string;
  byte_size?: number;
  bytes?: number;
  origin?: string;
  created_at?: string;
}

export async function fetchBackups(): Promise<{ backups: BackupEntry[]; today: string }> {
  const res = await api('/api/admin/backups', { headers: authHeaders() });
  const data = await readJson<any>(res, 'Chargement des sauvegardes impossible.');
  return {
    backups: Array.isArray(data.backups) ? data.backups : [],
    today: data.today || new Date().toISOString().slice(0, 10),
  };
}

export async function runBackup(): Promise<{ day?: string; bytes?: number; stored?: number }> {
  const res = await api('/api/admin/backups', { method: 'POST', headers: authHeaders() });
  return readJson<any>(res, 'Sauvegarde impossible.');
}

/** Contenu complet d'une sauvegarde (téléchargement). */
export async function fetchBackup(day: string): Promise<any> {
  const res = await api(`/api/admin/backups/${encodeURIComponent(day)}`, { headers: authHeaders() });
  return readJson<any>(res, 'Téléchargement impossible.');
}
