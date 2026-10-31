/**
 * Administration — REÇUS.
 *
 * Un reçu sert à deux choses :
 *   1. remettre une preuve d'achat au client (papier, PDF via « Imprimer »,
 *      ou message WhatsApp) avec le cachet, la date et l'heure ;
 *   2. faire sortir les articles du stock automatiquement.
 *
 * Un reçu émis ne se modifie pas : il s'annule, et les quantités reviennent
 * alors en stock (traçabilité comptable).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Receipt as ReceiptIcon,
  Plus,
  Trash2,
  Printer,
  Share2,
  Copy,
  X,
  Loader2,
  Search,
  Check,
  AlertTriangle,
  Banknote,
  Clock,
  ShoppingCart,
  Undo2,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { formatPrice } from '../../utils/format';
import { createReceipt, fetchReceipts, fetchStockOverview, voidReceipt } from '../../services/stock';
import {
  PAYMENT_LABELS,
  RECEIPT_STATUS_LABELS,
  amountInWords,
  type PaymentMethod,
  type Receipt,
  type ReceiptLine,
  type StockItem,
} from '../../types/stock';
import { ReceiptDocument, formatReceiptDate } from './ReceiptDocument';

const money = (value: number | null | undefined) => formatPrice(value ?? 0) || '0 FCFA';

type DraftLine = { productId: string; name: string; quantity: string; unitPrice: string };

interface Draft {
  clientName: string;
  clientPhone: string;
  lines: DraftLine[];
  discount: string;
  paymentMethod: PaymentMethod;
  amountPaid: string;
  paidInFull: boolean;
  note: string;
  affectStock: boolean;
}

const emptyDraft = (): Draft => ({
  clientName: '',
  clientPhone: '',
  lines: [{ productId: '', name: '', quantity: '1', unitPrice: '' }],
  discount: '',
  paymentMethod: 'espece',
  amountPaid: '',
  paidInFull: true,
  note: '',
  affectStock: true,
});

const STATUS_STYLES: Record<Receipt['status'], string> = {
  paye: 'bg-emerald-100 text-emerald-800',
  partiel: 'bg-amber-100 text-amber-800',
  credit: 'bg-rose-100 text-rose-800',
  annule: 'bg-slate-200 text-slate-700',
};

export function ReceiptsManager() {
  const { settings, showNotification } = useStore();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [preview, setPreview] = useState<Receipt | null>(null);
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [list, stock] = await Promise.all([fetchReceipts(), fetchStockOverview()]);
      setReceipts(list);
      setStockItems(stock.items);
    } catch (err: any) {
      showNotification('error', err.message || 'Chargement des reçus impossible.');
    } finally {
      setIsLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return receipts;
    return receipts.filter(
      (receipt) =>
        receipt.number.toLowerCase().includes(needle) ||
        receipt.clientName.toLowerCase().includes(needle) ||
        receipt.clientPhone.includes(needle)
    );
  }, [receipts, search]);

  const totals = useMemo(() => {
    const active = receipts.filter((receipt) => receipt.status !== 'annule');
    return {
      count: active.length,
      revenue: active.reduce((sum, receipt) => sum + receipt.total, 0),
      outstanding: active.reduce(
        (sum, receipt) => sum + Math.max(0, receipt.total - receipt.amountPaid),
        0
      ),
    };
  }, [receipts]);

  /** Totaux du brouillon — recalculés aussi côté serveur à l'enregistrement. */
  const draftTotals = useMemo(() => {
    if (!draft) return { subtotal: 0, discount: 0, total: 0, paid: 0 };
    const subtotal = draft.lines.reduce((sum, line) => {
      const qty = Number(line.quantity) || 0;
      const price = Number(line.unitPrice) || 0;
      return sum + qty * price;
    }, 0);
    const discount = Math.min(subtotal, Math.max(0, Number(draft.discount) || 0));
    const total = Math.max(0, subtotal - discount);
    const paid = draft.paidInFull ? total : Math.max(0, Number(draft.amountPaid) || 0);
    return { subtotal, discount, total, paid };
  }, [draft]);

  const updateLine = (index: number, patch: Partial<DraftLine>) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const lines = [...prev.lines];
      lines[index] = { ...lines[index], ...patch };
      return { ...prev, lines };
    });
  };

  const selectProduct = (index: number, productId: string) => {
    const item = stockItems.find((i) => i.productId === productId);
    updateLine(index, {
      productId,
      name: item?.name || '',
      unitPrice: item?.price !== null && item?.price !== undefined ? String(item.price) : '',
    });
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft) return;

    const lines: ReceiptLine[] = draft.lines
      .filter((line) => line.productId && Number(line.quantity) > 0)
      .map((line) => {
        const quantity = Math.max(0, Math.trunc(Number(line.quantity) || 0));
        const unitPrice = Math.max(0, Number(line.unitPrice) || 0);
        return {
          productId: line.productId,
          name: line.name,
          quantity,
          unitPrice,
          total: quantity * unitPrice,
        };
      });

    if (lines.length === 0) {
      showNotification('error', 'Ajoutez au moins un article au reçu.');
      return;
    }

    setIsSaving(true);
    try {
      const receipt = await createReceipt({
        clientName: draft.clientName,
        clientPhone: draft.clientPhone,
        items: lines,
        discount: draftTotals.discount,
        paymentMethod: draft.paymentMethod,
        amountPaid: draftTotals.paid,
        note: draft.note,
        affectStock: draft.affectStock,
      });
      setDraft(null);
      setPreview(receipt);
      showNotification('success', `Reçu ${receipt.number} enregistré.`);
      await load();
    } catch (err: any) {
      showNotification('error', err.message || 'Enregistrement du reçu impossible.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleVoid = async (receipt: Receipt) => {
    if (
      !window.confirm(
        `Annuler le reçu ${receipt.number} ? Les articles seront remis en stock et la pièce restera dans l'historique.`
      )
    ) {
      return;
    }
    try {
      const updated = await voidReceipt(receipt.id);
      setReceipts((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setPreview((prev) => (prev && prev.id === updated.id ? updated : prev));
      showNotification('success', `Reçu ${receipt.number} annulé, stock restitué.`);
      await load();
    } catch (err: any) {
      showNotification('error', err.message || 'Annulation impossible.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  /** Résumé texte : WhatsApp, SMS ou copie dans un message. */
  const receiptText = (receipt: Receipt) => {
    const lines = receipt.items
      .map((line) => `• ${line.name} ×${line.quantity} — ${money(line.total)}`)
      .join('\n');
    return [
      `${settings.name || 'ALFFA NIGER'} — REÇU ${receipt.number}`,
      formatReceiptDate(receipt.createdAt),
      receipt.clientName ? `Client : ${receipt.clientName}` : '',
      '',
      lines,
      '',
      receipt.discount > 0 ? `Remise : − ${money(receipt.discount)}` : '',
      `TOTAL : ${money(receipt.total)}`,
      `Payé : ${money(receipt.amountPaid)}${receipt.total - receipt.amountPaid > 0 ? ` — Reste : ${money(receipt.total - receipt.amountPaid)}` : ''}`,
      '',
      amountInWords(receipt.total),
      settings.phone ? `Tél. ${settings.phone}` : '',
      settings.address || '',
    ]
      .filter((line) => line !== '')
      .join('\n');
  };

  const handleShare = async (receipt: Receipt) => {
    const text = receiptText(receipt);
    const phone = receipt.clientPhone.replace(/[^0-9]/g, '');
    try {
      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        await (navigator as any).share({
          title: `Reçu ${receipt.number}`,
          text,
        });
        return;
      }
    } catch {
      // L'utilisateur a annulé le partage natif : on propose WhatsApp.
    }
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopy = async (receipt: Receipt) => {
    try {
      await navigator.clipboard.writeText(receiptText(receipt));
      setCopied(true);
      showNotification('success', 'Reçu copié : collez-le dans WhatsApp ou un SMS.');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showNotification('error', 'Copie impossible sur ce navigateur.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold uppercase text-[var(--night)]">Reçus</h2>
          <p className="text-sm text-[var(--muted)]">
            Encaissez une vente, imprimez ou partagez une preuve d’achat avec le cachet et la date.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDraft(emptyDraft())}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--night)] px-5 text-sm font-bold text-white hover:bg-[var(--night-2)]"
        >
          <Plus className="h-4 w-4 text-[var(--cyan)]" />
          <span>Nouveau reçu</span>
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
            <ReceiptIcon className="h-4 w-4" /> Reçus émis
          </span>
          <p className="mt-2 font-display text-3xl font-bold text-[var(--night)]">{totals.count}</p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
            <Banknote className="h-4 w-4" /> Encaissé
          </span>
          <p className="mt-2 font-display text-3xl font-bold text-emerald-600">
            {money(totals.revenue)}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
            <Clock className="h-4 w-4" /> Reste à encaisser
          </span>
          <p className={`mt-2 font-display text-3xl font-bold ${totals.outstanding > 0 ? 'text-rose-700' : 'text-[var(--night)]'}`}>
            {money(totals.outstanding)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--line)] bg-white p-4">
        <label className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un numéro, un client, un téléphone…"
            className="w-full min-h-11 rounded-xl border border-[var(--line)] pl-9 pr-3 text-sm outline-none focus:border-[var(--cyan)]"
          />
        </label>
        <span className="ml-auto text-xs text-[var(--muted)]">
          {filtered.length} reçu{filtered.length > 1 ? 's' : ''}
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm">
        {isLoading ? (
          <p className="flex items-center gap-2 p-6 text-sm text-[var(--muted)]">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement des reçus…
          </p>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <ReceiptIcon className="mx-auto h-10 w-10 text-[var(--muted)]" />
            <p className="mt-2 text-sm text-[var(--muted)]">
              Aucun reçu pour le moment. Cliquez sur « Nouveau reçu » pour en créer un.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--mist)] text-xs uppercase tracking-wider text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 font-bold">Numéro</th>
                  <th className="px-4 py-3 font-bold">Date</th>
                  <th className="px-4 py-3 font-bold">Client</th>
                  <th className="px-4 py-3 text-right font-bold">Total</th>
                  <th className="px-4 py-3 text-right font-bold">Reste</th>
                  <th className="px-4 py-3 text-center font-bold">Statut</th>
                  <th className="px-4 py-3 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((receipt) => (
                  <tr key={receipt.id} className="border-t border-[var(--line)]">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-[var(--cyan-deep)]">
                      {receipt.number}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--muted)]">
                      {formatReceiptDate(receipt.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-[var(--night)]">
                        {receipt.clientName || 'Client de passage'}
                      </span>
                      {receipt.clientPhone && (
                        <span className="block text-xs text-[var(--muted)]">{receipt.clientPhone}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-[var(--night)]">
                      {money(receipt.total)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right ${
                        receipt.total - receipt.amountPaid > 0 ? 'font-semibold text-rose-700' : 'text-[var(--muted)]'
                      }`}
                    >
                      {money(Math.max(0, receipt.total - receipt.amountPaid))}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${STATUS_STYLES[receipt.status]}`}
                      >
                        {RECEIPT_STATUS_LABELS[receipt.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPreview(receipt)}
                          title="Voir / imprimer"
                          className="rounded-lg border border-[var(--line)] bg-white p-2 text-[var(--night)] hover:bg-[var(--mist)]"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleShare(receipt)}
                          title="Partager"
                          className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-emerald-700 hover:bg-emerald-100"
                        >
                          <Share2 className="h-4 w-4" />
                        </button>
                        {receipt.status !== 'annule' && (
                          <button
                            type="button"
                            onClick={() => handleVoid(receipt)}
                            title="Annuler le reçu et remettre en stock"
                            className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-rose-700 hover:bg-rose-100"
                          >
                            <Undo2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- Création d'un reçu --- */}
      {draft && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
        >
          <form
            onSubmit={handleSave}
            className="my-6 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-xl font-bold uppercase text-[var(--night)]">
                  Nouveau reçu
                </h3>
                <p className="text-xs text-[var(--muted)]">
                  Le numéro, la date et l’heure sont attribués automatiquement à l’enregistrement.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDraft(null)}
                aria-label="Fermer"
                className="rounded-xl p-2 text-slate-400 hover:text-[var(--night)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--night)]">
                  Nom du client
                </label>
                <input
                  type="text"
                  value={draft.clientName}
                  onChange={(e) => setDraft({ ...draft, clientName: e.target.value })}
                  placeholder="Client de passage"
                  className="w-full min-h-12 rounded-xl border border-[var(--line)] px-3 text-sm outline-none focus:border-[var(--cyan)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--night)]">
                  Téléphone (pour l’envoi WhatsApp)
                </label>
                <input
                  type="tel"
                  value={draft.clientPhone}
                  onChange={(e) => setDraft({ ...draft, clientPhone: e.target.value })}
                  placeholder="ex. 22796222310"
                  className="w-full min-h-12 rounded-xl border border-[var(--line)] px-3 text-sm outline-none focus:border-[var(--cyan)]"
                />
              </div>
            </div>

            {/* Lignes */}
            <div className="mt-4 space-y-2">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--night)]">
                <ShoppingCart className="h-4 w-4" /> Articles vendus
              </p>
              {draft.lines.map((line, index) => {
                const item = stockItems.find((i) => i.productId === line.productId);
                const missing = item && Number(line.quantity) > item.quantity;
                return (
                  <div key={index} className="rounded-xl border border-[var(--line)] p-2.5">
                    <div className="grid gap-2 sm:grid-cols-[1fr_70px_110px_auto]">
                      <select
                        value={line.productId}
                        onChange={(e) => selectProduct(index, e.target.value)}
                        className="min-h-11 rounded-lg border border-[var(--line)] px-2 text-sm outline-none"
                      >
                        <option value="">— Choisir un article —</option>
                        {stockItems.map((product) => (
                          <option key={product.productId} value={product.productId}>
                            {product.name} · {product.quantity} en stock
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={1}
                        inputMode="numeric"
                        value={line.quantity}
                        onChange={(e) => updateLine(index, { quantity: e.target.value })}
                        aria-label="Quantité"
                        className="min-h-11 rounded-lg border border-[var(--line)] px-2 text-center text-sm outline-none"
                      />
                      <input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        value={line.unitPrice}
                        onChange={(e) => updateLine(index, { unitPrice: e.target.value })}
                        aria-label="Prix unitaire"
                        placeholder="Prix"
                        className="min-h-11 rounded-lg border border-[var(--line)] px-2 text-sm outline-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            lines: draft.lines.filter((_, i) => i !== index),
                          })
                        }
                        aria-label="Retirer la ligne"
                        className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-rose-700 hover:bg-rose-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-xs">
                      <span className="text-[var(--muted)]">
                        {line.productId
                          ? `Total ligne : ${money((Number(line.quantity) || 0) * (Number(line.unitPrice) || 0))}`
                          : 'Sélectionnez un article du catalogue'}
                      </span>
                      {missing && (
                        <span className="flex items-center gap-1 font-semibold text-amber-700">
                          <AlertTriangle className="h-3.5 w-3.5" /> stock disponible : {item?.quantity}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() =>
                  setDraft({
                    ...draft,
                    lines: [...draft.lines, { productId: '', name: '', quantity: '1', unitPrice: '' }],
                  })
                }
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--cyan-deep)] hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Ajouter un article
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--night)]">
                  Remise (FCFA)
                </label>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={draft.discount}
                  onChange={(e) => setDraft({ ...draft, discount: e.target.value })}
                  placeholder="0"
                  className="w-full min-h-12 rounded-xl border border-[var(--line)] px-3 text-sm outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--night)]">
                  Moyen de paiement
                </label>
                <select
                  value={draft.paymentMethod}
                  onChange={(e) => setDraft({ ...draft, paymentMethod: e.target.value as PaymentMethod })}
                  className="w-full min-h-12 rounded-xl border border-[var(--line)] px-3 text-sm outline-none"
                >
                  {(Object.keys(PAYMENT_LABELS) as PaymentMethod[]).map((method) => (
                    <option key={method} value={method}>
                      {PAYMENT_LABELS[method]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--night)]">
                  Montant payé
                </label>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={draft.paidInFull ? String(draftTotals.total) : draft.amountPaid}
                  onChange={(e) => setDraft({ ...draft, paidInFull: false, amountPaid: e.target.value })}
                  className="w-full min-h-12 rounded-xl border border-[var(--line)] px-3 text-sm outline-none"
                />
                <label className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--night)]">
                  <input
                    type="checkbox"
                    checked={draft.paidInFull}
                    onChange={(e) => setDraft({ ...draft, paidInFull: e.target.checked })}
                    className="h-3.5 w-3.5 accent-[var(--cyan-deep)]"
                  />
                  Payé intégralement
                </label>
              </div>
            </div>

            <div className="mt-3">
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--night)]">
                Note (facultative)
              </label>
              <input
                type="text"
                value={draft.note}
                onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                placeholder="ex. Livraison incluse, garantie 3 mois…"
                className="w-full min-h-12 rounded-xl border border-[var(--line)] px-3 text-sm outline-none"
              />
            </div>

            <label className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[var(--night)]">
              <input
                type="checkbox"
                checked={draft.affectStock}
                onChange={(e) => setDraft({ ...draft, affectStock: e.target.checked })}
                className="h-4 w-4 accent-[var(--cyan-deep)]"
              />
              Déduire ces articles du stock
            </label>

            <div className="mt-4 rounded-xl bg-[var(--mist)] p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Sous-total</span>
                <span className="font-semibold">{money(draftTotals.subtotal)}</span>
              </div>
              {draftTotals.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Remise</span>
                  <span className="font-semibold text-rose-700">− {money(draftTotals.discount)}</span>
                </div>
              )}
              <div className="mt-1 flex justify-between border-t border-[var(--line)] pt-1 text-base">
                <span className="font-bold uppercase text-[var(--night)]">Total</span>
                <span className="font-display text-lg font-bold text-[var(--night)]">
                  {money(draftTotals.total)}
                </span>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDraft(null)}
                className="min-h-11 rounded-xl border border-[var(--line)] px-4 text-sm font-semibold text-[var(--night)] hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--night)] px-5 text-sm font-bold text-white hover:bg-[var(--night-2)] disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-[var(--cyan)]" />}
                <span>{isSaving ? 'Enregistrement…' : 'Valider et générer le reçu'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* --- Aperçu / impression --- */}
      {preview && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
        >
          <div className="my-6 w-full max-w-3xl">
            <div className="no-print mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-white">
                Reçu {preview.number} · {menuLabel(preview.status)}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-white px-3 text-xs font-bold text-[var(--night)]"
                >
                  <Printer className="h-4 w-4" /> Imprimer / PDF
                </button>
                <button
                  type="button"
                  onClick={() => handleShare(preview)}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white"
                >
                  <Share2 className="h-4 w-4" /> Partager
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(preview)}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-white px-3 text-xs font-bold text-[var(--night)]"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copié' : 'Copier le texte'}
                </button>
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[var(--night)] px-3 text-xs font-bold text-white"
                >
                  <X className="h-4 w-4" /> Fermer
                </button>
              </div>
            </div>
            <ReceiptDocument receipt={preview} settings={settings} />
          </div>
        </div>
      )}
    </div>
  );
}

function menuLabel(status: Receipt['status']): string {
  return RECEIPT_STATUS_LABELS[status] || status;
}
