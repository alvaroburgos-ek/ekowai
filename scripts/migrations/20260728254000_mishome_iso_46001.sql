-- SOURCE-SETTLED — ISO-46001: mis-homed WARN gate re-home (2), ALL within ISO-46001 (no
-- cross-guideline content). Each warn CR's condition operands live only on the target worksheet, not
-- its current host; worksheet-local lookup => pending/fail forever. Re-home to the operands' worksheet.
-- warn->warn = zero enforcement change. Reproduction EXECUTED per row (evaluateCondition absent->
-- pending/fail, present->pass/fail). Guarded per-row + count-checked. Rule 15 class.
-- Rollback: scripts/rollback-20260728254000-iso_46001.sql
DO $$ DECLARE v int:=0; t int:=0; BEGIN
  -- ISO-46001-06 -> ISO-46001-08: CR-037(pending->fail), CR-038(pending->pass)
  UPDATE compliance_requirements SET worksheet_template_id='5bbf2997-4f82-442e-8966-538fa658de79'
   WHERE worksheet_template_id='e278eb02-0086-420f-a709-853a03d2e3b2' AND id IN (
     'af0eea7f-00da-4c60-93a2-31f5b3e48ec8',
     'fdbce5e8-11fb-431d-b77b-cd0bc713dd18');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  IF t <> 2 THEN RAISE EXCEPTION 'ISO-46001 expected 2, got %', t; END IF;
  RAISE NOTICE 'ISO-46001 mis-homed warn: % re-homed', t;
END $$;
