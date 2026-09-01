-- 0021_fix_fks_for_profiles.sql
-- Fix foreign keys to properly reference public.profiles instead of auth.users
-- so that PostgREST can resolve implicit relationships without throwing PGRST200
-- when selecting profiles embedded data.
BEGIN;

-- submissions is already done via terminal, doing it again with IF EXISTS or just skip it?
-- Wait, I will just drop the constraint and re-add. Since it's already referencing profiles, I can just do it.

ALTER TABLE public.withdrawals 
  DROP CONSTRAINT withdrawals_user_fk, 
  ADD CONSTRAINT withdrawals_user_fk FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;

ALTER TABLE public.support_tickets 
  DROP CONSTRAINT support_tickets_user_fk, 
  ADD CONSTRAINT support_tickets_user_fk FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;

ALTER TABLE public.support_replies 
  DROP CONSTRAINT support_replies_author_fk, 
  ADD CONSTRAINT support_replies_author_fk FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;

ALTER TABLE public.wallets 
  DROP CONSTRAINT wallets_user_fk, 
  ADD CONSTRAINT wallets_user_fk FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.tasks 
  DROP CONSTRAINT IF EXISTS tasks_created_by_fk,
  DROP CONSTRAINT IF EXISTS tasks_created_by_fkey, 
  ADD CONSTRAINT tasks_created_by_fk FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;

ALTER TABLE public.referrals 
  DROP CONSTRAINT referrals_referrer_fk, 
  ADD CONSTRAINT referrals_referrer_fk FOREIGN KEY (referrer_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;

ALTER TABLE public.referrals 
  DROP CONSTRAINT referrals_referred_fk, 
  ADD CONSTRAINT referrals_referred_fk FOREIGN KEY (referred_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;

ALTER TABLE public.p2p_transfers 
  DROP CONSTRAINT p2p_sender_fk, 
  ADD CONSTRAINT p2p_sender_fk FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;

ALTER TABLE public.p2p_transfers 
  DROP CONSTRAINT p2p_recipient_fk, 
  ADD CONSTRAINT p2p_recipient_fk FOREIGN KEY (recipient_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;

COMMIT;
