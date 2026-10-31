import React, { useState, useMemo } from 'react';
import {
  HardHat,
  Building2,
  FileCheck2,
  Clock,
  CheckCircle2,
  FileText,
  MapPin,
  Calendar,
  Building,
  Search,
  SlidersHorizontal,
  X,
  Eye,
  ExternalLink,
  MessageCircle,
  Phone,
  Mail,
  ShieldCheck,
  ArrowRight,
  Download,
  AlertCircle,
  Camera,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useSeo } from '../utils/seo';
import { canonicalUrl, href, scrollToTop } from '../utils/router';
import { normalizeWhatsApp } from '../utils/format';
import { BtpProject, BtpProjectStage } from '../types';

interface BtpProps {
  subRoute?: string;
}

const STAGE_CONFIG: Record<
  BtpProjectStage,
  { label: string; bg: string; text: string; border: string; icon: React.ComponentType<{ className?: string }> }
> = {
  realisation_achevee: {
    label: 'Réalisation achevée & réceptionnée',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    icon: CheckCircle2,
  },
  prestation_confirmee: {
    label: 'Prestation confirmée / en cours',
    bg: 'bg-cyan-50',
    text: 'text-[var(--cyan-deep)]',
    border: 'border-cyan-200',
    icon: Clock,
  },
  commande_documentee: {
    label: 'Commande documentée (Bon de commande)',
    bg: 'bg-slate-100',
    text: 'text-slate-800',
    border: 'border-slate-300',
    icon: FileText,
  },
};

