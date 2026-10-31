import { ExperienceReference } from '../types/experience';

/**
 * Références initiales — STRICTEMENT limitées aux informations fournies par ALFFA NIGER.
 * Aucune date, aucun montant, aucune quantité et aucune photographie n'est inventée.
 * Les descriptions reprennent fidèlement les éléments communiqués.
 * Le statut « validé + publié » est appliqué car ces références ont été explicitement
 * transmises pour publication ; toute autre référence reste en brouillon par défaut.
 */
const SEED_TIMESTAMP = Date.UTC(2026, 0, 15);

function ref(
  id: string,
  order: number,
  data: {
    title: string;
    domain: ExperienceReference['domain'];
    description: string;
    beneficiary?: string;
    procedure?: string;
    location?: string;
  }
): ExperienceReference {
  return {
    id,
    title: data.title,
    domain: data.domain,
    description: data.description,
    beneficiary: data.beneficiary,
    procedure: data.procedure,
    location: data.location,
    execution: 'non_confirme',
    validation: 'valide',
    published: true,
    photos: [],
    documents: [],
    order,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
    publishedAt: SEED_TIMESTAMP,
  };
}

export const EXPERIENCE_SEED: ExperienceReference[] = [
  // ---------------- BTP ----------------
  ref('exp-btp-agadez', 1, {
    title: 'Construction du mur de clôture et réhabilitation de la maison d’arrêt d’Agadez',
    domain: 'btp',
    description: 'Construction d’un mur de clôture.\nRéhabilitation de la maison d’arrêt.',
    beneficiary: 'Maison d’arrêt d’Agadez',
    procedure: 'Appel d’offres',
    location: 'Agadez',
  }),
  ref('exp-btp-tchirozerine-tribunal', 2, {
    title:
      'Construction du mur de clôture et réhabilitation du Tribunal d’instance de Tchirozérine',
    domain: 'btp',
    description: 'Travaux de clôture.\nRéhabilitation de l’établissement.',
    beneficiary: 'Tribunal d’instance de Tchirozérine',
    procedure: 'DC',
    location: 'Tchirozérine',
  }),
  ref('exp-btp-madarounfa', 3, {
    title: 'Construction du mur de clôture et réhabilitation de la maison d’arrêt de Madarounfa',
    domain: 'btp',
    description: 'Travaux de clôture.\nRéhabilitation de la maison d’arrêt.',
    beneficiary: 'Maison d’arrêt de Madarounfa',
    procedure: 'DC',
    location: 'Madarounfa',
  }),
  ref('exp-btp-aguie', 4, {
    title: 'Réhabilitation de la maison d’arrêt d’Aguié',
    domain: 'btp',
    description: 'Réhabilitation de l’établissement.',
    beneficiary: 'Maison d’arrêt d’Aguié',
    location: 'Aguié',
  }),
  ref('exp-btp-zinder-tgi', 5, {
    title:
      'Construction d’un bloc d’audience et réhabilitation de l’ensemble du Tribunal de grande instance de Zinder',
    domain: 'btp',
    description:
      'Construction d’un bloc d’audience.\nRéhabilitation de l’ensemble du Tribunal de grande instance.',
    beneficiary: 'Tribunal de grande instance de Zinder',
    procedure: 'Appel d’offres et DRP',
    location: 'Zinder',
  }),
  ref('exp-btp-faj', 6, {
    title: 'Construction de guérites et réhabilitation des installations de la Faj',
    domain: 'btp',
    description: 'Construction de guérites.\nRéhabilitation de l’ensemble de la direction.',
    beneficiary: 'Direction de la Faj',
  }),

  // ---------------- MATÉRIEL INFORMATIQUE ----------------
  ref('exp-info-giz', 10, {
    title: 'Livraisons de matériel informatique à la GIZ',
    domain: 'informatique',
    description: 'Plusieurs livraisons de matériel informatique.',
    beneficiary: 'GIZ',
    procedure: 'Appels d’offres',
  }),
  ref('exp-info-fao', 11, {
    title: 'Livraisons de matériel informatique à la FAO',
    domain: 'informatique',
    description: 'Plusieurs livraisons de matériel informatique.',
    beneficiary: 'FAO',
    procedure: 'Appels d’offres',
  }),
  ref('exp-info-croix-rouge', 12, {
    title: 'Livraisons de matériel informatique à la Croix-Rouge Niger',
    domain: 'informatique',
    description: 'Plusieurs livraisons de matériel informatique.',
    beneficiary: 'Croix-Rouge Niger',
  }),
  ref('exp-info-mca', 13, {
    title: 'Fourniture et livraison de matériel informatique au MCA',
    domain: 'informatique',
    description: 'Livraison de matériel informatique.',
    beneficiary: 'MCA',
    procedure: 'Appel d’offres',
  }),
  ref('exp-info-justice', 14, {
    title: 'Livraisons de matériel informatique au ministère de la Justice du Niger',
    domain: 'informatique',
    description: 'Plusieurs livraisons de matériel informatique.',
    beneficiary: 'Ministère de la Justice du Niger',
    procedure: 'Appels d’offres ouverts',
  }),
  ref('exp-info-faj', 15, {
    title: 'Livraison de matériel informatique à la Faj',
    domain: 'informatique',
    description: 'Livraison de matériel informatique.',
    beneficiary: 'Faj',
    procedure: 'Appels d’offres',
  }),
  ref('exp-info-jeunesse-sports', 16, {
    title: 'Fourniture de matériel et de fournitures destinés aux examens',
    domain: 'informatique',
    description: 'Livraison de fournitures pour les examens.',
    beneficiary: 'Ministère de la Jeunesse et des Sports du Niger',
  }),

  // ---------------- FOURNITURES VIVRIÈRES ----------------
  ref('exp-vivrier-tchirozerine-inspection', 20, {
    title:
      'Livraisons de fournitures vivrières à l’Inspection de l’enseignement primaire et préscolaire de Tchirozérine',
    domain: 'vivrier',
    description: 'Plusieurs livraisons de fournitures vivrières.',
    beneficiary: 'Inspection de l’enseignement primaire et préscolaire de Tchirozérine',
    procedure: 'Appel d’offres ouvert',
    location: 'Tchirozérine',
  }),
];
