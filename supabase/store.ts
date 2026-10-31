/**
 * Couche de persistance Supabase — côté serveur uniquement.
 *
 * Ne jamais importer ce module depuis le code navigateur : il utilise la clé
 * `service_role`, qui contourne RLS et donne tous les droits d'écriture.
 *
 * Stratégie de repli : si Supabase n'est pas configuré ou injoignable, le
 * serveur continue de fonctionner sur les fichiers JSON locaux. Le site ne
 * tombe jamais en panne à cause de la base.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { DatabaseSchema, Product, SiteSettings, TextileBrand } from '../src/types';
import type { ExperienceReference } from '../src/types/experience';

// Lecture PARESSEUSE de l'environnement : les imports ES sont évalués avant
// l'appel à `dotenv.config()`, donc des constantes de module seraient vides.
function url(): string {
  return process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
}
function serviceKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}
function anonKey(): string {
  return process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
}

/** Vrai quand l'écriture distante est possible (clé service_role présente). */
export function remoteWritesEnabled(): boolean {
  return Boolean(url() && serviceKey());
}

/** Vrai quand au moins la lecture distante est possible. */
export function remoteReadsEnabled(): boolean {
  return Boolean(url() && (serviceKey() || anonKey()));
}

let client: SupabaseClient | null = null;
let clientKeySignature = '';

