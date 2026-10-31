/**
 * Administration — STATISTIQUES DE VENTES & BÉNÉFICE RÉEL.
 *
 * Répond à trois questions du commerçant :
 *   • combien ai-je vendu aujourd'hui / cette semaine / ce mois ?
 *   • qu'est-ce qui se vend le mieux, et à quel panier moyen ?
 *   • après achats et charges, combien me reste-t-il vraiment ?
 *
 * Les chiffres viennent des reçus (jamais d'une saisie manuelle) : annuler un
 * reçu le retire automatiquement des totaux.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Loader2,
  RefreshCw,
  TrendingUp,
  Wallet,
  Receipt,
  ShoppingBag,
  AlertCircle,
  Printer,
} from 'lucide-react';
import { formatPrice } from '../../utils/format';
import { fetchFinance, fetchSalesStats } from '../../services/stock';
import type { FinanceOverview, SalesStats } from '../../types/reports';
import { EXPENSE_CATEGORY_LABELS, type ExpenseCategory } from '../../types/reports';

const money = (value: number | null | undefined) => formatPrice(value ?? 0) || '0 FCFA';

type Period = 'jour' | 'semaine' | 'mois' | 'annee';

const PERIOD_LABELS: Record<Period, string> = {
  jour: "Aujourd'hui",
  semaine: '7 derniers jours',
  mois: '30 derniers jours',
  annee: 'Année en cours',
};

/** Bornes de la période, en millisecondes (mêmes unités que la base). */
function periodRange(period: Period): { from: number; to: number } {
  const now = new Date();
  const to = now.getTime();
  if (period === 'jour') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { from: start.getTime(), to };
  }
  if (period === 'semaine') {
    return { from: to - 7 * 24 * 3600 * 1000, to };
  }
  if (period === 'mois') {
    return { from: to - 30 * 24 * 3600 * 1000, to };
  }
  return { from: new Date(now.getFullYear(), 0, 1).getTime(), to };
}

const shortDay = (iso: string) => {
  const [, month, day] = iso.split('-');
  return `${day}/${month}`;
};

