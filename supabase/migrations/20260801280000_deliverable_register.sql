-- Deliverable register (roadmap Stage 10, AGB §3(2)).
-- First-class, automatic record of every emitted deliverable per project —
-- written by the PDF/export routes AFTER a successful buffer build. A register
-- failure must never break a document emission (app-side contract in
-- src/lib/deliverables/record.ts). Additive only — no existing table is touched.
CREATE TABLE IF NOT EXISTS deliverables (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  standard_code text,
  kind          text NOT NULL,
  title         text NOT NULL,
  snapshot_id   uuid,
  emitted_by    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  emitted_at    timestamptz NOT NULL DEFAULT now(),
  meta          jsonb
);

CREATE INDEX IF NOT EXISTS deliverables_project_emitted_idx
  ON deliverables (project_id, emitted_at);

ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY;

-- Org-scoped via project; mirrors effort_entries RLS
-- (source: supabase/migrations/20260801200000_effort_entries.sql).
DROP POLICY IF EXISTS "deliverables_all_org" ON deliverables;
CREATE POLICY "deliverables_all_org"
  ON deliverables FOR ALL TO authenticated
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
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.deliverables TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.deliverables TO service_role;
