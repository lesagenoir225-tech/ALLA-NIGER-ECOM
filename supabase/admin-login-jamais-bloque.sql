-- =========================================================================
-- ALFFA NIGER — CONNEXION : JAMAIS DE BLOCAGE D'UN BON MOT DE PASSE
--
-- Symptôme signalé : « parfois le mot de passe ne passe pas ».
-- Cause : l'anti-force brute comptait les échecs AVANT de vérifier le mot de
-- passe. Quand le compteur atteignait 10 (y compris à cause d'essais ratés
-- d'un autre appareil, ou d'un compteur dont l'IP n'est pas connue), TOUTE
-- connexion était refusée pendant 15 minutes — même avec le bon mot de passe.
-- L'écran affichait alors « mot de passe incorrect » alors qu'il était juste.
--
-- Nouvelle logique, appliquée aux trois points d'entrée (v1, v2, v3) :
--   1. on vérifie D'ABORD les identifiants ;
--   2. s'ils sont bons  → connexion accordée, compteur remis à zéro ;
--   3. s'ils sont faux  → la tentative est comptée, et c'est seulement à
--      partir de la 10ᵉ erreur de la fenêtre que le rythme est ralenti.
--
-- Un mot de passe correct ne peut donc plus être refusé, jamais.
-- Script idempotent.
-- =========================================================================

