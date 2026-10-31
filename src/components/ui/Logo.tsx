import React, { useState } from 'react';

interface LogoProps {
  className?: string;
  onDark?: boolean;
  showSlogan?: boolean;
}

export function Logo({ className = 'h-11', onDark = false, showSlogan = false }: LogoProps) {
  const [hasError, setHasError] = useState(false);

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {!hasError ? (
        <span
          className={`inline-flex items-center transition ${
            onDark ? 'rounded-xl bg-white px-2.5 py-1 shadow-sm' : ''
          }`}
        >
          <img
            src="/images/logo.png"
            alt="ALFFA NIGER — La qualité au meilleur prix"
            onError={() => setHasError(true)}
            className="h-9 sm:h-11 w-auto max-h-12 object-contain shrink-0"
            loading="eager"
          />
        </span>
      ) : (
        <div className="flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--night)] text-[var(--cyan)] font-display text-2xl font-bold">
            A
          </div>
          <div className="leading-none">
            <span
              className={`font-display text-2xl font-bold uppercase tracking-wider ${
                onDark ? 'text-white' : 'text-[var(--night)]'
              }`}
            >
              ALFFA <span className="text-[var(--cyan)]">NIGER</span>
            </span>
          </div>
        </div>
      )}

      {showSlogan && (
        <span
          className={`hidden sm:inline-block text-xs font-medium tracking-wide border-l pl-3 ml-1 leading-none ${
            onDark ? 'border-white/20 text-white/70' : 'border-[var(--line)] text-[var(--muted)]'
          }`}
        >
          La qualité au meilleur prix.
        </span>
      )}
    </div>
  );
}
