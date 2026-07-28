-- SOURCE-SETTLED — ISO-59010: mis-homed WARN gate re-home (9), ALL within ISO-59010 (no
-- cross-guideline content). Each warn CR's condition operands live only on the target worksheet, not
-- its current host; worksheet-local lookup => pending/fail forever. Re-home to the operands' worksheet.
-- warn->warn = zero enforcement change. Reproduction EXECUTED per row (evaluateCondition absent->
-- pending/fail, present->pass/fail). Guarded per-row + count-checked. Rule 15 class.
-- Rollback: scripts/rollback-20260728242000-iso_59010.sql
DO $$ DECLARE v int:=0; t int:=0; BEGIN
  -- ISO-59010-01 -> ISO-59010-02: CR-002(pending->pass), CR-003(pending->pass)
  UPDATE compliance_requirements SET worksheet_template_id='1e899e1b-5c55-4e0a-a4fe-1b634f3e19b6'
   WHERE worksheet_template_id='d4ab76e2-6e6c-4a2b-9170-772e54d7af19' AND id IN (
     '29c70e07-ab90-402a-b602-8df7c84b863d',
     'c7369112-ae32-4189-a00f-7a5559cea802');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  -- ISO-59010-03 -> ISO-59010-04: CR-006(pending->pass), CR-007(fail->pass)
  UPDATE compliance_requirements SET worksheet_template_id='58aa888d-a345-45d5-9553-047a576b10b9'
   WHERE worksheet_template_id='5811059b-3d05-49c4-b773-668f8913ceaa' AND id IN (
     '13bbbf33-c7be-4512-9a89-097d66505f1e',
     'fae5bacc-74cc-4151-a1c6-870f2f1e4798');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  -- ISO-59010-05 -> ISO-59010-06: CR-011(pending->pass), CR-012(fail->pass), CR-013(pending->pass)
  UPDATE compliance_requirements SET worksheet_template_id='09c6683e-a410-49e1-9770-50d1e63cd57e'
   WHERE worksheet_template_id='22b3a962-e4e3-4457-9565-a1ceeef27eaa' AND id IN (
     '493c964c-2d0a-4c16-a6f0-0c97b4ce3264',
     'ea40cfe0-e06a-4bf9-a4bd-a0990d98270f',
     '810b34eb-1e11-4d35-83c0-cca8a49b2512');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  -- ISO-59010-07 -> ISO-59010-08: CR-017(pending->pass), CR-019(fail->pass)
  UPDATE compliance_requirements SET worksheet_template_id='fab89a76-65e3-4bcb-b209-7e6795615da2'
   WHERE worksheet_template_id='8d2297dd-b1b3-47fc-8c80-189b15608b4b' AND id IN (
     '7d19ba04-6c58-4055-af96-08ec7aa2b63c',
     '811333f6-63f5-4fa0-b46a-3bd7da2c382e');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  IF t <> 9 THEN RAISE EXCEPTION 'ISO-59010 expected 9, got %', t; END IF;
  RAISE NOTICE 'ISO-59010 mis-homed warn: % re-homed', t;
END $$;
