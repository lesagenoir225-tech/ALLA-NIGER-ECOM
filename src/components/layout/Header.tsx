import React, { useState, useEffect } from 'react';
import { Menu, X, ArrowLeftRight, Settings2, Smartphone, Sparkles, ChevronRight, Phone, ExternalLink, Briefcase } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { href, scrollToTop } from '../../utils/router';
import { useStore } from '../../context/StoreContext';

interface HeaderProps {
  currentShop?: 'electronique' | 'textile' | 'home';
  currentPath: string;
}

export function Header({ currentShop = 'home', currentPath }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAdmin } = useStore();

  const isTextile = currentShop === 'textile';
  const isElec = currentShop === 'electronique';

  // Close mobile menu whenever path changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [currentPath]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  type NavLink = { to: string; label: string; icon?: React.ComponentType<{ className?: string }> };

  const universeLinks: NavLink[] = isTextile
    ? [
        { to: '/textile/catalogue', label: 'Nos Bazins' },
        { to: '/textile/marques', label: 'Grandes Marques' },
      ]
    : isElec
    ? [
        { to: '/electronique/marque/apple', label: 'iPhone / Apple' },
        { to: '/electronique/marque/samsung', label: 'Samsung' },
        { to: '/electronique/catalogue', label: 'Tous les modèles' },
      ]
    : [
        { to: '/electronique', label: 'Boutique Électronique', icon: Smartphone },
        { to: '/textile', label: 'Boutique Textile', icon: Sparkles },
      ];

  // Entrée commune à tous les univers : la rubrique institutionnelle.
  const navLinks: NavLink[] = [
    ...universeLinks,
    { to: '/experience-entrepreneuriale', label: 'Expérience entrepreneuriale' },
    { to: '/contact', label: 'Contact' },
  ];

  const switchShop = isTextile
    ? { to: '/electronique', label: 'Boutique Électronique', tone: 'elec' }
    : isElec
    ? { to: '/textile', label: 'Boutique Textile', tone: 'textile' }
    : null;

  const headerBg = isTextile
    ? 'bg-[#faf6ee] border-[var(--sand)] shadow-[0_1px_4px_rgba(8,15,73,0.04)]'
    : 'bg-white border-[var(--line)] shadow-[0_1px_4px_rgba(8,15,73,0.04)]';

  return (
    <>
      <header className={`sticky top-0 z-50 isolate border-b transition-colors ${headerBg}`}>
        <div className="mx-auto flex h-[70px] sm:h-[74px] max-w-7xl items-center gap-4 px-4 sm:px-6">
          {/* Brand Logo */}
          <a
            href={href('/')}
            onClick={() => scrollToTop(true)}
            aria-label="Accueil ALFFA NIGER"
            className="shrink-0 transition hover:opacity-90"
          >
            <Logo className="h-10 sm:h-11" showSlogan={currentShop === 'home'} />
          </a>

          {/* Shop Badge indicator */}
          {currentShop !== 'home' && (
            <a
              href={href(isTextile ? '/textile' : '/electronique')}
              onClick={() => scrollToTop(true)}
              className={`hidden sm:inline-flex items-center gap-1.5 border-l pl-4 ${
                isTextile
                  ? 'border-[var(--sand)] font-serif text-xl italic text-[var(--umber)]'
                  : 'border-[var(--line)] font-display text-xl font-semibold uppercase tracking-[0.12em] text-[var(--cyan-deep)]'
              }`}
            >
              {isTextile ? 'Textile' : 'Électronique'}
            </a>
          )}

          {/* Desktop Navigation */}
          <nav className="ml-auto hidden items-center gap-1.5 lg:flex" aria-label="Navigation principale">
            {navLinks.map((item) => {
              const isActive = currentPath === item.to;
              return (
                <a
                  key={item.to}
                  href={href(item.to)}
                  onClick={() => scrollToTop(true)}
                  className={`rounded-xl px-3.5 py-2 font-medium transition ${
                    isActive
                      ? 'text-[var(--cyan-deep)] bg-black/5 font-bold'
                      : 'text-[var(--ink)] hover:bg-black/5'
                  } ${isTextile ? 'font-serif text-lg' : 'text-[15px]'}`}
                >
                  {item.label}
                </a>
              );
            })}

            {/* Quick Shop Switcher */}
            {switchShop && (
              <a
                href={href(switchShop.to)}
                onClick={() => scrollToTop(true)}
                className={`ml-2 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  isTextile
                    ? 'border-[#080F49]/20 text-[var(--night)] hover:border-[var(--cyan)] hover:bg-white'
                    : 'border-[#6B5636]/30 text-[var(--umber)] font-serif italic hover:border-[var(--umber)] hover:bg-[var(--ivory)]'
                }`}
              >
                <ArrowLeftRight className="h-4 w-4 shrink-0 text-[var(--cyan)]" />
                <span>{switchShop.label}</span>
              </a>
            )}
          </nav>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={mobileMenuOpen}
            className="ml-auto grid h-11 w-11 place-items-center rounded-xl bg-slate-100 hover:bg-slate-200 lg:hidden text-[var(--night)] transition"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Overlay & Sliding Panel */}
      {mobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 top-[74px] z-50 lg:hidden flex flex-col bg-black/50 backdrop-blur-sm animate-in fade-in-0 duration-200"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className={`w-full max-h-[82vh] overflow-y-auto border-b shadow-2xl p-6 space-y-4 animate-in slide-in-from-top-2 duration-200 ${
              isTextile ? 'bg-[var(--ivory)] text-[var(--night)]' : 'bg-white text-[var(--night)]'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Current Universe quick banner */}
            <div className="flex items-center justify-between pb-3 border-b border-black/10">
              <span className="text-xs font-bold uppercase tracking-widest text-[var(--cyan-deep)]">
                {isTextile ? 'Boutique Textile' : isElec ? 'Boutique Électronique' : 'Menu ALFFA NIGER'}
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 p-1"
              >
                Fermer ✕
              </button>
            </div>

            {/* Main Links */}
            <div className="space-y-1">
              {navLinks.map((item) => (
                <a
                  key={item.to}
                  href={href(item.to)}
                  onClick={() => {
                    setMobileMenuOpen(false);
                    scrollToTop(true);
                  }}
                  className="flex items-center justify-between rounded-xl px-3 py-3 text-lg font-bold text-[var(--night)] hover:bg-black/5 transition"
                >
                  <span>{item.label}</span>
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                </a>
              ))}
            </div>

            {/* Quick Switch Shop Banner */}
            {switchShop && (
              <div className="pt-2">
                <a
                  href={href(switchShop.to)}
                  onClick={() => {
                    setMobileMenuOpen(false);
                    scrollToTop(true);
                  }}
                  className="flex items-center justify-between rounded-2xl bg-white p-4 text-base font-bold text-[var(--night)] border border-black/10 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[var(--cyan)]/20 text-[var(--cyan-deep)] flex items-center justify-center">
                      <ArrowLeftRight className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-[var(--muted)] font-medium">Changer d'univers</p>
                      <p className="text-sm font-bold text-[var(--night)]">{switchShop.label}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                </a>
              </div>
            )}

            {/* Secondary actions */}
            <div className="pt-3 border-t border-black/10 flex flex-col gap-2 text-sm">
              <a
                href={href('/experience-entrepreneuriale')}
                onClick={() => {
                  setMobileMenuOpen(false);
                  scrollToTop(true);
                }}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 font-semibold text-[var(--night)] hover:bg-black/5"
              >
                <Briefcase className="h-4 w-4 text-[var(--cyan-deep)]" />
                <span>Expérience entrepreneuriale</span>
              </a>
              <a
                href={href('/contact')}
                onClick={() => {
                  setMobileMenuOpen(false);
                  scrollToTop(true);
                }}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 font-semibold text-[var(--night)] hover:bg-black/5"
              >
                <Phone className="h-4 w-4 text-[var(--cyan-deep)]" />
                <span>Nous contacter & Coordonnées</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
