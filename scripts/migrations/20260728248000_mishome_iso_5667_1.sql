-- SOURCE-SETTLED — ISO-5667-1: mis-homed WARN gate re-home (6), ALL within ISO-5667-1 (no
-- cross-guideline content). Each warn CR's condition operands live only on the target worksheet, not
-- its current host; worksheet-local lookup => pending/fail forever. Re-home to the operands' worksheet.
-- warn->warn = zero enforcement change. Reproduction EXECUTED per row (evaluateCondition absent->
-- pending/fail, present->pass/fail). Guarded per-row + count-checked. Rule 15 class.
-- Rollback: scripts/rollback-20260728248000-iso_5667_1.sql
DO $$ DECLARE v int:=0; t int:=0; BEGIN
  -- ISO-5667-1-01 -> ISO-5667-1-02: CR-005(pending->pass), CR-001(pending->pass)
  UPDATE compliance_requirements SET worksheet_template_id='37a0541f-5a6c-4e03-b533-38d608c27cf9'
   WHERE worksheet_template_id='5eeffbaf-5b5b-4feb-9ced-308c709e2189' AND id IN (
     '3672bcda-7e04-43d1-a557-cf1b33539de5',
     'c7d91d41-551e-47b1-9bb5-83c149570a02');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  -- ISO-5667-1-03 -> ISO-5667-1-04: CR-010(pending->pass), CR-011(fail->pass), CR-013(fail->pass)
  UPDATE compliance_requirements SET worksheet_template_id='248e9581-f432-4a95-97f8-81823fc3b1c1'
   WHERE worksheet_template_id='ada4dd5b-873e-45e1-8ff6-fd7ebd60cef6' AND id IN (
     '1a0c6f63-f2a9-46ff-9f3d-2e62c5a79e98',
     '09b73f91-f71d-4efd-973f-0f327217a69c',
     '62b68d94-16d2-4c06-b865-3268d3ee49ea');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  -- ISO-5667-1-06 -> ISO-5667-1-07: CR-024(pending->pass)
  UPDATE compliance_requirements SET worksheet_template_id='4d888933-0974-447e-b829-dbb950bc3944'
   WHERE worksheet_template_id='26b92cbb-52b9-4ac7-a81c-fc531a629a66' AND id IN (
     '0aa104a1-dae0-4d13-85ab-6848b2b041ee');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  IF t <> 6 THEN RAISE EXCEPTION 'ISO-5667-1 expected 6, got %', t; END IF;
  RAISE NOTICE 'ISO-5667-1 mis-homed warn: % re-homed', t;
END $$;
