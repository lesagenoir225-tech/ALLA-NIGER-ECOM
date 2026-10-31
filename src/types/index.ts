export type ShopType = 'electronique' | 'textile';

export type AvailabilityStatus =
  | 'non_precise'
  | 'disponible'
  | 'sur_commande'
  | 'indisponible';

export interface Product {
  id: string;
  shop: ShopType;
  name: string;
  brand: string;
  category: string;
  price: number | null;
  availability: AvailabilityStatus;
  capacity?: string;
  colors?: string;
  condition?: string;
  reference?: string;
  description?: string;
  specs?: string;
  model?: string;
  image?: string;
  sourceImage?: string;
  isNew?: boolean;
  createdAt: number;
  hidden?: boolean;
}

export interface TextileBrand {
  id: string;
  name: string;
  logo?: string;
  sourceLogo?: string;
  order: number;
}

export interface SiteSettings {
  name: string;
  slogan: string;
  whatsappElectronique: string;
  whatsappTextile: string;
  phone: string;
  address: string;
  email: string;
  hours: string;
  facebook: string;
  instagram: string;
  tiktok: string;
  mapsElectronique: string;
  mapsTextile: string;
  siteUrl: string;
  legalName: string;
  legalInfo: string;
  /** Numéro d'identification fiscale (NIF), imprimé sur les reçus. */
  nif?: string;
  /** Registre du commerce (RCCM), imprimé sur les reçus. */
  rccm?: string;
  privacyText: string;
  heroTitle: string;
  heroSubtitle: string;
  elecIntro: string;
  textileIntro: string;
}

export type BtpProjectStage =
  | 'commande_documentee' // Commande documentée (bon de commande)
  | 'prestation_confirmee' // Prestation confirmée / en cours d'exécution
  | 'realisation_achevee'; // Réalisation achevée et réceptionnée

export type BtpPublicationStatus =
  | 'brouillon' // Brouillon (visible uniquement par l'administrateur)
  | 'en_attente' // En attente de validation
  | 'publie'; // Publié sur la page publique

export interface BtpPhoto {
  id: string;
  url: string;
  caption?: string; // Légende factuelle
  date?: string; // Date de prise de vue
}

export interface BtpDocument {
  id: string;
  name: string; // Intitulé (ex: "Extrait Bon de Commande N°...")
  url: string;
  isPublic: boolean; // TRUE: document expurgé autorisé au public | FALSE: document interne confidentiel
  reference?: string; // N° de référence du bon de commande ou marché
  description?: string;
}

export interface BtpProject {
  id: string;
  title: string; // Intitulé exact du projet ou de la commande
  description: string; // Description exacte des prestations
  client?: string; // Organisme ou client bénéficiaire (si autorisé)
  location?: string; // Localisation (ex: Niamey, Maradi...)
  executionPeriod?: string; // Date ou période d'exécution
  orderReference?: string; // Référence du bon de commande
  stage: BtpProjectStage; // commande_documentee | prestation_confirmee | realisation_achevee
  publicationStatus: BtpPublicationStatus; // brouillon | en_attente | publie
  category?: string; // Bâtiment, Génie civil, Voirie, Aménagement...
  photos: BtpPhoto[]; // Photographies authentiques uniquement
  documents: BtpDocument[]; // Pièces justificatives
  createdAt: number;
  updatedAt?: number;
}

export interface DatabaseSchema {
  version: number;
  seededAt: string;
  settings: SiteSettings;
  products: Product[];
  featured: {
    electronique: string[];
    textile: string[];
  };
  brands: TextileBrand[];
  btpProjects?: BtpProject[];
  adminPasswordHash?: string;
}
