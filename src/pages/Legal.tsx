import React from 'react';
import { ShieldCheck, Scale, FileText, CheckCircle2, MessageCircle, MapPin, Phone, Mail } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useSeo } from '../utils/seo';
import { canonicalUrl } from '../utils/router';
import { normalizeWhatsApp } from '../utils/format';

interface LegalProps {
  type: 'mentions' | 'privacy';
}

export function Legal({ type }: LegalProps) {
  const { settings } = useStore();
  const isPrivacy = type === 'privacy';

  const pageTitle = isPrivacy
    ? 'Politique de Confidentialité | ALFFA NIGER'
    : 'Mentions Légales & Cadre Juridique | ALFFA NIGER';

  useSeo({
    title: pageTitle,
    description: isPrivacy
      ? 'Politique de respect de la vie privée, protection des données personnelles et engagements envers les clients ALFFA NIGER.'
      : 'Mentions légales, identification de l’entreprise, authenticité des produits et cadre commercial d’ALFFA NIGER à destination du public.',
    canonical: canonicalUrl(settings, isPrivacy ? '/confidentialite' : '/mentions-legales'),
  });

  const rawWa = settings.whatsappElectronique || settings.whatsappTextile || '22796222310';
  const waNorm = normalizeWhatsApp(rawWa);
  const companyName = settings.legalName || settings.name || 'ALFFA NIGER';
  const companyAddress = settings.address || 'Niamey, République du Niger';
  const companyPhone = settings.phone || `+${waNorm}`;
  const companyEmail = settings.email || 'contact@alffaniger.com';

  return (
    <main className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      {/* Header */}
      <div className="border-b border-[var(--line)] pb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-[var(--cyan)]/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[var(--cyan-deep)]">
          {isPrivacy ? (
            <>
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Protection & Respect de la Vie Privée</span>
            </>
          ) : (
            <>
              <Scale className="h-3.5 w-3.5" />
              <span>Information Officielle à Destination du Public</span>
            </>
          )}
        </div>
        <h1 className="mt-4 font-display text-3xl sm:text-4xl lg:text-5xl font-bold uppercase tracking-tight text-[var(--night)]">
          {isPrivacy ? 'Politique de Confidentialité' : 'Mentions Légales'}
        </h1>
        <p className="mt-3 text-base sm:text-lg text-[var(--muted)] max-w-2xl">
          {isPrivacy
            ? 'Transparence totale sur la protection de vos données personnelles et vos échanges lors de vos commandes chez ALFFA NIGER.'
            : 'Informations juridiques, identification de l’entreprise et garanties commerciales offertes à l’ensemble de notre clientèle.'}
        </p>
      </div>

      <div className="mt-10 space-y-10 text-[var(--ink)] leading-relaxed">
        {!isPrivacy ? (
          <>
            {/* 1. Identification de l'entreprise */}
            <section className="space-y-4">
              <div className="flex items-center gap-2.5">
                <FileText className="h-5 w-5 text-[var(--cyan-deep)]" />
                <h2 className="font-display text-2xl font-bold text-[var(--night)]">
                  1. Identification de l’entreprise
                </h2>
              </div>
              <p>
                Le présent service est édité et exploité par l’entreprise commerciale{' '}
                <strong>{companyName}</strong>, établie en République du Niger et active dans :
              </p>
              <ul className="list-disc pl-6 space-y-1 text-base">
                <li>
                  La distribution et vente de <strong>smartphones certifiés et appareils électroniques</strong> (Apple iPhone, Samsung et accessoires d’origine).
                </li>
                <li>
                  L’importation, la commercialisation et la confection de <strong>bazins damassés de grand prestige</strong> (véritables bazins autrichiens Getzner, Drews, Gagny Lah) et étoffes de luxe.
                </li>
              </ul>

              {/* Encadré Coordonnées officielles */}
              <div className="mt-4 rounded-2xl bg-[var(--mist)] p-5 border border-[var(--line)] grid gap-3 sm:grid-cols-2 text-sm">
                <div className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 text-[var(--cyan-deep)] shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                      Siège & Boutiques
                    </span>
                    <span className="font-semibold text-[var(--night)]">{companyAddress}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Phone className="h-4 w-4 text-[var(--cyan-deep)] shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                      Téléphone & WhatsApp
                    </span>
                    <a
                      href={`https://wa.me/${waNorm}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-[var(--cyan-deep)] hover:underline"
                    >
                      {companyPhone}
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 sm:col-span-2">
                  <Mail className="h-4 w-4 text-[var(--cyan-deep)] shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                      Courrier électronique
                    </span>
                    <span className="font-semibold text-[var(--night)]">{companyEmail}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* 2. Tarifs, Monnaie et Modalités de Commande */}
            <section className="space-y-4 pt-6 border-t border-[var(--line)]">
              <h2 className="font-display text-2xl font-bold text-[var(--night)]">
                2. Prix affichés, devises et commande
              </h2>
              <div className="space-y-3 text-base">
                <p>
                  <strong>Monnaie officielle :</strong> L’ensemble des prix publiés sur ce site sont exprimés en <strong>Francs CFA (FCFA)</strong>, toutes taxes comprises.
                </p>
                <p>
                  <strong>Transparence tarifaire :</strong> ALFFA NIGER met à jour ses catalogues en continu. Lorsqu’un article porte la mention <em>« Prix sur demande »</em>, nos conseillers communiquent immédiatement le tarif précis du jour selon les options ou les arrivages.
                </p>
                <p>
                  <strong>Modalités de passation de commande :</strong> Afin d’offrir un accompagnement sur mesure à chaque client, la finalisation des commandes s’effectue en direct par échange WhatsApp ou directement en boutique. Ce canal permet de confirmer la disponibilité immédiate du modèle ou du coloris, de convenir de l’adresse de livraison et de répondre à toutes vos interrogations avant validation.
                </p>
              </div>
            </section>

            {/* 3. Garantie d'Authenticité */}
            <section className="space-y-4 pt-6 border-t border-[var(--line)]">
              <h2 className="font-display text-2xl font-bold text-[var(--night)]">
                3. Engagement d’authenticité et qualité
              </h2>
              <p>
                ALFFA NIGER s’engage formellement envers le public sur la sincérité et l’authenticité des produits présentés :
              </p>
              <div className="grid gap-3 sm:grid-cols-2 pt-2">
                <div className="rounded-xl border border-[var(--line)] bg-white p-4">
                  <div className="flex items-center gap-2 font-bold text-[var(--night)] mb-1">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Smartphones originaux certifiés</span>
                  </div>
                  <p className="text-sm text-[var(--muted)]">
                    Appareils vérifiés, conformes aux standards constructeurs mondiaux et fournis avec l’ensemble de leurs garanties d’usage.
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--line)] bg-white p-4">
                  <div className="flex items-center gap-2 font-bold text-[var(--night)] mb-1">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Bazins d’origine autrichienne</span>
                  </div>
                  <p className="text-sm text-[var(--muted)]">
                    Étoffes Getzner, Drews et Gagny Lah authentiques, tissées avec des fils nobles pour un damas brillant et résistant.
                  </p>
                </div>
              </div>
            </section>

            {/* 4. Livraison et Réception */}
            <section className="space-y-4 pt-6 border-t border-[var(--line)]">
              <h2 className="font-display text-2xl font-bold text-[var(--night)]">
                4. Livraison et retrait en boutique
              </h2>
              <p>
                Les clients disposent de deux modes de réception de leurs commandes :
              </p>
              <ul className="list-disc pl-6 space-y-1.5 text-base">
                <li>
                  <strong>Retrait sur place :</strong> Accueil direct dans nos points de vente à Niamey aux horaires d’ouverture.
                </li>
                <li>
                  <strong>Livraison à Niamey :</strong> Acheminement express à domicile ou sur votre lieu de travail par nos coursiers.
                </li>
                <li>
                  <strong>Expéditions régionales :</strong> Envoi sécurisé vers l’ensemble des villes et régions du Niger via les transporteurs partenaires habituels.
                </li>
              </ul>
            </section>

            {/* 5. Propriété intellectuelle */}
            <section className="space-y-4 pt-6 border-t border-[var(--line)]">
              <h2 className="font-display text-2xl font-bold text-[var(--night)]">
                5. Propriété intellectuelle et marques citées
              </h2>
              <p>
                Les marques de constructeurs et fabricants tierces citées (telles que <em>Apple, Samsung, Getzner, Drews, Gagny Lah</em>) sont la propriété exclusive de leurs déposants respectifs. Leur mention sur la plateforme ALFFA NIGER a pour unique finalité d’informer loyalement le public sur la marque et la nature exacte des articles distribués.
              </p>
              <p>
                Les photographies, logos propres et textes éditoriaux de la plateforme sont protégés au titre du droit d’auteur.
              </p>
            </section>

            {/* 6. Contact & Service Clientèle */}
            <section className="space-y-4 pt-6 border-t border-[var(--line)]">
              <h2 className="font-display text-2xl font-bold text-[var(--night)]">
                6. Service clientèle et assistance
              </h2>
              <p>
                Pour toute réclamation, conseil technique ou demande particulière, notre service clientèle est joignable 7 jours sur 7 par messagerie WhatsApp au{' '}
                <a
                  href={`https://wa.me/${waNorm}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-[var(--cyan-deep)] underline"
                >
                  {companyPhone}
                </a>.
              </p>
            </section>

            {/* Précisions complémentaires si personnalisées */}
            {settings.legalInfo && (
              <section className="mt-8 rounded-2xl bg-[var(--ivory)] border border-[var(--sand)] p-6 space-y-2">
                <h3 className="font-serif text-lg font-bold text-[var(--night)]">
                  Dispositions complémentaires
                </h3>
                <div className="whitespace-pre-line text-sm text-[var(--umber)]">
                  {settings.legalInfo}
                </div>
              </section>
            )}
          </>
        ) : (
          <>
            {/* Politique de confidentialité */}
            <section className="space-y-4">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-5 w-5 text-[var(--cyan-deep)]" />
                <h2 className="font-display text-2xl font-bold text-[var(--night)]">
                  1. Respect absolu de la vie privée
                </h2>
              </div>
              <p>
                La plateforme <strong>ALFFA NIGER</strong> est conçue pour garantir la tranquillité et l’anonymat de ses visiteurs lors de la consultation du catalogue.
              </p>
              <ul className="list-disc pl-6 space-y-1.5 text-base">
                <li>
                  <strong>Aucune inscription obligatoire :</strong> Aucun compte utilisateur ni mot de passe n’est requis pour parcourir nos produits, voir les photos ou comparer les prix.
                </li>
                <li>
                  <strong>Aucune collecte de données bancaires en ligne :</strong> Notre site n’enregistre aucun numéro de carte de crédit ni code bancaire confidentiel.
                </li>
                <li>
                  <strong>Absence de revente de données :</strong> Vos coordonnées ne sont ni vendues, ni louées, ni cédées à des courtiers publicitaires tiers.
                </li>
              </ul>
            </section>

            <section className="space-y-4 pt-6 border-t border-[var(--line)]">
              <h2 className="font-display text-2xl font-bold text-[var(--night)]">
                2. Données transmises lors d’une commande
              </h2>
              <p>
                Lorsque vous contactez ALFFA NIGER via WhatsApp pour commander un article, vous partagez volontairement certaines informations (votre nom ou pseudonyme, votre numéro d’appel, votre adresse de livraison).
              </p>
              <p>
                Ces éléments sont strictement réservés à :
              </p>
              <ul className="list-disc pl-6 space-y-1 text-base">
                <li>La préparation et confirmation de votre commande ;</li>
                <li>L’organisation logistique de la livraison à votre adresse ;</li>
                <li>Le suivi de votre satisfaction et le service après-vente.</li>
              </ul>
            </section>

            <section className="space-y-4 pt-6 border-t border-[var(--line)]">
              <h2 className="font-display text-2xl font-bold text-[var(--night)]">
                3. Vos droits et suppression de coordonnées
              </h2>
              <p>
                Vous conservez à tout moment la pleine maîtrise de vos informations. Sur simple demande par message WhatsApp au{' '}
                <a
                  href={`https://wa.me/${waNorm}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-[var(--cyan-deep)] underline"
                >
                  {companyPhone}
                </a>, vous pouvez demander la mise à jour ou l’effacement total de vos coordonnées de nos carnets de contact.
              </p>
            </section>

            {settings.privacyText && (
              <section className="mt-8 rounded-2xl bg-[var(--mist)] border border-[var(--line)] p-6 space-y-2">
                <h3 className="font-display text-lg font-bold text-[var(--night)]">
                  Engagements particuliers
                </h3>
                <div className="whitespace-pre-line text-sm text-[var(--ink)]">
                  {settings.privacyText}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}

