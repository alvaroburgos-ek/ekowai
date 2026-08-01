-- DWA-A-201 · CR-006 (A201-08) · SOURCE-SETTLED enforcement fix
-- ============================================================================
-- DEFECT (execution-proven): the condition
--   IF absetz_vorstufe == true THEN A_EW_unbelueftet >= 8
--   AND IF absetz_vorstufe == false THEN A_EW_unbelueftet >= 10
-- has NO parentheses, so evaluate.ts parses it as
--   IF absetz==true THEN (A_EW>=8 AND (IF absetz==false THEN A_EW>=10))
-- → the F-07 branch (≥10 when NO Absetzteich) is NESTED in the true-guard and is
--   STRUCTURALLY UNREACHABLE. Harness proof: absetz=false, A_EW=9 → gate did NOT block.
--
-- SOURCE (§5.3 Unbelüftete Abwasserteiche, DWA-A-201, verbatim, captured in-session):
--   "Unbelüftete Abwasserteiche sind mit A_EW ≥ 10 m²/E zu bemessen. Dieser Wert kann
--    auf 8 m²/E vermindert werden, wenn nach Abschnitt 5.2 bemessene Absetzteiche
--    vorgeschaltet sind."
--   → BOTH branches mandatory ("sind … zu bemessen"); thresholds 10 / 8 unchanged;
--     block severity confirmed. Zero-interpretation fix = two INDEPENDENT guards AND'd.
--
-- REPRODUCTION CHECK (real save path, tests/harness/a201-verify.integration.test.ts):
--   broken-before: State 4 (absetz=false, A_EW=9) did NOT block.
--   fixed-after:   same state now BLOCKS (13/13 green with the parenthesised condition).
--
-- NOTE: this reverses the prior campaign's escalation of CR-006 to the ENGINE track
-- ("needs cross-worksheet symbol resolution") — the harness proved the project-wide
-- fallback resolves both symbols; the sole cause was the missing parentheses. A DATA fix.
--
--   Apply:    POST scripts/migrations/20260801400000_a201_cr006_paren_fix.sql (Mgmt API)
--   Rollback: scripts/rollback-20260801400000-a201-cr006.sql
DO $$
DECLARE v_cr uuid;
BEGIN
  SELECT cr.id INTO v_cr
    FROM compliance_requirements cr
    JOIN worksheet_templates wt ON wt.id = cr.worksheet_template_id
    JOIN standards s ON s.id = wt.standard_id
   WHERE s.code = 'DWA-A-201' AND cr.code = 'CR-006';
  IF v_cr IS NULL THEN RAISE EXCEPTION 'DWA-A-201 CR-006 not found'; END IF;

  UPDATE compliance_requirements
     SET condition = '(IF absetz_vorstufe == true THEN A_EW_unbelueftet >= 8) AND (IF absetz_vorstufe == false THEN A_EW_unbelueftet >= 10)'
   WHERE id = v_cr
     AND condition <> '(IF absetz_vorstufe == true THEN A_EW_unbelueftet >= 8) AND (IF absetz_vorstufe == false THEN A_EW_unbelueftet >= 10)';

  RAISE NOTICE 'DWA-A-201 CR-006 condition parenthesised — F-07 (>=10) now enforceable';
END $$;
