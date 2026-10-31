/**
 * Comptes administrateurs — implémentation pour l'hébergement **Node**.
 *
 * Sur un site statique (LWS), les comptes vivent dans la table
 * `public.admin_accounts` et le mot de passe est vérifié par `admin_login_v3`.
 * Ici, ils sont stockés dans `data/accounts.json` avec un hachage scrypt
 * (module `crypto` natif, aucune dépendance).
 *
 * Rôles :
 *   • `gerant`  : tout (catalogue, paramètres, stock, équipe, finances) ;
 *   • `vendeur` : reçus, ventes, consultation du stock.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { AdminAccount, AdminRole } from '../src/types/reports';

const DATA_DIR = path.resolve('data');
const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json');

interface StoredAccount extends AdminAccount {
  hash: string;
  salt: string;
}

interface AccountFile {
  version: number;
  accounts: StoredAccount[];
}

function readFile(): AccountFile {
  try {
    if (!fs.existsSync(ACCOUNTS_FILE)) return { version: 1, accounts: [] };
    const parsed = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf-8'));
    return { version: 1, accounts: Array.isArray(parsed?.accounts) ? parsed.accounts : [] };
  } catch {
    return { version: 1, accounts: [] };
  }
}

function writeFile(file: AccountFile): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const temp = `${ACCOUNTS_FILE}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(file, null, 2), 'utf-8');
  fs.renameSync(temp, ACCOUNTS_FILE);
}

function hashPassword(password: string, salt = crypto.randomBytes(16).toString('hex')): { hash: string; salt: string } {
  const hash = crypto.scryptSync(String(password), salt, 32).toString('hex');
  return { hash, salt };
}

function checkPassword(account: StoredAccount, password: string): boolean {
  try {
    const candidate = crypto.scryptSync(String(password), account.salt, 32);
    const expected = Buffer.from(account.hash, 'hex');
    return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}

const normalize = (value: string) => String(value || '').trim().toLowerCase();

export function hasAccounts(): boolean {
  return readFile().accounts.length > 0;
}

export function listAccounts(): AdminAccount[] {
  return readFile()
    .accounts.map(({ hash, salt, ...rest }) => rest)
    .sort((a, b) => (a.role === b.role ? a.username.localeCompare(b.username) : a.role === 'gerant' ? -1 : 1));
}

export function findAccount(username: string): StoredAccount | undefined {
  return readFile().accounts.find((a) => normalize(a.username) === normalize(username));
}

export function findById(id: string): StoredAccount | undefined {
  return readFile().accounts.find((a) => a.id === id);
}

/**
 * Vérifie identifiant + mot de passe.
 *
 * Renvoie le compte si l'authentification réussit, `null` sinon. Un compte
 * désactivé est refusé comme un mauvais mot de passe (aucune information
 * ne permet de deviner quels identifiants existent).
 */
export function authenticate(username: string, password: string): StoredAccount | null {
  const account = findAccount(username || 'gerant');
  if (!account || !account.active) return null;
  return checkPassword(account, password) ? account : null;
}

/**
 * Crée le compte gérant au premier démarrage, à partir des identifiants qui
 * fonctionnaient jusqu'ici. Sans cela, la gestion d'équipe serait inutilisable.
 */
export function seedManagerIfEmpty(username: string, password: string, displayName = 'Le Gérant'): StoredAccount | null {
  if (hasAccounts()) return null;
  const file = readFile();
  const { hash, salt } = hashPassword(password);
  const account: StoredAccount = {
    id: `acc-${crypto.randomBytes(6).toString('hex')}`,
    username: normalize(username || 'gerant'),
    displayName,
    role: 'gerant',
    active: true,
    createdAt: new Date().toISOString(),
    hash,
    salt,
  };
  file.accounts.push(account);
  writeFile(file);
  return account;
}

export interface AccountInput {
  id?: string;
  username: string;
  displayName?: string;
  role?: AdminRole;
  active?: boolean;
  password?: string;
  /** Compte à l'origine de la modification (pour les garde-fous). */
  actorId?: string;
}

export function saveAccount(input: AccountInput): AdminAccount {
  const username = normalize(input.username);
  const role: AdminRole = input.role === 'gerant' ? 'gerant' : 'vendeur';
  const active = input.active !== false;
  const displayName = String(input.displayName || '').trim() || username;
  const password = String(input.password || '');

  if (!/^[a-z0-9._-]{3,}$/.test(username)) {
    throw new Error(
      'Identifiant invalide : 3 caractères minimum, lettres sans accent, chiffres, point, tiret ou souligné.'
    );
  }

  const file = readFile();
  const existing = input.id ? file.accounts.find((a) => a.id === input.id) : undefined;

  if (!existing) {
    if (password.length < 8) throw new Error('Le mot de passe doit comporter au moins 8 caractères.');
    if (file.accounts.some((a) => normalize(a.username) === username)) {
      throw new Error('Cet identifiant est déjà utilisé.');
    }
    const { hash, salt } = hashPassword(password);
    const account: StoredAccount = {
      id: `acc-${crypto.randomBytes(6).toString('hex')}`,
      username,
      displayName,
      role,
      active,
      createdAt: new Date().toISOString(),
      hash,
      salt,
    };
    file.accounts.push(account);
    writeFile(file);
    const { hash: _h, salt: _s, ...rest } = account;
    return rest;
  }

  if (input.id === input.actorId && (role !== 'gerant' || !active)) {
    throw new Error('Vous ne pouvez pas retirer vos propres droits de gérant.');
  }
  if (existing.role === 'gerant' && role !== 'gerant') {
    const managers = file.accounts.filter((a) => a.role === 'gerant' && a.active);
    if (managers.length <= 1) throw new Error('Il doit rester au moins un gérant actif.');
  }
  if (file.accounts.some((a) => a.id !== existing.id && normalize(a.username) === username)) {
    throw new Error('Cet identifiant est déjà utilisé.');
  }

  existing.username = username;
  existing.displayName = displayName;
  existing.role = role;
  existing.active = active;
  if (password) {
    if (password.length < 8) throw new Error('Le mot de passe doit comporter au moins 8 caractères.');
    const { hash, salt } = hashPassword(password);
    existing.hash = hash;
    existing.salt = salt;
  }
  writeFile(file);
  const { hash: _h, salt: _s, ...rest } = existing;
  return rest;
}

export function deleteAccount(id: string, actorId?: string): void {
  const file = readFile();
  const account = file.accounts.find((a) => a.id === id);
  if (!account) return;
  if (id === actorId) throw new Error('Vous ne pouvez pas supprimer votre propre compte.');
  if (account.role === 'gerant' && file.accounts.filter((a) => a.role === 'gerant').length <= 1) {
    throw new Error('Il doit rester au moins un gérant.');
  }
  file.accounts = file.accounts.filter((a) => a.id !== id);
  writeFile(file);
}

/** Change le mot de passe d'un compte (utilisé par « Changer mot de passe »). */
export function changePassword(id: string, password: string): void {
  if (String(password).length < 8) {
    throw new Error('Le mot de passe doit comporter au moins 8 caractères.');
  }
  const file = readFile();
  const account = file.accounts.find((a) => a.id === id);
  if (!account) throw new Error('Compte introuvable.');
  const { hash, salt } = hashPassword(password);
  account.hash = hash;
  account.salt = salt;
  writeFile(file);
}
