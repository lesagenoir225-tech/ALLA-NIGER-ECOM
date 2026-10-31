/**
 * Service client — gestion de stock et reçus.
 *
 * Passe par l'adaptateur `api()` : la même interface fonctionne avec le
 * serveur Node (`/api/admin/...`) et avec un site statique (fonctions
 * PostgreSQL `admin_*`). Les écritures exigent toujours le jeton admin.
 */
import { api, readApiError } from './backend';
import type { StockMoveType, StockOverview, Receipt, ReceiptLine } from '../types/stock';

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

export async function voidReceipt(id: string): Promise<Receipt> {
  const res = await api(`/api/admin/receipts/${encodeURIComponent(id)}/void`, {
    method: 'POST',
    headers: authHeaders(),
  });
  const data = await readJson<any>(res, 'Annulation impossible.');
  return data.receipt as Receipt;
}
