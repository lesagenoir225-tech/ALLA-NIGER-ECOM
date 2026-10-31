import { createClient } from '@supabase/supabase-js';
import { DatabaseSchema, Product, SiteSettings, TextileBrand } from '../types';

/**
 * Projet Supabase ALFFA NIGER (référence blcrwjsrxcumtapymofn).
 *
 * La clé ci-dessous est une clé *publishable*, conçue pour être publique :
 * elle ne permet que la lecture, jamais l'écriture (voir supabase/schema.sql).
 * Les écritures passent exclusivement par l'API du serveur.
 */
const FALLBACK_URL = 'https://blcrwjsrxcumtapymofn.supabase.co';
const FALLBACK_ANON_KEY = 'sb_publishable_DZ2H41yPUw9KtVqf2cnKxA_JR_3vmUT';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_ANON_KEY;

/** Référence du projet, utilisée pour les liens vers le tableau de bord. */
export const SUPABASE_PROJECT_REF =
  (SUPABASE_URL.match(/https:\/\/([a-z0-9]+)\.supabase\.co/) || [])[1] || '';

export const SUPABASE_SQL_EDITOR_URL = SUPABASE_PROJECT_REF
  ? `https://supabase.com/dashboard/project/${SUPABASE_PROJECT_REF}/sql`
  : 'https://supabase.com/dashboard';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface SupabaseHealth {
  connected: boolean;
  hasTables: boolean;
  tables: {
    products: boolean;
    brands: boolean;
    site_settings: boolean;
  };
  errorMessage?: string;
}

export interface SupabaseConnectionDiagnostic {
  connected: boolean;
  statusText: 'Connexion Supabase réussie' | 'Échec de connexion';
  url: string;
  latencyMs: number;
  auth: {
    hasSession: boolean;
    sessionStatus: string;
    userEmail?: string | null;
  };
  database: {
    hasTables: boolean;
    productsTable: boolean;
    brandsTable: boolean;
    siteSettingsTable: boolean;
    errorCode?: string | null;
    errorMessage?: string | null;
  };
  summaryMessage: string;
  testedAt: string;
}

/**
 * Test de connexion non destructif :
 * - Vérifie la connectivité réseau et la clé API via l'API Auth (sans modification).
 * - Vérifie la présence d'une session Auth (sans exposer de mot de passe ni jeton).
 * - Interroge les tables en lecture seule sans toucher aux données.
 */
