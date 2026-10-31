/**
 * Administration — ÉQUIPE (multi-utilisateurs).
 *
 * Deux rôles, volontairement simples :
 *   • GÉRANT  : tout — catalogue, stock, finances, dépenses, équipe ;
 *   • VENDEUR : encaisse (reçus), enregistre les ventes, consulte le stock.
 *
 * Un vendeur ne voit ni les finances, ni les dépenses, ni les comptes.
 * Ces restrictions sont aussi appliquées côté base (fonctions PostgreSQL) :
 * masquer un onglet ne suffirait pas à protéger les chiffres.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, UserCog, ShieldCheck, ShoppingBag, AlertCircle, KeyRound } from 'lucide-react';
import { deleteAccount, fetchAccounts, saveAccount } from '../../services/stock';
import { ADMIN_ROLE_LABELS, type AdminAccount, type AdminRole } from '../../types/reports';

type Form = {
  id?: string;
  username: string;
  displayName: string;
  role: AdminRole;
  active: boolean;
  password: string;
};

const emptyForm = (): Form => ({
  username: '',
  displayName: '',
  role: 'vendeur',
  active: true,
  password: '',
});

export function TeamManager() {
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState<Form | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      setAccounts(await fetchAccounts());
    } catch (err: any) {
      setError(err?.message || 'Impossible de charger l’équipe.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form) return;
    if (!form.id && form.password.length < 8) {
      setError('Le mot de passe doit comporter au moins 8 caractères.');
      return;
    }
    setIsSaving(true);
    setError('');
    setNotice('');
    try {
      const saved = await saveAccount({
        id: form.id,
        username: form.username,
        displayName: form.displayName,
        role: form.role,
        active: form.active,
        password: form.password || undefined,
      });
      setAccounts((prev) => {
        const exists = prev.some((a) => a.id === saved.id);
        return exists ? prev.map((a) => (a.id === saved.id ? saved : a)) : [...prev, saved];
      });
      setNotice(
        form.id
          ? 'Compte mis à jour. Le vendeur utilise désormais ces identifiants.'
          : `Compte « ${saved.username} » créé. Communiquez-lui son mot de passe de vive voix.`
      );
      setForm(null);
    } catch (err: any) {
      setError(err?.message || 'Enregistrement impossible.');
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (account: AdminAccount) => {
    if (!window.confirm(`Supprimer définitivement le compte « ${account.username} » ?`)) return;
    try {
      await deleteAccount(account.id);
      setAccounts((prev) => prev.filter((a) => a.id !== account.id));
    } catch (err: any) {
      setError(err?.message || 'Suppression impossible.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold uppercase text-[var(--night)]">Équipe</h2>
          <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
            Créez un compte <strong>vendeur</strong> pour la personne qui encaisse : elle ne peut ni
            modifier les prix, ni voir les finances, ni supprimer un reçu. Le compte{' '}
            <strong>gérant</strong> garde l’accès complet.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setForm(emptyForm())}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--night)] px-4 text-sm font-bold text-white shadow-md hover:bg-[var(--night-2)]"
        >
          <Plus className="h-4 w-4 text-[var(--cyan)]" /> Nouveau compte
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {notice}
        </div>
      )}

      {/* Rappel des droits */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
          <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[var(--night)]">
            <ShieldCheck className="h-4 w-4 text-emerald-600" /> Gérant
          </span>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Tout : catalogue, prix, photos, stock, inventaire, reçus (y compris annulation),
            dépenses, statistiques, bénéfice, équipe et paramètres.
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
          <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[var(--night)]">
            <ShoppingBag className="h-4 w-4 text-[var(--cyan-deep)]" /> Vendeur
          </span>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Établit les reçus, encaisse, enregistre ventes, retours et sorties de stock, consulte
            l’inventaire. Ne voit ni les finances, ni les dépenses, ni les autres comptes.
          </p>
        </div>
      </div>

      {/* Formulaire */}
      {form && (
        <form
          onSubmit={submit}
          className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm"
        >
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--night)]">
            {form.id ? 'Modifier le compte' : 'Créer un compte'}
          </h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                Identifiant
              </span>
              <input
                required
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="amina"
                className="w-full min-h-11 rounded-xl border border-[var(--line)] px-3 text-sm outline-none focus:border-[var(--cyan)]"
              />
              <span className="mt-1 block text-[11px] text-[var(--muted)]">
                3 caractères minimum, sans espace (ex. « amina », « caisse2 »).
              </span>
            </label>

            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                Nom affiché
              </span>
              <input
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                placeholder="Amina — caisse"
                className="w-full min-h-11 rounded-xl border border-[var(--line)] px-3 text-sm outline-none focus:border-[var(--cyan)]"
              />
            </label>

            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                Rôle
              </span>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as AdminRole })}
                className="w-full min-h-11 rounded-xl border border-[var(--line)] px-3 text-sm font-semibold outline-none"
              >
                <option value="vendeur">{ADMIN_ROLE_LABELS.vendeur}</option>
                <option value="gerant">{ADMIN_ROLE_LABELS.gerant}</option>
              </select>
            </label>

            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                {form.id ? 'Nouveau mot de passe (facultatif)' : 'Mot de passe'}
              </span>
              <input
                type="password"
                autoComplete="new-password"
                required={!form.id}
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="8 caractères minimum"
                className="w-full min-h-11 rounded-xl border border-[var(--line)] px-3 text-sm outline-none focus:border-[var(--cyan)]"
              />
            </label>
          </div>

          <label className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--night)]">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="h-4 w-4 accent-[var(--cyan-deep)]"
            />
            Compte actif (décochez pour bloquer l’accès sans supprimer l’historique)
          </label>

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
              <KeyRound className="h-4 w-4 text-[var(--cyan)]" />
              {isSaving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      )}

      {/* Liste des comptes */}
      <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm">
        {isLoading ? (
          <p className="flex items-center gap-2 p-6 text-sm text-[var(--muted)]">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement de l’équipe…
          </p>
        ) : accounts.length === 0 ? (
          <p className="p-6 text-sm text-[var(--muted)]">Aucun compte pour le moment.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--mist)] text-xs uppercase tracking-wider text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 font-bold">Identifiant</th>
                  <th className="px-4 py-3 font-bold">Nom affiché</th>
                  <th className="px-4 py-3 font-bold">Rôle</th>
                  <th className="px-4 py-3 font-bold">État</th>
                  <th className="px-4 py-3 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id} className="border-t border-[var(--line)]">
                    <td className="px-4 py-3 font-semibold text-[var(--night)]">{account.username}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{account.displayName || '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${
                          account.role === 'gerant'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-sky-100 text-sky-800'
                        }`}
                      >
                        {account.role === 'gerant' ? (
                          <ShieldCheck className="h-3 w-3" />
                        ) : (
                          <UserCog className="h-3 w-3" />
                        )}
                        {ADMIN_ROLE_LABELS[account.role] || account.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-semibold ${
                          account.active ? 'text-emerald-700' : 'text-rose-600'
                        }`}
                      >
                        {account.active ? 'Actif' : 'Bloqué'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setForm({
                              id: account.id,
                              username: account.username,
                              displayName: account.displayName || '',
                              role: account.role,
                              active: account.active,
                              password: '',
                            })
                          }
                          className="rounded-lg px-2 py-1 text-xs font-semibold text-[var(--night)] hover:bg-slate-100"
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => void remove(account)}
                          className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"
                          aria-label={`Supprimer ${account.username}`}
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

      <p className="text-xs leading-relaxed text-[var(--muted)]">
        Le mot de passe n’est jamais affiché, ni en clair, ni en rappel : il est enregistré sous forme
        d’empreinte. En cas d’oubli, modifiez-le ici depuis le compte gérant.
      </p>
    </div>
  );
}
