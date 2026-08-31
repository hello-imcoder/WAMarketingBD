-- 0010_site_settings.sql
-- Applied: 2026-09-01 04:51 via psql (connection string from SECRETS.md)
-- Site settings: singleton config table.
-- Driven by §7.3 (min_withdrawal_amount admin-configurable) and kickoff Q9 (referral bonus).
-- Singleton enforced by CHECK(id = 1) + PK. Only one row ever exists (inserted in seed.sql).
-- Readable by all authenticated users (withdrawal form needs min_withdrawal_amount).
-- Writable only by admin (is_su_admin() RLS policy in 0012_rls.sql).

BEGIN;

CREATE TABLE public.site_settings (
  id                      integer     NOT NULL  DEFAULT 1,
  min_withdrawal_amount   integer     NOT NULL  DEFAULT 50,   -- BDT taka (confirmed: 50)
  referral_bonus_amount   integer     NOT NULL  DEFAULT 10,   -- BDT taka (confirmed: 10)
  updated_at              timestamptz NOT NULL  DEFAULT NOW(),

  CONSTRAINT site_settings_pkey PRIMARY KEY (id),
  CONSTRAINT site_settings_singleton
    CHECK (id = 1),
  CONSTRAINT site_settings_min_withdrawal_positive
    CHECK (min_withdrawal_amount > 0),
  CONSTRAINT site_settings_referral_bonus_nonneg
    CHECK (referral_bonus_amount >= 0)
);

COMMIT;
