-- SOURCE-SETTLED — ISO-59032: mis-homed WARN gate re-home (7), ALL within ISO-59032 (no
-- cross-guideline content). Each warn CR's condition operands live only on the target worksheet, not
-- its current host; worksheet-local lookup => pending/fail forever. Re-home to the operands' worksheet.
-- warn->warn = zero enforcement change. Reproduction EXECUTED per row (evaluateCondition absent->
-- pending/fail, present->pass/fail). Guarded per-row + count-checked. Rule 15 class.
-- Rollback: scripts/rollback-20260728246000-iso_59032.sql
DO $$ DECLARE v int:=0; t int:=0; BEGIN
  -- ISO-59032-01 -> ISO-59032-02: CR-002(pending->pass), CR-003(pending->pass), CR-004(pending->pass)
  UPDATE compliance_requirements SET worksheet_template_id='fb3f5888-09a7-4210-adb0-1310fa793ff3'
   WHERE worksheet_template_id='369a9a81-169b-4a57-a6c7-11afe01e6f2b' AND id IN (
     'f4313422-3195-41eb-87b4-1237bf8b8ff8',
     '96bd1d3a-a0ae-4b0c-a8d0-217e6592de24',
     '3c197c58-01dd-416a-bb6c-45b137c2100a');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  -- ISO-59032-04 -> ISO-59032-05: CR-008(pending->pass), CR-009(pending->pass)
  UPDATE compliance_requirements SET worksheet_template_id='a6b76a67-be85-4d82-8b4a-2225026428b0'
   WHERE worksheet_template_id='cda32cad-07f7-4695-896e-86ed056b4f3b' AND id IN (
     'db736f64-a505-4979-8942-a56d25f07f1f',
     'c20360db-8250-4a8e-bc6c-6bb5a113b137');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  -- ISO-59032-06 -> ISO-59032-07: CR-011(pending->pass), CR-012(pending->pass)
  UPDATE compliance_requirements SET worksheet_template_id='989a72d2-c78e-40eb-b383-1aa8dcce563e'
   WHERE worksheet_template_id='be0f5260-1678-4ee3-b43b-a883ef32a63a' AND id IN (
     'd1480b8c-f65d-4d6a-a105-92c87c821079',
     '3777870d-cf1b-4484-aa0b-fc40b037d71a');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  IF t <> 7 THEN RAISE EXCEPTION 'ISO-59032 expected 7, got %', t; END IF;
  RAISE NOTICE 'ISO-59032 mis-homed warn: % re-homed', t;
END $$;
