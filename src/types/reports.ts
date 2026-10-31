/**
 * Rapports, dépenses et comptes — types partagés.
 *
 * Tous les montants sont en FCFA. Les dates échangées avec l'interface sont
 * des millisecondes (comme le reste du projet).
 */

/** Catégories de dépense proposées dans l'interface. */
export type ExpenseCategory =
  | 'achat' // achat de marchandise
  | 'transport' // transport, carburant, déplacements
  | 'loyer' // loyer, charges de la boutique
  | 'salaire' // salaires et primes
  | 'communication' // téléphone, internet, publicité
  | 'taxes' // impôts, taxes, patentes
  | 'emballage' // sacs, emballages
  | 'autre';

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  achat: 'Achat de marchandise',
  transport: 'Transport',
  loyer: 'Loyer & charges',
  salaire: 'Salaires',
  communication: 'Communication & publicité',
  taxes: 'Impôts & taxes',
  emballage: 'Emballage',
  autre: 'Autre',
};

export interface Expense {
  id: string;
  label: string;
  category: ExpenseCategory;
  amount: number;
  spentAt: number;
  note: string;
  author: string;
}

export interface SalesKpis {
  revenue: number;
  receipts: number;
  paid: number;
  receivable: number;
  discounts: number;
  avgTicket: number;
}

export interface SalesStats {
  from: number;
  to: number;
  kpis: SalesKpis;
  daily: { date: string; revenue: number; count: number }[];
  topProducts: { productId: string; name: string; quantity: number; revenue: number }[];
  byPayment: { method: string; revenue: number; count: number }[];
  topClients: { name: string; revenue: number; count: number }[];
}

export interface FinanceOverview {
  from: number;
  to: number;
  revenue: number;
  /** Coût des marchandises vendues (prix d'achat × quantités vendues). */
  cogs: number;
  grossMargin: number;
  expenses: number;
  netProfit: number;
  receivable: number;
  expensesByCategory: { category: string; total: number }[];
}

/** Rôle d'un compte : le gérant voit tout, le vendeur encaisse. */
export type AdminRole = 'gerant' | 'vendeur';

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  gerant: 'Gérant',
  vendeur: 'Vendeur',
};

export interface AdminAccount {
  id: string;
  username: string;
  displayName: string;
  role: AdminRole;
  active: boolean;
  createdAt?: string;
}

export interface AdminIdentity {
  role: AdminRole;
  username: string;
  displayName: string;
}

/** Résultat public de la vérification d'un reçu. */
export interface VerifiedReceipt {
  found: boolean;
  number?: string;
  issuedAt?: number;
  total?: number;
  status?: string;
  clientInitials?: string;
  items?: { name: string; quantity: number; total: number }[];
}

/**
 * Onglets réservés au gérant.
 *
 * Le vendeur ne voit que : tableau de bord, stock (consultation + ventes,
 * retours, sorties) et reçus. Ces mêmes restrictions sont appliquées côté
 * base de données : masquer un onglet ne protège rien à lui seul.
 */
export const MANAGER_ONLY_TABS = [
  'electronique',
  'textile',
  'featured',
  'brands',
  'experience',
  'settings',
  'media',
  'expenses',
  'reports',
  'team',
] as const;
