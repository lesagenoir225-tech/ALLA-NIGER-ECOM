/**
 * Adaptateur d'accès aux données.
 *
 * Problème résolu : le site est hébergé en statique (LWS, Vercel). Il n'y a
 * aucun processus Node, donc `/api/admin/login` renvoyait la page HTML
 * d'accueil — d'où l'erreur « Unexpected token '<' ... is not valid JSON ».
 *
 * Principe : on teste UNE FOIS si une vraie API Node répond du JSON.
 *   • oui  → on utilise `/api/*` comme avant (aucun changement de comportement) ;
 *   • non  → on exécute les mêmes opérations via les fonctions PostgreSQL
 *            `admin_*` (voir supabase/admin-rpc.sql), appelées avec la clé
 *            publique. Le mot de passe est vérifié en base, jamais dans le
 *            navigateur, et la clé service_role n'est jamais exposée.
 */
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase';

export interface ApiResponse {
  ok: boolean;
  status: number;
  json(): Promise<any>;
  text(): Promise<string>;
}

function makeResponse(data: unknown, status = 200): ApiResponse {
  const body = JSON.stringify(data ?? {});
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => JSON.parse(body),
    text: async () => body,
  };
}

const ok = (data: unknown = {}) => makeResponse(data, 200);
const failure = (message: string, status = 400) => makeResponse({ error: message }, status);

// ---------------------------------------------------------------------------
// Détection du serveur Node (une seule fois par chargement de page)
// ---------------------------------------------------------------------------
let nodeApiAvailable: boolean | null = null;

async function hasNodeApi(): Promise<boolean> {
  if (nodeApiAvailable !== null) return nodeApiAvailable;
  try {
    const res = await fetch('/api/supabase/status', { headers: { Accept: 'application/json' } });
    const contentType = res.headers?.get?.('content-type') || '';
    nodeApiAvailable = res.ok && contentType.includes('json');
  } catch {
    nodeApiAvailable = false;
  }
  return nodeApiAvailable;
}

function bearerToken(init?: RequestInit): string {
  const headers = init?.headers;
  if (!headers) return '';
  const get = (key: string): string => {
    if (headers instanceof Headers) return headers.get(key) || '';
    if (Array.isArray(headers)) {
      const found = headers.find(([k]) => k.toLowerCase() === key.toLowerCase());
      return found ? String(found[1]) : '';
    }
    const record = headers as Record<string, string>;
    const found = Object.keys(record).find((k) => k.toLowerCase() === key.toLowerCase());
    return found ? String(record[found]) : '';
  };
  return get('Authorization').replace(/^Bearer\s+/i, '').trim();
}

function parseBody<T = any>(init?: RequestInit): T {
  try {
    return init?.body ? JSON.parse(String(init.body)) : ({} as T);
  } catch {
    return {} as T;
  }
}

// ---------------------------------------------------------------------------
// Conversions API (camelCase) <-> base (snake_case)
// ---------------------------------------------------------------------------
function productToRow(p: any) {
  return {
    id: p.id,
    shop: p.shop,
    name: p.name,
    brand: p.brand ?? '',
    category: p.category ?? '',
    price: p.price ?? null,
    availability: p.availability ?? 'disponible',
    capacity: p.capacity ?? null,
    colors: p.colors ?? null,
    condition: p.condition ?? null,
    reference: p.reference ?? null,
    description: p.description ?? null,
    specs: p.specs ?? null,
    model: p.model ?? null,
    image: p.image ?? null,
    source_image: p.sourceImage ?? null,
    is_new: Boolean(p.isNew),
    hidden: Boolean(p.hidden),
    created_at: p.createdAt ?? Date.now(),
  };
}

