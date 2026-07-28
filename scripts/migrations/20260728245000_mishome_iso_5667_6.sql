-- SOURCE-SETTLED — ISO-5667-6: mis-homed WARN gate re-home (8), ALL within ISO-5667-6 (no
-- cross-guideline content). Each warn CR's condition operands live only on the target worksheet, not
-- its current host; worksheet-local lookup => pending/fail forever. Re-home to the operands' worksheet.
-- warn->warn = zero enforcement change. Reproduction EXECUTED per row (evaluateCondition absent->
-- pending/fail, present->pass/fail). Guarded per-row + count-checked. Rule 15 class.
-- Rollback: scripts/rollback-20260728245000-iso_5667_6.sql
DO $$ DECLARE v int:=0; t int:=0; BEGIN
  -- ISO-5667-6-01 -> ISO-5667-6-02: CR-003(pending->pass), CR-004(fail->pass), CR-005(pending->pass)
  UPDATE compliance_requirements SET worksheet_template_id='1f4bf83b-19c0-4a08-bba9-7f1f87f01740'
   WHERE worksheet_template_id='e25451cb-4153-4ea1-93aa-db734ed2b04e' AND id IN (
     '2dcc349b-e12c-45ce-b3bf-7184d6ba40e1',
     'b5714b56-81b0-42dd-8877-1edd930eb4a0',
     'ac57f1cd-7ccf-47fa-908f-54cbb53c175d');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  -- ISO-5667-6-03 -> ISO-5667-6-04: CR-009(pending->fail)
  UPDATE compliance_requirements SET worksheet_template_id='6960ca21-d940-4009-bb33-5d8598b2112d'
   WHERE worksheet_template_id='1f4c1a76-ccbb-4022-bd6e-2d8931adfbce' AND id IN (
     '5a77cbfa-2947-4485-bfeb-2c410e50eaba');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  -- ISO-5667-6-06 -> ISO-5667-6-07: CR-016(pending->fail)
  UPDATE compliance_requirements SET worksheet_template_id='b08e88d8-e40f-40f9-bbaa-6f61069a1377'
   WHERE worksheet_template_id='5a5e268b-a60d-4617-83f7-28a447ca257d' AND id IN (
     'cb53a188-3d62-49ca-b61b-56b3626f9868');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  -- ISO-5667-6-06 -> ISO-5667-6-08: CR-017(pending->pass), CR-018(pending->pass)
  UPDATE compliance_requirements SET worksheet_template_id='2702bd04-d0b2-4d65-8935-55c96d8252ed'
   WHERE worksheet_template_id='5a5e268b-a60d-4617-83f7-28a447ca257d' AND id IN (
     'bed92dff-07d5-47da-b3ce-b86ac37709f2',
     '2709daff-a0c2-4e67-a49c-1ba9f70717cd');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  -- ISO-5667-6-11 -> ISO-5667-6-12: CR-029(pending->pass)
  UPDATE compliance_requirements SET worksheet_template_id='64480288-72cf-4302-876f-34e6bcc25278'
   WHERE worksheet_template_id='9d172a48-f93a-4740-961f-ab77f040fb33' AND id IN (
     '4cb09788-54a7-4edd-bf88-7a58881d1790');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  IF t <> 8 THEN RAISE EXCEPTION 'ISO-5667-6 expected 8, got %', t; END IF;
  RAISE NOTICE 'ISO-5667-6 mis-homed warn: % re-homed', t;
END $$;
