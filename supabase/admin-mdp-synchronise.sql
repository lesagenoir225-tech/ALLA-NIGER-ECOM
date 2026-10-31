-- =========================================================================
-- ALFFA NIGER — MOT DE PASSE : UNE SEULE VÉRITÉ
--
-- Symptôme signalé : « parfois le mot de passe ne passe pas ».
--
-- CAUSE TROUVÉE : depuis l'arrivée des comptes (gérant / vendeur), deux
-- empreintes du mot de passe coexistent :
--   • `admin_credentials.password_hash` — historique, utilisée par admin_login
--     et admin_login_v2 ;
--   • `admin_accounts.password_hash`    — utilisée par admin_login_v3, donc
--     par la connexion réelle du site.
--
-- Or « Changer le mot de passe » ne mettait à jour QUE la première. Résultat :
-- après un changement de mot de passe, le NOUVEAU mot de passe était refusé
-- (l'ancien, lui, continuait de fonctionner) — exactement le comportement
-- « parfois ça ne passe pas » signalé par le gérant.
--
-- CORRECTION :
--   1. « Changer le mot de passe » écrit la même empreinte dans les deux
--      tables (et pour le compte réellement connecté) ;
--   2. à la connexion, si l'empreinte du compte ne correspond pas mais que
--      celle de `admin_credentials` correspond (base héritée désynchronisée),
--      on accepte ET on resynchronise — le gérant retrouve immédiatement
--      l'accès avec le mot de passe qu'il vient de définir.
--
-- Script idempotent.
-- =========================================================================

CREATE OR REPLACE FUNCTION public.admin_change_password(p_token TEXT, p_new_password TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_account TEXT;
  v_hash    TEXT;
BEGIN
  PERFORM public.admin_assert_role(p_token, ARRAY['gerant']);

  IF p_new_password IS NULL OR length(btrim(p_new_password)) < 8 THEN
    RAISE EXCEPTION 'Le nouveau mot de passe doit comporter au moins 8 caractères.'
      USING ERRCODE = '22023';
  END IF;

  v_hash := crypt(btrim(p_new_password), gen_salt('bf', 10));

  -- Référence historique (utilisée par les anciennes fonctions de connexion).
  UPDATE public.admin_credentials
     SET password_hash = v_hash, updated_at = now()
   WHERE id = 1;

  -- Compte réellement connecté : c'est lui qui décide de la connexion du site.
  SELECT account_id INTO v_account FROM public.admin_sessions WHERE token = p_token;

  IF v_account IS NOT NULL THEN
    UPDATE public.admin_accounts SET password_hash = v_hash WHERE id = v_account;
  ELSE
    -- Jeton d'ancien format (sans compte associé) : on aligne les gérants.
    UPDATE public.admin_accounts SET password_hash = v_hash WHERE role = 'gerant';
  END IF;

  -- Les autres appareils sont déconnectés : un mot de passe changé doit
  -- fermer les sessions ouvertes ailleurs.
  DELETE FROM public.admin_sessions WHERE token <> p_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_login_v3(p_username TEXT, p_password TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_acc       public.admin_accounts;
  v_cred      TEXT;
  v_ok        BOOLEAN := false;
  v_failures  INT;
  v_ip        TEXT := public.admin_request_ip();
  v_username  TEXT := lower(btrim(COALESCE(p_username, '')));
  v_password  TEXT := btrim(COALESCE(p_password, ''));
  v_token     TEXT;
BEGIN
  IF v_username = '' THEN v_username := 'gerant'; END IF;

  DELETE FROM public.admin_login_attempts WHERE attempted_at < now() - interval '2 days';

  SELECT count(*) INTO v_failures
    FROM public.admin_login_attempts
   WHERE success = false AND ip = v_ip AND attempted_at > now() - interval '15 minutes';

  SELECT * INTO v_acc
    FROM public.admin_accounts
   WHERE lower(username) = v_username AND active
   LIMIT 1;

  IF v_acc.id IS NOT NULL THEN
    IF v_acc.password_hash IS NOT NULL
       AND crypt(v_password, v_acc.password_hash) = v_acc.password_hash THEN
      v_ok := true;
    ELSIF v_acc.role = 'gerant' THEN
      -- Base héritée : le mot de passe a pu être changé alors que seule
      -- `admin_credentials` était mise à jour. On accepte ce mot de passe
      -- et on remet les deux empreintes d'accord.
      SELECT password_hash INTO v_cred FROM public.admin_credentials WHERE id = 1;
      IF v_cred IS NOT NULL AND crypt(v_password, v_cred) = v_cred THEN
        v_ok := true;
        UPDATE public.admin_accounts SET password_hash = v_cred WHERE id = v_acc.id;
      END IF;
    END IF;
  END IF;

  IF v_ok THEN
    DELETE FROM public.admin_login_attempts WHERE success = false AND ip = v_ip;
    INSERT INTO public.admin_login_attempts (success, ip) VALUES (true, v_ip);
    DELETE FROM public.admin_sessions WHERE expires_at < now();

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

  INSERT INTO public.admin_login_attempts (success, ip) VALUES (false, v_ip);
  v_failures := v_failures + 1;

  IF v_failures >= 10 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'locked', 'remaining', 0,
      'message', 'Trop de tentatives échouées depuis cet appareil. Patientez quelques minutes : '
                 || 'le blocage se lève tout seul, et un mot de passe correct passe toujours.');
  END IF;

  RETURN jsonb_build_object(
    'ok', false, 'reason', 'password',
    'remaining', GREATEST(0, 10 - v_failures),
    'message', CASE WHEN v_failures >= 8
      THEN 'Identifiant ou mot de passe incorrect. Encore ' || GREATEST(0, 10 - v_failures) || ' essai(s).'
      ELSE 'Identifiant ou mot de passe incorrect.' END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_change_password(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_login_v3(TEXT, TEXT)        TO anon, authenticated;