export async function testSupabaseConnection(): Promise<SupabaseConnectionDiagnostic> {
  const startTime = performance.now();
  const testedAt = new Date().toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const diagnostic: SupabaseConnectionDiagnostic = {
    connected: false,
    statusText: 'Échec de connexion',
    url: SUPABASE_URL,
    latencyMs: 0,
    auth: {
      hasSession: false,
      sessionStatus: 'Non vérifié',
    },
    database: {
      hasTables: false,
      productsTable: false,
      brandsTable: false,
      siteSettingsTable: false,
    },
    summaryMessage: '',
    testedAt,
  };

  try {
    // 1. Test Auth non destructif (vérifie si l'endpoint Supabase répond avec la clé API fournie)
    const { data: authData, error: authError } = await supabase.auth.getSession();

    if (authError) {
      diagnostic.connected = false;
      diagnostic.statusText = 'Échec de connexion';
      diagnostic.auth.sessionStatus = `Erreur Auth : ${authError.message}`;
      diagnostic.summaryMessage = `Échec de connexion à Supabase : ${authError.message}`;
      diagnostic.latencyMs = Math.round(performance.now() - startTime);
      return diagnostic;
    }

    // Connectivité établie
    diagnostic.connected = true;
    diagnostic.statusText = 'Connexion Supabase réussie';

    // 2. Inspection de la session Auth sans fuite de secrets
    const session = authData?.session;
    diagnostic.auth.hasSession = Boolean(session);
    if (session && session.user) {
      diagnostic.auth.sessionStatus = 'Session active (utilisateur authentifié)';
      diagnostic.auth.userEmail = session.user.email || 'Utilisateur sans email direct';
    } else {
      diagnostic.auth.sessionStatus = 'Aucune session active (visiteur anonyme / public)';
    }

    // 3. Test non-destructif en lecture seule sur les tables
    const [pRes, bRes, sRes] = await Promise.all([
      supabase.from('products').select('id').limit(1),
      supabase.from('brands').select('id').limit(1),
      supabase.from('site_settings').select('id').limit(1),
    ]);

    diagnostic.database.productsTable = !pRes.error;
    diagnostic.database.brandsTable = !bRes.error;
    diagnostic.database.siteSettingsTable = !sRes.error;

    diagnostic.database.hasTables =
      diagnostic.database.productsTable &&
      diagnostic.database.brandsTable &&
      diagnostic.database.siteSettingsTable;

    diagnostic.latencyMs = Math.round(performance.now() - startTime);

    if (diagnostic.database.hasTables) {
      diagnostic.summaryMessage =
        'Connexion Supabase réussie : le projet répond parfaitement et les tables de données sont opérationnelles.';
    } else if (pRes.error?.code === 'PGRST205') {
      diagnostic.database.errorCode = 'PGRST205';
      diagnostic.database.errorMessage =
        "Le projet Supabase répond, mais les tables ('products', 'brands', 'site_settings') n'ont pas encore été créées dans la base de données PostgreSQL.";
      diagnostic.summaryMessage =
        "Connexion Supabase réussie : le projet et la clé API sont valides. Les tables ne sont pas encore créées dans PostgreSQL (Erreur PGRST205 - Schéma à exécuter).";
    } else if (pRes.error) {
      diagnostic.database.errorCode = pRes.error.code;
      diagnostic.database.errorMessage = pRes.error.message;
      diagnostic.summaryMessage = `Connexion Supabase réussie (Auth joignable), mais erreur sur la base de données : ${pRes.error.message}`;
    }

    return diagnostic;
  } catch (err: any) {
    diagnostic.connected = false;
    diagnostic.statusText = 'Échec de connexion';
    diagnostic.summaryMessage = `Échec de connexion : ${err.message || 'Impossible de joindre le serveur Supabase'}`;
    diagnostic.latencyMs = Math.round(performance.now() - startTime);
    return diagnostic;
  }
}

/**
 * Vérifie l'état de la connexion et l'existence des tables dans Supabase
 */
export async function checkSupabaseHealth(): Promise<SupabaseHealth> {
  const health: SupabaseHealth = {
    connected: false,
    hasTables: false,
    tables: {
      products: false,
      brands: false,
      site_settings: false,
    },
  };

  try {
    // 1. Tester la table products
    const pRes = await supabase.from('products').select('id').limit(1);
    if (!pRes.error) {
      health.connected = true;
      health.tables.products = true;
    } else if (pRes.error.code === 'PGRST205') {
      // Le projet répond mais la table n'est pas encore créée
      health.connected = true;
      health.tables.products = false;
      health.errorMessage = pRes.error.message;
    } else {
      health.connected = true;
    }

    // 2. Tester brands
    const bRes = await supabase.from('brands').select('id').limit(1);
    if (!bRes.error) {
      health.connected = true;
      health.tables.brands = true;
    }

    // 3. Tester site_settings
    const sRes = await supabase.from('site_settings').select('id').limit(1);
    if (!sRes.error) {
      health.connected = true;
      health.tables.site_settings = true;
    }

    health.hasTables = health.tables.products && health.tables.brands && health.tables.site_settings;
    return health;
  } catch (err: any) {
    return {
      connected: false,
      hasTables: false,
      tables: { products: false, brands: false, site_settings: false },
      errorMessage: err.message || 'Impossible de joindre Supabase',
    };
  }
}

/**
 * Récupère tous les produits depuis Supabase
 */
export async function fetchProductsFromSupabase(): Promise<Product[] | null> {
  try {
    // L'ordre d'affichage choisi dans l'administration prime sur la date de
    // création : `display_order` est propre à chaque boutique.
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error || !data) return null;
    return data.map((p) => ({
      id: p.id,
      shop: p.shop,
      name: p.name,
      brand: p.brand,
      category: p.category,
      price: p.price !== null ? Number(p.price) : null,
      availability: p.availability || 'disponible',
      capacity: p.capacity || undefined,
      colors: p.colors || undefined,
      condition: p.condition || undefined,
      reference: p.reference || undefined,
      description: p.description || undefined,
      specs: p.specs || undefined,
      model: p.model || undefined,
      image: p.image || undefined,
      sourceImage: p.source_image || undefined,
      isNew: Boolean(p.is_new),
      hidden: Boolean(p.hidden),
      createdAt: Number(p.created_at) || Date.now(),
    }));
  } catch {
    return null;
  }
}

