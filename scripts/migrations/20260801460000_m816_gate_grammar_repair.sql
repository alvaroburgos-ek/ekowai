-- DWA-M-816 · REQ-13 (M816-08) + REQ-14 (M816-19) — SOURCE-SETTLED grammar/trap repair
-- ============================================================================
-- Both gates ENCODE the right requirement but silently mis-evaluate:
--  REQ-13 `n_observation_period == n_a` uses a bare-ident RHS on `==` → string-coerce
--    (compares number to literal "n_a", always false) + missing parens nest the 2nd
--    guard → the gate blocks iff n_a>=n_b, never actually checking n = max(n_a,n_b) (§4.4.1).
--  REQ-14 guard `n_a != n_b` same bare-ident trap → always-true guard → Teilreplikation
--    demanded even when n_a==n_b (§4.4.2 does not apply there).
-- Fix = subtraction form (forces numeric acompare) + parens (un-nest guards). Condition
-- INTENT + block severity UNCHANGED — only the broken evaluation is repaired (F-4/A-201-CR-006 class).
-- Reproduction: src/lib/compliance/__tests__/m816-gate-repro.test.ts (9/9, real evaluateCondition).
--   Apply: Mgmt-API POST · Rollback: scripts/rollback-20260801460000-m816-gates.sql
UPDATE compliance_requirements
   SET condition = '(IF n_a - n_b >= 0 THEN n_observation_period - n_a == 0) AND (IF n_b - n_a >= 0 THEN n_observation_period - n_b == 0)'
 WHERE id = '8515755e-c02f-4a63-b89f-f06ae7b7d65f';
UPDATE compliance_requirements
   SET condition = 'IF n_a - n_b != 0 THEN partial_replication_flag == TRUE AND n_tr IS NOT NULL'
 WHERE id = '338d8e97-a22f-4e71-9018-a8d46d58d577';
