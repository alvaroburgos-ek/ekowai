-- Monitoring-Journal (interim — documentation-only precursor to roadmap
-- Stage 8). Deliberately stores NO parameter values/units: the time-series
-- schema is frozen later from the owner's Messplan. Until then this journal
-- only documents THAT something happened (Laborbericht eingegangen, Begehung
-- durchgeführt …) and optionally links the uploaded document.
-- Additive only — no existing table is touched.
CREATE TABLE IF NOT EXISTS monitoring_entries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  entry_date  date NOT NULL,
  -- 'laborbericht' | 'messung' | 'begehung' | 'wartung' | 'foto' | 'sonstiges'
  -- — validated app-side (src/lib/actions/monitoring-core.ts).
  category    text NOT NULL,
  note        text,
  -- Link to an uploaded lab report / photo.
  document_id uuid REFERENCES project_documents(id) ON DELETE SET NULL,
  created_by  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS monitoring_entries_project_date_idx
  ON monitoring_entries (project_id, entry_date);

ALTER TABLE monitoring_entries ENABLE ROW LEVEL SECURITY;

-- Org-scoped via project; mirrors effort_entries RLS
-- (source: supabase/migrations/20260801200000_effort_entries.sql).
DROP POLICY IF EXISTS "monitoring_entries_all_org" ON monitoring_entries;
CREATE POLICY "monitoring_entries_all_org"
  ON monitoring_entries FOR ALL TO authenticated
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
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.monitoring_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.monitoring_entries TO service_role;
