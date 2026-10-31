/**
 * Gestion de stock et reçus — implémentation pour l'hébergement **Node**.
 *
 * Sur un site statique (LWS), les mêmes opérations passent par les fonctions
 * PostgreSQL `admin_stock_*` / `admin_*_receipt` (voir supabase/admin-rpc.sql).
 * Ici, tout est stocké dans `data/` :
 *   • `data/stock.json`    : quantités, seuils, prix d'achat + journal
 *   • `data/receipts.json` : reçus émis
 *
 * Les règles métier sont volontairement identiques des deux côtés :
 *   – montants recalculés à partir des lignes (jamais ceux du navigateur) ;
 *   – stock jamais négatif ;
 *   – un reçu ne se modifie pas : il s'annule et les quantités reviennent.
 */
import fs from 'fs';
import path from 'path';
import type { Product } from '../src/types';
import type {
  Receipt,
  ReceiptLine,
  StockItem,
  StockMovement,
  StockMoveType,
  StockOverview,
  StockTotals,
} from '../src/types/stock';

const DATA_DIR = path.resolve('data');
const STOCK_FILE = path.join(DATA_DIR, 'stock.json');
const RECEIPTS_FILE = path.join(DATA_DIR, 'receipts.json');

interface StockRecord {
  quantity: number;
  alertThreshold: number;
  costPrice: number | null;
  updatedAt: number;
}

interface StockFile {
  version: number;
  items: Record<string, StockRecord>;
  movements: StockMovement[];
}

interface ReceiptFile {
  version: number;
  receipts: Receipt[];
}

function readJson<T>(file: string, fallback: T): T {
  try {
    if (!fs.existsSync(file)) return fallback;
    const parsed = JSON.parse(fs.readFileSync(file, 'utf-8'));
    return parsed && typeof parsed === 'object' ? (parsed as T) : fallback;
  } catch (err) {
    console.error(`[stock] lecture impossible (${path.basename(file)}) :`, err);
    return fallback;
  }
}

