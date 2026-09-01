-- 0017_fn_verify_submission.sql
-- Applied: 2026-09-01 via psql (connection string from SECRETS.md)
-- Submission verification (§7.2) — admin approve/reject, atomic, one transaction.
--
-- Called ONLY by the verify-submission Edge Function via the service-role key.
-- SECURITY DEFINER + execute revoked from PUBLIC/anon/authenticated (same grant
-- pattern as 0015): the Edge Function has already authenticated the caller as
-- su_admin via JWT before invoking this; the DB function itself takes no trust
-- from the caller.
--
-- WALLET SEMANTICS (verified finding, Milestone 11 — supersedes the stale M2
-- design comment in 0005_wallets.sql): create-submission does NOT write the
-- submitter's wallet at submission time, so the payout is NOT yet included in
-- balance_total when this function runs. On APPROVAL both balance_verified AND
-- balance_total are incremented by the task's payout_amount. On REJECTION no
-- wallet change occurs.
--
-- REFERRALS: per Milestone 8 (interpretation A, owner-approved), the referral
-- bonus is paid at submission creation time by trigger 0016. This function
-- deliberately does NOT touch referrals.
--
-- Concurrency: the submissions row is locked FOR UPDATE and status is
-- re-checked, so a double-click/concurrent review can pay at most once.
-- Task slot: completion_count is incremented with the race-safe
-- `UPDATE ... WHERE completion_count < max_completions RETURNING id` pattern
-- from the Milestone 2 plan — if the task filled up while submissions were
-- pending, the approval fails with SUBMISSION:TASK_FULL and NOTHING changes.

CREATE OR REPLACE FUNCTION public.fn_verify_submission(
  p_submission_id    uuid,
  p_action           text,
  p_rejection_reason text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_submission  public.submissions%ROWTYPE;
  v_task        public.tasks%ROWTYPE;
  v_updated     uuid;
BEGIN
  IF p_action NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'SUBMISSION:INVALID_ACTION';
  END IF;
  IF p_action = 'rejected' AND (p_rejection_reason IS NULL OR btrim(p_rejection_reason) = '') THEN
    RAISE EXCEPTION 'SUBMISSION:REASON_REQUIRED';
  END IF;

  -- Lock the submission row; re-check pending status (idempotency guard).
  SELECT * INTO v_submission
    FROM submissions
    WHERE id = p_submission_id
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SUBMISSION:NOT_FOUND';
  END IF;
  IF v_submission.status <> 'pending' THEN
    RAISE EXCEPTION 'SUBMISSION:ALREADY_REVIEWED';
  END IF;

  SELECT * INTO v_task FROM tasks WHERE id = v_submission.task_id;

  -- ── Approval path ───────────────────────────────────────────────────────────
  IF p_action = 'approved' THEN
    -- Race-safe slot increment (fails if task is full at approval time).
    UPDATE tasks
       SET completion_count = completion_count + 1,
           updated_at       = now()
     WHERE id = v_submission.task_id
       AND completion_count < max_completions
    RETURNING id INTO v_updated;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'SUBMISSION:TASK_FULL';
    END IF;

    -- Payout: first credit of the amount — BOTH columns (see header note).
    UPDATE wallets
       SET balance_verified = balance_verified + v_task.payout_amount,
           balance_total    = balance_total    + v_task.payout_amount,
           updated_at       = now()
     WHERE user_id = v_submission.user_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'SUBMISSION:WALLET_MISSING';
    END IF;

    UPDATE submissions
       SET status = 'approved',
           reviewed_at = now()
     WHERE id = v_submission.id
       AND status = 'pending'
    RETURNING id INTO v_updated;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'SUBMISSION:ALREADY_REVIEWED';
    END IF;

    RETURN 'approved';
  END IF;

  -- ── Rejection path (no wallet change, no referrals touch) ──────────────────
  UPDATE submissions
     SET status = 'rejected',
         rejection_reason = p_rejection_reason,
         reviewed_at = now()
   WHERE id = v_submission.id
     AND status = 'pending'
  RETURNING id INTO v_updated;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SUBMISSION:ALREADY_REVIEWED';
  END IF;

  RETURN 'rejected';
END;
$$;

-- Execute is restricted to the service-role key only.
REVOKE EXECUTE ON FUNCTION public.fn_verify_submission(uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_verify_submission(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_verify_submission(uuid, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.fn_verify_submission(uuid, text, text) TO service_role;