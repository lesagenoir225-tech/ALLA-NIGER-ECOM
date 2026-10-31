import React, { useState, useMemo, useEffect } from 'react';
import {
  Briefcase,
  LayoutDashboard,
  Smartphone,
  Sparkles,
  Star,
  Tag,
  Settings,
  Image as ImageIcon,
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  Upload,
  AlertTriangle,
  Lock,
  LogOut,
  Save,
  Download,
  RotateCcw,
  Eye,
  EyeOff,
  Database,
  Copy,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Product, ShopType, TextileBrand, SiteSettings } from '../types';
import { formatPrice, slugify, isValidWhatsApp, normalizeWhatsApp } from '../utils/format';
import { ProductImage } from '../components/ui/ProductImage';
import { ExperienceAdmin } from '../components/admin/ExperienceAdmin';
import { useSeo } from '../utils/seo';
import {
  checkSupabaseHealth,
  testSupabaseConnection,
  SupabaseConnectionDiagnostic,
  syncAllToSupabase,
  SUPABASE_SQL_EDITOR_URL,
  SUPABASE_URL,
} from '../services/supabase';

type AdminTab =
  | 'dashboard'
  | 'electronique'
  | 'textile'
  | 'featured'
  | 'brands'
  | 'settings'
  | 'media'
  | 'experience';

