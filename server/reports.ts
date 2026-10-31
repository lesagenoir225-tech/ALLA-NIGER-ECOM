/**
 * Dépenses, rapports et sauvegarde — implémentation pour l'hébergement **Node**.
 *
 * Sur un site statique (LWS), les mêmes calculs sont faits par les fonctions
 * PostgreSQL `admin_sales_stats`, `admin_finance_overview`,
 * `admin_list_expenses`… Les formules sont identiques des deux côtés :
 *
 *   chiffre d'affaires = somme des reçus non annulés
 *   coût des marchandises vendues = prix d'achat × quantités vendues
 *   marge brute = chiffre d'affaires − coût des marchandises
 *   bénéfice net = marge brute − dépenses
 */
import fs from 'fs';
import path from 'path';
import type { Product } from '../src/types';
import type { FinanceOverview, Expense, ExpenseCategory, SalesStats } from '../src/types/reports';
import { readStockFile, readReceiptsFile } from './stock';

const DATA_DIR = path.resolve('data');
const EXPENSES_FILE = path.join(DATA_DIR, 'expenses.json');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');

interface ExpenseFile {
  version: number;
  expenses: Expense[];
}

function readJson<T>(file: string, fallback: T): T {
  try {
    if (!fs.existsSync(file)) return fallback;
    const parsed = JSON.parse(fs.readFileSync(file, 'utf-8'));
    return parsed && typeof parsed === 'object' ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(file: string, value: unknown): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const temp = `${file}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(value, null, 2), 'utf-8');
  fs.renameSync(temp, file);
}

function readExpenseFile(): ExpenseFile {
  const file = readJson<ExpenseFile>(EXPENSES_FILE, { version: 1, expenses: [] });
  return { version: 1, expenses: Array.isArray(file.expenses) ? file.expenses : [] };
}

export function listExpenses(from?: number, to?: number): Expense[] {
  const fromMs = from ?? Date.now() - 90 * 24 * 3600 * 1000;
  const toMs = to ?? Date.now();
  return readExpenseFile()
    .expenses.filter((e) => e.spentAt >= fromMs && e.spentAt <= toMs)
    .sort((a, b) => b.spentAt - a.spentAt);
}

export interface ExpenseInput {
  id?: string;
  label: string;
  category?: ExpenseCategory;
  amount: number;
  spentAt?: number;
  note?: string;
  author?: string;
}

export function saveExpense(input: ExpenseInput): Expense {
  const label = String(input.label || '').trim();
  const amount = Number(input.amount);
  if (!label) throw new Error('Libellé obligatoire.');
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Le montant doit être supérieur à zéro.');
  }

  const file = readExpenseFile();
  const existing = input.id ? file.expenses.find((e) => e.id === input.id) : undefined;

  if (existing) {
    existing.label = label;
    existing.category = input.category || existing.category;
    existing.amount = amount;
    existing.spentAt = input.spentAt ?? existing.spentAt;
    existing.note = input.note ?? existing.note;
    writeJson(EXPENSES_FILE, file);
    return existing;
  }

  const expense: Expense = {
    id: input.id || `dep-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label,
    category: input.category || 'autre',
    amount,
    spentAt: input.spentAt ?? Date.now(),
    note: input.note || '',
    author: input.author || '',
  };
  if (file.expenses.some((e) => e.id === expense.id)) {
    throw new Error('Cette dépense existe déjà.');
  }
  file.expenses.push(expense);
  writeJson(EXPENSES_FILE, file);
  return expense;
}

export function deleteExpense(id: string): void {
  const file = readExpenseFile();
  file.expenses = file.expenses.filter((e) => e.id !== id);
  writeJson(EXPENSES_FILE, file);
}

// ---------------------------------------------------------------------------
// Rapports
// ---------------------------------------------------------------------------
const DAY = 24 * 3600 * 1000;

