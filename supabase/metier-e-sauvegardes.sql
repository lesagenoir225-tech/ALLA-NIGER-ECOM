-- =========================================================================
-- ALFFA NIGER — SAUVEGARDE AUTOMATIQUE (module 6)
--
-- Objectif du commerçant : ne jamais perdre le catalogue, les reçus, le stock
-- ni les dépenses. Deux mécanismes complémentaires, tous deux côté base :
--
--   1. SAUVEGARDE QUOTIDIENNE AUTOMATIQUE (pg_cron, 03 h 00 heure de Niamey)
--      → une copie complète par jour dans `public.admin_backups`.
--   2. SAUVEGARDE À LA DEMANDE (bouton « Sauvegarder maintenant »)
--      et TÉLÉCHARGEMENT d'un fichier JSON que l'on garde hors du téléphone.
--
-- Les copies ne sont lisibles par personne : RLS active, aucun accès direct
-- pour anon/authenticated. Seul un gérant connecté, via une fonction qui
-- vérifie son jeton, peut lister, télécharger ou déclencher une sauvegarde.
--
-- Script idempotent : peut être rejoué sans dommage.
-- Prérequis : migrations métier A à D (comptes, dépenses, rôles, reçus).
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Table des sauvegardes (une ligne par jour)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_backups (
  id BIGSERIAL PRIMARY KEY,
  -- Une seule copie par jour : une nouvelle sauvegarde du même jour remplace
  -- la précédente, ce qui évite de saturer la base avec des doublons.
  day DATE NOT NULL UNIQUE,
  payload JSONB NOT NULL,
  byte_size INT NOT NULL DEFAULT 0,
  -- « auto » (tâche planifiée) ou « manuel » (bouton de l'administration).
  origin TEXT NOT NULL DEFAULT 'manuel',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_backups_day_idx ON public.admin_backups (day DESC);

ALTER TABLE public.admin_backups ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_backups FROM anon, authenticated;

-- -------------------------------------------------------------------------
-- 2. Contenu de la copie
-- -------------------------------------------------------------------------
-- `admin_password_hash` est explicitement retiré : une sauvegarde peut être
-- téléchargée et circuler, elle ne doit contenir aucun secret.
CREATE OR REPLACE FUNCTION public.admin_backup_snapshot()
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
  SELECT jsonb_build_object(
    'exportedAt', to_jsonb(now()),
    'products', COALESCE(
      (SELECT jsonb_agg(to_jsonb(p) ORDER BY p.shop, p.display_order, p.id) FROM public.products p),
      '[]'::jsonb
    ),
    'settings', COALESCE(
      (SELECT to_jsonb(s) - 'admin_password_hash' FROM public.site_settings s ORDER BY s.id LIMIT 1),
      '{}'::jsonb
    ),
    'brands', COALESCE(
      (SELECT jsonb_agg(to_jsonb(b) ORDER BY b.display_order, b.id) FROM public.brands b),
      '[]'::jsonb
    ),
    'stock', COALESCE(
      (SELECT jsonb_agg(to_jsonb(si)) FROM public.stock_items si),
      '[]'::jsonb
    ),
    'movements', COALESCE(
      (SELECT jsonb_agg(to_jsonb(m) ORDER BY m.created_at DESC) FROM public.stock_movements m),
      '[]'::jsonb
    ),
    'receipts', COALESCE(
      (SELECT jsonb_agg(to_jsonb(r) ORDER BY r.created_at DESC) FROM public.receipts r),
      '[]'::jsonb
    ),
    'expenses', COALESCE(
      (SELECT jsonb_agg(to_jsonb(e) ORDER BY e.spent_at DESC) FROM public.expenses e),
      '[]'::jsonb
    )
  );
$$;

-- -------------------------------------------------------------------------
-- 3. Sauvegarde automatique (appelée par la tâche planifiée)
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_backup_daily()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  snap JSONB;
  size INT;
BEGIN
  snap := public.admin_backup_snapshot();
  size := octet_length(snap::text);

  INSERT INTO public.admin_backups (day, payload, byte_size, origin)
  VALUES (CURRENT_DATE, snap, size, 'auto')
  ON CONFLICT (day) DO UPDATE
    SET payload = EXCLUDED.payload,
        byte_size = EXCLUDED.byte_size,
        created_at = now();

  -- Rétention : on conserve 90 jours. Au-delà, la copie n'a plus d'utilité
  -- pratique et la base grossit pour rien.
  DELETE FROM public.admin_backups WHERE day < CURRENT_DATE - INTERVAL '90 days';

  RETURN jsonb_build_object('day', CURRENT_DATE, 'bytes', size);
END;
$$;

-- Fonction interne : jamais appelable par le navigateur.
REVOKE ALL ON FUNCTION public.admin_backup_daily() FROM PUBLIC, anon, authenticated;

-- -------------------------------------------------------------------------
-- 4. Fonctions réservées au gérant
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_backup_now(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  snap JSONB;
  size INT;
  total INT;
BEGIN
  PERFORM public.admin_assert_role(p_token, ARRAY['gerant']);

  snap := public.admin_backup_snapshot();
  size := octet_length(snap::text);

  INSERT INTO public.admin_backups (day, payload, byte_size, origin)
  VALUES (CURRENT_DATE, snap, size, 'manuel')
  ON CONFLICT (day) DO UPDATE
    SET payload = EXCLUDED.payload,
        byte_size = EXCLUDED.byte_size,
        origin = 'manuel',
        created_at = now();

  DELETE FROM public.admin_backups WHERE day < CURRENT_DATE - INTERVAL '90 days';

  SELECT COUNT(*) INTO total FROM public.admin_backups;
  RETURN jsonb_build_object('day', CURRENT_DATE, 'bytes', size, 'stored', total);
END;
$$;

-- Liste des copies disponibles (sans le contenu : la liste reste légère).
CREATE OR REPLACE FUNCTION public.admin_backup_list(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  result JSONB;
BEGIN
  PERFORM public.admin_assert_role(p_token, ARRAY['gerant']);

  SELECT COALESCE(jsonb_agg(to_jsonb(b) ORDER BY b.day DESC), '[]'::jsonb)
    INTO result
    FROM (
      SELECT day, byte_size, origin, created_at
      FROM public.admin_backups
      ORDER BY day DESC
      LIMIT 60
    ) b;

  RETURN jsonb_build_object('backups', result, 'today', CURRENT_DATE);
END;
$$;

-- Téléchargement d'une copie précise (JSON complet).
CREATE OR REPLACE FUNCTION public.admin_backup_get(p_token TEXT, p_day DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  snap JSONB;
BEGIN
  PERFORM public.admin_assert_role(p_token, ARRAY['gerant']);

  SELECT payload INTO snap FROM public.admin_backups WHERE day = p_day;
  IF snap IS NULL THEN
    RAISE EXCEPTION 'Aucune sauvegarde pour le %.', p_day USING ERRCODE = 'P0002';
  END IF;
  RETURN snap;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_backup_now(TEXT)           TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_backup_list(TEXT)          TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_backup_get(TEXT, DATE)     TO anon, authenticated;

-- -------------------------------------------------------------------------
-- 5. Planification quotidienne
-- -------------------------------------------------------------------------
-- pg_cron n'est pas disponible sur tous les projets : si l'extension manque,
-- on ne bloque pas l'installation. La sauvegarde reste déclenchable depuis
-- l'administration (« Sauvegarder maintenant »), et le navigateur du gérant
-- déclenche automatiquement celle du jour à la première ouverture.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron indisponible : sauvegarde automatique côté navigateur uniquement.';
END $$;

DO $$
BEGIN
  -- 03 h 00 heure de Niamey (UTC+1) = 02 h 00 UTC.
  PERFORM cron.unschedule('alffa-backup-quotidienne')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'alffa-backup-quotidienne');

  PERFORM cron.schedule(
    'alffa-backup-quotidienne',
    '0 2 * * *',
    $cron$ SELECT public.admin_backup_daily(); $cron$
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Planification pg_cron impossible (%) : sauvegarde déclenchée par l''administration.', SQLERRM;
END $$;