/**
 * Récupère toutes les marques depuis Supabase
 */
export async function fetchBrandsFromSupabase(): Promise<TextileBrand[] | null> {
  try {
    const { data, error } = await supabase.from('brands').select('*').order('display_order', { ascending: true });
    if (error || !data) return null;
    return data.map((b) => ({
      id: b.id,
      name: b.name,
      logo: b.logo || '',
      sourceLogo: b.source_logo || undefined,
      order: b.display_order || 1,
    }));
  } catch {
    return null;
  }
}

/**
 * Récupère les paramètres du site depuis Supabase
 */
export async function fetchSettingsFromSupabase(): Promise<Partial<SiteSettings> | null> {
  try {
    const { data, error } = await supabase.from('site_settings').select('*').eq('id', 1).single();
    if (error || !data) return null;
    return {
      name: data.name,
      slogan: data.slogan,
      whatsappElectronique: data.whatsapp_electronique,
      whatsappTextile: data.whatsapp_textile,
      phone: data.phone,
      address: data.address,
      email: data.email,
      hours: data.hours,
      facebook: data.facebook,
      instagram: data.instagram,
      tiktok: data.tiktok,
      mapsElectronique: data.maps_electronique,
      mapsTextile: data.maps_textile,
      siteUrl: data.site_url,
      legalName: data.legal_name,
      legalInfo: data.legal_info,
      privacyText: data.privacy_text,
      heroTitle: data.hero_title,
      heroSubtitle: data.hero_subtitle,
      elecIntro: data.elec_intro,
      textileIntro: data.textile_intro,
    };
  } catch {
    return null;
  }
}

/**
 * Sauvegarde un produit individuel sur Supabase
 */