function writeJson(file: string, value: unknown): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const temp = `${file}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(value, null, 2), 'utf-8');
  fs.renameSync(temp, file);
}

export function readStockFile(): StockFile {
  const file = readJson<StockFile>(STOCK_FILE, { version: 1, items: {}, movements: [] });
  return {
    version: 1,
    items: file.items && typeof file.items === 'object' ? file.items : {},
    movements: Array.isArray(file.movements) ? file.movements : [],
  };
}

function saveStockFile(file: StockFile): void {
  // Le journal est borné : au-delà de 2 000 lignes, les plus anciennes sortent
  // (les quantités, elles, restent exactes).
  const movements = [...file.movements]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 2000);
  writeJson(STOCK_FILE, { version: 1, items: file.items, movements });
}

export function readReceiptsFile(): ReceiptFile {
  const file = readJson<ReceiptFile>(RECEIPTS_FILE, { version: 1, receipts: [] });
  return { version: 1, receipts: Array.isArray(file.receipts) ? file.receipts : [] };
}

function saveReceiptsFile(file: ReceiptFile): void {
  writeJson(RECEIPTS_FILE, { version: 1, receipts: file.receipts });
}

function record(productId: string, items: Record<string, StockRecord>): StockRecord {
  if (!items[productId]) {
    items[productId] = { quantity: 0, alertThreshold: 3, costPrice: null, updatedAt: 0 };
  }
  return items[productId];
}

/** Vue d'ensemble : une ligne par produit du catalogue (même sans stock). */
export function buildOverview(products: Product[]): StockOverview {
  const file = readStockFile();

  const items: StockItem[] = products.map((p) => {
    const rec = file.items[p.id];
    return {
      productId: p.id,
      shop: p.shop,
      name: p.name,
      price: p.price ?? null,
      costPrice: rec?.costPrice ?? null,
      quantity: rec?.quantity ?? 0,
      alertThreshold: rec?.alertThreshold ?? 3,
      updatedAt: rec?.updatedAt ?? 0,
    };
  });

  const totals: StockTotals = {
    lines: items.length,
    quantity: items.reduce((sum, i) => sum + i.quantity, 0),
    costValue: items.reduce((sum, i) => sum + i.quantity * (i.costPrice ?? 0), 0),
    saleValue: items.reduce((sum, i) => sum + i.quantity * (i.price ?? 0), 0),
    alertCount: items.filter((i) => i.quantity > 0 && i.quantity <= i.alertThreshold).length,
    outCount: items.filter((i) => i.quantity === 0).length,
  };

  const movements = [...file.movements]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 200);

  return { items, movements, totals };
}

export interface MovementInput {
  productId: string;
  type: StockMoveType;
  quantity: number;
  unitCost?: number | null;
  costPrice?: number | null;
  alertThreshold?: number | null;
  reason?: string;
  note?: string;
  receiptId?: string;
  author?: string;
}

/**
 * Applique un mouvement. `quantity` est positive, sauf pour un ajustement
 * (delta signé). Renvoie le stock résultant.
 */
export function applyMovement(
  products: Product[],
  input: MovementInput
): { productId: string; quantity: number; delta: number; alertThreshold: number } {
  const file = readStockFile();
  const product = products.find((p) => p.id === input.productId);
  if (!product) throw new Error('Produit introuvable.');

  const type = input.type;
  if (!['entree', 'sortie', 'vente', 'retour', 'inventaire', 'ajustement'].includes(type)) {
    throw new Error('Type de mouvement inconnu.');
  }
  const qty = Math.trunc(Number(input.quantity));
  if (!Number.isFinite(qty)) throw new Error('Quantité invalide.');
  if (type !== 'ajustement' && qty < 0) throw new Error('La quantité doit être positive.');

  const rec = record(input.productId, file.items);
  const current = rec.quantity;
  let delta: number;
  switch (type) {
    case 'entree':
    case 'retour':
      delta = qty;
      break;
    case 'sortie':
    case 'vente':
      delta = -qty;
      break;
    case 'inventaire':
      delta = qty - current;
      break;
    default:
      delta = qty; // ajustement : delta signé
  }

  const next = Math.max(0, current + delta);
  delta = next - current;

  rec.quantity = next;
  rec.updatedAt = Date.now();
  if (typeof input.costPrice === 'number' && Number.isFinite(input.costPrice)) {
    rec.costPrice = Math.max(0, input.costPrice);
  }
  if (typeof input.alertThreshold === 'number' && Number.isFinite(input.alertThreshold)) {
    rec.alertThreshold = Math.max(0, Math.trunc(input.alertThreshold));
  }

  if (delta !== 0 || type === 'inventaire') {
    file.movements.unshift({
      id: `mv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      productId: input.productId,
      productName: product.name,
      shop: product.shop,
      type,
      quantity: delta,
      unitCost: typeof input.unitCost === 'number' ? input.unitCost : null,
      reason: input.reason ?? '',
      note: input.note ?? '',
      receiptId: input.receiptId,
      author: input.author ?? '',
      createdAt: Date.now(),
    });
  }

  saveStockFile(file);
  return {
    productId: input.productId,
    quantity: next,
    delta,
    alertThreshold: rec.alertThreshold,
  };
}

export function listReceipts(): Receipt[] {
  return [...readReceiptsFile().receipts].sort((a, b) => b.createdAt - a.createdAt);
}

export interface ReceiptInput {
  id?: string;
  clientName?: string;
  clientPhone?: string;
  items: ReceiptLine[];
  discount?: number;
  paymentMethod?: Receipt['paymentMethod'];
  amountPaid?: number;
  note?: string;
  affectStock?: boolean;
  author?: string;
}