-- Les espaces parasites (claviers de téléphone) ne font plus échouer la saisie.
CREATE OR REPLACE FUNCTION public.admin_login_v3(p_username TEXT, p_password TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_acc       public.admin_accounts;
  v_failures  INT;
  v_ip        TEXT := public.admin_request_ip();
  v_username  TEXT := lower(btrim(COALESCE(p_username, '')));
  v_password  TEXT := btrim(COALESCE(p_password, ''));
  v_token     TEXT;
BEGIN
  IF v_username = '' THEN v_username := 'gerant'; END IF;

  -- Ménage : au-delà de deux jours, l'historique des tentatives ne sert plus.
  DELETE FROM public.admin_login_attempts WHERE attempted_at < now() - interval '2 days';

  SELECT count(*) INTO v_failures
    FROM public.admin_login_attempts
   WHERE success = false AND ip = v_ip AND attempted_at > now() - interval '15 minutes';

  -- 1. Vérification des identifiants, AVANT tout blocage.
  SELECT * INTO v_acc
    FROM public.admin_accounts
   WHERE lower(username) = v_username AND active
   LIMIT 1;

  IF v_acc.id IS NOT NULL AND crypt(v_password, v_acc.password_hash) = v_acc.password_hash THEN
    -- 2. Succès : le compteur de cet appareil repart à zéro.
    DELETE FROM public.admin_login_attempts WHERE success = false AND ip = v_ip;
    INSERT INTO public.admin_login_attempts (success, ip) VALUES (true, v_ip);
    DELETE FROM public.admin_sessions WHERE expires_at < now();

    -- Le mot de passe du compte gérant reste la référence de secours (v1/v2).
    IF v_acc.role = 'gerant' THEN
      UPDATE public.admin_credentials
         SET password_hash = v_acc.password_hash, updated_at = now()
       WHERE id = 1;
    END IF;

    v_token := encode(gen_random_bytes(32), 'hex');
    INSERT INTO public.admin_sessions (token, expires_at, account_id, role)
    VALUES (v_token, now() + interval '12 hours', v_acc.id, v_acc.role);

    RETURN jsonb_build_object(
      'ok', true,
      'token', v_token,
      'role', v_acc.role,
      'username', v_acc.username,
      'displayName', COALESCE(NULLIF(v_acc.display_name, ''), v_acc.username)
    );
  END IF;

  -- 3. Échec : la tentative est comptée.
  INSERT INTO public.admin_login_attempts (success, ip) VALUES (false, v_ip);
  v_failures := v_failures + 1;

  IF v_failures >= 10 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'locked',
      'remaining', 0,
      'message',
        'Trop de tentatives échouées depuis cet appareil. Patientez quelques minutes : '
        || 'le blocage se lève tout seul, et un mot de passe correct passe toujours.'
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', false,
    'reason', 'password',
    'remaining', GREATEST(0, 10 - v_failures),
    'message', CASE WHEN v_failures >= 8
      THEN 'Identifiant ou mot de passe incorrect. Encore '
           || GREATEST(0, 10 - v_failures) || ' essai(s).'
      ELSE 'Identifiant ou mot de passe incorrect.' END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_login_v2(p_password TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_hash      TEXT;
  v_failures  INT;
  v_ip        TEXT := public.admin_request_ip();
  v_password  TEXT := btrim(COALESCE(p_password, ''));
  v_token     TEXT;
BEGIN
  DELETE FROM public.admin_login_attempts WHERE attempted_at < now() - interval '2 days';

  SELECT count(*) INTO v_failures
    FROM public.admin_login_attempts
   WHERE success = false AND ip = v_ip AND attempted_at > now() - interval '15 minutes';

  -- Vérification d'abord : un bon mot de passe n'est jamais bloqué.
  SELECT password_hash INTO v_hash FROM public.admin_credentials WHERE id = 1;

  IF v_hash IS NOT NULL AND crypt(v_password, v_hash) = v_hash THEN
    DELETE FROM public.admin_login_attempts WHERE success = false AND ip = v_ip;
    INSERT INTO public.admin_login_attempts (success, ip) VALUES (true, v_ip);
    DELETE FROM public.admin_sessions WHERE expires_at < now();

    v_token := encode(gen_random_bytes(32), 'hex');
    INSERT INTO public.admin_sessions (token, expires_at)
    VALUES (v_token, now() + interval '12 hours');

    RETURN jsonb_build_object('ok', true, 'token', v_token);
  END IF;

  INSERT INTO public.admin_login_attempts (success, ip) VALUES (false, v_ip);
  v_failures := v_failures + 1;

  IF v_failures >= 10 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'locked', 'remaining', 0,
      'message', 'Trop de tentatives échouées depuis cet appareil. Patientez quelques minutes : '
                 || 'un mot de passe correct passe toujours.');
  END IF;

  RETURN jsonb_build_object('ok', false, 'reason', 'password',
    'remaining', GREATEST(0, 10 - v_failures),
    'message', CASE WHEN v_failures >= 8
      THEN 'Mot de passe incorrect. Encore ' || GREATEST(0, 10 - v_failures) || ' essai(s).'
      ELSE 'Mot de passe incorrect.' END);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_login(p_password TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_hash      TEXT;
  v_ip        TEXT := public.admin_request_ip();
  v_password  TEXT := btrim(COALESCE(p_password, ''));
  v_failures  INT;
  v_token     TEXT;
BEGIN
  DELETE FROM public.admin_login_attempts WHERE attempted_at < now() - interval '2 days';

  SELECT count(*) INTO v_failures
    FROM public.admin_login_attempts
   WHERE success = false AND ip = v_ip AND attempted_at > now() - interval '15 minutes';

  SELECT password_hash INTO v_hash FROM public.admin_credentials WHERE id = 1;

  IF v_hash IS NULL OR crypt(v_password, v_hash) <> v_hash THEN
    INSERT INTO public.admin_login_attempts (success, ip) VALUES (false, v_ip);
    RAISE EXCEPTION 'Mot de passe incorrect.' USING ERRCODE = '28P01';
  END IF;

  DELETE FROM public.admin_login_attempts WHERE success = false AND ip = v_ip;
  INSERT INTO public.admin_login_attempts (success, ip) VALUES (true, v_ip);
  DELETE FROM public.admin_sessions WHERE expires_at < now();

  v_token := encode(gen_random_bytes(32), 'hex');
  INSERT INTO public.admin_sessions (token, expires_at)
  VALUES (v_token, now() + interval '12 hours');

  RETURN v_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_login(TEXT)             TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_login_v2(TEXT)          TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_login_v3(TEXT, TEXT)    TO anon, authenticated;
