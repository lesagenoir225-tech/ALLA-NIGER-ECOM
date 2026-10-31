import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { INITIAL_DATABASE } from './src/data/initialData';
import { DatabaseSchema, Product, SiteSettings, TextileBrand, BtpProject } from './src/types';
import { ExperienceReference, ExperienceDocument } from './src/types/experience';
import { EXPERIENCE_SEED, EXPERIENCE_SEED_VERSION } from './src/data/experienceSeed';
import {
  loadDatabaseFromRemote,
  persistDatabaseToRemote,
  loadExperienceFromRemote,
  persistExperienceToRemote,
  remoteConfigSummary,
  remoteWritesEnabled,
  remoteReadsEnabled,
} from './supabase/store';
import {
  applyMovement,
  buildOverview,
  createReceipt,
  forgetProduct,
  listReceipts,
  voidReceipt,
  verifyReceiptCode,
} from './server/stock';
import {
  authenticate as authenticateAccount,
  changePassword as changeAccountPassword,
  deleteAccount as deleteStoredAccount,
  findById as findAccountById,
  hasAccounts,
  listAccounts,
  saveAccount as saveStoredAccount,
  seedManagerIfEmpty,
} from './server/accounts';
import {
  buildExport,
  buildFinanceOverview,
  buildSalesStats,
  listBackups,
  readBackup,
  writeDailyBackup,
  deleteExpense as deleteStoredExpense,
  listExpenses,
  saveExpense as saveStoredExpense,
} from './server/reports';

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

/**
 * Références entrepreneuriales : Supabase fait foi, les fichiers JSON locaux
 * servent de repli hors-ligne. Si la base est encore vide, elle est amorcée
 * avec le contenu local (premier démarrage).
 */
async function loadExperienceReferences(): Promise<ExperienceReference[]> {
  const local = migrateExperienceStore(readExperienceStore()).references;
  const remote = await loadExperienceFromRemote();
  if (remote && remote.length > 0) return remote;
  if (remoteWritesEnabled()) await persistExperienceToRemote(local);
  return local;
}

async function saveExperienceReferences(list: ExperienceReference[]): Promise<void> {
  saveExperienceStore({ version: EXPERIENCE_SEED_VERSION, references: list });
  await persistExperienceToRemote(list);
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

/** Écriture locale best-effort : le disque peut être en lecture seule (Vercel). */
function writeDatabaseFile(db: DatabaseSchema): void {
  try {
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.warn('[ALFFA NIGER] Écriture locale impossible (disque en lecture seule ?) :', (err as Error).message);
  }
}

function readDatabaseFile(): DatabaseSchema {
  if (!fs.existsSync(DB_FILE)) {
    writeDatabaseFile(INITIAL_DATABASE);
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
    writeDatabaseFile(INITIAL_DATABASE);
    return INITIAL_DATABASE;
  }
}


/**
 * Catalogue : Supabase est la source de vérité ; le fichier JSON local n'est
 * plus qu'un cache de secours (il n'est pas persisté sur Vercel).
 */
async function loadDatabase(): Promise<DatabaseSchema> {
  const remote = await loadDatabaseFromRemote();
  if (remote) {
    writeDatabaseFile(remote);
    return remote;
  }
  const local = readDatabaseFile();
  // Base vide : amorçage à partir du contenu local.
  if (remoteWritesEnabled()) await persistDatabaseToRemote(local);
  return local;
}

async function saveDatabase(db: DatabaseSchema): Promise<void> {
  writeDatabaseFile(db);
  await persistDatabaseToRemote(db);
}


// In-memory sessions (jeton -> horodatage de dernière activité)
// Expiration par inactivité : 12 h par défaut, ajustable via SESSION_TTL_MS.
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS) || 12 * 60 * 60 * 1000;
const activeSessions = new Map<string, number>();

/**
 * Secret de signature des jetons de session.
 *
 * Un jeton purement en mémoire ne fonctionne pas sur Vercel : chaque requête
 * peut atterrir sur une instance différente, qui ne connaît pas la session
 * ouverte sur une autre. On signe donc les jetons avec HMAC, ce qui les rend
 * vérifiables par n'importe quelle instance sans stockage partagé.
 */
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  crypto
    .createHash('sha256')
    .update(`alffa-session::${process.env.SUPABASE_SERVICE_ROLE_KEY || 'local'}`)
    .digest('hex');

