-- SOURCE-SETTLED — ISO-5667-13: mis-homed WARN gate re-home (4), ALL within ISO-5667-13 (no
-- cross-guideline content). Each warn CR's condition operands live only on the target worksheet, not
-- its current host; worksheet-local lookup => pending/fail forever. Re-home to the operands' worksheet.
-- warn->warn = zero enforcement change. Reproduction EXECUTED per row (evaluateCondition absent->
-- pending/fail, present->pass/fail). Guarded per-row + count-checked. Rule 15 class.
-- Rollback: scripts/rollback-20260728252000-iso_5667_13.sql
DO $$ DECLARE v int:=0; t int:=0; BEGIN
  -- ISO-5667-13-01 -> ISO-5667-13-03: CR-004(fail->pass), CR-006(fail->pass)
  UPDATE compliance_requirements SET worksheet_template_id='62b2d86e-e950-4992-b6fd-01e2aa73d34b'
   WHERE worksheet_template_id='f67a47d8-e079-4736-ad4e-ba7fade08d24' AND id IN (
     'bb5ba502-83ba-4c08-8fb0-aab514222553',
     'cacc091b-2080-47ff-8963-9d60198e2d54');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  -- ISO-5667-13-05 -> ISO-5667-13-06: CR-015(fail->pass), CR-016(fail->pass)
  UPDATE compliance_requirements SET worksheet_template_id='70596c54-0468-4ceb-a8c5-99e9a4a0deca'
   WHERE worksheet_template_id='c63df2be-c8f4-4749-8c21-e7f37bafe33a' AND id IN (
     '09d05802-2e4c-46bc-ba7a-04abc8211d82',
     '44aff6d3-43d5-471f-901f-827f0de94d24');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  IF t <> 4 THEN RAISE EXCEPTION 'ISO-5667-13 expected 4, got %', t; END IF;
  RAISE NOTICE 'ISO-5667-13 mis-homed warn: % re-homed', t;
END $$;