/** Numéro séquentiel annuel : REC-2026-0001. */
function nextReceiptNumber(existing: Receipt[]): string {
  const year = String(new Date().getFullYear());
  const prefix = `REC-${year}-`;
  let max = 0;
  for (const receipt of existing) {
    if (receipt.number?.startsWith(prefix)) {
      const seq = Number(receipt.number.slice(prefix.length));
      if (Number.isFinite(seq) && seq > max) max = seq;
    }
  }
  return `${prefix}${String(max + 1).padStart(4, '0')}`;
}

/**
 * Crée un reçu. Les montants sont recalculés ici à partir des lignes :
 * les totaux envoyés par le navigateur sont ignorés.
 */
export function createReceipt(products: Product[], input: ReceiptInput): Receipt {
  const file = readReceiptsFile();

  const items: ReceiptLine[] = (input.items || [])
    .map((line) => {
      const quantity = Math.max(0, Math.trunc(Number(line.quantity) || 0));
      const unitPrice = Math.max(0, Number(line.unitPrice) || 0);
      const product = products.find((p) => p.id === line.productId);
      return {
        productId: line.productId || '',
        name: line.name || product?.name || 'Article',
        quantity,
        unitPrice,
        total: quantity * unitPrice,
      };
    })
    .filter((line) => line.quantity > 0);

  if (items.length === 0) {
    throw new Error('Un reçu doit contenir au moins un article.');
  }

  const subtotal = items.reduce((sum, line) => sum + line.total, 0);
  const discount = Math.min(subtotal, Math.max(0, Number(input.discount) || 0));
  const total = Math.max(0, subtotal - discount);
  const amountPaid = Math.max(0, Number(input.amountPaid) || 0);
  const status: Receipt['status'] =
    amountPaid >= total && total > 0 ? 'paye' : amountPaid > 0 ? 'partiel' : 'credit';

  const now = Date.now();
  const id = input.id || `rec-${now}-${Math.random().toString(36).slice(2, 8)}`;
  if (file.receipts.some((r) => r.id === id)) {
    throw new Error('Ce reçu existe déjà : un reçu ne se modifie pas, il s’annule.');
  }

  const receipt: Receipt = {
    id,
    number: nextReceiptNumber(file.receipts),
    clientName: (input.clientName || '').trim(),
    clientPhone: (input.clientPhone || '').trim(),
    items,
    subtotal,
    discount,
    total,
    paymentMethod: input.paymentMethod || 'espece',
    amountPaid,
    changeDue: Math.max(0, amountPaid - total),
    note: input.note || '',
    status,
    affectStock: input.affectStock !== false,
    author: input.author || '',
    createdAt: now,
    updatedAt: now,
  };

  file.receipts.push(receipt);
  saveReceiptsFile(file);

  if (receipt.affectStock) {
    for (const line of items) {
      if (!line.productId) continue;
      applyMovement(products, {
        productId: line.productId,
        type: 'vente',
        quantity: line.quantity,
        reason: `Reçu ${receipt.number}`,
        receiptId: receipt.id,
        author: receipt.author,
      });
    }
  }

  return receipt;
}

/** Annule un reçu et restitue le stock. */
export function voidReceipt(products: Product[], id: string): Receipt {
  const file = readReceiptsFile();
  const receipt = file.receipts.find((r) => r.id === id);
  if (!receipt) throw new Error('Reçu introuvable.');
  if (receipt.status === 'annule') return receipt;

  if (receipt.affectStock) {
    for (const line of receipt.items) {
      if (!line.productId) continue;
      applyMovement(products, {
        productId: line.productId,
        type: 'retour',
        quantity: line.quantity,
        reason: `Annulation du reçu ${receipt.number}`,
        receiptId: receipt.id,
      });
    }
  }

  receipt.status = 'annule';
  receipt.updatedAt = Date.now();
  saveReceiptsFile(file);
  return receipt;
}

/** Retire les lignes de stock d'un produit supprimé du catalogue. */
export function forgetProduct(productId: string): void {
  const file = readStockFile();
  if (file.items[productId]) {
    delete file.items[productId];
    saveStockFile(file);
  }
}
