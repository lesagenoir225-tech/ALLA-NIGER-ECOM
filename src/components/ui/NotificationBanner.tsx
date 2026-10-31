import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export function NotificationBanner() {
  const { notification, clearNotification } = useStore();

  if (!notification) return null;

  const bgClasses = {
    success: 'bg-emerald-900/90 text-white border-emerald-500/50 shadow-emerald-950/20',
    error: 'bg-rose-900/90 text-white border-rose-500/50 shadow-rose-950/20',
    info: 'bg-[var(--night)] text-white border-[var(--cyan)]/40 shadow-black/20',
  }[notification.type];

  const Icon = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info,
  }[notification.type];

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 sm:bottom-5 right-4 sm:right-5 z-50 max-w-md w-[calc(100vw-2rem)] sm:w-[calc(100vw-2.5rem)] animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      <div
        className={`flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md shadow-xl ${bgClasses}`}
      >
        <Icon className="h-5 w-5 shrink-0 mt-0.5" />
        <div className="flex-1 text-sm font-medium leading-snug">
          {notification.message}
        </div>
        <button
          type="button"
          onClick={clearNotification}
          className="p-1 -mr-1 -mt-1 text-white/70 hover:text-white rounded-lg transition"
          aria-label="Fermer la notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