export async function saveProductToSupabase(p: Product): Promise<boolean> {
  try {
    const payload = {
      id: p.id,
      shop: p.shop,
      name: p.name,
      brand: p.brand,
      category: p.category,
      price: p.price,
      availability: p.availability,
      capacity: p.capacity || null,
      colors: p.colors || null,
      condition: p.condition || null,
      reference: p.reference || null,
      description: p.description || null,
      specs: p.specs || null,
      model: p.model || null,
      image: p.image || null,
      source_image: p.sourceImage || null,
      is_new: p.isNew || false,
      hidden: p.hidden || false,
      created_at: p.createdAt || Date.now(),
    };
    const { error } = await supabase.from('products').upsert(payload);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Supprime un produit de Supabase
 */
export async function deleteProductFromSupabase(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('products').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Sauvegarde une marque sur Supabase
 */
export async function saveBrandToSupabase(b: TextileBrand): Promise<boolean> {
  try {
    const payload = {
      id: b.id,
      name: b.name,
      logo: b.logo || '',
      source_logo: b.sourceLogo || '',
      display_order: b.order || 1,
    };
    const { error } = await supabase.from('brands').upsert(payload);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Supprime une marque de Supabase
 */
export async function deleteBrandFromSupabase(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('brands').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Sauvegarde les paramètres sur Supabase
 */
export async function saveSettingsToSupabase(s: Partial<SiteSettings>): Promise<boolean> {
  try {
    const payload: Record<string, any> = { id: 1 };
    if (s.name !== undefined) payload.name = s.name;
    if (s.slogan !== undefined) payload.slogan = s.slogan;
    if (s.whatsappElectronique !== undefined) payload.whatsapp_electronique = s.whatsappElectronique;
    if (s.whatsappTextile !== undefined) payload.whatsapp_textile = s.whatsappTextile;
    if (s.phone !== undefined) payload.phone = s.phone;
    if (s.address !== undefined) payload.address = s.address;
    if (s.email !== undefined) payload.email = s.email;
    if (s.hours !== undefined) payload.hours = s.hours;
    if (s.facebook !== undefined) payload.facebook = s.facebook;
    if (s.instagram !== undefined) payload.instagram = s.instagram;
    if (s.tiktok !== undefined) payload.tiktok = s.tiktok;
    if (s.mapsElectronique !== undefined) payload.maps_electronique = s.mapsElectronique;
    if (s.mapsTextile !== undefined) payload.maps_textile = s.mapsTextile;
    if (s.siteUrl !== undefined) payload.site_url = s.siteUrl;
    if (s.legalName !== undefined) payload.legal_name = s.legalName;
    if (s.legalInfo !== undefined) payload.legal_info = s.legalInfo;
    if (s.privacyText !== undefined) payload.privacy_text = s.privacyText;
    if (s.heroTitle !== undefined) payload.hero_title = s.heroTitle;
    if (s.heroSubtitle !== undefined) payload.hero_subtitle = s.heroSubtitle;
    if (s.elecIntro !== undefined) payload.elec_intro = s.elecIntro;
    if (s.textileIntro !== undefined) payload.textile_intro = s.textileIntro;

    const { error } = await supabase.from('site_settings').upsert(payload);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Envoie l'intégralité du catalogue et des paramètres dans Supabase
 */
export async function syncAllToSupabase(db: DatabaseSchema): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Synchroniser les paramètres
    const settingsPayload = {
      id: 1,
      name: db.settings.name,
      slogan: db.settings.slogan,
      whatsapp_electronique: db.settings.whatsappElectronique,
      whatsapp_textile: db.settings.whatsappTextile,
      phone: db.settings.phone,
      address: db.settings.address,
      email: db.settings.email,
      hours: db.settings.hours,
      facebook: db.settings.facebook,
      instagram: db.settings.instagram,
      tiktok: db.settings.tiktok,
      maps_electronique: db.settings.mapsElectronique,
      maps_textile: db.settings.mapsTextile,
      site_url: db.settings.siteUrl,
      legal_name: db.settings.legalName,
      legal_info: db.settings.legalInfo,
      privacy_text: db.settings.privacyText,
      hero_title: db.settings.heroTitle,
      hero_subtitle: db.settings.heroSubtitle,
      elec_intro: db.settings.elecIntro,
      textile_intro: db.settings.textileIntro,
    };

    const sRes = await supabase.from('site_settings').upsert(settingsPayload);
    if (sRes.error) throw new Error(`Erreur site_settings: ${sRes.error.message}`);

    // 2. Synchroniser les marques
    const brandsPayload = db.brands.map((b) => ({
      id: b.id,
      name: b.name,
      logo: b.logo || '',
      source_logo: b.sourceLogo || '',
      display_order: b.order,
    }));
    const bRes = await supabase.from('brands').upsert(brandsPayload);
    if (bRes.error) throw new Error(`Erreur brands: ${bRes.error.message}`);

    // 3. Synchroniser les produits
    //    La position dans le tableau (filtré par boutique) devient l'ordre
    //    d'affichage : la synchronisation conserve donc le réordonnancement.
    const positionInShop: Record<string, number> = {};
    const productsPayload = db.products.map((p) => {
      positionInShop[p.shop] = (positionInShop[p.shop] || 0) + 1;
      return {
        id: p.id,
        shop: p.shop,
        name: p.name,
        brand: p.brand,
        category: p.category,
        price: p.price,
        availability: p.availability,
        capacity: p.capacity || null,
        colors: p.colors || null,
        condition: p.condition || null,
        reference: p.reference || null,
        description: p.description || null,
        specs: p.specs || null,
        model: p.model || null,
        image: p.image || null,
        source_image: p.sourceImage || null,
        is_new: p.isNew || false,
        hidden: p.hidden || false,
        created_at: p.createdAt,
        display_order: positionInShop[p.shop],
      };
    });

    const pRes = await supabase.from('products').upsert(productsPayload);
    if (pRes.error) throw new Error(`Erreur products: ${pRes.error.message}`);

    return {
      success: true,
      message: `${db.products.length} produits et paramètres synchronisés avec succès sur Supabase.`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Échec de la synchronisation Supabase',
    };
  }
}
