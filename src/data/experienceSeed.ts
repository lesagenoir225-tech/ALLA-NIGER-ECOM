import { ExperienceReference } from '../types/experience';

/**
 * Références initiales — STRICTEMENT limitées aux informations fournies par ALFFA NIGER.
 * Aucune date, aucun montant, aucune quantité et aucune photographie n'est inventée.
 * Les descriptions reprennent fidèlement les éléments communiqués.
 * Le statut « validé + publié » est appliqué car ces références ont été explicitement
 * transmises pour publication ; toute autre référence reste en brouillon par défaut.
 */

/**
 * Version éditoriale du jeu de références.
 * Toute augmentation déclenche une migration NON destructive au démarrage :
 * seules les fiches jamais modifiées par l'administrateur peuvent être mises à jour
 * (voir `migrateExperienceStore` dans `server.ts`).
 */
export const EXPERIENCE_SEED_VERSION = 2;

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
  // ---------------- BTP — Bâtiment et Travaux Publics ----------------
  ref('exp-btp-agadez', 1, {
    title:
      'Construction du mur de clôture et réhabilitation de la Maison d’arrêt d’Agadez',
    domain: 'btp',
    description:
      'Construction du mur de clôture de la Maison d’arrêt d’Agadez et réhabilitation de l’établissement, à la suite d’un appel d’offres.',
    beneficiary: 'Maison d’arrêt d’Agadez',
    procedure: 'Appel d’offres',
    location: 'Agadez',
  }),
  ref('exp-btp-tchirozerine-tribunal', 2, {
    title:
      'Construction du mur de clôture et réhabilitation du Tribunal d’instance de Tchirozérine',
    domain: 'btp',
    description:
      'Construction du mur de clôture du Tribunal d’instance de Tchirozérine et réhabilitation de l’établissement, à la suite d’une demande de cotation (DC).',
    beneficiary: 'Tribunal d’instance de Tchirozérine',
    procedure: 'Demande de cotation (DC)',
    location: 'Tchirozérine',
  }),
  ref('exp-btp-madarounfa', 3, {
    title:
      'Construction du mur de clôture et réhabilitation de la Maison d’arrêt de Madarounfa',
    domain: 'btp',
    description:
      'Construction de la clôture de la Maison d’arrêt de Madarounfa et réhabilitation de l’établissement, à la suite d’une demande de cotation (DC).',
    beneficiary: 'Maison d’arrêt de Madarounfa',
    procedure: 'Demande de cotation (DC)',
    location: 'Madarounfa',
  }),
  ref('exp-btp-aguie', 4, {
    title: 'Réhabilitation de la Maison d’arrêt d’Aguié',
    domain: 'btp',
    description: 'Réhabilitation de la Maison d’arrêt d’Aguié.',
    beneficiary: 'Maison d’arrêt d’Aguié',
    location: 'Aguié',
  }),
  ref('exp-btp-zinder-tgi', 5, {
    title:
      'Construction du bloc d’audience et réhabilitation de l’ensemble du Tribunal de grande instance (TGI) de Zinder',
    domain: 'btp',
    description:
      'Construction du bloc d’audience du Tribunal de grande instance (TGI) de Zinder et réhabilitation de l’ensemble du TGI, à la suite d’un appel d’offres et d’une demande de renseignement et de prix (DRP).',
    beneficiary: 'Tribunal de grande instance (TGI) de Zinder',
    procedure: 'Appel d’offres et demande de renseignement et de prix (DRP)',
    location: 'Zinder',
  }),
  ref('exp-btp-faj', 6, {
    title: 'Construction de guérites et réhabilitation des installations de la FAJ',
    domain: 'btp',
    description:
      'Construction de guérites à la FAJ et réhabilitation de l’ensemble de la Direction.',
    beneficiary: 'FAJ',
  }),

  // ---------------- Matériel informatique ----------------
  ref('exp-info-giz', 10, {
    title: 'Livraisons répétées de matériels informatiques à la GIZ',
    domain: 'informatique',
    description:
      'Livraisons répétées de matériels informatiques auprès de la GIZ, à la suite de plusieurs appels d’offres.',
    beneficiary: 'GIZ',
    procedure: 'Plusieurs appels d’offres',
  }),
  ref('exp-info-fao', 11, {
    title: 'Livraisons répétées de matériels informatiques à la FAO',
    domain: 'informatique',
    description:
      'Livraisons répétées de matériels informatiques auprès de la FAO, à la suite de plusieurs appels d’offres.',
    beneficiary: 'FAO',
    procedure: 'Plusieurs appels d’offres',
  }),
  ref('exp-info-croix-rouge', 12, {
    title: 'Livraisons de matériels informatiques à la Croix-Rouge Niger',
    domain: 'informatique',
    description:
      'Livraisons de matériels informatiques auprès de la Croix-Rouge Niger à plusieurs reprises.',
    beneficiary: 'Croix-Rouge Niger',
  }),
  ref('exp-info-mca', 13, {
    title: 'Fourniture de matériels informatiques au Millennium Challenge Account (MCA)',
    domain: 'informatique',
    description:
      'Fourniture de matériels informatiques au Millennium Challenge Account (MCA), à la suite d’un appel d’offres.',
    beneficiary: 'Millennium Challenge Account (MCA)',
    procedure: 'Appel d’offres',
  }),
  ref('exp-info-justice', 14, {
    title:
      'Livraisons répétées de matériels informatiques au ministère de la Justice du Niger',
    domain: 'informatique',
    description:
      'Livraisons répétées de matériels informatiques auprès du ministère de la Justice du Niger, à la suite de plusieurs appels d’offres ouverts.',
    beneficiary: 'Ministère de la Justice du Niger',
    procedure: 'Plusieurs appels d’offres ouverts',
  }),
  ref('exp-info-faj', 15, {
    title: 'Livraison de matériels informatiques à la FAJ',
    domain: 'informatique',
    description:
      'Livraison de matériels informatiques auprès de la FAJ, à la suite d’appels d’offres.',
    beneficiary: 'FAJ',
    procedure: 'Appels d’offres',
  }),
  ref('exp-info-jeunesse-sports', 16, {
    title: 'Fourniture de matériels destinés à l’organisation des examens',
    domain: 'informatique',
    description:
      'Fourniture de matériels destinés à l’organisation des examens auprès du ministère de la Jeunesse et des Sports du Niger.',
    beneficiary: 'Ministère de la Jeunesse et des Sports du Niger',
  }),

  // ---------------- Fournitures vivrières ----------------
  ref('exp-vivrier-tchirozerine-inspection', 20, {
    title:
      'Livraisons répétées de fournitures vivrières à l’Inspection de l’enseignement primaire et préscolaire de Tchirozérine',
    domain: 'vivrier',
    description:
      'Livraisons répétées de fournitures vivrières auprès de l’Inspection de l’enseignement primaire et préscolaire de Tchirozérine, à la suite d’un appel d’offres ouvert.',
    beneficiary: 'Inspection de l’enseignement primaire et préscolaire de Tchirozérine',
    procedure: 'Appel d’offres ouvert',
    location: 'Tchirozérine',
  }),
];
