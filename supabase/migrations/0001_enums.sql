-- 0001_enums.sql
-- Applied: 2026-09-01 04:51 via psql (connection string from SECRETS.md)
-- All Postgres native enum types for WA Marketing BD.
-- Values mirror packages/shared-types/src/constants.ts exactly — keep in sync.
-- Using native ENUM (not text + CHECK) for storage efficiency and tooling clarity.

BEGIN;

-- User roles — matches USER_ROLE in constants.ts
CREATE TYPE user_role AS ENUM ('user', 'su_admin');

-- Task lifecycle — matches TASK_STATUS in constants.ts
-- 'expired' is set by trigger when expires_at < NOW() or by admin action
CREATE TYPE task_status AS ENUM ('active', 'paused', 'expired');

-- Submission review state — matches SUBMISSION_STATUS in constants.ts
CREATE TYPE submission_status AS ENUM ('pending', 'approved', 'rejected');

-- Withdrawal lifecycle — matches WITHDRAWAL_STATUS in constants.ts
CREATE TYPE withdrawal_status AS ENUM ('pending', 'completed', 'rejected');

-- Bangladeshi MFS providers — matches MFS_PROVIDER in constants.ts
CREATE TYPE mfs_provider AS ENUM ('bkash', 'nagad', 'rocket', 'upay');

-- Support ticket lifecycle — matches TICKET_STATUS in constants.ts
CREATE TYPE ticket_status AS ENUM ('open', 'replied', 'closed');

COMMIT;
