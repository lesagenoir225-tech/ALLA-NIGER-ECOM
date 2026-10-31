import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Save,
  X,
  Upload,
  FileText,
  Image as ImageIcon,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  Lock,
  Unlock,
  RefreshCw,
  CheckCircle2,
  Clock,
  PencilLine,
  Briefcase,
  Search,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import {
  ExperienceDocument,
  ExperienceReference,
  ExperienceValidation,
  EXPERIENCE_DOMAINS,
  EXPERIENCE_EXECUTION_LABELS,
  EXPERIENCE_VALIDATION_LABELS,
  experienceStatusLabel,
} from '../../types/experience';
import {
  createReference,
  deleteReference,
  fetchAdminReferences,
  updateReference,
  uploadExperienceDocument,
  uploadExperiencePhoto,
  openExperienceDocument,
} from '../../services/experience';

type FormState = {
  id?: string;
  title: string;
  domain: ExperienceReference['domain'];
  description: string;
  beneficiary: string;
  procedure: string;
  location: string;
  execution: ExperienceReference['execution'];
  validation: ExperienceValidation;
  published: boolean;
  photos: ExperienceReference['photos'];
  documents: ExperienceDocument[];
};

const EMPTY_FORM: FormState = {
  title: '',
  domain: 'btp',
  description: '',
  beneficiary: '',
  procedure: '',
  location: '',
  execution: 'non_confirme',
  validation: 'brouillon',
  published: false,
  photos: [],
  documents: [],
};

function toForm(ref: ExperienceReference): FormState {
  return {
    id: ref.id,
    title: ref.title,
    domain: ref.domain,
    description: ref.description,
    beneficiary: ref.beneficiary || '',
    procedure: ref.procedure || '',
    location: ref.location || '',
    execution: ref.execution,
    validation: ref.validation,
    published: ref.published,
    photos: ref.photos || [],
    documents: ref.documents || [],
  };
}

const STATUS_STYLES: Record<string, string> = {
  Publié: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  'Validé pour publication': 'bg-cyan-50 text-[var(--cyan-deep)] border-cyan-200',
  'En attente de vérification': 'bg-amber-50 text-amber-800 border-amber-200',
  Brouillon: 'bg-slate-100 text-slate-700 border-slate-300',
};

const STATUS_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Publié: CheckCircle2,
  'Validé pour publication': ShieldCheck,
  'En attente de vérification': Clock,
  Brouillon: PencilLine,
};

