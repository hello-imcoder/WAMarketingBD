-- 0002_profiles.sql
-- Applied: 2026-09-01 04:51 via psql (connection string from SECRETS.md)
-- Profiles table: 1:1 extension of auth.users.
-- Driven by REQUIREMENT.md §5 (auth), §6.5 (referral), §7.4 (ban/suspend).
-- PK = auth.users.id (uuid). Row created atomically by trigger in 0013_triggers.sql.

BEGIN;

CREATE TABLE public.profiles (
  id              uuid        NOT NULL,
  phone           text        NOT NULL,
  name            text        NOT NULL        DEFAULT '',
  email           text                        DEFAULT NULL,
  role            user_role   NOT NULL        DEFAULT 'user',
  referral_code   text        NOT NULL,
  referred_by     uuid                        DEFAULT NULL,
  is_verified     boolean     NOT NULL        DEFAULT false,
  is_banned       boolean     NOT NULL        DEFAULT false,
  suspended_at    timestamptz                 DEFAULT NULL,
  created_at      timestamptz NOT NULL        DEFAULT NOW(),
  updated_at      timestamptz NOT NULL        DEFAULT NOW(),

  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_auth_fk
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT profiles_referred_by_fk
    FOREIGN KEY (referred_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT profiles_phone_len
    CHECK (length(phone) BETWEEN 11 AND 11),
  CONSTRAINT profiles_name_len
    CHECK (length(name) BETWEEN 0 AND 100),
  CONSTRAINT profiles_referral_code_len
    CHECK (length(referral_code) = 8),
  CONSTRAINT profiles_no_self_referral
    CHECK (referred_by IS NULL OR referred_by <> id)
);

-- Unique indexes (also serve as the actual unique constraints)
CREATE UNIQUE INDEX profiles_phone_uidx       ON public.profiles (phone);
CREATE UNIQUE INDEX profiles_referral_uidx    ON public.profiles (referral_code);

-- Column-level update privilege: only name and email are updatable by authenticated users.
-- All other columns (role, is_verified, is_banned, suspended_at, referral_code, referred_by)
-- are writable only via service-role Edge Functions or the is_su_admin() admin path.
-- This is enforced at RLS policy level in 0012_rls.sql.

COMMIT;
