-- ============================================================================
-- VSME PROD CUTOVER — Rollback. Reverses ONLY what this cutover added.
-- Does NOT drop pre-existing objects (emission_factors table, fields columns,
-- created_by, citation_sources, compliance_suggestions) — those predate VSME.
--
-- SAFE ONLY while no project has adopted the VSME standard yet. Once a project
-- has VSME worksheet_instances / parameters / co2 lines, deleting the standard
-- cascades into that project's data — stop and reassess before running §3/§4.
-- ============================================================================

-- (4) seeded emission factors (only the rows this cutover inserted)
DELETE FROM emission_factors WHERE source = 'UBA';

-- (3) VSME standard + all its library rows (cascades: worksheet_templates,
--     worksheet_sections, fields, equations, compliance_requirements)
DELETE FROM standards WHERE code = 'VSME';

-- (2) co2_activity_lines table (drops its RLS policy with it)
DROP TABLE IF EXISTS co2_activity_lines;

-- (1) emission_factors read policy (leave RLS enabled + the empty table as found)
DROP POLICY IF EXISTS "emission_factors_read_authenticated" ON emission_factors;
