-- 0008_referrals.sql
-- Applied: 2026-09-01 04:51 via psql (connection string from SECRETS.md)
-- Referrals table: tracks referral relationships and bonus state.
-- Driven by §6.5: bonus triggers on referred user's FIRST task completion, not on signup.
-- bonus_amount is copied from site_settings.referral_bonus_amount at trigger time,
-- so historical records retain the bonus that was current when the referral activated.
-- Row is created when a referred user completes onboarding (profile trigger reads
-- referred_by from profile and creates the referrals row).

BEGIN;

CREATE TABLE public.referrals (
  id           uuid        NOT NULL  DEFAULT gen_random_uuid(),
  referrer_id  uuid        NOT NULL,
  referred_id  uuid        NOT NULL,
  bonus_amount integer     NOT NULL,
  bonus_paid   boolean     NOT NULL  DEFAULT false,
  triggered_at timestamptz           DEFAULT NULL,
  created_at   timestamptz NOT NULL  DEFAULT NOW(),

  CONSTRAINT referrals_pkey PRIMARY KEY (id),
  CONSTRAINT referrals_referrer_fk
    FOREIGN KEY (referrer_id) REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT referrals_referred_fk
    FOREIGN KEY (referred_id) REFERENCES auth.users(id) ON DELETE RESTRICT,
  -- One referral record per referred user (each person can only be referred once)
  CONSTRAINT referrals_referred_unique UNIQUE (referred_id),
  CONSTRAINT referrals_pair_unique UNIQUE (referrer_id, referred_id),
  CONSTRAINT referrals_no_self_referral
    CHECK (referrer_id <> referred_id),
  CONSTRAINT referrals_bonus_positive
    CHECK (bonus_amount > 0)
);

COMMIT;
