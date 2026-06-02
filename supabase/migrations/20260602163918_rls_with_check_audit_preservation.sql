-- Three security fixes for RLS + audit-trail preservation:
--
-- 1. RLS WITH CHECK on org/projects/profiles UPDATE policies.
--    The original FOR UPDATE USING(...) clauses had no WITH CHECK, so an
--    authenticated member could move a row out of their org by setting
--    org_id to a foreign value (USING only filters which rows are eligible
--    to be updated; without WITH CHECK the post-image is unconstrained).
--
-- 2. calculation_snapshots → projects / worksheet_instances FKs flipped from
--    ON DELETE CASCADE to ON DELETE RESTRICT. Snapshots are the engineer's
--    frozen approval evidence and must not vanish when a project is deleted.
--    audit_log and report_archives are already RESTRICT for the same reason.
--
-- 3. report_archives.calculation_id was a NOT NULL FK to the legacy
--    `calculations` table which was dropped in 20260520120000. The action
--    layer has been inserting a zero-UUID placeholder to satisfy NOT NULL.
--    Drop NOT NULL so new rows can omit it cleanly; the column itself is
--    kept for backward-compat with any tooling that still reads it.
--
-- Each block is idempotent so re-applying is safe.

-- 1. WITH CHECK on UPDATE policies ----------------------------------------

DROP POLICY IF EXISTS projects_update ON projects;
CREATE POLICY projects_update ON projects
  FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid()
        AND role IN ('owner','admin','engineer')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid()
        AND role IN ('owner','admin','engineer')
    )
  );

DROP POLICY IF EXISTS orgs_update ON orgs;
CREATE POLICY orgs_update ON orgs
  FOR UPDATE
  USING (
    id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  )
  WITH CHECK (
    id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

DROP POLICY IF EXISTS profiles_update_own ON profiles;
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 2. Preserve calculation_snapshots across project deletion ---------------

ALTER TABLE calculation_snapshots
  DROP CONSTRAINT IF EXISTS calculation_snapshots_project_id_fkey;
ALTER TABLE calculation_snapshots
  ADD CONSTRAINT calculation_snapshots_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT;

ALTER TABLE calculation_snapshots
  DROP CONSTRAINT IF EXISTS calculation_snapshots_worksheet_instance_id_fkey;
ALTER TABLE calculation_snapshots
  ADD CONSTRAINT calculation_snapshots_worksheet_instance_id_fkey
  FOREIGN KEY (worksheet_instance_id) REFERENCES worksheet_instances(id) ON DELETE RESTRICT;

-- 3. report_archives.calculation_id no longer needs a value ---------------

ALTER TABLE report_archives ALTER COLUMN calculation_id DROP NOT NULL;
