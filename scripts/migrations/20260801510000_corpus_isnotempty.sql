-- CORPUS · block gates using `field != ''` — SOURCE-SETTLED never-enforcing repair
-- ============================================================================
-- `field != ''` on a block gate never reaches a definite `fail` (an unfilled/absent text
-- field resolves to `missing`→pending; a present value → pass) → the gate NEVER enforces
-- its non-empty requirement. `IS NOT EMPTY` reaches a definite `fail` when absent/empty.
-- Same class as the `!= null` repairs (M-820-2 REQ-51, FLL-TP-RHIZOM). Intent + severity
-- UNCHANGED; only the broken evaluation is repaired.
-- Reproduction: src/lib/compliance/__tests__/isnotempty-repro.test.ts (4/4, real evaluateCondition).
-- Scope (24 block gates, 6 std): DIN-14071-1(2), DIN-EN-ISO-14044(5), ISO-14046(8), ISO-14064-2(1),
--   ISO-14067(1), ISO-9001(2), VDI-3814-Blatt-2-1(3). Idempotent (re-run leaves no `!= ''`).
--   Apply: Mgmt-API POST · Rollback: scripts/rollback-20260801510000-corpus-isnotempty.sql
UPDATE compliance_requirements
   SET condition = regexp_replace(condition, $q$\s*!=\s*''$q$, ' IS NOT EMPTY', 'g')
 WHERE severity = 'block'
   AND condition ~ $q$!=\s*''$q$;
