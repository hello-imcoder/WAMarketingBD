-- 0007_p2p_transfers.sql
-- Applied: 2026-09-01 04:51 via psql (connection string from SECRETS.md)
-- P2P transfers table: user-to-user money transfers from verified balance.
-- Driven by §6.4.
-- No fee or limit columns — explicitly out of scope for v1 (§14).
-- Transfers are atomic: they either fully commit or fully roll back.
-- No status column — there is no "pending" P2P state.
-- Only process-p2p-transfer Edge Function (service-role) inserts rows.

BEGIN;

CREATE TABLE public.p2p_transfers (
  id             uuid        NOT NULL  DEFAULT gen_random_uuid(),
  sender_id      uuid        NOT NULL,
  recipient_id   uuid        NOT NULL,
  amount         integer     NOT NULL,
  transferred_at timestamptz NOT NULL  DEFAULT NOW(),

  CONSTRAINT p2p_transfers_pkey PRIMARY KEY (id),
  CONSTRAINT p2p_sender_fk
    FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT p2p_recipient_fk
    FOREIGN KEY (recipient_id) REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT p2p_amount_positive
    CHECK (amount > 0),
  CONSTRAINT p2p_no_self_transfer
    CHECK (sender_id <> recipient_id)
);

COMMIT;
