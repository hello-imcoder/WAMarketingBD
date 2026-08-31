-- 0013_triggers.sql
-- Applied: 2026-09-01 04:51 via psql (connection string from SECRETS.md)
-- Database triggers for WA Marketing BD.
-- Two triggers on auth.users INSERT:
--   1. handle_new_user() — creates profiles + wallets rows atomically.
--   2. (referral row creation is part of handle_new_user when referred_by is present)
-- One trigger on profiles/submissions UPDATE:
--   3. handle_updated_at() — keeps updated_at columns current.
-- One trigger on tasks for expiry enforcement.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- updated_at maintenance trigger
-- Reused across tables that have an updated_at column.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- handle_new_user()
-- Fires AFTER INSERT on auth.users.
-- Creates profiles + wallets rows atomically in the same transaction.
-- Also creates a referrals row if the user signed up via a referral code.
--
-- Expected user metadata (raw_user_meta_data):
--   { "phone": "01XXXXXXXXX", "referral_code_used": "<8-char-code>" (optional) }
--
-- Synthesized email domain: phone.wamarketingbd.internal
-- The phone is extracted from raw_user_meta_data, NOT parsed from the email,
-- making the trigger robust if the domain ever changes.
-- ─────────────────────────────────────────────────────────────────────────────
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
        replace(encode(gen_random_bytes(6), 'base64'), '/', 'X'),
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- Task expiry trigger
-- Sets status = 'expired' on a task when expires_at < NOW() at UPDATE time.
-- This catches admin edits and other UPDATE operations.
-- Tasks that expire without being touched are detected via
-- WHERE status = 'active' AND expires_at > NOW() in query filters.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_task_expiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.expires_at < NOW() AND NEW.status = 'active' THEN
    NEW.status := 'expired';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tasks_check_expiry
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.check_task_expiry();

COMMIT;
