/**
 * Gestion de stock et reçus — types partagés entre l'administration,
 * le serveur Node et l'adaptateur Supabase.
 *
 * Principe : le stock n'est PAS exposé sur le site public. Les quantités,
 * les prix d'achat (confidentiels) et les reçus (données clients) vivent dans
 * des tables dédiées, sans politique de lecture publique.
 */
import type { ShopType } from './index';

/** Nature d'un mouvement de stock. */
export type StockMoveType =
  | 'entree' // réception de marchandise
  | 'sortie' // sortie pour casse, perte, démonstration…
  | 'vente' // sortie liée à un reçu
  | 'retour' // retour client / annulation de reçu
  | 'inventaire' // comptage physique : la quantité devient la valeur saisie
  | 'ajustement'; // correction manuelle (delta signé)

export const STOCK_MOVE_LABELS: Record<StockMoveType, string> = {
  entree: 'Entrée',
  sortie: 'Sortie',
  vente: 'Vente',
  retour: 'Retour',
  inventaire: 'Inventaire',
  ajustement: 'Ajustement',
};

export interface StockItem {
  productId: string;
  shop: ShopType;
  name: string;
  /** Prix de vente unitaire (catalogue). */
  price: number | null;
  /** Prix d'achat unitaire — confidentiel, jamais publié. */
  costPrice: number | null;
  quantity: number;
  /** Seuil d'alerte : à partir de cette quantité, réapprovisionner. */
  alertThreshold: number;
  updatedAt: number;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  shop: ShopType | '';
  type: StockMoveType;
  /** Variation appliquée (négative pour une sortie). */
  quantity: number;
  unitCost: number | null;
  reason?: string;
  note?: string;
  receiptId?: string;
  author?: string;
  createdAt: number;
}

export interface StockTotals {
  /** Nombre de références suivies. */
  lines: number;
  /** Nombre total d'articles physiquement en stock. */
  quantity: number;
  /** Valeur du stock au prix d'achat (immobilisé). */
  costValue: number;
  /** Valeur du stock au prix de vente (chiffre potentiel). */
  saleValue: number;
  /** Références sous le seuil d'alerte (mais encore en stock). */
  alertCount: number;
  /** Références épuisées. */
  outCount: number;
}

export type PaymentMethod = 'espece' | 'mobile_money' | 'virement' | 'credit';

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  espece: 'Espèces',
  mobile_money: 'Mobile money',
  virement: 'Virement',
  credit: 'Crédit (à payer)',
};

export type ReceiptStatus = 'paye' | 'partiel' | 'credit' | 'annule';

export const RECEIPT_STATUS_LABELS: Record<ReceiptStatus, string> = {
  paye: 'Payé',
  partiel: 'Partiellement payé',
  credit: 'Crédit',
  annule: 'Annulé',
};

export interface ReceiptLine {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Receipt {
  id: string;
  /** Numéro imprimé, ex. REC-2026-0001. */
  number: string;
  clientName: string;
  clientPhone: string;
  items: ReceiptLine[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  changeDue: number;
  note: string;
  status: ReceiptStatus;
  /** Vrai si les quantités ont été déduites du stock. */
  affectStock: boolean;
  author: string;
  createdAt: number;
  updatedAt: number;
}

export interface StockOverview {
  items: StockItem[];
  movements: StockMovement[];
  totals: StockTotals;
}

/** Conversion d'un montant FCFA en lettres (pour les reçus). */
export function amountInWords(amount: number): string {
  const whole = Math.max(0, Math.round(amount));
  if (whole === 0) return 'zéro franc CFA';
  return `${numberToFrenchWords(whole)} franc${whole > 1 ? 's' : ''} CFA`;
}

const UNITS = [
  'zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
  'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept',
  'dix-huit', 'dix-neuf',
];
const TENS = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

/** Écriture d'un entier en toutes lettres (français, usage commercial). */
export function numberToFrenchWords(value: number): string {
  const n = Math.floor(Math.abs(value));
  if (n < 20) return UNITS[n];
  if (n < 100) {
    const ten = Math.floor(n / 10);
    const unit = n % 10;
    if (ten === 7 || ten === 9) {
      // 71 = soixante-et-onze, 91 = quatre-vingt-onze
      const base = ten === 7 ? 'soixante' : 'quatre-vingt';
      const rest = n - (ten === 7 ? 60 : 80);
      // 71 → soixante-et-onze, mais 91 → quatre-vingt-onze (pas de « et »).
      if (rest === 11 && ten === 7) return `${base}-et-onze`;
      return `${base}-${UNITS[rest]}`;
    }
    if (unit === 0) return TENS[ten] + (ten === 8 ? 's' : '');
    if (unit === 1 && (ten === 2 || ten === 3 || ten === 4 || ten === 5 || ten === 6)) {
      return `${TENS[ten]}-et-un`;
    }
    return `${TENS[ten]}-${UNITS[unit]}`;
  }
  if (n < 1000) {
    const hundreds = Math.floor(n / 100);
    const rest = n % 100;
    const head = hundreds === 1 ? 'cent' : `${UNITS[hundreds]} cent${rest === 0 ? 's' : ''}`;
    return rest === 0 ? head : `${head} ${numberToFrenchWords(rest)}`;
  }
  if (n < 1_000_000) {
    const thousands = Math.floor(n / 1000);
    const rest = n % 1000;
    const head = thousands === 1 ? 'mille' : `${numberToFrenchWords(thousands)} mille`;
    return rest === 0 ? head : `${head} ${numberToFrenchWords(rest)}`;
  }
  if (n < 1_000_000_000) {
    const millions = Math.floor(n / 1_000_000);
    const rest = n % 1_000_000;
    const head = millions === 1 ? 'un million' : `${numberToFrenchWords(millions)} millions`;
    return rest === 0 ? head : `${head} ${numberToFrenchWords(rest)}`;
  }
  const billions = Math.floor(n / 1_000_000_000);
  const rest = n % 1_000_000_000;
  const head = billions === 1 ? 'un milliard' : `${numberToFrenchWords(billions)} milliards`;
  return rest === 0 ? head : `${head} ${numberToFrenchWords(rest)}`;
}
