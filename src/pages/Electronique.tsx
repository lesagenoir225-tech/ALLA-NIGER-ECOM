import React, { useState, useMemo, useEffect } from 'react';
import { Search, SlidersHorizontal, ArrowLeftRight, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { ElecCard } from '../components/cards/ElecCard';
import { href, canonicalUrl } from '../utils/router';
import { useSeo } from '../utils/seo';
import { LocationCard } from '../components/ui/LocationCard';
import { SocialLinks } from '../components/ui/SocialLinks';

interface ElectroniqueProps {
  subRoute?: string;
}

const CATEGORIES = [
  { id: 'smartphones', label: 'Smartphones' },
  { id: 'accessoires', label: 'Accessoires électroniques' },
  { id: 'autres', label: 'Autres appareils' },
];

const BRANDS = [
  { id: 'apple', label: 'iPhone / Apple' },
  { id: 'samsung', label: 'Samsung' },
];

const SORT_OPTIONS = [
  { id: 'ordre', label: 'Sélection ALFFA' },
  { id: 'prix-asc', label: 'Prix croissant' },
  { id: 'prix-desc', label: 'Prix décroissant' },
  { id: 'nouveautes', label: 'Nouveautés d’abord' },
];

export function Electronique({ subRoute = '' }: ElectroniqueProps) {
  const { settings, getProductsByShop, getFeaturedByShop } = useStore();
  const products = getProductsByShop('electronique');
  const featured = getFeaturedByShop('electronique');

  // Parse initial brand from subRoute if it's like "marque/apple"
  const initialBrand = subRoute.startsWith('marque/') ? subRoute.slice(7) : '';

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState(initialBrand);
  const [sortOption, setSortOption] = useState('ordre');

  useEffect(() => {
    if (subRoute.startsWith('marque/')) {
      setSelectedBrand(subRoute.slice(7));
    }
  }, [subRoute]);

  useSeo({
    title: 'ALFFA NIGER Électronique | iPhone, Samsung et Smartphones au Niger',
    description:
      'Achetez votre smartphone chez ALFFA NIGER Électronique : modèles iPhone et Samsung certifiés, neufs et révisés. Prix transparents en FCFA et commande sur WhatsApp.',
    canonical: canonicalUrl(settings, '/electronique'),
  });

  const filteredProducts = useMemo(() => {
    let result = products.filter((p) => {
      // Category filter
      if (selectedCategory && p.category !== selectedCategory) return false;
      // Brand filter
      if (selectedBrand && p.brand !== selectedBrand) return false;
      // Search filter
      if (search.trim()) {
        const query = search.toLowerCase();
        const haystack = [p.name, p.brand, p.capacity, p.reference, p.colors, p.description]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });

    // Sorting
    if (sortOption === 'prix-asc') {
      result = [...result].sort((a, b) => {
        if (a.price === null) return 1;
        if (b.price === null) return -1;
        return a.price - b.price;
      });
    } else if (sortOption === 'prix-desc') {
      result = [...result].sort((a, b) => {
        if (a.price === null) return 1;
        if (b.price === null) return -1;
        return b.price - a.price;
      });
    } else if (sortOption === 'nouveautes') {
      result = [...result].sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
    }

    return result;
  }, [products, search, selectedCategory, selectedBrand, sortOption]);

  const hasActiveFilters = Boolean(search || selectedCategory || selectedBrand);

  const resetFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setSelectedBrand('');
    setSortOption('ordre');
  };

  return (
    <main className="bg-white">
      {/* 1. Shop Banner */}
      <section className="relative overflow-hidden bg-[var(--night)] text-white">
        <svg
          className="absolute -right-10 top-0 h-full w-1/2 opacity-[0.12] pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <polyline
            points="70,0 40,55 62,55 30,100"
            fill="none"
            stroke="#13B8CE"
            strokeWidth="9"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16">
          <p className="font-display text-base font-semibold uppercase tracking-[0.22em] text-[#6fdcea]">
            ALFFA NIGER ÉLECTRONIQUE
          </p>
          <h1 className="mt-1 max-w-3xl font-display text-[clamp(2rem,5.5vw,4.2rem)] font-bold uppercase leading-[1.12] sm:leading-[1.04] text-white">
            Smartphones de qualité au meilleur prix
          </h1>
          <p className="mt-3 max-w-xl text-base sm:text-lg text-white/80 leading-relaxed">
            {settings.elecIntro}
          </p>

          {/* Quick search bar */}
          <div className="mt-8 max-w-xl">
            <label className="relative flex items-center">
              <Search className="absolute left-4 h-5 w-5 text-slate-400 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher : iPhone 13, Galaxy S24, 256 Go..."
                className="w-full min-h-14 rounded-2xl bg-white pl-12 pr-12 text-base text-[var(--night)] placeholder:text-slate-400 outline-none focus:ring-4 focus:ring-[var(--cyan)]/30 shadow-lg"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 p-2 text-slate-400 hover:text-[var(--night)] rounded-lg"
                  aria-label="Effacer la recherche"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </label>
          </div>
        </div>
      </section>

      {/* 2. Featured Section (hidden if filtering is active) */}
      {!hasActiveFilters && featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6" aria-labelledby="featured-heading">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[var(--cyan-deep)]">
                Sélection du moment
              </span>
              <h2 id="featured-heading" className="mt-0.5 font-display text-3xl sm:text-4xl font-bold uppercase text-[var(--night)]">
                Nos produits à la une
              </h2>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 lg:grid-cols-4">
            {featured.map((product) => (
              <ElecCard key={product.id} product={product} big />
            ))}
          </div>
        </section>
      )}

      {/* 3. Catalog Section with filters */}
      <section id="catalogue" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--line)] pb-5">
          <div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold uppercase text-[var(--night)]">
              Catalogue Électronique
            </h2>
            <p className="text-sm text-[var(--muted)] mt-1">
              {filteredProducts.length} modèle{filteredProducts.length > 1 ? 's' : ''} disponible{filteredProducts.length > 1 ? 's' : ''}
            </p>
          </div>

          {/* Sort selection */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-[var(--muted)]" />
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              aria-label="Trier le catalogue"
              className="min-h-10 rounded-xl border border-[var(--line)] bg-white px-3 text-sm font-semibold text-[var(--night)] outline-none focus:border-[var(--cyan)]"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="mt-6 space-y-3">
          {/* Categories */}
          <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1">
            <button
              type="button"
              onClick={() => setSelectedCategory('')}
              className={`min-h-10 rounded-full px-4 text-xs sm:text-sm font-semibold whitespace-nowrap transition ${
                !selectedCategory
                  ? 'bg-[var(--night)] text-white shadow-sm'
                  : 'bg-[var(--mist)] text-[var(--night)] hover:bg-slate-200'
              }`}
            >
              Toutes catégories
            </button>
            {CATEGORIES.map((cat) => {
              const count = products.filter((p) => p.category === cat.id).length;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(selectedCategory === cat.id ? '' : cat.id)}
                  className={`min-h-10 rounded-full px-4 text-xs sm:text-sm font-semibold whitespace-nowrap transition ${
                    selectedCategory === cat.id
                      ? 'bg-[var(--night)] text-white shadow-sm'
                      : 'bg-[var(--mist)] text-[var(--night)] hover:bg-slate-200'
                  }`}
                >
                  {cat.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Brands */}
          <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1">
            <button
              type="button"
              onClick={() => setSelectedBrand('')}
              className={`min-h-10 rounded-full px-4 text-xs sm:text-sm font-semibold whitespace-nowrap transition ${
                !selectedBrand
                  ? 'bg-[var(--cyan)] text-[var(--night)] shadow-sm'
                  : 'border border-[var(--line)] bg-white text-[var(--night)] hover:border-[var(--cyan)]'
              }`}
            >
              Toutes marques
            </button>
            {BRANDS.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelectedBrand(selectedBrand === b.id ? '' : b.id)}
                className={`min-h-10 rounded-full px-4 text-xs sm:text-sm font-semibold whitespace-nowrap transition ${
                  selectedBrand === b.id
                    ? 'bg-[var(--cyan)] text-[var(--night)] shadow-sm font-bold'
                    : 'border border-[var(--line)] bg-white text-[var(--night)] hover:border-[var(--cyan)]'
                }`}
              >
                {b.label}
              </button>
            ))}

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="ml-auto min-h-10 text-xs font-semibold text-rose-600 hover:underline px-2"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        </div>

        {/* Products Grid */}
        <div className="mt-8">
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.map((product) => (
                <ElecCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--line)] p-12 text-center">
              <h3 className="font-display text-2xl font-bold uppercase text-[var(--night)]">
                Aucun smartphone ne correspond à votre recherche
              </h3>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Essayez d'autres mots-clés ou supprimez vos filtres de sélection.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--night)] px-5 text-sm font-semibold text-white"
              >
                Réinitialiser la recherche
              </button>
            </div>
          )}
        </div>

        {/* Notre boutique & Nous trouver sur Google Maps */}
        <div className="mt-16">
          <LocationCard shop="electronique" />
        </div>

        {/* Suivez ALFFA Niger */}
        <div className="mt-8">
          <SocialLinks variant="card" headingText="Suivez ALFFA Niger Électronique" />
        </div>

        {/* Cross link to Textile */}
        <div className="mt-12 rounded-2xl bg-[var(--ivory)] p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4 border border-[var(--sand)]">
          <div>
            <p className="font-serif text-sm italic text-[var(--umber)]">
              Découvrez aussi l'autre univers ALFFA NIGER
            </p>
            <h3 className="font-serif text-2xl font-medium text-[var(--night)] mt-0.5">
              Envie de bazins et tissus de grand éclat ?
            </h3>
          </div>
          <a
            href={href('/textile')}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--night)] px-6 text-sm font-semibold text-white hover:bg-[var(--night-2)] transition shrink-0"
          >
            <span>Visiter la Boutique Textile</span>
            <ArrowLeftRight className="h-4 w-4 text-[var(--cyan)]" />
          </a>
        </div>
      </section>
    </main>
  );
}
