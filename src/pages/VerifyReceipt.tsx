/**
 * Page publique — VÉRIFIER UN REÇU.
 *
 * Le client scanne le QR code imprimé sur son reçu (ou saisit le code à 8
 * caractères) et obtient l'authentification du document : numéro, date, total,
 * statut et détail des articles.
 *
 * Aucune donnée personnelle n'est exposée : le nom du client est réduit à ses
 * initiales, le téléphone et la note de vente ne sortent jamais de la base.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useRoute, navigate } from '../utils/router';
import { useSeo } from '../utils/seo';
import { QrCode } from '../components/ui/QrCode';
import { verifyReceipt } from '../services/stock';
import { formatPrice } from '../utils/format';
import type { VerifiedReceipt } from '../types/reports';
import { ShieldCheck, ShieldAlert, Search, Loader2, ReceiptText, ArrowLeft } from 'lucide-react';

const money = (value: number | null | undefined) => formatPrice(value ?? 0) || '0 FCFA';

const dateLabel = (ms: number | undefined) =>
  ms
    ? new Date(ms).toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

const STATUS_LABELS: Record<string, string> = {
  paye: 'Payé',
  partiel: 'Partiellement payé',
  credit: 'À crédit (non soldé)',
  annule: 'ANNULÉ — ce reçu ne vaut plus',
};

export function VerifyReceipt() {
  const route = useRoute();
  const segments = route.split('/').filter(Boolean);
  const codeFromUrl = segments[1] ? decodeURIComponent(segments[1]) : '';

  const [code, setCode] = useState(codeFromUrl.toUpperCase());
  const [result, setResult] = useState<VerifiedReceipt | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useSeo({
    title: 'Vérifier un reçu | ALFFA NIGER',
    description:
      'Authentifiez un reçu ALFFA NIGER : saisissez le code à 8 caractères imprimé sur le document ou scannez son QR code.',
  });

  const check = useCallback(async (value: string) => {
    const clean = value.trim().toUpperCase();
    if (!clean) {
      setResult(null);
      setError('Saisissez le code figurant sur le reçu.');
      return;
    }
    setIsLoading(true);
    setError('');
    setResult(null);
    try {
      setResult(await verifyReceipt(clean));
    } catch (err: any) {
      setError(
        err?.message ||
          'Vérification impossible pour le moment. Vérifiez votre connexion puis réessayez.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Un QR code scanné ouvre directement /verifier/CODE : on vérifie aussitôt.
  useEffect(() => {
    if (codeFromUrl) {
      setCode(codeFromUrl.toUpperCase());
      void check(codeFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeFromUrl]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    void check(code);
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      <button
        type="button"
        onClick={() => navigate('/')}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--muted)] hover:text-[var(--night)]"
      >
        <ArrowLeft className="h-4 w-4" /> Retour à la boutique
      </button>

      <div className="rounded-3xl border border-[var(--line)] bg-white p-6 shadow-lg sm:p-8">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--night)] text-[var(--cyan)]">
            <ReceiptText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold uppercase leading-none text-[var(--night)]">
              Vérifier un reçu
            </h1>
            <p className="mt-1 text-xs text-[var(--muted)]">
              ALFFA NIGER · authentification des documents de vente
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-[var(--muted)]">
          Chaque reçu porte un code à <strong>8 caractères</strong> et un QR code. Saisissez le code
          ci-dessous (ou scannez le QR code) : si le document a bien été émis par la maison, son
          numéro, sa date, son montant et son détail s’affichent.
        </p>

        <form onSubmit={submit} className="mt-5 flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              maxLength={12}
              placeholder="EX. 4F7A9C2B"
              aria-label="Code de vérification"
              className="w-full min-h-12 rounded-xl border border-[var(--line)] pl-9 pr-3 font-mono text-base tracking-widest outline-none focus:border-[var(--cyan)]"
            />
          </label>
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--night)] px-6 font-bold text-white shadow-md transition hover:bg-[var(--night-2)] disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Vérifier
          </button>
        </form>

        {error && (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {error}
          </p>
        )}

        {result && !result.found && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <div className="text-sm text-rose-800">
              <p className="font-bold">Reçu non reconnu</p>
              <p className="mt-1">
                Aucun reçu ne porte ce code. Vérifiez les caractères (le code ne contient que des
                chiffres et les lettres A à F), ou contactez la boutique au numéro indiqué sur le
                document.
              </p>
            </div>
          </div>
        )}

        {result?.found && (
          <div className="mt-5 space-y-4">
            <div
              className={`flex items-start gap-3 rounded-2xl border p-4 ${
                result.status === 'annule'
                  ? 'border-amber-300 bg-amber-50'
                  : 'border-emerald-200 bg-emerald-50'
              }`}
            >
              {result.status === 'annule' ? (
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              ) : (
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              )}
              <div className="text-sm">
                <p
                  className={`font-bold ${
                    result.status === 'annule' ? 'text-amber-800' : 'text-emerald-800'
                  }`}
                >
                  {result.status === 'annule' ? 'Reçu authentique, mais annulé' : 'Reçu authentique'}
                </p>
                <p
                  className={`mt-1 ${
                    result.status === 'annule' ? 'text-amber-700' : 'text-emerald-700'
                  }`}
                >
                  Ce document a bien été émis par la maison ALFFA NIGER.
                  {result.status === 'annule'
                    ? ' Il a été annulé : il ne doit plus servir de preuve de paiement.'
                    : ''}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-[var(--mist)] p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
                  Numéro
                </p>
                <p className="font-mono text-sm font-bold text-[var(--night)]">{result.number}</p>
              </div>
              <div className="rounded-xl bg-[var(--mist)] p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
                  Date d’émission
                </p>
                <p className="text-sm font-semibold text-[var(--night)]">{dateLabel(result.issuedAt)}</p>
              </div>
              <div className="rounded-xl bg-[var(--mist)] p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
                  Montant total
                </p>
                <p className="font-display text-lg font-bold text-[var(--night)]">
                  {money(result.total)}
                </p>
              </div>
              <div className="rounded-xl bg-[var(--mist)] p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
                  Client
                </p>
                <p className="text-sm font-semibold text-[var(--night)]">
                  {result.clientInitials || 'Client de passage'}
                </p>
              </div>
              <div className="rounded-xl bg-[var(--mist)] p-3 sm:col-span-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
                  Statut
                </p>
                <p className="text-sm font-semibold text-[var(--night)]">
                  {STATUS_LABELS[result.status || ''] || result.status || '—'}
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-[var(--line)]">
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--mist)] text-[11px] uppercase tracking-wider text-[var(--muted)]">
                  <tr>
                    <th className="px-3 py-2 font-bold">Article</th>
                    <th className="px-3 py-2 text-center font-bold">Qté</th>
                    <th className="px-3 py-2 text-right font-bold">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {(result.items || []).map((line, index) => (
                    <tr key={`${line.name}-${index}`} className="border-t border-[var(--line)]">
                      <td className="px-3 py-2">{line.name}</td>
                      <td className="px-3 py-2 text-center">{line.quantity}</td>
                      <td className="px-3 py-2 text-right font-semibold">{money(line.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-[var(--line)] p-3">
              <QrCode value={code} size={64} title="Code vérifié" />
              <p className="text-xs text-[var(--muted)]">
                Code vérifié :{' '}
                <span className="font-mono font-bold tracking-widest text-[var(--night)]">{code}</span>
                <br />
                Conservez ce code : il permet de recontrôler le document à tout moment.
              </p>
            </div>
          </div>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-[var(--muted)]">
        Pour toute question sur un reçu, contactez la boutique en précisant son numéro.
      </p>
    </main>
  );
}
