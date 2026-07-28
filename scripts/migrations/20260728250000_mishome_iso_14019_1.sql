-- SOURCE-SETTLED — ISO-14019-1: mis-homed WARN gate re-home (4), ALL within ISO-14019-1 (no
-- cross-guideline content). Each warn CR's condition operands live only on the target worksheet, not
-- its current host; worksheet-local lookup => pending/fail forever. Re-home to the operands' worksheet.
-- warn->warn = zero enforcement change. Reproduction EXECUTED per row (evaluateCondition absent->
-- pending/fail, present->pass/fail). Guarded per-row + count-checked. Rule 15 class.
-- Rollback: scripts/rollback-20260728250000-iso_14019_1.sql
DO $$ DECLARE v int:=0; t int:=0; BEGIN
  -- ISO-14019-1-01 -> ISO-14019-1-02: CR-002(fail->pass), CR-003(pending->pass), CR-004(fail->pass)
  UPDATE compliance_requirements SET worksheet_template_id='c081151f-aeb7-46c5-b905-f4bd45b5d80f'
   WHERE worksheet_template_id='072885e4-9498-4c0c-9585-fb94ba5501ef' AND id IN (
     '0c2129bd-cafb-4ded-bd92-04ed8c7f74c8',
     '51842dd0-e51d-4718-a046-80899462a8f9',
     'e957c5da-fbfe-4bdc-93eb-32d42aa3a944');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  -- ISO-14019-1-04 -> ISO-14019-1-05: CR-029(pending->pass)
  UPDATE compliance_requirements SET worksheet_template_id='e3c2f660-4e58-4ccd-807a-29696f79c38b'
   WHERE worksheet_template_id='169f0dc8-5fcf-49b6-9c8d-9cc69cf80835' AND id IN (
     '6b143ac4-907e-4c54-9ee2-ac23c1460614');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  IF t <> 4 THEN RAISE EXCEPTION 'ISO-14019-1 expected 4, got %', t; END IF;
  RAISE NOTICE 'ISO-14019-1 mis-homed warn: % re-homed', t;
END $$;
