-- FLL-TP-RHIZOM-2023 · REQ-03 + REQ-04 (FLLTP-RHZ-02) — SOURCE-SETTLED grammar repair
-- ============================================================================
-- `!= null` uses the compare path (null tokenizes as NULL literal) → a missing value
-- resolves to `pending`, never a definite `fail` → these block gates NEVER enforce their
-- presence requirement. Fix = `IS NOT NULL` (exists-form) → missing value returns `fail`.
-- Intent (presence required) + block severity UNCHANGED (same class as M-820-2 REQ-51).
-- Reproduction: src/lib/compliance/__tests__/fllrhz-isnotnull-repro.test.ts (real evaluateCondition).
--   Apply: Mgmt-API POST · Rollback: scripts/rollback-20260801500000-fllrhz.sql
UPDATE compliance_requirements
   SET condition = 'wachstumshemmende_wirkstoffe IS NOT NULL'
 WHERE id = '4ec40bc4-54a9-4cc9-8657-d3faa740040f'
   AND condition = 'wachstumshemmende_wirkstoffe != null';
UPDATE compliance_requirements
   SET condition = 'mehrschichtprodukt == false OR (schutzschicht_definition IS NOT NULL)'
 WHERE id = '2b3475a4-f4d7-4979-8687-c45841f8055f'
   AND condition = 'mehrschichtprodukt == false OR (schutzschicht_definition != null)';