function db(): SupabaseClient {
  const signature = `${url()}|${serviceKey() ? 'service' : 'anon'}`;
  if (!client || signature !== clientKeySignature) {
    client = createClient(url(), serviceKey() || anonKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    clientKeySignature = signature;
  }
  return client;
}

// ---------------------------------------------------------------------------
// Conversions ligne SQL <-> modèle applicatif
// ---------------------------------------------------------------------------
type ProductRow = {
  id: string;
  shop: string;
  name: string;
  brand: string;
  category: string;
  price: number | null;
  availability: string;
  capacity: string | null;
  colors: string | null;
  condition: string | null;
  reference: string | null;
  description: string | null;
  specs: string | null;
  model: string | null;
  image: string | null;
  source_image: string | null;
  is_new: boolean | null;
  hidden: boolean | null;
  created_at: number | null;
};

function rowToProduct(r: ProductRow): Product {
  return {
    id: r.id,
    shop: r.shop as Product['shop'],
    name: r.name,
    brand: r.brand || '',
    category: r.category || '',
    price: r.price === null || r.price === undefined ? null : Number(r.price),
    availability: (r.availability || 'disponible') as Product['availability'],
    capacity: r.capacity || undefined,
    colors: r.colors || undefined,
    condition: r.condition || undefined,
    reference: r.reference || undefined,
    description: r.description || undefined,
    specs: r.specs || undefined,
    model: r.model || undefined,
    image: r.image || undefined,
    sourceImage: r.source_image || undefined,
    isNew: Boolean(r.is_new),
    hidden: Boolean(r.hidden),
    createdAt: Number(r.created_at || 0),
  };
}

function productToRow(p: Product): ProductRow {
  return {
    id: p.id,
    shop: p.shop,
    name: p.name,
    brand: p.brand || '',
    category: p.category || '',
    price: p.price === null || p.price === undefined ? null : Number(p.price),
    availability: p.availability || 'disponible',
    capacity: p.capacity || null,
    colors: p.colors || null,
    condition: p.condition || null,
    reference: p.reference || null,
    description: p.description || null,
    specs: p.specs || null,
    model: p.model || null,
    image: p.image || null,
    source_image: p.sourceImage || null,
    is_new: Boolean(p.isNew),
    hidden: Boolean(p.hidden),
    created_at: p.createdAt || Date.now(),
  };
}

function rowToSettings(r: Record<string, any>): Partial<SiteSettings> {
  return {
    name: r.name ?? '',
    slogan: r.slogan ?? '',
    whatsappElectronique: r.whatsapp_electronique ?? '',
    whatsappTextile: r.whatsapp_textile ?? '',
    phone: r.phone ?? '',
    address: r.address ?? '',
    email: r.email ?? '',
    hours: r.hours ?? '',
    facebook: r.facebook ?? '',
    instagram: r.instagram ?? '',
    tiktok: r.tiktok ?? '',
    mapsElectronique: r.maps_electronique ?? '',
    mapsTextile: r.maps_textile ?? '',
    siteUrl: r.site_url ?? '',
    legalName: r.legal_name ?? '',
    legalInfo: r.legal_info ?? '',
    privacyText: r.privacy_text ?? '',
    heroTitle: r.hero_title ?? '',
    heroSubtitle: r.hero_subtitle ?? '',
    elecIntro: r.elec_intro ?? '',
    textileIntro: r.textile_intro ?? '',
  };
}

function settingsToRow(s: SiteSettings) {
  return {
    id: 1,
    name: s.name,
    slogan: s.slogan,
    whatsapp_electronique: s.whatsappElectronique,
    whatsapp_textile: s.whatsappTextile,
    phone: s.phone,
    address: s.address,
    email: s.email,
    hours: s.hours,
    facebook: s.facebook,
    instagram: s.instagram,
    tiktok: s.tiktok,
    maps_electronique: s.mapsElectronique,
    maps_textile: s.mapsTextile,
    site_url: s.siteUrl,
    legal_name: s.legalName,
    legal_info: s.legalInfo,
    privacy_text: s.privacyText,
    hero_title: s.heroTitle,
    hero_subtitle: s.heroSubtitle,
    elec_intro: s.elecIntro,
    textile_intro: s.textileIntro,
    updated_at: new Date().toISOString(),
  };
}

function rowToReference(r: Record<string, any>): ExperienceReference {
  return {
    id: r.id,
    title: r.title,
    domain: r.domain,
    description: r.description || '',
    beneficiary: r.beneficiary || undefined,
    procedure: r.procedure || undefined,
    location: r.location || undefined,
    execution: r.execution,
    validation: r.validation,
    published: Boolean(r.published),
    photos: Array.isArray(r.photos) ? r.photos : [],
    documents: Array.isArray(r.documents) ? r.documents : [],
    order: Number(r.display_order ?? 1),
    createdAt: Number(r.created_at || 0),
    updatedAt: Number(r.updated_at || 0),
    publishedAt: r.published_at ? Number(r.published_at) : undefined,
  };
}

function referenceToRow(ref: ExperienceReference) {
  return {
    id: ref.id,
    title: ref.title,
    domain: ref.domain,
    description: ref.description || '',
    beneficiary: ref.beneficiary || null,
    procedure: ref.procedure || null,
    location: ref.location || null,
    execution: ref.execution,
    validation: ref.validation,
    published: Boolean(ref.published),
    photos: ref.photos || [],
    documents: ref.documents || [],
    display_order: ref.order ?? 1,
    created_at: ref.createdAt || Date.now(),
    updated_at: ref.updatedAt || Date.now(),
    published_at: ref.publishedAt ?? null,
  };
}

// ---------------------------------------------------------------------------
// Catalogue
// ---------------------------------------------------------------------------

/**
 * Charge le catalogue depuis Supabase.
 * Renvoie `null` si la base est vide (au premier démarrage), afin que
 * l'appelant puisse amorcer avec les données locales.
 */
export async function loadDatabaseFromRemote(): Promise<DatabaseSchema | null> {
  if (!remoteReadsEnabled()) return null;
  try {
    const [productsRes, brandsRes, settingsRes, featuredRes] = await Promise.all([
      db().from('products').select('*'),
      db().from('brands').select('*').order('display_order', { ascending: true }),
      db().from('site_settings').select('*').eq('id', 1).maybeSingle(),
      db().from('featured').select('*').order('display_order', { ascending: true }),
    ]);

    const failed = [productsRes, brandsRes, settingsRes, featuredRes].find((r) => r.error);
    if (failed?.error) {
      console.warn('[supabase] lecture impossible :', failed.error.message);
      return null;
    }

    const products = (productsRes.data || []).map((r: any) => rowToProduct(r as ProductRow));
    // Base encore vide : on laisse l'appelant amorcer depuis les fichiers locaux.
    if (products.length === 0) return null;

    const brands: TextileBrand[] = (brandsRes.data || []).map((b: any) => ({
      id: b.id,
      name: b.name,
      logo: b.logo || undefined,
      sourceLogo: b.source_logo || undefined,
      order: Number(b.display_order ?? 1),
    }));

    const featured = { electronique: [] as string[], textile: [] as string[] };
    for (const row of featuredRes.data || []) {
      const key = row.shop === 'textile' ? 'textile' : 'electronique';
      featured[key].push(row.product_id);
    }

    return {
      version: 1,
      seededAt: new Date().toISOString(),
      settings: rowToSettings(settingsRes.data || {}) as SiteSettings,
      products,
      featured,
      brands,
    };
  } catch (err) {
    console.warn('[supabase] erreur de lecture du catalogue :', (err as Error).message);
    return null;
  }
}

/** Écrit le catalogue complet dans Supabase (upsert + suppression des absents). */
export async function persistDatabaseToRemote(database: DatabaseSchema): Promise<boolean> {
  if (!remoteWritesEnabled()) return false;
  try {
    const c = db();

    const { error: pErr } = await c.from('products').upsert(database.products.map(productToRow));
    if (pErr) throw new Error(`products : ${pErr.message}`);

    const { error: bErr } = await c.from('brands').upsert(
      database.brands.map((b) => ({
        id: b.id,
        name: b.name,
        logo: b.logo || '',
        source_logo: b.sourceLogo || '',
        display_order: b.order ?? 1,
      })),
    );
    if (bErr) throw new Error(`brands : ${bErr.message}`);

    const { error: sErr } = await c.from('site_settings').upsert(settingsToRow(database.settings));
    if (sErr) throw new Error(`site_settings : ${sErr.message}`);

    // Suppression des lignes retirées localement.
    const keepProducts = database.products.map((p) => p.id);
    if (keepProducts.length > 0) {
      await c.from('products').delete().not('id', 'in', `(${keepProducts.map((id) => `"${id}"`).join(',')})`);
    }
    const keepBrands = database.brands.map((b) => b.id);
    if (keepBrands.length > 0) {
      await c.from('brands').delete().not('id', 'in', `(${keepBrands.map((id) => `"${id}"`).join(',')})`);
    }

    // « À la une » : on remplace l'intégralité du contenu.
    await c.from('featured').delete().neq('shop', '___');
    const featuredRows = [
      ...database.featured.electronique.map((productId, i) => ({
        shop: 'electronique',
        product_id: productId,
        display_order: i + 1,
      })),
      ...database.featured.textile.map((productId, i) => ({
        shop: 'textile',
        product_id: productId,
        display_order: i + 1,
      })),
    ];
    if (featuredRows.length > 0) {
      const { error: fErr } = await c.from('featured').upsert(featuredRows, {
        onConflict: 'shop,product_id',
      });
      if (fErr) throw new Error(`featured : ${fErr.message}`);
    }

    return true;
  } catch (err) {
    console.warn('[supabase] écriture du catalogue impossible :', (err as Error).message);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Expérience entrepreneuriale
// ---------------------------------------------------------------------------

export async function loadExperienceFromRemote(): Promise<ExperienceReference[] | null> {
  if (!remoteReadsEnabled()) return null;
  try {
    // Lecture avec la clé service_role : on veut aussi les brouillons, que
    // l'administration doit pouvoir éditer. RLS les masque au public.
    const { data, error } = await db()
      .from('experience_references')
      .select('*')
      .order('display_order', { ascending: true });
    if (error) {
      console.warn('[supabase] lecture expérience impossible :', error.message);
      return null;
    }
    if (!data || data.length === 0) return null;
    return data.map(rowToReference);
  } catch (err) {
    console.warn('[supabase] erreur de lecture expérience :', (err as Error).message);
    return null;
  }
}

export async function persistExperienceToRemote(list: ExperienceReference[]): Promise<boolean> {
  if (!remoteWritesEnabled()) return false;
  try {
    const c = db();
    if (list.length > 0) {
      const { error } = await c
        .from('experience_references')
        .upsert(list.map(referenceToRow), { onConflict: 'id' });
      if (error) throw new Error(error.message);

      const keep = list.map((r) => r.id);
      await c
        .from('experience_references')
        .delete()
        .not('id', 'in', `(${keep.map((id) => `"${id}"`).join(',')})`);
    } else {
      await c.from('experience_references').delete().neq('id', '');
    }
    return true;
  } catch (err) {
    console.warn('[supabase] écriture expérience impossible :', (err as Error).message);
    return false;
  }
}

/** Diagnostic lisible, exposé par /api/supabase/status. */
export function remoteConfigSummary() {
  return {
    url: url() || null,
    reads: remoteReadsEnabled(),
    writes: remoteWritesEnabled(),
    writeMode: remoteWritesEnabled() ? 'service_role' : 'desactive',
  };
}
