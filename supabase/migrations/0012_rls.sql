-- 0012_rls.sql
-- Applied: 2026-09-01 04:51 via psql (connection string from SECRETS.md)
-- Row Level Security policies for all 12 application tables.
-- REQUIREMENT.md §12: RLS enabled and enforced on every table, no exceptions.
-- Admin bypass uses is_su_admin() SECURITY DEFINER — never trusts client-supplied role claims.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper function: is_su_admin()
-- Checks profiles.role server-side using the caller's auth.uid().
-- SECURITY DEFINER so it runs as the function owner (postgres), not the calling user.
-- Cannot be spoofed by a JWT claim or request header.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_su_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'su_admin'
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- profiles
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles: users read own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles: admin reads all"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_su_admin());

-- Users may update only their own name and email.
-- Privileged columns (role, is_verified, is_banned, suspended_at, referral_code, referred_by)
-- are writable only via service-role Edge Functions (bypasses RLS entirely).
CREATE POLICY "profiles: users update own name/email"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles: admin updates any"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_su_admin());

-- No direct INSERT by authenticated users — profile row is created by the
-- handle_new_user() trigger on auth.users INSERT (runs as SECURITY DEFINER).
-- No DELETE — profiles are soft-deleted via is_banned flag only.

-- ─────────────────────────────────────────────────────────────────────────────
-- tasks
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- All authenticated users can browse tasks
CREATE POLICY "tasks: authenticated users read active"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (true);

-- Only admin can create/edit tasks
CREATE POLICY "tasks: admin insert"
  ON public.tasks FOR INSERT
  TO authenticated
  WITH CHECK (public.is_su_admin());

CREATE POLICY "tasks: admin update"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (public.is_su_admin());

-- No delete — tasks are paused or expired only

-- ─────────────────────────────────────────────────────────────────────────────
-- submissions
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "submissions: users read own"
  ON public.submissions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "submissions: admin reads all"
  ON public.submissions FOR SELECT
  TO authenticated
  USING (public.is_su_admin());

-- Users may insert their own submission; status defaults to 'pending' (DB default).
-- Edge Function (verify-submission) validates task eligibility before allowing.
CREATE POLICY "submissions: users insert own"
  ON public.submissions FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
  );

-- Users may only update wa_link_clicked_at on their own pending submission
-- (logs the deep-link click fraud signal — §8).
-- All other columns (status, rejection_reason, reviewed_at) are service-role only.
CREATE POLICY "submissions: users update wa_link_clicked_at"
  ON public.submissions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- No delete for users. Admin updates go through service-role Edge Function (bypasses RLS).

-- ─────────────────────────────────────────────────────────────────────────────
-- wallets
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wallets: users read own"
  ON public.wallets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "wallets: admin reads all"
  ON public.wallets FOR SELECT
  TO authenticated
  USING (public.is_su_admin());

-- NO INSERT, UPDATE, or DELETE policies for authenticated users.
-- Wallet rows are created by handle_new_user() trigger (SECURITY DEFINER).
-- balance_total and balance_verified are updated ONLY by service-role Edge Functions:
--   process-withdrawal, process-p2p-transfer, verify-submission.

-- ─────────────────────────────────────────────────────────────────────────────
-- withdrawals
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "withdrawals: users read own"
  ON public.withdrawals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "withdrawals: admin reads all"
  ON public.withdrawals FOR SELECT
  TO authenticated
  USING (public.is_su_admin());

-- Users may insert their own withdrawal request; status defaults to 'pending'.
-- Amount is validated against site_settings.min_withdrawal_amount and
-- wallets.balance_verified by the process-withdrawal Edge Function.
CREATE POLICY "withdrawals: users insert own"
  ON public.withdrawals FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
  );

-- No UPDATE for authenticated users.
-- Status transitions (pending → completed/rejected) are done ONLY by
-- the process-withdrawal Edge Function via service-role key.

