/**
 * Administration — GESTION DE STOCK.
 *
 * Objectifs retenus avec le commerçant :
 *   • savoir combien d'articles il reste, et ce que le stock représente en
 *     argent (prix d'achat immobilisé ET valeur de revente) ;
 *   • être alerté avant la rupture (seuil par produit) ;
 *   • tracer chaque entrée, sortie, vente, retour et inventaire ;
 *   • disposer d'une feuille de comptage imprimable / exportable.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Package,
  PackagePlus,
  PackageMinus,
  Boxes,
  AlertTriangle,
  Loader2,
  Search,
  Plus,
  X,
  Save,
  Download,
  RefreshCw,
  ClipboardList,
  TrendingUp,
  Undo2,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { formatPrice } from '../../utils/format';
import { fetchStockOverview, moveStock } from '../../services/stock';
import {
  STOCK_MOVE_LABELS,
  StockItem,
  StockMoveType,
  StockOverview,
} from '../../types/stock';

const money = (value: number | null | undefined) => formatPrice(value ?? 0) || '0 FCFA';

const dateTime = (ms: number) =>
  new Date(ms).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const MOVE_STYLES: Record<StockMoveType, string> = {
  entree: 'bg-emerald-100 text-emerald-800',
  sortie: 'bg-rose-100 text-rose-800',
  vente: 'bg-[var(--night)] text-white',
  retour: 'bg-amber-100 text-amber-800',
  inventaire: 'bg-sky-100 text-sky-800',
  ajustement: 'bg-slate-200 text-slate-800',
};

type MovementForm = {
  productId: string;
  type: StockMoveType;
  quantity: string;
  unitCost: string;
  costPrice: string;
  alertThreshold: string;
  reason: string;
  note: string;
};

const emptyForm = (item?: StockItem): MovementForm => ({
  productId: item?.productId || '',
  type: 'entree',
  quantity: '1',
  unitCost: item?.costPrice ? String(item.costPrice) : '',
  costPrice: item?.costPrice ? String(item.costPrice) : '',
  alertThreshold: String(item?.alertThreshold ?? 3),
  reason: '',
  note: '',
});

export function StockManager() {
  const { showNotification } = useStore();
  const [overview, setOverview] = useState<StockOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [shopFilter, setShopFilter] = useState<'tous' | 'electronique' | 'textile'>('tous');
  const [onlyAlerts, setOnlyAlerts] = useState(false);
  const [form, setForm] = useState<MovementForm | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      try {
        const data = await fetchStockOverview();
        setOverview(data);
      } catch (err: any) {
        showNotification('error', err.message || 'Chargement du stock impossible.');
      } finally {
        setIsLoading(false);
      }
    },
    [showNotification]
  );

  useEffect(() => {
    load();
  }, [load]);

  const items = overview?.items || [];
  const totals = overview?.totals;

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return items.filter((item) => {
      if (shopFilter !== 'tous' && item.shop !== shopFilter) return false;
      if (onlyAlerts && item.quantity > item.alertThreshold) return false;
      if (!needle) return true;
      return (
        item.name.toLowerCase().includes(needle) ||
        item.productId.toLowerCase().includes(needle)
      );
    });
  }, [items, search, shopFilter, onlyAlerts]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form || !form.productId) {
      showNotification('error', 'Choisissez un produit.');
      return;
    }
    const quantity = Number(form.quantity);
    if (!Number.isFinite(quantity)) {
      showNotification('error', 'Quantité invalide.');
      return;
    }
    if (form.type !== 'ajustement' && quantity < 0) {
      showNotification('error', 'La quantité doit être positive.');
      return;
    }

    setIsSaving(true);
    try {
      await moveStock({
        productId: form.productId,
        type: form.type,
        quantity,
        unitCost: form.unitCost ? Number(form.unitCost) : null,
        costPrice: form.costPrice ? Number(form.costPrice) : null,
        alertThreshold: form.alertThreshold ? Number(form.alertThreshold) : null,
        reason: form.reason,
        note: form.note,
      });
      showNotification('success', `Stock mis à jour (${STOCK_MOVE_LABELS[form.type]}).`);
      setForm(null);
      await load(true);
    } catch (err: any) {
      showNotification('error', err.message || 'Mouvement refusé.');
    } finally {
      setIsSaving(false);
    }
  };

  /** Feuille de comptage : sert à l'inventaire physique, sur papier ou Excel. */
  const exportCsv = () => {
    const rows = [
      ['Produit', 'Identifiant', 'Boutique', 'Quantité', 'Seuil', "Prix d'achat", 'Prix de vente', 'Valeur stock (achat)'],
      ...filtered.map((item) => [
        item.name,
        item.productId,
        item.shop,
        String(item.quantity),
        String(item.alertThreshold),
        String(item.costPrice ?? ''),
        String(item.price ?? ''),
        String(item.quantity * (item.costPrice ?? 0)),
      ]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stock-alffa-niger-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showNotification('success', 'Feuille de stock exportée (CSV).');
  };

  const openMovement = (item: StockItem, type: StockMoveType) => {
    setForm({ ...emptyForm(item), type });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold uppercase text-[var(--night)]">
            Gestion de stock
          </h2>
          <p className="text-sm text-[var(--muted)]">
            Quantités réelles, valeur de la marchandise et historique des mouvements.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => load()}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[var(--line)] bg-white px-3 text-xs font-semibold text-[var(--night)] hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[var(--line)] bg-white px-3 text-xs font-semibold text-[var(--night)] hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Feuille d’inventaire (CSV)</span>
          </button>
          <button
            type="button"
            onClick={() => setForm(emptyForm())}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[var(--night)] px-4 text-xs font-bold text-white hover:bg-[var(--night-2)]"
          >
            <Plus className="h-4 w-4 text-[var(--cyan)]" />
            <span>Nouveau mouvement</span>
          </button>
        </div>
      </div>

      {/* Indicateurs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
            <Boxes className="h-4 w-4" /> Articles en stock
          </span>
          <p className="mt-2 font-display text-4xl font-bold text-[var(--night)]">
            {totals?.quantity ?? 0}
          </p>
          <span className="mt-1 block text-xs text-[var(--muted)]">
            sur {totals?.lines ?? 0} références
          </span>
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
            <Package className="h-4 w-4" /> Valeur d’achat du stock
          </span>
          <p className="mt-2 font-display text-3xl font-bold text-[var(--night)]">
            {money(totals?.costValue ?? 0)}
          </p>
          <span className="mt-1 block text-xs text-[var(--muted)]">
            capital immobilisé — renseignez les prix d’achat
          </span>
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
            <TrendingUp className="h-4 w-4" /> Valeur de revente
          </span>
          <p className="mt-2 font-display text-3xl font-bold text-emerald-600">
            {money(totals?.saleValue ?? 0)}
          </p>
          <span className="mt-1 block text-xs text-[var(--muted)]">
            marge potentielle : {money((totals?.saleValue ?? 0) - (totals?.costValue ?? 0))}
          </span>
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
            <AlertTriangle className="h-4 w-4" /> À réapprovisionner
          </span>
          <p className="mt-2 font-display text-4xl font-bold text-amber-600">
            {(totals?.alertCount ?? 0) + (totals?.outCount ?? 0)}
          </p>
          <span className="mt-1 block text-xs text-[var(--muted)]">
            dont {totals?.outCount ?? 0} en rupture totale
          </span>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--line)] bg-white p-4">
        <label className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un article…"
            className="w-full min-h-11 rounded-xl border border-[var(--line)] pl-9 pr-3 text-sm outline-none focus:border-[var(--cyan)]"
          />
        </label>
        <select
          value={shopFilter}
          onChange={(e) => setShopFilter(e.target.value as any)}
          className="min-h-11 rounded-xl border border-[var(--line)] px-3 text-sm font-semibold outline-none"
        >
          <option value="tous">Toutes les boutiques</option>
          <option value="electronique">Électronique</option>
          <option value="textile">Textile</option>
        </select>
        <label className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--night)]">
          <input
            type="checkbox"
            checked={onlyAlerts}
            onChange={(e) => setOnlyAlerts(e.target.checked)}
            className="h-4 w-4 accent-[var(--cyan-deep)]"
          />
          Seulement les alertes
        </label>
        <span className="ml-auto text-xs text-[var(--muted)]">
          {filtered.length} ligne{filtered.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Tableau du stock */}
      <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm">
        {isLoading ? (
          <p className="flex items-center gap-2 p-6 text-sm text-[var(--muted)]">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement du stock…
          </p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-sm text-[var(--muted)]">Aucun article ne correspond à ce filtre.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--mist)] text-xs uppercase tracking-wider text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 font-bold">Article</th>
                  <th className="px-4 py-3 font-bold">Boutique</th>
                  <th className="px-4 py-3 font-bold text-right">Achat</th>
                  <th className="px-4 py-3 font-bold text-right">Vente</th>
                  <th className="px-4 py-3 font-bold text-center">Stock</th>
                  <th className="px-4 py-3 font-bold text-center">Seuil</th>
                  <th className="px-4 py-3 font-bold text-right">Valeur</th>
                  <th className="px-4 py-3 font-bold text-right">Mouvement</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const isOut = item.quantity === 0;
                  const isLow = item.quantity > 0 && item.quantity <= item.alertThreshold;
                  return (
                    <tr key={item.productId} className="border-t border-[var(--line)]">
                      <td className="px-4 py-3">
                        <span className="font-semibold text-[var(--night)]">{item.name}</span>
                        <span className="block text-xs text-[var(--muted)]">{item.productId}</span>
                      </td>
                      <td className="px-4 py-3 text-xs capitalize text-[var(--muted)]">{item.shop}</td>
                      <td className="px-4 py-3 text-right text-[var(--muted)]">
                        {item.costPrice === null ? '—' : money(item.costPrice)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-[var(--night)]">
                        {item.price === null ? 'Sur demande' : money(item.price)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex min-w-10 justify-center rounded-lg px-2 py-1 text-sm font-bold ${
                            isOut
                              ? 'bg-rose-100 text-rose-700'
                              : isLow
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {item.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-[var(--muted)]">{item.alertThreshold}</td>
                      <td className="px-4 py-3 text-right text-[var(--muted)]">
                        {money(item.quantity * (item.costPrice ?? 0))}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openMovement(item, 'entree')}
                            title="Enregistrer une entrée"
                            className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-emerald-700 hover:bg-emerald-100"
                          >
                            <PackagePlus className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openMovement(item, 'sortie')}
                            title="Enregistrer une sortie (casse, perte…)"
                            className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-rose-700 hover:bg-rose-100"
                          >
                            <PackageMinus className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openMovement(item, 'inventaire')}
                            title="Corriger après comptage (inventaire)"
                            className="rounded-lg border border-[var(--line)] bg-white p-2 text-[var(--night)] hover:bg-[var(--mist)]"
                          >
                            <ClipboardList className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Historique */}
      <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
        <h3 className="flex items-center gap-2 font-display text-lg font-bold uppercase text-[var(--night)]">
          <Undo2 className="h-4 w-4" /> Derniers mouvements
        </h3>
        <p className="mb-3 text-xs text-[var(--muted)]">
          Chaque ligne est horodatée : c’est la trace de vos entrées, ventes et corrections.
        </p>
        {(overview?.movements.length || 0) === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            Aucun mouvement enregistré pour le moment.
          </p>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-white text-xs uppercase tracking-wider text-[var(--muted)]">
                <tr>
                  <th className="py-2 pr-3 font-bold">Date</th>
                  <th className="py-2 pr-3 font-bold">Article</th>
                  <th className="py-2 pr-3 font-bold">Type</th>
                  <th className="py-2 pr-3 text-right font-bold">Quantité</th>
                  <th className="py-2 font-bold">Motif</th>
                </tr>
              </thead>
              <tbody>
                {overview?.movements.slice(0, 60).map((move) => (
                  <tr key={move.id} className="border-t border-[var(--line)]">
                    <td className="whitespace-nowrap py-2 pr-3 text-xs text-[var(--muted)]">
                      {dateTime(move.createdAt)}
                    </td>
                    <td className="py-2 pr-3 font-semibold text-[var(--night)]">{move.productName}</td>
                    <td className="py-2 pr-3">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${MOVE_STYLES[move.type]}`}
                      >
                        {STOCK_MOVE_LABELS[move.type]}
                      </span>
                    </td>
                    <td
                      className={`py-2 pr-3 text-right font-bold ${
                        move.quantity < 0 ? 'text-rose-700' : 'text-emerald-700'
                      }`}
                    >
                      {move.quantity > 0 ? `+${move.quantity}` : move.quantity}
                    </td>
                    <td className="py-2 text-xs text-[var(--muted)]">
                      {move.reason || move.note || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Fenêtre de mouvement */}
      {form && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        >
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-xl font-bold uppercase text-[var(--night)]">
                  Mouvement de stock
                </h3>
                <p className="text-xs text-[var(--muted)]">
                  Entrée de marchandise, sortie, comptage ou correction.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setForm(null)}
                aria-label="Fermer"
                className="rounded-xl p-2 text-slate-400 hover:text-[var(--night)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--night)]">
                  Article
                </label>
                <select
                  value={form.productId}
                  onChange={(e) => {
                    const item = items.find((i) => i.productId === e.target.value);
                    setForm({
                      ...form,
                      productId: e.target.value,
                      costPrice: item?.costPrice ? String(item.costPrice) : form.costPrice,
                      unitCost: item?.costPrice ? String(item.costPrice) : form.unitCost,
                      alertThreshold: String(item?.alertThreshold ?? form.alertThreshold),
                    });
                  }}
                  required
                  className="w-full min-h-12 rounded-xl border border-[var(--line)] px-3 text-sm outline-none focus:border-[var(--cyan)]"
                >
                  <option value="">— Choisir un article —</option>
                  {items.map((item) => (
                    <option key={item.productId} value={item.productId}>
                      {item.name} ({item.shop}) · stock {item.quantity}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--night)]">
                    Type
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as StockMoveType })}
                    className="w-full min-h-12 rounded-xl border border-[var(--line)] px-3 text-sm outline-none"
                  >
                    {(Object.keys(STOCK_MOVE_LABELS) as StockMoveType[])
                      .filter((type) => type !== 'vente')
                      .map((type) => (
                        <option key={type} value={type}>
                          {STOCK_MOVE_LABELS[type]}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--night)]">
                    {form.type === 'inventaire'
                      ? 'Quantité comptée'
                      : form.type === 'ajustement'
                      ? 'Variation (+/-)'
                      : 'Quantité'}
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    className="w-full min-h-12 rounded-xl border border-[var(--line)] px-3 text-base outline-none focus:border-[var(--cyan)]"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--night)]">
                    Prix d’achat unitaire
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={form.costPrice}
                    onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                    placeholder="ex. 72000"
                    className="w-full min-h-12 rounded-xl border border-[var(--line)] px-3 text-base outline-none focus:border-[var(--cyan)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--night)]">
                    Seuil d’alerte
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={form.alertThreshold}
                    onChange={(e) => setForm({ ...form, alertThreshold: e.target.value })}
                    className="w-full min-h-12 rounded-xl border border-[var(--line)] px-3 text-base outline-none focus:border-[var(--cyan)]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--night)]">
                  Motif
                </label>
                <input
                  type="text"
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="ex. Livraison fournisseur, casse, retour client…"
                  className="w-full min-h-12 rounded-xl border border-[var(--line)] px-3 text-sm outline-none focus:border-[var(--cyan)]"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
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
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--night)] px-5 text-sm font-bold text-white hover:bg-[var(--night-2)] disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 text-[var(--cyan)]" />}
                <span>{isSaving ? 'Enregistrement…' : 'Enregistrer'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
