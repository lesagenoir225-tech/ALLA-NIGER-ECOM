import React, { useState } from 'react';
import { MessageCircle, Phone, Mail, MapPin, Clock, Send } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useSeo } from '../utils/seo';
import { canonicalUrl } from '../utils/router';
import { isValidWhatsApp, normalizeWhatsApp } from '../utils/format';
import { SocialLinks } from '../components/ui/SocialLinks';
import { LocationCard } from '../components/ui/LocationCard';

export function Contact() {
  const { settings } = useStore();
  const [selectedShop, setSelectedShop] = useState<'electronique' | 'textile'>('electronique');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');

  useSeo({
    title: 'Contact | ALFFA NIGER — Électronique & Textile',
    description:
      'Contactez l’équipe ALFFA NIGER pour toute demande concernant nos smartphones ou nos bazins. WhatsApp : +227 96 22 23 10. Boutiques et réseaux sociaux officiels.',
    canonical: canonicalUrl(settings, '/contact'),
  });

  const targetWaNumber =
    selectedShop === 'electronique'
      ? settings.whatsappElectronique || '22796222310'
      : settings.whatsappTextile || '22796222310';

  const isWaAvailable = isValidWhatsApp(targetWaNumber);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !isWaAvailable) return;

    const fullMessage = `Bonjour ALFFA NIGER ${
      selectedShop === 'electronique' ? 'Électronique' : 'Textile'
    },\n\nJe m'appelle ${name.trim() || 'un client'}.\n\n${message.trim()}`;

    const link = `https://wa.me/${normalizeWhatsApp(targetWaNumber)}?text=${encodeURIComponent(fullMessage)}`;
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-14 sm:px-6 space-y-16">
      <div className="text-center max-w-2xl mx-auto">
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--cyan-deep)]">
          Nous joindre
        </span>
        <h1 className="mt-1 font-display text-4xl sm:text-5xl font-bold uppercase text-[var(--night)]">
          Contact & Service Client
        </h1>
        <p className="mt-3 text-base sm:text-lg text-[var(--muted)]">
          Notre équipe est à votre écoute pour toute question, commande personnalisée ou demande de tarif.
        </p>
      </div>

      {/* Grid: Coordinates & WhatsApp Message Composer */}
      <div className="grid gap-10 md:grid-cols-2 items-start">
        {/* Left: Contact Info */}
        <div className="space-y-6 rounded-3xl bg-[var(--mist)] p-6 sm:p-8 border border-[var(--line)]">
          <h2 className="font-display text-2xl font-bold uppercase text-[var(--night)]">
            Coordonnées Directes
          </h2>

          <div className="space-y-4 text-sm sm:text-base">
            {/* WhatsApp Pro Commun / Électronique */}
            <div className="flex items-start gap-3.5 p-3 rounded-xl bg-white border border-black/5 shadow-sm">
              <MessageCircle className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                  WhatsApp Officiel ALFFA Niger
                </p>
                <a
                  href={`https://wa.me/${normalizeWhatsApp(targetWaNumber)}?text=${encodeURIComponent(
                    'Bonjour ALFFA Niger, je souhaite obtenir des informations sur vos produits.'
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-[var(--night)] hover:text-[var(--cyan-deep)] transition"
                >
                  +{normalizeWhatsApp(targetWaNumber)}
                </a>
              </div>
            </div>

            {/* Téléphone */}
            {settings.phone && (
              <div className="flex items-start gap-3.5 p-3 rounded-xl bg-white border border-black/5 shadow-sm">
                <Phone className="h-6 w-6 text-[var(--night)] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                    Téléphone
                  </p>
                  <a
                    href={`tel:${settings.phone.replace(/[^\d+]/g, '')}`}
                    className="font-bold text-[var(--night)] hover:underline"
                  >
                    {settings.phone}
                  </a>
                </div>
              </div>
            )}

            {/* Email */}
            {settings.email && (
              <div className="flex items-start gap-3.5 p-3 rounded-xl bg-white border border-black/5 shadow-sm">
                <Mail className="h-6 w-6 text-[var(--night)] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                    Email
                  </p>
                  <a
                    href={`mailto:${settings.email}`}
                    className="font-bold text-[var(--night)] hover:underline"
                  >
                    {settings.email}
                  </a>
                </div>
              </div>
            )}

            {/* Adresse */}
            {settings.address && (
              <div className="flex items-start gap-3.5 p-3 rounded-xl bg-white border border-black/5 shadow-sm">
                <MapPin className="h-6 w-6 text-[var(--night)] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                    Adresse physique
                  </p>
                  <p className="font-semibold text-[var(--night)]">{settings.address}</p>
                </div>
              </div>
            )}

            {/* Horaires */}
            {settings.hours && (
              <div className="flex items-start gap-3.5 p-3 rounded-xl bg-white border border-black/5 shadow-sm">
                <Clock className="h-6 w-6 text-[var(--night)] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                    Horaires d'ouverture
                  </p>
                  <p className="font-semibold text-[var(--night)]">{settings.hours}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Direct message composer for WhatsApp */}
        <div className="rounded-3xl border border-[var(--line)] bg-white p-6 sm:p-8 shadow-md">
          <h2 className="font-display text-2xl font-bold uppercase text-[var(--night)]">
            Écrire à un conseiller
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Rédigez votre message ici : il s’ouvrira automatiquement dans WhatsApp (+227 96 22 23 10).
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-[var(--night)] mb-1.5">
                Choisir la boutique concernée
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedShop('electronique')}
                  className={`min-h-11 rounded-xl font-semibold text-sm transition ${
                    selectedShop === 'electronique'
                      ? 'bg-[var(--night)] text-white shadow-sm'
                      : 'border border-[var(--line)] bg-[var(--mist)] text-[var(--night)]'
                  }`}
                >
                  Électronique
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedShop('textile')}
                  className={`min-h-11 rounded-xl font-semibold text-sm transition ${
                    selectedShop === 'textile'
                      ? 'bg-[var(--night)] text-white shadow-sm'
                      : 'border border-[var(--line)] bg-[var(--mist)] text-[var(--night)]'
                  }`}
                >
                  Textile
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--night)] mb-1">
                Votre nom ou prénom
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex. Moussa, Fatouma..."
                className="w-full min-h-12 rounded-xl border border-[var(--line)] px-3.5 text-base outline-none focus:border-[var(--cyan)]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--night)] mb-1">
                Votre message ou question *
              </label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Bonjour ALFFA Niger, je souhaite obtenir des informations sur..."
                className="w-full rounded-xl border border-[var(--line)] p-3 text-base outline-none focus:border-[var(--cyan)]"
              />
            </div>

            <button
              type="submit"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--cyan)] font-bold text-[var(--night)] shadow-md hover:bg-[#22c7dc] transition"
            >
              <Send className="h-4 w-4" />
              <span>Envoyer sur WhatsApp</span>
            </button>
          </form>
        </div>
      </div>

      {/* Social Networks Section */}
      <div>
        <SocialLinks variant="card" headingText="Suivez ALFFA Niger sur nos réseaux officiels" />
      </div>

      {/* Boutiques & Localisation Google Maps */}
      <div className="space-y-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--cyan-deep)]">
            Accès & Itinéraire
          </span>
          <h2 className="font-display text-3xl font-bold uppercase text-[var(--night)] mt-0.5">
            Localisation de nos boutiques
          </h2>
          <p className="text-sm text-[var(--muted)] mt-1">
            Rejoignez-nous directement en boutique à Niamey.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <LocationCard shop="electronique" />
          <LocationCard shop="textile" />
        </div>
      </div>
    </main>
  );
}
