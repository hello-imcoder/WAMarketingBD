-- 0014_indexes.sql
-- Applied: 2026-09-01 04:51 via psql (connection string from SECRETS.md)
-- Performance indexes for WA Marketing BD.
-- Covers all FK columns, hot query paths, and partial indexes for fraud signals.

BEGIN;

-- ─── profiles ────────────────────────────────────────────────────────────────
-- UNIQUE indexes already created in 0002_profiles.sql (phone, referral_code).
-- Adding FK traversal index for referred_by.
CREATE INDEX profiles_referred_by_idx
  ON public.profiles (referred_by)
  WHERE referred_by IS NOT NULL;

-- ─── tasks ───────────────────────────────────────────────────────────────────
-- Hot query: list active tasks that haven't expired
CREATE INDEX tasks_status_expires_idx
  ON public.tasks (status, expires_at);

-- ─── submissions ─────────────────────────────────────────────────────────────
-- UNIQUE index already on (user_id, task_id) from 0004_submissions.sql.
-- Additional indexes for admin panel and fraud detection.

-- Admin: list all submissions for a specific task
CREATE INDEX submissions_task_id_idx
  ON public.submissions (task_id);

-- Admin: filter by status (pending review queue)
CREATE INDEX submissions_status_idx
  ON public.submissions (status);

-- Fraud detection: duplicate screenshot lookup (§8)
-- Partial index — excludes NULL hashes (no screenshot submitted)
CREATE INDEX submissions_screenshot_hash_idx
  ON public.submissions (screenshot_hash)
  WHERE screenshot_hash IS NOT NULL;

-- ─── wallets ─────────────────────────────────────────────────────────────────
-- UNIQUE index already on (user_id) from 0005_wallets.sql.

-- ─── withdrawals ─────────────────────────────────────────────────────────────
CREATE INDEX withdrawals_user_id_idx
  ON public.withdrawals (user_id);

CREATE INDEX withdrawals_status_idx
  ON public.withdrawals (status);

-- ─── p2p_transfers ───────────────────────────────────────────────────────────
CREATE INDEX p2p_sender_idx
  ON public.p2p_transfers (sender_id);

CREATE INDEX p2p_recipient_idx
  ON public.p2p_transfers (recipient_id);

-- ─── referrals ───────────────────────────────────────────────────────────────
-- UNIQUE indexes already on (referred_id) and (referrer_id, referred_id).
CREATE INDEX referrals_referrer_id_idx
  ON public.referrals (referrer_id);

-- ─── support_tickets ─────────────────────────────────────────────────────────
CREATE INDEX support_tickets_user_id_idx
  ON public.support_tickets (user_id);

CREATE INDEX support_tickets_status_idx
  ON public.support_tickets (status);

-- ─── support_replies ─────────────────────────────────────────────────────────
CREATE INDEX support_replies_ticket_id_idx
  ON public.support_replies (ticket_id);

-- ─── rate_limit_counters ─────────────────────────────────────────────────────
-- UNIQUE index already on (key) from 0011_rate_limit_counters.sql.
-- Additional index for opportunistic cleanup queries (DELETE WHERE expires_at < NOW())
CREATE INDEX rate_limit_expires_idx
  ON public.rate_limit_counters (expires_at);

COMMIT;
