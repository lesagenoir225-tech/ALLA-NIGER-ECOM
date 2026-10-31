/**
 * Reçu imprimable — support commun à l'écran, à l'impression et au partage.
 *
 * Il reprend les informations officielles de la maison ALFFA NIGER
 * (dénomination, coordonnées, NIF, RCCM), la date et l'heure d'émission,
 * le détail des articles, le total en chiffres ET en lettres, ainsi que
 * le cachet du gérant.
 */
import React from 'react';
import type { SiteSettings } from '../../types';
import { PAYMENT_LABELS, amountInWords, type Receipt } from '../../types/stock';

const money = (value: number) =>
  `${new Intl.NumberFormat('fr-FR').format(Math.round(value || 0)).replace(/\u202f|\u00a0/g, ' ')} FCFA`;

export function formatReceiptDate(ms: number): string {
  return new Date(ms).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface Props {
  receipt: Receipt;
  settings: SiteSettings;
  /** Identifiant du bloc imprimé (utilisé par la feuille de style d'impression). */
  id?: string;
}

export function ReceiptDocument({ receipt, settings, id = 'receipt-print' }: Props) {
  const cancelled = receipt.status === 'annule';

  return (
    <div
      id={id}
      className="receipt-print relative mx-auto w-full max-w-[720px] bg-white p-6 text-[var(--ink)] shadow-sm"
      style={{ fontFamily: 'Arimo, system-ui, sans-serif' }}
    >
      {/* En-tête : identité de la maison */}
      <div className="flex items-start justify-between gap-4 border-b-2 border-[var(--night)] pb-4">
        <div className="flex items-center gap-3">
          <img
            src="/images/logo.png"
            alt="Logo ALFFA NIGER"
            className="h-16 w-16 rounded-lg object-contain"
          />
          <div>
            <p className="font-display text-xl font-bold uppercase leading-tight text-[var(--night)]">
              {settings.name || 'ALFFA NIGER'}
            </p>
            <p className="text-[11px] italic text-[var(--muted)]">
              {settings.slogan || 'La qualité au meilleur prix.'}
            </p>
            <p className="mt-1 text-[11px] leading-snug text-[var(--muted)]">
              {settings.address ? `${settings.address} · ` : ''}
              {settings.phone ? `Tél. ${settings.phone}` : ''}
            </p>
            <p className="text-[11px] leading-snug text-[var(--muted)]">
              {settings.nif ? `NIF : ${settings.nif}` : ''}
              {settings.nif && settings.rccm ? ' · ' : ''}
              {settings.rccm ? `RCCM : ${settings.rccm}` : ''}
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="font-display text-2xl font-bold uppercase tracking-wide text-[var(--night)]">
            Reçu
          </p>
          <p className="font-mono text-sm font-bold text-[var(--cyan-deep)]">{receipt.number}</p>
          <p className="mt-1 text-[11px] text-[var(--muted)]">{formatReceiptDate(receipt.createdAt)}</p>
          {cancelled && (
            <p className="mt-2 inline-block rotate-[-4deg] rounded border-2 border-rose-600 px-2 py-0.5 text-xs font-bold uppercase text-rose-600">
              Annulé
            </p>
          )}
        </div>
      </div>

      {/* Client */}
      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Client</p>
          <p className="font-semibold text-[var(--night)]">
            {receipt.clientName || 'Client de passage'}
          </p>
          {receipt.clientPhone && <p className="text-xs text-[var(--muted)]">{receipt.clientPhone}</p>}
        </div>
        <div className="sm:text-right">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
            Paiement
          </p>
          <p className="font-semibold text-[var(--night)]">
            {PAYMENT_LABELS[receipt.paymentMethod] || receipt.paymentMethod}
          </p>
          <p className="text-xs text-[var(--muted)]">
            {receipt.items.reduce((sum, line) => sum + line.quantity, 0)} article(s)
          </p>
        </div>
      </div>

      {/* Articles */}
      <table className="mt-4 w-full border-collapse text-sm">
        <thead>
          <tr className="bg-[var(--mist)] text-left text-[11px] uppercase tracking-wider text-[var(--muted)]">
            <th className="border border-[var(--line)] px-2 py-1.5 font-bold">Désignation</th>
            <th className="border border-[var(--line)] px-2 py-1.5 text-center font-bold">Qté</th>
            <th className="border border-[var(--line)] px-2 py-1.5 text-right font-bold">P.U.</th>
            <th className="border border-[var(--line)] px-2 py-1.5 text-right font-bold">Montant</th>
          </tr>
        </thead>
        <tbody>
          {receipt.items.map((line, index) => (
            <tr key={`${line.productId}-${index}`}>
              <td className="border border-[var(--line)] px-2 py-1.5">{line.name}</td>
              <td className="border border-[var(--line)] px-2 py-1.5 text-center">{line.quantity}</td>
              <td className="border border-[var(--line)] px-2 py-1.5 text-right">{money(line.unitPrice)}</td>
              <td className="border border-[var(--line)] px-2 py-1.5 text-right font-semibold">
                {money(line.total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totaux */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-between">
        <div className="max-w-sm text-[11px] leading-snug text-[var(--muted)]">
          <p className="font-bold uppercase tracking-wider text-[var(--night)]">Arrêté à la somme de</p>
          <p className="italic">{amountInWords(receipt.total)}</p>
          {receipt.note && <p className="mt-2">Note : {receipt.note}</p>}
        </div>

        <div className="min-w-[240px] space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-[var(--muted)]">Sous-total</span>
            <span className="font-semibold">{money(receipt.subtotal)}</span>
          </div>
          {receipt.discount > 0 && (
            <div className="flex justify-between gap-4">
              <span className="text-[var(--muted)]">Remise</span>
              <span className="font-semibold text-rose-700">− {money(receipt.discount)}</span>
            </div>
          )}
          <div className="flex justify-between gap-4 border-t border-[var(--night)] pt-1 text-base">
            <span className="font-bold uppercase text-[var(--night)]">Total</span>
            <span className="font-display text-lg font-bold text-[var(--night)]">
              {money(receipt.total)}
            </span>
          </div>
          <div className="flex justify-between gap-4 text-xs">
            <span className="text-[var(--muted)]">Montant payé</span>
            <span className="font-semibold">{money(receipt.amountPaid)}</span>
          </div>
          <div className="flex justify-between gap-4 text-xs">
            <span className="text-[var(--muted)]">Reste à payer</span>
            <span className={`font-semibold ${receipt.total - receipt.amountPaid > 0 ? 'text-rose-700' : ''}`}>
              {money(Math.max(0, receipt.total - receipt.amountPaid))}
            </span>
          </div>
          {receipt.changeDue > 0 && (
            <div className="flex justify-between gap-4 text-xs">
              <span className="text-[var(--muted)]">Monnaie rendue</span>
              <span className="font-semibold">{money(receipt.changeDue)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Signature et cachet */}
      <div className="mt-6 flex items-end justify-between gap-4 border-t border-[var(--line)] pt-4">
        <div className="text-[10px] leading-snug text-[var(--muted)]">
          <p>Merci de votre confiance.</p>
          <p>Les marchandises vendues ne sont ni reprises ni échangées, sauf défaut constaté.</p>
          <p className="mt-1 font-mono">{receipt.number} · {formatReceiptDate(receipt.createdAt)}</p>
        </div>
        <div className="relative text-center">
          <img
            src="/images/tampon.jpg"
            alt="Cachet ALFFA NIGER — Le Gérant"
            className="mx-auto h-24 w-24 object-contain opacity-95"
          />
          <p className="mt-1 border-t border-[var(--night)] pt-1 text-[11px] font-bold uppercase text-[var(--night)]">
            Le Gérant
          </p>
        </div>
      </div>
    </div>
  );
}

export { money as formatMoney };
