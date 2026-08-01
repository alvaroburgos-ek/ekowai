-- DWA-M-820-1 · REQ-01 (M820-01) — SOURCE-SETTLED scope defect
-- ============================================================================
-- The §1 Anwendungsbereich names "Wasserbau" in scope, and the sector enum offers
-- value `water_engineering` (label "Wasserbau", regulation_reference §1) — but REQ-01's
-- IN-set OMITS it → a correct Wasserbau selection is WRONGLY BLOCKED.
-- SOURCE (§1, verbatim): "… Projekte im Bereich Wasserwirtschaft, Wasserbau, Abwasser und Abfall."
-- Fix = add the omitted (existing) enum value. Relaxes a wrong block; zero-interpretation; severity unchanged.
-- Reproduction: src/lib/compliance/__tests__/m820-1-req01-repro.test.ts (real evaluateCondition).
--   Apply: Mgmt-API POST · Rollback: scripts/rollback-20260801470000-m820-1-req01.sql
UPDATE compliance_requirements
   SET condition = 'sector IN {wastewater,water_supply,flood_protection,waste,water_engineering,other}'
 WHERE id = '7b0b9120-2096-4c4c-9fcf-41f9a975d312'
   AND condition = 'sector IN {wastewater,water_supply,flood_protection,waste,other}';
