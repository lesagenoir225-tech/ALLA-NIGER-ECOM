import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { createServer as createViteServer } from 'vite';
import { INITIAL_DATABASE } from './src/data/initialData';
import { DatabaseSchema, Product, SiteSettings, TextileBrand, BtpProject } from './src/types';
import { ExperienceReference, ExperienceDocument } from './src/types/experience';
import { EXPERIENCE_SEED, EXPERIENCE_SEED_VERSION } from './src/data/experienceSeed';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.resolve('data');
const DB_FILE = path.join(DATA_DIR, 'database.json');
const UPLOADS_DIR = path.resolve('public/images/uploads');

// --- Expérience entrepreneuriale : stockage dédié (aucune migration destructive) ---
const EXPERIENCE_FILE = path.join(DATA_DIR, 'experience-references.json');
// Pièces justificatives privées : hors de `public/`, donc jamais servies statiquement.
const PRIVATE_DOCS_DIR = path.join(DATA_DIR, 'private-documents');

// Ensure storage directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(PRIVATE_DOCS_DIR)) {
  fs.mkdirSync(PRIVATE_DOCS_DIR, { recursive: true });
}

// --- Helpers Expérience entrepreneuriale ---
interface ExperienceStore {
  version: number;
  references: ExperienceReference[];
}

function readExperienceStore(): ExperienceStore {
  if (!fs.existsSync(EXPERIENCE_FILE)) {
    const store: ExperienceStore = {
      version: EXPERIENCE_SEED_VERSION,
      references: EXPERIENCE_SEED,
    };
    saveExperienceStore(store);
    return store;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(EXPERIENCE_FILE, 'utf-8'));
    // Compatibilité : ancien format (tableau simple) traité comme version 1.
    const isLegacyArray = Array.isArray(parsed);
    const list = isLegacyArray ? parsed : parsed.references;
    return {
      version: isLegacyArray ? 1 : Number(parsed.version) || 1,
      references: Array.isArray(list) ? (list as ExperienceReference[]) : [],
    };
  } catch (err) {
    console.error('Lecture des références entrepreneuriales impossible :', err);
    return { version: EXPERIENCE_SEED_VERSION, references: [] };
  }
}

