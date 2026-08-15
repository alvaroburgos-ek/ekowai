-- =============================================================================
-- 20260718_recode_reqs_31_32_33 — CORRECTION for the REQ-20/21/22 code collision
-- =============================================================================
-- The Phase-4 facility gates were authored with codes A138-REQ-20/21/22, which
-- were ALREADY assigned to existing Phase-5/6 gates on A138-24/25/26. Codes are
-- taken through REQ-30; next free = REQ-31/32/33. This recodes the three
-- Phase-4 facility gates to the next-free sequential codes.
--
--   A138-16 (Fläche)  A138-REQ-20 → A138-REQ-31
--   A138-18 (Rigole)  A138-REQ-21 → A138-REQ-32
--   A138-21 (Schacht) A138-REQ-22 → A138-REQ-33
--
-- SCOPING: the UPDATE matches on (worksheet + old code + standard), so the
-- pre-existing A138-24/25/26 rows that legitimately hold REQ-20/21/22 are NOT
-- touched. Idempotent: re-run matches nothing once recoded.
-- Rollback: rollback-20260718_recode_reqs_31_32_33.sql (reverse the mapping).
-- =============================================================================
UPDATE compliance_requirements cr
SET code = v.newcode
FROM (VALUES
  ('A138-16', 'A138-REQ-20', 'A138-REQ-31'),
  ('A138-18', 'A138-REQ-21', 'A138-REQ-32'),
  ('A138-21', 'A138-REQ-22', 'A138-REQ-33')
) AS v(wscode, oldcode, newcode)
JOIN worksheet_templates wt ON wt.code = v.wscode
JOIN standards s ON s.id = wt.standard_id AND s.code = 'DWA-A-138-1'
WHERE cr.worksheet_template_id = wt.id
  AND cr.code = v.oldcode;
