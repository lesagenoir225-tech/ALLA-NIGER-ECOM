import React, { useState } from 'react';
import { Smartphone, Sparkles, ImageOff } from 'lucide-react';
import { Product } from '../../types';

interface ProductImageProps {
  product: Product;
  className?: string;
  priority?: boolean;
}

export function ProductImage({ product, className = '', priority = false }: ProductImageProps) {
  const [hasError, setHasError] = useState(false);
  const isPhone = product.shop === 'electronique';

  // Primary image path or sourceImage fallback
  const imageSrc = !hasError ? (product.image || product.sourceImage) : null;

  const altText = isPhone
    ? `${product.name}${product.capacity ? ` ${product.capacity}` : ''}, smartphone certifié chez ALFFA NIGER Électronique`
    : `${product.name}, tissu et bazin de haute qualité chez ALFFA NIGER Textile`;

  if (!imageSrc) {
    return isPhone ? (
      <div
        className={`flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-b from-[var(--mist)] to-white ${className}`}
        aria-label={altText}
      >
        <div className="relative h-[55%] aspect-[9/19] rounded-[20px] border-[3px] border-[#080F49]/80 bg-white shadow-md flex items-center justify-center">
          <Smartphone className="h-8 w-8 text-[var(--cyan)]" strokeWidth={1.5} />
        </div>
        <span className="px-3 text-center text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          {product.name}
        </span>
      </div>
    ) : (
      <div
        className={`weave relative flex h-full w-full items-end p-4 ${className}`}
        aria-label={altText}
      >
        <span className="rounded-full bg-white/90 px-3 py-1 font-serif text-xs italic font-medium text-[var(--umber)] shadow-sm">
          {product.name}
        </span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-[var(--mist)] ${className}`}>
      <img
        src={imageSrc}
        alt={altText}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onError={() => setHasError(true)}
        className={`h-full w-full transition-transform duration-300 ${
          isPhone
            ? 'object-contain p-4 group-hover:scale-105'
            : 'object-cover group-hover:scale-105'
        }`}
      />
    </div>
  );
}
