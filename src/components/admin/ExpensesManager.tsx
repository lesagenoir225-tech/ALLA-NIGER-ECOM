/**
 * Administration — DÉPENSES.
 *
 * Sans les dépenses, le « bénéfice » affiché est faux : le commerçant oublie
 * le transport, le loyer, les salaires, les taxes. Chaque dépense enregistrée
 * ici est déduite automatiquement du bénéfice réel.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Trash2, Save, X, AlertCircle, Wallet } from 'lucide-react';
import { formatPrice } from '../../utils/format';
import { deleteExpense, fetchExpenses, saveExpense } from '../../services/stock';
import {
  EXPENSE_CATEGORY_LABELS,
  type Expense,
  type ExpenseCategory,
} from '../../types/reports';

const money = (value: number | null | undefined) => formatPrice(value ?? 0) || '0 FCFA';

const dateLabel = (ms: number) =>
  new Date(ms).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

const CATEGORIES = Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[];

type Form = {
  id?: string;
  label: string;
  category: ExpenseCategory;
  amount: string;
  spentAt: string; // aaaa-mm-jj
  note: string;
};

const emptyForm = (): Form => ({
  label: '',
  category: 'achat',
  amount: '',
  spentAt: isoDay(Date.now()),
  note: '',
});

export function ExpensesManager() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<Form | null>(null);
  const [filterCategory, setFilterCategory] = useState<'toutes' | ExpenseCategory>('toutes');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      // 12 derniers mois : assez pour comparer les saisons.
      const to = Date.now();
      const from = to - 365 * 24 * 3600 * 1000;
      setExpenses(await fetchExpenses(from, to));
    } catch (err: any) {
      setError(err?.message || 'Impossible de charger les dépenses.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () => (filterCategory === 'toutes' ? expenses : expenses.filter((e) => e.category === filterCategory)),
    [expenses, filterCategory]
  );

  const total = useMemo(() => filtered.reduce((sum, e) => sum + e.amount, 0), [filtered]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form) return;
    const amount = Number(form.amount);
    if (!form.label.trim()) {
      setError('Indiquez un libellé (ex. « Transport marchandise Niamey »).');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Le montant doit être supérieur à zéro.');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      const saved = await saveExpense({
        id: form.id,
        label: form.label.trim(),
        category: form.category,
        amount,
        spentAt: new Date(`${form.spentAt}T12:00:00`).getTime(),
        note: form.note.trim(),
      });
      setExpenses((prev) => {
        const exists = prev.some((e) => e.id === saved.id);
        const next = exists ? prev.map((e) => (e.id === saved.id ? saved : e)) : [...prev, saved];
        return next.sort((a, b) => b.spentAt - a.spentAt);
      });
      setForm(null);
    } catch (err: any) {
      setError(err?.message || 'Enregistrement impossible.');
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (expense: Expense) => {
    if (!window.confirm(`Supprimer la dépense « ${expense.label} » (${money(expense.amount)}) ?`)) return;
    try {
      await deleteExpense(expense.id);
      setExpenses((prev) => prev.filter((e) => e.id !== expense.id));
    } catch (err: any) {
      setError(err?.message || 'Suppression impossible.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold uppercase text-[var(--night)]">Dépenses</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Achats, transport, loyer, salaires… Tout ce qui sort de la caisse. Le bénéfice réel se
            calcule automatiquement dans l’onglet « Statistiques ».
          </p>
        </div>
        <button
          type="button"
          onClick={() => setForm(emptyForm())}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--night)] px-4 text-sm font-bold text-white shadow-md hover:bg-[var(--night-2)]"
        >
          <Plus className="h-4 w-4 text-[var(--cyan)]" /> Nouvelle dépense
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Formulaire */}
      {form && (
        <form
          onSubmit={submit}
          className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--night)]">
              {form.id ? 'Modifier la dépense' : 'Enregistrer une dépense'}
            </h3>
            <button
              type="button"
              onClick={() => setForm(null)}
              className="rounded-lg p-2 text-[var(--muted)] hover:bg-slate-100"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="sm:col-span-2">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                Libellé
              </span>
              <input
                required
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="Ex. Transport marchandise Niamey"
                className="w-full min-h-11 rounded-xl border border-[var(--line)] px-3 text-sm outline-none focus:border-[var(--cyan)]"
              />
            </label>

            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                Catégorie
              </span>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}
                className="w-full min-h-11 rounded-xl border border-[var(--line)] px-3 text-sm font-semibold outline-none"
              >
                {CATEGORIES.map((key) => (
                  <option key={key} value={key}>
                    {EXPENSE_CATEGORY_LABELS[key]}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                Montant (FCFA)
              </span>
              <input
                required
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="25000"
                className="w-full min-h-11 rounded-xl border border-[var(--line)] px-3 text-sm outline-none focus:border-[var(--cyan)]"
              />
            </label>

            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                Date
              </span>
              <input
                type="date"
                value={form.spentAt}
                onChange={(e) => setForm({ ...form, spentAt: e.target.value })}
                className="w-full min-h-11 rounded-xl border border-[var(--line)] px-3 text-sm outline-none focus:border-[var(--cyan)]"
              />
            </label>

            <label className="sm:col-span-2 lg:col-span-3">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                Note (facultatif)
              </span>
              <input
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Fournisseur, référence de facture…"
                className="w-full min-h-11 rounded-xl border border-[var(--line)] px-3 text-sm outline-none focus:border-[var(--cyan)]"
              />
            </label>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setForm(null)}
              className="min-h-11 rounded-xl border border-[var(--line)] px-4 text-sm font-semibold text-[var(--night)] hover:bg-slate-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--night)] px-4 text-sm font-bold text-white disabled:opacity-50"
            >
              <Save className="h-4 w-4 text-[var(--cyan)]" />
              {isSaving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      )}

      {/* Filtre */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--line)] bg-white p-4">
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value as any)}
          className="min-h-11 rounded-xl border border-[var(--line)] px-3 text-sm font-semibold outline-none"
        >
          <option value="toutes">Toutes les catégories</option>
          {CATEGORIES.map((key) => (
            <option key={key} value={key}>
              {EXPENSE_CATEGORY_LABELS[key]}
            </option>
          ))}
        </select>
        <span className="ml-auto flex items-center gap-2 text-sm font-bold text-[var(--night)]">
          <Wallet className="h-4 w-4 text-[var(--muted)]" /> Total : {money(total)}
        </span>
      </div>

      {/* Liste */}
      <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm">
        {isLoading ? (
          <p className="flex items-center gap-2 p-6 text-sm text-[var(--muted)]">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement des dépenses…
          </p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-sm text-[var(--muted)]">
            Aucune dépense enregistrée sur les 12 derniers mois. Commencez par le transport et le
            loyer : ce sont les deux postes que l’on oublie le plus souvent.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--mist)] text-xs uppercase tracking-wider text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 font-bold">Date</th>
                  <th className="px-4 py-3 font-bold">Libellé</th>
                  <th className="px-4 py-3 font-bold">Catégorie</th>
                  <th className="px-4 py-3 text-right font-bold">Montant</th>
                  <th className="px-4 py-3 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((expense) => (
                  <tr key={expense.id} className="border-t border-[var(--line)]">
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--muted)]">
                      {dateLabel(expense.spentAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-[var(--night)]">{expense.label}</span>
                      {expense.note && (
                        <span className="block text-xs text-[var(--muted)]">{expense.note}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-[var(--mist)] px-2 py-1 text-xs font-semibold text-[var(--night)]">
                        {EXPENSE_CATEGORY_LABELS[expense.category] || expense.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-rose-600">
                      −{money(expense.amount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setForm({
                              id: expense.id,
                              label: expense.label,
                              category: expense.category,
                              amount: String(expense.amount),
                              spentAt: isoDay(expense.spentAt),
                              note: expense.note || '',
                            })
                          }
                          className="rounded-lg p-2 text-[var(--muted)] hover:bg-slate-100 hover:text-[var(--night)]"
                          aria-label="Modifier"
                        >
                          <Save className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void remove(expense)}
                          className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"
                          aria-label="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
