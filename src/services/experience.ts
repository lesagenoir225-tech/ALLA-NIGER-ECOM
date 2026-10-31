import {
  ExperienceDocument,
  ExperienceReference,
  ExperiencePhoto,
} from '../types/experience';
import { EXPERIENCE_SEED } from '../data/experienceSeed';

const TOKEN_KEY = 'alffa_niger_admin_token';

export function adminToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function authHeaders(): Record<string, string> {
  const token = adminToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    throw new Error((data && data.error) || `Erreur serveur (${res.status}).`);
  }
  return data as T;
}

export type ReferencesSource = 'serveur' | 'catalogue-integre';

export interface PublicReferencesResult {
  references: ExperienceReference[];
  /** Indique d'où proviennent les données (diagnostic / transparence). */
  source: ReferencesSource;
}

/** Références validées + publiées du jeu intégré (repli hors serveur). */
function seedPublicReferences(): ExperienceReference[] {
  return EXPERIENCE_SEED.filter((r) => r.published && r.validation === 'valide')
    .map((r) => ({ ...r, documents: (r.documents || []).filter((d) => d.visibility === 'public') }))
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

/**
 * Références publiques : validées + publiées, documents publics uniquement.
 *
 * Sur un hébergement statique (Vercel, Netlify, Firebase Hosting…), les routes
 * `/api/*` n'existent pas : la requête renvoie alors une page HTML. Dans ce cas
 * l'affichage se rabat sur le catalogue publié intégré au build, plutôt que de
 * présenter une erreur au visiteur.
 */
export async function fetchPublicReferences(): Promise<PublicReferencesResult> {
  try {
    const res = await fetch('/api/experience', { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    // Une réponse HTML (page d'erreur d'hébergement) ne doit pas être interprétée.
    if (!text.trim().startsWith('{')) throw new Error('Réponse non JSON');
    const data = JSON.parse(text);
    if (!Array.isArray(data?.references)) throw new Error('Format inattendu');
    return { references: data.references as ExperienceReference[], source: 'serveur' };
  } catch {
    return { references: seedPublicReferences(), source: 'catalogue-integre' };
  }
}

/** Vue administrateur : toutes les références, tous les documents. */
export async function fetchAdminReferences(): Promise<ExperienceReference[]> {
  let res: Response;
  try {
    res = await fetch('/api/admin/experience', { headers: authHeaders() });
  } catch {
    throw new Error(
      'Serveur d’administration injoignable. La gestion des références nécessite le serveur ALFFA NIGER (et non un hébergement statique).'
    );
  }
  if (res.status === 404) {
    throw new Error(
      'API d’administration absente sur cet hébergement. Déployez le serveur (npm start) pour gérer les références.'
    );
  }
  const data = await parse<{ references: ExperienceReference[] }>(res);
  return Array.isArray(data.references) ? data.references : [];
}

export async function createReference(
  ref: Partial<ExperienceReference>
): Promise<ExperienceReference> {
  const res = await fetch('/api/experience', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(ref),
  });
  const data = await parse<{ reference: ExperienceReference }>(res);
  return data.reference;
}

export async function updateReference(
  id: string,
  ref: Partial<ExperienceReference>
): Promise<ExperienceReference> {
  const res = await fetch(`/api/experience/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(ref),
  });
  const data = await parse<{ reference: ExperienceReference }>(res);
  return data.reference;
}

export async function deleteReference(id: string): Promise<void> {
  const res = await fetch(`/api/experience/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  await parse<{ success: boolean }>(res);
}

/** Photographie authentique — réutilise l'endpoint d'upload existant (images, 8 Mo max). */
export async function uploadExperiencePhoto(file: File): Promise<ExperiencePhoto> {
  if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) {
    throw new Error('Format photo accepté : JPG, PNG ou WebP.');
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error('Photographie trop volumineuse (8 Mo maximum).');
  }
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Lecture du fichier échouée.'));
    reader.readAsDataURL(file);
  });
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ data: base64, filename: file.name }),
  });
  const data = await parse<{ url: string }>(res);
  return {
    id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    url: data.url,
    alt: '',
  };
}

/**
 * Téléchargement d'un justificatif privé : la requête porte le jeton administrateur,
 * la route serveur vérifie l'autorisation avant d'envoyer le fichier.
 */
export async function openExperienceDocument(
  doc: { url: string; name: string; visibility: 'public' | 'prive' }
): Promise<void> {
  if (doc.visibility === 'public') {
    window.open(doc.url, '_blank', 'noopener,noreferrer');
    return;
  }
  const token = adminToken();
  if (!token) throw new Error('Session administrateur requise.');
  const res = await fetch(doc.url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    throw new Error("Document introuvable ou accès refusé.");
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = doc.name || 'document';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

/** Document justificatif — privé par défaut, servi uniquement avec un jeton admin. */
export async function uploadExperienceDocument(
  file: File,
  visibility: 'public' | 'prive'
): Promise<ExperienceDocument> {
  const allowed = /^(application\/pdf|image\/(png|jpe?g|webp))$/i.test(file.type);
  if (!allowed) {
    throw new Error('Formats acceptés : PDF, JPG, PNG ou WebP.');
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error('Document trop volumineux (8 Mo maximum).');
  }
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Lecture du fichier échouée.'));
    reader.readAsDataURL(file);
  });
  const res = await fetch('/api/experience/documents/upload', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ data: base64, filename: file.name, visibility }),
  });
  const data = await parse<{ url: string; mimeType: string; size: number }>(res);
  return {
    id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: file.name,
    url: data.url,
    visibility,
    mimeType: data.mimeType,
    size: data.size,
    addedAt: Date.now(),
  };
}
