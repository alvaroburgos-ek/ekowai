-- SOURCE-SETTLED — DWA-A-201: mis-homed WARN gate re-home (1), ALL within DWA-A-201 (no
-- cross-guideline content). Each warn CR's condition operands live only on the target worksheet, not
-- its current host; worksheet-local lookup => pending/fail forever. Re-home to the operands' worksheet.
-- warn->warn = zero enforcement change. Reproduction EXECUTED per row (evaluateCondition absent->
-- pending/fail, present->pass/fail). Guarded per-row + count-checked. Rule 15 class.
-- Rollback: scripts/rollback-20260728264000-dwa_a_201.sql
DO $$ DECLARE v int:=0; t int:=0; BEGIN
  -- A201-08 -> A201-14: CR-009(pending->fail)
  UPDATE compliance_requirements SET worksheet_template_id='11c82259-a5b0-42b8-a62f-14888835f146'
   WHERE worksheet_template_id='dc019548-7320-4e8c-b776-397de871ba71' AND id IN (
     '33e5a46d-7f17-44b7-a624-36d601586a68');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  IF t <> 1 THEN RAISE EXCEPTION 'DWA-A-201 expected 1, got %', t; END IF;
  RAISE NOTICE 'DWA-A-201 mis-homed warn: % re-homed', t;
END $$;
