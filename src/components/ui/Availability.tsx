import React from 'react';
import { AvailabilityStatus } from '../../types';

interface AvailabilityProps {
  value: AvailabilityStatus;
  dark?: boolean;
  className?: string;
}

export const AVAILABILITY_CONFIG: Record<
  AvailabilityStatus,
  { label: string; tone: 'neutral' | 'ok' | 'info' | 'off' }
> = {
  disponible: { label: 'En stock / Disponible', tone: 'ok' },
  sur_commande: { label: 'Sur commande', tone: 'info' },
  non_precise: { label: 'Disponibilité à confirmer', tone: 'neutral' },
  indisponible: { label: 'Rupture temporaire', tone: 'off' },
};

export function Availability({ value, dark = false, className = '' }: AvailabilityProps) {
  const config = AVAILABILITY_CONFIG[value] || AVAILABILITY_CONFIG.non_precise;

  const toneClasses = {
    neutral: dark
      ? 'bg-white/10 text-white/85 border-white/20'
      : 'bg-[var(--mist)] text-[var(--muted)] border-[var(--line)]',
    ok: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    info: 'bg-cyan-50 text-[var(--cyan-deep)] border-cyan-200',
    off: 'bg-rose-50 text-rose-800 border-rose-200',
  }[config.tone];

  const dotClasses = {
    neutral: 'bg-slate-400',
    ok: 'bg-emerald-500',
    info: 'bg-[var(--cyan)]',
    off: 'bg-rose-500',
  }[config.tone];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${toneClasses} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotClasses}`} aria-hidden="true" />
      {config.label}
    </span>
  );
}
