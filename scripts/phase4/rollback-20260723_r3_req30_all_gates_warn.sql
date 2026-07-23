-- =============================================================================
-- ROLLBACK 20260723_r3_req30_all_gates_warn
-- Restores REQ-30 (A138-28) to the pre-migration prod state:
--   severity  = 'block'
--   condition = 'final_compliance_verdict IS NOT NULL'
-- (captured live from prod vadsmshzebefjreqcicl on 2026-07-23 before apply)
-- audit_status NOT touched.
-- =============================================================================
UPDATE compliance_requirements cr
SET severity  = 'block',
    condition = 'final_compliance_verdict IS NOT NULL'
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id AND s.code = 'DWA-A-138-1'
WHERE cr.worksheet_template_id = wt.id
  AND wt.code = 'A138-28'
  AND cr.code = 'A138-REQ-30';
