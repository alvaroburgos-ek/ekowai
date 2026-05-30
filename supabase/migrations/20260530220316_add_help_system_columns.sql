-- Help-system feature: project-level site profile + per-field norm-recommended
-- default. Both columns are nullable jsonb and consumed only by the new
-- feat/help-system code path (worksheet render-only prefill chain). Existing
-- rows are unaffected: NULL site_profile → no project-level prefill; NULL
-- default_value → no norm-default prefill. Safe to apply on prod ahead of the
-- code deploy (this was done out-of-band on 2026-05-30 as
-- `add_help_system_columns`; this file backfills the repo so dev/local and
-- fresh Supabase projects stay in sync). Idempotent via IF NOT EXISTS.
--
-- Rollback (manual, only if a regression demands removing the columns):
--   ALTER TABLE projects DROP COLUMN IF EXISTS site_profile;
--   ALTER TABLE fields   DROP COLUMN IF EXISTS default_value;
-- Code rollback alone (revert the merge) does NOT require dropping the
-- columns — the old code simply doesn't reference them.

ALTER TABLE projects ADD COLUMN IF NOT EXISTS site_profile jsonb;
ALTER TABLE fields   ADD COLUMN IF NOT EXISTS default_value jsonb;
