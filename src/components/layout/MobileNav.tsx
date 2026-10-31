import React from 'react';
import { Home, Smartphone, Sparkles, MessageCircle, PhoneCall } from 'lucide-react';
import { href, scrollToTop } from '../../utils/router';
import { useStore } from '../../context/StoreContext';
import { normalizeWhatsApp } from '../../utils/format';

interface MobileNavProps {
  currentPath: string;
}

export function MobileNav({ currentPath }: MobileNavProps) {
  const { settings } = useStore();

  const isHome = currentPath === '/' || currentPath === '';
  const isElec = currentPath.startsWith('/electronique');
  const isTextile = currentPath.startsWith('/textile');
  const isContact = currentPath.startsWith('/contact');

  const rawWa = settings.whatsappElectronique || settings.whatsappTextile || '22796222310';
  const waNorm = normalizeWhatsApp(rawWa);
  const defaultWaMessage = encodeURIComponent(
    'Bonjour ALFFA Niger, je souhaite obtenir des informations sur vos produits.'
  );
  const waUrl = `https://wa.me/${waNorm}?text=${defaultWaMessage}`;

  return (
    <nav
      aria-label="Navigation mobile rapide"
      className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-white border-t border-[var(--line)] shadow-[0_-2px_15px_rgba(8,15,73,0.09)] select-none"
    >
      <div className="grid grid-cols-5 h-16 items-center max-w-md mx-auto px-1 pb-[env(safe-area-inset-bottom,0px)]">
        {/* 1. Accueil */}
        <a
          href={href('/')}
          onClick={() => scrollToTop(true)}
          className={`flex flex-col items-center justify-center h-full text-center transition-colors ${
            isHome ? 'text-[var(--night)] font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className={`p-1 rounded-xl transition ${isHome ? 'bg-[var(--mist)]' : ''}`}>
            <Home className={`h-5 w-5 ${isHome ? 'text-[var(--cyan-deep)] stroke-[2.5]' : ''}`} />
          </div>
          <span className="text-[10px] leading-tight mt-0.5 tracking-tight">Accueil</span>
        </a>

        {/* 2. Électronique */}
        <a
          href={href('/electronique')}
          onClick={() => scrollToTop(true)}
          className={`flex flex-col items-center justify-center h-full text-center transition-colors ${
            isElec ? 'text-[var(--night)] font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className={`p-1 rounded-xl transition ${isElec ? 'bg-cyan-50' : ''}`}>
            <Smartphone className={`h-5 w-5 ${isElec ? 'text-[var(--cyan-deep)] stroke-[2.5]' : ''}`} />
          </div>
          <span className="text-[10px] leading-tight mt-0.5 tracking-tight">Électro</span>
        </a>

        {/* 3. Textile */}
        <a
          href={href('/textile')}
          onClick={() => scrollToTop(true)}
          className={`flex flex-col items-center justify-center h-full text-center transition-colors ${
            isTextile ? 'text-[var(--night)] font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className={`p-1 rounded-xl transition ${isTextile ? 'bg-amber-50' : ''}`}>
            <Sparkles className={`h-5 w-5 ${isTextile ? 'text-amber-700 stroke-[2.5]' : ''}`} />
          </div>
          <span className="text-[10px] leading-tight mt-0.5 tracking-tight">Textile</span>
        </a>

        {/* 4. WhatsApp Direct */}
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Contacter ALFFA Niger sur WhatsApp"
          className="flex flex-col items-center justify-center h-full text-center group text-emerald-700"
        >
          <div className="p-1 rounded-xl bg-emerald-50 group-hover:bg-emerald-100 transition">
            <MessageCircle className="h-5 w-5 text-emerald-600 stroke-[2.5]" />
          </div>
          <span className="text-[10px] leading-tight mt-0.5 font-bold tracking-tight">WhatsApp</span>
        </a>

        {/* 5. Contact */}
        <a
          href={href('/contact')}
          onClick={() => scrollToTop(true)}
          className={`flex flex-col items-center justify-center h-full text-center transition-colors ${
            isContact ? 'text-[var(--night)] font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className={`p-1 rounded-xl transition ${isContact ? 'bg-[var(--mist)]' : ''}`}>
            <PhoneCall className={`h-5 w-5 ${isContact ? 'text-[var(--cyan-deep)] stroke-[2.5]' : ''}`} />
          </div>
          <span className="text-[10px] leading-tight mt-0.5 tracking-tight">Contact</span>
        </a>
      </div>
    </nav>
  );
}
