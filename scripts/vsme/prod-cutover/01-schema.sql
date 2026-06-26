-- ============================================================================
-- VSME PROD CUTOVER — Step 1: schema (additive, idempotent)
-- Target: Supabase prod project vadsmshzebefjreqcicl
-- Apply via Management API: POST /v1/projects/<ref>/database/query (PAT auth).
--
-- Verified prod state 2026-06-26 (read-only) — ALREADY PRESENT, so NOT touched:
--   fields.owner, fields.xbrl_element_id .......... present
--   emission_factors (table) ...................... present (0 rows, RLS on, 0 policies)
--   compliance_suggestions (table) ................ present
--   projects.created_by ........................... present  (NOT NULL backfill = MOOT)
--   project_parameters.citation_sources ........... present
--
-- This step adds ONLY the two genuinely-missing pieces. It does not alter any
-- existing table beyond adding one policy + one new table — the other 73
-- standards and shared structure are untouched.
-- ============================================================================

-- (1) emission_factors read policy — the table exists with RLS ENABLED but has
--     ZERO policies, so authenticated users currently cannot read it (default
--     deny) and CO2 factor resolution would fail. Reference data: read-only to
--     authenticated; writes stay service-role only.
ALTER TABLE emission_factors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "emission_factors_read_authenticated" ON emission_factors;
CREATE POLICY "emission_factors_read_authenticated"
  ON emission_factors FOR SELECT TO authenticated USING (true);

-- (2) co2_activity_lines — per-line activity table for the CO2 engine. New table,
--     org-scoped RLS mirrors project_parameters exactly.
CREATE TABLE IF NOT EXISTS co2_activity_lines (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  worksheet_instance_id uuid REFERENCES worksheet_instances(id) ON DELETE SET NULL,
  scope                 text NOT NULL,
  category              text NOT NULL,
  subcategory           text,
  amount                numeric NOT NULL,
  unit                  text NOT NULL,
  factor_uba_id         text NOT NULL,
  factor_source_version text NOT NULL,
  computed_tco2e        numeric,
  created_by            uuid,
  created_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE co2_activity_lines ENABLE ROW LEVEL SECURITY;
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
