-- SOURCE-SETTLED — FLL-GAR-2023: mis-homed WARN gate re-home (2), ALL within FLL-GAR-2023 (no
-- cross-guideline content). Each warn CR's condition operands live only on the target worksheet, not
-- its current host; worksheet-local lookup => pending/fail forever. Re-home to the operands' worksheet.
-- warn->warn = zero enforcement change. Reproduction EXECUTED per row (evaluateCondition absent->
-- pending/fail, present->pass/fail). Guarded per-row + count-checked. Rule 15 class.
-- Rollback: scripts/rollback-20260728253000-fll_gar_2023.sql
DO $$ DECLARE v int:=0; t int:=0; BEGIN
  -- FLL-GAR-22 -> FLL-GAR-23: REQ-23(pending->fail)
  UPDATE compliance_requirements SET worksheet_template_id='17b8386e-6207-4bee-ae24-037c5ca3dde2'
   WHERE worksheet_template_id='969d527d-be79-4f80-9c19-d45a5cdf5e53' AND id IN (
     'ab65828e-1b3d-4ff2-956b-f0207558c101');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  -- FLL-GAR-25 -> FLL-GAR-27: REQ-28(fail->pass)
  UPDATE compliance_requirements SET worksheet_template_id='c51f9051-529e-43c2-b5df-bd7c4f27d227'
   WHERE worksheet_template_id='00bbe3e9-e4c3-4d86-be48-5274762cfa28' AND id IN (
     'cf4cfe44-5bcd-415b-8f43-13f0b1fc496c');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  IF t <> 2 THEN RAISE EXCEPTION 'FLL-GAR-2023 expected 2, got %', t; END IF;
  RAISE NOTICE 'FLL-GAR-2023 mis-homed warn: % re-homed', t;
END $$;
