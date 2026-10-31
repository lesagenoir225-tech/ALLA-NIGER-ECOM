import React from 'react';
import { formatPrice } from '../../utils/format';

interface PriceProps {
  value: number | null | undefined;
  className?: string;
  missingLabel?: string;
}

export function Price({
  value,
  className = '',
  missingLabel = 'Prix à confirmer',
}: PriceProps) {
  const formatted = formatPrice(value);

  if (!formatted) {
    return (
      <span
        className={`inline-flex items-center text-amber-700 font-semibold tracking-normal ${className}`}
        data-testid="price-missing"
        title="Le prix exact de ce modèle est communiqué sur demande"
      >
        <span className="text-[0.7em] uppercase tracking-wider mr-1 px-2 py-0.5 rounded bg-amber-50 border border-amber-200/80">
          Nous consulter
        </span>
        <span className="text-[0.8em] font-medium">{missingLabel}</span>
      </span>
    );
  }

  const [amount] = formatted.split(' FCFA');

  return (
    <span className={`tabular-nums font-bold text-[var(--night)] ${className}`}>
      {amount}
      <span className="ml-1.5 text-[0.55em] font-semibold tracking-wider text-[var(--cyan-deep)]">
        FCFA
      </span>
    </span>
  );
}