export function Btp({ subRoute = '' }: BtpProps) {
  const { settings, getPublicBtpProjects } = useStore();
  const publishedProjects = getPublicBtpProjects();

  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<BtpProject | null>(null);
  const [activePhotoIdx, setActivePhotoIdx] = useState<number>(0);

  useSeo({
    title: 'ALFFA NIGER BTP | Nos réalisations',
    description:
      'Découvrez les réalisations et références professionnelles d’ALFFA NIGER dans le secteur du Bâtiment et des Travaux Publics au Niger. Prestations et commandes documentées.',
    canonical: canonicalUrl(settings, '/btp'),
  });

  const rawWa = settings.whatsappElectronique || settings.whatsappTextile || '22796222310';
  const waNorm = normalizeWhatsApp(rawWa);
  const companyPhone = settings.phone || `+${waNorm}`;
  const companyEmail = settings.email || 'contact@alffaniger.com';
  const companyAddress = settings.address || 'Niamey, République du Niger';

  // Filtered list
  const filteredProjects = useMemo(() => {
    return publishedProjects.filter((p) => {
      if (stageFilter !== 'all' && p.stage !== stageFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const haystack = [
          p.title,
          p.description,
          p.client,
          p.location,
          p.orderReference,
          p.category,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [publishedProjects, stageFilter, search]);

  // Statistics
  const counts = useMemo(() => {
    return {
      total: publishedProjects.length,
      achevees: publishedProjects.filter((p) => p.stage === 'realisation_achevee').length,
      confirmees: publishedProjects.filter((p) => p.stage === 'prestation_confirmee').length,
      commandes: publishedProjects.filter((p) => p.stage === 'commande_documentee').length,
    };
  }, [publishedProjects]);

  return (
    <main className="bg-white text-[var(--night)]">
      {/* 1. Header & Présentation */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-[var(--night)] to-[var(--night)] text-white py-16 sm:py-24 border-b border-white/10">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#13B8CE_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--cyan)]/20 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[var(--cyan)] border border-[var(--cyan)]/30">
              <HardHat className="h-3.5 w-3.5" />
              <span>Bâtiment & Travaux Publics</span>
            </div>

            <h1 className="mt-4 font-display text-4xl sm:text-5xl lg:text-6xl font-bold uppercase tracking-tight text-white leading-[1.08]">
              ALFFA NIGER <span className="text-[var(--cyan)]">BTP</span>
            </h1>

            <p className="mt-5 font-serif text-xl sm:text-2xl italic text-white/95 leading-relaxed">
              « Découvrez les réalisations et références professionnelles d’ALFFA NIGER dans le secteur du Bâtiment et des Travaux Publics. »
            </p>

            <p className="mt-4 text-sm sm:text-base text-white/75 leading-relaxed max-w-2xl">
              L'ensemble de nos références repose sur des pièces administratives et bons de commande réels.
              Chaque fiche précise avec rigueur l'état d'avancement de la prestation : commande documentée,
              prestation confirmée ou réalisation achevée.
            </p>

            {/* Repères factuels */}
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-white/15">
              <div className="rounded-xl bg-white/5 p-3.5 border border-white/10 backdrop-blur-xs">
                <span className="block text-2xl font-bold font-display text-[var(--cyan)]">
                  {counts.total}
                </span>
                <span className="text-xs text-white/70 uppercase tracking-wider font-semibold">
                  Références publiées
                </span>
              </div>
              <div className="rounded-xl bg-white/5 p-3.5 border border-white/10 backdrop-blur-xs">
                <span className="block text-2xl font-bold font-display text-emerald-400">
                  {counts.achevees}
                </span>
                <span className="text-xs text-white/70 uppercase tracking-wider font-semibold">
                  Achevées
                </span>
              </div>
              <div className="rounded-xl bg-white/5 p-3.5 border border-white/10 backdrop-blur-xs">
                <span className="block text-2xl font-bold font-display text-cyan-300">
                  {counts.confirmees}
                </span>
                <span className="text-xs text-white/70 uppercase tracking-wider font-semibold">
                  Confirmées / En cours
                </span>
              </div>
              <div className="rounded-xl bg-white/5 p-3.5 border border-white/10 backdrop-blur-xs">
                <span className="block text-2xl font-bold font-display text-amber-300">
                  {counts.commandes}
                </span>
                <span className="text-xs text-white/70 uppercase tracking-wider font-semibold">
                  Commandes documentées
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Filtres & Recherche */}
      <section className="border-b border-[var(--line)] bg-[var(--mist)] sticky top-[70px] sm:top-[74px] z-30 shadow-xs">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Onglets Statut */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {[
              { id: 'all', label: 'Toutes les références', count: counts.total },
              { id: 'realisation_achevee', label: 'Achevées', count: counts.achevees },
              { id: 'prestation_confirmee', label: 'Confirmées', count: counts.confirmees },
              { id: 'commande_documentee', label: 'Commandes documentées', count: counts.commandes },
            ].map((tab) => {
              const active = stageFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStageFilter(tab.id)}
                  className={`whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-bold transition flex items-center gap-1.5 ${
                    active
                      ? 'bg-[var(--night)] text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Recherche */}
          <div className="relative min-w-[260px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une réalisation, lieu..."
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-8 py-2 text-xs text-[var(--night)] placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[var(--cyan)]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 3. Galerie de Réalisations */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--line)] pb-5">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--cyan-deep)]">
              Références Professionnelles
            </span>
            <h2 className="mt-1 font-display text-3xl sm:text-4xl font-bold uppercase text-[var(--night)]">
              Nos Réalisations BTP
            </h2>
          </div>
          <p className="text-xs font-semibold text-[var(--muted)]">
            {filteredProjects.length} fiche{filteredProjects.length > 1 ? 's' : ''} affichée{filteredProjects.length > 1 ? 's' : ''}
          </p>
        </div>

        {/* État vide factuel : Aucun projet publié */}
        {filteredProjects.length === 0 ? (
          <div className="mt-12 rounded-3xl border border-dashed border-slate-300 bg-[var(--mist)] p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-4">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-slate-200/80 flex items-center justify-center text-slate-600">
              <Building2 className="h-7 w-7 text-slate-500" />
            </div>
            <h3 className="font-display text-2xl font-bold uppercase text-[var(--night)]">
              {publishedProjects.length === 0
                ? 'Actualisation documentaire en cours'
                : 'Aucune réalisation ne correspond à ces critères'}
            </h3>
            <p className="text-sm text-[var(--muted)] leading-relaxed">
              {publishedProjects.length === 0
                ? 'Nos références de chantiers, prestations et commandes BTP sont en cours d’intégration et de vérification à partir de nos pièces officielles. Pour consulter nos références ou solliciter une proposition technique, contactez directement notre direction.'
                : 'Modifiez vos filtres ou réinitialisez la recherche pour afficher les autres fiches documentées.'}
            </p>
            {publishedProjects.length === 0 ? (
              <div className="pt-2">
                <a
                  href={`https://wa.me/${waNorm}?text=${encodeURIComponent(
                    'Bonjour ALFFA NIGER BTP, je souhaite obtenir des informations sur vos références et prestations BTP.'
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--night)] px-6 text-sm font-bold text-white hover:bg-[var(--night-2)] shadow-sm transition"
                >
                  <MessageCircle className="h-4 w-4 text-[var(--cyan)]" />
                  <span>Contacter la direction BTP sur WhatsApp</span>
                </a>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setStageFilter('all');
                }}
                className="inline-flex min-h-10 items-center justify-center rounded-xl bg-slate-200 px-5 text-xs font-bold text-slate-800 hover:bg-slate-300 transition"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        ) : (
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => {
              const stageInfo = STAGE_CONFIG[project.stage] || STAGE_CONFIG.commande_documentee;
              const StageIcon = stageInfo.icon;
              const hasPhotos = project.photos && project.photos.length > 0;
              const firstPhoto = hasPhotos ? project.photos[0] : null;

              return (
                <article
                  key={project.id}
                  className="group rounded-3xl border border-[var(--line)] bg-white overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col"
                >
                  {/* Photo réelle ou Emplacement neutre authentique */}
                  <div className="relative aspect-[16/10] bg-slate-900 overflow-hidden">
                    {firstPhoto ? (
                      <img
                        src={firstPhoto.url}
                        alt={firstPhoto.caption || project.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-slate-900 to-slate-800 text-white/70 space-y-2">
                        <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center text-white/60">
                          <Camera className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
                          Photographie à ajouter
                        </span>
                        <p className="text-[11px] text-white/40 max-w-[200px]">
                          Prestation documentée par bon de commande officiel
                        </p>
                      </div>
                    )}

                    {/* Badge Statut documentaire */}
                    <div className="absolute top-3 left-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-md border backdrop-blur-md ${stageInfo.bg} ${stageInfo.text} ${stageInfo.border}`}
                      >
                        <StageIcon className="h-3.5 w-3.5 shrink-0" />
                        <span>{stageInfo.label}</span>
                      </span>
                    </div>

                    {/* Compteur de photos */}
                    {hasPhotos && project.photos.length > 1 && (
                      <div className="absolute bottom-3 right-3 bg-black/70 text-white text-[11px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs flex items-center gap-1">
                        <Camera className="h-3 w-3" />
                        <span>{project.photos.length} photos</span>
                      </div>
                    )}
                  </div>

                  {/* Corps de la carte */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2.5">
                      {project.category && (
                        <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--cyan-deep)]">
                          {project.category}
                        </span>
                      )}

                      <h3 className="font-display text-xl sm:text-2xl font-bold uppercase text-[var(--night)] leading-snug line-clamp-2">
                        {project.title}
                      </h3>

                      <p className="text-xs sm:text-sm text-[var(--ink)]/80 leading-relaxed line-clamp-3">
                        {project.description}
                      </p>

                      {/* Métadonnées factuelles disponibles */}
                      <div className="pt-2 space-y-1.5 text-xs text-[var(--muted)]">
                        {project.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-[var(--cyan-deep)] shrink-0" />
                            <span>{project.location}</span>
                          </div>
                        )}
                        {project.client && (
                          <div className="flex items-center gap-2">
                            <Building className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>Client : <strong className="text-[var(--night)]">{project.client}</strong></span>
                          </div>
                        )}
                        {project.executionPeriod && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>Période : {project.executionPeriod}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-4 border-t border-[var(--line)] flex items-center justify-between">
                      {project.documents && project.documents.length > 0 ? (
                        <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                          <FileCheck2 className="h-3.5 w-3.5" />
                          <span>{project.documents.length} justificatif{project.documents.length > 1 ? 's' : ''}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Réf. documentée</span>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProject(project);
                          setActivePhotoIdx(0);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--night)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--night-2)] shadow-xs transition"
                      >
                        <Eye className="h-3.5 w-3.5 text-[var(--cyan)]" />
                        <span>Consulter la fiche</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. Modal détaillée d'une réalisation */}
      {selectedProject && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in-0 duration-200"
          onClick={() => setSelectedProject(null)}
        >
          <div
            className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="p-6 sm:p-8 bg-slate-900 text-white flex items-start justify-between gap-4">
              <div className="space-y-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-[var(--cyan)] border border-white/15">
                  <HardHat className="h-3.5 w-3.5" />
                  <span>ALFFA NIGER BTP</span>
                </span>
                <h3 className="font-display text-2xl sm:text-3xl font-bold uppercase text-white leading-tight">
                  {selectedProject.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProject(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition"
                aria-label="Fermer la modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 sm:p-8 max-h-[75vh] overflow-y-auto space-y-6">
              {/* Statut & Métadonnées officielles */}
              <div className="flex flex-wrap items-center gap-2">
                {(() => {
                  const stageInfo = STAGE_CONFIG[selectedProject.stage] || STAGE_CONFIG.commande_documentee;
                  const StageIcon = stageInfo.icon;
                  return (
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${stageInfo.bg} ${stageInfo.text} ${stageInfo.border}`}
                    >
                      <StageIcon className="h-3.5 w-3.5" />
                      <span>{stageInfo.label}</span>
                    </span>
                  );
                })()}

                {selectedProject.category && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                    {selectedProject.category}
                  </span>
                )}
              </div>

              {/* Photos authentiques */}
              {selectedProject.photos && selectedProject.photos.length > 0 ? (
                <div className="space-y-3">
                  <div className="relative aspect-[16/10] rounded-2xl bg-slate-950 overflow-hidden shadow-inner">
                    <img
                      src={selectedProject.photos[activePhotoIdx]?.url}
                      alt={selectedProject.photos[activePhotoIdx]?.caption || selectedProject.title}
                      className="h-full w-full object-contain"
                    />
                    {selectedProject.photos[activePhotoIdx]?.caption && (
                      <div className="absolute bottom-0 inset-x-0 p-3 bg-black/75 text-white text-xs backdrop-blur-xs">
                        {selectedProject.photos[activePhotoIdx].caption}
                      </div>
                    )}
                  </div>

                  {selectedProject.photos.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {selectedProject.photos.map((ph, idx) => (
                        <button
                          key={ph.id || idx}
                          type="button"
                          onClick={() => setActivePhotoIdx(idx)}
                          className={`relative h-16 w-20 shrink-0 rounded-xl overflow-hidden border-2 transition ${
                            activePhotoIdx === idx
                              ? 'border-[var(--cyan)] scale-102 ring-2 ring-[var(--cyan)]/30'
                              : 'border-transparent opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={ph.url} alt="" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center space-y-1">
                  <Camera className="mx-auto h-6 w-6 text-slate-400" />
                  <p className="text-xs font-semibold text-slate-600 uppercase">
                    Photographie à ajouter
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Référence validée sur pièces administratives
                  </p>
                </div>
              )}

              {/* Description détaillée */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                  Description exacte des prestations
                </h4>
                <div className="rounded-2xl bg-[var(--mist)] p-5 border border-[var(--line)] text-sm leading-relaxed text-[var(--ink)] whitespace-pre-line">
                  {selectedProject.description}
                </div>
              </div>

              {/* Tableau des informations vérifiées */}
              <div className="rounded-2xl border border-[var(--line)] p-4 grid gap-3 sm:grid-cols-2 text-xs">
                {selectedProject.location && (
                  <div>
                    <span className="block text-[11px] text-[var(--muted)] uppercase font-bold">Localisation</span>
                    <span className="font-semibold text-[var(--night)]">{selectedProject.location}</span>
                  </div>
                )}
                {selectedProject.client && (
                  <div>
                    <span className="block text-[11px] text-[var(--muted)] uppercase font-bold">Client / Organisme</span>
                    <span className="font-semibold text-[var(--night)]">{selectedProject.client}</span>
                  </div>
                )}
                {selectedProject.executionPeriod && (
                  <div>
                    <span className="block text-[11px] text-[var(--muted)] uppercase font-bold">Période d'exécution</span>
                    <span className="font-semibold text-[var(--night)]">{selectedProject.executionPeriod}</span>
                  </div>
                )}
                {selectedProject.orderReference && (
                  <div>
                    <span className="block text-[11px] text-[var(--muted)] uppercase font-bold">Réf. Bon de commande</span>
                    <span className="font-mono font-semibold text-[var(--night)]">{selectedProject.orderReference}</span>
                  </div>
                )}
              </div>

              {/* Justificatifs autorisés au public */}
              {selectedProject.documents && selectedProject.documents.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="h-4 w-4 text-emerald-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--night)]">
                      Justificatifs autorisés à la publication
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {selectedProject.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <FileText className="h-4 w-4 text-[var(--cyan-deep)] shrink-0" />
                          <div>
                            <span className="font-bold text-[var(--night)]">{doc.name}</span>
                            {doc.reference && (
                              <span className="block text-[11px] text-slate-500 font-mono">
                                Réf: {doc.reference}
                              </span>
                            )}
                          </div>
                        </div>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-300 font-bold text-[var(--night)] hover:bg-slate-100 transition"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>Consulter</span>
                        </a>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500 italic">
                    * Extraits documentaires expurgés de toute mention confidentielle, conformément aux engagements de discrétion contractuelle.
                  </p>
                </div>
              )}
            </div>

            {/* Footer Modal avec bouton contact */}
            <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <a
                href={`https://wa.me/${waNorm}?text=${encodeURIComponent(
                  `Bonjour ALFFA NIGER BTP, je souhaite des précisions au sujet de votre réalisation : "${selectedProject.title}".`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs transition"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Échanger sur cette réalisation sur WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={() => setSelectedProject(null)}
                className="min-h-11 rounded-xl border border-slate-300 px-5 text-xs font-bold text-slate-700 hover:bg-white"
              >
                Fermer la fiche
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Coordonnées & Contact Professionnel BTP */}
      <section className="bg-[var(--mist)] border-t border-[var(--line)] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="rounded-3xl bg-gradient-to-br from-[var(--night)] to-[var(--night-2)] p-8 sm:p-12 text-white shadow-xl grid gap-8 lg:grid-cols-2 items-center">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--cyan)]/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[var(--cyan)]">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Contact Professionnel & Direction BTP</span>
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold uppercase text-white leading-tight">
                Consulter ALFFA NIGER pour vos chantiers & marchés
              </h2>
              <p className="text-sm sm:text-base text-white/80 leading-relaxed font-light">
                Nous nous tenons à la disposition des administrations, entreprises et partenaires
                pour l'étude de vos dossiers, la fourniture de références vérifiées et l'établissement
                d'offres techniques et financières conformes aux exigences du secteur.
              </p>

              {/* Coordonnées officielles */}
              <div className="pt-2 grid gap-3 sm:grid-cols-2 text-xs">
                <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 text-[var(--cyan)] shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-[11px] font-bold text-white/50 uppercase">Siège & Ateliers</span>
                    <span className="font-semibold text-white">{companyAddress}</span>
                  </div>
                </div>

                <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-start gap-2.5">
                  <Phone className="h-4 w-4 text-[var(--cyan)] shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-[11px] font-bold text-white/50 uppercase">Ligne directe & WhatsApp</span>
                    <span className="font-semibold text-white">{companyPhone}</span>
                  </div>
                </div>

                <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-start gap-2.5 sm:col-span-2">
                  <Mail className="h-4 w-4 text-[var(--cyan)] shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-[11px] font-bold text-white/50 uppercase">Courrier officiel</span>
                    <span className="font-semibold text-white">{companyEmail}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action principale WhatsApp */}
            <div className="rounded-2xl bg-white/10 border border-white/15 p-6 sm:p-8 backdrop-blur-md flex flex-col justify-center space-y-4 text-center lg:text-left">
              <h3 className="font-display text-2xl font-bold uppercase text-white">
                Contact immédiat par messagerie
              </h3>
              <p className="text-xs sm:text-sm text-white/80 leading-relaxed font-light">
                Transmettez vos besoins ou demandes de consultations directement à notre responsable :
              </p>

              <a
                href={`https://wa.me/${waNorm}?text=${encodeURIComponent(
                  'Bonjour ALFFA NIGER BTP, je souhaite vous consulter au sujet d’un projet de travaux / commande.'
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-14 items-center justify-center gap-2.5 rounded-xl bg-[var(--cyan)] px-6 text-base font-bold text-[var(--night)] hover:bg-[#22c7dc] shadow-lg transition active:scale-98"
              >
                <MessageCircle className="h-5 w-5" />
                <span>Échanger directement sur WhatsApp</span>
              </a>

              <p className="text-[11px] text-white/50 text-center">
                Numéro certifié ALFFA NIGER · Réponse rapide garantie
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
