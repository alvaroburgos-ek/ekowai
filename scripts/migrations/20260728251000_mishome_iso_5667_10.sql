-- SOURCE-SETTLED — ISO-5667-10: mis-homed WARN gate re-home (4), ALL within ISO-5667-10 (no
-- cross-guideline content). Each warn CR's condition operands live only on the target worksheet, not
-- its current host; worksheet-local lookup => pending/fail forever. Re-home to the operands' worksheet.
-- warn->warn = zero enforcement change. Reproduction EXECUTED per row (evaluateCondition absent->
-- pending/fail, present->pass/fail). Guarded per-row + count-checked. Rule 15 class.
-- Rollback: scripts/rollback-20260728251000-iso_5667_10.sql
DO $$ DECLARE v int:=0; t int:=0; BEGIN
  -- ISO-5667-10-01 -> ISO-5667-10-02: CR-003(pending->pass)
  UPDATE compliance_requirements SET worksheet_template_id='297672d3-ab6f-4452-8f6a-9a986109b1f2'
   WHERE worksheet_template_id='cd6b4cc1-df10-4e00-912f-9514e8fdc06d' AND id IN (
     '72d198c3-438a-4227-b7e0-b29609bb9fb4');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  -- ISO-5667-10-05 -> ISO-5667-10-06: CR-019(pending->pass), CR-020(pending->fail), CR-021(pending->pass)
  UPDATE compliance_requirements SET worksheet_template_id='dba3ab92-3ed4-4de5-ac2d-7386331b7f7e'
   WHERE worksheet_template_id='76e30179-117a-40a9-acbc-9924a26dddbb' AND id IN (
     '54506f66-2ce1-440f-865a-cf37a7597968',
     '306fe50f-7cd3-4a25-bbb3-650dd34c797b',
     'e82fa780-b38c-44c5-b0b2-a13f0e87e51e');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  IF t <> 4 THEN RAISE EXCEPTION 'ISO-5667-10 expected 4, got %', t; END IF;
  RAISE NOTICE 'ISO-5667-10 mis-homed warn: % re-homed', t;
END $$;
