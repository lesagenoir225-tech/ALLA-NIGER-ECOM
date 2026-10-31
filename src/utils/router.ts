import { useState, useEffect } from 'react';
import { ShopType, SiteSettings } from '../types';

// Prevent browser from remembering scroll offset on hash change
if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  try {
    window.history.scrollRestoration = 'manual';
  } catch {}
}

/**
 * Forcer le défilement au tout début de la page (top: 0)
 * de manière fiable et immédiate sur tous les navigateurs (iOS, Android, Desktop)
 */
export function scrollToTop(instant: boolean = true): void {
  if (typeof window === 'undefined') return;

  const html = document.documentElement;
  const body = document.body;

  // Réinitialisation immédiate du scroll sur window, html et body
  window.scrollTo(0, 0);
  if (html) html.scrollTop = 0;
  if (body) body.scrollTop = 0;

  // Deuxième passe sur la frame d'animation suivante (post-render React)
  requestAnimationFrame(() => {
    window.scrollTo(0, 0);
    if (html) html.scrollTop = 0;
    if (body) body.scrollTop = 0;
  });

  // Troisième passe avec léger délai pour garantir le sommet sur mobile
  setTimeout(() => {
    window.scrollTo(0, 0);
    if (html) html.scrollTop = 0;
    if (body) body.scrollTop = 0;
  }, 40);
}

export function getCleanHash(): string {
  const hash = window.location.hash.replace(/^#/, '') || '/';
  return hash.split('?')[0];
}

export function useRoute(): string {
  const [route, setRoute] = useState<string>(getCleanHash);

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(getCleanHash());
      scrollToTop(true);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return route;
}

export function href(path: string): string {
  return `#${path.startsWith('/') ? path : `/${path}`}`;
}

export function navigate(path: string): void {
  const target = path.startsWith('/') ? path : `/${path}`;
  if (window.location.hash === `#${target}`) {
    scrollToTop(true);
  } else {
    window.location.hash = target;
  }
}

export function canonicalUrl(settings: SiteSettings, path: string): string {
  const base = (settings.siteUrl || 'https://alffaniger.com').replace(/\/$/, '');
  return `${base}/#${path.startsWith('/') ? path : `/${path}`}`;
}

export function productUrl(settings: SiteSettings, shop: ShopType, id: string): string {
  return canonicalUrl(settings, `/${shop}/p/${id}`);
}
