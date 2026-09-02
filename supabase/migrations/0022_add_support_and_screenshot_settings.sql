-- 0022_add_support_and_screenshot_settings.sql
-- Adds three new columns to the site_settings singleton:
--   support_notice_text / is_support_notice_active — admin-written notice shown
--     on the user Support page above the ticket form.
--   require_screenshot — global toggle; when true, the task submission form
--     requires a screenshot upload before the submit button is enabled, and
--     the create-submission Edge Function enforces this server-side.

BEGIN;

ALTER TABLE public.site_settings
  ADD COLUMN support_notice_text       text,
  ADD COLUMN is_support_notice_active  boolean NOT NULL DEFAULT false,
  ADD COLUMN require_screenshot        boolean NOT NULL DEFAULT false;

COMMIT;
