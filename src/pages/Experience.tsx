import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  HardHat,
  Laptop,
  Wheat,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Camera,
  CheckCircle2,
  FileText,
  Filter,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  Mail,
  ShieldCheck,
  X,
  AlertCircle,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useSeo } from '../utils/seo';
import { canonicalUrl, href, scrollToTop } from '../utils/router';
import { normalizeWhatsApp } from '../utils/format';
import {
  ExperienceDomain,
  ExperienceReference,
  EXPERIENCE_DOMAINS,
  EXPERIENCE_EXECUTION_LABELS,
  domainLabel,
  experienceStatusLabel,
} from '../types/experience';
import { fetchPublicReferences, ReferencesSource } from '../services/experience';
import { useDialogBehavior } from '../utils/dialog';
import {
  ExperiencePhotoPlaceholder,
  ExperienceReferenceCard,
} from '../components/experience/ExperienceReferenceCard';

const DOMAIN_ICONS: Record<ExperienceDomain, React.ComponentType<{ className?: string }>> = {
  btp: HardHat,
  informatique: Laptop,
  vivrier: Wheat,
};

/** Illustrations vectorielles sobres (aucune photographie de chantier inventée). */
const DOMAIN_ILLUSTRATIONS: Record<ExperienceDomain, string> = {
  btp: '/images/experience/btp.svg',
  informatique: '/images/experience/informatique.svg',
  vivrier: '/images/experience/vivrier.svg',
};

const DOMAIN_INTROS: Record<ExperienceDomain, string> = {
  btp:
    'Ce domaine regroupe les interventions et prestations documentées d’ALFFA NIGER dans les travaux de construction, de clôture et de réhabilitation de bâtiments et d’infrastructures institutionnelles.',
  informatique:
    'ALFFA NIGER dispose de références en matière de fourniture et de livraison de matériel informatique et d’autres fournitures destinées à des organismes, institutions et partenaires.',
  vivrier:
    'ALFFA NIGER intervient également dans la fourniture de produits vivriers, conformément aux commandes et prestations documentées.',
};

type FilterKey = 'all' | ExperienceDomain;

