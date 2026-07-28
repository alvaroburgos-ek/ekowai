-- SOURCE-SETTLED — ATV-A-704E: mis-homed WARN gate re-home (1), ALL within ATV-A-704E (no
-- cross-guideline content). Each warn CR's condition operands live only on the target worksheet, not
-- its current host; worksheet-local lookup => pending/fail forever. Re-home to the operands' worksheet.
-- warn->warn = zero enforcement change. Reproduction EXECUTED per row (evaluateCondition absent->
-- pending/fail, present->pass/fail). Guarded per-row + count-checked. Rule 15 class.
-- Rollback: scripts/rollback-20260728256000-atv_a_704e.sql
DO $$ DECLARE v int:=0; t int:=0; BEGIN
  -- ATV-A-704E-03 -> ATV-A-704E-04: CR-013(pending->pass)
  UPDATE compliance_requirements SET worksheet_template_id='344e3c9d-ff0c-49e0-9beb-e8a9a5740b46'
   WHERE worksheet_template_id='ad55e50e-0295-41e7-808d-e5ab4e06eed2' AND id IN (
     '35cc7d55-8215-40b1-ab11-b5e430d4ebee');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  IF t <> 1 THEN RAISE EXCEPTION 'ATV-A-704E expected 1, got %', t; END IF;
  RAISE NOTICE 'ATV-A-704E mis-homed warn: % re-homed', t;
END $$;
