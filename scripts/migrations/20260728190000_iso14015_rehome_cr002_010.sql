-- SOURCE-SETTLED FIX — ISO-14015:2022 CR-002..CR-010: dead-reference re-homing (class c)
--
-- CLASS: source-settled class (c) "dead references to the standard's own content". Each of these
-- 9 compliance requirements references exactly ONE operand field, and that field lives on a
-- DIFFERENT worksheet than the CR is attached to. The engine's condition lookup is worksheet-LOCAL
-- (compliance-block.tsx buildValueMap / evaluate-for-report), so the operand is never in the homed
-- worksheet's value map -> the gate resolves PENDING forever and never reflects the answer the
-- engineer entered on the operand's worksheet. The Principles (ws02) + Roles (ws03) conformance
-- panel is therefore functionally dead where displayed.
--
-- ZERO-INTERPRETATION: the operand field's worksheet is a fact of the declared structure (queried
-- from prod, below); there is exactly ONE correct home per CR. No judgment, no candidate choice.
--
-- ENFORCEMENT: UNCHANGED. All 9 are severity='warn' (guidance standard: 0 'shall', 80 'should').
-- warn never blocks, before or after. This is distinct from rule-13 mis-homed BLOCK gates, where
-- re-homing turns a dead safety gate into a live enforcing one (= enforcement change = RULING).
-- Re-homing a warn gate changes NO enforcement; it only makes the advisory display truthful.
--
-- OPERAND HOMES (prod query, this session):
--   CR-002 evidence_verifiable                -> ISO-14015-02   CR-007 assessor_competence_demonstrated -> ISO-14015-02
--   CR-003 risk_based_approach_applied        -> ISO-14015-02   CR-008 roles_responsibilities_established -> ISO-14015-03
--   CR-004 fair_presentation                  -> ISO-14015-02   CR-009 client_need_determined            -> ISO-14015-03
--   CR-005 confidentiality_maintained         -> ISO-14015-02   CR-010 provider_roles_addressed          -> ISO-14015-03
--   CR-006 assessor_integrity                 -> ISO-14015-02
--   (control: CR-001 asset_identified -> ISO-14015-01, CORRECTLY homed, left untouched.)
--
-- REPRODUCTION (real evaluateCondition, this session, probe deleted after):
--   operand ABSENT (ws01 context):  evidence_verifiable == true -> {kind:pending, missing:[evidence_verifiable]}
--   operand PRESENT (ws02 context): answered true -> {kind:pass}; answered false -> {kind:fail}
--   -> broken (permanent pending) BEFORE, working both-ways gate AFTER.
--
-- SCOPE: exactly the 9 rows, guarded to their current (broken) home ws01. CR-010's separate
-- IS-NOT-NULL-on-boolean weakness (answering false still passes) is NOT touched here -> sign-off
-- sheet (strengthening to '== true' is a modal ruling). CR-028 'manual' placeholder -> sheet.
--
-- Standard id 0d90e21d-28bd-4247-91e3-9bb3e89ec863.
-- Rollback: scripts/rollback-20260728190000-iso14015-rehome.sql
DO $$
DECLARE v_n int := 0; v_tot int := 0;
  ws01 uuid := '758d1271-96bf-4561-9427-6e97f8215f08';
  ws02 uuid := '92b49d23-b8e4-4b32-b0ff-d01b5099193c';
  ws03 uuid := '156c5f48-70f7-4f3f-9f5c-5c517525df3c';
BEGIN
  -- CR-002..007 -> ws02 (Principles)
  UPDATE compliance_requirements SET worksheet_template_id = ws02
   WHERE id IN ('79f21f31-e2ae-48e2-a855-41fce38ea38a','15e4cb86-22c6-4afa-8237-000b4ce69371',
                'd19e0f24-02d9-47e3-aee2-e4ed5d31fed3','2e0190dd-4293-48ac-9a8b-0ace7aef3c07',
                '4da8f445-2029-4e8b-8f5e-1fbe1f9dfc05','7c53a380-000d-4933-953e-c0713cadd516')
     AND worksheet_template_id = ws01;   -- guard: only the known broken home
  GET DIAGNOSTICS v_n = ROW_COUNT; v_tot := v_tot + v_n; RAISE NOTICE 'CR-002..007 -> ws02: % rows', v_n;

  -- CR-008..010 -> ws03 (Roles)
  UPDATE compliance_requirements SET worksheet_template_id = ws03
   WHERE id IN ('9d102dc9-54a2-4836-8eb3-156ec4b56f01','bb485c16-a2ea-4249-9a08-352b391586b3',
                '8f661a8e-7146-466f-ae27-266e1a143560')
     AND worksheet_template_id = ws01;   -- guard: only the known broken home
  GET DIAGNOSTICS v_n = ROW_COUNT; v_tot := v_tot + v_n; RAISE NOTICE 'CR-008..010 -> ws03: % rows', v_n;

  IF v_tot <> 9 THEN
    RAISE EXCEPTION 'Expected 9 re-homes, got % — aborting (prod not in the known broken state)', v_tot;
  END IF;
  RAISE NOTICE 'ISO-14015 re-home: % rows total', v_tot;
END $$;
