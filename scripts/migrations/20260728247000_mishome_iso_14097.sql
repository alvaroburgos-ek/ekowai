-- SOURCE-SETTLED — ISO-14097: mis-homed WARN gate re-home (6), ALL within ISO-14097 (no
-- cross-guideline content). Each warn CR's condition operands live only on the target worksheet, not
-- its current host; worksheet-local lookup => pending/fail forever. Re-home to the operands' worksheet.
-- warn->warn = zero enforcement change. Reproduction EXECUTED per row (evaluateCondition absent->
-- pending/fail, present->pass/fail). Guarded per-row + count-checked. Rule 15 class.
-- Rollback: scripts/rollback-20260728247000-iso_14097.sql
DO $$ DECLARE v int:=0; t int:=0; BEGIN
  -- ISO-14097-01 -> ISO-14097-02: CR-002(pending->pass), CR-003(fail->pass)
  UPDATE compliance_requirements SET worksheet_template_id='793ecf83-da91-4b9f-9ead-83ea61a990bb'
   WHERE worksheet_template_id='6ca13aa9-1c03-4d3d-b56f-ec187cf267a8' AND id IN (
     '23d2fb70-3346-45c4-9024-bc093e170023',
     '6242e82a-481b-48c5-9fe8-293f6df54a8f');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  -- ISO-14097-03 -> ISO-14097-04: CR-005(fail->pass), CR-006(fail->pass)
  UPDATE compliance_requirements SET worksheet_template_id='aee3f47b-5e2f-4dda-912d-0bb8b57a9198'
   WHERE worksheet_template_id='986247df-0841-4a43-ab57-21725030a244' AND id IN (
     'a865b845-ef6f-4744-8fff-8929151a6076',
     '70f2c4a2-f7b8-46d8-9289-405ad56adc82');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  -- ISO-14097-05 -> ISO-14097-06: CR-008(fail->pass), CR-009(fail->pass)
  UPDATE compliance_requirements SET worksheet_template_id='313e6e9e-0303-4ffd-8ef5-280b6bef91c4'
   WHERE worksheet_template_id='061d48d6-5f98-4bc0-b384-f3d7efcb0522' AND id IN (
     '0d7a2075-2b8e-4cd7-b29c-3b6bacd42547',
     'fb28155f-1e25-403c-81fb-deac1833921a');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  IF t <> 6 THEN RAISE EXCEPTION 'ISO-14097 expected 6, got %', t; END IF;
  RAISE NOTICE 'ISO-14097 mis-homed warn: % re-homed', t;
END $$;