interface SessionInfo {
  valid: boolean;
  accountId: string;
  role: 'gerant' | 'vendeur';
}

function signSessionToken(
  expiresAt: number,
  accountId = 'acc-gerant',
  role: 'gerant' | 'vendeur' = 'gerant'
): string {
  const payload = `${expiresAt}.${accountId}.${role}`;
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  return `${payload}.${signature}`;
}

function parseSessionToken(token: string): SessionInfo | null {
  if (!token.includes('.')) return null; // jeton d'ancien format, géré plus bas

  const parts = token.split('.');
  // Format historique « expiration.signature » : considéré comme gérant.
  const payload = parts.slice(0, -1).join('.');
  const signature = parts[parts.length - 1];
  const [expiresRaw, accountId, role] = payload.split('.');
  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt)) return { valid: false, accountId: '', role: 'gerant' };

  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { valid: false, accountId: '', role: 'gerant' };
  }

  return {
    valid: expiresAt > Date.now(),
    accountId: accountId || 'acc-gerant',
    role: role === 'vendeur' ? 'vendeur' : 'gerant',
  };
}

function sessionInfo(token: string): SessionInfo | null {
  const parsed = parseSessionToken(token);
  if (parsed) return parsed;
  // Repli : jetons d'ancien format conservés en mémoire.
  const last = activeSessions.get(token);
  if (last === undefined) return null;
  if (Date.now() - last > SESSION_TTL_MS) {
    activeSessions.delete(token);
    return null;
  }
  activeSessions.set(token, Date.now());
  return { valid: true, accountId: 'acc-gerant', role: 'gerant' };
}

function isSessionValid(token: string): boolean {
  return Boolean(sessionInfo(token)?.valid);
}

/** Rôle porté par la requête (gérant par défaut si indéterminé). */
function requestIdentity(req: Request): { accountId: string; role: 'gerant' | 'vendeur' } {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    const info = sessionInfo(header.slice(7).trim());
    if (info?.valid) return { accountId: info.accountId, role: info.role };
  }
  return { accountId: '', role: 'gerant' };
}

/** Réserve une route au gérant. */
function requireManager(req: Request, res: Response, next: NextFunction) {
  if (requestIdentity(req).role !== 'gerant') {
    return res.status(403).json({
      error: 'Action réservée au gérant. Votre compte est un compte vendeur.',
    });
  }
  next();
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

// --- Mot de passe administrateur (mode serveur) -----------------------------
// Aucun mot de passe n'est écrit dans le code : un mot de passe livré avec
// l'application devient un mot de passe public. Trois sources, dans l'ordre :
//   1. la variable d'environnement ADMIN_PASSWORD ;
//   2. l'empreinte enregistrée depuis l'administration (data/database.json) ;
//   3. à défaut, un mot de passe aléatoire créé au démarrage et affiché UNE
//      fois dans la console du serveur.
function generateServerPassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(14);
  let out = '';
  for (const byte of bytes) out += alphabet[byte % alphabet.length];
  return `${out.slice(0, 6)}-${out.slice(6, 10)}-${out.slice(10, 14)}`;
}