function rowToProduct(r: any) {
  return {
    id: r.id,
    shop: r.shop,
    name: r.name,
    brand: r.brand || '',
    category: r.category || '',
    price: r.price === null || r.price === undefined ? null : Number(r.price),
    availability: r.availability || 'disponible',
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

function settingsToRow(s: any) {
  const map: Record<string, string> = {
    name: 'name',
    slogan: 'slogan',
    whatsappElectronique: 'whatsapp_electronique',
    whatsappTextile: 'whatsapp_textile',
    phone: 'phone',
    address: 'address',
    email: 'email',
    hours: 'hours',
    facebook: 'facebook',
    instagram: 'instagram',
    tiktok: 'tiktok',
    mapsElectronique: 'maps_electronique',
    mapsTextile: 'maps_textile',
    siteUrl: 'site_url',
    legalName: 'legal_name',
    legalInfo: 'legal_info',
    privacyText: 'privacy_text',
    heroTitle: 'hero_title',
    heroSubtitle: 'hero_subtitle',
    elecIntro: 'elec_intro',
    textileIntro: 'textile_intro',
  };
  const row: Record<string, unknown> = {};
  for (const [camel, snake] of Object.entries(map)) {
    if (s && s[camel] !== undefined) row[snake] = s[camel];
  }
  return row;
}

function rowToSettings(r: any) {
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

export function referenceToRow(ref: any) {
  return {
    id: ref.id,
    title: ref.title,
    domain: ref.domain,
    description: ref.description ?? '',
    beneficiary: ref.beneficiary ?? null,
    procedure: ref.procedure ?? null,
    location: ref.location ?? null,
    execution: ref.execution ?? 'non_confirme',
    validation: ref.validation ?? 'brouillon',
    published: Boolean(ref.published),
    photos: ref.photos ?? [],
    documents: ref.documents ?? [],
    display_order: ref.order ?? 1,
    created_at: ref.createdAt ?? Date.now(),
    updated_at: ref.updatedAt ?? Date.now(),
    published_at: ref.publishedAt ?? null,
  };
}

export function rowToReference(r: any) {
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

// ---------------------------------------------------------------------------
// Aides base de données
// ---------------------------------------------------------------------------
async function callRpc<T = any>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message || 'Erreur de la base de données.');
  return data as T;
}

async function readSettings() {
  const { data } = await supabase.from('site_settings').select('*').eq('id', 1).maybeSingle();
  return data ? rowToSettings(data) : null;
}

async function readFeatured() {
  const { data } = await supabase
    .from('featured')
    .select('shop, product_id, display_order')
    .order('display_order', { ascending: true });
  const featured: { electronique: string[]; textile: string[] } = {
    electronique: [],
    textile: [],
  };
  for (const row of data || []) {
    if (row.shop === 'textile') featured.textile.push(row.product_id);
    else featured.electronique.push(row.product_id);
  }
  return featured;
}

/**
 * Envoi d'un fichier vers Supabase Storage (open source) via la fonction Edge
 * `upload`. La fonction vérifie elle-même le jeton administrateur en base :
 * sans jeton valide, rien n'est stocké.
 */
async function uploadViaStorage(body: any, token: string): Promise<ApiResponse> {
  if (!token) {
    return failure('Session administrateur requise pour envoyer un fichier.', 401);
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': token,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { error: 'Réponse invalide du service de fichiers.' };
    }
    return makeResponse(data, res.status);
  } catch {
    return failure('Service de fichiers injoignable. Vérifiez votre connexion.', 503);
  }
}

// ---------------------------------------------------------------------------
// Point d'entrée
// ---------------------------------------------------------------------------
export async function api(path: string, init?: RequestInit): Promise<ApiResponse> {
  if (await hasNodeApi()) {
    return fetch(path, init) as unknown as ApiResponse;
  }

  const method = (init?.method || 'GET').toUpperCase();
  const token = bearerToken(init);
  const body = parseBody(init);

  try {
    // --- Session administrateur ---
    if (path === '/api/admin/login' && method === 'POST') {
      const newToken = await callRpc<string>('admin_login', { p_password: body.password });
      return ok({ success: true, token: newToken });
    }

    if (path === '/api/admin/check') {
      if (!token) return ok({ authenticated: false });
      const authenticated = await callRpc<boolean>('admin_check', { p_token: token });
      return ok({ authenticated });
    }

    if (path === '/api/admin/logout') {
      if (token) await callRpc('admin_logout', { p_token: token });
      return ok({ success: true });
    }

    if (path === '/api/admin/change-password' && method === 'POST') {
      await callRpc('admin_change_password', {
        p_token: token,
        p_new_password: body.newPassword,
      });
      return ok({ success: true });
    }

    // --- Catalogue ---
    if (path === '/api/data') {
      const [productsRes, brandsRes, featured, settings] = await Promise.all([
        supabase.from('products').select('*'),
        supabase.from('brands').select('*').order('display_order', { ascending: true }),
        readFeatured(),
        readSettings(),
      ]);
      return ok({
        products: (productsRes.data || []).map(rowToProduct),
        brands: (brandsRes.data || []).map((b: any) => ({
          id: b.id,
          name: b.name,
          logo: b.logo || undefined,
          sourceLogo: b.source_logo || undefined,
          order: Number(b.display_order ?? 1),
        })),
        featured,
        settings,
      });
    }

    if (path.startsWith('/api/products') && !path.includes('/reorder')) {
      if (method === 'DELETE') {
        const id = path.split('/').pop() as string;
        await callRpc('admin_delete_product', { p_token: token, p_id: id });
        return ok({ success: true });
      }
      await callRpc('admin_save_product', { p_token: token, p: productToRow(body) });
      return ok({ success: true });
    }

    if (path === '/api/products/reorder') {
      // L'ordre d'affichage des produits n'est pas stocké en base.
      return failure(
        'La réorganisation des produits n’est pas disponible en mode base directe.',
        501,
      );
    }

    if (path === '/api/featured/toggle' && method === 'POST') {
      const featured = await readFeatured();
      const list = featured[body.shop as 'electronique' | 'textile'];
      const next = list.includes(body.id) ? list.filter((x) => x !== body.id) : [...list, body.id];
      const updated = { ...featured, [body.shop]: next };
      await callRpc('admin_save_featured', { p_token: token, p: updated });
      return ok({ success: true, featured: updated });
    }

    if (path === '/api/featured/reorder' && method === 'POST') {
      const featured = await readFeatured();
      const updated = { ...featured, [body.shop]: body.orderedIds };
      await callRpc('admin_save_featured', { p_token: token, p: updated });
      return ok({ success: true, featured: updated });
    }

    if (path === '/api/settings' && (method === 'PUT' || method === 'POST')) {
      await callRpc('admin_save_settings', { p_token: token, p: settingsToRow(body) });
      const settings = await readSettings();
      return ok({ success: true, settings });
    }

    // --- Marques ---
    if (path.startsWith('/api/brands')) {
      if (method === 'DELETE') {
        const id = path.split('/').pop() as string;
        await callRpc('admin_delete_brand', { p_token: token, p_id: id });
        return ok({ success: true });
      }
      await callRpc('admin_save_brand', {
        p_token: token,
        p: {
          id: body.id,
          name: body.name,
          logo: body.logo ?? null,
          source_logo: body.sourceLogo ?? null,
          display_order: body.order ?? 1,
        },
      });
      return ok({ success: true });
    }

    // --- Expérience entrepreneuriale ---
    if (path === '/api/experience' && method === 'GET') {
      const { data } = await supabase
        .from('experience_references')
        .select('*')
        .eq('published', true)
        .order('display_order', { ascending: true });
      return ok({ success: true, references: (data || []).map(rowToReference) });
    }

    if (path === '/api/admin/experience' && method === 'GET') {
      const refs = await callRpc<any[]>('admin_list_references', { p_token: token });
      return ok({ success: true, references: (refs || []).map(rowToReference) });
    }

    if (path === '/api/experience' && method === 'POST') {
      await callRpc('admin_save_reference', {
        p_token: token,
        p: referenceToRow(body.reference ?? body),
      });
      const refs = await callRpc<any[]>('admin_list_references', { p_token: token });
      return ok({ success: true, references: (refs || []).map(rowToReference) });
    }

    if (path.startsWith('/api/experience/') && (method === 'PUT' || method === 'POST')) {
      await callRpc('admin_save_reference', {
        p_token: token,
        p: referenceToRow(body.reference ?? body),
      });
      return ok({ success: true });
    }

    if (path.startsWith('/api/experience/') && method === 'DELETE') {
      const id = path.split('/').pop() as string;
      await callRpc('admin_delete_reference', { p_token: token, p_id: id });
      return ok({ success: true });
    }

    // --- Téléversement : Supabase Storage via la fonction Edge « upload » ---
    if (path === '/api/upload' || path.includes('/documents/upload')) {
      return uploadViaStorage(body, token);
    }

    if (path.startsWith('/api/btp')) {
      return failure(
        'Les projets BTP ne sont pas stockés dans la base. Cette section n’est pas disponible en mode base directe.',
        501,
      );
    }

    if (path === '/api/admin/reset' || path === '/api/restore') {
      return failure('Cette opération nécessite l’hébergement Node.', 501);
    }

    return failure(`Route non gérée hors serveur Node : ${method} ${path}`, 501);
  } catch (err: any) {
    return failure(err?.message || 'Erreur de la base de données.', 400);
  }
}
