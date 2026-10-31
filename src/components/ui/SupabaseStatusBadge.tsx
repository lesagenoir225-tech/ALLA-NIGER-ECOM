import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Database,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  UserCheck,
  X,
  Code,
  Copy,
  Check,
} from 'lucide-react';
import {
  testSupabaseConnection,
  SupabaseConnectionDiagnostic,
  SUPABASE_URL,
  SUPABASE_SQL_EDITOR_URL,
} from '../../services/supabase';

export function SupabaseStatusBadge() {
  const [diagnostic, setDiagnostic] = useState<SupabaseConnectionDiagnostic | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const runTest = async () => {
    setLoading(true);
    try {
      const res = await testSupabaseConnection();
      setDiagnostic(res);
    } catch (err: any) {
      setDiagnostic({
        connected: false,
        statusText: 'Échec de connexion',
        url: SUPABASE_URL,
        latencyMs: 0,
        auth: { hasSession: false, sessionStatus: 'Erreur inattendue' },
        database: {
          hasTables: false,
          productsTable: false,
          brandsTable: false,
          siteSettingsTable: false,
          errorMessage: err.message,
        },
        summaryMessage: `Échec de connexion : ${err.message}`,
        testedAt: new Date().toLocaleTimeString('fr-FR'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runTest();
  }, []);

  const copySql = () => {
    const sql = `-- =========================================================================
-- ALFFA NIGER — Schéma PostgreSQL / Supabase
-- =========================================================================

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

CREATE TABLE IF NOT EXISTS public.brands (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  logo TEXT,
  source_logo TEXT,
  display_order INT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS public.site_settings (
  id INT PRIMARY KEY DEFAULT 1,
  name TEXT DEFAULT 'ALFFA NIGER',
  slogan TEXT DEFAULT 'La qualité au meilleur prix.',
  whatsapp_electronique TEXT DEFAULT '22796222310',
  whatsapp_textile TEXT DEFAULT '22796222310',
  phone TEXT,
  address TEXT,
  email TEXT,
  hours TEXT,
  facebook TEXT DEFAULT 'https://www.facebook.com/share/1BpsCF3tBK/?mibextid=wwXIfr',
  instagram TEXT DEFAULT 'https://www.instagram.com/khalil_baye?srtk=NzVnbzJ2dmFvNnhr',
  tiktok TEXT DEFAULT 'https://www.tiktok.com/@alffaniger?_r=1&_t=ZS-9AQ5RF69CYY',
  maps_electronique TEXT DEFAULT 'https://maps.app.goo.gl/yr1v33pcPDGsSSpe8?g_st=ic',
  maps_textile TEXT DEFAULT '',
  site_url TEXT DEFAULT 'https://alffaniger.com'
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture publique des produits" ON public.products FOR SELECT USING (true);
CREATE POLICY "Écriture des produits" ON public.products FOR ALL USING (true);

CREATE POLICY "Lecture publique des marques" ON public.brands FOR SELECT USING (true);
CREATE POLICY "Écriture des marques" ON public.brands FOR ALL USING (true);

CREATE POLICY "Lecture publique des paramètres" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Écriture des paramètres" ON public.site_settings FOR ALL USING (true);`;

    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const isConnected = diagnostic?.connected ?? false;
  const isFailed = diagnostic && !diagnostic.connected;
  const hasTables = diagnostic?.database.hasTables ?? false;

  return (
    <>
      {/* 1. Badge compact de statut dans l'interface de prévisualisation */}
      <div className="fixed bottom-20 left-4 z-40 hidden sm:block">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`group flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold shadow-lg backdrop-blur-md transition-all hover:scale-105 ${
            isFailed
              ? 'bg-rose-950/90 text-rose-200 border-rose-500/40 hover:bg-rose-900'
              : hasTables
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40 hover:bg-emerald-900'
              : 'bg-[#080F49]/95 text-[#6fdcea] border-[var(--cyan)]/40 hover:bg-[#121a63]'
          }`}
          title="Cliquez pour inspecter la connexion Supabase"
        >
          {loading ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-[var(--cyan)]" />
          ) : isFailed ? (
            <XCircle className="h-3.5 w-3.5 text-rose-400" />
          ) : hasTables ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <Database className="h-3.5 w-3.5 text-[var(--cyan)]" />
          )}

          <span className="font-medium">
            {diagnostic ? diagnostic.statusText : 'Test Supabase...'}
          </span>

          <span
            className={`h-2 w-2 rounded-full ${
              isFailed
                ? 'bg-rose-400'
                : hasTables
                ? 'bg-emerald-400'
                : 'bg-amber-400 animate-pulse'
            }`}
          />
        </button>
      </div>

      {/* 2. Fenêtre modale de diagnostic détaillé */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in-0 duration-200"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-3xl bg-white p-6 sm:p-7 shadow-2xl space-y-5 text-[var(--ink)] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`grid h-10 w-10 place-items-center rounded-2xl ${
                    isFailed
                      ? 'bg-rose-100 text-rose-700'
                      : isConnected
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-2xl font-bold uppercase text-[var(--night)] leading-tight">
                    Diagnostic Supabase
                  </h2>
                  <p className="text-xs text-[var(--muted)]">
                    Test de connexion non destructif en direct
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Statut Principal */}
            <div
              className={`rounded-2xl border p-4.5 space-y-2 ${
                isFailed
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-950'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-display text-xl font-bold uppercase">
                  {isFailed ? (
                    <>
                      <XCircle className="h-5 w-5 text-rose-600" />
                      <span>Échec de connexion</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      <span>Connexion Supabase réussie</span>
                    </>
                  )}
                </div>
                {diagnostic && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white/80 border border-current/20">
                    {diagnostic.latencyMs} ms
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm leading-relaxed opacity-90">
                {diagnostic?.summaryMessage || 'Analyse en cours...'}
              </p>
            </div>

            {/* Détails Techniques non-destructifs */}
            <div className="space-y-3 text-xs">
              {/* Endpoint */}
              <div className="flex items-center justify-between rounded-xl bg-[var(--mist)] p-3 border border-[var(--line)]">
                <span className="font-semibold text-slate-600">URL du projet :</span>
                <span className="font-mono text-slate-800 text-[11px] truncate max-w-[260px] sm:max-w-none">
                  {diagnostic?.url}
                </span>
              </div>

              {/* Session Supabase Auth */}
              <div className="flex items-center justify-between rounded-xl bg-[var(--mist)] p-3 border border-[var(--line)]">
                <div className="flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4 text-[var(--cyan-deep)]" />
                  <span className="font-semibold text-slate-600">Session Supabase Auth :</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-semibold px-2 py-0.5 rounded-full text-[11px] ${
                      diagnostic?.auth.hasSession
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {diagnostic?.auth.hasSession
                      ? 'Session présente'
                      : 'Aucune session active'}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 pl-1 italic">
                * Test anonyme non destructif : aucun mot de passe, token ou jeton n'est exposé.
              </p>

              {/* Tables PostgreSQL */}
              <div className="rounded-xl bg-[var(--mist)] p-3.5 border border-[var(--line)] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">
                    Tables de la base PostgreSQL :
                  </span>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      hasTables
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {hasTables ? '3/3 Tables prêtes' : 'Schéma SQL en attente'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                  <div
                    className={`p-2 rounded-lg border ${
                      diagnostic?.database.productsTable
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    products :{' '}
                    {diagnostic?.database.productsTable ? 'Prête ✓' : 'À créer'}
                  </div>
                  <div
                    className={`p-2 rounded-lg border ${
                      diagnostic?.database.brandsTable
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    brands :{' '}
                    {diagnostic?.database.brandsTable ? 'Prête ✓' : 'À créer'}
                  </div>
                  <div
                    className={`p-2 rounded-lg border ${
                      diagnostic?.database.siteSettingsTable
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    settings :{' '}
                    {diagnostic?.database.siteSettingsTable ? 'Prête ✓' : 'À créer'}
                  </div>
                </div>

                {diagnostic?.database.errorCode === 'PGRST205' && (
                  <div className="text-[11px] text-amber-800 bg-amber-50/80 p-2.5 rounded-lg border border-amber-200/80 leading-relaxed">
                    <strong>Interprétation :</strong> La connexion à votre serveur Supabase fonctionne et la clé publishable est acceptée. Le code <code>PGRST205</code> indique que les tables ne sont pas encore créées. Cliquez ci-dessous pour copier le script SQL et l'exécuter dans votre SQL Editor Supabase.
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={runTest}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--night)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--night-2)] transition disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Relancer le test</span>
                </button>

                <button
                  type="button"
                  onClick={copySql}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  {copiedSql ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">SQL Copié !</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copier le script SQL</span>
                    </>
                  )}
                </button>
              </div>

              <a
                href={SUPABASE_SQL_EDITOR_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-[var(--cyan-deep)] hover:underline ml-auto"
              >
                <span>Ouvrir SQL Editor Supabase</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
