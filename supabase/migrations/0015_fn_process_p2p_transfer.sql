-- 0015_fn_process_p2p_transfer.sql
-- Atomic P2P transfer (§6.4): deduct sender's verified balance, credit recipient,
-- insert the p2p_transfers row — all in ONE transaction with rollback on failure.
--
-- Called ONLY by the process-p2p-transfer Edge Function via the service-role key.
-- SECURITY DEFINER is required so the function can update both wallets; the sender
-- identity is passed as a parameter, so execute is explicitly REVOKEd from
-- PUBLIC/anon/authenticated — only service_role may call it (§12: money logic is
-- server-side only, and a caller must never be able to transfer on someone
-- else's behalf).

CREATE OR REPLACE FUNCTION public.fn_process_p2p_transfer(
  p_sender          uuid,
  p_recipient_phone text,
  p_amount          integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient_id        uuid;
  v_recipient_banned    boolean;
  v_recipient_suspended timestamptz;
  v_sender_banned       boolean;
  v_sender_suspended    timestamptz;
  v_balance             integer;
  v_transfer_id         uuid;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'P2P:INVALID_AMOUNT';
  END IF;

  -- Recipient lookup + standing
  SELECT id, is_banned, suspended_at
    INTO v_recipient_id, v_recipient_banned, v_recipient_suspended
    FROM profiles
    WHERE phone = p_recipient_phone;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'P2P:RECIPIENT_NOT_FOUND';
  END IF;
  IF v_recipient_id = p_sender THEN
    RAISE EXCEPTION 'P2P:SELF_TRANSFER';
  END IF;

  -- Sender standing
  SELECT is_banned, suspended_at
    INTO v_sender_banned, v_sender_suspended
    FROM profiles
    WHERE id = p_sender;
  IF NOT FOUND
     OR v_sender_banned OR v_sender_suspended IS NOT NULL
     OR v_recipient_banned OR v_recipient_suspended IS NOT NULL THEN
    RAISE EXCEPTION 'P2P:ACCOUNT_BANNED';
  END IF;

  -- Lock the sender's wallet FOR UPDATE to prevent concurrent double-spend.
  SELECT balance_verified INTO v_balance
    FROM wallets
    WHERE user_id = p_sender
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'P2P:WALLET_MISSING';
  END IF;
  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'P2P:INSUFFICIENT_BALANCE';
  END IF;

  UPDATE wallets
     SET balance_verified = balance_verified - p_amount,
         balance_total    = balance_total    - p_amount,
         updated_at       = now()
   WHERE user_id = p_sender;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'P2P:WALLET_MISSING';
  END IF;

  UPDATE wallets
     SET balance_verified = balance_verified + p_amount,
         balance_total    = balance_total    + p_amount,
         updated_at       = now()
   WHERE user_id = v_recipient_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'P2P:WALLET_MISSING';
  END IF;

  INSERT INTO p2p_transfers (sender_id, recipient_id, amount)
    VALUES (p_sender, v_recipient_id, p_amount)
    RETURNING id INTO v_transfer_id;

  RETURN v_transfer_id;
END;
$$;

-- Execute is restricted to the service-role key only.
REVOKE EXECUTE ON FUNCTION public.fn_process_p2p_transfer(uuid, text, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_process_p2p_transfer(uuid, text, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_process_p2p_transfer(uuid, text, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.fn_process_p2p_transfer(uuid, text, integer) TO service_role;
