-- SOURCE-SETTLED — ISO-59014: mis-homed WARN gate re-home (2), ALL within ISO-59014 (no
-- cross-guideline content). Each warn CR's condition operands live only on the target worksheet, not
-- its current host; worksheet-local lookup => pending/fail forever. Re-home to the operands' worksheet.
-- warn->warn = zero enforcement change. Reproduction EXECUTED per row (evaluateCondition absent->
-- pending/fail, present->pass/fail). Guarded per-row + count-checked. Rule 15 class.
-- Rollback: scripts/rollback-20260728255000-iso_59014.sql
DO $$ DECLARE v int:=0; t int:=0; BEGIN
  -- ISO-59014-01 -> ISO-59014-02: CR-001(pending->pass), CR-002(fail->pass)
  UPDATE compliance_requirements SET worksheet_template_id='604f98db-e966-4ae1-815e-05baff280e17'
   WHERE worksheet_template_id='6152f477-9245-4865-ae1c-50467f53e5f5' AND id IN (
     '3669a9b7-1771-4e17-b252-58384ceda095',
     'ec153f1f-386f-4707-8961-79757e4a1473');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  IF t <> 2 THEN RAISE EXCEPTION 'ISO-59014 expected 2, got %', t; END IF;
  RAISE NOTICE 'ISO-59014 mis-homed warn: % re-homed', t;
END $$;
