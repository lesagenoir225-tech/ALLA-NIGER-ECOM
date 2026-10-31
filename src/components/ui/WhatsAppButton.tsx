import React from 'react';
import { MessageCircle, AlertTriangle } from 'lucide-react';
import { Product, ShopType } from '../../types';
import { useStore } from '../../context/StoreContext';
import { buildOrderMessage, buildWhatsAppLink, isValidWhatsApp } from '../../utils/format';
import { productUrl } from '../../utils/router';

interface WhatsAppButtonProps {
  shop: ShopType;
  product: Product;
  quantity?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showAdminWarning?: boolean;
}

export function WhatsAppButton({
  shop,
  product,
  quantity = 1,
  size = 'md',
  className = '',
  showAdminWarning = true,
}: WhatsAppButtonProps) {
  const { settings, isAdmin } = useStore();

  const shopLabel =
    shop === 'electronique' ? 'ALFFA NIGER ÉLECTRONIQUE' : 'ALFFA NIGER TEXTILE';
  const whatsappNumber =
    shop === 'electronique'
      ? settings.whatsappElectronique
      : settings.whatsappTextile;

  const currentUrl =
    typeof window !== 'undefined'
      ? productUrl(settings, shop, product.id)
      : '';

  const orderMessage = buildOrderMessage({
    shopLabel,
    product,
    quantity,
    productUrl: currentUrl,
  });

  const waLink = buildWhatsAppLink(whatsappNumber, orderMessage);
  const isConfigured = isValidWhatsApp(whatsappNumber);
  const isUnavailable = product.availability === 'indisponible';

  const sizeClasses = {
    sm: 'min-h-10 px-3.5 text-sm',
    md: 'min-h-12 px-5 text-base',
    lg: 'min-h-14 px-7 text-lg',
  }[size];

  const buttonText = isUnavailable
    ? 'Demander la disponibilité'
    : 'Commander sur WhatsApp';

  if (!isConfigured) {
    return (
      <div className={`w-full ${className}`}>
        <button
          type="button"
          disabled
          aria-disabled="true"
          data-testid="wa-disabled"
          className={`w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 font-semibold text-slate-500 bg-slate-50/60 cursor-not-allowed select-none ${sizeClasses}`}
          title="Le numéro WhatsApp de cette boutique n'est pas encore configuré"
        >
          <MessageCircle className="h-5 w-5 shrink-0 opacity-60" />
          <span>WhatsApp bientôt disponible</span>
        </button>

        {isAdmin && showAdminWarning && (
          <p className="mt-1.5 flex items-start gap-1.5 text-xs text-amber-800 bg-amber-50/90 border border-amber-200/60 p-2 rounded-lg">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <span>
              <strong>Note Admin :</strong> Numéro WhatsApp {shop === 'electronique' ? 'Électronique' : 'Textile'} non configuré. Renseignez-le dans l’espace <strong>Administration → Coordonnées</strong>.
            </span>
          </p>
        )}
      </div>
    );
  }

  return (
    <a
      href={waLink!}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="wa-link"
      className={`w-full inline-flex items-center justify-center gap-2.5 rounded-xl bg-[var(--cyan)] font-bold text-[var(--night)] shadow-[0_8px_20px_-8px_rgba(19,184,206,0.8)] transition hover:bg-[#22c7dc] hover:shadow-[0_12px_24px_-8px_rgba(19,184,206,0.9)] active:scale-[0.99] text-center ${sizeClasses} ${className}`}
      aria-label={`${buttonText} pour ${product.name}`}
    >
      <MessageCircle className="h-5 w-5 shrink-0" />
      <span>{buttonText}</span>
    </a>
  );
}
