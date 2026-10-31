import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { normalizeWhatsApp } from '../../utils/format';

interface SocialLinksProps {
  className?: string;
  variant?: 'light' | 'dark' | 'card';
  showHeading?: boolean;
  headingText?: string;
}

export function SocialLinks({
  className = '',
  variant = 'card',
  showHeading = true,
  headingText = 'Suivez ALFFA Niger',
}: SocialLinksProps) {
  const { settings } = useStore();

  const facebookUrl = settings.facebook || 'https://www.facebook.com/share/1BpsCF3tBK/?mibextid=wwXIfr';
  const instagramUrl = settings.instagram || 'https://www.instagram.com/khalil_baye?srtk=NzVnbzJ2dmFvNnhr';
  const tiktokUrl = settings.tiktok || 'https://www.tiktok.com/@alffaniger?_r=1&_t=ZS-9AQ5RF69CYY';

  const rawWa = settings.whatsappElectronique || settings.whatsappTextile || '22796222310';
  const waNorm = normalizeWhatsApp(rawWa);
  const defaultWaMessage = encodeURIComponent(
    'Bonjour ALFFA Niger, je souhaite obtenir des informations sur vos produits.'
  );
  const waUrl = `https://wa.me/${waNorm}?text=${defaultWaMessage}`;

  const isDark = variant === 'dark';
  const isCard = variant === 'card';

  return (
    <div
      className={`${
        isCard
          ? 'rounded-3xl border border-[var(--line)] bg-white p-6 sm:p-8 shadow-sm'
          : ''
      } ${className}`}
    >
      {showHeading && (
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--cyan-deep)]">
            Communauté & Contact
          </p>
          <h3
            className={`font-display text-2xl sm:text-3xl font-bold uppercase leading-tight ${
              isDark ? 'text-white' : 'text-[var(--night)]'
            }`}
          >
            {headingText}
          </h3>
          <p
            className={`text-sm mt-1 max-w-md ${
              isDark ? 'text-white/70' : 'text-[var(--muted)]'
            }`}
          >
            Retrouvez nos arrivages exclusifs, nos conseils et échangez avec nous sur nos réseaux officiels.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-1">
        {/* Facebook */}
        <a
          href={facebookUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Suivre ALFFA Niger sur Facebook"
          className="group inline-flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#1877F2] hover:text-[#1877F2] hover:shadow-md active:scale-95"
        >
          <svg
            className="h-5 w-5 fill-current text-[#1877F2] transition-transform duration-200 group-hover:scale-110"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          <span>Facebook</span>
        </a>

        {/* Instagram */}
        <a
          href={instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Suivre ALFFA Niger sur Instagram"
          className="group inline-flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#E1306C] hover:text-[#E1306C] hover:shadow-md active:scale-95"
        >
          <svg
            className="h-5 w-5 fill-current text-[#E1306C] transition-transform duration-200 group-hover:scale-110"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
          </svg>
          <span>Instagram</span>
        </a>

        {/* TikTok */}
        <a
          href={tiktokUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Suivre ALFFA Niger sur TikTok"
          className="group inline-flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-black hover:text-black hover:shadow-md active:scale-95"
        >
          <svg
            className="h-5 w-5 fill-current text-black transition-transform duration-200 group-hover:scale-110"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.85.12V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.5 6.3 6.3 0 0 0 1.86-4.49V8.78a8.16 8.16 0 0 0 4.77 1.52v-3.45a4.85 4.85 0 0 1-.86-.16z" />
          </svg>
          <span>TikTok</span>
        </a>

        {/* WhatsApp Pro */}
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Contacter ALFFA Niger sur WhatsApp au +227 96 22 23 10"
          className="group inline-flex items-center gap-2.5 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-600 hover:text-white hover:shadow-md active:scale-95"
        >
          <MessageCircle className="h-5 w-5 text-emerald-600 group-hover:text-white transition-colors duration-200" />
          <span>WhatsApp : +227 96 22 23 10</span>
        </a>
      </div>
    </div>
  );
}
