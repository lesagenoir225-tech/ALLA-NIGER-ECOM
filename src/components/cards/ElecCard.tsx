import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Product } from '../../types';
import { ProductImage } from '../ui/ProductImage';
import { Price } from '../ui/Price';
import { Availability } from '../ui/Availability';
import { WhatsAppButton } from '../ui/WhatsAppButton';
import { href, scrollToTop } from '../../utils/router';

interface ElecCardProps {
  product: Product;
  big?: boolean;
}

export function ElecCard({ product, big = false }: ElecCardProps) {
  const detailUrl = href(`/electronique/p/${product.id}`);

  return (
    <article
      className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
      data-shop="electronique"
      data-testid="product-card"
    >
      {/* Image container */}
      <a
        href={detailUrl}
        onClick={() => scrollToTop(true)}
        className="block relative"
        tabIndex={-1}
        aria-hidden="true"
      >
        <ProductImage
          product={product}
          className={`w-full ${
            big ? 'aspect-[4/3] sm:aspect-square' : 'aspect-square'
          }`}
        />
        {product.isNew && (
          <span className="absolute top-3 left-3 rounded-full bg-[var(--cyan)] px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-[var(--night)] shadow-sm">
            Nouveau
          </span>
        )}
      </a>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--cyan-deep)]">
              {product.brand === 'apple' ? 'Apple iPhone' : product.brand === 'samsung' ? 'Samsung Galaxy' : product.brand}
            </span>
            <a
              href={detailUrl}
              onClick={() => scrollToTop(true)}
              className="block"
            >
              <h3 className="font-display text-xl sm:text-2xl font-bold leading-snug text-[var(--night)] group-hover:text-[var(--cyan-deep)] transition">
                {product.name}
              </h3>
            </a>
          </div>
          {product.capacity && (
            <span className="shrink-0 rounded-md bg-[var(--mist)] px-2 py-0.5 text-xs font-semibold text-[var(--muted)]">
              {product.capacity}
            </span>
          )}
        </div>

        {/* Price display */}
        <div className="mt-3">
          <Price value={product.price} className="font-display text-2xl sm:text-3xl font-bold leading-tight" />
        </div>

        {/* Availability Badge */}
        <div className="mt-2.5">
          <Availability value={product.availability} />
        </div>

        {/* Action buttons */}
        <div className="mt-auto pt-4 space-y-2">
          <WhatsAppButton shop="electronique" product={product} size="md" />
          <a
            href={detailUrl}
            onClick={() => scrollToTop(true)}
            className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold text-[var(--night)] hover:bg-[var(--mist)] transition w-full"
          >
            <span>Consulter la fiche détaillée</span>
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </article>
  );
}
