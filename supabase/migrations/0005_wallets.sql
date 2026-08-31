-- 0005_wallets.sql
-- Applied: 2026-09-01 04:51 via psql (connection string from SECRETS.md)
-- Wallets table: 1:1 with auth.users. Stored integer balance columns (approved decision).
-- Driven by §6.3 (wallet, two balances).
-- balance_total = balance_verified + sum of pending submission payouts.
-- Both columns updated atomically in Edge Function transactions — NEVER by direct user writes.
-- Row created by trigger in 0013_triggers.sql alongside the profiles row.

BEGIN;

CREATE TABLE public.wallets (
  id               uuid        NOT NULL  DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL,
  balance_total    integer     NOT NULL  DEFAULT 0,
  balance_verified integer     NOT NULL  DEFAULT 0,
  updated_at       timestamptz NOT NULL  DEFAULT NOW(),

  CONSTRAINT wallets_pkey PRIMARY KEY (id),
  CONSTRAINT wallets_user_fk
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT wallets_user_unique UNIQUE (user_id),
  CONSTRAINT wallets_total_nonneg
    CHECK (balance_total >= 0),
  CONSTRAINT wallets_verified_nonneg
    CHECK (balance_verified >= 0),
  CONSTRAINT wallets_verified_lte_total
    CHECK (balance_verified <= balance_total)
);

COMMIT;
