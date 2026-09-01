-- 0019_fix_handle_new_user.sql
-- Fixes signup 500: handle_new_user() referenced gen_random_bytes() unqualified.
-- On Supabase, pgcrypto lives in the "extensions" schema, not "public" — and the
-- function pins SET search_path = public, so gen_random_bytes(6) could not be
-- resolved. Every signup raised:
--   ERROR: handle_new_user failed for user <uuid>: function gen_random_bytes(integer) does not exist
-- Fix: call extensions.gen_random_bytes() explicitly. gen_random_uuid() also lives
-- in extensions but is only used by table DEFAULTs (evaluated outside this function),
-- so no other change is needed.
-- Applied: 2026-09-01 via psql.

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone              text;
  v_referral_code_used text;
  v_referrer_id        uuid;
  v_new_referral_code  text;
  v_collision_count    integer := 0;
  v_max_attempts       integer := 10;
BEGIN
  -- Extract phone from user metadata
  v_phone := NEW.raw_user_meta_data->>'phone';

  IF v_phone IS NULL OR v_phone = '' THEN
    RAISE EXCEPTION 'handle_new_user: phone missing from user metadata';
  END IF;

  -- Generate a unique 8-character alphanumeric referral code (retry on collision)
  LOOP
    v_new_referral_code := upper(
      substring(
        replace(encode(extensions.gen_random_bytes(6), 'base64'), '/', 'X'),
        1, 8
      )
    );
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE referral_code = v_new_referral_code
    );
    v_collision_count := v_collision_count + 1;
    IF v_collision_count >= v_max_attempts THEN
      RAISE EXCEPTION 'handle_new_user: could not generate unique referral code after % attempts', v_max_attempts;
    END IF;
  END LOOP;

  -- Resolve referral code to referrer profile id (if provided)
  v_referral_code_used := NEW.raw_user_meta_data->>'referral_code_used';
  IF v_referral_code_used IS NOT NULL AND v_referral_code_used <> '' THEN
    SELECT id INTO v_referrer_id
    FROM public.profiles
    WHERE referral_code = v_referral_code_used;
    -- If the code doesn't exist or belongs to a banned user, we silently ignore it
    -- rather than failing the signup. A bad referral code should not block account creation.
    IF v_referrer_id IS NOT NULL THEN
      -- Prevent self-referral
      IF v_referrer_id = NEW.id THEN
        v_referrer_id := NULL;
      END IF;
    END IF;
  END IF;

  -- Create the profile row
  INSERT INTO public.profiles (
    id,
    phone,
    name,
    role,
    referral_code,
    referred_by
  ) VALUES (
    NEW.id,
    v_phone,
    '',                    -- name collected at onboarding (Milestone 3)
    'user',
    v_new_referral_code,
    v_referrer_id
  );

  -- Create the wallet row
  INSERT INTO public.wallets (user_id)
  VALUES (NEW.id);

  -- Create referral record if there is a valid referrer
  IF v_referrer_id IS NOT NULL THEN
    INSERT INTO public.referrals (
      referrer_id,
      referred_id,
      bonus_amount   -- snapshot current bonus amount at signup time
    )
    SELECT
      v_referrer_id,
      NEW.id,
      COALESCE(
        (SELECT referral_bonus_amount FROM public.site_settings WHERE id = 1),
        10  -- fallback if site_settings row doesn't exist yet
      );
  END IF;

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    -- Re-raise with context so Supabase Auth surfaces a meaningful error
    RAISE EXCEPTION 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
END;
$$;

COMMIT;
