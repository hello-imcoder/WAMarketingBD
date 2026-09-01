-- 0020_add_admin_notice.sql
-- Adds popup notification configuration and tracking.

BEGIN;

-- 1. Add popup settings to the site_settings singleton table
ALTER TABLE public.site_settings
ADD COLUMN admin_notice_text text,
ADD COLUMN is_admin_notice_active boolean NOT NULL DEFAULT false,
ADD COLUMN admin_notice_updated_at timestamptz;

-- 2. Add last seen timestamp to the user profile table to track cross-device state
ALTER TABLE public.profiles
ADD COLUMN last_seen_notice_at timestamptz;

COMMIT;
