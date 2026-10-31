import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { DatabaseSchema, Product, ShopType, SiteSettings, TextileBrand, BtpProject } from '../types';
import type { AdminIdentity, AdminRole } from '../types/reports';
import {
  INITIAL_DATABASE,
  INITIAL_SETTINGS,
  INITIAL_ELECTRONIQUE_PRODUCTS,
  INITIAL_TEXTILE_PRODUCTS,
  INITIAL_TEXTILE_BRANDS,
  INITIAL_FEATURED,
  INITIAL_BTP_PROJECTS,
} from '../data/initialData';
import { api, ApiResponse } from '../services/backend';
import {
  checkSupabaseHealth,
  fetchProductsFromSupabase,
  fetchBrandsFromSupabase,
  fetchSettingsFromSupabase,
  SupabaseHealth,
} from '../services/supabase';

/**
 * Résultat d'une tentative de connexion.
 *
 * L'ancien contrat (booléen) obligeait l'interface à afficher « mot de passe
 * incorrect » même quand l'échec venait du réseau ou d'un blocage temporaire :
 * l'administrateur croyait s'être trompé alors que le site n'avait simplement
 * pas joint la base.
 */
export type LoginFailureReason = 'password' | 'locked' | 'network';

export type LoginResult =
  | { ok: true; role?: AdminRole; token?: string }
  | { ok: false; reason: LoginFailureReason; message: string; remaining?: number };

interface NotificationState {
  type: 'success' | 'error' | 'info';
  message: string;
}

interface StoreContextType {
  settings: SiteSettings;
  products: Product[];
  featured: {
    electronique: string[];
    textile: string[];
  };
  brands: TextileBrand[];
  btpProjects: BtpProject[];
  isAdmin: boolean;
  isLoading: boolean;
  isSaving: boolean;
  supabaseHealth: SupabaseHealth | null;
  notification: NotificationState | null;
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
  clearNotification: () => void;
  // Actions
  saveProduct: (product: Product) => Promise<boolean>;
  deleteProduct: (shop: ShopType, id: string) => Promise<boolean>;
  reorderProducts: (shop: ShopType, orderedIds: string[]) => Promise<boolean>;
  toggleFeatured: (shop: ShopType, id: string) => Promise<boolean>;
  reorderFeatured: (shop: ShopType, orderedIds: string[]) => Promise<boolean>;
  saveSettings: (newSettings: Partial<SiteSettings>) => Promise<boolean>;
  saveBrand: (brand: TextileBrand) => Promise<boolean>;
  addBrand: (brand: TextileBrand) => Promise<boolean>;
  deleteBrand: (id: string) => Promise<boolean>;
  saveBtpProject: (project: BtpProject) => Promise<boolean>;
  deleteBtpProject: (id: string) => Promise<boolean>;
  uploadImage: (file: File) => Promise<string>;
  login: (password: string, username?: string) => Promise<LoginResult>;
  /** Rôle du compte connecté : le vendeur n'accède pas aux finances ni à l'équipe. */
  role: AdminRole;
  identity: AdminIdentity | null;
  logout: () => void;
  changePassword: (newPassword: string) => Promise<boolean>;
  resetDatabase: () => Promise<boolean>;
  restoreDatabase: (data: DatabaseSchema) => Promise<boolean>;
  refreshData: () => Promise<void>;
  // Selectors
  getProductsByShop: (shop: ShopType) => Product[];
  getFeaturedByShop: (shop: ShopType) => Product[];
  getPublicBtpProjects: () => BtpProject[];
}

const StoreContext = createContext<StoreContextType | null>(null);

const STORAGE_KEY_DATA = 'alffa_niger_data_v3';
const STORAGE_KEY_TOKEN = 'alffa_niger_admin_token';
const STORAGE_KEY_ROLE = 'alffa_niger_admin_role';

