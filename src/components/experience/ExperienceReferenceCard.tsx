import React from 'react';
import {
  ArrowRight,
  Camera,
  Building2,
  FileText,
  MapPin,
  ImageOff,
} from 'lucide-react';
import { ExperienceReference, EXPERIENCE_EXECUTION_LABELS } from '../../types/experience';

interface ExperienceReferenceCardProps {
  reference: ExperienceReference;
  onOpen: (reference: ExperienceReference) => void;
}

/**
 * Fiche professionnelle d'une référence.
 * Aucune photographie n'est générée : en l'absence de photo authentique,
 * un emplacement neutre est affiché (exigence de transparence).
 */
export function ExperienceReferenceCard({ reference, onOpen }: ExperienceReferenceCardProps) {
  const cover = reference.photos?.[0];
  const publicDocuments = (reference.documents || []).filter((d) => d.visibility === 'public');
  const executionLabel =
    reference.execution !== 'non_confirme'
      ? EXPERIENCE_EXECUTION_LABELS[reference.execution]
      : null;

  return (
    <article className="group flex flex-col overflow-hidden rounded-[20px] border border-[var(--line)] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      {/* Visuel authentique ou emplacement neutre */}
      <div className="relative overflow-hidden border-b border-[var(--line)]">
        {cover ? (
          <img
            src={cover.url}
            alt={cover.alt || `Photographie authentique — ${reference.title}`}
            loading="lazy"
            className="aspect-[16/10] w-full object-cover"
          />
        ) : (
          <div className="aspect-[16/10] w-full bg-gradient-to-br from-[var(--mist)] via-white to-[var(--mist)] grid place-items-center">
            <div className="flex flex-col items-center gap-2 text-center px-6">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white border border-[var(--line)] text-[var(--cyan-deep)] shadow-xs">
                <ImageOff className="h-5 w-5" />
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                Photographie authentique à venir
              </span>
            </div>
          </div>
        )}

        {executionLabel && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-[var(--night)] border border-[var(--line)] shadow-xs">
            {executionLabel}
          </span>
        )}
        {publicDocuments.length > 0 && (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-[var(--night)]/90 px-2.5 py-1 text-[11px] font-bold text-white">
            <FileText className="h-3 w-3" />
            {publicDocuments.length}
          </span>
        )}
      </div>

      {/* Contenu */}
      <div className="flex flex-1 flex-col gap-3 p-5">
        {reference.beneficiary && (
          <p className="inline-flex items-start gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--cyan-deep)] leading-snug">
            <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{reference.beneficiary}</span>
          </p>
        )}

        <h3 className="font-display text-lg sm:text-xl font-semibold leading-snug text-[var(--night)]">
          {reference.title}
        </h3>

        <p className="line-clamp-3 text-sm leading-relaxed text-[var(--muted)] whitespace-pre-line">
          {reference.description}
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
          {reference.procedure && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--mist)] px-2.5 py-1 text-[11px] font-bold text-[var(--night)] border border-[var(--line)]">
              <FileText className="h-3 w-3 text-[var(--cyan-deep)]" />
              {reference.procedure}
            </span>
          )}
          {reference.location && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[11px] font-semibold text-[var(--muted)] border border-[var(--line)]">
              <MapPin className="h-3 w-3" />
              {reference.location}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => onOpen(reference)}
          className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--night)]/15 bg-white px-4 text-sm font-bold text-[var(--night)] transition hover:border-[var(--cyan)] hover:bg-[var(--mist)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan)]"
        >
          <span>Voir les détails</span>
          <ArrowRight className="h-4 w-4 text-[var(--cyan-deep)] transition group-hover:translate-x-0.5" />
        </button>
      </div>
    </article>
  );
}

interface ExperiencePhotoPlaceholderProps {
  label?: string;
}

export function ExperiencePhotoPlaceholder({ label }: ExperiencePhotoPlaceholderProps) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--mist)] p-6 text-center">
      <Camera className="mx-auto h-6 w-6 text-[var(--muted)]" />
      <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
        {label || 'Aucune photographie authentique publiée'}
      </p>
    </div>
  );
}