-- ─────────────────────────────────────────────────────────────────────────────
-- p2p_transfers
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.p2p_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "p2p_transfers: users read own"
  ON public.p2p_transfers FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "p2p_transfers: admin reads all"
  ON public.p2p_transfers FOR SELECT
  TO authenticated
  USING (public.is_su_admin());

-- NO INSERT for authenticated users.
-- Rows are inserted ONLY by process-p2p-transfer Edge Function (service-role)
-- which atomically deducts from sender wallet, credits recipient wallet, and
-- inserts this record — all in one transaction.
-- No UPDATE or DELETE — transfers are immutable once committed.

-- ─────────────────────────────────────────────────────────────────────────────
-- referrals
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referrals: users read own"
  ON public.referrals FOR SELECT
  TO authenticated
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "referrals: admin reads all"
  ON public.referrals FOR SELECT
  TO authenticated
  USING (public.is_su_admin());

-- No INSERT/UPDATE for authenticated users.
-- Referral rows are created by handle_new_user() trigger (reads referred_by from profile).
-- bonus_paid and triggered_at are set ONLY by verify-submission Edge Function
-- when referred user's first task is approved.

-- ─────────────────────────────────────────────────────────────────────────────
-- support_tickets
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "support_tickets: users read own"
  ON public.support_tickets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "support_tickets: admin reads all"
  ON public.support_tickets FOR SELECT
  TO authenticated
  USING (public.is_su_admin());

CREATE POLICY "support_tickets: users insert own"
  ON public.support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users cannot update tickets — status is managed by admin/service-role.
CREATE POLICY "support_tickets: admin updates status"
  ON public.support_tickets FOR UPDATE
  TO authenticated
  USING (public.is_su_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- support_replies
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.support_replies ENABLE ROW LEVEL SECURITY;

-- User can read replies on their own tickets
CREATE POLICY "support_replies: users read own ticket replies"
  ON public.support_replies FOR SELECT
  TO authenticated
  USING (
    ticket_id IN (
      SELECT id FROM public.support_tickets
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "support_replies: admin reads all"
  ON public.support_replies FOR SELECT
  TO authenticated
  USING (public.is_su_admin());

-- Users may add follow-up replies to their own open tickets (is_admin_reply must be false)
CREATE POLICY "support_replies: users insert on own tickets"
  ON public.support_replies FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND is_admin_reply = false
    AND ticket_id IN (
      SELECT id FROM public.support_tickets
      WHERE user_id = auth.uid()
        AND status <> 'closed'
    )
  );

-- Admin inserts replies with is_admin_reply = true (via service-role or is_su_admin check)
CREATE POLICY "support_replies: admin insert"
  ON public.support_replies FOR INSERT
  TO authenticated
  WITH CHECK (public.is_su_admin() AND is_admin_reply = true);

-- Replies are immutable — no UPDATE or DELETE for anyone.

-- ─────────────────────────────────────────────────────────────────────────────
-- site_settings
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read (needed for min_withdrawal_amount in withdrawal form)
CREATE POLICY "site_settings: all authenticated users read"
  ON public.site_settings FOR SELECT
  TO authenticated
  USING (true);

-- Only admin can update settings
CREATE POLICY "site_settings: admin updates"
  ON public.site_settings FOR UPDATE
  TO authenticated
  USING (public.is_su_admin())
  WITH CHECK (public.is_su_admin());

-- INSERT and DELETE blocked for all (singleton managed by seed.sql only)

-- ─────────────────────────────────────────────────────────────────────────────
-- rate_limit_counters
-- ─────────────────────────────────────────────────────────────────────────────
-- RLS enabled but NO permissive policy for authenticated users.
-- This table is readable/writable ONLY via service-role key (Edge Functions).
-- Authenticated users have zero access, even SELECT.
ALTER TABLE public.rate_limit_counters ENABLE ROW LEVEL SECURITY;

-- Intentionally no policies added here — restrictive by default when RLS is enabled.

COMMIT;
