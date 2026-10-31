/**
 * Module « Expérience entrepreneuriale » — types dédiés.
 * Isolé du modèle existant (Product / BtpProject) pour éviter toute régression.
 */

export type ExperienceDomain = 'btp' | 'informatique' | 'vivrier';

/** Statut de validation éditoriale (contrôlé côté serveur). */
export type ExperienceValidation = 'brouillon' | 'en_attente' | 'valide';

/** État d'exécution de la prestation — neutre par défaut, jamais présumé. */
export type ExperienceExecution = 'non_confirme' | 'en_cours' | 'acheve';

export interface ExperiencePhoto {
  id: string;
  url: string;
  /** Texte alternatif descriptif obligatoire (accessibilité SEO). */
  alt: string;
  caption?: string;
  date?: string;
}

export type ExperienceDocumentVisibility = 'public' | 'prive';

export interface ExperienceDocument {
  id: string;
  /** Intitulé factuel, ex. « Extrait du bon de commande ». */
  name: string;
  url: string;
  /** Un document interne reste privé par défaut. */
  visibility: ExperienceDocumentVisibility;
  mimeType?: string;
  size?: number;
  reference?: string;
  description?: string;
  addedAt?: number;
}

export interface ExperienceReference {
  id: string;
  title: string;
  domain: ExperienceDomain;
  /** Description factuelle des prestations documentées. */
  description: string;
  /** Bénéficiaire / organisme, lorsque sa publication est autorisée. */
  beneficiary?: string;
  /** Procédure de passation, uniquement si elle est connue. */
  procedure?: string;
  location?: string;
  execution: ExperienceExecution;
  validation: ExperienceValidation;
  /** Publication effective. Le serveur refuse published=true sans validation='valide'. */
  published: boolean;
  photos: ExperiencePhoto[];
  documents: ExperienceDocument[];
  order?: number;
  createdAt: number;
  updatedAt: number;
  publishedAt?: number;
}

export const EXPERIENCE_DOMAINS: {
  key: ExperienceDomain;
  label: string;
  shortLabel: string;
  anchor: string;
  summary: string;
}[] = [
  {
    key: 'btp',
    label: 'BTP — Bâtiment et Travaux Publics',
    shortLabel: 'BTP',
    anchor: 'btp',
    summary:
      'Travaux de construction, de clôture et de réhabilitation de bâtiments et d’infrastructures institutionnelles.',
  },
  {
    key: 'informatique',
    label: 'Matériel informatique et fournitures',
    shortLabel: 'Matériel informatique',
    anchor: 'informatique',
    summary:
      'Fourniture et livraison de matériel informatique et de fournitures spécialisées à des organismes et institutions.',
  },
  {
    key: 'vivrier',
    label: 'Fournitures vivrières',
    shortLabel: 'Fournitures vivrières',
    anchor: 'vivrier',
    summary:
      'Fourniture de produits vivriers conformément aux commandes et prestations documentées.',
  },
];

export const EXPERIENCE_VALIDATION_LABELS: Record<ExperienceValidation, string> = {
  brouillon: 'Brouillon',
  en_attente: 'En attente de vérification',
  valide: 'Validé pour publication',
};

export const EXPERIENCE_EXECUTION_LABELS: Record<ExperienceExecution, string> = {
  non_confirme: 'Référence documentée',
  en_cours: 'Prestation en cours',
  acheve: 'Prestation achevée',
};

export function experienceStatusLabel(ref: ExperienceReference): string {
  if (ref.published) return 'Publié';
  return EXPERIENCE_VALIDATION_LABELS[ref.validation];
}

export function domainLabel(domain: ExperienceDomain): string {
  return EXPERIENCE_DOMAINS.find((d) => d.key === domain)?.label || domain;
}
