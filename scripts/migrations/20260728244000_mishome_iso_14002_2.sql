-- SOURCE-SETTLED — ISO-14002-2: mis-homed WARN gate re-home (8), ALL within ISO-14002-2 (no
-- cross-guideline content). Each warn CR's condition operands live only on the target worksheet, not
-- its current host; worksheet-local lookup => pending/fail forever. Re-home to the operands' worksheet.
-- warn->warn = zero enforcement change. Reproduction EXECUTED per row (evaluateCondition absent->
-- pending/fail, present->pass/fail). Guarded per-row + count-checked. Rule 15 class.
-- Rollback: scripts/rollback-20260728244000-iso_14002_2.sql
DO $$ DECLARE v int:=0; t int:=0; BEGIN
  -- ISO-14002-2-02 -> ISO-14002-2-03: CR-006(pending->pass), CR-008(pending->pass)
  UPDATE compliance_requirements SET worksheet_template_id='f148d3e8-06f3-4a1a-9100-3a8460e120d3'
   WHERE worksheet_template_id='2c676600-ddac-4c84-a2d0-c414abcc9357' AND id IN (
     'f5d167c2-e08a-4b71-b113-2a1607e74229',
     'a65ecf2b-a970-48f7-a463-8d8e93f16ece');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  -- ISO-14002-2-02 -> ISO-14002-2-04: CR-010(pending->pass), CR-011(pending->pass)
  UPDATE compliance_requirements SET worksheet_template_id='85af6696-fcaa-42f0-8788-f497bf74bb01'
   WHERE worksheet_template_id='2c676600-ddac-4c84-a2d0-c414abcc9357' AND id IN (
     '599032d2-aa2b-47c7-ad37-21f6a055510a',
     'd4234b6e-9ac5-4122-b735-facfd8bd0c3b');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  -- ISO-14002-2-05 -> ISO-14002-2-06: CR-016(pending->pass), CR-017(pending->pass), CR-018(pending->pass), CR-020(fail->pass)
  UPDATE compliance_requirements SET worksheet_template_id='665b991d-1cdd-4b35-ae4c-3f15f7ed770a'
   WHERE worksheet_template_id='8f2a6139-7e94-4380-8742-30e747d344f9' AND id IN (
     '0db1fdf0-d13e-4528-aff9-188089e0ba6b',
     'cb7e317b-048a-4cae-903b-c0cadd5f48cc',
     '4dca991c-ae8e-4f16-87e9-c4972bd19317',
     '59919b50-a81e-4761-b136-2090ca94a8df');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  IF t <> 8 THEN RAISE EXCEPTION 'ISO-14002-2 expected 8, got %', t; END IF;
  RAISE NOTICE 'ISO-14002-2 mis-homed warn: % re-homed', t;
END $$;
