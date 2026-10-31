/**
 * Administration — SAUVEGARDE AUTOMATIQUE.
 *
 * Deux niveaux de sécurité pour le commerçant :
 *   • une copie automatique par jour, conservée côté base pendant 90 jours
 *     (tâche planifiée ; à défaut, déclenchée à la première ouverture de
 *     l'administration dans la journée) ;
 *   • un fichier JSON téléchargeable, à garder hors du téléphone (clé USB,
 *     e-mail à soi-même) car une sauvegarde qui vit sur le même serveur ne
 *     protège pas d'une perte d'accès au compte.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Database, Download, Loader2, RefreshCw, ShieldCheck, Save, AlertCircle } from 'lucide-react';
import { fetchBackup, fetchBackups, runBackup, type BackupEntry } from '../../services/stock';

const sizeLabel = (bytes: number | undefined) => {
  const value = bytes ?? 0;
  if (value > 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} Mo`;
  if (value > 1024) return `${Math.round(value / 1024)} Ko`;
  return `${value} o`;
};

const dayLabel = (day: string) => {
  const [year, month, date] = day.split('-');
  return `${date}/${month}/${year}`;
};

export function BackupCard() {
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [today, setToday] = useState(new Date().toISOString().slice(0, 10));
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchBackups();
      setBackups(data.backups);
      setToday(data.today);
    } catch (err: any) {
      setError(err?.message || 'Impossible de charger les sauvegardes.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Sauvegarde du jour, déclenchée automatiquement une fois par jour.
   *
   * Sur un hébergement statique, la tâche planifiée de la base peut ne pas
   * être active : cette ouverture garantit qu'une copie du jour existe dès
   * que le gérant passe dans l'administration.
   */
  useEffect(() => {
    void (async () => {
      await load();
      const key = 'alffa_niger_last_backup';
      let last = '';
      try {
        last = localStorage.getItem(key) || '';
      } catch {}
      if (last === today) return;
      try {
        await runBackup();
        localStorage.setItem(key, today);
        await load();
      } catch {
        // Échec silencieux : le bouton « Sauvegarder maintenant » reste disponible.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveNow = async () => {
    setIsSaving(true);
    setError('');
    try {
      await runBackup();
      try {
        localStorage.setItem('alffa_niger_last_backup', today);
      } catch {}
      await load();
    } catch (err: any) {
      setError(err?.message || 'Sauvegarde impossible.');
    } finally {
      setIsSaving(false);
    }
  };

  const download = async (day: string) => {
    try {
      const payload = await fetchBackup(day);
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `alffa-niger-${day}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.message || 'Téléchargement impossible.');
    }
  };

  const hasToday = backups.some((b) => b.day === today);

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[var(--night)]">
            <Database className="h-4 w-4 text-[var(--muted)]" /> Sauvegarde automatique
          </h3>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-[var(--muted)]">
            Une copie complète (catalogue, stock, reçus, dépenses, paramètres) est enregistrée chaque
            jour et conservée 90 jours. Téléchargez-la de temps en temps : une copie gardée sur le
            serveur ne protège pas d’une perte d’accès au compte.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void saveNow()}
            disabled={isSaving}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[var(--night)] px-3 text-xs font-bold text-white disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5 text-[var(--cyan)]" />
            )}
            {isSaving ? 'Sauvegarde…' : 'Sauvegarder maintenant'}
          </button>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[var(--line)] px-3 text-xs font-semibold text-[var(--night)] hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Actualiser
          </button>
        </div>
      </div>

      <div
        className={`mt-4 flex items-center gap-2 rounded-xl border p-3 text-xs font-semibold ${
          hasToday
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border-amber-200 bg-amber-50 text-amber-800'
        }`}
      >
        <ShieldCheck className="h-4 w-4 shrink-0" />
        {hasToday
          ? `Copie du jour enregistrée (${dayLabel(today)}).`
          : 'Aucune copie pour aujourd’hui : appuyez sur « Sauvegarder maintenant ».'}
      </div>

      {error && (
        <p className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      {isLoading ? (
        <p className="mt-4 flex items-center gap-2 text-xs text-[var(--muted)]">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Chargement des sauvegardes…
        </p>
      ) : backups.length === 0 ? (
        <p className="mt-4 text-xs text-[var(--muted)]">
          Aucune sauvegarde enregistrée pour le moment.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-[var(--line)]">
          {backups.slice(0, 6).map((entry) => (
            <li key={entry.day} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span className="text-sm font-semibold text-[var(--night)]">
                {dayLabel(entry.day)}
                {entry.day === today && (
                  <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
                    Aujourd’hui
                  </span>
                )}
              </span>
              <span className="flex items-center gap-3 text-xs text-[var(--muted)]">
                {sizeLabel(entry.byte_size ?? entry.bytes)}
                <button
                  type="button"
                  onClick={() => void download(entry.day)}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] px-2 py-1 font-semibold text-[var(--night)] hover:bg-slate-50"
                >
                  <Download className="h-3.5 w-3.5" /> Télécharger
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