const ENV_ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || '').trim();
const GENERATED_ADMIN_PASSWORD = ENV_ADMIN_PASSWORD ? '' : generateServerPassword();
const SERVER_ADMIN_PASSWORD = ENV_ADMIN_PASSWORD || GENERATED_ADMIN_PASSWORD;

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
  app.get('/api/data', async (_req: Request, res: Response) => {
    try {
      const db = await loadDatabase();
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
  app.post('/api/admin/login', async (req: Request, res: Response) => {
    const clientIp = (req.ip || req.socket.remoteAddress || 'inconnu').toString();
    const state = loginAttemptState(clientIp);
    if (state.blocked) {
      return res.status(429).json({
        error:
          'Trop de tentatives de connexion. Veuillez patienter avant de réessayer.',
      });
    }

    // Espaces parasites ignorés : les claviers de téléphone en ajoutent parfois.
    // Espaces et caractères invisibles retirés : les claviers de téléphone et
    // les gestionnaires de mots de passe en ajoutent parfois.
    const password = String(req.body?.password ?? '')
      .replace(/[\u200b-\u200d\u2060\ufeff]/g, '')
      .replace(/[\u00a0\u2007\u202f]/g, ' ')
      .trim();
    const username = String(req.body?.username ?? '').trim().toLowerCase() || 'gerant';

    let account = authenticateAccount(username, password);

    // Premier démarrage : le compte gérant est créé avec les identifiants
    // historiques (empreinte SHA-256 de database.json ou ADMIN_PASSWORD).
    if (!account && !hasAccounts()) {
      const db = await loadDatabase();
      const expectedPassword = db.adminPasswordHash ? undefined : SERVER_ADMIN_PASSWORD;
      const legacyValid = db.adminPasswordHash
        ? crypto.createHash('sha256').update(String(password)).digest('hex') === db.adminPasswordHash
        : password === expectedPassword;

      if (legacyValid && username === 'gerant') {
        const seeded = seedManagerIfEmpty(username, password);
        if (seeded) {
          account = { ...seeded, active: seeded.active };
        }
      }
    }

    if (account) {
      loginAttempts.delete(clientIp);
      const token = signSessionToken(Date.now() + SESSION_TTL_MS, account.id, account.role);
      res.json({
        success: true,
        token,
        role: account.role,
        username: account.username,
        displayName: account.displayName || account.username,
      });
    } else {
      registerLoginFailure(clientIp);
      const after = loginAttemptState(clientIp);
      res.status(401).json({
        error: 'Identifiant ou mot de passe incorrect.',
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
  app.post('/api/admin/change-password', verifyAdmin, requireManager, async (req: Request, res: Response) => {
    const { newPassword } = req.body;
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ error: 'Le nouveau mot de passe doit comporter au moins 6 caractères.' });
    }
    const db = await loadDatabase();
    db.adminPasswordHash = crypto.createHash('sha256').update(newPassword).digest('hex');
    await saveDatabase(db);

    // Le compte correspondant suit : sans cela, l'ancien mot de passe resterait
    // valable via la gestion d'équipe.
    const identity = requestIdentity(req);
    try {
      if (findAccountById(identity.accountId)) {
        changeAccountPassword(identity.accountId, newPassword);
      }
    } catch {}
    res.json({ success: true, message: 'Mot de passe administrateur mis à jour avec succès.' });
  });

  // 6. Update Settings
  app.put('/api/settings', verifyAdmin, requireManager, async (req: Request, res: Response) => {
    const newSettings: Partial<SiteSettings> = req.body;
    const db = await loadDatabase();
    db.settings = {
      ...db.settings,
      ...newSettings,
    };
    await saveDatabase(db);
    res.json({ success: true, settings: db.settings });
  });

  // 7. Add Product
  app.post('/api/products', verifyAdmin, requireManager, async (req: Request, res: Response) => {
    const product: Product = req.body;
    if (!product.id || !product.name || !product.shop) {
      return res.status(400).json({ error: 'ID, nom et boutique sont obligatoires.' });
    }
    const db = await loadDatabase();
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
    await saveDatabase(db);
    res.status(201).json({ success: true, product });
  });

  // 8. Update Product
  app.put('/api/products/:shop/:id', verifyAdmin, requireManager, async (req: Request, res: Response) => {
    const { shop, id } = req.params;
    const updated: Partial<Product> = req.body;
    const db = await loadDatabase();
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
    await saveDatabase(db);
    res.json({ success: true, product: db.products[index] });
  });

  // 9. Delete Product
  app.delete('/api/products/:shop/:id', verifyAdmin, requireManager, async (req: Request, res: Response) => {
    const { shop, id } = req.params;
    const db = await loadDatabase();
    db.products = db.products.filter((p) => !(p.id === id && p.shop === shop));
    if (shop === 'electronique' || shop === 'textile') {
      db.featured[shop] = db.featured[shop].filter((fId) => fId !== id);
    }
    // Le produit disparaît du catalogue : sa ligne de stock aussi.
    forgetProduct(id);
    await saveDatabase(db);
    res.json({ success: true, deletedId: id });
  });

  // 10. Reorder Products
  app.post('/api/products/reorder', verifyAdmin, requireManager, async (req: Request, res: Response) => {
    const { shop, orderedIds } = req.body as { shop: 'electronique' | 'textile'; orderedIds: string[] };
    if (!shop || !Array.isArray(orderedIds)) {
      return res.status(400).json({ error: 'Boutique et liste ordonnée requises.' });
    }
    const db = await loadDatabase();
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
    await saveDatabase(db);
    res.json({ success: true, products: db.products });
  });

  // 10 bis. GESTION DE STOCK
  app.get('/api/admin/stock', verifyAdmin, async (_req: Request, res: Response) => {
    const db = await loadDatabase();
    res.json({ success: true, ...buildOverview(db.products) });
  });

  app.post('/api/admin/stock/move', verifyAdmin, async (req: Request, res: Response) => {
    try {
      const db = await loadDatabase();
      const result = applyMovement(db.products, req.body);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Mouvement de stock refusé.' });
    }
  });

  // 10 ter. REÇUS
  app.get('/api/admin/receipts', verifyAdmin, async (_req: Request, res: Response) => {
    res.json({ success: true, receipts: listReceipts() });
  });

  app.post('/api/admin/receipts', verifyAdmin, async (req: Request, res: Response) => {
    try {
      const db = await loadDatabase();
      const receipt = createReceipt(db.products, req.body);
      res.json({ success: true, receipt });
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Création du reçu impossible.' });
    }
  });

  app.post('/api/admin/receipts/:id/void', verifyAdmin, async (req: Request, res: Response) => {
    try {
      const db = await loadDatabase();
      const receipt = voidReceipt(db.products, req.params.id);
      res.json({ success: true, receipt });
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Annulation impossible.' });
    }
  });

  // 11. Toggle Featured
  // --- Inventaire : la quantité saisie devient la quantité réelle -----------
  app.post('/api/admin/stock/set', verifyAdmin, requireManager, async (req: Request, res: Response) => {
    try {
      const db = await loadDatabase();
      const result = applyMovement(db.products, {
        productId: String(req.body?.productId || ''),
        type: 'inventaire',
        quantity: Number(req.body?.quantity || 0),
        costPrice: req.body?.costPrice ?? null,
        alertThreshold: req.body?.alertThreshold ?? null,
        reason: req.body?.reason || 'Inventaire',
        author: requestIdentity(req).accountId ? '' : '',
      });
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Inventaire refusé.' });
    }
  });

  // --- Dépenses -------------------------------------------------------------
  app.get('/api/admin/expenses', verifyAdmin, async (req: Request, res: Response) => {
    const from = req.query.from ? Number(req.query.from) : undefined;
    const to = req.query.to ? Number(req.query.to) : undefined;
    res.json({ success: true, expenses: listExpenses(from, to) });
  });

  app.post('/api/admin/expenses', verifyAdmin, requireManager, async (req: Request, res: Response) => {
    try {
      const expense = saveStoredExpense({
        id: req.body?.id,
        label: String(req.body?.label || ''),
        category: req.body?.category,
        amount: Number(req.body?.amount || 0),
        spentAt: req.body?.spentAt ? Number(req.body.spentAt) : undefined,
        note: req.body?.note,
        author: req.body?.author,
      });
      res.json({ success: true, expense });
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Enregistrement impossible.' });
    }
  });

  app.delete('/api/admin/expenses/:id', verifyAdmin, requireManager, (req: Request, res: Response) => {
    deleteStoredExpense(req.params.id);
    res.json({ success: true });
  });

  // --- Rapports -------------------------------------------------------------
  app.get('/api/admin/reports/stats', verifyAdmin, (req: Request, res: Response) => {
    const from = req.query.from ? Number(req.query.from) : undefined;
    const to = req.query.to ? Number(req.query.to) : undefined;
    res.json({ success: true, ...buildSalesStats(from, to) });
  });

  app.get('/api/admin/reports/finance', verifyAdmin, requireManager, async (req: Request, res: Response) => {
    const from = req.query.from ? Number(req.query.from) : undefined;
    const to = req.query.to ? Number(req.query.to) : undefined;
    const db = await loadDatabase();
    res.json({ success: true, ...buildFinanceOverview(db.products, from, to) });
  });

  // --- Sauvegarde complète --------------------------------------------------
  app.get('/api/admin/export', verifyAdmin, requireManager, async (_req: Request, res: Response) => {
    const db = await loadDatabase();
    res.json(buildExport({ settings: db.settings, products: db.products, brands: db.brands }));
  });

  // --- Sauvegarde automatique ----------------------------------------------
  app.get('/api/admin/backups', verifyAdmin, requireManager, (_req: Request, res: Response) => {
    res.json({ backups: listBackups(), today: new Date().toISOString().slice(0, 10) });
  });

  app.post('/api/admin/backups', verifyAdmin, requireManager, async (_req: Request, res: Response) => {
    try {
      const db = await loadDatabase();
      const payload = buildExport({
        settings: db.settings,
        products: db.products,
        brands: db.brands,
      });
      // Aucun secret ne doit sortir dans une sauvegarde téléchargeable.
      if (payload.settings && typeof payload.settings === 'object') {
        delete (payload.settings as any).adminPasswordHash;
      }
      const result = writeDailyBackup(payload);
      res.json({ success: true, ...result, stored: listBackups().length });
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Sauvegarde impossible.' });
    }
  });

  app.get('/api/admin/backups/:day', verifyAdmin, requireManager, (req: Request, res: Response) => {
    const payload = readBackup(req.params.day);
    if (!payload) return res.status(404).json({ error: 'Aucune sauvegarde pour ce jour.' });
    res.json(payload);
  });

  // --- Vérification publique d'un reçu (sans authentification) --------------
  app.post('/api/public/verify-receipt', (req: Request, res: Response) => {
    res.json(verifyReceiptCode(String(req.body?.code || '')));
  });

  // --- Comptes administrateurs ---------------------------------------------
  app.get('/api/admin/me', verifyAdmin, (req: Request, res: Response) => {
    const identity = requestIdentity(req);
    const account = findAccountById(identity.accountId);
    res.json({
      role: identity.role,
      username: account?.username || 'gerant',
      displayName: account?.displayName || 'Le Gérant',
    });
  });

  app.get('/api/admin/accounts', verifyAdmin, requireManager, (_req: Request, res: Response) => {
    if (!hasAccounts()) {
      return res.json({
        success: true,
        accounts: [{ id: 'acc-gerant', username: 'gerant', displayName: 'Le Gérant', role: 'gerant', active: true }],
      });
    }
    res.json({ success: true, accounts: listAccounts() });
  });

  app.post('/api/admin/accounts', verifyAdmin, requireManager, (req: Request, res: Response) => {
    try {
      const account = saveStoredAccount({
        id: req.body?.id,
        username: String(req.body?.username || ''),
        displayName: req.body?.displayName,
        role: req.body?.role,
        active: req.body?.active,
        password: req.body?.password,
        actorId: requestIdentity(req).accountId,
      });
      res.json({ success: true, account });
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Enregistrement impossible.' });
    }
  });

  app.delete('/api/admin/accounts/:id', verifyAdmin, requireManager, (req: Request, res: Response) => {
    try {
      deleteStoredAccount(req.params.id, requestIdentity(req).accountId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Suppression impossible.' });
    }
  });

  app.post('/api/featured/toggle', verifyAdmin, requireManager, async (req: Request, res: Response) => {
    const { shop, id } = req.body as { shop: 'electronique' | 'textile'; id: string };
    if (!shop || !id) {
      return res.status(400).json({ error: 'Boutique et identifiant requis.' });
    }
    const db = await loadDatabase();
    const list = db.featured[shop] || [];
    const exists = list.includes(id);
    if (exists) {
      db.featured[shop] = list.filter((item) => item !== id);
    } else {
      db.featured[shop] = [...list, id];
    }
    await saveDatabase(db);
    res.json({ success: true, featured: db.featured[shop] });
  });

  // 12. Reorder Featured
  app.post('/api/featured/reorder', verifyAdmin, requireManager, async (req: Request, res: Response) => {
    const { shop, orderedIds } = req.body as { shop: 'electronique' | 'textile'; orderedIds: string[] };
    if (!shop || !Array.isArray(orderedIds)) {
      return res.status(400).json({ error: 'Paramètres invalides.' });
    }
    const db = await loadDatabase();
    db.featured[shop] = orderedIds;
    await saveDatabase(db);
    res.json({ success: true, featured: db.featured[shop] });
  });

  // 13. Brand Management
  app.put('/api/brands/:id', verifyAdmin, requireManager, async (req: Request, res: Response) => {
    const { id } = req.params;
    const updated: Partial<TextileBrand> = req.body;
    const db = await loadDatabase();
    const index = db.brands.findIndex((b) => b.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Marque introuvable.' });
    }
    db.brands[index] = {
      ...db.brands[index],
      ...updated,
      id,
    };
    await saveDatabase(db);
    res.json({ success: true, brand: db.brands[index] });
  });

  app.post('/api/brands', verifyAdmin, requireManager, requireManager, async (req: Request, res: Response) => {
    const brand: TextileBrand = req.body;
    if (!brand.id || !brand.name) {
      return res.status(400).json({ error: 'ID et nom requis.' });
    }
    const db = await loadDatabase();
    if (db.brands.some((b) => b.id === brand.id)) {
      return res.status(409).json({ error: 'Cette marque existe déjà.' });
    }
    db.brands.push({
      ...brand,
      order: brand.order || db.brands.length + 1,
    });
    await saveDatabase(db);
    res.status(201).json({ success: true, brand });
  });

  app.delete('/api/brands/:id', verifyAdmin, requireManager, async (req: Request, res: Response) => {
    const { id } = req.params;
    const db = await loadDatabase();
    db.brands = db.brands.filter((b) => b.id !== id);
    await saveDatabase(db);
    res.json({ success: true, deletedId: id });
  });

  // --- 13b. BTP & Réalisations Endpoints ---
  // Public: Récupérer les réalisations publiées (uniquement les justificatifs publics autorisés)
  app.get('/api/btp', async (_req: Request, res: Response) => {
    try {
      const db = await loadDatabase();
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
  app.get('/api/admin/btp', verifyAdmin, async (_req: Request, res: Response) => {
    try {
      const db = await loadDatabase();
      res.json({ success: true, projects: db.btpProjects || [] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Ajouter une réalisation
  app.post('/api/btp', verifyAdmin, requireManager, async (req: Request, res: Response) => {
    try {
      const incoming: BtpProject = req.body;
      if (!incoming.title || !incoming.description) {
        return res.status(400).json({ error: 'L’intitulé et la description de la réalisation sont obligatoires.' });
      }
      const db = await loadDatabase();
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
      await saveDatabase(db);
      res.status(201).json({ success: true, project });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Modifier une réalisation
  app.put('/api/btp/:id', verifyAdmin, requireManager, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates: Partial<BtpProject> = req.body;
      const db = await loadDatabase();
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
      await saveDatabase(db);
      res.json({ success: true, project: db.btpProjects[index] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Supprimer une réalisation
  app.delete('/api/btp/:id', verifyAdmin, requireManager, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const db = await loadDatabase();
      if (!db.btpProjects) db.btpProjects = [];
      db.btpProjects = db.btpProjects.filter((p) => p.id !== id);
      await saveDatabase(db);
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
  app.get('/api/experience', async (_req: Request, res: Response) => {
    try {
      const references = (await loadExperienceReferences())
        .filter(isReferencePublic)
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(toPublicReference);
      res.json({ success: true, references });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin : toutes les références, documents privés inclus.
  app.get('/api/admin/experience', verifyAdmin, async (_req: Request, res: Response) => {
    try {
      const references = (await loadExperienceReferences()).sort(
        (a, b) => (a.order || 0) - (b.order || 0)
      );
      res.json({ success: true, references });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/experience', verifyAdmin, requireManager, async (req: Request, res: Response) => {
    try {
      const { reference, error } = buildExperienceReference(req.body);
      if (error || !reference) return res.status(400).json({ error });
      const list = await loadExperienceReferences();
      list.unshift(reference);
      await saveExperienceReferences(list);
      res.status(201).json({ success: true, reference });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/experience/:id', verifyAdmin, requireManager, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const list = await loadExperienceReferences();
      const index = list.findIndex((r) => r.id === id);
      if (index === -1) return res.status(404).json({ error: 'Référence introuvable.' });
      const { reference, error } = buildExperienceReference(req.body, list[index]);
      if (error || !reference) return res.status(400).json({ error });
      list[index] = { ...reference, id };
      await saveExperienceReferences(list);
      res.json({ success: true, reference: list[index] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/experience/:id', verifyAdmin, requireManager, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const list = await loadExperienceReferences();
      const target = list.find((r) => r.id === id);
      if (!target) return res.status(404).json({ error: 'Référence introuvable.' });
      await saveExperienceReferences(list.filter((r) => r.id !== id));
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
  app.get('/api/backup', async (_req: Request, res: Response) => {
    const db = await loadDatabase();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=alffa-niger-backup-${Date.now()}.json`);
    res.send(JSON.stringify(db, null, 2));
  });

  app.post('/api/restore', verifyAdmin, requireManager, async (req: Request, res: Response) => {
    const incoming: DatabaseSchema = req.body;
    if (!incoming || !Array.isArray(incoming.products) || !incoming.settings) {
      return res.status(400).json({ error: 'Structure de sauvegarde invalide.' });
    }
    await saveDatabase(incoming);
    res.json({ success: true, message: 'Données restaurées avec succès.' });
  });

  // 16. Reset to Initial Defaults
  app.post('/api/admin/reset', verifyAdmin, requireManager, async (_req: Request, res: Response) => {
    await saveDatabase(INITIAL_DATABASE);
    res.json({ success: true, message: 'Base réinitialisée aux données de départ.' });
  });

  // 17. Supabase : état de la connexion et synchronisation forcée
  app.get('/api/supabase/status', async (_req: Request, res: Response) => {
    const config = remoteConfigSummary();
    try {
      const remote = await loadDatabaseFromRemote();
      res.json({
        url: config.url,
        connected: config.reads,
        hasTables: remote !== null,
        reads: config.reads,
        writes: config.writes,
        writeMode: config.writeMode,
        counts: remote
          ? { products: remote.products.length, brands: remote.brands.length }
          : null,
        error: config.reads
          ? remote === null
            ? 'Liaison établie mais aucune donnée lisible (tables absentes ou vides).'
            : null
          : 'Supabase non configuré : SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont absents.',
      });
    } catch (err: any) {
      res.json({ url: config.url, connected: false, hasTables: false, error: err.message });
    }
  });

  app.post('/api/supabase/sync', verifyAdmin, requireManager, async (_req: Request, res: Response) => {
    try {
      if (!remoteWritesEnabled()) {
        return res.status(503).json({
          error:
            "Écriture Supabase indisponible : la variable d'environnement SUPABASE_SERVICE_ROLE_KEY est absente.",
        });
      }
      const db = await await loadDatabase();
      const ok = await persistDatabaseToRemote(db);
      const refs = await await loadExperienceReferences();
      const refsOk = await persistExperienceToRemote(refs);
      if (!ok || !refsOk) {
        return res
          .status(502)
          .json({ error: 'La synchronisation a échoué. Consultez les journaux du serveur.' });
      }
      res.json({
        success: true,
        message: `Synchronisation terminée : ${db.products.length} produits, ${db.brands.length} marques, ${refs.length} références.`,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 18. Download LWS ZIP Package
  app.get(['/api/download/lws-zip', '/alffa-niger-lws.zip'], (_req: Request, res: Response) => {
    // L'archive de déploiement vit hors de `public/` pour ne pas être recopiée
    // dans `dist/` à chaque build (16 Mo inutiles, croissance exponentielle).
    const releasePath = path.resolve('release/alffa-niger-lws.zip');
    const legacyPath = path.resolve('public/alffa-niger-lws.zip');
    const zipPath = fs.existsSync(releasePath) ? releasePath : legacyPath;
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

    if (GENERATED_ADMIN_PASSWORD) {
      console.log(
        [
          '',
          '┌────────────────────────────────────────────────────────────────┐',
          '│  MOT DE PASSE ADMINISTRATEUR — généré pour cette exécution      │',
          '└────────────────────────────────────────────────────────────────┘',
          `   ${GENERATED_ADMIN_PASSWORD}`,
          '',
          '   Il n’est écrit ni dans le code, ni dans les fichiers livrés, et',
          '   jamais envoyé au navigateur.',
          '   Pour un mot de passe permanent : définissez ADMIN_PASSWORD, ou',
          '   changez-le depuis l’administration (il sera enregistré chiffré).',
          '',
        ].join('\n'),
      );
    }
  });
}

startServer().catch((err) => {
  console.error('[ALFFA NIGER] Fatal server error:', err);
  process.exit(1);
});
