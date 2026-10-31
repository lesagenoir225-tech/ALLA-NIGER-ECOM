import React from 'react';
import { MapPin, Navigation, ExternalLink, Clock, ShieldCheck } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { ShopType } from '../../types';
import { DEFAULT_MAPS_ELECTRONIQUE, DEFAULT_MAPS_TEXTILE } from '../../data/initialData';

interface LocationCardProps {
  shop: ShopType;
  className?: string;
  variant?: 'full' | 'compact';
}

export function LocationCard({ shop, className = '', variant = 'full' }: LocationCardProps) {
  const { settings } = useStore();

  const isElec = shop === 'electronique';
  const mapsUrl = isElec
    ? settings.mapsElectronique || DEFAULT_MAPS_ELECTRONIQUE
    : settings.mapsTextile || DEFAULT_MAPS_TEXTILE;

  const hasMapsLink = Boolean(mapsUrl && mapsUrl.trim() !== '');

  const shopTitle = isElec
    ? 'Boutique ALFFA Niger Électronique'
    : 'Boutique ALFFA Niger Textile';

  const sectionSubtitle = isElec
    ? 'Smartphones & Appareils électroniques'
    : 'Bazins Riches & Étoffes de prestige';

  return (
    <div
      className={`rounded-3xl border border-[var(--line)] bg-white p-6 sm:p-8 shadow-sm ${className}`}
      data-testid={`location-${shop}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`grid h-12 w-12 place-items-center rounded-2xl shadow-sm ${
              isElec
                ? 'bg-[var(--night)] text-[var(--cyan)]'
                : 'bg-[var(--sand)] text-[var(--umber)]'
            }`}
          >
            {/* Recognizable Map Pin Marker */}
            <MapPin className="h-6 w-6" strokeWidth={2.2} />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--cyan-deep)]">
              {isElec ? 'Nous trouver' : 'Localisation de notre boutique textile'}
            </span>
            <h3 className="font-display text-2xl sm:text-3xl font-bold uppercase text-[var(--night)] leading-tight">
              {shopTitle}
            </h3>
            <p className="text-xs text-[var(--muted)] font-medium mt-0.5">
              {sectionSubtitle}
            </p>
          </div>
        </div>

        {hasMapsLink && (
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Lieu vérifié
          </span>
        )}
      </div>

      {hasMapsLink ? (
        <div className="mt-6 space-y-4">
          <p className="text-sm text-slate-700 leading-relaxed">
            Consultez notre emplacement officiel sur Google Maps pour nous rendre visite, vérifier les accès et lancer votre guidage GPS en un clic.
          </p>

          {/* Action buttons: Voir sur Maps & Obtenir l'itinéraire */}
          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Voir la ${shopTitle} sur Google Maps`}
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--night)] px-5 font-bold text-white shadow-sm transition hover:bg-[var(--night-2)] hover:shadow active:scale-[0.99] text-center text-sm sm:text-base"
            >
              <ExternalLink className="h-4 w-4 text-[var(--cyan)]" />
              <span>Voir notre boutique sur Google Maps</span>
            </a>

            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Obtenir l'itinéraire vers la ${shopTitle}`}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-[var(--night)] px-5 font-bold text-[var(--night)] transition hover:bg-slate-50 active:scale-[0.99] text-center text-sm sm:text-base"
            >
              <Navigation className="h-4 w-4 text-[var(--cyan-deep)]" />
              <span>Obtenir l’itinéraire</span>
            </a>
          </div>

          <div className="flex items-center gap-2 pt-2 text-xs text-[var(--muted)]">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Lien officiel Google Maps fourni par ALFFA Niger</span>
          </div>
        </div>
      ) : (
        /* Repli si aucun lien n'est renseigné dans les paramètres */
        <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center space-y-2">
          <Clock className="h-6 w-6 text-slate-400 mx-auto" />
          <p className="font-semibold text-slate-700 text-base">
            Localisation en cours de mise à jour
          </p>
          <p className="text-xs text-[var(--muted)] max-w-md mx-auto leading-relaxed">
            Le lien Google Maps de cette boutique n'est pas disponible pour le moment. Contactez-nous sur WhatsApp pour obtenir l'itinéraire.
          </p>
        </div>
      )}
    </div>
  );
}
