-- 🚩PROD-PROMOTE: apply to local now; human promotes to prod when coordinating tracks.
-- CO₂ activity working table — per-line fuel/electricity amounts + chosen UBA factor.
-- Consumed by Tasks 3–4 (factor resolver + recomputeB3Co2 action).
CREATE TABLE IF NOT EXISTS co2_activity_lines (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id           uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  worksheet_instance_id uuid REFERENCES worksheet_instances(id) ON DELETE SET NULL,
  scope                text NOT NULL,
  category             text NOT NULL,
  subcategory          text,
  amount               numeric NOT NULL,
  unit                 text NOT NULL,
  factor_uba_id        text NOT NULL,
  factor_source_version text NOT NULL,
  computed_tco2e       numeric,
  created_by           uuid,
  created_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE co2_activity_lines ENABLE ROW LEVEL SECURITY;

-- Org-scoped via project; mirrors project_parameters RLS policy exactly
-- (source: supabase/migrations/20260520120000_db_driven_rebuild.sql lines 269-280).
DROP POLICY IF EXISTS "co2_activity_lines_all_org" ON co2_activity_lines;
CREATE POLICY "co2_activity_lines_all_org"
  ON co2_activity_lines FOR ALL TO authenticated
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
