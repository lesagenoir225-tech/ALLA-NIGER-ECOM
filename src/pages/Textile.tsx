import React, { useState, useMemo, useEffect } from 'react';
import { Search, SlidersHorizontal, ArrowLeftRight, ArrowRight, X, Sparkles } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { FabricCard } from '../components/cards/FabricCard';
import { href, canonicalUrl } from '../utils/router';
import { useSeo } from '../utils/seo';
import { LocationCard } from '../components/ui/LocationCard';
import { SocialLinks } from '../components/ui/SocialLinks';

interface TextileProps {
  subRoute?: string;
}

const CATEGORIES = [
  { id: 'bazins', label: 'Bazins Riches' },
  { id: 'tissus', label: 'Tissus & Étoffes' },
];

const SORT_OPTIONS = [
  { id: 'ordre', label: 'Sélection ALFFA' },
  { id: 'prix-asc', label: 'Prix croissant' },
  { id: 'prix-desc', label: 'Prix décroissant' },
  { id: 'nouveautes', label: 'Nouveautés d’abord' },
];

export function Textile({ subRoute = '' }: TextileProps) {
  const { settings, brands, getProductsByShop, getFeaturedByShop } = useStore();
  const products = getProductsByShop('textile');
  const featured = getFeaturedByShop('textile');

  const initialBrand = subRoute.startsWith('marque/') ? subRoute.slice(7) : '';

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState(initialBrand);
  const [selectedModel, setSelectedModel] = useState('');
  const [sortOption, setSortOption] = useState('ordre');

  useEffect(() => {
    if (subRoute.startsWith('marque/')) {
      setSelectedBrand(subRoute.slice(7));
    }
  }, [subRoute]);

  useSeo({
    title: 'ALFFA NIGER Textile | Bazins Drews, Gagny Lah et Getzner au Niger',
    description:
      'Collection textile ALFFA NIGER : véritables bazins riches Drews, Gagny Lah, Getzner d’Autriche. Tissus damassés d’exception avec prix en FCFA et commande sur WhatsApp.',
    canonical: canonicalUrl(settings, '/textile'),
  });

  // Extract unique models
  const uniqueModels = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.model).filter(Boolean))) as string[];
  }, [products]);

  const newProducts = useMemo(() => {
    return products
      .filter((p) => p.isNew)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [products]);

  const filteredProducts = useMemo(() => {
    let result = products.filter((p) => {
      if (selectedCategory && p.category !== selectedCategory) return false;
      if (selectedBrand && p.brand !== selectedBrand) return false;
      if (selectedModel && p.model !== selectedModel) return false;
      if (search.trim()) {
        const query = search.toLowerCase();
        const haystack = [p.name, p.brand, p.model, p.description, p.specs]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });

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
  }, [products, search, selectedCategory, selectedBrand, selectedModel, sortOption]);

  const hasActiveFilters = Boolean(search || selectedCategory || selectedBrand || selectedModel);

  const resetFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setSelectedBrand('');
    setSelectedModel('');
    setSortOption('ordre');
  };

  const getBrandName = (brandId: string) => {
    return brands.find((b) => b.id === brandId)?.name || brandId;
  };

  return (
    <main className="bg-[var(--ivory)] text-[var(--night)]">
      {/* 1. Header Banner */}
      <section className="mx-auto grid max-w-7xl gap-10 px-4 pb-14 pt-12 sm:px-6 md:grid-cols-[1.1fr_1fr] md:items-center md:pt-16">
        <div>
          <p className="font-serif text-xl italic text-[var(--umber)]">
            ALFFA NIGER TEXTILE
          </p>
          <h1 className="mt-2 font-serif text-[clamp(2.1rem,6vw,5rem)] font-medium leading-[1.14] sm:leading-[1.05] text-[var(--night)]">
            Bazins & tissus <em className="text-[var(--cyan-deep)]">d’exception</em>
          </h1>
          <p className="mt-5 max-w-lg text-base sm:text-lg text-[var(--umber)] leading-relaxed">
            {settings.textileIntro}
          </p>

          {/* Search box */}
          <div className="mt-8 max-w-lg">
            <label className="relative flex items-center">
              <Search className="absolute left-4 h-5 w-5 text-[var(--umber)]/60 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un bazin, une marque (Drews, Gagny Lah...)"
                className="w-full min-h-14 rounded-2xl bg-white pl-12 pr-12 text-base text-[var(--night)] placeholder:text-slate-400 outline-none focus:ring-4 focus:ring-[var(--night)]/15 border border-[var(--sand)] shadow-sm font-serif text-lg"
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

        {/* Visual draped damask representation */}
        <div className="damask sheen relative aspect-[5/4] overflow-hidden rounded-[28px] shadow-lg border border-[var(--sand)]" aria-hidden="true">
          <div
            className="absolute inset-y-0 left-[18%] w-[22%] bg-[#13B8CE]/80 mix-blend-screen"
            style={{ clipPath: 'polygon(30% 0, 100% 0, 70% 100%, 0 100%)' }}
          />
          <div
            className="absolute inset-y-0 left-[46%] w-[26%] bg-[#c9a76a]/85"
            style={{ clipPath: 'polygon(30% 0, 100% 0, 70% 100%, 0 100%)' }}
          />
          <div
            className="absolute inset-y-0 left-[74%] w-[20%] bg-white/85"
            style={{ clipPath: 'polygon(30% 0, 100% 0, 70% 100%, 0 100%)' }}
          />
        </div>
      </section>

      {/* 2. Marques Textiles */}
      <section id="marques" className="mx-auto max-w-7xl scroll-mt-24 px-4 pb-16 sm:px-6">
        <h2 className="font-serif text-3xl sm:text-4xl font-medium text-[var(--night)]">
          Nos Grandes Marques
        </h2>
        <p className="mt-1 text-sm text-[var(--umber)]">
          Sélectionnez une marque pour filtrer instantanément le catalogue.
        </p>

        <div className="mt-6 flex flex-wrap gap-4">
          {brands.map((b) => {
            const isSelected = selectedBrand === b.id;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  setSelectedBrand(isSelected ? '' : b.id);
                  document.getElementById('catalogue')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`flex h-24 min-w-[180px] flex-1 items-center justify-center rounded-2xl border bg-white px-6 transition shadow-sm ${
                  isSelected
                    ? 'border-[var(--night)] ring-2 ring-[var(--night)] bg-[var(--ivory)]'
                    : 'border-[var(--sand)] hover:border-[#6B5636]/50'
                }`}
              >
                {b.logo ? (
                  <img
                    src={b.logo}
                    alt={`Logo marque ${b.name}`}
                    className="max-h-14 max-w-full object-contain"
                  />
                ) : (
                  <span className="font-serif text-2xl font-medium italic text-[var(--night)]">
                    {b.name}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Nouveautés Getzner spotlight banner */}
        <div className="mt-8 rounded-2xl bg-gradient-to-r from-[var(--night)] to-[var(--night-2)] p-6 sm:p-8 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl border border-white/10">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--cyan)]/20 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-[var(--cyan)]">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Derniers Arrivages Getzner</span>
            </div>
            <h3 className="font-serif text-2xl sm:text-3xl font-medium text-white">
              Nouveaux Bazins Getzner à 10 000 FCFA
            </h3>
            <p className="text-sm text-white/80 leading-relaxed font-light">
              Couleurs damassées d’exception (Bleu turquoise, Lilas nacré, Gris ardoise, Prune...) avec reflets scintillants et tissage authentique d’Autriche.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedBrand('getzner');
              document.getElementById('catalogue')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-[var(--cyan)] px-6 py-3.5 font-bold text-[var(--night)] transition hover:bg-[#22c7dc] shadow-md active:scale-95"
          >
            <span>Voir les 16 modèles Getzner</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* 3. Tissus à la une */}
      {!hasActiveFilters && featured.length > 0 && (
        <section className="bg-[#ECE3D2]/60 border-y border-[var(--sand)] py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[var(--cyan-deep)]" />
              <span className="font-serif text-base italic text-[var(--umber)]">
                Éclat & Raffinement
              </span>
            </div>
            <h2 className="mt-1 font-serif text-3xl sm:text-4xl font-medium text-[var(--night)]">
              Nos tissus à la une
            </h2>

            <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((product) => (
                <FabricCard
                  key={product.id}
                  product={product}
                  brandName={getBrandName(product.brand)}
                  tall
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 4. Nouveautés */}
      {!hasActiveFilters && newProducts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
          <h2 className="font-serif text-3xl sm:text-4xl font-medium text-[var(--night)]">
            Nouveautés en rayon
          </h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {newProducts.map((product) => (
              <FabricCard
                key={product.id}
                product={product}
                brandName={getBrandName(product.brand)}
              />
            ))}
          </div>
        </section>
      )}

      {/* 5. Catalogue Complet */}
      <section id="catalogue" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-16 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--sand)] pb-5">
          <div>
            <h2 className="font-serif text-3xl sm:text-4xl font-medium text-[var(--night)]">
              Toute la collection Textile
            </h2>
            <p className="font-serif text-base italic text-[var(--umber)] mt-1">
              {filteredProducts.length} référence{filteredProducts.length > 1 ? 's' : ''} répertoriée{filteredProducts.length > 1 ? 's' : ''}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-[var(--umber)]" />
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              aria-label="Trier les tissus"
              className="min-h-10 rounded-xl border border-[var(--sand)] bg-white px-3 font-serif text-sm font-medium text-[var(--night)] outline-none"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter controls */}
        <div className="mt-6 space-y-3">
          {/* Categories */}
          <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1">
            <button
              type="button"
              onClick={() => setSelectedCategory('')}
              className={`min-h-10 rounded-full px-4 font-serif text-sm whitespace-nowrap transition ${
                !selectedCategory
                  ? 'bg-[var(--night)] text-white font-medium shadow-sm'
                  : 'bg-white text-[var(--night)] border border-[var(--sand)] hover:bg-slate-100'
              }`}
            >
              Tous les tissus
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(selectedCategory === cat.id ? '' : cat.id)}
                className={`min-h-10 rounded-full px-4 font-serif text-sm whitespace-nowrap transition ${
                  selectedCategory === cat.id
                    ? 'bg-[var(--night)] text-white font-medium shadow-sm'
                    : 'bg-white text-[var(--night)] border border-[var(--sand)] hover:bg-slate-100'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Brands & Models */}
          <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1">
            <button
              type="button"
              onClick={() => setSelectedBrand('')}
              className={`min-h-10 rounded-full px-4 font-serif text-sm whitespace-nowrap transition ${
                !selectedBrand
                  ? 'bg-[var(--umber)] text-white font-medium'
                  : 'border border-[var(--sand)] bg-white text-[var(--night)]'
              }`}
            >
              Toutes marques
            </button>
            {brands.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelectedBrand(selectedBrand === b.id ? '' : b.id)}
                className={`min-h-10 rounded-full px-4 font-serif text-sm whitespace-nowrap transition ${
                  selectedBrand === b.id
                    ? 'bg-[var(--umber)] text-white font-medium'
                    : 'border border-[var(--sand)] bg-white text-[var(--night)]'
                }`}
              >
                {b.name}
              </button>
            ))}

            {uniqueModels.length > 0 && (
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                aria-label="Modèle de tissu"
                className="min-h-10 rounded-full border border-[var(--sand)] bg-white px-3 font-serif text-sm"
              >
                <option value="">Tous les modèles</option>
                {uniqueModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            )}

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="ml-auto min-h-10 text-xs font-semibold text-rose-700 hover:underline px-2"
              >
                Réinitialiser
              </button>
            )}
          </div>
        </div>

        {/* Catalog grid */}
        <div className="mt-10">
          {filteredProducts.length > 0 ? (
            <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product) => (
                <FabricCard
                  key={product.id}
                  product={product}
                  brandName={getBrandName(product.brand)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--sand)] p-12 text-center bg-white/50">
              <h3 className="font-serif text-2xl font-medium text-[var(--night)]">
                Aucun tissu ne correspond à votre recherche
              </h3>
              <p className="mt-2 text-sm text-[var(--umber)]">
                Modifiez vos critères ou parcourez nos grandes marques.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--night)] px-5 text-sm font-semibold text-white"
              >
                Réinitialiser
              </button>
            </div>
          )}
        </div>

        {/* Localisation de notre boutique textile */}
        <div className="mt-16">
          <LocationCard shop="textile" />
        </div>

        {/* Suivez ALFFA Niger */}
        <div className="mt-8">
          <SocialLinks variant="card" headingText="Suivez ALFFA Niger Textile" />
        </div>

        {/* Switch to Électronique */}
        <div className="mt-14 border-t border-[var(--sand)] pt-8 flex items-center justify-between">
          <a
            href={href('/electronique')}
            className="inline-flex items-center gap-2 font-serif text-xl italic text-[var(--night)] hover:text-[var(--cyan-deep)] transition"
          >
            <span>Découvrir également notre univers Électronique & Smartphones</span>
            <ArrowLeftRight className="h-5 w-5 text-[var(--cyan)]" />
          </a>
        </div>
      </section>
    </main>
  );
}
