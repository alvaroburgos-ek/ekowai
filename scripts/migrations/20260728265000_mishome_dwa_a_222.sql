-- SOURCE-SETTLED — DWA-A-222: mis-homed WARN gate re-home (1), ALL within DWA-A-222 (no
-- cross-guideline content). Each warn CR's condition operands live only on the target worksheet, not
-- its current host; worksheet-local lookup => pending/fail forever. Re-home to the operands' worksheet.
-- warn->warn = zero enforcement change. Reproduction EXECUTED per row (evaluateCondition absent->
-- pending/fail, present->pass/fail). Guarded per-row + count-checked. Rule 15 class.
-- Rollback: scripts/rollback-20260728265000-dwa_a_222.sql
DO $$ DECLARE v int:=0; t int:=0; BEGIN
  -- A222-03 -> A222-07: CR-007(pending->fail)
  UPDATE compliance_requirements SET worksheet_template_id='a76f5a0f-bfab-4e48-a62c-fb2db4f02f71'
   WHERE worksheet_template_id='5c7edc3a-12c8-4d82-a41d-d4d8706d3cc2' AND id IN (
     '7fbea212-eaa0-4143-87f3-e1438c717829');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  IF t <> 1 THEN RAISE EXCEPTION 'DWA-A-222 expected 1, got %', t; END IF;
  RAISE NOTICE 'DWA-A-222 mis-homed warn: % re-homed', t;
END $$;
