-- SOURCE-SETTLED — ISO-59020: mis-homed WARN gate re-home (8), ALL within ISO-59020 (no
-- cross-guideline content). Each warn CR's condition operands live only on the target worksheet, not
-- its current host; worksheet-local lookup => pending/fail forever. Re-home to the operands' worksheet.
-- warn->warn = zero enforcement change. Reproduction EXECUTED per row (evaluateCondition absent->
-- pending/fail, present->pass/fail). Guarded per-row + count-checked. Rule 15 class.
-- Rollback: scripts/rollback-20260728243000-iso_59020.sql
DO $$ DECLARE v int:=0; t int:=0; BEGIN
  -- ISO-59020-01 -> ISO-59020-02: CR-002(fail->pass), CR-003(fail->pass), CR-004(pending->pass)
  UPDATE compliance_requirements SET worksheet_template_id='683b30c5-67e3-4a50-bf3b-2e142b87d823'
   WHERE worksheet_template_id='6886d9d8-fa35-41a8-8a60-b0765615ab83' AND id IN (
     'e595d856-598c-4f8b-9baa-7d46f0965ec1',
     '1e34ce41-b6de-4519-a77b-bc965b99c7ab',
     '29e41319-c350-4cea-a2d7-db0149917d24');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  -- ISO-59020-04 -> ISO-59020-07: CR-021(pending->fail), CR-022(pending->fail), CR-023(pending->fail), CR-024(pending->fail), CR-025(pending->fail)
  UPDATE compliance_requirements SET worksheet_template_id='3ec340ac-745c-4808-a096-2613ada3d626'
   WHERE worksheet_template_id='5c2219d4-500d-4098-9d31-a2b54539e35d' AND id IN (
     '613d3729-2288-4208-a5d1-bea32015e69c',
     'fa82fe4a-b392-4ca5-82e9-c6f224fb42dd',
     'f7dc8e80-d22b-4180-93a1-56ec5fa3a223',
     '6c26bf6e-446d-4d18-89e7-245673cc8258',
     '43fdfba0-7551-4563-9b48-cd8d27098b4c');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  IF t <> 8 THEN RAISE EXCEPTION 'ISO-59020 expected 8, got %', t; END IF;
  RAISE NOTICE 'ISO-59020 mis-homed warn: % re-homed', t;
END $$;
