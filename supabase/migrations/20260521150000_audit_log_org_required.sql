BEGIN;

-- Backfill NULL org_id from project relationship
UPDATE audit_log al
SET org_id = p.org_id
FROM projects p
WHERE al.project_id = p.id AND al.org_id IS NULL;

-- Drop and recreate the SELECT policy without the IS NULL escape hatch
DROP POLICY IF EXISTS "audit_log_select_org" ON audit_log;

CREATE POLICY "audit_log_select_org"
  ON audit_log FOR SELECT TO authenticated
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

COMMIT;
