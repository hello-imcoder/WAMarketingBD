-- 0023_screenshot_mode.sql
-- Replaces the boolean require_screenshot with a 3-value mode:
--   'must'     — screenshot upload required; submissions without one rejected
--   'optional' — screenshot upload allowed but never required (default)
--   'disabled' — screenshot upload hidden entirely on the task submit form
-- require_screenshot (0022) is kept and back-filled so old code reading it
-- stays correct; it now derives from the mode. Future writes go to
-- screenshot_mode only.

BEGIN;

ALTER TABLE public.site_settings
  ADD COLUMN screenshot_mode text NOT NULL DEFAULT 'optional'
  CONSTRAINT site_settings_screenshot_mode_valid
    CHECK (screenshot_mode IN ('must', 'optional', 'disabled'));

-- Keep the old boolean consistent: true only when mode = 'must'.
UPDATE public.site_settings
SET require_screenshot = (screenshot_mode = 'must');

COMMIT;
