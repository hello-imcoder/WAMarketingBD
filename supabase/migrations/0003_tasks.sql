-- 0003_tasks.sql
-- Applied: 2026-09-01 04:51 via psql (connection string from SECRETS.md)
-- Tasks table: WhatsApp-send tasks only. No generic task type (REQUIREMENT.md §14).
-- Driven by §7.1 (admin task management), §6.2 (user task flow).

BEGIN;

CREATE TABLE public.tasks (
  id               uuid         NOT NULL        DEFAULT gen_random_uuid(),
  whatsapp_number  text         NOT NULL,
  message          text         NOT NULL,
  payout_amount    integer      NOT NULL,
  max_completions  integer      NOT NULL,
  completion_count integer      NOT NULL        DEFAULT 0,
  expires_at       timestamptz  NOT NULL,
  status           task_status  NOT NULL        DEFAULT 'active',
  created_by       uuid         NOT NULL,
  created_at       timestamptz  NOT NULL        DEFAULT NOW(),
  updated_at       timestamptz  NOT NULL        DEFAULT NOW(),

  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_created_by_fk
    FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT tasks_whatsapp_number_fmt
    CHECK (whatsapp_number ~ '^[0-9]{7,15}$'),
  CONSTRAINT tasks_message_len
    CHECK (length(message) BETWEEN 1 AND 2000),
  CONSTRAINT tasks_payout_positive
    CHECK (payout_amount > 0),
  CONSTRAINT tasks_max_completions_positive
    CHECK (max_completions > 0),
  CONSTRAINT tasks_completion_count_nonneg
    CHECK (completion_count >= 0 AND completion_count <= max_completions),
  CONSTRAINT tasks_expires_future
    CHECK (expires_at > created_at)
);

COMMIT;
