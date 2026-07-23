-- =============================================================================
-- 20260723_r2b_req21_relax_pass_na — RATIFIED R2b (A138-25 REQ-21)
-- =============================================================================
-- Author: Alvaro Burgos <alvaro.burgos@ekowai.com>
-- Co-authored: Claude Opus 4.8 <noreply@anthropic.com>
--
-- User ratification (2026-07-23): relax REQ-21's design-adequacy condition so
-- a NOT-APPLICABLE (NA) design-adequacy result also passes the gate, alongside
-- PASS. Severity STAYS block. Only the condition changes.
--
--   condition: design_adequacy_result == 'PASS'
--              -> design_adequacy_result IN {PASS, NA}
--   severity : block (unchanged)
--
-- Grammar note: brace-style IN {…} is the parsed form (verified live on REQ-19).
--
-- SCOPING: matched on (worksheet A138-25 + code A138-REQ-21 + standard
-- DWA-A-138-1). Idempotent. audit_status NOT modified.
-- Rollback: rollback-20260723_r2b_req21_relax_pass_na.sql
-- =============================================================================
UPDATE compliance_requirements cr
SET condition = 'design_adequacy_result IN {PASS, NA}'
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id AND s.code = 'DWA-A-138-1'
WHERE cr.worksheet_template_id = wt.id
  AND wt.code = 'A138-25'
  AND cr.code = 'A138-REQ-21';
