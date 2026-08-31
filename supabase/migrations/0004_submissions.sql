-- 0004_submissions.sql
-- Applied: 2026-09-01 04:51 via psql (connection string from SECRETS.md)
-- Submissions table: user task submissions with fraud-signal columns.
-- Driven by §6.2 (submit flow), §8 (fraud prevention signals).
-- ONE submission per user per task ever (UNIQUE constraint — no resubmission after rejection).

BEGIN;

CREATE TABLE public.submissions (
  id                  uuid               NOT NULL  DEFAULT gen_random_uuid(),
  task_id             uuid               NOT NULL,
  user_id             uuid               NOT NULL,
  status              submission_status  NOT NULL  DEFAULT 'pending',
  screenshot_url      text                         DEFAULT NULL,
  screenshot_hash     text                         DEFAULT NULL,
  rejection_reason    text                         DEFAULT NULL,
  wa_link_clicked_at  timestamptz                  DEFAULT NULL,
  ip_address          inet                         DEFAULT NULL,
  device_fingerprint  text                         DEFAULT NULL,
  submitted_at        timestamptz        NOT NULL  DEFAULT NOW(),
  reviewed_at         timestamptz                  DEFAULT NULL,

  CONSTRAINT submissions_pkey PRIMARY KEY (id),
  CONSTRAINT submissions_task_fk
    FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE RESTRICT,
  CONSTRAINT submissions_user_fk
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE RESTRICT,
  -- One submission per user per task, ever. No resubmission after rejection (approved decision).
  CONSTRAINT submissions_user_task_unique UNIQUE (user_id, task_id)
);

COMMIT;