/**
 * Retire les espaces parasites et les caractères invisibles d'un mot de passe.
 *
 * Cause fréquente de « le mot de passe ne passe pas » : une espace ajoutée
 * automatiquement après le mot par le clavier du téléphone, ou un caractère
 * invisible collé depuis un message.
 */
export function normalizePassword(value: string): string {
  return String(value ?? '')
    .replace(/[\u200b-\u200d\u2060\ufeff]/g, '')
    .replace(/[\u00a0\u2007\u202f]/g, ' ')
    .trim();
}

export function StoreProvider({ children }: { children: ReactNode }) {
  // Load initial fallback from localStorage or defaults
  const [settings, setSettings] = useState<SiteSettings>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY_DATA);
      if (cached) return JSON.parse(cached).settings || INITIAL_SETTINGS;
    } catch {}
    return INITIAL_SETTINGS;
  });

  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY_DATA);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed.products) && parsed.products.length) return parsed.products;
      }
    } catch {}
    return [...INITIAL_ELECTRONIQUE_PRODUCTS, ...INITIAL_TEXTILE_PRODUCTS];
  });

  const [featured, setFeatured] = useState<{ electronique: string[]; textile: string[] }>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY_DATA);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.featured) return parsed.featured;
      }
    } catch {}
    return INITIAL_FEATURED;
  });

  const [brands, setBrands] = useState<TextileBrand[]>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY_DATA);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed.brands) && parsed.brands.length) return parsed.brands;
      }
    } catch {}
    return INITIAL_TEXTILE_BRANDS;
  });

  const [btpProjects, setBtpProjects] = useState<BtpProject[]>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY_DATA);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed.btpProjects)) return parsed.btpProjects;
      }
    } catch {}
    return INITIAL_BTP_PROJECTS;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY_TOKEN);
  });
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [role, setRole] = useState<AdminRole>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_ROLE);
    return stored === 'vendeur' ? 'vendeur' : 'gerant';
  });
  const [identity, setIdentity] = useState<AdminIdentity | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [supabaseHealth, setSupabaseHealth] = useState<SupabaseHealth | null>(null);
  const [notification, setNotification] = useState<NotificationState | null>(null);

  const showNotification = useCallback(
    (type: 'success' | 'error' | 'info', message: string) => {
      setNotification({ type, message });
      setTimeout(() => {
        setNotification((prev) => (prev?.message === message ? null : prev));
      }, 4000);
    },
    []
  );

  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);

  // Sync to localStorage as offline cache
  const syncLocalCache = useCallback(
    (
      s: SiteSettings,
      p: Product[],
      f: { electronique: string[]; textile: string[] },
      b: TextileBrand[],
      btp?: BtpProject[]
    ) => {
      try {
        localStorage.setItem(
          STORAGE_KEY_DATA,
          JSON.stringify({ settings: s, products: p, featured: f, brands: b, btpProjects: btp || [] })
        );
      } catch {}
    },
    []
  );

  /**
   * Miroir des données déjà chargées, utilisé UNIQUEMENT pour réécrire le
   * cache local. Il évite de mettre `settings`/`brands`/`featured` dans les
   * dépendances de `refreshData` : sans lui, l'effet de démarrage se
   * relançait à chaque mise à jour de ces états (boucle de rechargement
   * infinie, et requêtes répétées vers Supabase quand la base est vide).
   */
  const cacheRef = useRef({ settings, featured, brands, btpProjects });
  useEffect(() => {
    cacheRef.current = { settings, featured, brands, btpProjects };
  }, [settings, featured, brands, btpProjects]);

  // Fetch data from server & Supabase
  const refreshData = useCallback(async () => {
    try {
      // 1. Check Supabase health
      const health = await checkSupabaseHealth();
      setSupabaseHealth(health);

      if (health.hasTables) {
        const [supaProds, supaBrands, supaSettings] = await Promise.all([
          fetchProductsFromSupabase(),
          fetchBrandsFromSupabase(),
          fetchSettingsFromSupabase(),
        ]);

        if (supaProds && supaProds.length > 0) {
          setProducts(supaProds);
          if (supaBrands && supaBrands.length > 0) setBrands(supaBrands);
          if (supaSettings) {
            setSettings((prev) => ({ ...prev, ...supaSettings }));
          }
          const cached = cacheRef.current;
          syncLocalCache(
            supaSettings ? ({ ...cached.settings, ...supaSettings } as SiteSettings) : cached.settings,
            supaProds,
            cached.featured,
            supaBrands || cached.brands,
            cached.btpProjects
          );
          setIsLoading(false);
          return;
        }
      }

      // 2. Fallback to API / local DB
      const res = await api('/api/data');
      if (!res.ok) throw new Error('Erreur de chargement');
      const data = await res.json();
      if (data.settings) setSettings(data.settings);
      if (Array.isArray(data.products)) setProducts(data.products);
      if (data.featured) setFeatured(data.featured);
      if (Array.isArray(data.brands)) setBrands(data.brands);
      if (Array.isArray(data.btpProjects)) setBtpProjects(data.btpProjects);
      syncLocalCache(data.settings, data.products, data.featured, data.brands, data.btpProjects || []);

      // If admin token is present, also fetch full admin BTP list (with drafts & private documents)
      const currentToken = localStorage.getItem(STORAGE_KEY_TOKEN);
      if (currentToken) {
        try {
          const adminBtpRes = await api('/api/admin/btp', {
            headers: { Authorization: `Bearer ${currentToken}` },
          });
          if (adminBtpRes.ok) {
            const adminBtpData = await adminBtpRes.json();
            if (Array.isArray(adminBtpData.projects)) {
              setBtpProjects(adminBtpData.projects);
            }
          }
        } catch {}
      }
    } catch (err) {
      console.warn('Utilisation du cache local:', err);
    } finally {
      setIsLoading(false);
    }
  }, [syncLocalCache]);

  // Check admin session on startup or token change
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    async function checkAuth() {
      if (!token) {
        setIsAdmin(false);
        return;
      }
      const verify = async (): Promise<boolean | null> => {
        try {
          const res = await api('/api/admin/check', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) return null; // panne passagère : on ne conclut rien
          const data = await res.json();
          if (typeof data?.authenticated !== 'boolean') return null;
          return data.authenticated;
        } catch {
          return null;
        }
      };

      let authenticated = await verify();
      if (authenticated === null) {
        // Deuxième chance : une coupure de quelques secondes ne doit pas
        // renvoyer l'administrateur à l'écran de connexion.
        await new Promise((resolve) => setTimeout(resolve, 1200));
        authenticated = await verify();
      }

      if (authenticated === false) {
        localStorage.removeItem(STORAGE_KEY_TOKEN);
        localStorage.removeItem(STORAGE_KEY_ROLE);
        setToken(null);
        setIsAdmin(false);
        setRole('gerant');
        setIdentity(null);
      } else if (authenticated === true) {
        setIsAdmin(true);

        // Rôle et nom affiché : le vendeur ne voit ni finances ni équipe.
        try {
          const res = await api('/api/admin/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const me = await res.json();
            const nextRole: AdminRole = me?.role === 'vendeur' ? 'vendeur' : 'gerant';
            setRole(nextRole);
            localStorage.setItem(STORAGE_KEY_ROLE, nextRole);
            setIdentity({
              role: nextRole,
              username: me?.username || 'gerant',
              displayName: me?.displayName || 'Le Gérant',
            });
          }
        } catch {
          setRole((localStorage.getItem(STORAGE_KEY_ROLE) as AdminRole) || 'gerant');
        }
      }
      // authenticated === null : on conserve l'état courant (session gardée).
    }
    checkAuth();
  }, [token]);

  /**
 * Extrait le message d'une réponse en erreur, quel que soit son format.
 *
 * Sur un hébergement statique (LWS), une route `/api/...` inconnue renvoie la
 * page HTML du site. `res.json()` lèverait alors « Unexpected token '<' » :
 * l'administrateur voyait un message technique incompréhensible au lieu de la
 * raison réelle de l'échec.
 */
