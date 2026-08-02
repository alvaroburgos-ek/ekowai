-- FLL-Naturteich · REQ-07 (FLLNT-03) — SOURCE-SETTLED nested-guard dead-branch repair
-- ============================================================================
-- Unparenthesised `IF A THEN b AND IF C THEN d` nests the 2nd guard in the 1st's THEN →
-- when natural_pool_type == type_III (or IV/V) the outer guard (type IN {I,II}) is false →
-- vacuous pass → the type_III regeneration-area minimum (>30) NEVER enforces (dead branch).
-- Fix = parenthesise into two independent guards. Thresholds (50/30), types, severity UNCHANGED
-- — only the never-reachable branch is repaired (identical class to DWA-A-201 CR-006).
-- Reproduction: src/lib/compliance/__tests__/fllnt-req07-repro.test.ts (real evaluateCondition).
--   Apply: Mgmt-API POST · Rollback: scripts/rollback-20260801490000-fllnt-req07.sql
UPDATE compliance_requirements
   SET condition = '(IF natural_pool_type IN {type_I, type_II} THEN regeneration_area_share > 50) AND (IF natural_pool_type == type_III THEN regeneration_area_share > 30)'
 WHERE id = 'fabaa982-e703-4080-b596-1b19025bd23f'
   AND condition = 'IF natural_pool_type IN {type_I, type_II} THEN regeneration_area_share > 50 AND IF natural_pool_type == type_III THEN regeneration_area_share > 30';
