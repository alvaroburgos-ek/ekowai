-- =============================================================================
-- 20260723_fll_gar27_projectdata_c1_qnot — PROJECT-DATA (live project only)
-- =============================================================================
-- Author: Alvaro Burgos <alvaro.burgos@ekowai.com>
-- Co-authored: Claude Opus 4.8 <noreply@anthropic.com>
--
-- Corrects the live GAR-27 project f7249ae1-bbda-415f-ac83-991a282d2c8b:
--   - consumed C (field d6f02425-…): 0.83 -> 1.0  (RATIFIED, PDF-attested C = 1)
--   - derived Q_NOT (field a16564d1-…): 5.237382 -> 4.6025
--        = (317 - 142*1.0) * (263/10000) = 175 * 0.0263 = 4.6025
-- This is PROJECT DATA, not schema. Scoped to the single project + field ids.
-- Idempotent (value overwrite). No audit_status/status touched.
-- =============================================================================

UPDATE project_parameters
SET value_number = '1.0'
WHERE project_id = 'f7249ae1-bbda-415f-ac83-991a282d2c8b'
  AND field_id   = 'd6f02425-71c9-4a85-bfd2-35069a118771';

UPDATE project_parameters
SET value_number = '4.6025'
WHERE project_id = 'f7249ae1-bbda-415f-ac83-991a282d2c8b'
  AND field_id   = 'a16564d1-60d8-4bc4-bb5b-aab4041baa79';
