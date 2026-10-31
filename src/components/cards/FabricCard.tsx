import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Product } from '../../types';
import { ProductImage } from '../ui/ProductImage';
import { Price } from '../ui/Price';
import { Availability } from '../ui/Availability';
import { WhatsAppButton } from '../ui/WhatsAppButton';
import { href, scrollToTop } from '../../utils/router';

interface FabricCardProps {
  product: Product;
  brandName?: string;
  tall?: boolean;
}

export function FabricCard({ product, brandName, tall = false }: FabricCardProps) {
  const detailUrl = href(`/textile/p/${product.id}`);

  return (
    <article
      className="group flex flex-col overflow-hidden rounded-[20px] border border-[var(--sand)] bg-white/90 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
      data-shop="textile"
      data-testid="product-card"
    >
      {/* Textile Image */}
      <a
        href={detailUrl}
        onClick={() => scrollToTop(true)}
        className="block relative overflow-hidden"
        tabIndex={-1}
        aria-hidden="true"
      >
        <ProductImage
          product={product}
          className={`w-full ${tall ? 'aspect-[4/5]' : 'aspect-[4/4.2]'}`}
        />
        {product.isNew && (
          <span className="absolute top-3 left-3 rounded-full bg-[var(--night)] px-3 py-1 font-serif text-xs italic font-medium text-white shadow-sm">
            Nouveauté
          </span>
        )}
      </a>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        <div className="space-y-1">
          {brandName && (
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--umber)]">
              {brandName}
            </p>
          )}
          <a
            href={detailUrl}
            onClick={() => scrollToTop(true)}
            className="block"
          >
            <h3 className="font-serif text-2xl font-medium leading-snug text-[var(--night)] group-hover:text-[var(--cyan-deep)] transition">
              {product.name}
            </h3>
          </a>
          {product.model && (
            <p className="text-sm italic text-[var(--muted)]">
              {product.model}
            </p>
          )}
        </div>

        {product.description && (
          <p className="mt-2 line-clamp-2 text-sm text-[var(--umber)]/90 leading-relaxed">
            {product.description}
          </p>
        )}

        {/* Price & Availability */}
        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2">
          <Price value={product.price} className="font-serif text-2xl sm:text-3xl font-medium leading-tight" />
          <Availability value={product.availability} />
        </div>

        {/* Actions */}
        <div className="mt-auto pt-5 space-y-2">
          <WhatsAppButton shop="textile" product={product} size="md" />
          <a
            href={detailUrl}
            onClick={() => scrollToTop(true)}
            className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[#080F49]/15 text-sm font-semibold text-[var(--night)] hover:border-[var(--night)] hover:bg-[var(--ivory)] transition w-full"
          >
            <span>Détails & caractéristiques</span>
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </article>
  );
}