export function ReportsManager({ canSeeFinance = true }: { canSeeFinance?: boolean }) {
  const [period, setPeriod] = useState<Period>('mois');
  const [stats, setStats] = useState<SalesStats | null>(null);
  const [finance, setFinance] = useState<FinanceOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const range = useMemo(() => periodRange(period), [period]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const nextStats = await fetchSalesStats(range.from, range.to);
      setStats(nextStats);
      if (canSeeFinance) {
        setFinance(await fetchFinance(range.from, range.to));
      }
    } catch (err: any) {
      setError(err?.message || 'Impossible de charger les statistiques.');
    } finally {
      setIsLoading(false);
    }
  }, [range.from, range.to, canSeeFinance]);

  useEffect(() => {
    void load();
  }, [load]);

  const maxDaily = Math.max(1, ...(stats?.daily || []).map((d) => d.revenue));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold uppercase text-[var(--night)]">
            Statistiques de ventes
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Calculées à partir des reçus enregistrés (les reçus annulés sont exclus).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setPeriod(key)}
              className={`min-h-10 rounded-xl px-3 text-xs font-bold transition ${
                period === key
                  ? 'bg-[var(--night)] text-white'
                  : 'border border-[var(--line)] bg-white text-[var(--night)] hover:bg-slate-50'
              }`}
            >
              {PERIOD_LABELS[key]}
            </button>
          ))}
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[var(--line)] bg-white px-3 text-xs font-semibold text-[var(--night)] hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Actualiser
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[var(--line)] bg-white px-3 text-xs font-semibold text-[var(--night)] hover:bg-slate-50"
          >
            <Printer className="h-3.5 w-3.5" /> Imprimer
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <p className="flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-white p-6 text-sm text-[var(--muted)]">
          <Loader2 className="h-4 w-4 animate-spin" /> Calcul des chiffres…
        </p>
      ) : (
        <>
          {/* Indicateurs de vente */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                <TrendingUp className="h-4 w-4" /> Chiffre d’affaires
              </span>
              <p className="mt-2 font-display text-3xl font-bold text-[var(--night)]">
                {money(stats?.kpis.revenue)}
              </p>
              <span className="mt-1 block text-xs text-[var(--muted)]">{PERIOD_LABELS[period]}</span>
            </div>

            <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                <Receipt className="h-4 w-4" /> Nombre de ventes
              </span>
              <p className="mt-2 font-display text-3xl font-bold text-[var(--night)]">
                {stats?.kpis.receipts ?? 0}
              </p>
              <span className="mt-1 block text-xs text-[var(--muted)]">
                remises accordées : {money(stats?.kpis.discounts)}
              </span>
            </div>

            <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                <ShoppingBag className="h-4 w-4" /> Panier moyen
              </span>
              <p className="mt-2 font-display text-3xl font-bold text-[var(--night)]">
                {money(stats?.kpis.avgTicket)}
              </p>
              <span className="mt-1 block text-xs text-[var(--muted)]">par reçu émis</span>
            </div>

            <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                <Wallet className="h-4 w-4" /> Encore à encaisser
              </span>
              <p className="mt-2 font-display text-3xl font-bold text-amber-600">
                {money(stats?.kpis.receivable)}
              </p>
              <span className="mt-1 block text-xs text-[var(--muted)]">
                déjà encaissé : {money(stats?.kpis.paid)}
              </span>
            </div>
          </div>

          {/* Courbe simple : une barre par jour */}
          <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[var(--night)]">
              <BarChart3 className="h-4 w-4" /> Ventes jour par jour
            </h3>
            {(stats?.daily.length ?? 0) === 0 ? (
              <p className="mt-4 text-sm text-[var(--muted)]">
                Aucune vente enregistrée sur cette période. Établissez un reçu dans l’onglet « Reçus »
                pour voir les chiffres apparaître ici.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <div className="flex min-w-full items-end gap-2" style={{ height: 160 }}>
                  {(stats?.daily || []).map((day) => (
                    <div key={day.date} className="flex min-w-[38px] flex-1 flex-col items-center gap-1">
                      <span className="text-[10px] font-semibold text-[var(--muted)]">
                        {Math.round(day.revenue / 1000)}k
                      </span>
                      <div
                        title={`${shortDay(day.date)} : ${money(day.revenue)} (${day.count} reçu(s))`}
                        className="w-full rounded-t-md bg-[var(--cyan-deep)]/80 hover:bg-[var(--cyan-deep)]"
                        style={{ height: Math.max(4, (day.revenue / maxDaily) * 110) }}
                      />
                      <span className="text-[10px] text-[var(--muted)]">{shortDay(day.date)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Top articles & répartition */}
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm">
              <h3 className="border-b border-[var(--line)] px-5 py-3 text-sm font-bold uppercase tracking-wider text-[var(--night)]">
                Meilleures ventes
              </h3>
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--mist)] text-xs uppercase tracking-wider text-[var(--muted)]">
                  <tr>
                    <th className="px-4 py-2 font-bold">Article</th>
                    <th className="px-4 py-2 text-center font-bold">Qté</th>
                    <th className="px-4 py-2 text-right font-bold">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {(stats?.topProducts || []).length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-5 text-[var(--muted)]">
                        Aucun article vendu sur la période.
                      </td>
                    </tr>
                  ) : (
                    (stats?.topProducts || []).map((row) => (
                      <tr key={row.productId} className="border-t border-[var(--line)]">
                        <td className="px-4 py-2 font-semibold text-[var(--night)]">{row.name}</td>
                        <td className="px-4 py-2 text-center">{row.quantity}</td>
                        <td className="px-4 py-2 text-right font-semibold">{money(row.revenue)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm">
              <h3 className="border-b border-[var(--line)] px-5 py-3 text-sm font-bold uppercase tracking-wider text-[var(--night)]">
                Moyens de paiement
              </h3>
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--mist)] text-xs uppercase tracking-wider text-[var(--muted)]">
                  <tr>
                    <th className="px-4 py-2 font-bold">Moyen</th>
                    <th className="px-4 py-2 text-center font-bold">Ventes</th>
                    <th className="px-4 py-2 text-right font-bold">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {(stats?.byPayment || []).length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-5 text-[var(--muted)]">
                        Aucun encaissement sur la période.
                      </td>
                    </tr>
                  ) : (
                    (stats?.byPayment || []).map((row) => (
                      <tr key={row.method} className="border-t border-[var(--line)]">
                        <td className="px-4 py-2 font-semibold capitalize text-[var(--night)]">
                          {row.method}
                        </td>
                        <td className="px-4 py-2 text-center">{row.count}</td>
                        <td className="px-4 py-2 text-right font-semibold">{money(row.revenue)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bénéfice réel */}
          {canSeeFinance && (
            <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--night)]">
                Bénéfice réel — {PERIOD_LABELS[period]}
              </h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-xl bg-[var(--mist)] p-4">
                  <span className="text-[11px] font-bold uppercase text-[var(--muted)]">
                    Chiffre d’affaires
                  </span>
                  <p className="mt-1 font-display text-xl font-bold text-[var(--night)]">
                    {money(finance?.revenue)}
                  </p>
                </div>
                <div className="rounded-xl bg-[var(--mist)] p-4">
                  <span className="text-[11px] font-bold uppercase text-[var(--muted)]">
                    Coût des marchandises
                  </span>
                  <p className="mt-1 font-display text-xl font-bold text-[var(--night)]">
                    {money(finance?.cogs)}
                  </p>
                </div>
                <div className="rounded-xl bg-[var(--mist)] p-4">
                  <span className="text-[11px] font-bold uppercase text-[var(--muted)]">
                    Marge brute
                  </span>
                  <p className="mt-1 font-display text-xl font-bold text-[var(--night)]">
                    {money(finance?.grossMargin)}
                  </p>
                </div>
                <div className="rounded-xl bg-[var(--mist)] p-4">
                  <span className="text-[11px] font-bold uppercase text-[var(--muted)]">
                    Dépenses
                  </span>
                  <p className="mt-1 font-display text-xl font-bold text-rose-600">
                    {money(finance?.expenses)}
                  </p>
                </div>
                <div className="rounded-xl bg-[var(--night)] p-4 text-white">
                  <span className="text-[11px] font-bold uppercase text-white/70">
                    Bénéfice net
                  </span>
                  <p className="mt-1 font-display text-xl font-bold text-[var(--cyan)]">
                    {money(finance?.netProfit)}
                  </p>
                </div>
              </div>

              {(finance?.expensesByCategory.length ?? 0) > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                    Dépenses par catégorie
                  </h4>
                  <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {(finance?.expensesByCategory || []).map((row) => (
                      <li
                        key={row.category}
                        className="flex items-center justify-between rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
                      >
                        <span className="text-[var(--night)]">
                          {EXPENSE_CATEGORY_LABELS[row.category as ExpenseCategory] || row.category}
                        </span>
                        <span className="font-semibold">{money(row.total)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="mt-4 text-xs leading-relaxed text-[var(--muted)]">
                Le coût des marchandises utilise le <strong>prix d’achat</strong> saisi dans l’onglet
                Stock. Tant qu’il n’est pas renseigné, la marge brute affichée est trop flatteuse :
                ouvrez « Stock » puis « Inventaire » pour renseigner les prix d’achat.
              </p>
            </div>
          )}

          {/* Meilleurs clients */}
          {(stats?.topClients.length ?? 0) > 0 && (
            <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm">
              <h3 className="border-b border-[var(--line)] px-5 py-3 text-sm font-bold uppercase tracking-wider text-[var(--night)]">
                Meilleurs clients
              </h3>
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--mist)] text-xs uppercase tracking-wider text-[var(--muted)]">
                  <tr>
                    <th className="px-4 py-2 font-bold">Client</th>
                    <th className="px-4 py-2 text-center font-bold">Achats</th>
                    <th className="px-4 py-2 text-right font-bold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(stats?.topClients || []).map((row) => (
                    <tr key={row.name} className="border-t border-[var(--line)]">
                      <td className="px-4 py-2 font-semibold text-[var(--night)]">{row.name}</td>
                      <td className="px-4 py-2 text-center">{row.count}</td>
                      <td className="px-4 py-2 text-right font-semibold">{money(row.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