export function Experience() {
  const { settings } = useStore();
  const [references, setReferences] = useState<ExperienceReference[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [source, setSource] = useState<ReferencesSource>('serveur');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [selected, setSelected] = useState<ExperienceReference | null>(null);
  const [activePhoto, setActivePhoto] = useState(0);
  const sectionsRef = useRef<Record<string, HTMLDivElement | null>>({});

  useSeo({
    title: 'Expérience entrepreneuriale | ALFFA NIGER',
    description:
      'Découvrez les références professionnelles d’ALFFA NIGER dans le BTP, la fourniture de matériel informatique et les fournitures vivrières.',
    canonical: canonicalUrl(settings, '/experience-entrepreneuriale'),
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Expérience entrepreneuriale | ALFFA NIGER',
      description:
        'Références professionnelles d’ALFFA NIGER : BTP, matériel informatique et fournitures, fournitures vivrières.',
      url: canonicalUrl(settings, '/experience-entrepreneuriale'),
      isPartOf: {
        '@type': 'WebSite',
        name: 'ALFFA NIGER',
        url: (settings.siteUrl || 'https://alffaniger.com').replace(/\/$/, ''),
      },
    },
  });

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    fetchPublicReferences()
      .then(({ references: list, source }) => {
        if (cancelled) return;
        setReferences(list);
        setSource(source);
      })
      .catch((err: Error) => {
        if (!cancelled) setLoadError(err.message || 'Chargement impossible.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rawWa = settings.whatsappElectronique || settings.whatsappTextile || '22796222310';
  const waNorm = normalizeWhatsApp(rawWa);
  const waMessage = encodeURIComponent(
    'Bonjour ALFFA NIGER, je souhaite obtenir des informations sur vos références professionnelles.'
  );

  const counts = useMemo(() => {
    const base: Record<FilterKey, number> = {
      all: references.length,
      btp: 0,
      informatique: 0,
      vivrier: 0,
    };
    references.forEach((r) => {
      if (r.domain in base) base[r.domain] += 1;
    });
    return base;
  }, [references]);

  const visibleReferences = useMemo(
    () => (filter === 'all' ? references : references.filter((r) => r.domain === filter)),
    [references, filter]
  );

  const goToDomain = useCallback((domain: ExperienceDomain) => {
    setFilter(domain);
    window.setTimeout(() => {
      const node = sectionsRef.current[domain];
      if (node) {
        const top = node.getBoundingClientRect().top + window.scrollY - 140;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    }, 60);
  }, []);

  const openReference = (reference: ExperienceReference) => {
    setSelected(reference);
    setActivePhoto(0);
  };

  useDialogBehavior(Boolean(selected), () => setSelected(null));

  const publicDocuments = selected
    ? (selected.documents || []).filter((d) => d.visibility === 'public')
    : [];

  return (
    <main className="bg-white text-[var(--night)]">
      {/* 1. En-tête éditorial */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-[var(--night)] to-[var(--night)] text-white py-16 sm:py-24 border-b border-white/10">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#13B8CE_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-3xl">
            <a
              href={href('/')}
              onClick={() => scrollToTop(true)}
              className="inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold text-white/60 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan)]"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Retour à l’accueil</span>
            </a>

            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--cyan)]/20 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[var(--cyan)] border border-[var(--cyan)]/30">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Références professionnelles</span>
            </div>

            <h1 className="mt-4 font-display text-4xl sm:text-5xl lg:text-6xl font-bold uppercase tracking-tight text-white leading-[1.08]">
              Notre expérience <span className="text-[var(--cyan)]">entrepreneuriale</span>
            </h1>

            <p className="mt-6 text-base sm:text-lg text-white/80 leading-relaxed">
              À travers ses différentes interventions, ALFFA Niger développe une expérience
              diversifiée dans plusieurs secteurs d’activité. L’entreprise accompagne les
              institutions publiques, les organisations internationales et ses partenaires dans la
              réalisation de projets de construction, la fourniture de matériel informatique et
              l’approvisionnement en produits vivriers.
            </p>

            <div className="mt-8 flex flex-wrap gap-2.5">
              {EXPERIENCE_DOMAINS.map((domain) => {
                const Icon = DOMAIN_ICONS[domain.key];
                return (
                  <button
                    key={domain.key}
                    type="button"
                    onClick={() => goToDomain(domain.key)}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white/90 transition hover:border-[var(--cyan)]/60 hover:bg-white/10"
                  >
                    <Icon className="h-4 w-4 text-[var(--cyan)]" />
                    <span>{domain.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Les trois domaines */}
      <section className="bg-[var(--mist)] border-b border-[var(--line)] py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-3xl">
            <h2 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-tight text-[var(--night)]">
              Nos domaines d’activité
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[var(--muted)] leading-relaxed">
              Trois secteurs d’intervention, présentés avec les seules informations documentées et
              vérifiables.
            </p>
          </div>

          <div className="mt-8 grid gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {EXPERIENCE_DOMAINS.map((domain) => {
              const Icon = DOMAIN_ICONS[domain.key];
              return (
                <article
                  key={domain.key}
                  className="flex flex-col overflow-hidden rounded-[20px] border border-[var(--line)] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <img
                    src={DOMAIN_ILLUSTRATIONS[domain.key]}
                    alt={`Illustration — ${domain.label}`}
                    width={640}
                    height={400}
                    loading="lazy"
                    className="aspect-[8/5] w-full object-cover"
                  />
                  <div className="flex flex-1 flex-col p-6">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--night)] text-[var(--cyan)]">
                      <Icon className="h-6 w-6" />
                    </span>
                    <h3 className="mt-4 font-display text-xl font-semibold leading-snug text-[var(--night)]">
                      {domain.label}
                    </h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--muted)]">
                      {domain.summary}
                    </p>
                    <button
                      type="button"
                      onClick={() => goToDomain(domain.key)}
                      className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--night)] px-4 text-sm font-bold text-white transition hover:bg-[var(--night-2)]"
                    >
                      <span>Découvrir nos références</span>
                      <ArrowRight className="h-4 w-4 text-[var(--cyan)]" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Note de transparence : catalogue intégré au build (hébergement statique) */}
      {!isLoading && !loadError && source === 'catalogue-integre' && (
        <div className="border-b border-[var(--line)] bg-[var(--mist)]">
          <div className="mx-auto flex max-w-7xl items-start gap-2 px-4 py-2.5 text-[11px] leading-relaxed text-[var(--muted)] sm:px-6">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--cyan-deep)]" aria-hidden="true" />
            <span>
              Références publiées par ALFFA NIGER à la date de mise en ligne du site. Pour toute
              pièce justificative complémentaire, contactez notre direction.
            </span>
          </div>
        </div>
      )}

      {/* 3. Filtres */}
      <div className="sticky top-[70px] sm:top-[74px] z-30 border-b border-[var(--line)] bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
            <span className="hidden sm:inline-flex items-center gap-1.5 pr-2 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
              <Filter className="h-3.5 w-3.5" />
              Filtrer
            </span>
            {(
              [
                { key: 'all' as FilterKey, label: 'Tous les domaines' },
                ...EXPERIENCE_DOMAINS.map((d) => ({
                  key: d.key as FilterKey,
                  label: d.shortLabel,
                })),
              ]
            ).map((tab) => {
              const active = filter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilter(tab.key)}
                  className={`whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-bold transition inline-flex items-center gap-1.5 ${
                    active
                      ? 'bg-[var(--night)] text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                      active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {counts[tab.key]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Références par domaine */}
      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 space-y-16 sm:space-y-20">
          {isLoading && (
            <div className="flex items-center justify-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--mist)] p-10 text-sm font-semibold text-[var(--muted)]">
              <Loader2 className="h-5 w-5 animate-spin text-[var(--cyan-deep)]" />
              Chargement des références publiées…
            </div>
          )}

          {!isLoading && loadError && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-bold">Les références ne peuvent pas être chargées pour le moment.</p>
                <p className="mt-1 text-amber-800/90">
                  Merci de réessayer ultérieurement ou de nous contacter directement.
                </p>
              </div>
            </div>
          )}

          {!isLoading && !loadError && visibleReferences.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--mist)] p-10 text-center">
              <p className="font-display text-lg font-semibold text-[var(--night)]">
                Aucune référence publiée dans cette catégorie pour le moment.
              </p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Nos références sont publiées après validation des pièces justificatives.
              </p>
            </div>
          )}

          {!isLoading &&
            !loadError &&
            EXPERIENCE_DOMAINS.filter((d) => visibleReferences.some((r) => r.domain === d.key)).map(
              (domain) => {
                const items = visibleReferences.filter((r) => r.domain === domain.key);
                const Icon = DOMAIN_ICONS[domain.key];
                return (
                  <div
                    key={domain.key}
                    id={`experience-${domain.anchor}`}
                    ref={(node) => {
                      sectionsRef.current[domain.key] = node;
                    }}
                    className="scroll-mt-32"
                  >
                    <div className="flex flex-col gap-3 border-b border-[var(--line)] pb-5 sm:flex-row sm:items-end sm:justify-between">
                      <div className="max-w-3xl">
                        <span className="inline-flex items-center gap-2 rounded-full bg-[var(--mist)] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--cyan-deep)] border border-[var(--line)]">
                          <Icon className="h-3.5 w-3.5" />
                          {domain.shortLabel}
                        </span>
                        <h2 className="mt-3 font-display text-2xl sm:text-3xl font-bold leading-tight text-[var(--night)]">
                          {domain.label}
                        </h2>
                        <p className="mt-3 text-sm text-[var(--muted)] leading-relaxed">
                          {DOMAIN_INTROS[domain.key]}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                        {items.length} référence{items.length > 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="mt-6 grid gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {items.map((reference) => (
                        <ExperienceReferenceCard
                          key={reference.id}
                          reference={reference}
                          onOpen={openReference}
                        />
                      ))}
                    </div>
                  </div>
                );
              }
            )}
        </div>
      </section>

      {/* 5. Transparence documentaire */}
      <section className="bg-[var(--mist)] border-y border-[var(--line)] py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-[var(--night)]">
                Transparence & documents
              </h2>
              <p className="mt-3 text-sm text-[var(--muted)] leading-relaxed">
                Nos références sont présentées avec rigueur. Seules les photographies authentiques
                fournies par ALFFA NIGER sont publiées ; en leur absence, un emplacement neutre est
                affiché.
              </p>
            </div>
            <ul className="lg:col-span-2 grid gap-3 sm:grid-cols-2">
              {[
                {
                  icon: Camera,
                  text: 'Aucune image générée ou empruntée à Internet n’est présentée comme une réalisation de l’entreprise.',
                },
                {
                  icon: FileText,
                  text: 'Les pièces justificatives restent privées par défaut ; seuls les extraits autorisés sont publiés.',
                },
                {
                  icon: CheckCircle2,
                  text: 'Une référence n’est publiée qu’après validation par la direction.',
                },
                {
                  icon: Building2,
                  text: 'Les noms des bénéficiaires ne sont publiés que lorsqu’ils sont autorisés.',
                },
              ].map((item) => (
                <li
                  key={item.text}
                  className="flex items-start gap-3 rounded-2xl border border-[var(--line)] bg-white p-4 text-sm text-[var(--ink)] leading-relaxed"
                >
                  <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--cyan-deep)]" />
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 6. Contact */}
      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="rounded-3xl bg-gradient-to-br from-[var(--night)] to-[var(--night-2)] p-8 sm:p-12 text-white shadow-xl grid gap-8 lg:grid-cols-2 items-center">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--cyan)]/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[var(--cyan)]">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Contact professionnel</span>
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold uppercase text-white leading-tight">
                Consulter ALFFA NIGER pour vos marchés
              </h2>
              <p className="text-sm sm:text-base text-white/80 leading-relaxed font-light">
                Nous nous tenons à la disposition des administrations, organismes et partenaires
                pour l’étude de vos dossiers et la mise à disposition de nos références
                professionnelles.
              </p>

              <div className="grid gap-3 sm:grid-cols-2 pt-2 text-xs">
                <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 text-[var(--cyan)] shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-[11px] font-bold text-white/50 uppercase">
                      Siège
                    </span>
                    <span className="font-semibold text-white">
                      {settings.address || 'Niamey, République du Niger'}
                    </span>
                  </div>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-start gap-2.5">
                  <Phone className="h-4 w-4 text-[var(--cyan)] shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-[11px] font-bold text-white/50 uppercase">
                      Téléphone
                    </span>
                    <span className="font-semibold text-white">
                      {settings.phone || `+${waNorm}`}
                    </span>
                  </div>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-start gap-2.5 sm:col-span-2">
                  <Mail className="h-4 w-4 text-[var(--cyan)] shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-[11px] font-bold text-white/50 uppercase">
                      Courrier officiel
                    </span>
                    <span className="font-semibold text-white">
                      {settings.email || 'contact@alffaniger.com'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white/10 border border-white/15 p-6 sm:p-8 backdrop-blur-md flex flex-col justify-center space-y-4">
              <h3 className="font-display text-2xl font-bold uppercase text-white">
                Échanger avec notre direction
              </h3>
              <p className="text-xs sm:text-sm text-white/80 leading-relaxed font-light">
                Demandez la communication de nos références documentées ou sollicitez une
                proposition adaptée à votre besoin.
              </p>
              <a
                href={`https://wa.me/${waNorm}?text=${waMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-14 items-center justify-center gap-2.5 rounded-xl bg-[var(--cyan)] px-6 text-base font-bold text-[var(--night)] hover:bg-[#22c7dc] shadow-lg transition"
              >
                <MessageCircle className="h-5 w-5" />
                <span>Échanger sur WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Retour à l'accueil */}
      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <a
          href={href('/')}
          onClick={() => scrollToTop(true)}
          className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-5 text-sm font-bold text-[var(--night)] shadow-xs transition hover:border-[var(--cyan)] hover:bg-[var(--mist)]"
        >
          <ArrowLeft className="h-4 w-4 text-[var(--cyan-deep)]" aria-hidden="true" />
          <span>Retour à l’accueil</span>
        </a>
      </div>

      {/* 8. Fiche détaillée */}
      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={selected.title}
          className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-sm p-0 sm:p-6"
          onClick={() => setSelected(null)}
        >
          <div
            className="relative w-full sm:max-w-3xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[var(--line)] bg-white/95 px-4 py-3.5 sm:px-6 backdrop-blur">
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--mist)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--cyan-deep)]">
                  {domainLabel(selected.domain)}
                </span>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  {experienceStatusLabel(selected)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Fermer la fiche"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--line)] text-[var(--night)] hover:bg-[var(--mist)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-5">
              <h3 className="font-display text-xl sm:text-2xl font-bold leading-snug text-[var(--night)]">
                {selected.title}
              </h3>

              {/* Photographies authentiques */}
              {selected.photos.length > 0 ? (
                <div className="space-y-3">
                  <img
                    src={selected.photos[Math.min(activePhoto, selected.photos.length - 1)].url}
                    alt={
                      selected.photos[Math.min(activePhoto, selected.photos.length - 1)].alt ||
                      `Photographie authentique — ${selected.title}`
                    }
                    className="w-full rounded-2xl border border-[var(--line)] object-cover max-h-[380px]"
                  />
                  {selected.photos.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {selected.photos.map((photo, index) => (
                        <button
                          key={photo.id}
                          type="button"
                          onClick={() => setActivePhoto(index)}
                          className={`h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                            index === activePhoto
                              ? 'border-[var(--cyan)]'
                              : 'border-transparent opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img
                            src={photo.url}
                            alt={photo.alt || `Photographie ${index + 1}`}
                            className="h-full w-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <ExperiencePhotoPlaceholder label="Photographies authentiques non encore publiées" />
              )}

              <div className="grid gap-3 rounded-2xl border border-[var(--line)] p-4 sm:grid-cols-2 text-xs">
                {selected.beneficiary && (
                  <div>
                    <span className="block text-[11px] font-bold uppercase text-[var(--muted)]">
                      Bénéficiaire
                    </span>
                    <span className="font-semibold text-[var(--night)]">
                      {selected.beneficiary}
                    </span>
                  </div>
                )}
                {selected.location && (
                  <div>
                    <span className="block text-[11px] font-bold uppercase text-[var(--muted)]">
                      Localisation
                    </span>
                    <span className="font-semibold text-[var(--night)]">{selected.location}</span>
                  </div>
                )}
                {selected.procedure && (
                  <div>
                    <span className="block text-[11px] font-bold uppercase text-[var(--muted)]">
                      Procédure mentionnée
                    </span>
                    <span className="font-semibold text-[var(--night)]">{selected.procedure}</span>
                  </div>
                )}
                <div>
                  <span className="block text-[11px] font-bold uppercase text-[var(--muted)]">
                    État
                  </span>
                  <span className="font-semibold text-[var(--night)]">
                    {EXPERIENCE_EXECUTION_LABELS[selected.execution]}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                  Prestations documentées
                </h4>
                <p className="rounded-2xl bg-[var(--mist)] p-4 text-sm leading-relaxed text-[var(--ink)] whitespace-pre-line">
                  {selected.description}
                </p>
              </div>

              {publicDocuments.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--night)]">
                    Pièces autorisées à la publication
                  </h4>
                  {publicDocuments.map((doc) => (
                    <a
                      key={doc.id}
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-white p-3.5 text-xs hover:bg-[var(--mist)] transition"
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <FileText className="h-4 w-4 shrink-0 text-[var(--cyan-deep)]" />
                        <span className="truncate font-bold text-[var(--night)]">{doc.name}</span>
                      </span>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-[var(--muted)]" />
                    </a>
                  ))}
                  <p className="text-[11px] italic text-[var(--muted)]">
                    Extraits documentaires expurgés de toute mention confidentielle.
                  </p>
                </div>
              )}

              <p className="rounded-xl border border-[var(--line)] bg-[var(--mist)] p-3 text-[11px] leading-relaxed text-[var(--muted)]">
                Les informations présentées sont limitées aux éléments documentés et communiqués par
                ALFFA NIGER. Aucun montant, aucune date ni aucune quantité n’est publié sans
                justificatif vérifié.
              </p>
            </div>

            <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] bg-slate-50 p-4 sm:p-6">
              <a
                href={`https://wa.me/${waNorm}?text=${encodeURIComponent(
                  `Bonjour ALFFA NIGER, je souhaite des précisions au sujet de la référence : « ${selected.title} ».`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs transition"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Demander des précisions</span>
              </a>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="min-h-11 rounded-xl border border-slate-300 px-5 text-xs font-bold text-slate-700 hover:bg-white"
              >
                Fermer la fiche
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
