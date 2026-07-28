-- SOURCE-SETTLED — DWA-A-102-2: mis-homed WARN gate re-home (1), ALL within DWA-A-102-2 (no
-- cross-guideline content). Each warn CR's condition operands live only on the target worksheet, not
-- its current host; worksheet-local lookup => pending/fail forever. Re-home to the operands' worksheet.
-- warn->warn = zero enforcement change. Reproduction EXECUTED per row (evaluateCondition absent->
-- pending/fail, present->pass/fail). Guarded per-row + count-checked. Rule 15 class.
-- Rollback: scripts/rollback-20260728263000-dwa_a_102_2.sql
DO $$ DECLARE v int:=0; t int:=0; BEGIN
  -- A1022-01 -> A1022-03: REQ-02(pending->pass)
  UPDATE compliance_requirements SET worksheet_template_id='717a37f6-153f-4fbe-83a1-4f1d3a345033'
   WHERE worksheet_template_id='5f42ca6f-a115-401a-80c5-8700c7d0959e' AND id IN (
     'b32088ed-4ee4-4cad-b32a-7a5567b58943');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  IF t <> 1 THEN RAISE EXCEPTION 'DWA-A-102-2 expected 1, got %', t; END IF;
  RAISE NOTICE 'DWA-A-102-2 mis-homed warn: % re-homed', t;
END $$;
