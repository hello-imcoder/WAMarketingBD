-- supabase/seed.sql
-- Seed data for WA Marketing BD.
-- Run AFTER all migrations:
--   psql "$POSTGRES_CONNECTION_STRING" -f supabase/seed.sql
--
-- Contents:
--   1. site_settings singleton row (admin-configurable defaults)
--   2. Placeholder for su_admin bootstrap (Milestone 3)

-- ─── site_settings singleton ─────────────────────────────────────────────────
-- min_withdrawal_amount = 50 BDT  (confirmed by owner)
-- referral_bonus_amount = 10 BDT  (confirmed by owner)
-- Both are admin-changeable from the admin panel after this seed is applied.

INSERT INTO public.site_settings (id, min_withdrawal_amount, referral_bonus_amount)
VALUES (1, 50, 10)
ON CONFLICT (id) DO UPDATE SET
  min_withdrawal_amount = EXCLUDED.min_withdrawal_amount,
  referral_bonus_amount = EXCLUDED.referral_bonus_amount,
  updated_at = NOW();

-- ─── su_admin bootstrap ───────────────────────────────────────────────────────
-- The su_admin account is created at Milestone 3 via the Supabase Auth API
-- (not directly in Postgres — password must be hashed by Supabase Auth).
-- Procedure at Milestone 3:
--   1. Call supabase.auth.admin.createUser({ email: SU_ADMIN_EMAIL, password: SU_ADMIN_PASSWORD })
--      using the service-role key from SECRETS.md.
--   2. Then run:
--      UPDATE public.profiles SET role = 'su_admin' WHERE phone = '<SU_ADMIN_PHONE>';
--      (or use the returned user id directly)
--   3. Store SU_ADMIN credentials in a password manager and clear from SECRETS.md.

-- No SQL here yet — placeholder comment only. Do not create admin user rows manually.