export function ExperienceAdmin() {
  const { showNotification } = useStore();
  const [references, setReferences] = useState<ExperienceReference[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [domainFilter, setDomainFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const [form, setForm] = useState<FormState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExperienceReference | null>(null);
  const [preview, setPreview] = useState<FormState | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);
  const [docVisibility, setDocVisibility] = useState<'prive' | 'public'>('prive');

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const list = await fetchAdminReferences();
      setReferences(list);
    } catch (err: any) {
      setLoadError(err.message || 'Chargement impossible.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    return {
      total: references.length,
      published: references.filter((r) => r.published).length,
      pending: references.filter((r) => !r.published && r.validation === 'en_attente').length,
      drafts: references.filter((r) => !r.published && r.validation === 'brouillon').length,
    };
  }, [references]);

  const filtered = useMemo(() => {
    return references.filter((r) => {
      if (domainFilter !== 'all' && r.domain !== domainFilter) return false;
      if (statusFilter !== 'all') {
        const label = experienceStatusLabel(r);
        if (statusFilter === 'published' && !r.published) return false;
        if (statusFilter === 'unpublished' && r.published) return false;
        if (statusFilter === 'en_attente' && label !== 'En attente de vérification') return false;
        if (statusFilter === 'brouillon' && label !== 'Brouillon') return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const haystack = [r.title, r.beneficiary, r.procedure, r.description, r.location]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [references, domainFilter, statusFilter, search]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const persist = async (next: FormState, toast: string): Promise<boolean> => {
    setIsSaving(true);
    setFormError(null);
    try {
      if (next.published && next.validation !== 'valide') {
        throw new Error('Validez la référence avant de la publier.');
      }
      if (next.published && next.photos.some((p) => !p.alt.trim())) {
        throw new Error(
          'Renseignez un texte alternatif pour chaque photographie avant publication.'
        );
      }
      const payload = {
        title: next.title,
        domain: next.domain,
        description: next.description,
        beneficiary: next.beneficiary || undefined,
        procedure: next.procedure || undefined,
        location: next.location || undefined,
        execution: next.execution,
        validation: next.validation,
        published: next.published,
        photos: next.photos,
        documents: next.documents,
      };
      const saved = next.id
        ? await updateReference(next.id, payload)
        : await createReference(payload);
      setReferences((prev) => {
        const exists = prev.some((r) => r.id === saved.id);
        return exists ? prev.map((r) => (r.id === saved.id ? saved : r)) : [saved, ...prev];
      });
      setForm(toForm(saved));
      showNotification('success', toast);
      return true;
    } catch (err: any) {
      const message = err.message || 'Enregistrement impossible.';
      setFormError(message);
      showNotification('error', message);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!form) return;
    await persist({ ...form, published: false }, 'Référence enregistrée (non publiée).');
  };

  const handlePublish = async () => {
    if (!form) return;
    await persist(
      { ...form, validation: 'valide', published: true },
      'Référence validée et publiée.'
    );
  };

  const handleListUnpublish = async (ref: ExperienceReference) => {
    await persist(toForm(ref), 'Référence dépubliée.');
  };

  const handleListPublish = async (ref: ExperienceReference) => {
    const next = { ...toForm(ref), validation: 'valide' as ExperienceValidation, published: true };
    await persist(next, 'Référence validée et publiée.');
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsSaving(true);
    try {
      await deleteReference(deleteTarget.id);
      setReferences((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      showNotification('success', 'Référence supprimée.');
      setDeleteTarget(null);
      if (form?.id === deleteTarget.id) setForm(null);
    } catch (err: any) {
      showNotification('error', err.message || 'Suppression impossible.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const photo = await uploadExperiencePhoto(file);
        setForm((prev) =>
          prev ? { ...prev, photos: [...prev.photos, { ...photo, alt: '' }] } : prev
        );
      }
      showNotification(
        'success',
        'Photographie ajoutée. Renseignez son texte alternatif puis enregistrez.'
      );
    } catch (err: any) {
      showNotification('error', err.message || 'Téléversement impossible.');
    } finally {
      setIsUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handleDocumentUpload = async (files: FileList | null) => {
    if (!files || !files.length || !form) return;
    setIsUploading(true);
    try {
      const added: ExperienceDocument[] = [];
      for (const file of Array.from(files)) {
        added.push(await uploadExperienceDocument(file, docVisibility));
      }
      setForm((prev) => (prev ? { ...prev, documents: [...prev.documents, ...added] } : prev));
      showNotification(
        'success',
        docVisibility === 'prive'
          ? 'Document ajouté en privé (non publié).'
          : 'Document public ajouté.'
      );
    } catch (err: any) {
      showNotification('error', err.message || 'Téléversement impossible.');
    } finally {
      setIsUploading(false);
      if (docInputRef.current) docInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-[var(--night)]">
            <Briefcase className="h-6 w-6 text-[var(--cyan-deep)]" />
            Expérience entrepreneuriale
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Références BTP, matériel informatique et fournitures vivrières. Seules les références
            validées et publiées apparaissent sur le site public.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={load}
            disabled={isLoading}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 text-sm font-bold text-[var(--night)] hover:bg-[var(--mist)] disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
          <button
            type="button"
            onClick={() => {
              setForm({ ...EMPTY_FORM });
              setFormError(null);
            }}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--night)] px-4 text-sm font-bold text-white hover:bg-[var(--night-2)]"
          >
            <Plus className="h-4 w-4" />
            Nouvelle référence
          </button>
        </div>
      </div>

      {/* Indicateurs internes (administration uniquement) */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Références totales', value: stats.total, icon: Briefcase },
          { label: 'Publiées', value: stats.published, icon: CheckCircle2 },
          { label: 'En attente de vérification', value: stats.pending, icon: Clock },
          { label: 'Brouillons', value: stats.drafts, icon: PencilLine },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-[var(--line)] bg-white p-4 shadow-xs"
          >
            <div className="flex items-center gap-2 text-[var(--muted)]">
              <item.icon className="h-4 w-4" />
              <span className="text-[11px] font-bold uppercase tracking-wider">{item.label}</span>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-[var(--night)]">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-white p-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-1.5">
          {[{ key: 'all', label: 'Tous les domaines' }, ...EXPERIENCE_DOMAINS.map((d) => ({ key: d.key, label: d.shortLabel }))].map(
            (tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setDomainFilter(tab.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  domainFilter === tab.key
                    ? 'bg-[var(--night)] text-white'
                    : 'bg-[var(--mist)] text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            )
          )}
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold text-[var(--night)] outline-none focus:ring-2 focus:ring-[var(--cyan)]"
        >
          <option value="all">Tous les statuts</option>
          <option value="published">Publiées</option>
          <option value="unpublished">Non publiées</option>
          <option value="en_attente">En attente de vérification</option>
          <option value="brouillon">Brouillons</option>
        </select>
        <div className="relative sm:ml-auto sm:min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="w-full rounded-lg border border-[var(--line)] bg-white py-2 pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-[var(--cyan)]"
          />
        </div>
      </div>

      {/* Liste */}
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-[var(--line)] bg-white p-10 text-sm font-semibold text-[var(--muted)]">
          <Loader2 className="h-5 w-5 animate-spin" />
          Chargement des références…
        </div>
      ) : loadError ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-bold">Impossible de charger les références.</p>
          <p className="mt-1">{loadError}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white p-10 text-center text-sm text-[var(--muted)]">
          Aucune référence ne correspond aux filtres.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const label = experienceStatusLabel(r);
            const StatusIcon = STATUS_ICONS[label] || PencilLine;
            const docsPrivate = r.documents.filter((d) => d.visibility === 'prive').length;
            return (
              <div
                key={r.id}
                className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-white p-4 shadow-xs lg:flex-row lg:items-center"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-[var(--mist)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--cyan-deep)]">
                      {EXPERIENCE_DOMAINS.find((d) => d.key === r.domain)?.shortLabel}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold ${
                        STATUS_STYLES[label] || 'bg-slate-100 text-slate-700 border-slate-300'
                      }`}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {label}
                    </span>
                    {docsPrivate > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                        <Lock className="h-3 w-3" />
                        {docsPrivate} doc. privé{docsPrivate > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-1.5 font-semibold leading-snug text-[var(--night)]">
                    {r.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">
                    {r.beneficiary || 'Bénéficiaire non renseigné'}
                    {r.procedure ? ` · ${r.procedure}` : ''} · modifié le{' '}
                    {new Date(r.updatedAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setForm(toForm(r));
                      setFormError(null);
                    }}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[var(--line)] px-3 text-xs font-bold text-[var(--night)] hover:bg-[var(--mist)]"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Modifier
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreview(toForm(r))}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[var(--line)] px-3 text-xs font-bold text-[var(--night)] hover:bg-[var(--mist)]"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Aperçu
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => (r.published ? handleListUnpublish(r) : handleListPublish(r))}
                    className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold disabled:opacity-50 ${
                      r.published
                        ? 'border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                    }`}
                  >
                    {r.published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {r.published ? 'Dépublier' : 'Publier'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(r)}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-700 hover:bg-red-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Supprimer
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Éditeur */}
      {form && (
        <div className="fixed inset-0 z-[95] flex items-start justify-center overflow-y-auto bg-slate-950/70 p-0 sm:p-6 backdrop-blur-sm">
          <div className="my-0 sm:my-4 w-full sm:max-w-3xl rounded-none sm:rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[var(--line)] bg-white/95 px-4 py-3.5 backdrop-blur sm:px-6">
              <h3 className="font-display text-lg font-bold text-[var(--night)]">
                {form.id ? 'Modifier la référence' : 'Nouvelle référence'}
              </h3>
              <button
                type="button"
                onClick={() => setForm(null)}
                aria-label="Fermer"
                className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--line)] hover:bg-[var(--mist)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 p-4 sm:p-6">
              {formError && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="sm:col-span-2 block">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                    Intitulé de la référence *
                  </span>
                  <input
                    value={form.title}
                    onChange={(e) => update('title', e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[var(--line)] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--cyan)]"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                    Domaine d’activité *
                  </span>
                  <select
                    value={form.domain}
                    onChange={(e) =>
                      update('domain', e.target.value as ExperienceReference['domain'])
                    }
                    className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--cyan)]"
                  >
                    {EXPERIENCE_DOMAINS.map((d) => (
                      <option key={d.key} value={d.key}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                    Bénéficiaire / organisme
                  </span>
                  <input
                    value={form.beneficiary}
                    onChange={(e) => update('beneficiary', e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[var(--line)] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--cyan)]"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                    Procédure de passation (si connue)
                  </span>
                  <input
                    value={form.procedure}
                    onChange={(e) => update('procedure', e.target.value)}
                    placeholder="Appel d’offres, DC, DRP…"
                    className="mt-1 w-full rounded-xl border border-[var(--line)] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--cyan)]"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                    Localisation
                  </span>
                  <input
                    value={form.location}
                    onChange={(e) => update('location', e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[var(--line)] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--cyan)]"
                  />
                </label>

                <label className="sm:col-span-2 block">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                    Description des prestations documentées *
                  </span>
                  <textarea
                    value={form.description}
                    onChange={(e) => update('description', e.target.value)}
                    rows={4}
                    className="mt-1 w-full rounded-xl border border-[var(--line)] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--cyan)]"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                    État d’exécution
                  </span>
                  <select
                    value={form.execution}
                    onChange={(e) =>
                      update('execution', e.target.value as ExperienceReference['execution'])
                    }
                    className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--cyan)]"
                  >
                    {(
                      Object.keys(EXPERIENCE_EXECUTION_LABELS) as ExperienceReference['execution'][]
                    ).map((key) => (
                      <option key={key} value={key}>
                        {EXPERIENCE_EXECUTION_LABELS[key]}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                    Statut de validation
                  </span>
                  <select
                    value={form.validation}
                    onChange={(e) => {
                      const value = e.target.value as ExperienceValidation;
                      setForm((prev) =>
                        prev
                          ? {
                              ...prev,
                              validation: value,
                              published: value === 'valide' ? prev.published : false,
                            }
                          : prev
                      );
                    }}
                    className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--cyan)]"
                  >
                    {(
                      Object.keys(EXPERIENCE_VALIDATION_LABELS) as ExperienceValidation[]
                    ).map((key) => (
                      <option key={key} value={key}>
                        {EXPERIENCE_VALIDATION_LABELS[key]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Photographies */}
              <section className="rounded-2xl border border-[var(--line)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="flex items-center gap-2 text-sm font-bold text-[var(--night)]">
                      <ImageIcon className="h-4 w-4 text-[var(--cyan-deep)]" />
                      Photographies authentiques
                    </h4>
                    <p className="text-[11px] text-[var(--muted)]">
                      Uniquement des photos réelles fournies par ALFFA NIGER. Renseignez un texte
                      alternatif descriptif pour chacune.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => photoInputRef.current?.click()}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[var(--line)] bg-white px-3 text-xs font-bold text-[var(--night)] hover:bg-[var(--mist)] disabled:opacity-50"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Ajouter
                  </button>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    hidden
                    onChange={(e) => handlePhotoUpload(e.target.files)}
                  />
                </div>

                {form.photos.length === 0 ? (
                  <p className="mt-3 rounded-xl border border-dashed border-[var(--line)] bg-[var(--mist)] p-4 text-center text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                    Aucune photographie — l’emplacement neutre sera affiché sur le site
                  </p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {form.photos.map((photo, index) => (
                      <div
                        key={photo.id}
                        className="flex flex-col gap-3 rounded-xl border border-[var(--line)] p-3 sm:flex-row"
                      >
                        <img
                          src={photo.url}
                          alt={photo.alt || 'Photographie'}
                          className="h-24 w-full sm:w-32 rounded-lg object-cover border border-[var(--line)]"
                        />
                        <div className="flex-1 space-y-2">
                          <input
                            value={photo.alt}
                            onChange={(e) => {
                              const alt = e.target.value;
                              setForm((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      photos: prev.photos.map((p) =>
                                        p.id === photo.id ? { ...p, alt } : p
                                      ),
                                    }
                                  : prev
                              );
                            }}
                            placeholder="Texte alternatif descriptif (obligatoire avant publication)"
                            className="w-full rounded-lg border border-[var(--line)] px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-[var(--cyan)]"
                          />
                          <input
                            value={photo.caption || ''}
                            onChange={(e) => {
                              const caption = e.target.value;
                              setForm((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      photos: prev.photos.map((p) =>
                                        p.id === photo.id ? { ...p, caption } : p
                                      ),
                                    }
                                  : prev
                              );
                            }}
                            placeholder="Légende factuelle (facultatif)"
                            className="w-full rounded-lg border border-[var(--line)] px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-[var(--cyan)]"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    photos: prev.photos.filter((p) => p.id !== photo.id),
                                  }
                                : prev
                            )
                          }
                          aria-label={`Retirer la photographie ${index + 1}`}
                          className="self-start rounded-lg border border-red-200 bg-red-50 p-2 text-red-700 hover:bg-red-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Documents */}
              <section className="rounded-2xl border border-[var(--line)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="flex items-center gap-2 text-sm font-bold text-[var(--night)]">
                      <FileText className="h-4 w-4 text-[var(--cyan-deep)]" />
                      Documents justificatifs
                    </h4>
                    <p className="text-[11px] text-[var(--muted)]">
                      Privé par défaut. Publiez uniquement des extraits expurgés (prix, signatures,
                      coordonnées masqués).
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={docVisibility}
                      onChange={(e) => setDocVisibility(e.target.value as 'prive' | 'public')}
                      className="rounded-lg border border-[var(--line)] bg-white px-2.5 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-[var(--cyan)]"
                    >
                      <option value="prive">Privé (interne)</option>
                      <option value="public">Public (autorisé)</option>
                    </select>
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => docInputRef.current?.click()}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[var(--line)] bg-white px-3 text-xs font-bold text-[var(--night)] hover:bg-[var(--mist)] disabled:opacity-50"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Joindre
                    </button>
                    <input
                      ref={docInputRef}
                      type="file"
                      accept="application/pdf,image/png,image/jpeg,image/webp"
                      multiple
                      hidden
                      onChange={(e) => handleDocumentUpload(e.target.files)}
                    />
                  </div>
                </div>

                {form.documents.length === 0 ? (
                  <p className="mt-3 rounded-xl border border-dashed border-[var(--line)] bg-[var(--mist)] p-4 text-center text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                    Aucun document joint
                  </p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {form.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex flex-col gap-2 rounded-xl border border-[var(--line)] p-3 sm:flex-row sm:items-center"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          {doc.visibility === 'prive' ? (
                            <Lock className="h-4 w-4 shrink-0 text-slate-600" />
                          ) : (
                            <Unlock className="h-4 w-4 shrink-0 text-emerald-600" />
                          )}
                          <input
                            value={doc.name}
                            onChange={(e) => {
                              const name = e.target.value;
                              setForm((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      documents: prev.documents.map((d) =>
                                        d.id === doc.id ? { ...d, name } : d
                                      ),
                                    }
                                  : prev
                              );
                            }}
                            className="min-w-0 flex-1 rounded-lg border border-[var(--line)] px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-[var(--cyan)]"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await openExperienceDocument({
                                  url: doc.url,
                                  name: doc.name,
                                  visibility: doc.visibility,
                                });
                              } catch (err: any) {
                                showNotification('error', err.message || 'Accès refusé.');
                              }
                            }}
                            title="Consulter le document (accès authentifié)"
                            className="rounded-lg border border-[var(--line)] bg-white p-2 text-[var(--night)] hover:bg-[var(--mist)]"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <select
                            value={doc.visibility}
                            onChange={(e) => {
                              const visibility = e.target.value as 'prive' | 'public';
                              setForm((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      documents: prev.documents.map((d) =>
                                        d.id === doc.id ? { ...d, visibility } : d
                                      ),
                                    }
                                  : prev
                              );
                            }}
                            className="rounded-lg border border-[var(--line)] bg-white px-2 py-2 text-xs font-semibold outline-none"
                          >
                            <option value="prive">Privé</option>
                            <option value="public">Public</option>
                          </select>
                          <button
                            type="button"
                            onClick={() =>
                              setForm((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      documents: prev.documents.filter((d) => d.id !== doc.id),
                                    }
                                  : prev
                              )
                            }
                            aria-label={`Retirer le document ${doc.name}`}
                            className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-700 hover:bg-red-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <p className="rounded-xl border border-[var(--line)] bg-[var(--mist)] p-3 text-[11px] text-[var(--muted)] leading-relaxed">
                Ne publiez aucun document confidentiel, signature ou cachet sans autorisation. Un bon
                de commande n’est pas la preuve d’une prestation achevée : laissez l’état
                d’exécution sur « Référence documentée » tant que la réalisation n’est pas confirmée.
              </p>
            </div>

            <div className="sticky bottom-0 flex flex-wrap items-center gap-2 border-t border-[var(--line)] bg-slate-50 p-4 sm:p-6">
              {form.id && (
                <button
                  type="button"
                  onClick={() => setPreview(form)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-[var(--night)] hover:bg-slate-100"
                >
                  <Eye className="h-4 w-4" />
                  Prévisualiser
                </button>
              )}
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveDraft}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--night)]/20 bg-white px-4 text-xs font-bold text-[var(--night)] hover:bg-[var(--mist)] disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                Enregistrer
              </button>
              {form.published ? (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => persist({ ...form, published: false }, 'Référence dépubliée.')}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 text-xs font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                >
                  <EyeOff className="h-4 w-4" />
                  Dépublier
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSaving || !form.id}
                  title={!form.id ? 'Enregistrez la référence avant de la publier' : undefined}
                  onClick={handlePublish}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Valider & publier
                </button>
              )}
              <button
                type="button"
                onClick={() => setForm(null)}
                className="ml-auto inline-flex min-h-11 items-center rounded-xl px-4 text-xs font-bold text-slate-600 hover:bg-slate-200"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prévisualisation */}
      {preview && (
        <div className="fixed inset-0 z-[96] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                Prévisualisation — rendu public
              </span>
              <button
                type="button"
                onClick={() => setPreview(null)}
                aria-label="Fermer la prévisualisation"
                className="rounded-lg p-2 hover:bg-[var(--mist)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[75vh] space-y-4 overflow-y-auto p-5">
              <span className="inline-flex rounded-full bg-[var(--mist)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--cyan-deep)]">
                {EXPERIENCE_DOMAINS.find((d) => d.key === preview.domain)?.label}
              </span>
              <h3 className="font-display text-xl font-bold leading-snug text-[var(--night)]">
                {preview.title || 'Intitulé non renseigné'}
              </h3>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--cyan-deep)]">
                {preview.beneficiary || 'Bénéficiaire non renseigné'}
              </p>
              {preview.photos[0] ? (
                <img
                  src={preview.photos[0].url}
                  alt={preview.photos[0].alt || 'Photographie'}
                  className="w-full rounded-2xl border border-[var(--line)] object-cover max-h-64"
                />
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--mist)] p-6 text-center text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Aucune photographie authentique
                </div>
              )}
              <div className="grid gap-2 rounded-xl border border-[var(--line)] p-3 text-xs sm:grid-cols-2">
                <span>
                  <b>Procédure :</b> {preview.procedure || 'non précisée'}
                </span>
                <span>
                  <b>État :</b> {EXPERIENCE_EXECUTION_LABELS[preview.execution]}
                </span>
                <span>
                  <b>Localisation :</b> {preview.location || 'non précisée'}
                </span>
                <span>
                  <b>Statut :</b>{' '}
                  {preview.published ? 'Publié' : EXPERIENCE_VALIDATION_LABELS[preview.validation]}
                </span>
              </div>
              <p className="whitespace-pre-line rounded-xl bg-[var(--mist)] p-4 text-sm leading-relaxed text-[var(--ink)]">
                {preview.description || 'Description non renseignée.'}
              </p>
              <p className="text-[11px] text-[var(--muted)]">
                Documents publics :{' '}
                {preview.documents.filter((d) => d.visibility === 'public').length} · privés :{' '}
                {preview.documents.filter((d) => d.visibility === 'prive').length}
              </p>
              {!preview.published && (
                <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900">
                  Cette référence n’est pas publiée : elle n’apparaît pas sur le site public.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Suppression */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[97] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-50 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-display text-lg font-bold text-[var(--night)]">
                  Supprimer cette référence ?
                </h3>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  « {deleteTarget.title} » sera définitivement retirée. Cette action est
                  irréversible.
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-700 hover:bg-slate-100"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleDelete}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
