import React from 'react';
import { href } from '../utils/router';
import { useSeo } from '../utils/seo';

export function NotFound() {
  useSeo({
    title: 'Page introuvable | ALFFA NIGER',
    description: 'La page demandée n’existe pas ou a été déplacée.',
  });

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 py-20 text-center">
      <span className="font-display text-8xl font-bold text-[var(--cyan)]">404</span>
      <h1 className="mt-2 font-display text-4xl font-bold uppercase text-[var(--night)]">
        Page introuvable
      </h1>
      <p className="mt-3 text-base text-[var(--muted)] max-w-md">
        Le lien que vous avez suivi n'existe pas ou la référence a été déplacée.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <a
          href={href('/')}
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--night)] px-6 text-sm font-bold text-white shadow-md hover:bg-[var(--night-2)]"
        >
          Retour à l'accueil
        </a>
        <a
          href={href('/electronique')}
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--cyan)] px-6 text-sm font-bold text-[var(--night)] hover:bg-[#22c7dc]"
        >
          Boutique Électronique
        </a>
        <a
          href={href('/textile')}
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[var(--sand)] bg-[var(--ivory)] px-6 text-sm font-bold text-[var(--night)] font-serif italic hover:border-[var(--umber)]"
        >
          Boutique Textile
        </a>
      </div>
    </main>
  );
}
