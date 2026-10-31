import React, { useState } from 'react';
import { ArrowLeft, Plus, Minus, CheckCircle, ShieldCheck, Truck, MessageCircle, HelpCircle } from 'lucide-react';
import { ShopType } from '../types';
import { useStore } from '../context/StoreContext';
import { ProductImage } from '../components/ui/ProductImage';
import { Price } from '../components/ui/Price';
import { Availability } from '../components/ui/Availability';
import { WhatsAppButton } from '../components/ui/WhatsAppButton';
import { href, canonicalUrl, productUrl, scrollToTop } from '../utils/router';
import { useSeo } from '../utils/seo';

interface ProductDetailProps {
  shop: ShopType;
  id: string;
}

export function ProductDetail({ shop, id }: ProductDetailProps) {
  const { settings, brands, getProductsByShop } = useStore();
  const [quantity, setQuantity] = useState<number>(1);

  const products = getProductsByShop(shop);
  const product = products.find((p) => p.id === id);

  const isTextile = shop === 'textile';
  const shopLabel = isTextile ? 'ALFFA NIGER Textile' : 'ALFFA NIGER Électronique';

  const brandName = isTextile
    ? brands.find((b) => b.id === product?.brand)?.name || product?.brand || ''
    : product?.brand === 'apple'
    ? 'Apple iPhone'
    : product?.brand === 'samsung'
    ? 'Samsung Galaxy'
    : product?.brand || '';

  // Schema.org structured data for product
  const jsonLd = product
    ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description: product.description || `${product.name} chez ${shopLabel}`,
        image: product.image ? [product.image] : [],
        brand: {
          '@type': 'Brand',
          name: brandName,
        },
        offers: {
          '@type': 'Offer',
          url: productUrl(settings, shop, product.id),
          priceCurrency: 'XOF',
          price: product.price !== null ? String(product.price) : '0',
          priceValidUntil: '2026-12-31',
          availability:
            product.availability === 'disponible'
              ? 'https://schema.org/InStock'
              : product.availability === 'indisponible'
              ? 'https://schema.org/OutOfStock'
              : 'https://schema.org/PreOrder',
        },
      }
    : null;

  useSeo({
    title: product
      ? `${product.name}${product.capacity ? ` — ${product.capacity}` : ''} | ${shopLabel}`
      : `Produit introuvable | ${shopLabel}`,
    description: product
      ? `${product.name} chez ${shopLabel}. ${product.description || ''} Commandez directement sur WhatsApp.`
      : 'Produit introuvable sur ALFFA NIGER.',
    canonical: product ? productUrl(settings, shop, product.id) : canonicalUrl(settings, `/${shop}`),
    jsonLd,
  });

  if (!product) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 py-20 text-center">
        <h1 className="font-display text-4xl font-bold uppercase text-[var(--night)]">
          Produit non répertorié
        </h1>
        <p className="mt-3 text-base text-[var(--muted)]">
          Ce produit a été déplacé ou n'existe plus dans le catalogue de cette boutique.
        </p>
        <a
          href={href(`/${shop}`)}
          className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-[var(--night)] px-6 font-semibold text-white"
        >
          Retour au catalogue {isTextile ? 'Textile' : 'Électronique'}
        </a>
      </main>
    );
  }

  const specsList = String(product.specs || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <main className={isTextile ? 'bg-[var(--ivory)] text-[var(--night)]' : 'bg-white text-[var(--night)]'}>
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6">
        {/* Navigation back */}
        <a
          href={href(`/${shop}/catalogue`)}
          onClick={() => scrollToTop(true)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)] hover:text-[var(--night)] transition py-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Retour au catalogue {isTextile ? 'Textile' : 'Électronique'}</span>
        </a>

        {/* Product Layout Grid */}
        <div className="mt-4 grid gap-10 md:grid-cols-2 lg:gap-14 items-start">
          {/* Left: Product Visual */}
          <div className="static md:sticky md:top-24">
            <div className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-lg">
              <ProductImage
                product={product}
                priority
                className={`w-full ${isTextile ? 'aspect-[4/4.5]' : 'aspect-square'}`}
              />
            </div>
            {product.isNew && (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--cyan)] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[var(--night)]">
                Nouveauté vérifiée
              </div>
            )}
          </div>

          {/* Right: Product Details & WhatsApp Ordering */}
          <div className="space-y-6">
            <div>
              <p className={isTextile ? 'font-serif text-lg italic text-[var(--umber)]' : 'text-xs font-bold uppercase tracking-[0.2em] text-[var(--cyan-deep)]'}>
                {brandName}
              </p>
              <h1 className={isTextile ? 'font-serif text-3xl sm:text-4xl md:text-5xl font-medium leading-tight mt-1' : 'font-display text-3xl sm:text-4xl md:text-5xl font-bold uppercase leading-snug sm:leading-tight mt-1'}>
                {product.name}
              </h1>
              {product.capacity && (
                <p className="mt-2 text-lg sm:text-xl font-semibold text-[var(--muted)]">
                  Capacité de stockage : {product.capacity}
                </p>
              )}
            </div>

            {/* Price section */}
            <div className="border-y border-current/10 py-5">
              <span className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1">
                Prix unitaire
              </span>
              <Price value={product.price} className="font-display text-3xl sm:text-4xl md:text-5xl font-bold leading-tight" />
            </div>

            {/* Availability */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold">État du stock :</span>
              <Availability value={product.availability} />
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center gap-4 pt-2">
              <span className="text-sm font-semibold">Quantité souhaitée :</span>
              <div className="inline-flex items-center rounded-xl border border-current/20 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  aria-label="Diminuer la quantité"
                  className="grid h-11 w-11 place-items-center hover:bg-slate-100 rounded-l-xl transition"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-12 text-center font-bold text-lg" aria-live="polite">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(Math.min(99, quantity + 1))}
                  aria-label="Augmenter la quantité"
                  className="grid h-11 w-11 place-items-center hover:bg-slate-100 rounded-r-xl transition"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* WhatsApp CTA */}
            <div className="pt-2">
              <WhatsAppButton
                shop={shop}
                product={product}
                quantity={quantity}
                size="lg"
              />
              <p className="mt-2.5 flex items-start gap-1.5 text-xs text-[var(--muted)] leading-relaxed">
                <MessageCircle className="h-4 w-4 shrink-0 text-[var(--cyan-deep)] mt-0.5" />
                <span>
                  Ce bouton génère votre message pré-rempli dans WhatsApp avec la référence, la quantité et le prix. Notre équipe vous répond rapidement.
                </span>
              </p>
            </div>

            {/* Description */}
            {product.description && (
              <div className="pt-4 border-t border-current/10">
                <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--muted)] mb-2">
                  Description
                </h2>
                <p className="text-base sm:text-lg leading-relaxed opacity-90">
                  {product.description}
                </p>
              </div>
            )}

            {/* Technical Specifications */}
            {specsList.length > 0 && (
              <div className="pt-4 border-t border-current/10">
                <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--muted)] mb-3">
                  Caractéristiques principales
                </h2>
                <ul className="space-y-2">
                  {specsList.map((spec, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-base">
                      <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{spec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Additional Info Table */}
            <div className="pt-4 border-t border-current/10">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--muted)] mb-3">
                Informations complémentaires
              </h2>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                {product.reference && (
                  <div className="bg-white/60 p-3 rounded-xl border border-current/10">
                    <dt className="text-xs text-[var(--muted)] font-semibold uppercase">Référence</dt>
                    <dd className="font-semibold text-base mt-0.5">{product.reference}</dd>
                  </div>
                )}
                {product.condition && (
                  <div className="bg-white/60 p-3 rounded-xl border border-current/10">
                    <dt className="text-xs text-[var(--muted)] font-semibold uppercase">État</dt>
                    <dd className="font-semibold text-base mt-0.5">{product.condition}</dd>
                  </div>
                )}
                {product.colors && (
                  <div className="bg-white/60 p-3 rounded-xl border border-current/10">
                    <dt className="text-xs text-[var(--muted)] font-semibold uppercase">Coloris</dt>
                    <dd className="font-semibold text-base mt-0.5">{product.colors}</dd>
                  </div>
                )}
                {product.model && (
                  <div className="bg-white/60 p-3 rounded-xl border border-current/10">
                    <dt className="text-xs text-[var(--muted)] font-semibold uppercase">Modèle</dt>
                    <dd className="font-semibold text-base mt-0.5">{product.model}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Reassurance Trust Box */}
            <div className="mt-8 rounded-2xl bg-white p-5 border border-black/10 shadow-sm space-y-3">
              <div className="flex items-center gap-3 text-sm font-semibold text-[var(--night)]">
                <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                <span>Produit 100% garanti conforme et contrôlé avant remise</span>
              </div>
              <div className="flex items-center gap-3 text-sm font-semibold text-[var(--night)]">
                <Truck className="h-5 w-5 text-[var(--cyan-deep)] shrink-0" />
                <span>Livraison ou retrait sur place organisé directement par WhatsApp</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
