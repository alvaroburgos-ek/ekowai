-- =============================================================================
-- ROLLBACK 20260723_r2b_req21_relax_pass_na
-- Restores REQ-21 (A138-25) condition to the pre-migration prod state:
--   condition = 'design_adequacy_result == ''PASS'''
-- (captured live from prod vadsmshzebefjreqcicl on 2026-07-23 before apply)
-- severity was and stays 'block'. audit_status NOT touched.
-- =============================================================================
UPDATE compliance_requirements cr
SET condition = 'design_adequacy_result == ''PASS'''
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id AND s.code = 'DWA-A-138-1'
WHERE cr.worksheet_template_id = wt.id
  AND wt.code = 'A138-25'
  AND cr.code = 'A138-REQ-21';
