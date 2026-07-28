-- SOURCE-SETTLED — DWA-M-179-1: mis-homed WARN gate re-home (1), ALL within DWA-M-179-1 (no
-- cross-guideline content). Each warn CR's condition operands live only on the target worksheet, not
-- its current host; worksheet-local lookup => pending/fail forever. Re-home to the operands' worksheet.
-- warn->warn = zero enforcement change. Reproduction EXECUTED per row (evaluateCondition absent->
-- pending/fail, present->pass/fail). Guarded per-row + count-checked. Rule 15 class.
-- Rollback: scripts/rollback-20260728267000-dwa_m_179_1.sql
DO $$ DECLARE v int:=0; t int:=0; BEGIN
  -- M179-08 -> M179-11: REQ-15(pending->pass)
  UPDATE compliance_requirements SET worksheet_template_id='7970f100-817f-4aff-b28f-2117c0fb3811'
   WHERE worksheet_template_id='a8cd23da-919d-4424-9355-26f7ca7caa84' AND id IN (
     '39ffa8e3-c9dc-4cec-9e9e-9ca5e0041a19');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  IF t <> 1 THEN RAISE EXCEPTION 'DWA-M-179-1 expected 1, got %', t; END IF;
  RAISE NOTICE 'DWA-M-179-1 mis-homed warn: % re-homed', t;
END $$;