async function errorMessage(res: ApiResponse, fallback: string): Promise<string> {
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

// Auth header helper
  const authHeaders = useCallback(() => {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token || ''}`,
    };
  }, [token]);

  // 1. Save Product (Add or Edit)
  const saveProduct = useCallback(
    async (product: Product): Promise<boolean> => {
      setIsSaving(true);
      try {
        const existing = products.find((p) => p.id === product.id && p.shop === product.shop);
        const url = existing
          ? `/api/products/${product.shop}/${product.id}`
          : '/api/products';
        const method = existing ? 'PUT' : 'POST';

        // `api` (et non `fetch`) : sur un hébergement statique, l'adaptateur
        // redirige vers la fonction PostgreSQL `admin_save_product`. Sans lui,
        // l'enregistrement partait vers une route inexistante et échouait.
        const res = await api(url, {
          method,
          headers: authHeaders(),
          body: JSON.stringify(product),
        });

        if (!res.ok) {
          throw new Error(await errorMessage(res, 'Impossible d’enregistrer le produit.'));
        }

        // Optimistically update
        setProducts((prev) => {
          const idx = prev.findIndex((p) => p.id === product.id && p.shop === product.shop);
          let next;
          if (idx >= 0) {
            next = [...prev];
            next[idx] = product;
          } else {
            next = [...prev, product];
          }
          syncLocalCache(settings, next, featured, brands);
          return next;
        });

        // Supabase est mis à jour côté serveur par l'API ci-dessus
        // (écriture avec la clé service_role). Le navigateur n'écrit jamais
        // directement : RLS le lui interdit.

        showNotification('success', `Produit "${product.name}" enregistré avec succès.`);
        return true;
      } catch (error: any) {
        showNotification('error', error.message || 'Impossible d’enregistrer le produit.');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [products, authHeaders, settings, featured, brands, syncLocalCache, showNotification]
  );

  // 2. Delete Product
  const deleteProduct = useCallback(
    async (shop: ShopType, id: string): Promise<boolean> => {
      setIsSaving(true);
      try {
        const res = await api(`/api/products/${shop}/${id}`, {
          method: 'DELETE',
          headers: authHeaders(),
        });
        if (!res.ok) {
          throw new Error(await errorMessage(res, 'Suppression impossible.'));
        }

        setProducts((prev) => {
          const next = prev.filter((p) => !(p.id === id && p.shop === shop));
          syncLocalCache(settings, next, featured, brands);
          return next;
        });

        setFeatured((prev) => {
          const next = {
            ...prev,
            [shop]: prev[shop].filter((fId) => fId !== id),
          };
          syncLocalCache(settings, products, next, brands);
          return next;
        });

        showNotification('success', 'Produit supprimé avec succès.');
        return true;
      } catch (error: any) {
        showNotification('error', error.message || 'Impossible de supprimer le produit.');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [authHeaders, settings, featured, brands, products, syncLocalCache, showNotification]
  );

  // 3. Reorder Products
  const reorderProducts = useCallback(
    async (shop: ShopType, orderedIds: string[]): Promise<boolean> => {
      setIsSaving(true);
      try {
        const res = await api('/api/products/reorder', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ shop, orderedIds }),
        });
        if (!res.ok) {
          throw new Error(await errorMessage(res, 'Réorganisation impossible.'));
        }

        setProducts((prev) => {
          const shopItems = prev.filter((p) => p.shop === shop);
          const otherItems = prev.filter((p) => p.shop !== shop);
          const reordered: Product[] = [];
          for (const id of orderedIds) {
            const found = shopItems.find((p) => p.id === id);
            if (found) reordered.push(found);
          }
          const next = [...otherItems, ...reordered];
          syncLocalCache(settings, next, featured, brands);
          return next;
        });

        showNotification('success', 'Ordre des produits mis à jour.');
        return true;
      } catch (error: any) {
        showNotification('error', error.message || 'Impossible de réordonner les produits.');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [authHeaders, settings, featured, brands, syncLocalCache, showNotification]
  );

  // 4. Toggle Featured
  const toggleFeatured = useCallback(
    async (shop: ShopType, id: string): Promise<boolean> => {
      setIsSaving(true);
      try {
        const res = await api('/api/featured/toggle', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ shop, id }),
        });
        if (!res.ok) {
          throw new Error(await errorMessage(res, 'Mise à jour impossible.'));
        }
        const data = await res.json();

        setFeatured((prev) => {
          const next = {
            ...prev,
            [shop]: data.featured,
          };
          syncLocalCache(settings, products, next, brands);
          return next;
        });

        showNotification('success', 'Sélection "À la une" mise à jour.');
        return true;
      } catch (error: any) {
        showNotification('error', error.message || 'Erreur lors de la modification "À la une".');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [authHeaders, settings, products, brands, syncLocalCache, showNotification]
  );

  // 5. Reorder Featured
  const reorderFeatured = useCallback(
    async (shop: ShopType, orderedIds: string[]): Promise<boolean> => {
      setIsSaving(true);
      try {
        const res = await api('/api/featured/reorder', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ shop, orderedIds }),
        });
        if (!res.ok) {
          throw new Error(await errorMessage(res, 'Réorganisation impossible.'));
        }

        setFeatured((prev) => {
          const next = { ...prev, [shop]: orderedIds };
          syncLocalCache(settings, products, next, brands);
          return next;
        });

        showNotification('success', 'Ordre des produits à la une mis à jour.');
        return true;
      } catch (error: any) {
        showNotification('error', error.message || 'Erreur de réorganisation.');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [authHeaders, settings, products, brands, syncLocalCache, showNotification]
  );

  // 6. Save Settings
  const saveSettings = useCallback(
    async (newSettings: Partial<SiteSettings>): Promise<boolean> => {
      setIsSaving(true);
      try {
        const res = await api('/api/settings', {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify(newSettings),
        });
        if (!res.ok) {
          throw new Error(await errorMessage(res, 'Impossible d’enregistrer les paramètres.'));
        }
        const data = await res.json();
        setSettings(data.settings);
        syncLocalCache(data.settings, products, featured, brands);        showNotification('success', 'Coordonnées et paramètres enregistrés avec succès.');
        return true;
      } catch (error: any) {
        showNotification('error', error.message || 'Impossible d’enregistrer les paramètres.');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [authHeaders, products, featured, brands, syncLocalCache, showNotification]
  );

  // 7. Save Brand
  const saveBrand = useCallback(
    async (brand: TextileBrand): Promise<boolean> => {
      setIsSaving(true);
      try {
        const res = await api(`/api/brands/${brand.id}`, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify(brand),
        });
        if (!res.ok) {
          throw new Error(await errorMessage(res, 'Mise à jour de la marque impossible.'));
        }

        setBrands((prev) => {
          const next = prev.map((b) => (b.id === brand.id ? brand : b));
          syncLocalCache(settings, products, featured, next);
          return next;
        });
        showNotification('success', `Marque "${brand.name}" mise à jour.`);
        return true;
      } catch (error: any) {
        showNotification('error', error.message || 'Erreur lors de la mise à jour de la marque.');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [authHeaders, settings, products, featured, syncLocalCache, showNotification]
  );

  // 8. Add Brand
  const addBrand = useCallback(
    async (brand: TextileBrand): Promise<boolean> => {
      setIsSaving(true);
      try {
        const res = await api('/api/brands', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(brand),
        });
        if (!res.ok) {
          throw new Error(await errorMessage(res, 'Impossible d’ajouter la marque.'));
        }
        setBrands((prev) => {
          const next = [...prev, brand];
          syncLocalCache(settings, products, featured, next);
          return next;
        });
        showNotification('success', `Marque "${brand.name}" ajoutée.`);
        return true;
      } catch (error: any) {
        showNotification('error', error.message || 'Erreur lors de l’ajout de la marque.');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [authHeaders, settings, products, featured, syncLocalCache, showNotification]
  );

  // 9. Delete Brand
  const deleteBrand = useCallback(
    async (id: string): Promise<boolean> => {
      setIsSaving(true);
      try {
        const res = await api(`/api/brands/${id}`, {
          method: 'DELETE',
          headers: authHeaders(),
        });
        if (!res.ok) {
          throw new Error(await errorMessage(res, 'Suppression impossible.'));
        }
        setBrands((prev) => {
          const next = prev.filter((b) => b.id !== id);
          syncLocalCache(settings, products, featured, next);
          return next;
        });
        showNotification('success', 'Marque supprimée.');
        return true;
      } catch (error: any) {
        showNotification('error', error.message || 'Erreur.');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [authHeaders, settings, products, featured, syncLocalCache, showNotification]
  );

  // 9b. BTP Projects Management
  const saveBtpProject = useCallback(
    async (project: BtpProject): Promise<boolean> => {
      setIsSaving(true);
      try {
        const isExisting = btpProjects.some((p) => p.id === project.id);
        const url = isExisting ? `/api/btp/${project.id}` : '/api/btp';
        const method = isExisting ? 'PUT' : 'POST';

        const res = await api(url, {
          method,
          headers: authHeaders(),
          body: JSON.stringify(project),
        });

        if (!res.ok) {
          throw new Error(
            await errorMessage(res, 'Impossible d’enregistrer la réalisation.')
          );
        }

        const data = await res.json();
        const saved: BtpProject = data.project || project;

        setBtpProjects((prev) => {
          const exists = prev.some((p) => p.id === saved.id);
          const next = exists ? prev.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...prev];
          syncLocalCache(settings, products, featured, brands, next);
          return next;
        });

        showNotification('success', `Réalisation BTP "${project.title}" enregistrée.`);
        return true;
      } catch (error: any) {
        showNotification('error', error.message || 'Erreur lors de l’enregistrement.');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [authHeaders, btpProjects, settings, products, featured, brands, syncLocalCache, showNotification]
  );

  const deleteBtpProject = useCallback(
    async (id: string): Promise<boolean> => {
      setIsSaving(true);
      try {
        const res = await api(`/api/btp/${id}`, {
          method: 'DELETE',
          headers: authHeaders(),
        });

        if (!res.ok) {
          throw new Error(await errorMessage(res, 'Suppression impossible.'));
        }

        setBtpProjects((prev) => {
          const next = prev.filter((p) => p.id !== id);
          syncLocalCache(settings, products, featured, brands, next);
          return next;
        });

        showNotification('success', 'Réalisation BTP supprimée.');
        return true;
      } catch (error: any) {
        showNotification('error', error.message || 'Erreur de suppression.');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [authHeaders, settings, products, featured, brands, syncLocalCache, showNotification]
  );

  // 10. Upload image
  const uploadImage = useCallback(
    async (file: File): Promise<string> => {
      if (!file || !/^image\/(png|jpe?g|webp)$/i.test(file.type)) {
        throw new Error('Format accepté : JPG, PNG ou WebP.');
      }
      if (file.size > 8 * 1024 * 1024) {
        throw new Error('Image trop volumineuse (8 Mo maximum).');
      }

      // Convert to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Lecture du fichier échouée'));
        reader.readAsDataURL(file);
      });

      const res = await api('/api/upload', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ data: base64, filename: file.name }),
      });

      if (!res.ok) {
        throw new Error(await errorMessage(res, 'Envoi de l’image impossible.'));
      }

      const data = await res.json();
      return data.url;
    },
    [authHeaders]
  );

  // 11. Login
  /**
   * Nettoie le mot de passe saisi.
   *
   * Les claviers de téléphone ajoutent parfois une espace finale, une espace
   * insécable ou un caractère invisible (copier-coller depuis WhatsApp).
   */
  const login = useCallback(
    async (rawPassword: string, rawUsername?: string): Promise<LoginResult> => {
      const password = normalizePassword(rawPassword);
      const username = String(rawUsername || '').trim().toLowerCase();

      if (!password) {
        return { ok: false, reason: 'password', message: 'Veuillez saisir le mot de passe.' };
      }

      /**
       * Une tentative de connexion.
       *
       * Le motif d'échec est déduit d'abord du CODE HTTP (401 = identifiants
       * refusés, 429 = trop de tentatives, autre = réseau). Auparavant il était
       * déduit du texte du message : une page HTML d'erreur contenant les mots
       * « mot de passe incorrect » faisait afficher cette phrase alors que le
       * mot de passe n'avait jamais été vérifié.
       */
      const attempt = async (options?: { staticOnly?: boolean }): Promise<LoginResult> => {
        const res = await api(
          '/api/admin/login',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password, username }),
          },
          options,
        );

        let raw = '';
        let data: any = null;
        try {
          raw = await res.text();
          data = raw ? JSON.parse(raw) : null;
        } catch {
          data = null;
        }

        // Page HTML renvoyée alors qu'on croyait parler à un serveur Node :
        // le site est en réalité statique. On rejoue la requête par la base.
        const looksLikeHtml = !data && /<!doctype|<html/i.test(raw);
        if (looksLikeHtml && !options?.staticOnly) {
          return attempt({ staticOnly: true });
        }

        if (!res.ok || data?.ok === false) {
          const reason: LoginFailureReason =
            res.status === 429 || data?.reason === 'locked'
              ? 'locked'
              : res.status === 401 || data?.reason === 'password'
                ? 'password'
                : 'network';

          const message =
            data?.error ||
            data?.message ||
            (reason === 'password'
              ? 'Identifiant ou mot de passe incorrect.'
              : reason === 'locked'
                ? 'Trop de tentatives échouées. Patientez quelques minutes.'
                : 'Connexion impossible : la base de données ne répond pas. Vérifiez votre connexion internet.');

          return { ok: false as const, reason, message };
        }

        if (!data?.token) {
          return {
            ok: false as const,
            reason: 'network' as const,
            message: 'Réponse inattendue du serveur. Réessayez dans un instant.',
          };
        }

        return {
          ok: true as const,
          token: data.token as string,
          role: (data.role === 'vendeur' ? 'vendeur' : 'gerant') as AdminRole,
        };
      };

      for (let i = 0; i < 2; i += 1) {
        try {
          const result = await attempt();
          if (result.ok) {
            const nextToken = String(result.token || '');
            localStorage.setItem(STORAGE_KEY_TOKEN, nextToken);
            const nextRole: AdminRole = result.role === 'vendeur' ? 'vendeur' : 'gerant';
            localStorage.setItem(STORAGE_KEY_ROLE, nextRole);
            setToken(nextToken);
            setRole(nextRole);
            setIsAdmin(true);
            showNotification(
              'success',
              nextRole === 'vendeur' ? 'Connexion vendeur réussie.' : 'Connexion gérant réussie.'
            );
            return { ok: true, role: nextRole };
          }

          // Une coupure réseau d'un instant : une seule nouvelle tentative.
          if (!result.ok && result.reason === 'network' && i === 0) {
            await new Promise((resolve) => setTimeout(resolve, 900));
            continue;
          }

          return result;
        } catch (error: any) {
          const message = String(error?.message || '');
          const transient = /failed to fetch|network ?error|load failed|fetch failed|timeout|injoignable/i.test(
            message,
          );
          if (transient && i === 0) {
            await new Promise((resolve) => setTimeout(resolve, 900));
            continue;
          }
          return {
            ok: false,
            reason: 'network',
            message:
              'Connexion impossible : la base de données ne répond pas. Vérifiez votre connexion internet, puis réessayez — le mot de passe n’est pas en cause.',
          };
        }
      }

      return {
        ok: false,
        reason: 'network',
        message: 'Connexion impossible pour le moment. Réessayez dans un instant.',
      };
    },
    [showNotification]
  );

  // 12. Logout
  const logout = useCallback(() => {
    api('/api/admin/logout', {
      method: 'POST',
      headers: authHeaders(),
    }).catch(() => {});
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_ROLE);
    setToken(null);
    setIsAdmin(false);
    setRole('gerant');
    setIdentity(null);
    showNotification('info', 'Déconnexion effectuée.');
  }, [authHeaders, showNotification]);

  // 13. Change password
  const changePassword = useCallback(
    async (newPassword: string): Promise<boolean> => {
      try {
        const res = await api('/api/admin/change-password', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ newPassword }),
        });
        if (!res.ok) {
          throw new Error(await errorMessage(res, 'Changement de mot de passe impossible.'));
        }
        showNotification('success', 'Mot de passe modifié avec succès.');
        return true;
      } catch (error: any) {
        showNotification('error', error.message || 'Erreur lors du changement de mot de passe.');
        return false;
      }
    },
    [authHeaders, showNotification]
  );

  // 14. Reset Database
  const resetDatabase = useCallback(async (): Promise<boolean> => {
    try {
      const res = await api('/api/admin/reset', {
        method: 'POST',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Erreur de réinitialisation');
      await refreshData();
      showNotification('success', 'Catalogue réinitialisé avec les données d’origine.');
      return true;
    } catch (error: any) {
      showNotification('error', error.message || 'Erreur.');
      return false;
    }
  }, [authHeaders, refreshData, showNotification]);

  // 15. Restore Database
  const restoreDatabase = useCallback(
    async (data: DatabaseSchema): Promise<boolean> => {
      try {
        const res = await api('/api/restore', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Erreur de restauration');
        await refreshData();
        showNotification('success', 'Données restaurées avec succès.');
        return true;
      } catch (error: any) {
        showNotification('error', error.message || 'Échec de la restauration.');
        return false;
      }
    },
    [authHeaders, refreshData, showNotification]
  );

  // Selectors
  const getProductsByShop = useCallback(
    (shop: ShopType): Product[] => {
      return products.filter((p) => p.shop === shop && !p.hidden);
    },
    [products]
  );

  const getFeaturedByShop = useCallback(
    (shop: ShopType): Product[] => {
      const ids = featured[shop] || [];
      return ids
        .map((id) => products.find((p) => p.id === id && p.shop === shop && !p.hidden))
        .filter((p): p is Product => Boolean(p));
    },
    [featured, products]
  );

  const getPublicBtpProjects = useCallback((): BtpProject[] => {
    return btpProjects.filter((p) => p.publicationStatus === 'publie');
  }, [btpProjects]);

  const value: StoreContextType = {
    settings,
    products,
    featured,
    brands,
    btpProjects,
    isAdmin,
    isLoading,
    isSaving,
    supabaseHealth,
    notification,
    showNotification,
    clearNotification,
    saveProduct,
    deleteProduct,
    reorderProducts,
    toggleFeatured,
    reorderFeatured,
    saveSettings,
    saveBrand,
    addBrand,
    deleteBrand,
    saveBtpProject,
    deleteBtpProject,
    uploadImage,
    login,
    role,
    identity,
    logout,
    changePassword,
    resetDatabase,
    restoreDatabase,
    refreshData,
    getProductsByShop,
    getFeaturedByShop,
    getPublicBtpProjects,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextType {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return ctx;
}
