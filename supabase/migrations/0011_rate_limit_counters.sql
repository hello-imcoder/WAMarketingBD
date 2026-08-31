-- 0011_rate_limit_counters.sql
-- Applied: 2026-09-01 04:51 via psql (connection string from SECRETS.md)
-- Rate limit counters: DB-backed, since Edge Functions share no in-memory state
-- on Supabase free tier (REQUIREMENT.md §12, Milestone 1 risk flag).
--
-- OPERATIONAL NOTE (for Milestone 11 Edge Function implementation):
-- pg_cron is NOT enabled on this project. Cleanup strategy is OPPORTUNISTIC INLINE:
-- Every rate-limit-checking Edge Function (login, submission, P2P transfer) must execute
-- this cleanup query BEFORE its own read/write, scoped to a small batch to bound latency:
--
--   DELETE FROM rate_limit_counters
--   WHERE expires_at < NOW()
--   AND ctid IN (
--     SELECT ctid FROM rate_limit_counters
--     WHERE expires_at < NOW()
--     LIMIT 50
--   );
--
-- This keeps the table bounded without a cron dependency at the cost of a small
-- extra query per rate-limited call. Document this in the Edge Function implementation.
-- See also: AGENT.md and CLAUDE.md operational notes section.
--
-- Key format examples:
--   'login:ip:<ip_address>'          — login attempts by IP
--   'submit:user:<user_uuid>'        — task submission rate limit per user
--   'p2p:user:<user_uuid>'           — P2P transfer rate limit per user
--   'withdraw:user:<user_uuid>'      — withdrawal request rate limit per user

BEGIN;

CREATE TABLE public.rate_limit_counters (
  id           uuid        NOT NULL  DEFAULT gen_random_uuid(),
  key          text        NOT NULL,
  count        integer     NOT NULL  DEFAULT 1,
  window_start timestamptz NOT NULL  DEFAULT NOW(),
  expires_at   timestamptz NOT NULL,

  CONSTRAINT rate_limit_counters_pkey PRIMARY KEY (id),
  CONSTRAINT rate_limit_counters_key_unique UNIQUE (key),
  CONSTRAINT rate_limit_count_positive CHECK (count > 0)
);

COMMIT;
