import { Product, ShopType } from '../types';

const priceFormatter = new Intl.NumberFormat('fr-FR', {
  maximumFractionDigits: 0,
});

export function formatPrice(price: number | null | undefined): string | null {
  if (price === null || price === undefined || Number.isNaN(Number(price))) {
    return null;
  }
  return `${priceFormatter.format(Number(price)).replace(/\u202f|\u00a0/g, ' ')} FCFA`;
}

export function slugify(text: string): string {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function normalizeWhatsApp(phone: string | undefined | null): string {
  if (!phone) return '';
  let cleaned = String(phone).replace(/[^\d]/g, '');
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.slice(2);
  }
  return cleaned;
}

export function isValidWhatsApp(phone: string | undefined | null): boolean {
  const norm = normalizeWhatsApp(phone);
  // International format: 8 to 15 digits, should not start with 0
  return norm.length >= 8 && norm.length <= 15 && !norm.startsWith('0');
}

export interface OrderMessageOptions {
  shopLabel: string;
  product: Product;
  quantity?: number;
  productUrl?: string;
}

export function buildOrderMessage({
  shopLabel,
  product,
  quantity = 1,
  productUrl,
}: OrderMessageOptions): string {
  const productTitle = [product.name, product.capacity].filter(Boolean).join(' ');
  const isUnavailable = product.availability === 'indisponible';
  const actionPhrase = isUnavailable
    ? 'je souhaite savoir quand sera de nouveau disponible'
    : 'je souhaite commander';

  const priceText =
    product.price !== null && product.price !== undefined
      ? ` affiché à ${formatPrice(product.price)}`
      : '';

  const lines: string[] = [
    `Bonjour ${shopLabel}, ${actionPhrase} : ${productTitle}${priceText}.`,
  ];

  if (product.price === null || product.price === undefined) {
    lines.push("Pouvez-vous m'indiquer son prix actuel ?");
  }

  if (product.reference) {
    lines.push(`Référence : ${product.reference}`);
  }

  lines.push(`Quantité demandée : ${quantity}`);

  if (productUrl) {
    lines.push(`Lien du produit : ${productUrl}`);
  }

  const verb = /TEXTILE/i.test(shopLabel) ? 'me préciser' : "m'indiquer";
  lines.push(`Pouvez-vous me confirmer sa disponibilité et ${verb} les modalités de commande ?`);

  return lines.join('\n');
}

export function buildWhatsAppLink(phone: string, message: string): string | null {
  const norm = normalizeWhatsApp(phone);
  if (!isValidWhatsApp(norm)) return null;
  return `https://wa.me/${norm}?text=${encodeURIComponent(message)}`;
}
