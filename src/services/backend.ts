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

/**
 * Vrai quand le site est servi sans serveur Node (LWS, Vercel statique).
 * Utile à l'interface pour adapter ce qui n'existe pas dans ce mode :
 * lien de téléchargement de l'archive, synchronisation complète, section BTP.
 */
export async function isStaticHosting(): Promise<boolean> {
  return !(await hasNodeApi());
}

/**
 * Extrait le message d'une réponse en erreur, quel que soit son format.
 *
 * Sur un hébergement statique, une route `/api/...` inconnue renvoie la page
 * HTML du site : `res.json()` lèverait « Unexpected token '<' ».
 */
export async function readApiError(res: ApiResponse, fallback: string): Promise<string> {
  try {
    const text = await res.text();
    if (!text) return fallback;
    try {
      const data = JSON.parse(text);
      return data?.error || data?.message || fallback;
    } catch {
      if (/<!doctype|<html/i.test(text)) {
        return `${fallback} Aucune réponse de la base de données : le site est servi en statique et la requête n’a pas atteint Supabase.`;
      }
      return fallback;
    }
  } catch {
    return fallback;
  }
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
    nif: 'nif',
    rccm: 'rccm',
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
    nif: r.nif ?? '',
    rccm: r.rccm ?? '',
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

/** Les RPC renvoient des NUMERIC sous forme de chaînes : on renvoie des nombres. */
const num = (value: unknown): number => (value === null || value === undefined ? 0 : Number(value));

function normalizeStats(raw: any) {
  const k = raw?.kpis || {};
  return {
    from: raw?.from ? new Date(raw.from).getTime() : Date.now(),
    to: raw?.to ? new Date(raw.to).getTime() : Date.now(),
    kpis: {
      revenue: num(k.revenue),
      receipts: num(k.receipts),
      paid: num(k.paid),
      receivable: num(k.receivable),
      discounts: num(k.discounts),
      avgTicket: num(k.avgTicket),
    },
    daily: (raw?.daily || []).map((d: any) => ({ date: d.date, revenue: num(d.revenue), count: num(d.count) })),
    topProducts: (raw?.topProducts || []).map((p: any) => ({
      productId: p.productId || '',
      name: p.name || 'Article',
      quantity: num(p.quantity),
      revenue: num(p.revenue),
    })),
    byPayment: (raw?.byPayment || []).map((p: any) => ({
      method: p.method || 'espece',
      revenue: num(p.revenue),
      count: num(p.count),
    })),
    topClients: (raw?.topClients || []).map((c: any) => ({
      name: c.name || 'Client de passage',
      revenue: num(c.revenue),
      count: num(c.count),
    })),
  };
}

function normalizeFinance(raw: any) {
  return {
    from: raw?.from ? new Date(raw.from).getTime() : Date.now(),
    to: raw?.to ? new Date(raw.to).getTime() : Date.now(),
    revenue: num(raw?.revenue),
    cogs: num(raw?.cogs),
    grossMargin: num(raw?.grossMargin),
    expenses: num(raw?.expenses),
    netProfit: num(raw?.netProfit),
    receivable: num(raw?.receivable),
    expensesByCategory: (raw?.expensesByCategory || []).map((c: any) => ({
      category: c.category || 'autre',
      total: num(c.total),
    })),
  };
}

export async function api(
  path: string,
  init?: RequestInit,
  options?: { staticOnly?: boolean },
): Promise<ApiResponse> {
  if (!options?.staticOnly && (await hasNodeApi())) {
    return fetch(path, init) as unknown as ApiResponse;
  }

  const method = (init?.method || 'GET').toUpperCase();
  const token = bearerToken(init);
  const body = parseBody(init);

  try {
    // --- Session administrateur ---
    if (path === '/api/admin/login' && method === 'POST') {
      // admin_login_v2 renvoie { ok, token } ou { ok:false, reason, message }
      // SANS lever d'exception : c'est indispensable pour que la tentative
      // ratée soit réellement enregistrée (une exception annule l'insertion,
      // et l'anti-force brute ne comptait donc rien).
      let result: any;
      try {
        // v3 : identifiant + rôle (gérant / vendeur).
        result = await callRpc<any>('admin_login_v3', {
          p_username: body.username ?? '',
          p_password: body.password,
        });
      } catch (error: any) {
        const message = String(error?.message || '');
        if (!/admin_login_v3|admin_login_v2|schema cache|does not exist|PGRST202/i.test(message)) {
          throw error;
        }
        try {
          result = await callRpc<any>('admin_login_v2', { p_password: body.password });
        } catch (error2: any) {
          const message2 = String(error2?.message || '');
          if (!/admin_login_v2|schema cache|does not exist|PGRST202/i.test(message2)) throw error2;
          // Base pas encore mise à jour : contrat historique.
          const legacy = await callRpc<any>('admin_login', { p_password: body.password });
          if (legacy && typeof legacy === 'object') {
            if (!legacy.ok) {
              return makeResponse(
                {
                  error: legacy.message || 'Identifiant ou mot de passe incorrect.',
                  reason: legacy.reason,
                  remaining: legacy.remaining,
                },
                legacy.reason === 'locked' ? 429 : 401,
              );
            }
            return ok({
              success: true,
              token: legacy.token,
              role: legacy.role || 'gerant',
              username: legacy.username,
              displayName: legacy.displayName,
            });
          }
          return ok({ success: true, token: legacy, role: 'gerant' });
        }
      }

      if (result && typeof result === 'object' && 'ok' in result) {
        if (!result.ok) {
          const locked = result.reason === 'locked';
          return makeResponse(
            {
              error: result.message || 'Mot de passe incorrect.',
              reason: result.reason,
              remaining: result.remaining,
            },
            locked ? 429 : 401,
          );
        }
        return ok({
          success: true,
          token: result.token,
          role: result.role || 'gerant',
          username: result.username,
          displayName: result.displayName,
        });
      }

      // Réponse inexploitable : la fonction v3 n'existe pas encore vraiment.
      // On retente avec v2 plutôt que de renvoyer un jeton vide.
      try {
        const fallback = await callRpc<any>('admin_login_v2', { p_password: body.password });
        if (fallback && typeof fallback === 'object' && 'ok' in fallback) {
          if (!fallback.ok) {
            return makeResponse(
              {
                error: fallback.message || 'Mot de passe incorrect.',
                reason: fallback.reason,
                remaining: fallback.remaining,
              },
              fallback.reason === 'locked' ? 429 : 401,
            );
          }
          return ok({ success: true, token: fallback.token, role: 'gerant' });
        }
      } catch {
        // On continue vers l'ancien contrat ci-dessous.
      }
      return ok({ success: true, token: result, role: 'gerant' });
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
        supabase.from('products').select('*').order('display_order', { ascending: true }),
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
      // L'ordre est stocké dans `products.display_order`, par boutique.
      await callRpc('admin_reorder_products', {
        p_token: token,
        p_shop: body.shop,
        p_ordered_ids: Array.isArray(body.orderedIds) ? body.orderedIds : [],
      });
      return ok({ success: true });
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

    // --- Gestion de stock (fonctions PostgreSQL admin_stock_*) ---
    if (path === '/api/admin/stock' && method === 'GET') {
      const overview = await callRpc<any>('admin_stock_overview', { p_token: token });
      const items = Array.isArray(overview?.items) ? overview.items : [];
      return ok({
        success: true,
        items: items.map((i: any) => ({
          productId: i.productId,
          shop: i.shop,
          name: i.name,
          price: i.price === null || i.price === undefined ? null : Number(i.price),
          costPrice: i.costPrice === null || i.costPrice === undefined ? null : Number(i.costPrice),
          quantity: Number(i.quantity || 0),
          alertThreshold: Number(i.alertThreshold ?? 3),
          updatedAt: Number(i.updatedAt || 0),
        })),
        movements: Array.isArray(overview?.movements)
          ? overview.movements.map((m: any) => ({
              id: String(m.id),
              productId: m.productId,
              productName: m.productName,
              shop: m.shop,
              type: m.type,
              quantity: Number(m.quantity || 0),
              unitCost: m.unitCost === null || m.unitCost === undefined ? null : Number(m.unitCost),
              reason: m.reason || '',
              note: m.note || '',
              receiptId: m.receiptId || undefined,
              author: m.author || '',
              createdAt: Number(m.createdAt || 0),
            }))
          : [],
        totals: {
          lines: Number(overview?.totals?.lines || 0),
          quantity: Number(overview?.totals?.quantity || 0),
          costValue: Number(overview?.totals?.costValue || 0),
          saleValue: Number(overview?.totals?.saleValue || 0),
          alertCount: Number(overview?.totals?.alertCount || 0),
          outCount: Number(overview?.totals?.outCount || 0),
        },
      });
    }

    if (path === '/api/admin/stock/move' && method === 'POST') {
      const result = await callRpc<any>('admin_stock_move', {
        p_token: token,
        p: {
          productId: body.productId,
          type: body.type,
          quantity: Number(body.quantity || 0),
          unitCost: body.unitCost ?? null,
          costPrice: body.costPrice ?? null,
          alertThreshold: body.alertThreshold ?? null,
          reason: body.reason ?? '',
          note: body.note ?? '',
          author: body.author ?? '',
        },
      });
      return ok({ success: true, ...result });
    }

    // --- Reçus (fonctions admin_*_receipt) ---
    if (path === '/api/admin/receipts' && method === 'GET') {
      const receipts = await callRpc<any[]>('admin_list_receipts', { p_token: token });
      return ok({ success: true, receipts: receipts || [] });
    }

    if (path === '/api/admin/receipts' && method === 'POST') {
      const receipt = await callRpc<any>('admin_save_receipt', {
        p_token: token,
        p: {
          clientName: body.clientName ?? '',
          clientPhone: body.clientPhone ?? '',
          items: Array.isArray(body.items) ? body.items : [],
          discount: Number(body.discount || 0),
          paymentMethod: body.paymentMethod || 'espece',
          amountPaid: Number(body.amountPaid || 0),
          note: body.note ?? '',
          affectStock: body.affectStock !== false,
          author: body.author ?? '',
        },
      });
      return ok({ success: true, receipt });
    }

    if (/^\/api\/admin\/receipts\/[^/]+\/void$/.test(path) && method === 'POST') {
      const id = path.split('/')[4];
      const receipt = await callRpc<any>('admin_void_receipt', { p_token: token, p_id: id });
      return ok({ success: true, receipt });
    }

    // --- Inventaire (quantité absolue) ---
    if (path === '/api/admin/stock/set' && method === 'POST') {
      await callRpc('admin_stock_move', {
        p_token: token,
        p: {
          productId: body.productId,
          type: 'inventaire',
          quantity: Number(body.quantity || 0),
          costPrice: body.costPrice ?? null,
          alertThreshold: body.alertThreshold ?? null,
          reason: body.reason ?? 'Inventaire',
        },
      });
      return ok({ success: true });
    }

    // --- Dépenses ---
    const sp = new URLSearchParams(path.split('?')[1] || '');
    const toIso = (value: string | null) =>
      value && Number.isFinite(Number(value)) ? new Date(Number(value)).toISOString() : null;

    if (path.split('?')[0] === '/api/admin/expenses' && method === 'GET') {
      const expenses = await callRpc<any[]>('admin_list_expenses', {
        p_token: token,
        p_from: toIso(sp.get('from')),
        p_to: toIso(sp.get('to')),
      });
      return ok({ success: true, expenses: expenses || [] });
    }

    if (path === '/api/admin/expenses' && method === 'POST') {
      const expense = await callRpc<any>('admin_save_expense', {
        p_token: token,
        p: {
          id: body.id,
          label: body.label,
          category: body.category || 'autre',
          amount: Number(body.amount || 0),
          spentAt: body.spentAt ? new Date(Number(body.spentAt)).toISOString() : null,
          note: body.note ?? '',
        },
      });
      return ok({ success: true, expense });
    }

    if (/^\/api\/admin\/expenses\/[^/]+$/.test(path) && method === 'DELETE') {
      await callRpc('admin_delete_expense', { p_token: token, p_id: path.split('/')[4] });
      return ok({ success: true });
    }

    // --- Rapports ---
    if (path.split('?')[0] === '/api/admin/reports/stats' && method === 'GET') {
      const stats = await callRpc<any>('admin_sales_stats', {
        p_token: token,
        p_from: toIso(sp.get('from')),
        p_to: toIso(sp.get('to')),
      });
      return ok({ success: true, ...normalizeStats(stats) });
    }

    if (path.split('?')[0] === '/api/admin/reports/finance' && method === 'GET') {
      const finance = await callRpc<any>('admin_finance_overview', {
        p_token: token,
        p_from: toIso(sp.get('from')),
        p_to: toIso(sp.get('to')),
      });
      return ok({ success: true, ...normalizeFinance(finance) });
    }

    if (path === '/api/admin/export' && method === 'GET') {
      const data = await callRpc<any>('admin_export_all', { p_token: token });
      return ok(data ?? {});
    }

    // --- Sauvegarde automatique ---
    if (path === '/api/admin/backups' && method === 'GET') {
      const data = await callRpc<any>('admin_backup_list', { p_token: token });
      return ok(data || { backups: [] });
    }

    if (path === '/api/admin/backups' && method === 'POST') {
      const result = await callRpc<any>('admin_backup_now', { p_token: token });
      return ok({ success: true, ...(result || {}) });
    }

    if (/^\/api\/admin\/backups\/[^/]+$/.test(path) && method === 'GET') {
      const day = path.split('/')[4];
      const payload = await callRpc<any>('admin_backup_get', { p_token: token, p_day: day });
      return ok(payload || {});
    }

    // --- Vérification publique d'un reçu (sans jeton) ---
    if (path === '/api/public/verify-receipt' && method === 'POST') {
      const result = await callRpc<any>('public_verify_receipt', { p_code: body.code ?? '' });
      return ok(result ?? { found: false });
    }

    // --- Comptes administrateurs ---
    if (path === '/api/admin/me' && method === 'GET') {
      const identity = await callRpc<any>('admin_role', { p_token: token });
      return ok(identity ?? { role: 'gerant', username: 'gerant', displayName: 'Le Gérant' });
    }

    if (path === '/api/admin/accounts' && method === 'GET') {
      const accounts = await callRpc<any[]>('admin_list_accounts', { p_token: token });
      return ok({ success: true, accounts: accounts || [] });
    }

    if (path === '/api/admin/accounts' && method === 'POST') {
      const account = await callRpc<any>('admin_save_account', {
        p_token: token,
        p: {
          id: body.id,
          username: body.username,
          displayName: body.displayName ?? '',
          role: body.role ?? 'vendeur',
          active: body.active !== false,
          password: body.password ?? '',
        },
      });
      return ok({ success: true, account });
    }

    if (/^\/api\/admin\/accounts\/[^/]+$/.test(path) && method === 'DELETE') {
      await callRpc('admin_delete_account', { p_token: token, p_id: path.split('/')[4] });
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
    const message = String(err?.message || '');
    // Panne réseau (Wi-Fi coupé, Supabase injoignable) : le navigateur renvoie
    // « Failed to fetch », illisible pour l'administrateur.
    if (/failed to fetch|network ?error|load failed|fetch failed|err_/i.test(message)) {
      return failure(
        'Base de données injoignable. Vérifiez votre connexion internet, puis réessayez.',
        503,
      );
    }
    return failure(message || 'Erreur de la base de données.', 400);
  }
}
