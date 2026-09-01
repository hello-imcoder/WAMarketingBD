-- 0016_fn_referral_bonus.sql
-- Referral bonus trigger — INTERPRETATION (A), owner-approved: the bonus fires
-- when the referred user creates their FIRST-EVER submission (§6.5 "completes
-- their first task" = submits), regardless of later admin approval.
--
-- Atomic with the submission INSERT (same transaction): if the submission is
-- the referred user's first and an unpaid referrals row exists, credit the
-- referrer's wallet (balance_verified + balance_total) and mark the referral
-- bonus_paid = true, triggered_at = now().
--
-- Idempotency/concurrency: the referrals row is locked FOR UPDATE and the
-- bonus_paid = false guard is re-checked inside the same statement, so a
-- concurrent first-submission race can pay at most once. bonus_amount is the
-- snapshot taken at referral creation (0013 handle_new_user), NOT a live read
-- of site_settings — admin amount changes never alter pending referrals.

CREATE OR REPLACE FUNCTION public.fn_referral_bonus_on_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral_id       uuid;
  v_referrer_id       uuid;
  v_bonus_amount      integer;
  v_is_first_submission boolean;
BEGIN
  -- Is this the referred user's first-ever submission?
  SELECT NOT EXISTS (
    SELECT 1 FROM public.submissions
      WHERE user_id = NEW.user_id AND id <> NEW.id
  ) INTO v_is_first_submission;

  IF NOT v_is_first_submission THEN
    RETURN NEW;
  END IF;

  -- Lock the (at most one) unpaid referral row for this user.
  SELECT id, referrer_id, bonus_amount
    INTO v_referral_id, v_referrer_id, v_bonus_amount
    FROM public.referrals
    WHERE referred_id = NEW.user_id AND bonus_paid = false
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  UPDATE public.referrals
     SET bonus_paid = true,
         triggered_at = now()
   WHERE id = v_referral_id
     AND bonus_paid = false;

  IF NOT FOUND THEN
    -- Lost a concurrent race; the other transaction paid it.
    RETURN NEW;
  END IF;

  UPDATE public.wallets
     SET balance_verified = balance_verified + v_bonus_amount,
         balance_total    = balance_total    + v_bonus_amount,
         updated_at       = now()
   WHERE user_id = v_referrer_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_referral_bonus_on_submission ON public.submissions;
CREATE TRIGGER trg_referral_bonus_on_submission
  AFTER INSERT ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_referral_bonus_on_submission();
