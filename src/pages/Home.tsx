import React from 'react';
import { ArrowRight, Tag, BadgeCheck, Store, MessageCircle, Smartphone, Sparkles, Briefcase } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { href, canonicalUrl, scrollToTop } from '../utils/router';
import { useSeo } from '../utils/seo';
import { isValidWhatsApp, normalizeWhatsApp } from '../utils/format';
import { SocialLinks } from '../components/ui/SocialLinks';
import { LocationCard } from '../components/ui/LocationCard';
import { ElecCard } from '../components/cards/ElecCard';
import { FabricCard } from '../components/cards/FabricCard';

export function Home() {
  const { settings, brands, getProductsByShop, getFeaturedByShop } = useStore();

  useSeo({
    title: 'ALFFA NIGER | La qualité au meilleur prix — Électronique et Textile',
    description:
      'Plateforme officielle ALFFA NIGER : smartphones certifiés (iPhone, Samsung) et bazins de prestige (Drews, Gagny Lah, Getzner). Prix affichés en FCFA, commandes directes sur WhatsApp.',
    canonical: canonicalUrl(settings, '/'),
  });

  const hasElecWa = isValidWhatsApp(settings.whatsappElectronique);
  const hasTextileWa = isValidWhatsApp(settings.whatsappTextile);

  const getBrandName = (brandId: string) => {
    return brands.find((b) => b.id === brandId)?.name || brandId;
  };

  // Curated showcase products for both boutiques
  const elecFeatured = getFeaturedByShop('electronique');
  const elecAll = getProductsByShop('electronique');
  const elecProducts = (
    elecFeatured.length >= 4 ? elecFeatured : elecAll
  ).slice(0, 4);

  const textileFeatured = getFeaturedByShop('textile');
  const textileAll = getProductsByShop('textile');
  const textileProducts = (
    textileFeatured.length
      ? [
          ...textileFeatured,
          ...textileAll.filter((p) => !textileFeatured.some((f) => f.id === p.id)),
        ]
      : textileAll
  ).slice(0, 4);

  return (
    <main>
      {/* 1. Hero Introduction */}
      <section className="mx-auto max-w-7xl px-4 pb-8 pt-12 sm:px-6 md:pt-16">
        <p className="rise font-display text-lg font-semibold uppercase tracking-[0.24em] text-[var(--cyan-deep)]">
          {settings.name || 'ALFFA NIGER'}
        </p>
        <h1 className="rise mt-2 max-w-5xl text-balance font-display text-[clamp(2.2rem,6.5vw,5rem)] font-bold leading-[1.12] sm:leading-[1.04] tracking-[-0.01em] text-[var(--night)]">
          {settings.heroTitle || 'La qualité au meilleur prix.'}
        </h1>
        <p className="rise mt-5 max-w-2xl text-lg text-[var(--muted)] md:text-xl leading-relaxed">
          {settings.heroSubtitle}
        </p>
      </section>

      {/* 2. Split Portal: The Two Distinct Universes */}
      <section aria-label="Choisir une boutique" className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Accès à la rubrique institutionnelle — premier bouton de la zone boutiques.
            Reprend exactement les dimensions, arrondis et la typographie des boutons
            d'entrée des boutiques (min-h-14, rounded-xl, px-7, text-lg font-bold). */}
        <a
          href={href('/experience-entrepreneuriale')}
          onClick={() => scrollToTop(true)}
          className="mb-4 inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-[var(--cyan)] px-7 text-lg font-bold text-[var(--night)] transition hover:bg-[#22c7dc] shadow-lg active:scale-[0.99] sm:mb-5 sm:min-h-14 sm:w-fit"
        >
          <Briefcase className="h-5 w-5" aria-hidden="true" />
          <span>Expérience entrepreneuriale</span>
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </a>

        {/* Desktop Split View with angled polygon cut */}
        <div className="relative hidden h-[620px] overflow-hidden rounded-[28px] md:block shadow-xl border border-black/5">
          {/* Left panel: Électronique */}
          <div className="split-left absolute inset-0 bg-[var(--night)] flex flex-col justify-between p-8 md:p-12 md:pr-[52%] text-white">
            <div>
              <p className="font-display text-lg font-semibold uppercase tracking-[0.2em] text-[#6fdcea]">
                Boutique n° 1
              </p>
              <h2 className="mt-1 font-display text-5xl font-bold uppercase leading-tight text-white md:text-6xl">
                Électronique
              </h2>
              <p className="mt-4 max-w-xs text-lg text-white/80 leading-snug">
                Smartphones haut de gamme, iPhone et Samsung avec prix réels en FCFA.
              </p>
            </div>

            {/* Visual phones mock */}
            <div className="relative my-4 flex h-48 items-end justify-center gap-4" aria-hidden="true">
              {[0.82, 1, 0.9].map((scale, i) => (
                <div
                  key={i}
                  className="relative rounded-[22px] border-2 border-white/25 bg-gradient-to-b from-white/10 to-white/[0.03] shadow-lg"
                  style={{
                    height: `${scale * 100}%`,
                    aspectRatio: '9/19',
                    transform: `translateY(${i === 1 ? -12 : 0}px) rotate(${(i - 1) * 6}deg)`,
                  }}
                >
                  <div className="absolute left-1/2 top-2.5 h-1.5 w-10 -translate-x-1/2 rounded-full bg-white/25" />
                  {i === 1 && (
                    <div className="absolute inset-x-3 bottom-6 h-1 rounded-full bg-[var(--cyan)]" />
                  )}
                </div>
              ))}
            </div>

            <a
              href={href('/electronique')}
              onClick={() => scrollToTop(true)}
              className="inline-flex min-h-14 w-fit items-center gap-2.5 rounded-xl bg-[var(--cyan)] px-7 text-lg font-bold text-[var(--night)] transition hover:bg-[#22c7dc] shadow-lg active:scale-[0.99]"
            >
              <span>Entrer dans l'Électronique</span>
              <ArrowRight className="h-5 w-5" />
            </a>
          </div>

          {/* Right panel: Textile */}
          <div className="split-right absolute inset-0 bg-[var(--ivory)] flex flex-col justify-between p-8 md:p-12 md:pl-[59%] text-[var(--night)]">
            <div>
              <p className="font-serif text-xl italic text-[var(--umber)]">
                Boutique n° 2
              </p>
              <h2 className="mt-1 font-serif text-5xl font-medium leading-tight text-[var(--night)] md:text-6xl">
                Textile & Bazins
              </h2>
              <p className="mt-4 max-w-xs text-lg text-[var(--umber)] leading-snug">
                Bazins damassés Drews, Gagny Lah, Getzner sélectionnés pour leur prestige.
              </p>
            </div>

            {/* Visual textile phones mock with real Bazin textures */}
            <div className="relative my-4 flex h-48 items-end justify-center gap-4" aria-hidden="true">
              {[
                { name: 'Bazin Drews', image: '/images/products/textile/bazin-drews.jpg', label: 'Drews' },
                { name: 'Bazin Gagny Lah', image: '/images/products/textile/bazin-gagny-lah.jpg', label: 'Gagny Lah' },
                { name: 'Bazin Getzner', image: '/images/products/textile/bazin-getzner.jpg', label: 'Getzner' },
              ].map((bazin, i) => (
                <div
                  key={bazin.name}
                  className="group relative rounded-[22px] border-2 border-[var(--night)]/25 bg-white shadow-xl overflow-hidden"
                  style={{
                    height: '100%',
                    aspectRatio: '9/19',
                    transform: `rotate(${(i - 1) * 6}deg)`,
                  }}
                >
                  {/* Real Bazin texture photo with damask weave sheen */}
                  <div className="absolute inset-1 rounded-[17px] overflow-hidden bg-neutral-900">
                    <img
                      src={bazin.image}
                      alt={bazin.name}
                      className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                    {/* Fabric damask sheen and depth gradient */}
                    <div className="sheen absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                    {/* Bazin prestige badge */}
                    <div className="absolute bottom-2 inset-x-1 text-center">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-white bg-black/60 backdrop-blur-xs shadow-sm">
                        {bazin.label}
                      </span>
                    </div>
                  </div>

                  {/* Phone speaker pill */}
                  <div className="absolute left-1/2 top-2.5 h-1.5 w-10 -translate-x-1/2 rounded-full bg-white/70 shadow-sm z-10" />
                </div>
              ))}
            </div>

            <a
              href={href('/textile')}
              onClick={() => scrollToTop(true)}
              className="inline-flex min-h-14 w-fit items-center gap-2.5 rounded-xl bg-[var(--night)] px-7 text-lg font-bold text-white transition hover:bg-[var(--night-2)] shadow-lg active:scale-[0.99]"
            >
              <span>Découvrir la collection Textile</span>
              <ArrowRight className="h-5 w-5 text-[var(--cyan)]" />
            </a>
          </div>

          {/* Dividing stylized lightning line */}
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <polyline
              className="bolt-pulse"
              points="55,0 47.5,53 53.5,53 45,100"
              fill="none"
              stroke="#13B8CE"
              strokeWidth="7"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>

        {/* Mobile Stacked View */}
        <div className="space-y-0 overflow-hidden rounded-[24px] md:hidden shadow-lg border border-black/5">
          {/* Mobile Elec Card */}
          <div className="bg-[var(--night)] p-7 text-white">
            <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-[#6fdcea]">
              Boutique n° 1
            </p>
            <h2 className="mt-1 font-display text-4xl font-bold uppercase text-white">
              Électronique
            </h2>
            <p className="mt-2 text-base text-white/80">
              iPhone, Samsung, smartphones. Prix en FCFA et commande sur WhatsApp.
            </p>
            <a
              href={href('/electronique')}
              onClick={() => scrollToTop(true)}
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--cyan)] px-5 font-bold text-[var(--night)]"
            >
              <span>Explorer l'Électronique</span>
              <ArrowRight className="h-5 w-5" />
            </a>
          </div>

          {/* Connecting divider */}
          <div className="h-3 bg-[var(--cyan)]" />

          {/* Mobile Textile Card */}
          <div className="bg-[var(--ivory)] p-7 text-[var(--night)]">
            <p className="font-serif text-base italic text-[var(--umber)]">
              Boutique n° 2
            </p>
            <h2 className="mt-1 font-serif text-4xl font-medium text-[var(--night)]">
              Textile & Bazins
            </h2>
            <p className="mt-2 text-base text-[var(--umber)]">
              Bazins Drews, Gagny Lah, Getzner de premier choix.
            </p>
            <a
              href={href('/textile')}
              onClick={() => scrollToTop(true)}
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--night)] px-5 font-bold text-white"
            >
              <span>Explorer le Textile</span>
              <ArrowRight className="h-5 w-5 text-[var(--cyan)]" />
            </a>
          </div>
        </div>
      </section>

      {/* 3. Aperçu Produits Électronique */}
      <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6" aria-labelledby="home-elec-heading">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--line)] pb-5">
          <div>
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-[var(--cyan-deep)]" />
              <span className="font-display text-xs font-bold uppercase tracking-[0.2em] text-[var(--cyan-deep)]">
                Boutique Électronique
              </span>
            </div>
            <h2 id="home-elec-heading" className="mt-1 font-display text-3xl sm:text-4xl font-bold uppercase text-[var(--night)]">
              Smartphones à la une
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)] max-w-xl">
              iPhone et Samsung certifiés avec prix réels affichés en FCFA et commande directe sur WhatsApp.
            </p>
          </div>

          <a
            href={href('/electronique')}
            onClick={() => scrollToTop(true)}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--night)] px-5 text-sm font-bold text-white transition hover:bg-[var(--night-2)] shadow-sm active:scale-[0.99]"
          >
            <span>Toute la boutique Électronique</span>
            <ArrowRight className="h-4 w-4 text-[var(--cyan)]" />
          </a>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {elecProducts.map((product) => (
            <ElecCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* 4. Aperçu Produits Textile & Bazins */}
      <section className="mt-20 bg-[#ECE3D2]/45 border-y border-[var(--sand)] py-16" aria-labelledby="home-textile-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--sand)] pb-5">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[var(--umber)]" />
                <span className="font-serif text-base italic text-[var(--umber)]">
                  Boutique Textile & Bazins
                </span>
              </div>
              <h2 id="home-textile-heading" className="mt-1 font-serif text-3xl sm:text-4xl font-medium text-[var(--night)]">
                Bazins & Étoffes de prestige
              </h2>
              <p className="mt-1 text-sm text-[var(--umber)]/80 max-w-xl">
                Véritables bazins autrichiens damassés Getzner (nouveaux arrivages à 10 000 FCFA), Drews et Gagny Lah sélectionnés pour leur brillance.
              </p>
            </div>

            <a
              href={href('/textile')}
              onClick={() => scrollToTop(true)}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--night)] px-5 text-sm font-bold text-white transition hover:bg-[var(--night-2)] shadow-sm active:scale-[0.99]"
            >
              <span>Toute la collection Textile</span>
              <ArrowRight className="h-4 w-4 text-[var(--cyan)]" />
            </a>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {textileProducts.map((product) => (
              <FabricCard
                key={product.id}
                product={product}
                brandName={getBrandName(product.brand)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 5. Nos Engagements */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <h2 className="font-display text-3xl sm:text-4xl font-bold uppercase text-[var(--night)]">
          Nos engagements de confiance
        </h2>
        <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div className="border-t-4 border-[var(--cyan)] pt-5">
            <Tag className="h-7 w-7 text-[var(--night)]" />
            <h3 className="mt-3 font-display text-2xl font-bold text-[var(--night)]">
              Prix clairs en FCFA
            </h3>
            <p className="mt-2 text-[var(--muted)] leading-relaxed">
              Tous nos prix sont exprimés en FCFA sans frais cachés. Lorsque le montant dépend du cours ou du modèle, nous mentionnons clairement "Prix sur demande".
            </p>
          </div>

          <div className="border-t-4 border-[var(--cyan)] pt-5">
            <BadgeCheck className="h-7 w-7 text-[var(--night)]" />
            <h3 className="mt-3 font-display text-2xl font-bold text-[var(--night)]">
              Produits certifiés authentiques
            </h3>
            <p className="mt-2 text-[var(--muted)] leading-relaxed">
              Nous sélectionnons uniquement des smartphones authentiques et des étoffes de grand renom. Chaque fiche reflète l'état et la description exacte.
            </p>
          </div>

          <div className="border-t-4 border-[var(--cyan)] pt-5">
            <Store className="h-7 w-7 text-[var(--night)]" />
            <h3 className="mt-3 font-display text-2xl font-bold text-[var(--night)]">
              Deux boutiques spécialisées
            </h3>
            <p className="mt-2 text-[var(--muted)] leading-relaxed">
              Une séparation totale entre l'univers de la téléphonie et celui du textile, avec des conseillers dédiés sur chaque canal WhatsApp.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Comment commander */}
      <section className="bg-[var(--mist)] border-y border-[var(--line)]">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 md:grid-cols-[1fr_1.3fr] items-center">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--cyan-deep)]">
              Processus fluide
            </span>
            <h2 className="mt-2 font-display text-4xl font-bold uppercase text-[var(--night)]">
              Comment commander ?
            </h2>
            <p className="mt-3 text-lg text-[var(--muted)] leading-relaxed">
              Pas de formulaire fastidieux ni de compte obligatoire. Tout se passe en direct avec notre équipe commerciale sur WhatsApp.
            </p>
          </div>

          <ol className="space-y-6">
            {[
              {
                step: '1',
                title: 'Parcourez le catalogue',
                desc: 'Consultez les photos réelles, caractéristiques techniques et prix en FCFA de chaque produit.',
              },
              {
                step: '2',
                title: 'Touchez « Commander sur WhatsApp »',
                desc: 'Un message pré-rédigé avec le nom du produit, sa référence et son prix s’ouvre directement dans votre application WhatsApp.',
              },
              {
                step: '3',
                title: 'Notre équipe confirme et livre',
                desc: 'Notre conseiller vérifie immédiatement la disponibilité physique et organise la livraison ou le retrait selon vos souhaits.',
              },
            ].map((item) => (
              <li key={item.step} className="flex gap-5 items-start">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--night)] font-display text-2xl font-bold text-[var(--cyan)] shadow-sm">
                  {item.step}
                </span>
                <div>
                  <h3 className="font-display text-xl font-bold text-[var(--night)]">
                    {item.title}
                  </h3>
                  <p className="text-[var(--muted)] mt-1 text-sm sm:text-base leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 5. Suivez ALFFA Niger & Réseaux Sociaux */}
      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
        <SocialLinks variant="card" headingText="Suivez ALFFA Niger sur nos réseaux" />
      </section>

      {/* 6. Nos Boutiques & Localisation Google Maps */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6" aria-labelledby="home-locations">
        <div className="mb-6">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--cyan-deep)]">
            Points de vente
          </span>
          <h2 id="home-locations" className="font-display text-3xl sm:text-4xl font-bold uppercase text-[var(--night)] mt-0.5">
            Nos Boutiques
          </h2>
          <p className="text-sm text-[var(--muted)] mt-1">
            Retrouvez nos espaces dédiés à Niamey pour vos achats de smartphones et de bazins.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <LocationCard shop="electronique" />
          <LocationCard shop="textile" />
        </div>
      </section>

      {/* 7. Direct WhatsApp contact CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="flex flex-col gap-6 rounded-[24px] bg-[var(--night)] p-8 text-white md:flex-row md:items-center md:justify-between md:p-12 shadow-xl">
          <div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold uppercase text-white">
              Une question ou une demande spéciale ?
            </h2>
            <p className="mt-2 text-base sm:text-lg text-white/80 max-w-xl">
              Contactez directement le service client de la boutique qui vous intéresse :
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {hasElecWa && (
              <a
                href={`https://wa.me/${normalizeWhatsApp(settings.whatsappElectronique)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--cyan)] px-5 font-bold text-[var(--night)] hover:bg-[#22c7dc] transition"
              >
                <MessageCircle className="h-5 w-5" />
                <span>WhatsApp Électronique</span>
              </a>
            )}
            {hasTextileWa && (
              <a
                href={`https://wa.me/${normalizeWhatsApp(settings.whatsappTextile)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 font-bold text-[var(--night)] hover:bg-slate-100 transition"
              >
                <MessageCircle className="h-5 w-5 text-[var(--cyan)]" />
                <span>WhatsApp Textile</span>
              </a>
            )}
            <a
              href={href('/contact')}
              onClick={() => scrollToTop(true)}
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/30 px-5 font-semibold text-white hover:border-white transition"
            >
              Tous nos contacts
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
