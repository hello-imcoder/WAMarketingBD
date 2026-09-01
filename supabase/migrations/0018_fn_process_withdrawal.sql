-- 0018_fn_process_withdrawal.sql
-- Applied: 2026-09-01 via psql (connection string from SECRETS.md)
-- Withdrawal processing (§7.3) — admin complete/reject, atomic, one transaction.
--
-- Called ONLY by the process-withdrawal Edge Function via the service-role key.
-- SECURITY DEFINER + execute revoked from PUBLIC/anon/authenticated (same grant
-- pattern as 0015/0017).
--
-- Per Milestone 6 log: the amount is RE-VALIDATED here against
-- site_settings.min_withdrawal_amount (live read — settings are admin-
-- configurable, so any client-side check at request time may be stale) and
-- against wallets.balance_verified (the balance may have changed between the
-- user's request and the admin's approval). A failing validation raises a
-- typed exception and rolls the whole transaction back — no partial state,
-- never a negative balance (the 0005 CHECK constraints back this up too).
--
-- On COMPLETION the amount is deducted from BOTH balance_verified and
-- balance_total (money leaves the system — mirrors the 0015 P2P debit).
-- On REJECTION no wallet change occurs (the funds were never reserved).
-- The actual MFS transfer is performed manually by the admin OUTSIDE the app;
-- this function only records the financial state change (no MFS API — §14).

CREATE OR REPLACE FUNCTION public.fn_process_withdrawal(
  p_withdrawal_id uuid,
  p_action        text,
  p_admin_note    text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_withdrawal public.withdrawals%ROWTYPE;
  v_min_amount integer;
  v_balance    integer;
BEGIN
  IF p_action NOT IN ('completed', 'rejected') THEN
    RAISE EXCEPTION 'WITHDRAWAL:INVALID_ACTION';
  END IF;

  -- Lock the withdrawal row; re-check pending status (idempotency guard).
  SELECT * INTO v_withdrawal
    FROM withdrawals
    WHERE id = p_withdrawal_id
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'WITHDRAWAL:NOT_FOUND';
  END IF;
  IF v_withdrawal.status <> 'pending' THEN
    RAISE EXCEPTION 'WITHDRAWAL:ALREADY_PROCESSED';
  END IF;

  -- ── Completion path ─────────────────────────────────────────────────────────
  IF p_action = 'completed' THEN
    -- Live re-read of the admin-configurable minimum (never trust request-time checks).
    SELECT min_withdrawal_amount INTO v_min_amount FROM site_settings WHERE id = 1;
    IF v_min_amount IS NULL THEN
      RAISE EXCEPTION 'WITHDRAWAL:SETTINGS_MISSING';
    END IF;
    IF v_withdrawal.amount < v_min_amount THEN
      RAISE EXCEPTION 'WITHDRAWAL:BELOW_MIN';
    END IF;

    -- Lock wallet FOR UPDATE against concurrent balance changes.
    SELECT balance_verified INTO v_balance
      FROM wallets
      WHERE user_id = v_withdrawal.user_id
      FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'WITHDRAWAL:WALLET_MISSING';
    END IF;
    IF v_balance < v_withdrawal.amount THEN
      RAISE EXCEPTION 'WITHDRAWAL:INSUFFICIENT_BALANCE';
    END IF;

    UPDATE wallets
       SET balance_verified = balance_verified - v_withdrawal.amount,
           balance_total    = balance_total    - v_withdrawal.amount,
           updated_at       = now()
     WHERE user_id = v_withdrawal.user_id;

    UPDATE withdrawals
       SET status = 'completed',
           admin_note = p_admin_note,
           processed_at = now()
     WHERE id = v_withdrawal.id
       AND status = 'pending';

    RETURN 'completed';
  END IF;

  -- ── Rejection path (no wallet change) ───────────────────────────────────────
  UPDATE withdrawals
     SET status = 'rejected',
         admin_note = p_admin_note,
         processed_at = now()
   WHERE id = v_withdrawal.id
     AND status = 'pending';

  RETURN 'rejected';
END;
$$;

-- Execute is restricted to the service-role key only.
REVOKE EXECUTE ON FUNCTION public.fn_process_withdrawal(uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_process_withdrawal(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_process_withdrawal(uuid, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.fn_process_withdrawal(uuid, text, text) TO service_role;