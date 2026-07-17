-- =============================================================================
-- VERIFY: 20260717_a138_phase4_compliance_gates
-- Run after applying the forward migration to confirm all 3 rows exist
-- with the correct severity, condition, and worksheet assignment.
-- =============================================================================

-- 1. Existence + severity + condition (expect 3 rows, all severity='block')
SELECT
  cr.code,
  cr.severity,
  cr.condition,
  cr.clause_reference,
  wt.code AS worksheet_code,
  s.code  AS standard_code,
  cr.audit_status
FROM compliance_requirements cr
JOIN worksheet_templates wt ON cr.worksheet_template_id = wt.id
JOIN standards s             ON wt.standard_id = s.id
WHERE cr.code IN ('A138-REQ-20', 'A138-REQ-21', 'A138-REQ-22')
ORDER BY cr.code;

-- Expected output:
-- code          | severity | condition                                                      | clause_reference | worksheet_code | standard_code  | audit_status
-- A138-REQ-20   | block    | k_i > r_D_n_used * 0.0000001                                  | §6.2.2 Gl.(13)  | A138-16        | DWA-A-138-1    | (null or existing)
-- A138-REQ-21   | block    | L_VS * q_VS >= r_5_n * A_C * 0.0001                           | §6.4.2 Gl.(25)  | A138-18        | DWA-A-138-1    | (null or existing)
-- A138-REQ-22   | block    | IF shaft_type == typ_B THEN A_S_FS * k_f_FS >= A_S_Schacht * k_i | §6.7.2 Gl.(38) | A138-21        | DWA-A-138-1  | (null or existing)

-- 2. Count check — must be exactly 3
SELECT COUNT(*) AS gate_count
FROM compliance_requirements
WHERE code IN ('A138-REQ-20', 'A138-REQ-21', 'A138-REQ-22');

-- Expected: gate_count = 3

-- 3. Source quotes present
SELECT code, LEFT(source_quote, 60) AS source_quote_preview
FROM compliance_requirements
WHERE code IN ('A138-REQ-20', 'A138-REQ-21', 'A138-REQ-22')
ORDER BY code;
