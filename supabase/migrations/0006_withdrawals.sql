-- 0006_withdrawals.sql
-- Applied: 2026-09-01 04:51 via psql (connection string from SECRETS.md)
-- Withdrawals table: user withdrawal requests.
-- Driven by §6.3 (wallet/withdrawal), §7.3 (admin withdrawal management).
-- Users INSERT their own withdrawal requests (status defaults to 'pending').
-- Status transitions (pending → completed/rejected) are ONLY done by the
-- process-withdrawal Edge Function via service-role key.

BEGIN;

CREATE TABLE public.withdrawals (
  id             uuid               NOT NULL  DEFAULT gen_random_uuid(),
  user_id        uuid               NOT NULL,
  amount         integer            NOT NULL,
  provider       mfs_provider       NOT NULL,
  account_number text               NOT NULL,
  status         withdrawal_status  NOT NULL  DEFAULT 'pending',
  admin_note     text                         DEFAULT NULL,
  requested_at   timestamptz        NOT NULL  DEFAULT NOW(),
  processed_at   timestamptz                  DEFAULT NULL,

  CONSTRAINT withdrawals_pkey PRIMARY KEY (id),
  CONSTRAINT withdrawals_user_fk
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT withdrawals_amount_positive
    CHECK (amount > 0)
);

COMMIT;