export function Admin() {
  const {
    settings,
    products,
    featured,
    brands,
    isAdmin,
    isLoading,
    isSaving,
    login,
    logout,
    saveProduct,
    deleteProduct,
    reorderProducts,
    toggleFeatured,
    reorderFeatured,
    saveSettings,
    saveBrand,
    addBrand,
    deleteBrand,
    uploadImage,
    changePassword,
    resetDatabase,
    restoreDatabase,
    showNotification,
  } = useStore();

  useSeo({
    title: 'Administration | ALFFA NIGER',
    description: 'Espace sécurisé de gestion du catalogue et des boutiques ALFFA NIGER.',
  });

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);

  // Product modal state
  const [editingProduct, setEditingProduct] = useState<{
    shop: ShopType;
    product: Product | null;
  } | null>(null);

  // Delete confirmation
  const [productToDelete, setProductToDelete] = useState<{ shop: ShopType; id: string; name: string } | null>(null);

  // Settings form state
  const [settingsForm, setSettingsForm] = useState<SiteSettings>(settings);

  // Password change modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState('');

  // Sync settings when fetched
  React.useEffect(() => {
    setSettingsForm(settings);
  }, [settings]);

  // Statistics
  const stats = useMemo(() => {
    const elec = products.filter((p) => p.shop === 'electronique');
    const textile = products.filter((p) => p.shop === 'textile');
    const totalFeatured = (featured.electronique?.length || 0) + (featured.textile?.length || 0);
    const inStock = products.filter((p) => p.availability === 'disponible').length;
    const priceToConfirm = products.filter((p) => p.price === null || p.price === undefined).length;

    return {
      elecCount: elec.length,
      textileCount: textile.length,
      featuredCount: totalFeatured,
      inStockCount: inStock,
      priceToConfirmCount: priceToConfirm,
    };
  }, [products, featured]);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginPassword.trim()) {
      setLoginError('Veuillez renseigner le mot de passe.');
      return;
    }
    setIsSubmittingLogin(true);
    setLoginError('');
    const success = await login(loginPassword);
    setIsSubmittingLogin(false);
    if (!success) {
      setLoginError('Mot de passe incorrect. (Par défaut : alffa2025)');
    }
  };

  // Login view if unauthenticated
  if (!isAdmin) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-20">
        <div className="rounded-3xl border border-[var(--line)] bg-white p-8 shadow-xl">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--night)] text-[var(--cyan)] mb-4">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="font-display text-3xl font-bold uppercase text-[var(--night)]">
            Accès Administration
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Connectez-vous pour mettre à jour le catalogue, les prix, les photos et les coordonnées.
          </p>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--night)] mb-1">
                Mot de passe administrateur
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Entrez le mot de passe..."
                className="w-full min-h-12 rounded-xl border border-[var(--line)] px-3 text-base outline-none focus:border-[var(--cyan)]"
              />
            </div>

            {loginError && (
              <p className="text-xs font-semibold text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmittingLogin}
              className="w-full min-h-12 rounded-xl bg-[var(--night)] font-bold text-white shadow-md hover:bg-[var(--night-2)] transition disabled:opacity-50"
            >
              {isSubmittingLogin ? 'Connexion en cours...' : 'Se connecter'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-[var(--line)] text-center text-xs text-[var(--muted)]">
            Mot de passe d'initialisation : <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">alffa2025</code>
          </div>
        </div>
      </main>
    );
  }

  // Authenticated Dashboard Layout
  return (
    <main className="min-h-screen bg-[var(--mist)] pb-24">
      {/* Top Admin Header */}
      <div className="border-b border-[var(--line)] bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--night)] text-[var(--cyan)]">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold uppercase leading-none text-[var(--night)]">
                Panneau d’administration
              </h1>
              <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Session active · Modifications enregistrées en direct
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPasswordModal(true)}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[var(--line)] px-3 text-xs font-semibold text-[var(--night)] hover:bg-slate-50"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Changer mot de passe</span>
            </button>

            <a
              href="/api/backup"
              download
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[var(--line)] px-3 text-xs font-semibold text-[var(--night)] hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Télécharger sauvegarde</span>
            </a>

            <button
              type="button"
              onClick={logout}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-rose-50 text-rose-700 px-3.5 text-xs font-bold hover:bg-rose-100 transition"
            >
              <LogOut className="h-4 w-4" />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <nav className="no-scrollbar flex space-x-1 overflow-x-auto border-t border-[var(--line)] py-2 text-sm">
            {[
              { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
              { id: 'electronique', label: 'Produits Électronique', icon: Smartphone },
              { id: 'textile', label: 'Produits Textile', icon: Sparkles },
              { id: 'featured', label: 'Produits à la une', icon: Star },
              { id: 'brands', label: 'Marques textiles', icon: Tag },
              { id: 'experience', label: 'Expérience entrepreneuriale', icon: Briefcase },
              { id: 'settings', label: 'Coordonnées & Paramètres', icon: Settings },
              { id: 'media', label: 'Images & Médias', icon: ImageIcon },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as AdminTab)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 font-semibold whitespace-nowrap transition ${
                    isActive
                      ? 'bg-[var(--night)] text-white shadow-sm'
                      : 'text-[var(--muted)] hover:bg-black/5 hover:text-[var(--night)]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-2xl bg-white p-5 border border-[var(--line)] shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                  Produits Électronique
                </span>
                <p className="mt-2 font-display text-4xl font-bold text-[var(--night)]">
                  {stats.elecCount}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('electronique')}
                  className="mt-2 text-xs font-semibold text-[var(--cyan-deep)] hover:underline"
                >
                  Gérer le catalogue →
                </button>
              </div>

              <div className="rounded-2xl bg-white p-5 border border-[var(--line)] shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                  Produits Textile
                </span>
                <p className="mt-2 font-display text-4xl font-bold text-[var(--night)]">
                  {stats.textileCount}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('textile')}
                  className="mt-2 text-xs font-semibold text-[var(--cyan-deep)] hover:underline"
                >
                  Gérer les tissus →
                </button>
              </div>

              <div className="rounded-2xl bg-white p-5 border border-[var(--line)] shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                  Produits à la une
                </span>
                <p className="mt-2 font-display text-4xl font-bold text-amber-600">
                  {stats.featuredCount}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('featured')}
                  className="mt-2 text-xs font-semibold text-[var(--cyan-deep)] hover:underline"
                >
                  Modifier la sélection →
                </button>
              </div>

              <div className="rounded-2xl bg-white p-5 border border-[var(--line)] shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                  En stock / Disponibles
                </span>
                <p className="mt-2 font-display text-4xl font-bold text-emerald-600">
                  {stats.inStockCount}
                </p>
                <span className="text-xs text-[var(--muted)] mt-1 block">Prêts pour commande</span>
              </div>

              <div className="rounded-2xl bg-white p-5 border border-[var(--line)] shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                  Prix à confirmer
                </span>
                <p className="mt-2 font-display text-4xl font-bold text-amber-600">
                  {stats.priceToConfirmCount}
                </p>
                <span className="text-xs text-[var(--muted)] mt-1 block">Affichés sur demande</span>
              </div>
            </div>

            {/* Verification Checklist */}
            <div className="rounded-2xl bg-white p-6 border border-[var(--line)] shadow-sm space-y-4">
              <h2 className="font-display text-xl font-bold uppercase text-[var(--night)]">
                État des configurations requises
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  {isValidWhatsApp(settings.whatsappElectronique) ? (
                    <span className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">✓</span>
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                  )}
                  <div>
                    <strong>WhatsApp Électronique :</strong>{' '}
                    {isValidWhatsApp(settings.whatsappElectronique) ? (
                      <span className="text-emerald-700 font-semibold">+{normalizeWhatsApp(settings.whatsappElectronique)} (Actif)</span>
                    ) : (
                      <span className="text-amber-800">Non configuré — les commandes WhatsApp de smartphones sont désactivées.</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {isValidWhatsApp(settings.whatsappTextile) ? (
                    <span className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">✓</span>
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                  )}
                  <div>
                    <strong>WhatsApp Textile :</strong>{' '}
                    {isValidWhatsApp(settings.whatsappTextile) ? (
                      <span className="text-emerald-700 font-semibold">+{normalizeWhatsApp(settings.whatsappTextile)} (Actif)</span>
                    ) : (
                      <span className="text-amber-800">Non configuré — les commandes WhatsApp de bazins sont désactivées.</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {settings.phone ? (
                    <span className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">✓</span>
                  ) : (
                    <span className="h-6 w-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs">?</span>
                  )}
                  <div>
                    <strong>Téléphone commercial :</strong> {settings.phone || <span className="text-slate-400">Non renseigné</span>}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {settings.address ? (
                    <span className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">✓</span>
                  ) : (
                    <span className="h-6 w-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs">?</span>
                  )}
                  <div>
                    <strong>Adresse physique :</strong> {settings.address || <span className="text-slate-400">Non renseignée</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Supabase Integration Card */}
            <SupabaseIntegrationCard />

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-4">
              <button
                type="button"
                onClick={() => setEditingProduct({ shop: 'electronique', product: null })}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--night)] px-5 text-sm font-bold text-white shadow-sm hover:bg-[var(--night-2)]"
              >
                <Plus className="h-4 w-4 text-[var(--cyan)]" />
                <span>Ajouter un smartphone</span>
              </button>

              <button
                type="button"
                onClick={() => setEditingProduct({ shop: 'textile', product: null })}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--night)] px-5 text-sm font-bold text-white shadow-sm hover:bg-[var(--night-2)]"
              >
                <Plus className="h-4 w-4 text-[var(--cyan)]" />
                <span>Ajouter un tissu / bazin</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-5 text-sm font-semibold text-[var(--night)] hover:bg-slate-50"
              >
                <Settings className="h-4 w-4" />
                <span>Configurer les coordonnées</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2 & 3: PRODUCTS (ELECTRONIQUE OR TEXTILE) */}
        {(activeTab === 'electronique' || activeTab === 'textile') && (
          <ProductsManager
            shop={activeTab}
            products={products.filter((p) => p.shop === activeTab)}
            featuredIds={featured[activeTab] || []}
            brands={brands}
            onAddNew={() => setEditingProduct({ shop: activeTab, product: null })}
            onEdit={(p) => setEditingProduct({ shop: activeTab, product: p })}
            onDelete={(p) => setProductToDelete({ shop: activeTab, id: p.id, name: p.name })}
            onToggleFeatured={(id) => toggleFeatured(activeTab, id)}
            onMove={(id, direction) => {
              const shopItems = products.filter((p) => p.shop === activeTab);
              const idx = shopItems.findIndex((p) => p.id === id);
              if (idx < 0) return;
              const newIdx = idx + direction;
              if (newIdx < 0 || newIdx >= shopItems.length) return;
              const reordered = [...shopItems];
              const [removed] = reordered.splice(idx, 1);
              reordered.splice(newIdx, 0, removed);
              reorderProducts(activeTab, reordered.map((p) => p.id));
            }}
          />
        )}

        {/* TAB 4: FEATURED MANAGER */}
        {activeTab === 'featured' && (
          <FeaturedManager
            featured={featured}
            products={products}
            onReorder={reorderFeatured}
            onRemove={(shop, id) => toggleFeatured(shop, id)}
          />
        )}

        {/* TAB 5: BRANDS MANAGER */}
        {activeTab === 'brands' && (
          <BrandsManager
            brands={brands}
            onSave={saveBrand}
            onAdd={addBrand}
            onDelete={deleteBrand}
            onUploadLogo={uploadImage}
          />
        )}

        {/* TAB 6: SETTINGS FORM */}
        {activeTab === 'experience' && <ExperienceAdmin />}

        {activeTab === 'settings' && (
          <SettingsManager
            settings={settingsForm}
            isSaving={isSaving}
            onChange={(field, val) => setSettingsForm({ ...settingsForm, [field]: val })}
            onSave={async () => {
              await saveSettings(settingsForm);
            }}
            onResetDefaults={async () => {
              if (window.confirm('Voulez-vous vraiment réinitialiser toutes les données aux valeurs initiales ?')) {
                await resetDatabase();
              }
            }}
          />
        )}

        {/* TAB 7: MEDIA & IMAGES */}
        {activeTab === 'media' && (
          <MediaManager
            products={products}
            brands={brands}
            onUploadImage={uploadImage}
          />
        )}
      </div>

      {/* Product Edit / Add Modal */}
      {editingProduct && (
        <ProductModal
          shop={editingProduct.shop}
          product={editingProduct.product}
          brands={brands}
          onClose={() => setEditingProduct(null)}
          onSave={async (saved) => {
            const ok = await saveProduct(saved);
            if (ok) setEditingProduct(null);
          }}
          onUploadImage={uploadImage}
        />
      )}

      {/* Product Delete Confirmation Modal */}
      {productToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="font-display text-2xl font-bold uppercase text-rose-700">
              Confirmer la suppression
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Êtes-vous sûr de vouloir supprimer définitivement le produit{' '}
              <strong>"{productToDelete.name}"</strong> ? Cette action est irréversible.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={async () => {
                  await deleteProduct(productToDelete.shop, productToDelete.id);
                  setProductToDelete(null);
                }}
                className="min-h-11 rounded-xl bg-rose-600 px-5 text-sm font-bold text-white hover:bg-rose-700 shadow-md"
              >
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="font-display text-2xl font-bold uppercase text-[var(--night)]">
              Modifier le mot de passe
            </h3>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Définissez un nouveau mot de passe administrateur sécurisé (minimum 6 caractères).
            </p>
            <input
              type="password"
              value={newPasswordInput}
              onChange={(e) => setNewPasswordInput(e.target.value)}
              placeholder="Nouveau mot de passe..."
              className="mt-4 w-full min-h-12 rounded-xl border border-[var(--line)] px-3 text-base outline-none focus:border-[var(--cyan)]"
            />
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowPasswordModal(false);
                  setNewPasswordInput('');
                }}
                className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (newPasswordInput.length < 6) {
                    showNotification('error', 'Le mot de passe doit comporter au moins 6 caractères.');
                    return;
                  }
                  const ok = await changePassword(newPasswordInput);
                  if (ok) {
                    setShowPasswordModal(false);
                    setNewPasswordInput('');
                  }
                }}
                className="min-h-11 rounded-xl bg-[var(--night)] px-5 text-sm font-bold text-white shadow-md hover:bg-[var(--night-2)]"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// -------------------------------------------------------------
