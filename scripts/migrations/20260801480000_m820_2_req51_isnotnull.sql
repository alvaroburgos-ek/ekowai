-- DWA-M-820-2 · REQ-51 (820-2-24) — SOURCE-SETTLED grammar repair (never-enforcing block gate)
-- ============================================================================
-- `warranty_start_date != null AND warranty_end_date != null` uses the compare path
-- (null tokenizes as the NULL literal), so a missing date resolves to `pending`, never a
-- definite `fail` → the block gate NEVER enforces (proven in harness). §5.8.2 requires both
-- warranty dates present. Fix = the `IS NOT NULL` exists-form → a missing date returns `fail`.
-- Intent + block severity UNCHANGED; only the never-firing grammar corrected (F-4/M-816 class).
-- Reproduction: src/lib/compliance/__tests__/m820-2-req51-repro.test.ts (real evaluateCondition).
--   Apply: Mgmt-API POST · Rollback: scripts/rollback-20260801480000-m820-2-req51.sql
UPDATE compliance_requirements
   SET condition = 'warranty_start_date IS NOT NULL AND warranty_end_date IS NOT NULL'
 WHERE id = 'e7378176-c00e-45fb-87f5-28559feb8a48'
   AND condition = 'warranty_start_date != null AND warranty_end_date != null';
