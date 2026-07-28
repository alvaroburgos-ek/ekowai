-- SOURCE-SETTLED — VSME: mis-homed WARN gate re-home (16), ALL within VSME (no
-- cross-guideline content). Each warn CR's condition operands live only on the target worksheet, not
-- its current host; worksheet-local lookup => pending/fail forever. Re-home to the operands' worksheet.
-- warn->warn = zero enforcement change. Reproduction EXECUTED per row (evaluateCondition absent->
-- pending/fail, present->pass/fail). Guarded per-row + count-checked. Rule 15 class.
-- Rollback: scripts/rollback-20260728240000-vsme.sql
DO $$ DECLARE v int:=0; t int:=0; BEGIN
  -- VSME-B01.000 -> VSME-B09.000: VSME-CR-B09-03(fail->pass)
  UPDATE compliance_requirements SET worksheet_template_id='d20b28b1-9364-4a31-8f80-a76c0adfb548'
   WHERE worksheet_template_id='9ddd8945-4cb6-47fa-88dd-71d01271f12b' AND id IN (
     '9b57d242-19bf-40df-9a09-3142aa5b4eda');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  -- VSME-B01.000 -> VSME-B10.000: VSME-CR-B10-01(fail->pass), VSME-CR-B10-02(fail->pass)
  UPDATE compliance_requirements SET worksheet_template_id='3ebb6ea0-00c2-4200-86eb-462d63680993'
   WHERE worksheet_template_id='9ddd8945-4cb6-47fa-88dd-71d01271f12b' AND id IN (
     '1a1cf47a-d6ce-471d-9bc7-148f596697c9',
     'adcd0077-1e2b-4e35-b973-d4c7db96d606');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  -- VSME-B01.000 -> VSME-B01.200: VSME-CR-B01-09(fail->pass)
  UPDATE compliance_requirements SET worksheet_template_id='e52f7973-52dd-4ee5-aeb8-4c5d59bd1f15'
   WHERE worksheet_template_id='9ddd8945-4cb6-47fa-88dd-71d01271f12b' AND id IN (
     '2882909c-753f-4609-81a9-023ea82fecbd');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  -- VSME-B01.000 -> VSME-B08.300: VSME-CR-B08-03(fail->pass)
  UPDATE compliance_requirements SET worksheet_template_id='e7d43d47-2055-4c6b-ab0c-0d01dd0d6cef'
   WHERE worksheet_template_id='9ddd8945-4cb6-47fa-88dd-71d01271f12b' AND id IN (
     '63c6798d-147b-4e39-91be-91e4b95e7a0d');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  -- VSME-B01.000 -> VSME-B11.000: VSME-CR-B11-01(fail->pass)
  UPDATE compliance_requirements SET worksheet_template_id='6e334462-71d3-475d-8cc4-0a6ef3497c66'
   WHERE worksheet_template_id='9ddd8945-4cb6-47fa-88dd-71d01271f12b' AND id IN (
     '47823c78-f4c8-466c-8542-02eb1d576e5e');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  -- VSME-B01.000 -> VSME-C01.000: VSME-CR-C01-01(fail->pass)
  UPDATE compliance_requirements SET worksheet_template_id='230d78f6-2682-44ce-9423-edcbf5a88110'
   WHERE worksheet_template_id='9ddd8945-4cb6-47fa-88dd-71d01271f12b' AND id IN (
     '54b20079-571e-4de7-b006-eea588fc8787');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  -- VSME-B01.000 -> VSME-C06.000: VSME-CR-C06-01(fail->pass)
  UPDATE compliance_requirements SET worksheet_template_id='c193a34f-a463-4064-ad80-32e64bde2cd0'
   WHERE worksheet_template_id='9ddd8945-4cb6-47fa-88dd-71d01271f12b' AND id IN (
     '80c7ca55-ffbc-475a-8a67-94d4a6dfa435');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  -- VSME-B01.000 -> VSME-C08.100: VSME-CR-C08-01(fail->pass)
  UPDATE compliance_requirements SET worksheet_template_id='b40da2a9-6c59-43e9-8700-5995c53410e8'
   WHERE worksheet_template_id='9ddd8945-4cb6-47fa-88dd-71d01271f12b' AND id IN (
     '18f70e2e-9d80-42db-ad21-e57b193b36fb');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  -- VSME-B01.000 -> VSME-C09.000: VSME-CR-C09-01(fail->pass)
  UPDATE compliance_requirements SET worksheet_template_id='d754611b-b616-4438-8ec2-52a82977ad52'
   WHERE worksheet_template_id='9ddd8945-4cb6-47fa-88dd-71d01271f12b' AND id IN (
     'fafa0b33-bf99-477f-af6c-54f6b062cfc7');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  -- VSME-B01.000 -> VSME-B03.300: VSME-CR-B03-04(fail->pass)
  UPDATE compliance_requirements SET worksheet_template_id='ee7c801c-52c8-41ee-a193-f9acd11129ed'
   WHERE worksheet_template_id='9ddd8945-4cb6-47fa-88dd-71d01271f12b' AND id IN (
     'f85e8a04-b493-47b7-8a00-ac8b07ef0d02');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  -- VSME-B01.000 -> VSME-B05.000: VSME-CR-B05-01(fail->pass)
  UPDATE compliance_requirements SET worksheet_template_id='711f5123-b8b6-40a8-9474-b9b71474e361'
   WHERE worksheet_template_id='9ddd8945-4cb6-47fa-88dd-71d01271f12b' AND id IN (
     '6a64494a-8866-477d-b59f-4f55c7b644b1');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  -- VSME-B01.000 -> VSME-B06.000: VSME-CR-B06-02(fail->pass)
  UPDATE compliance_requirements SET worksheet_template_id='85539063-3b5e-4010-afd9-7441e4689584'
   WHERE worksheet_template_id='9ddd8945-4cb6-47fa-88dd-71d01271f12b' AND id IN (
     '4143d17a-cdfd-43d7-82f8-f3c2b5b27194');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  -- VSME-B01.000 -> VSME-B07.200: VSME-CR-B07-02(fail->pass)
  UPDATE compliance_requirements SET worksheet_template_id='bf7fa492-8009-42f2-ad47-d3311bd358e8'
   WHERE worksheet_template_id='9ddd8945-4cb6-47fa-88dd-71d01271f12b' AND id IN (
     '3ea0aa29-70cc-4b51-ba5a-bf6fad174833');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  -- VSME-B01.000 -> VSME-B08.000: VSME-CR-B08-01(fail->pass)
  UPDATE compliance_requirements SET worksheet_template_id='6409fc96-1e9f-428a-995f-f46d874b5133'
   WHERE worksheet_template_id='9ddd8945-4cb6-47fa-88dd-71d01271f12b' AND id IN (
     'f8ec50f8-7fd2-4dde-b17b-300eca8b7c9d');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  -- VSME-B01.000 -> VSME-B08.100: VSME-CR-B08-02(fail->pass)
  UPDATE compliance_requirements SET worksheet_template_id='a594ff92-00a3-4f19-8e50-c740f6a75f28'
   WHERE worksheet_template_id='9ddd8945-4cb6-47fa-88dd-71d01271f12b' AND id IN (
     '5bd41bb7-7cbd-4e2a-9477-1291c7b67f86');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  IF t <> 16 THEN RAISE EXCEPTION 'VSME expected 16, got %', t; END IF;
  RAISE NOTICE 'VSME mis-homed warn: % re-homed', t;
END $$;