export function buildSalesStats(from?: number, to?: number): SalesStats {
  const fromMs = from ?? Date.now() - 30 * DAY;
  const toMs = to ?? Date.now();
  const receipts = readReceiptsFile().receipts.filter(
    (r) => r.status !== 'annule' && r.createdAt >= fromMs && r.createdAt <= toMs
  );

  const revenue = receipts.reduce((sum, r) => sum + r.total, 0);
  const paid = receipts.reduce((sum, r) => sum + r.amountPaid, 0);
  const receivable = receipts.reduce((sum, r) => sum + Math.max(0, r.total - r.amountPaid), 0);
  const discounts = receipts.reduce((sum, r) => sum + r.discount, 0);

  const dailyMap = new Map<string, { revenue: number; count: number }>();
  for (const receipt of receipts) {
    const day = new Date(receipt.createdAt).toISOString().slice(0, 10);
    const entry = dailyMap.get(day) || { revenue: 0, count: 0 };
    entry.revenue += receipt.total;
    entry.count += 1;
    dailyMap.set(day, entry);
  }

  const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();
  for (const receipt of receipts) {
    for (const line of receipt.items || []) {
      const key = line.productId || line.name;
      const entry = productMap.get(key) || { name: line.name, quantity: 0, revenue: 0 };
      entry.quantity += line.quantity;
      entry.revenue += line.total;
      productMap.set(key, entry);
    }
  }

  const paymentMap = new Map<string, { revenue: number; count: number }>();
  for (const receipt of receipts) {
    const entry = paymentMap.get(receipt.paymentMethod) || { revenue: 0, count: 0 };
    entry.revenue += receipt.total;
    entry.count += 1;
    paymentMap.set(receipt.paymentMethod, entry);
  }

  const clientMap = new Map<string, { revenue: number; count: number }>();
  for (const receipt of receipts) {
    const name = receipt.clientName?.trim() || 'Client de passage';
    const entry = clientMap.get(name) || { revenue: 0, count: 0 };
    entry.revenue += receipt.total;
    entry.count += 1;
    clientMap.set(name, entry);
  }

  return {
    from: fromMs,
    to: toMs,
    kpis: {
      revenue,
      receipts: receipts.length,
      paid,
      receivable,
      discounts,
      avgTicket: receipts.length ? Math.round(revenue / receipts.length) : 0,
    },
    daily: [...dailyMap.entries()]
      .map(([date, value]) => ({ date, ...value }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    topProducts: [...productMap.entries()]
      .map(([productId, value]) => ({ productId, ...value }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10),
    byPayment: [...paymentMap.entries()]
      .map(([method, value]) => ({ method, ...value }))
      .sort((a, b) => b.revenue - a.revenue),
    topClients: [...clientMap.entries()]
      .map(([name, value]) => ({ name, ...value }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5),
  };
}

export function buildFinanceOverview(_products: Product[], from?: number, to?: number): FinanceOverview {
  const fromMs = from ?? Date.now() - 30 * DAY;
  const toMs = to ?? Date.now();

  const stats = buildSalesStats(fromMs, toMs);
  const stock = readStockFile();

  // Coût des marchandises vendues : mouvements « vente » de la période.
  const cogs = stock.movements
    .filter((m) => m.type === 'vente' && m.createdAt >= fromMs && m.createdAt <= toMs)
    .reduce((sum, m) => {
      const unitCost = m.unitCost ?? stock.items[m.productId]?.costPrice ?? 0;
      return sum + Math.abs(m.quantity) * unitCost;
    }, 0);

  const expenses = listExpenses(fromMs, toMs);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const byCategory = new Map<string, number>();
  for (const expense of expenses) {
    byCategory.set(expense.category, (byCategory.get(expense.category) || 0) + expense.amount);
  }

  return {
    from: fromMs,
    to: toMs,
    revenue: stats.kpis.revenue,
    cogs,
    grossMargin: stats.kpis.revenue - cogs,
    expenses: totalExpenses,
    netProfit: stats.kpis.revenue - cogs - totalExpenses,
    receivable: stats.kpis.receivable,
    expensesByCategory: [...byCategory.entries()]
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total),
  };
}

/** Sauvegarde complète de l'exploitation, en JSON. */
export function buildExport(database: { settings: unknown; products: unknown; brands: unknown }) {
  return {
    exportedAt: new Date().toISOString(),
    settings: database.settings,
    products: database.products,
    brands: database.brands,
    stock: readStockFile().items,
    movements: readStockFile().movements.slice(0, 2000),
    receipts: readReceiptsFile().receipts,
    expenses: readExpenseFile().expenses,
  };
}

// ---------------------------------------------------------------------------
// Sauvegarde automatique (hébergement Node)
// ---------------------------------------------------------------------------
const BACKUP_RETENTION_DAYS = 90;

function backupDay(ms = Date.now()): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Une copie par jour, écrasée si elle existe déjà. */
export function writeDailyBackup(payload: unknown): { day: string; bytes: number } {
  if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  const day = backupDay();
  const text = JSON.stringify(payload, null, 2);
  fs.writeFileSync(path.join(BACKUPS_DIR, `${day}.json`), text, 'utf-8');

  // Rétention : 90 jours.
  const limit = Date.now() - BACKUP_RETENTION_DAYS * 24 * 3600 * 1000;
  for (const file of fs.readdirSync(BACKUPS_DIR)) {
    const match = /^(\d{4}-\d{2}-\d{2})\.json$/.exec(file);
    if (!match) continue;
    if (new Date(`${match[1]}T00:00:00Z`).getTime() < limit) {
      fs.unlinkSync(path.join(BACKUPS_DIR, file));
    }
  }

  return { day, bytes: Buffer.byteLength(text, 'utf-8') };
}

export function listBackups(): { day: string; bytes: number }[] {
  if (!fs.existsSync(BACKUPS_DIR)) return [];
  return fs
    .readdirSync(BACKUPS_DIR)
    .map((file) => {
      const match = /^(\d{4}-\d{2}-\d{2})\.json$/.exec(file);
      if (!match) return null;
      const stat = fs.statSync(path.join(BACKUPS_DIR, file));
      return { day: match[1], bytes: stat.size };
    })
    .filter((row): row is { day: string; bytes: number } => Boolean(row))
    .sort((a, b) => b.day.localeCompare(a.day));
}

export function readBackup(day: string): unknown | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const file = path.join(BACKUPS_DIR, `${day}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}
