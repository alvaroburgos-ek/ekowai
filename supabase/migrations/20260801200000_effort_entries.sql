-- Effort logging (roadmap v2 §2.9 — dependency for the Angebots-Engine).
-- Per-project work-time entries; `position` is free text until offer positions
-- arrive with Slice E1. Additive only — no existing table is touched.
CREATE TABLE IF NOT EXISTS effort_entries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  work_date   date NOT NULL,
  hours       numeric NOT NULL,
  position    text NOT NULL,
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS effort_entries_project_date_idx
  ON effort_entries (project_id, work_date);

ALTER TABLE effort_entries ENABLE ROW LEVEL SECURITY;

-- Org-scoped via project; mirrors co2_activity_lines / project_parameters RLS
-- (source: supabase/migrations/20260626150000_co2_activity_lines.sql).
DROP POLICY IF EXISTS "effort_entries_all_org" ON effort_entries;
CREATE POLICY "effort_entries_all_org"
  ON effort_entries FOR ALL TO authenticated
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

-- Table-level grants for PostgREST roles (RLS governs rows; mirrors
-- supabase/migrations/20260520130000_grants.sql).
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.effort_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.effort_entries TO service_role;