// SUB-COMPONENTS FOR ADMIN SECTIONS
// -------------------------------------------------------------

// 1. PRODUCTS MANAGER (Elec or Textile)
function ProductsManager({
  shop,
  products,
  featuredIds,
  brands,
  onAddNew,
  onEdit,
  onDelete,
  onToggleFeatured,
  onMove,
}: {
  shop: ShopType;
  products: Product[];
  featuredIds: string[];
  brands: TextileBrand[];
  onAddNew: () => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onToggleFeatured: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
}) {
  const [filterQuery, setFilterQuery] = useState('');

  const displayList = useMemo(() => {
    if (!filterQuery.trim()) return products;
    const q = filterQuery.toLowerCase();
    return products.filter((p) =>
      [p.name, p.brand, p.capacity, p.reference].filter(Boolean).join(' ').toLowerCase().includes(q)
    );
  }, [products, filterQuery]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold uppercase text-[var(--night)]">
            Gestion {shop === 'electronique' ? 'Électronique' : 'Textile'} ({products.length} articles)
          </h2>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            L'ordre vertical détermine l'affichage par défaut dans le catalogue public.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="search"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filtrer la liste..."
            className="min-h-11 rounded-xl border border-[var(--line)] bg-white px-3 text-sm outline-none focus:border-[var(--cyan)]"
          />
          <button
            type="button"
            onClick={onAddNew}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--cyan)] px-4 text-sm font-bold text-[var(--night)] hover:bg-[#22c7dc] shadow-sm transition"
          >
            <Plus className="h-4 w-4" />
            <span>Ajouter un produit</span>
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm">
        <div className="divide-y divide-[var(--line)]">
          {displayList.map((product, idx) => {
            const isFeatured = featuredIds.includes(product.id);
            return (
              <div
                key={product.id}
                data-testid="admin-row"
                className="flex flex-wrap items-center gap-4 p-4 hover:bg-slate-50 transition"
              >
                {/* Product thumbnail */}
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-black/10 bg-slate-100 flex items-center justify-center">
                  <ProductImage product={product} className="h-full w-full" />
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-[var(--night)] truncate">
                      {product.name}
                    </h3>
                    {product.capacity && (
                      <span className="text-xs rounded bg-slate-100 px-1.5 py-0.5 text-slate-600 font-semibold">
                        {product.capacity}
                      </span>
                    )}
                    {product.isNew && (
                      <span className="text-[10px] rounded bg-[var(--cyan)] px-1.5 py-0.5 text-[var(--night)] font-bold uppercase">
                        Nouveau
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--muted)] mt-1">
                    <span className="font-semibold text-slate-900">
                      {formatPrice(product.price) || <span className="text-amber-700">Prix à confirmer</span>}
                    </span>
                    <span>·</span>
                    <span className="capitalize">{product.category}</span>
                    <span>·</span>
                    <span>{product.availability}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5">
                  {/* Reorder Up */}
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => onMove(product.id, -1)}
                    className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                    title="Monter dans le catalogue"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>

                  {/* Reorder Down */}
                  <button
                    type="button"
                    disabled={idx === displayList.length - 1}
                    onClick={() => onMove(product.id, 1)}
                    className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                    title="Descendre dans le catalogue"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>

                  {/* Toggle Featured */}
                  <button
                    type="button"
                    onClick={() => onToggleFeatured(product.id)}
                    className={`grid h-9 w-9 place-items-center rounded-lg border transition ${
                      isFeatured
                        ? 'border-amber-300 bg-amber-50 text-amber-500 shadow-sm'
                        : 'border-slate-200 text-slate-400 hover:text-amber-500'
                    }`}
                    title={isFeatured ? 'Retirer de la sélection À la une' : 'Mettre À la une'}
                  >
                    <Star className="h-4 w-4" fill={isFeatured ? 'currentColor' : 'none'} />
                  </button>

                  {/* Edit */}
                  <button
                    type="button"
                    onClick={() => onEdit(product)}
                    className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100"
                    title="Modifier"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => onDelete(product)}
                    className="grid h-9 w-9 place-items-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {displayList.length === 0 && (
            <div className="p-8 text-center text-sm text-[var(--muted)]">
              Aucun produit ne correspond à vos critères de recherche.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 2. FEATURED MANAGER
function FeaturedManager({
  featured,
  products,
  onReorder,
  onRemove,
}: {
  featured: { electronique: string[]; textile: string[] };
  products: Product[];
  onReorder: (shop: ShopType, ids: string[]) => void;
  onRemove: (shop: ShopType, id: string) => void;
}) {
  const [selectedShop, setSelectedShop] = useState<ShopType>('electronique');

  const shopFeatured = useMemo(() => {
    const list = featured[selectedShop] || [];
    return list
      .map((id) => products.find((p) => p.id === id && p.shop === selectedShop))
      .filter((p): p is Product => Boolean(p));
  }, [featured, selectedShop, products]);

  const handleMove = (index: number, direction: -1 | 1) => {
    const ids = featured[selectedShop] || [];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= ids.length) return;
    const reordered = [...ids];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, moved);
    onReorder(selectedShop, reordered);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold uppercase text-[var(--night)]">
            Gestion des produits "À la une"
          </h2>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Sélection mise en avant sur la page d'accueil et en haut de chaque boutique.
          </p>
        </div>

        <div className="inline-flex rounded-xl bg-white p-1 border border-[var(--line)]">
          <button
            type="button"
            onClick={() => setSelectedShop('electronique')}
            className={`min-h-10 rounded-lg px-4 font-semibold text-sm transition ${
              selectedShop === 'electronique' ? 'bg-[var(--night)] text-white' : 'text-slate-600'
            }`}
          >
            Électronique ({featured.electronique?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setSelectedShop('textile')}
            className={`min-h-10 rounded-lg px-4 font-semibold text-sm transition ${
              selectedShop === 'textile' ? 'bg-[var(--night)] text-white' : 'text-slate-600'
            }`}
          >
            Textile ({featured.textile?.length || 0})
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--line)] bg-white shadow-sm overflow-hidden">
        <div className="divide-y divide-[var(--line)]">
          {shopFeatured.map((product, idx) => (
            <div key={product.id} className="flex items-center gap-4 p-4 hover:bg-slate-50">
              <span className="w-6 text-center font-display text-xl font-bold text-[var(--cyan-deep)]">
                {idx + 1}
              </span>
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-200">
                <ProductImage product={product} className="h-full w-full" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-base text-[var(--night)] truncate">
                  {product.name}
                </h4>
                <p className="text-xs text-[var(--muted)]">
                  {formatPrice(product.price) || 'Prix à confirmer'}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => handleMove(idx, -1)}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                  title="Monter"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={idx === shopFeatured.length - 1}
                  onClick={() => handleMove(idx, 1)}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                  title="Descendre"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(selectedShop, product.id)}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                  title="Retirer de la sélection"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          {shopFeatured.length === 0 && (
            <div className="p-8 text-center text-sm text-[var(--muted)]">
              Aucun produit n'est actuellement mis à la une pour cette boutique. Utilisez l'icône étoile (★) dans la liste des produits pour en ajouter.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 3. BRANDS MANAGER
function BrandsManager({
  brands,
  onSave,
  onAdd,
  onDelete,
  onUploadLogo,
}: {
  brands: TextileBrand[];
  onSave: (brand: TextileBrand) => Promise<boolean>;
  onAdd: (brand: TextileBrand) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onUploadLogo: (file: File) => Promise<string>;
}) {
  const [newBrandName, setNewBrandName] = useState('');
  const [uploadingBrandId, setUploadingBrandId] = useState<string | null>(null);

  const handleAddBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandName.trim()) return;
    const id = slugify(newBrandName);
    await onAdd({
      id,
      name: newBrandName.trim(),
      order: brands.length + 1,
      logo: '',
    });
    setNewBrandName('');
  };

  const handleUpload = async (brand: TextileBrand, file: File) => {
    setUploadingBrandId(brand.id);
    try {
      const url = await onUploadLogo(file);
      await onSave({ ...brand, logo: url });
    } finally {
      setUploadingBrandId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold uppercase text-[var(--night)]">
            Marques textiles ({brands.length})
          </h2>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Drews, Gagny Lah, Getzner. Les logos s'affichent dans la section marques.
          </p>
        </div>

        <form onSubmit={handleAddBrand} className="flex gap-2">
          <input
            type="text"
            required
            value={newBrandName}
            onChange={(e) => setNewBrandName(e.target.value)}
            placeholder="Nom de la nouvelle marque..."
            className="min-h-11 rounded-xl border border-[var(--line)] bg-white px-3 text-sm outline-none focus:border-[var(--cyan)]"
          />
          <button
            type="submit"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-[var(--night)] px-4 text-xs font-bold uppercase tracking-wider text-white"
          >
            <Plus className="h-4 w-4" />
            <span>Ajouter</span>
          </button>
        </form>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {brands.map((brand) => (
          <div key={brand.id} className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-serif text-2xl font-medium text-[var(--night)]">
                  {brand.name}
                </h3>
                <span className="text-xs font-mono text-slate-400">ID: {brand.id}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Supprimer la marque "${brand.name}" ?`)) {
                    onDelete(brand.id);
                  }
                }}
                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                title="Supprimer la marque"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* Logo Preview */}
            <div className="h-24 w-full rounded-xl bg-slate-50 border border-slate-200 p-2 flex items-center justify-center overflow-hidden">
              {brand.logo ? (
                <img
                  src={brand.logo}
                  alt={brand.name}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <span className="text-xs text-slate-400 italic">
                  Aucun logo (Affichage textuel sobre)
                </span>
              )}
            </div>

            {/* Upload or clear logo */}
            <div className="flex items-center gap-2">
              <label className="flex-1 cursor-pointer inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                <Upload className="h-3.5 w-3.5" />
                <span>{uploadingBrandId === brand.id ? 'Téléversement...' : 'Changer logo'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(brand, file);
                  }}
                />
              </label>

              {brand.logo && (
                <button
                  type="button"
                  onClick={() => onSave({ ...brand, logo: '' })}
                  className="px-3 min-h-10 rounded-xl border border-slate-200 text-xs font-semibold text-slate-500 hover:text-rose-600"
                >
                  Retirer
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 4. SETTINGS & COORDINATES MANAGER
function SettingsManager({
  settings,
  isSaving,
  onChange,
  onSave,
  onResetDefaults,
}: {
  settings: SiteSettings;
  isSaving: boolean;
  onChange: (field: keyof SiteSettings, val: string) => void;
  onSave: () => Promise<void>;
  onResetDefaults: () => Promise<void>;
}) {
  const [elecWaError, setElecWaError] = useState('');
  const [textileWaError, setTextileWaError] = useState('');

  const validate = () => {
    let valid = true;
    if (settings.whatsappElectronique && !isValidWhatsApp(settings.whatsappElectronique)) {
      setElecWaError('Numéro invalide. Renseignez l’indicatif sans + (ex. 227XXXXXXXX pour le Niger).');
      valid = false;
    } else {
      setElecWaError('');
    }

    if (settings.whatsappTextile && !isValidWhatsApp(settings.whatsappTextile)) {
      setTextileWaError('Numéro invalide. Renseignez l’indicatif sans + (ex. 227XXXXXXXX pour le Niger).');
      valid = false;
    } else {
      setTextileWaError('');
    }

    return valid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSave();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* 1. Numéros WhatsApp */}
      <div className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm space-y-4">
        <h3 className="font-display text-xl font-bold uppercase text-[var(--night)]">
          1. Canaux WhatsApp de Commande
        </h3>
        <p className="text-xs text-[var(--muted)]">
          Chaque boutique possède son propre numéro. Format international obligatoire sans '+' ni '00' (ex: 22790123456 pour le Niger).
        </p>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--night)] mb-1">
              WhatsApp Électronique (Smartphones)
            </label>
            <input
              type="tel"
              value={settings.whatsappElectronique || ''}
              onChange={(e) => onChange('whatsappElectronique', e.target.value)}
              placeholder="ex. 22790123456"
              className="w-full min-h-12 rounded-xl border border-[var(--line)] px-3 text-base outline-none focus:border-[var(--cyan)]"
            />
            {elecWaError && <p className="text-xs text-rose-600 mt-1">{elecWaError}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--night)] mb-1">
              WhatsApp Textile (Bazins & Tissus)
            </label>
            <input
              type="tel"
              value={settings.whatsappTextile || ''}
              onChange={(e) => onChange('whatsappTextile', e.target.value)}
              placeholder="ex. 22790123456"
              className="w-full min-h-12 rounded-xl border border-[var(--line)] px-3 text-base outline-none focus:border-[var(--cyan)]"
            />
            {textileWaError && <p className="text-xs text-rose-600 mt-1">{textileWaError}</p>}
          </div>
        </div>
      </div>

      {/* 2. Coordonnées de contact */}
      <div className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm space-y-4">
        <h3 className="font-display text-xl font-bold uppercase text-[var(--night)]">
          2. Coordonnées commerciales
        </h3>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--night)] mb-1">
              Téléphone commercial
            </label>
            <input
              type="tel"
              value={settings.phone || ''}
              onChange={(e) => onChange('phone', e.target.value)}
              placeholder="+227 90 00 00 00"
              className="w-full min-h-12 rounded-xl border border-[var(--line)] px-3 text-base outline-none focus:border-[var(--cyan)]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--night)] mb-1">
              Email de contact
            </label>
            <input
              type="email"
              value={settings.email || ''}
              onChange={(e) => onChange('email', e.target.value)}
              placeholder="contact@alffaniger.com"
              className="w-full min-h-12 rounded-xl border border-[var(--line)] px-3 text-base outline-none focus:border-[var(--cyan)]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--night)] mb-1">
              Adresse physique / Boutique
            </label>
            <input
              type="text"
              value={settings.address || ''}
              onChange={(e) => onChange('address', e.target.value)}
              placeholder="Niamey, Niger..."
              className="w-full min-h-12 rounded-xl border border-[var(--line)] px-3 text-base outline-none focus:border-[var(--cyan)]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--night)] mb-1">
              Horaires d'ouverture
            </label>
            <input
              type="text"
              value={settings.hours || ''}
              onChange={(e) => onChange('hours', e.target.value)}
              placeholder="Du lundi au samedi : 8h30 - 19h00"
              className="w-full min-h-12 rounded-xl border border-[var(--line)] px-3 text-base outline-none focus:border-[var(--cyan)]"
            />
          </div>
        </div>
      </div>

      {/* 3. Réseaux sociaux & Domaine */}
      <div className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm space-y-4">
        <h3 className="font-display text-xl font-bold uppercase text-[var(--night)]">
          3. Réseaux sociaux & Domaine
        </h3>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--night)] mb-1">
              URL Facebook
            </label>
            <input
              type="url"
              value={settings.facebook || ''}
              onChange={(e) => onChange('facebook', e.target.value)}
              placeholder="https://facebook.com/..."
              className="w-full min-h-12 rounded-xl border border-[var(--line)] px-3 text-base outline-none focus:border-[var(--cyan)]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--night)] mb-1">
              URL Instagram
            </label>
            <input
              type="url"
              value={settings.instagram || ''}
              onChange={(e) => onChange('instagram', e.target.value)}
              placeholder="https://instagram.com/..."
              className="w-full min-h-12 rounded-xl border border-[var(--line)] px-3 text-base outline-none focus:border-[var(--cyan)]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--night)] mb-1">
              URL TikTok
            </label>
            <input
              type="url"
              value={settings.tiktok || ''}
              onChange={(e) => onChange('tiktok', e.target.value)}
              placeholder="https://tiktok.com/@..."
              className="w-full min-h-12 rounded-xl border border-[var(--line)] px-3 text-base outline-none focus:border-[var(--cyan)]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--night)] mb-1">
              Domaine web canonique
            </label>
            <input
              type="url"
              value={settings.siteUrl || 'https://alffaniger.com'}
              onChange={(e) => onChange('siteUrl', e.target.value)}
              placeholder="https://alffaniger.com"
              className="w-full min-h-12 rounded-xl border border-[var(--line)] px-3 text-base outline-none focus:border-[var(--cyan)]"
            />
          </div>
        </div>
      </div>

      {/* 4. Localisations Google Maps des Boutiques */}
      <div className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm space-y-4">
        <h3 className="font-display text-xl font-bold uppercase text-[var(--night)]">
          4. Localisations Google Maps des Boutiques
        </h3>
        <p className="text-xs text-[var(--muted)]">
          Collez les liens de partage Google Maps officiels (format https://maps.app.goo.gl/... ou https://google.com/maps/...).
        </p>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--night)] mb-1">
              Lien Google Maps — Boutique Électronique
            </label>
            <input
              type="url"
              value={settings.mapsElectronique || ''}
              onChange={(e) => onChange('mapsElectronique', e.target.value)}
              placeholder="https://maps.app.goo.gl/yr1v33pcPDGsSSpe8?g_st=ic"
              className="w-full min-h-12 rounded-xl border border-[var(--line)] px-3 text-base outline-none focus:border-[var(--cyan)] text-sm font-mono"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Lien actuel certifié utilisé pour l'itinéraire et l'accès client.
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--night)] mb-1">
              Lien Google Maps — Boutique Textile
            </label>
            <input
              type="url"
              value={settings.mapsTextile || ''}
              onChange={(e) => onChange('mapsTextile', e.target.value)}
              placeholder="https://maps.app.goo.gl/p6hfGK1j1j32RyWu7"
              className="w-full min-h-12 rounded-xl border border-[var(--line)] px-3 text-base outline-none focus:border-[var(--cyan)] text-sm font-mono"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Lien officiel de la boutique Textile. S'il est laissé vide, le lien enregistré par défaut reste utilisé.
            </span>
          </div>
        </div>
      </div>

      {/* 5. Textes de présentation */}
      <div className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm space-y-4">
        <h3 className="font-display text-xl font-bold uppercase text-[var(--night)]">
          5. Textes de présentation du site
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--night)] mb-1">
              Titre principal d'accueil (Hero Title)
            </label>
            <input
              type="text"
              value={settings.heroTitle || ''}
              onChange={(e) => onChange('heroTitle', e.target.value)}
              className="w-full min-h-12 rounded-xl border border-[var(--line)] px-3 text-base outline-none focus:border-[var(--cyan)]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--night)] mb-1">
              Sous-titre d'accueil (Hero Subtitle)
            </label>
            <textarea
              rows={2}
              value={settings.heroSubtitle || ''}
              onChange={(e) => onChange('heroSubtitle', e.target.value)}
              className="w-full rounded-xl border border-[var(--line)] p-3 text-base outline-none focus:border-[var(--cyan)]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--night)] mb-1">
              Présentation Boutique Électronique
            </label>
            <textarea
              rows={2}
              value={settings.elecIntro || ''}
              onChange={(e) => onChange('elecIntro', e.target.value)}
              className="w-full rounded-xl border border-[var(--line)] p-3 text-base outline-none focus:border-[var(--cyan)]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--night)] mb-1">
              Présentation Boutique Textile
            </label>
            <textarea
              rows={2}
              value={settings.textileIntro || ''}
              onChange={(e) => onChange('textileIntro', e.target.value)}
              className="w-full rounded-xl border border-[var(--line)] p-3 text-base outline-none focus:border-[var(--cyan)]"
            />
          </div>
        </div>
      </div>

      {/* 5. Mentions Légales & Raison Sociale */}
      <div className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm space-y-4">
        <h3 className="font-display text-xl font-bold uppercase text-[var(--night)]">
          5. Raison sociale & Textes légaux
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--night)] mb-1">
              Raison sociale de l'entreprise
            </label>
            <input
              type="text"
              value={settings.legalName || ''}
              onChange={(e) => onChange('legalName', e.target.value)}
              placeholder="ex. ALFFA NIGER SARL..."
              className="w-full min-h-12 rounded-xl border border-[var(--line)] px-3 text-base outline-none focus:border-[var(--cyan)]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--night)] mb-1">
              Texte des Mentions Légales
            </label>
            <textarea
              rows={3}
              value={settings.legalInfo || ''}
              onChange={(e) => onChange('legalInfo', e.target.value)}
              className="w-full rounded-xl border border-[var(--line)] p-3 text-base outline-none focus:border-[var(--cyan)]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--night)] mb-1">
              Politique de Confidentialité
            </label>
            <textarea
              rows={3}
              value={settings.privacyText || ''}
              onChange={(e) => onChange('privacyText', e.target.value)}
              className="w-full rounded-xl border border-[var(--line)] p-3 text-base outline-none focus:border-[var(--cyan)]"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[var(--line)]">
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--night)] px-8 text-base font-bold text-white hover:bg-[var(--night-2)] shadow-md transition disabled:opacity-50"
        >
          <Save className="h-5 w-5 text-[var(--cyan)]" />
          <span>{isSaving ? 'Enregistrement en cours...' : 'Enregistrer tous les paramètres'}</span>
        </button>

        <button
          type="button"
          onClick={onResetDefaults}
          className="inline-flex min-h-10 items-center gap-1.5 text-xs text-rose-700 hover:underline"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Réinitialiser aux valeurs d'origine</span>
        </button>
      </div>
    </form>
  );
}

// 5. MEDIA MANAGER
function MediaManager({
  products,
  brands,
  onUploadImage,
}: {
  products: Product[];
  brands: TextileBrand[];
  onUploadImage: (file: File) => Promise<string>;
}) {
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await onUploadImage(file);
      setUploadedUrl(url);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm space-y-4">
        <h2 className="font-display text-2xl font-bold uppercase text-[var(--night)]">
          Téléverser une nouvelle image
        </h2>
        <p className="text-xs text-[var(--muted)]">
          Formats autorisés : JPEG, PNG, WebP (jusqu'à 8 Mo). L'image est sauvegardée localement dans le projet.
        </p>

        <label className="border-2 border-dashed border-[var(--line)] rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-[var(--cyan)] transition bg-slate-50">
          <Upload className="h-8 w-8 text-slate-400 mb-2" />
          <span className="text-sm font-semibold text-[var(--night)]">
            {isUploading ? 'Téléversement et optimisation...' : 'Cliquez pour sélectionner un fichier image'}
          </span>
          <span className="text-xs text-[var(--muted)] mt-1">Photos de smartphones ou de bazins</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={isUploading}
            onChange={handleFileUpload}
            className="sr-only"
          />
        </label>

        {uploadedUrl && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 space-y-2">
            <span className="text-xs font-bold text-emerald-800">
              ✓ Image prête et enregistrée avec succès :
            </span>
            <div className="flex items-center gap-3">
              <input
                type="text"
                readOnly
                value={uploadedUrl}
                className="flex-1 bg-white border border-emerald-300 rounded-lg px-3 py-1.5 text-xs font-mono"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(uploadedUrl);
                  alert('Lien copié dans le presse-papiers !');
                }}
                className="px-3 py-1.5 bg-emerald-700 text-white font-bold text-xs rounded-lg hover:bg-emerald-800"
              >
                Copier l'URL
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Gallery of active product photos */}
      <div className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm space-y-4">
        <h2 className="font-display text-xl font-bold uppercase text-[var(--night)]">
          Galerie des photos de produits actuelles
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
          {products.map((p) => (
            <div key={p.id} className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex flex-col">
              <div className="aspect-square relative bg-white">
                <ProductImage product={p} className="h-full w-full" />
              </div>
              <span className="p-2 text-[11px] font-bold text-slate-700 truncate" title={p.name}>
                {p.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 6. PRODUCT ADD/EDIT MODAL
function ProductModal({
  shop,
  product,
  brands,
  onClose,
  onSave,
  onUploadImage,
}: {
  shop: ShopType;
  product: Product | null;
  brands: TextileBrand[];
  onClose: () => void;
  onSave: (product: Product) => Promise<void>;
  onUploadImage: (file: File) => Promise<string>;
}) {
  const isEditing = Boolean(product);
  const isTextile = shop === 'textile';

  const [name, setName] = useState(product?.name || '');
  const [brand, setBrand] = useState(
    product?.brand || (isTextile ? brands[0]?.id || 'drews' : 'apple')
  );
  const [category, setCategory] = useState(
    product?.category || (isTextile ? 'bazins' : 'smartphones')
  );
  const [priceStr, setPriceStr] = useState(
    product?.price !== null && product?.price !== undefined ? String(product.price) : ''
  );
  const [availability, setAvailability] = useState(product?.availability || 'disponible');
  const [capacity, setCapacity] = useState(product?.capacity || '');
  const [colors, setColors] = useState(product?.colors || '');
  const [condition, setCondition] = useState(product?.condition || '');
  const [reference, setReference] = useState(product?.reference || '');
  const [model, setModel] = useState(product?.model || '');
  const [description, setDescription] = useState(product?.description || '');
  const [specs, setSpecs] = useState(product?.specs || '');
  const [image, setImage] = useState(product?.image || '');
  const [isNew, setIsNew] = useState(product?.isNew || false);
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await onUploadImage(file);
      setImage(url);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = 'Le nom du produit est obligatoire.';

    let parsedPrice: number | null = null;
    if (priceStr.trim() !== '') {
      const cleaned = priceStr.replace(/\s/g, '');
      if (!/^\d+$/.test(cleaned)) {
        newErrors.price = 'Le montant doit contenir uniquement des chiffres en FCFA.';
      } else {
        parsedPrice = parseInt(cleaned, 10);
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const generatedId = product?.id || `${slugify(name)}-${Date.now().toString(36).slice(-4)}`;

    const savedProduct: Product = {
      id: generatedId,
      shop,
      name: name.trim(),
      brand,
      category,
      price: parsedPrice,
      availability,
      capacity: capacity.trim() || undefined,
      colors: colors.trim() || undefined,
      condition: condition.trim() || undefined,
      reference: reference.trim() || undefined,
      model: model.trim() || undefined,
      description: description.trim() || undefined,
      specs: specs.trim() || undefined,
      image: image.trim() || undefined,
      sourceImage: product?.sourceImage,
      isNew,
      createdAt: product?.createdAt || Date.now(),
    };

    onSave(savedProduct);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl my-8">
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-4">
          <div>
            <h3 className="font-display text-2xl font-bold uppercase text-[var(--night)]">
              {isEditing ? `Modifier : ${product?.name}` : `Ajouter un produit (${shop})`}
            </h3>
            <span className="text-xs text-[var(--muted)]">
              Toutes les modifications sont immédiatement visibles sur la boutique publique.
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-[var(--night)] rounded-xl"
            aria-label="Fermer"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4 max-h-[75vh] overflow-y-auto pr-2">
          {/* Nom du produit */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--night)] mb-1">
              Nom complet du produit *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isTextile ? 'ex. Bazin Riche Getzner Blanc...' : 'ex. iPhone 15 Pro Max...'}
              className="w-full min-h-12 rounded-xl border border-[var(--line)] px-3 text-base outline-none focus:border-[var(--cyan)]"
            />
            {errors.name && <p className="text-xs text-rose-600 mt-1">{errors.name}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Marque */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--night)] mb-1">
                Marque
              </label>
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full min-h-12 rounded-xl border border-[var(--line)] px-3 text-base outline-none focus:border-[var(--cyan)]"
              >
                {isTextile ? (
                  brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="apple">Apple (iPhone)</option>
                    <option value="samsung">Samsung</option>
                  </>
                )}
              </select>
            </div>

            {/* Catégorie */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--night)] mb-1">
                Catégorie
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full min-h-12 rounded-xl border border-[var(--line)] px-3 text-base outline-none focus:border-[var(--cyan)]"
              >
                {isTextile ? (
                  <>
                    <option value="bazins">Bazins Riches</option>
                    <option value="tissus">Tissus & Étoffes</option>
                  </>
                ) : (
                  <>
                    <option value="smartphones">Smartphones</option>
                    <option value="accessoires">Accessoires électroniques</option>
                    <option value="autres">Autres appareils</option>
                  </>
                )}
              </select>
            </div>

            {/* Prix */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--night)] mb-1">
                Prix en FCFA (laisser vide = sur demande)
              </label>
              <input
                type="text"
                value={priceStr}
                onChange={(e) => setPriceStr(e.target.value)}
                placeholder="ex. 300000"
                className="w-full min-h-12 rounded-xl border border-[var(--line)] px-3 text-base outline-none focus:border-[var(--cyan)]"
              />
              {errors.price && <p className="text-xs text-rose-600 mt-1">{errors.price}</p>}
            </div>

            {/* Disponibilité */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--night)] mb-1">
                Disponibilité
              </label>
              <select
                value={availability}
                onChange={(e) => setAvailability(e.target.value as any)}
                className="w-full min-h-12 rounded-xl border border-[var(--line)] px-3 text-base outline-none focus:border-[var(--cyan)]"
              >
                <option value="disponible">En stock / Disponible</option>
                <option value="sur_commande">Sur commande</option>
                <option value="non_precise">Disponibilité à confirmer</option>
                <option value="indisponible">Rupture temporaire</option>
              </select>
            </div>

            {!isTextile && (
              <>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--night)] mb-1">
                    Capacité (ex. 256 Go)
                  </label>
                  <input
                    type="text"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    placeholder="ex. 256 Go, 512 Go..."
                    className="w-full min-h-12 rounded-xl border border-[var(--line)] px-3 text-base outline-none focus:border-[var(--cyan)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--night)] mb-1">
                    État (ex. Neuf scellé, Révisé...)
                  </label>
                  <input
                    type="text"
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    placeholder="ex. Neuf sous boîte..."
                    className="w-full min-h-12 rounded-xl border border-[var(--line)] px-3 text-base outline-none focus:border-[var(--cyan)]"
                  />
                </div>
              </>
            )}

            {isTextile && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--night)] mb-1">
                  Modèle de tissu (ex. Damassé Bazin Riche)
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="ex. Bazin Riche Supérieur..."
                  className="w-full min-h-12 rounded-xl border border-[var(--line)] px-3 text-base outline-none focus:border-[var(--cyan)]"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--night)] mb-1">
                Couleurs disponibles
              </label>
              <input
                type="text"
                value={colors}
                onChange={(e) => setColors(e.target.value)}
                placeholder="ex. Noir, Bleu, Argent..."
                className="w-full min-h-12 rounded-xl border border-[var(--line)] px-3 text-base outline-none focus:border-[var(--cyan)]"
              />
            </div>
          </div>

          {/* Image */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--night)] mb-1">
              Image du produit (URL directe ou téléversement de fichier)
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="/images/products/... ou https://..."
                className="flex-1 min-h-12 rounded-xl border border-[var(--line)] px-3 text-sm outline-none focus:border-[var(--cyan)] font-mono"
              />
              <label className="cursor-pointer inline-flex min-h-12 items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-4 text-xs font-bold text-[var(--night)] hover:bg-slate-100">
                <Upload className="h-4 w-4" />
                <span>{isUploading ? 'Téléversement...' : 'Parcourir'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={isUploading}
                  onChange={handleFileUpload}
                  className="sr-only"
                />
              </label>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--night)] mb-1">
              Description détaillée
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Présentation valorisante du produit..."
              className="w-full rounded-xl border border-[var(--line)] p-3 text-base outline-none focus:border-[var(--cyan)]"
            />
          </div>

          {/* Specs */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--night)] mb-1">
              Caractéristiques techniques (une par ligne)
            </label>
            <textarea
              rows={3}
              value={specs}
              onChange={(e) => setSpecs(e.target.value)}
              placeholder="Écran 6.7 pouces&#10;Capteur 48 MP&#10;Batterie 5000 mAh"
              className="w-full rounded-xl border border-[var(--line)] p-3 text-base outline-none focus:border-[var(--cyan)]"
            />
          </div>

          {/* Is New checkbox */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isNewCheck"
              checked={isNew}
              onChange={(e) => setIsNew(e.target.checked)}
              className="h-5 w-5 rounded accent-[var(--cyan)]"
            />
            <label htmlFor="isNewCheck" className="text-sm font-semibold text-[var(--night)] cursor-pointer">
              Afficher le badge "Nouveauté" sur cette fiche
            </label>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t border-[var(--line)]">
            <button
              type="button"
              onClick={onClose}
              className="min-h-12 rounded-xl border border-slate-300 px-5 text-sm font-semibold hover:bg-slate-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="min-h-12 rounded-xl bg-[var(--night)] px-7 text-sm font-bold text-white shadow-md hover:bg-[var(--night-2)]"
            >
              Enregistrer le produit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 7. SUPABASE INTEGRATION CARD
function SupabaseIntegrationCard() {
  const { settings, products, brands, featured, showNotification } = useStore();
  const [checking, setChecking] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [diag, setDiag] = useState<SupabaseConnectionDiagnostic | null>(null);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    handleCheck();
  }, []);

  const handleCheck = async () => {
    setChecking(true);
    try {
      const res = await testSupabaseConnection();
      setDiag(res);
    } finally {
      setChecking(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await syncAllToSupabase({
        version: 1,
        seededAt: new Date().toISOString(),
        settings,
        products,
        brands,
        featured,
      });
      if (res.success) {
        showNotification('success', res.message);
        handleCheck();
      } else {
        showNotification('error', res.message);
      }
    } finally {
      setSyncing(false);
    }
  };

  const sqlCode = `-- =========================================================================
-- ALFFA NIGER — SCRIPT SQL COMPLET POUR SUPABASE
-- =========================================================================

-- 1. Table des produits
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  shop TEXT NOT NULL CHECK (shop IN ('electronique', 'textile')),
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC,
  availability TEXT DEFAULT 'disponible',
  capacity TEXT,
  colors TEXT,
  condition TEXT,
  reference TEXT,
  description TEXT,
  specs TEXT,
  model TEXT,
  image TEXT,
  source_image TEXT,
  is_new BOOLEAN DEFAULT false,
  hidden BOOLEAN DEFAULT false,
  created_at BIGINT DEFAULT (extract(epoch from now()) * 1000)::bigint
);

-- 2. Table des marques textiles
CREATE TABLE IF NOT EXISTS public.brands (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  logo TEXT,
  source_logo TEXT,
  display_order INT DEFAULT 1
);

-- 3. Table des sélections à la une
CREATE TABLE IF NOT EXISTS public.featured (
  id SERIAL PRIMARY KEY,
  shop TEXT NOT NULL CHECK (shop IN ('electronique', 'textile')),
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  display_order INT DEFAULT 1,
  UNIQUE (shop, product_id)
);

-- 4. Table des paramètres et coordonnées
CREATE TABLE IF NOT EXISTS public.site_settings (
  id INT PRIMARY KEY DEFAULT 1,
  name TEXT DEFAULT 'ALFFA NIGER',
  slogan TEXT DEFAULT 'La qualité au meilleur prix.',
  whatsapp_electronique TEXT DEFAULT '22796222310',
  whatsapp_textile TEXT DEFAULT '22796222310',
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  email TEXT DEFAULT '',
  hours TEXT DEFAULT '',
  facebook TEXT DEFAULT 'https://www.facebook.com/share/1BpsCF3tBK/?mibextid=wwXIfr',
  instagram TEXT DEFAULT 'https://www.instagram.com/khalil_baye?srtk=NzVnbzJ2dmFvNnhr',
  tiktok TEXT DEFAULT 'https://www.tiktok.com/@alffaniger?_r=1&_t=ZS-9AQ5RF69CYY',
  maps_electronique TEXT DEFAULT 'https://maps.app.goo.gl/yr1v33pcPDGsSSpe8?g_st=ic',
  maps_textile TEXT DEFAULT '',
  site_url TEXT DEFAULT 'https://alffaniger.com',
  hero_title TEXT DEFAULT 'La qualité au meilleur prix.',
  hero_subtitle TEXT DEFAULT 'Téléphones, électronique, bazins et tissus de premier choix au Niger.',
  elec_intro TEXT DEFAULT 'Smartphones certifiés avec prix en FCFA.',
  textile_intro TEXT DEFAULT 'Bazins de grand éclat et de haute tenue.'
);

-- 5. Row Level Security & Politiques
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.featured ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture publique des produits" ON public.products;
CREATE POLICY "Lecture publique des produits" ON public.products FOR SELECT USING (true);
DROP POLICY IF EXISTS "Écriture des produits" ON public.products;
CREATE POLICY "Écriture des produits" ON public.products FOR ALL USING (true);

DROP POLICY IF EXISTS "Lecture publique des marques" ON public.brands;
CREATE POLICY "Lecture publique des marques" ON public.brands FOR SELECT USING (true);
DROP POLICY IF EXISTS "Écriture des marques" ON public.brands;
CREATE POLICY "Écriture des marques" ON public.brands FOR ALL USING (true);

DROP POLICY IF EXISTS "Lecture publique des sélections à la une" ON public.featured;
CREATE POLICY "Lecture publique des sélections à la une" ON public.featured FOR SELECT USING (true);
DROP POLICY IF EXISTS "Écriture des sélections à la une" ON public.featured;
CREATE POLICY "Écriture des sélections à la une" ON public.featured FOR ALL USING (true);

DROP POLICY IF EXISTS "Lecture publique des paramètres" ON public.site_settings;
CREATE POLICY "Lecture publique des paramètres" ON public.site_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Écriture des paramètres" ON public.site_settings;
CREATE POLICY "Écriture des paramètres" ON public.site_settings FOR ALL USING (true);`;

  const isConnected = diag?.connected ?? false;
  const isFailed = diag && !diag.connected;
  const hasTables = diag?.database.hasTables ?? false;

  return (
    <div className="rounded-2xl border border-[var(--cyan)]/30 bg-gradient-to-br from-white to-cyan-50/40 p-6 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`grid h-12 w-12 place-items-center rounded-2xl border ${
              isFailed
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : isConnected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            <Database className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--cyan-deep)]">
              Base de Données Cloud & Auth
            </span>
            <h3 className="font-display text-2xl font-bold uppercase text-[var(--night)] flex items-center gap-2">
              <span>{diag ? diag.statusText : 'Vérification Supabase...'}</span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  isFailed
                    ? 'bg-rose-100 text-rose-800'
                    : hasTables
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isFailed
                      ? 'bg-rose-600'
                      : hasTables
                      ? 'bg-emerald-600 animate-pulse'
                      : 'bg-amber-600 animate-pulse'
                  }`}
                />
                {isFailed ? 'Hors ligne' : hasTables ? 'Prêt & Connecté' : 'Connecté (Schéma en attente)'}
              </span>
            </h3>
            <p className="text-xs text-[var(--muted)] font-mono mt-0.5">
              {SUPABASE_URL}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={checking}
            onClick={handleCheck}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'Test en cours...' : 'Tester la connexion'}</span>
          </button>

          <button
            type="button"
            disabled={syncing}
            onClick={handleSync}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-emerald-700 px-4 text-xs font-bold text-white hover:bg-emerald-800 shadow-sm transition"
          >
            <Database className="h-3.5 w-3.5" />
            <span>{syncing ? 'Synchronisation...' : 'Synchroniser vers Supabase'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSqlModal(true)}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[var(--cyan)] bg-white px-3.5 text-xs font-bold text-[var(--cyan-deep)] hover:bg-cyan-50 transition"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>Schéma SQL Supabase</span>
          </button>

          <a
            href="/api/download/lws-zip"
            download="alffa-niger-lws.zip"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[var(--night)] px-4 text-xs font-bold text-white hover:bg-[var(--night-2)] shadow-sm transition"
            title="Télécharger l'archive ZIP prête pour hébergement LWS"
          >
            <Download className="h-3.5 w-3.5 text-[var(--cyan)]" />
            <span>Télécharger ZIP pour LWS</span>
          </a>
        </div>
      </div>

      {diag && (
        <div className="rounded-xl bg-white/95 border border-slate-200 p-4 text-xs space-y-3 shadow-sm">
          {/* Ligne Statut + Latence */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">Diagnostic en direct :</span>
              <span
                className={`font-bold px-2 py-0.5 rounded-md ${
                  isFailed
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {diag.statusText}
              </span>
            </div>
            <div className="flex items-center gap-3 text-slate-500 font-mono text-[11px]">
              <span>Latence : {diag.latencyMs} ms</span>
              <span>Testé à : {diag.testedAt}</span>
            </div>
          </div>

          {/* Message clair et exploitable */}
          <p
            className={`p-3 rounded-xl text-xs leading-relaxed border ${
              isFailed
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : hasTables
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950 font-medium'
                : 'bg-amber-50 border-amber-200 text-amber-950'
            }`}
          >
            {diag.summaryMessage}
          </p>

          {/* Inspection Session Auth */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="font-semibold text-slate-700">Session Supabase Auth :</span>
            <span
              className={`font-semibold px-2 py-0.5 rounded-md text-[11px] ${
                diag.auth.hasSession
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {diag.auth.sessionStatus}
            </span>
          </div>

          {/* Grille des tables */}
          <div className="space-y-1.5 pt-1">
            <span className="font-semibold text-slate-700">État des tables PostgreSQL :</span>
            <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
              <div
                className={`p-2 rounded-lg border ${
                  diag.database.productsTable
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                Table 'products' : {diag.database.productsTable ? 'Prête ✓' : 'À créer'}
              </div>
              <div
                className={`p-2 rounded-lg border ${
                  diag.database.brandsTable
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                Table 'brands' : {diag.database.brandsTable ? 'Prête ✓' : 'À créer'}
              </div>
              <div
                className={`p-2 rounded-lg border ${
                  diag.database.siteSettingsTable
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                Table 'site_settings' : {diag.database.siteSettingsTable ? 'Prête ✓' : 'À créer'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SQL Script Modal */}
      {showSqlModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
        >
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-display text-2xl font-bold uppercase text-[var(--night)]">
                Script SQL de création Supabase
              </h3>
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-[var(--muted)]">
              Copiez ce script et collez-le dans le <strong>SQL Editor</strong> de votre tableau de bord Supabase (
              <a
                href={SUPABASE_SQL_EDITOR_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-[var(--cyan-deep)] font-semibold inline-flex items-center gap-0.5"
              >
                Ouvrir le SQL Editor Supabase <ExternalLink className="h-3 w-3" />
              </a>
              ) puis cliquez sur <strong>Run</strong> :
            </p>

            <pre className="max-h-72 overflow-y-auto bg-slate-900 text-slate-100 p-4 rounded-xl text-xs font-mono">
              {sqlCode}
            </pre>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(sqlCode);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 3000);
                }}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--cyan)] px-5 text-xs font-bold text-[var(--night)] hover:bg-[#22c7dc] shadow-sm"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-800" /> : <Copy className="h-4 w-4" />}
                <span>{copied ? 'Code SQL copié !' : 'Copier tout le code SQL'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="min-h-11 rounded-xl border border-slate-300 px-5 text-xs font-semibold"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

