-- Verification audit columns on fields and equations.
--
-- Adds verified_by_user_id, verified_at, verification_note to the template
-- tables `fields` and `equations`. These columns capture WHO flipped a row
-- from imported_unverified to engineer_verified, WHEN, and optionally a short
-- note (e.g. "§5.4 Tab. B.1 stimmt").
--
-- All three columns are nullable: existing rows stay with NULL until a
-- platform engineer hits the new "Bestätigen" button. Idempotent via
-- IF NOT EXISTS so this is safe to re-run.
--
-- Companion code change: src/lib/db/schema.ts (drizzle), the new server
-- actions in src/lib/actions/verification.ts, and the "Bestätigen" button
-- in dynamic-field.tsx / equations-block.tsx.
--
-- Rollback (manual, only if regression demands it):
--   ALTER TABLE fields    DROP COLUMN IF EXISTS verification_note,
--                         DROP COLUMN IF EXISTS verified_at,
--                         DROP COLUMN IF EXISTS verified_by_user_id;
--   ALTER TABLE equations DROP COLUMN IF EXISTS verification_note,
--                         DROP COLUMN IF EXISTS verified_at,
--                         DROP COLUMN IF EXISTS verified_by_user_id;
-- Code rollback alone (revert the merge) does NOT require dropping the
-- columns — the old code simply doesn't reference them.

ALTER TABLE fields
  ADD COLUMN IF NOT EXISTS verified_by_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_at         timestamptz,
  ADD COLUMN IF NOT EXISTS verification_note   text;

ALTER TABLE equations
  ADD COLUMN IF NOT EXISTS verified_by_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_at         timestamptz,
  ADD COLUMN IF NOT EXISTS verification_note   text;
