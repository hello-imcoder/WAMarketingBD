-- 0009_support.sql
-- Applied: 2026-09-01 04:51 via psql (connection string from SECRETS.md)
-- Support tickets + replies tables.
-- Driven by §6.8 (user support), §7.5 (admin support).
-- separate support_replies table supports threaded conversation (approved decision).
-- admin_reply column removed from tickets (was in Milestone 1 stub — corrected here).

BEGIN;

CREATE TABLE public.support_tickets (
  id         uuid          NOT NULL  DEFAULT gen_random_uuid(),
  user_id    uuid          NOT NULL,
  subject    text          NOT NULL,
  message    text          NOT NULL,
  status     ticket_status NOT NULL  DEFAULT 'open',
  created_at timestamptz   NOT NULL  DEFAULT NOW(),
  updated_at timestamptz   NOT NULL  DEFAULT NOW(),

  CONSTRAINT support_tickets_pkey PRIMARY KEY (id),
  CONSTRAINT support_tickets_user_fk
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT support_tickets_subject_len
    CHECK (length(subject) BETWEEN 1 AND 200),
  CONSTRAINT support_tickets_message_len
    CHECK (length(message) BETWEEN 1 AND 5000)
);

CREATE TABLE public.support_replies (
  id             uuid        NOT NULL  DEFAULT gen_random_uuid(),
  ticket_id      uuid        NOT NULL,
  author_id      uuid        NOT NULL,
  is_admin_reply boolean     NOT NULL,
  body           text        NOT NULL,
  created_at     timestamptz NOT NULL  DEFAULT NOW(),

  CONSTRAINT support_replies_pkey PRIMARY KEY (id),
  CONSTRAINT support_replies_ticket_fk
    FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  CONSTRAINT support_replies_author_fk
    FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT support_replies_body_len
    CHECK (length(body) BETWEEN 1 AND 5000)
);

COMMIT;
