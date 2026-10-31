import React, { useRef } from 'react';
import { MessageCircle, MapPin, ExternalLink, Navigation } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { href, scrollToTop, navigate } from '../../utils/router';
import { useStore } from '../../context/StoreContext';
import { normalizeWhatsApp } from '../../utils/format';

export function Footer() {
  const { settings } = useStore();
  const lastTapRef = useRef<number>(0);

  const handleAdminTrigger = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    scrollToTop(true);
    navigate('/admin');
  };

  const handleTouchTrigger = (e: React.TouchEvent) => {
    const now = Date.now();
    if (now - lastTapRef.current < 400 && now - lastTapRef.current > 0) {
      e.preventDefault();
      scrollToTop(true);
      navigate('/admin');
    }
    lastTapRef.current = now;
  };

  const facebookUrl = settings.facebook || 'https://www.facebook.com/share/1BpsCF3tBK/?mibextid=wwXIfr';
  const instagramUrl = settings.instagram || 'https://www.instagram.com/khalil_baye?srtk=NzVnbzJ2dmFvNnhr';
  const tiktokUrl = settings.tiktok || 'https://www.tiktok.com/@alffaniger?_r=1&_t=ZS-9AQ5RF69CYY';

  const rawWa = settings.whatsappElectronique || settings.whatsappTextile || '22796222310';
  const waNorm = normalizeWhatsApp(rawWa);
  const waDefaultMsg = encodeURIComponent(
    'Bonjour ALFFA Niger, je souhaite obtenir des informations sur vos produits.'
  );
  const waUrl = `https://wa.me/${waNorm}?text=${waDefaultMsg}`;

  const elecMapsUrl = settings.mapsElectronique || 'https://maps.app.goo.gl/yr1v33pcPDGsSSpe8?g_st=ic';
  const textileMapsUrl = settings.mapsTextile || '';

  return (
    <footer className="bg-[var(--night)] text-white border-t border-white/10 mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1.1fr_0.9fr]">
          {/* Col 1: Brand & Slogan */}
          <div className="space-y-4">
            <Logo onDark className="h-10" />
            <p className="font-display text-2xl font-bold text-white/95 leading-tight">
              {settings.slogan || 'La qualité au meilleur prix.'}
            </p>
            <p className="text-sm text-white/70 max-w-sm leading-relaxed">
              Votre référence au Niger pour les smartphones certifiés (iPhone, Samsung) et les bazins damassés de grand prestige (Drews, Gagny Lah, Getzner).
            </p>

            {/* Social Icons inside Footer */}
            <div className="pt-2">
              <span className="block text-xs font-bold uppercase tracking-wider text-[#6fdcea] mb-2">
                Réseaux sociaux officiels
              </span>
              <div className="flex items-center gap-2.5">
                {/* Facebook */}
                <a
                  href={facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook ALFFA Niger"
                  className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-white transition hover:bg-[#1877F2] hover:scale-105"
                  title="Facebook ALFFA Niger"
                >
                  <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>

                {/* Instagram */}
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram ALFFA Niger"
                  className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-white transition hover:bg-[#E1306C] hover:scale-105"
                  title="Instagram ALFFA Niger"
                >
                  <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>

                {/* TikTok */}
                <a
                  href={tiktokUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok ALFFA Niger"
                  className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-white transition hover:bg-black hover:scale-105"
                  title="TikTok ALFFA Niger"
                >
                  <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.85.12V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.5 6.3 6.3 0 0 0 1.86-4.49V8.78a8.16 8.16 0 0 0 4.77 1.52v-3.45a4.85 4.85 0 0 1-.86-.16z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* WhatsApp Pro Direct Button */}
            <div className="pt-1">
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--cyan)] px-4 py-2.5 text-xs sm:text-sm font-bold text-[var(--night)] hover:bg-[#22c7dc] transition shadow-md"
              >
                <MessageCircle className="h-4 w-4" />
                <span>WhatsApp : +227 96 22 23 10</span>
              </a>
            </div>
          </div>

          {/* Col 2: Nos Deux Boutiques & Navigation */}
          <div>
            <h2 className="font-display text-lg font-semibold uppercase tracking-[0.14em] text-[#6fdcea]">
              Nos Deux Boutiques
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm text-white/80">
              <li>
                <a
                  href={href('/electronique')}
                  className="hover:text-white hover:underline transition font-semibold text-white/95"
                >
                  ALFFA Niger Électronique
                </a>
              </li>
              <li>
                <a
                  href={href('/electronique/marque/apple')}
                  className="pl-2 text-white/60 hover:text-white transition"
                >
                  · Smartphones iPhone / Apple
                </a>
              </li>
              <li>
                <a
                  href={href('/electronique/marque/samsung')}
                  className="pl-2 text-white/60 hover:text-white transition"
                >
                  · Smartphones Samsung Galaxy
                </a>
              </li>
              <li>
                <a
                  href={href('/electronique/catalogue')}
                  className="pl-2 text-white/60 hover:text-white transition"
                >
                  · Tout le catalogue Électronique
                </a>
              </li>
              <li className="pt-2">
                <a
                  href={href('/textile')}
                  className="hover:text-white hover:underline transition font-serif italic text-base text-white/95"
                >
                  ALFFA Niger Textile
                </a>
              </li>
              <li>
                <a
                  href={href('/textile/marques')}
                  className="pl-2 text-white/60 hover:text-white transition"
                >
                  · Drews, Gagny Lah, Getzner
                </a>
              </li>
              <li>
                <a
                  href={href('/textile/catalogue')}
                  className="pl-2 text-white/60 hover:text-white transition"
                >
                  · Tous nos bazins et tissus
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Localisation des Boutiques */}
          <div>
            <h2 className="font-display text-lg font-semibold uppercase tracking-[0.14em] text-[#6fdcea]">
              Nos Boutiques & Accès
            </h2>
            <div className="mt-4 space-y-4 text-sm text-white/80">
              {/* Boutique Électronique Maps */}
              <div className="rounded-xl bg-white/5 border border-white/10 p-3.5 space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[var(--cyan)] shrink-0" />
                  <span className="font-semibold text-white text-xs uppercase tracking-wider">
                    Boutique Électronique
                  </span>
                </div>
                <p className="text-xs text-white/70">
                  Emplacement certifié sur Google Maps avec itinéraire GPS direct.
                </p>
                <div className="pt-1 flex flex-col gap-1.5">
                  <a
                    href={elecMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6fdcea] hover:text-white hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Voir sur Google Maps</span>
                  </a>
                  <a
                    href={elecMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-white/70 hover:text-white"
                  >
                    <Navigation className="h-3 w-3" />
                    <span>Obtenir l’itinéraire</span>
                  </a>
                </div>
              </div>

              {/* Boutique Textile Maps (Emplacement prévu) */}
              <div className="rounded-xl bg-white/5 border border-white/10 p-3.5 space-y-1.5">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[var(--sand)] shrink-0" />
                  <span className="font-serif italic text-white text-xs">
                    Boutique Textile
                  </span>
                </div>
                {textileMapsUrl ? (
                  <a
                    href={textileMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6fdcea] hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Voir sur Google Maps</span>
                  </a>
                ) : (
                  <p className="text-xs text-white/50 italic">
                    Localisation bientôt disponible
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Col 4: Informations légales & Gestion */}
          <div>
            <h2 className="font-display text-lg font-semibold uppercase tracking-[0.14em] text-[#6fdcea]">
              Informations
            </h2>
            <ul className="mt-4 space-y-2 text-sm text-white/80">
              <li>
                <a
                  href={href('/experience-entrepreneuriale')}
                  className="hover:text-white hover:underline transition font-semibold text-white/95"
                >
                  Expérience entrepreneuriale
                </a>
              </li>
              <li>
                <a href={href('/contact')} className="hover:text-white transition">
                  Page Contact
                </a>
              </li>
              <li>
                <a href={href('/mentions-legales')} className="hover:text-white transition">
                  Mentions légales
                </a>
              </li>
              <li>
                <a href={href('/confidentialite')} className="hover:text-white transition">
                  Politique de confidentialité
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/60">
          <p>
            ©{' '}
            <button
              type="button"
              onDoubleClick={handleAdminTrigger}
              onTouchEnd={handleTouchTrigger}
              className="cursor-default select-none transition-colors hover:text-white/80 focus:outline-none"
              title="2018"
            >
              2018
            </button>{' '}
            ALFFA NIGER. Tous droits réservés.
          </p>
          <p className="text-center sm:text-right">
            Prix exprimés en francs CFA (FCFA) · Commande et livraison facilitées par WhatsApp (+227 96 22 23 10)
          </p>
        </div>

        {/* Signature développeur */}
        <div className="mt-3 text-center">
          <p className="text-[11px] font-light tracking-wide text-white/40 flex items-center justify-center gap-1.5">
            <span>Développé par Amadou Aboubakar</span>
            <span>—</span>
            <button
              type="button"
              onDoubleClick={handleAdminTrigger}
              onTouchEnd={handleTouchTrigger}
              className="cursor-default select-none transition-colors hover:text-white/70 focus:outline-none"
              title="2018"
            >
              2018
            </button>
          </p>
        </div>
      </div>
    </footer>
  );
}
