// =============================================================================
// ALFFA NIGER — envoi de fichiers (photos et justificatifs)
//
// Fonction Supabase Edge (Deno, open source). Elle permet au site statique
// (LWS) de téléverser des images sans serveur Node.
//
// Déploiement :
//   supabase functions deploy upload --no-verify-jwt --project-ref blcrwjsrxcumtapymofn
// (ou via le tableau de bord Supabase → Edge Functions)
//
// Sécurité : la fonction vérifie le jeton administrateur en base
// (table admin_sessions) AVANT toute écriture. Sans jeton valide, rien n'est
// stocké. La clé service_role ne quitte jamais Supabase.
//
// POST  { data: "data:image/png;base64,...", filename, visibility }
//       -> { url, mimeType, size }
// GET   ?file=chemin            (en-tête x-admin-token)
//       -> redirige vers une URL signée de 60 secondes (documents privés)
// =============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const PUBLIC_BUCKET = 'public-images';
const PRIVATE_BUCKET = 'private-documents';
const MAX_BYTES = 8 * 1024 * 1024;

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'application/pdf': 'pdf',
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-admin-token, content-type, apikey',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function adminToken(req: Request): string {
  const direct = req.headers.get('x-admin-token');
  if (direct) return direct.trim();
  const auth = req.headers.get('authorization') || '';
  return auth.replace(/^Bearer\s+/i, '').trim();
}

/** Vérifie que le jeton correspond à une session ouverte en base. */
async function isAuthorized(req: Request): Promise<boolean> {
  const token = adminToken(req);
  if (!token || token.length < 16) return false;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data, error } = await supabase
    .from('admin_sessions')
    .select('token, expires_at')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  if (error) {
    console.error('[upload] vérification du jeton impossible :', error.message);
    return false;
  }
  return Boolean(data);
}

function slugify(name: string): string {
  return (
    (name || 'image')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9.]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'image'
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    if (!(await isAuthorized(req))) {
      return json({ error: 'Session administrateur requise ou expirée.' }, 401);
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // --- Lecture d'un document privé : URL signée de courte durée ---
    if (req.method === 'GET') {
      const file = new URL(req.url).searchParams.get('file');
      if (!file) return json({ error: 'Paramètre « file » manquant.' }, 400);

      const { data, error } = await supabase.storage
        .from(PRIVATE_BUCKET)
        .createSignedUrl(file, 60);
      if (error || !data) {
        return json({ error: 'Document introuvable.' }, 404);
      }
      return Response.redirect(data.signedUrl, 302);
    }

    if (req.method !== 'POST') return json({ error: 'Méthode non autorisée.' }, 405);

    // --- Envoi ---
    const payload = await req.json().catch(() => null);
    if (!payload || typeof payload.data !== 'string') {
      return json({ error: 'Fichier manquant.' }, 400);
    }

    const isPrivate = payload.visibility === 'prive';
    const allowed = isPrivate ? DOCUMENT_TYPES : IMAGE_TYPES;

    const match = /^data:([a-z0-9.+/-]+);base64,(.+)$/i.exec(payload.data);
    if (!match) return json({ error: 'Format de fichier invalide.' }, 400);

    const mimeType = match[1].toLowerCase();
    if (!allowed.includes(mimeType)) {
      return json({ error: `Type de fichier non autorisé (${mimeType}).` }, 415);
    }

    let bytes: Uint8Array;
    try {
      const binary = atob(match[2]);
      bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    } catch {
      return json({ error: 'Contenu du fichier illisible.' }, 400);
    }

    if (bytes.length === 0) return json({ error: 'Fichier vide.' }, 400);
    if (bytes.length > MAX_BYTES) {
      return json({ error: 'Fichier trop volumineux (8 Mo maximum).' }, 413);
    }

    const bucket = isPrivate ? PRIVATE_BUCKET : PUBLIC_BUCKET;
    const extension = EXTENSIONS[mimeType] || 'bin';
    const base = slugify(String(payload.filename || '').replace(/\.[^.]+$/, ''));
    const path = `${new Date().toISOString().slice(0, 10)}/${base}-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, bytes, { contentType: mimeType, upsert: false });

    if (uploadError) {
      console.error('[upload] échec :', uploadError.message);
      return json({ error: `Enregistrement impossible : ${uploadError.message}` }, 500);
    }

    if (isPrivate) {
      // Le document reste privé : l'adresse passe par la fonction, qui
      // revérifie le jeton puis délivre une URL signée de 60 secondes.
      const url = `${SUPABASE_URL}/functions/v1/upload?file=${encodeURIComponent(path)}`;
      return json({ url, mimeType, size: bytes.length });
    }

    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);
    return json({ url: publicData.publicUrl, mimeType, size: bytes.length, path });
  } catch (err) {
    console.error('[upload] erreur inattendue :', err);
    return json({ error: 'Erreur inattendue du service de fichiers.' }, 500);
  }
});
