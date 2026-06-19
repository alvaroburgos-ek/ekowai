BEGIN;

-- ----- project_members: project-scoped external participants -----------------
CREATE TABLE IF NOT EXISTS project_members (
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role       member_role NOT NULL,
  invited_by uuid NOT NULL REFERENCES profiles(id),
  invited_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id),
  CONSTRAINT project_members_external_role CHECK (role IN ('client','designer'))
);
CREATE INDEX IF NOT EXISTS project_members_user_idx ON project_members(user_id);

-- Table-level grants (RLS governs rows; PostgREST needs the table grant first)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_members TO service_role;

ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- External participant reads only its own membership row(s)
CREATE POLICY "project_members_select_self"
  ON project_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Staff (org members of the project's org) read + manage memberships
CREATE POLICY "project_members_all_staff"
  ON project_members FOR ALL TO authenticated
  USING (project_id IN (
    SELECT p.id FROM projects p
    JOIN org_members om ON om.org_id = p.org_id
    WHERE om.user_id = auth.uid()
  ))
  WITH CHECK (project_id IN (
    SELECT p.id FROM projects p
    JOIN org_members om ON om.org_id = p.org_id
    WHERE om.user_id = auth.uid()
  ));

-- ----- IP-Layer-2 fix: standards library readable by STAFF ONLY --------------
-- Was USING(true) -> any authenticated user (incl. external client/designer)
-- could read every question and formula. Now gated on "is staff" (has an
-- org_members row). Externals get zero rows. service_role bypasses RLS, so the
-- curated server actions can still read the library to build outcomes.
DROP POLICY IF EXISTS "standards_read_authenticated"               ON standards;
DROP POLICY IF EXISTS "worksheet_templates_read_authenticated"     ON worksheet_templates;
DROP POLICY IF EXISTS "worksheet_sections_read_authenticated"      ON worksheet_sections;
DROP POLICY IF EXISTS "fields_read_authenticated"                  ON fields;
DROP POLICY IF EXISTS "equations_read_authenticated"               ON equations;
DROP POLICY IF EXISTS "compliance_requirements_read_authenticated" ON compliance_requirements;

CREATE POLICY "standards_read_staff" ON standards
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM org_members WHERE user_id = auth.uid()));
CREATE POLICY "worksheet_templates_read_staff" ON worksheet_templates
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM org_members WHERE user_id = auth.uid()));
CREATE POLICY "worksheet_sections_read_staff" ON worksheet_sections
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM org_members WHERE user_id = auth.uid()));
CREATE POLICY "fields_read_staff" ON fields
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM org_members WHERE user_id = auth.uid()));
CREATE POLICY "equations_read_staff" ON equations
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM org_members WHERE user_id = auth.uid()));
CREATE POLICY "compliance_requirements_read_staff" ON compliance_requirements
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM org_members WHERE user_id = auth.uid()));

COMMIT;