function saveExperienceStore(store: ExperienceStore): void {
  const tempFile = `${EXPERIENCE_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(store, null, 2), 'utf-8');
  fs.renameSync(tempFile, EXPERIENCE_FILE);
}

/**
 * Migration NON destructive du jeu de références.
 * - Aucune référence existante n'est supprimée.
 * - Une fiche modifiée par l'administrateur (updatedAt != createdAt) n'est JAMAIS écrasée.
 * - Les photos, documents et l'état de publication sont toujours conservés.
 */
function migrateExperienceStore(store: ExperienceStore): ExperienceStore {
  if (store.version >= EXPERIENCE_SEED_VERSION) return store;

  const references = [...store.references];
  for (const seed of EXPERIENCE_SEED) {
    const index = references.findIndex((r) => r.id === seed.id);
    if (index === -1) {
      references.push(seed);
      continue;
    }
    const current = references[index];
    const untouchedByAdmin = current.updatedAt === current.createdAt;
    if (!untouchedByAdmin) continue; // respecte le travail de l'administrateur
    references[index] = {
      ...seed,
      order: current.order ?? seed.order,
      validation: current.validation,
      published: current.published,
      publishedAt: current.publishedAt,
      photos: current.photos ?? [],
      documents: current.documents ?? [],
      createdAt: current.createdAt,
      updatedAt: current.updatedAt,
    };
  }

  const migrated: ExperienceStore = { version: EXPERIENCE_SEED_VERSION, references };
  saveExperienceStore(migrated);
  console.log(
    `[ALFFA NIGER] Références entrepreneuriales migrées vers la version ${EXPERIENCE_SEED_VERSION} (${references.length} fiches conservées).`
  );
  return migrated;
}

function loadExperienceReferences(): ExperienceReference[] {
  return migrateExperienceStore(readExperienceStore()).references;
}

function saveExperienceReferences(list: ExperienceReference[]): void {
  saveExperienceStore({ version: EXPERIENCE_SEED_VERSION, references: list });
}

/** Un document n'est public que s'il est explicitement marqué « public ». */
function isDocumentPublic(doc: ExperienceDocument): boolean {
  return doc.visibility === 'public';
}

/** Seule une référence validée ET publiée sort de l'administration. */
function isReferencePublic(ref: ExperienceReference): boolean {
  return ref.published === true && ref.validation === 'valide';
}

function toPublicReference(ref: ExperienceReference): ExperienceReference {
  return {
    ...ref,
    documents: (ref.documents || []).filter(isDocumentPublic),
  };
}

// Database helper functions
function loadDatabase(): DatabaseSchema {
  if (!fs.existsSync(DB_FILE)) {
    saveDatabase(INITIAL_DATABASE);
    return INITIAL_DATABASE;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      ...INITIAL_DATABASE,
      ...parsed,
      settings: { ...INITIAL_DATABASE.settings, ...(parsed.settings || {}) },
      products: parsed.products || INITIAL_DATABASE.products,
      featured: parsed.featured || INITIAL_DATABASE.featured,
      brands: parsed.brands || INITIAL_DATABASE.brands,
      btpProjects: parsed.btpProjects || INITIAL_DATABASE.btpProjects || [],
    };
  } catch (err) {
    console.error('Failed to read database file, restoring defaults:', err);
    saveDatabase(INITIAL_DATABASE);
    return INITIAL_DATABASE;
  }
}

// Supabase Integration
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://dhpeptfgmwvptqilfpho.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_oHZOMRJJbjn4YmaC8hUzWQ_F2GmumCh';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function saveDatabase(db: DatabaseSchema): void {
  const tempFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tempFile, DB_FILE);

  // Background sync to Supabase if tables exist
  syncDbToSupabase(db).catch(() => {});
}

async function syncDbToSupabase(db: DatabaseSchema) {
  try {
    const { error: pErr } = await supabase.from('products').upsert(
      db.products.map((p) => ({
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
      }))
    );
    if (!pErr) {
      await supabase.from('brands').upsert(
        db.brands.map((b) => ({
          id: b.id,
          name: b.name,
          logo: b.logo || '',
          source_logo: b.sourceLogo || '',
          display_order: b.order,
        }))
      );
      await supabase.from('site_settings').upsert({
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
      });
    }
  } catch {}
}

// In-memory sessions (jeton -> horodatage de dernière activité)
// Expiration par inactivité : 12 h par défaut, ajustable via SESSION_TTL_MS.
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS) || 12 * 60 * 60 * 1000;
const activeSessions = new Map<string, number>();

function isSessionValid(token: string): boolean {
  const last = activeSessions.get(token);
  if (!last) return false;
  if (Date.now() - last > SESSION_TTL_MS) {
    activeSessions.delete(token);
    return false;
  }
  // Renouvellement glissant tant que l'administrateur est actif.
  activeSessions.set(token, Date.now());
  return true;
}

// Limitation des tentatives de connexion (anti-force brute, en mémoire)
const LOGIN_MAX_ATTEMPTS = Number(process.env.LOGIN_MAX_ATTEMPTS) || 10;
const LOGIN_WINDOW_MS = Number(process.env.LOGIN_WINDOW_MS) || 15 * 60 * 1000;
const loginAttempts = new Map<string, { count: number; firstAt: number }>();

function loginAttemptState(ip: string) {
  const entry = loginAttempts.get(ip);
  if (!entry) return { blocked: false, remaining: LOGIN_MAX_ATTEMPTS };
  if (Date.now() - entry.firstAt > LOGIN_WINDOW_MS) {
    loginAttempts.delete(ip);
    return { blocked: false, remaining: LOGIN_MAX_ATTEMPTS };
  }
  return {
    blocked: entry.count >= LOGIN_MAX_ATTEMPTS,
    remaining: Math.max(0, LOGIN_MAX_ATTEMPTS - entry.count),
  };
}

function registerLoginFailure(ip: string) {
  const entry = loginAttempts.get(ip);
  if (!entry || Date.now() - entry.firstAt > LOGIN_WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, firstAt: Date.now() });
  } else {
    entry.count += 1;
  }
}

// Admin password verification
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'alffa2025';

function verifyAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Accès non autorisé. Authentification requise.' });
  }
  const token = authHeader.slice(7).trim();
  if (!isSessionValid(token)) {
    return res.status(401).json({ error: 'Session expirée ou invalide. Veuillez vous reconnecter.' });
  }
  next();
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Static uploads directory
  app.use('/images/uploads', express.static(UPLOADS_DIR));

  // --- API ROUTES ---

  // 1. Get full catalog and settings
  app.get('/api/data', (_req: Request, res: Response) => {
    try {
      const db = loadDatabase();
      res.json({
        settings: db.settings,
        products: db.products,
        featured: db.featured,
        brands: db.brands,
        btpProjects: (db.btpProjects || [])
          .filter((p) => p.publicationStatus === 'publie')
          .map((p) => ({
            ...p,
            documents: (p.documents || []).filter((d) => d.isPublic),
          })),
        version: db.version,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 2. Admin Login
  app.post('/api/admin/login', (req: Request, res: Response) => {
    const clientIp = (req.ip || req.socket.remoteAddress || 'inconnu').toString();
    const state = loginAttemptState(clientIp);
    if (state.blocked) {
      return res.status(429).json({
        error:
          'Trop de tentatives de connexion. Veuillez patienter avant de réessayer.',
      });
    }

    const { password } = req.body;
    const db = loadDatabase();
    const expectedPassword = db.adminPasswordHash
      ? undefined // custom hashed password
      : DEFAULT_ADMIN_PASSWORD;

    let valid = false;
    if (db.adminPasswordHash) {
      const hash = crypto.createHash('sha256').update(String(password)).digest('hex');
      valid = hash === db.adminPasswordHash;
    } else {
      valid = password === expectedPassword;
    }

    if (valid) {
      loginAttempts.delete(clientIp);
      const token = crypto.randomBytes(32).toString('hex');
      activeSessions.set(token, Date.now());
      res.json({ success: true, token });
    } else {
      registerLoginFailure(clientIp);
      const after = loginAttemptState(clientIp);
      res.status(401).json({
        error: 'Mot de passe incorrect.',
        attemptsRemaining: after.remaining,
      });
    }
  });

  // 3. Admin Check
  app.get('/api/admin/check', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      if (isSessionValid(token)) {
        return res.json({ authenticated: true });
      }
    }
    res.json({ authenticated: false });
  });

  // 4. Admin Logout
  app.post('/api/admin/logout', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      activeSessions.delete(token);
    }
    res.json({ success: true });
  });

  // 5. Change Admin Password
  app.post('/api/admin/change-password', verifyAdmin, (req: Request, res: Response) => {
    const { newPassword } = req.body;
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ error: 'Le nouveau mot de passe doit comporter au moins 6 caractères.' });
    }
    const db = loadDatabase();
    db.adminPasswordHash = crypto.createHash('sha256').update(newPassword).digest('hex');
    saveDatabase(db);
    res.json({ success: true, message: 'Mot de passe administrateur mis à jour avec succès.' });
  });

  // 6. Update Settings
  app.put('/api/settings', verifyAdmin, (req: Request, res: Response) => {
    const newSettings: Partial<SiteSettings> = req.body;
    const db = loadDatabase();
    db.settings = {
      ...db.settings,
      ...newSettings,
    };
    saveDatabase(db);
    res.json({ success: true, settings: db.settings });
  });

  // 7. Add Product
  app.post('/api/products', verifyAdmin, (req: Request, res: Response) => {
    const product: Product = req.body;
    if (!product.id || !product.name || !product.shop) {
      return res.status(400).json({ error: 'ID, nom et boutique sont obligatoires.' });
    }
    const db = loadDatabase();
    const existingIndex = db.products.findIndex(
      (p) => p.id === product.id && p.shop === product.shop
    );
    if (existingIndex >= 0) {
      return res.status(409).json({ error: 'Un produit avec cet identifiant existe déjà dans cette boutique.' });
    }
    db.products.push({
      ...product,
      createdAt: product.createdAt || Date.now(),
    });
    saveDatabase(db);
    res.status(201).json({ success: true, product });
  });

  // 8. Update Product
  app.put('/api/products/:shop/:id', verifyAdmin, (req: Request, res: Response) => {
    const { shop, id } = req.params;
    const updated: Partial<Product> = req.body;
    const db = loadDatabase();
    const index = db.products.findIndex((p) => p.id === id && p.shop === shop);
    if (index === -1) {
      return res.status(404).json({ error: 'Produit introuvable.' });
    }
    db.products[index] = {
      ...db.products[index],
      ...updated,
      id,
      shop: shop as any,
    };
    saveDatabase(db);
    res.json({ success: true, product: db.products[index] });
  });

  // 9. Delete Product
  app.delete('/api/products/:shop/:id', verifyAdmin, (req: Request, res: Response) => {
    const { shop, id } = req.params;
    const db = loadDatabase();
    db.products = db.products.filter((p) => !(p.id === id && p.shop === shop));
    if (shop === 'electronique' || shop === 'textile') {
      db.featured[shop] = db.featured[shop].filter((fId) => fId !== id);
    }
    saveDatabase(db);
    res.json({ success: true, deletedId: id });
  });

  // 10. Reorder Products
  app.post('/api/products/reorder', verifyAdmin, (req: Request, res: Response) => {
    const { shop, orderedIds } = req.body as { shop: 'electronique' | 'textile'; orderedIds: string[] };
    if (!shop || !Array.isArray(orderedIds)) {
      return res.status(400).json({ error: 'Boutique et liste ordonnée requises.' });
    }
    const db = loadDatabase();
    const shopProducts = db.products.filter((p) => p.shop === shop);
    const otherProducts = db.products.filter((p) => p.shop !== shop);

    const reordered: Product[] = [];
    for (const id of orderedIds) {
      const item = shopProducts.find((p) => p.id === id);
      if (item) reordered.push(item);
    }
    // include any that weren't in orderedIds
    for (const item of shopProducts) {
      if (!reordered.some((p) => p.id === item.id)) {
        reordered.push(item);
      }
    }

    db.products = [...otherProducts, ...reordered];
    saveDatabase(db);
    res.json({ success: true, products: db.products });
  });

  // 11. Toggle Featured
  app.post('/api/featured/toggle', verifyAdmin, (req: Request, res: Response) => {
    const { shop, id } = req.body as { shop: 'electronique' | 'textile'; id: string };
    if (!shop || !id) {
      return res.status(400).json({ error: 'Boutique et identifiant requis.' });
    }
    const db = loadDatabase();
    const list = db.featured[shop] || [];
    const exists = list.includes(id);
    if (exists) {
      db.featured[shop] = list.filter((item) => item !== id);
    } else {
      db.featured[shop] = [...list, id];
    }
    saveDatabase(db);
    res.json({ success: true, featured: db.featured[shop] });
  });

  // 12. Reorder Featured
  app.post('/api/featured/reorder', verifyAdmin, (req: Request, res: Response) => {
    const { shop, orderedIds } = req.body as { shop: 'electronique' | 'textile'; orderedIds: string[] };
    if (!shop || !Array.isArray(orderedIds)) {
      return res.status(400).json({ error: 'Paramètres invalides.' });
    }
    const db = loadDatabase();
    db.featured[shop] = orderedIds;
    saveDatabase(db);
    res.json({ success: true, featured: db.featured[shop] });
  });

  // 13. Brand Management
  app.put('/api/brands/:id', verifyAdmin, (req: Request, res: Response) => {
    const { id } = req.params;
    const updated: Partial<TextileBrand> = req.body;
    const db = loadDatabase();
    const index = db.brands.findIndex((b) => b.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Marque introuvable.' });
    }
    db.brands[index] = {
      ...db.brands[index],
      ...updated,
      id,
    };
    saveDatabase(db);
    res.json({ success: true, brand: db.brands[index] });
  });

  app.post('/api/brands', verifyAdmin, (req: Request, res: Response) => {
    const brand: TextileBrand = req.body;
    if (!brand.id || !brand.name) {
      return res.status(400).json({ error: 'ID et nom requis.' });
    }
    const db = loadDatabase();
    if (db.brands.some((b) => b.id === brand.id)) {
      return res.status(409).json({ error: 'Cette marque existe déjà.' });
    }
    db.brands.push({
      ...brand,
      order: brand.order || db.brands.length + 1,
    });
    saveDatabase(db);
    res.status(201).json({ success: true, brand });
  });

  app.delete('/api/brands/:id', verifyAdmin, (req: Request, res: Response) => {
    const { id } = req.params;
    const db = loadDatabase();
    db.brands = db.brands.filter((b) => b.id !== id);
    saveDatabase(db);
    res.json({ success: true, deletedId: id });
  });

  // --- 13b. BTP & Réalisations Endpoints ---
  // Public: Récupérer les réalisations publiées (uniquement les justificatifs publics autorisés)
  app.get('/api/btp', (_req: Request, res: Response) => {
    try {
      const db = loadDatabase();
      const list = (db.btpProjects || [])
        .filter((p) => p.publicationStatus === 'publie')
        .map((p) => ({
          ...p,
          documents: (p.documents || []).filter((d) => d.isPublic),
        }));
      res.json({ success: true, projects: list });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Récupérer toutes les réalisations (brouillons, en attente, publiées, et tous documents)
  app.get('/api/admin/btp', verifyAdmin, (_req: Request, res: Response) => {
    try {
      const db = loadDatabase();
      res.json({ success: true, projects: db.btpProjects || [] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Ajouter une réalisation
  app.post('/api/btp', verifyAdmin, (req: Request, res: Response) => {
    try {
      const incoming: BtpProject = req.body;
      if (!incoming.title || !incoming.description) {
        return res.status(400).json({ error: 'L’intitulé et la description de la réalisation sont obligatoires.' });
      }
      const db = loadDatabase();
      if (!db.btpProjects) db.btpProjects = [];
      const id = incoming.id || `btp-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
      const project: BtpProject = {
        ...incoming,
        id,
        createdAt: incoming.createdAt || Date.now(),
        updatedAt: Date.now(),
        photos: Array.isArray(incoming.photos) ? incoming.photos : [],
        documents: Array.isArray(incoming.documents) ? incoming.documents : [],
        stage: incoming.stage || 'commande_documentee',
        publicationStatus: incoming.publicationStatus || 'brouillon',
      };
      db.btpProjects.unshift(project);
      saveDatabase(db);
      res.status(201).json({ success: true, project });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Modifier une réalisation
  app.put('/api/btp/:id', verifyAdmin, (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates: Partial<BtpProject> = req.body;
      const db = loadDatabase();
      if (!db.btpProjects) db.btpProjects = [];
      const index = db.btpProjects.findIndex((p) => p.id === id);
      if (index === -1) {
        return res.status(404).json({ error: 'Réalisation BTP introuvable.' });
      }
      db.btpProjects[index] = {
        ...db.btpProjects[index],
        ...updates,
        id, // Empêcher l'altération de l'identifiant
        updatedAt: Date.now(),
      };
      saveDatabase(db);
      res.json({ success: true, project: db.btpProjects[index] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Supprimer une réalisation
  app.delete('/api/btp/:id', verifyAdmin, (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const db = loadDatabase();
      if (!db.btpProjects) db.btpProjects = [];
      db.btpProjects = db.btpProjects.filter((p) => p.id !== id);
      saveDatabase(db);
      res.json({ success: true, deletedId: id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- 13c. Expérience entrepreneuriale (BTP · Matériel informatique · Vivrier) ---
  const EXPERIENCE_DOMAIN_KEYS = ['btp', 'informatique', 'vivrier'];
  const EXPERIENCE_VALIDATIONS = ['brouillon', 'en_attente', 'valide'];
  const EXPERIENCE_EXECUTIONS = ['non_confirme', 'en_cours', 'acheve'];

  function sanitizePhotos(input: any) {
    if (!Array.isArray(input)) return [];
    return input
      .filter((p) => p && typeof p.url === 'string' && p.url.startsWith('/images/uploads/'))
      .map((p, index) => ({
        id: String(p.id || `photo-${Date.now()}-${index}`),
        url: p.url,
        alt: typeof p.alt === 'string' ? p.alt.slice(0, 300) : '',
        caption: typeof p.caption === 'string' ? p.caption.slice(0, 300) : undefined,
        date: typeof p.date === 'string' ? p.date.slice(0, 40) : undefined,
      }));
  }

  const PUBLIC_UPLOAD_PREFIX = '/images/uploads/';
  const PRIVATE_DOC_PREFIX = '/api/experience/documents/';

  function sanitizeDocuments(input: any): ExperienceDocument[] {
    if (!Array.isArray(input)) return [];
    return input
      .filter(
        (d) =>
          d &&
          typeof d.url === 'string' &&
          (d.url.startsWith(PUBLIC_UPLOAD_PREFIX) || d.url.startsWith(PRIVATE_DOC_PREFIX))
      )
      .map((d, index) => {
        // La visibilité est déduite du stockage réel du fichier, jamais du client :
        // un fichier du dossier privé ne peut pas devenir public par simple déclaration.
        const isPublic = d.url.startsWith(PUBLIC_UPLOAD_PREFIX);
        return {
          id: String(d.id || `doc-${Date.now()}-${index}`),
          name: String(d.name || 'Document').slice(0, 200),
          url: d.url,
          visibility: isPublic ? 'public' : 'prive',
          mimeType: typeof d.mimeType === 'string' ? d.mimeType : undefined,
          size: typeof d.size === 'number' ? d.size : undefined,
          reference: typeof d.reference === 'string' ? d.reference.slice(0, 100) : undefined,
          description: typeof d.description === 'string' ? d.description.slice(0, 500) : undefined,
          addedAt: typeof d.addedAt === 'number' ? d.addedAt : Date.now(),
        } as ExperienceDocument;
      });
  }

  /** Valide et normalise une référence entrante. Renvoie un message d'erreur si invalide. */
  function buildExperienceReference(
    input: any,
    existing?: ExperienceReference
  ): { reference?: ExperienceReference; error?: string } {
    if (!input || typeof input !== 'object') return { error: 'Données invalides.' };

    const title = String(input.title ?? existing?.title ?? '').trim();
    const description = String(input.description ?? existing?.description ?? '').trim();
    const domain = String(input.domain ?? existing?.domain ?? '');
    const validation = String(input.validation ?? existing?.validation ?? 'brouillon');
    const execution = String(input.execution ?? existing?.execution ?? 'non_confirme');
    const published = Boolean(input.published ?? existing?.published ?? false);

    if (!title) return { error: 'L’intitulé de la référence est obligatoire.' };
    if (!description) return { error: 'La description des prestations est obligatoire.' };
    if (!EXPERIENCE_DOMAIN_KEYS.includes(domain)) {
      return { error: 'Domaine d’activité invalide.' };
    }
    if (!EXPERIENCE_VALIDATIONS.includes(validation)) {
      return { error: 'Statut de validation invalide.' };
    }
    if (!EXPERIENCE_EXECUTIONS.includes(execution)) {
      return { error: 'État d’exécution invalide.' };
    }
    // Contrôle d'autorisation métier : impossible de publier sans validation.
    if (published && validation !== 'valide') {
      return {
        error: 'Une référence doit être « Validée pour publication » avant d’être publiée.',
      };
    }

    const photos = input.photos !== undefined ? sanitizePhotos(input.photos) : existing?.photos || [];
    if (published && photos.some((photo) => !photo.alt || !photo.alt.trim())) {
      return {
        error: 'Chaque photographie publiée doit comporter un texte alternatif descriptif.',
      };
    }

    const now = Date.now();
    return {
      reference: {
        id: existing?.id || String(input.id || `exp-${now}-${crypto.randomBytes(3).toString('hex')}`),
        title: title.slice(0, 300),
        domain: domain as ExperienceReference['domain'],
        description: description.slice(0, 5000),
        beneficiary:
          typeof (input.beneficiary ?? existing?.beneficiary) === 'string'
            ? String(input.beneficiary ?? existing?.beneficiary).slice(0, 200)
            : undefined,
        procedure:
          typeof (input.procedure ?? existing?.procedure) === 'string'
            ? String(input.procedure ?? existing?.procedure).slice(0, 120)
            : undefined,
        location:
          typeof (input.location ?? existing?.location) === 'string'
            ? String(input.location ?? existing?.location).slice(0, 120)
            : undefined,
        execution: execution as ExperienceReference['execution'],
        validation: validation as ExperienceReference['validation'],
        published,
        photos,
        documents:
          input.documents !== undefined
            ? sanitizeDocuments(input.documents)
            : existing?.documents || [],
        order: typeof (input.order ?? existing?.order) === 'number' ? input.order : existing?.order || now,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
        publishedAt: published ? existing?.publishedAt || now : undefined,
      },
    };
  }

  // Public : références validées et publiées, documents publics uniquement.
  app.get('/api/experience', (_req: Request, res: Response) => {
    try {
      const references = loadExperienceReferences()
        .filter(isReferencePublic)
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(toPublicReference);
      res.json({ success: true, references });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin : toutes les références, documents privés inclus.
  app.get('/api/admin/experience', verifyAdmin, (_req: Request, res: Response) => {
    try {
      const references = loadExperienceReferences().sort(
        (a, b) => (a.order || 0) - (b.order || 0)
      );
      res.json({ success: true, references });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/experience', verifyAdmin, (req: Request, res: Response) => {
    try {
      const { reference, error } = buildExperienceReference(req.body);
      if (error || !reference) return res.status(400).json({ error });
      const list = loadExperienceReferences();
      list.unshift(reference);
      saveExperienceReferences(list);
      res.status(201).json({ success: true, reference });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/experience/:id', verifyAdmin, (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const list = loadExperienceReferences();
      const index = list.findIndex((r) => r.id === id);
      if (index === -1) return res.status(404).json({ error: 'Référence introuvable.' });
      const { reference, error } = buildExperienceReference(req.body, list[index]);
      if (error || !reference) return res.status(400).json({ error });
      list[index] = { ...reference, id };
      saveExperienceReferences(list);
      res.json({ success: true, reference: list[index] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/experience/:id', verifyAdmin, (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const list = loadExperienceReferences();
      const target = list.find((r) => r.id === id);
      if (!target) return res.status(404).json({ error: 'Référence introuvable.' });
      saveExperienceReferences(list.filter((r) => r.id !== id));
      res.json({ success: true, deletedId: id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Téléversement d'un justificatif (PDF/JPG/PNG/WebP) — privé par défaut.
  app.post('/api/experience/documents/upload', verifyAdmin, (req: Request, res: Response) => {
    try {
      const { data, filename, visibility } = req.body as {
        data?: string;
        filename?: string;
        visibility?: string;
      };
      if (!data || typeof data !== 'string') {
        return res.status(400).json({ error: 'Fichier manquant.' });
      }
      const matches = data.match(/^data:(application\/pdf|image\/(?:png|jpeg|jpg|webp));base64,(.+)$/i);
      if (!matches) {
        return res.status(400).json({ error: 'Formats acceptés : PDF, JPG, PNG ou WebP.' });
      }
      const mimeType = matches[1].toLowerCase();
      const buffer = Buffer.from(matches[2], 'base64');
      if (buffer.length > 8 * 1024 * 1024) {
        return res.status(400).json({ error: 'Document trop volumineux (maximum 8 Mo).' });
      }
      const ext =
        mimeType === 'application/pdf'
          ? 'pdf'
          : mimeType.includes('png')
          ? 'png'
          : mimeType.includes('webp')
          ? 'webp'
          : 'jpg';
      const safeBase = filename
        ? path.basename(filename, path.extname(filename)).replace(/[^a-z0-9_-]/gi, '_').toLowerCase()
        : 'document';
      const uniqueName = `${safeBase}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
      const isPublic = visibility === 'public';
      const targetDir = isPublic ? UPLOADS_DIR : PRIVATE_DOCS_DIR;
      fs.writeFileSync(path.join(targetDir, uniqueName), buffer);

      res.json({
        success: true,
        // Un document privé n'est accessible que par cette route authentifiée.
        url: isPublic ? `/images/uploads/${uniqueName}` : `/api/experience/documents/${uniqueName}`,
        mimeType,
        size: buffer.length,
        visibility: isPublic ? 'public' : 'prive',
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Consultation d'un justificatif privé : authentification obligatoire.
  app.get('/api/experience/documents/:filename', verifyAdmin, (req: Request, res: Response) => {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(PRIVATE_DOCS_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Document introuvable.' });
    }
    res.sendFile(filePath);
  });

  // 14. File Upload (Base64 or binary data)
  app.post('/api/upload', verifyAdmin, (req: Request, res: Response) => {
    const { data, filename } = req.body;
    if (!data || typeof data !== 'string') {
      return res.status(400).json({ error: 'Données d’image manquantes.' });
    }

    // Match data URI scheme like data:image/jpeg;base64,...
    const matches = data.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i);
    let buffer: Buffer;
    let ext = 'webp';

    if (matches) {
      ext = matches[1].toLowerCase() === 'jpeg' ? 'jpg' : matches[1].toLowerCase();
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(data, 'base64');
    }

    if (buffer.length > 8 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image trop volumineuse (maximum 8 Mo).' });
    }

    const safeBase = filename
      ? path.basename(filename, path.extname(filename)).replace(/[^a-z0-9_-]/gi, '_').toLowerCase()
      : 'upload';
    const uniqueName = `${safeBase}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
    const targetFile = path.join(UPLOADS_DIR, uniqueName);

    fs.writeFileSync(targetFile, buffer);
    const fileUrl = `/images/uploads/${uniqueName}`;

    res.json({ success: true, url: fileUrl });
  });

  // 15. Backup & Restore
  app.get('/api/backup', (_req: Request, res: Response) => {
    const db = loadDatabase();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=alffa-niger-backup-${Date.now()}.json`);
    res.send(JSON.stringify(db, null, 2));
  });

  app.post('/api/restore', verifyAdmin, (req: Request, res: Response) => {
    const incoming: DatabaseSchema = req.body;
    if (!incoming || !Array.isArray(incoming.products) || !incoming.settings) {
      return res.status(400).json({ error: 'Structure de sauvegarde invalide.' });
    }
    saveDatabase(incoming);
    res.json({ success: true, message: 'Données restaurées avec succès.' });
  });

  // 16. Reset to Initial Defaults
  app.post('/api/admin/reset', verifyAdmin, (_req: Request, res: Response) => {
    saveDatabase(INITIAL_DATABASE);
    res.json({ success: true, message: 'Base réinitialisée aux données de départ.' });
  });

  // 17. Supabase Status and Sync
  app.get('/api/supabase/status', async (_req: Request, res: Response) => {
    try {
      const { data, error } = await supabase.from('products').select('id').limit(1);
      const isConnected = !error || error.code === 'PGRST205';
      const hasTables = !error;
      res.json({
        url: SUPABASE_URL,
        connected: isConnected,
        hasTables,
        error: error ? error.message : null,
      });
    } catch (err: any) {
      res.json({
        url: SUPABASE_URL,
        connected: false,
        hasTables: false,
        error: err.message,
      });
    }
  });

  app.post('/api/supabase/sync', verifyAdmin, async (_req: Request, res: Response) => {
    try {
      const db = loadDatabase();
      await syncDbToSupabase(db);
      res.json({ success: true, message: 'Synchronisation vers Supabase lancée avec succès.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 18. Download LWS ZIP Package
  app.get(['/api/download/lws-zip', '/alffa-niger-lws.zip'], (_req: Request, res: Response) => {
    const zipPath = path.resolve('public/alffa-niger-lws.zip');
    if (fs.existsSync(zipPath)) {
      res.download(zipPath, 'alffa-niger-lws.zip');
    } else {
      res.status(404).json({ error: 'Fichier zip introuvable.' });
    }
  });

  // --- VITE MIDDLEWARE OR STATIC PRODUCTION SERVING ---
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ALFFA NIGER] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[ALFFA NIGER] Fatal server error:', err);
  process.exit(1);
});
