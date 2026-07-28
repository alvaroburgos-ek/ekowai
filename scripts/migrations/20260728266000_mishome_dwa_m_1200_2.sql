-- SOURCE-SETTLED — DWA-M-1200-2: mis-homed WARN gate re-home (1), ALL within DWA-M-1200-2 (no
-- cross-guideline content). Each warn CR's condition operands live only on the target worksheet, not
-- its current host; worksheet-local lookup => pending/fail forever. Re-home to the operands' worksheet.
-- warn->warn = zero enforcement change. Reproduction EXECUTED per row (evaluateCondition absent->
-- pending/fail, present->pass/fail). Guarded per-row + count-checked. Rule 15 class.
-- Rollback: scripts/rollback-20260728266000-dwa_m_1200_2.sql
DO $$ DECLARE v int:=0; t int:=0; BEGIN
  -- M12002-13 -> M12002-14: REQ-12(pending->pass)
  UPDATE compliance_requirements SET worksheet_template_id='6320b289-1988-419d-82ff-f3971f53781a'
   WHERE worksheet_template_id='22ee1863-b4f4-40cb-b968-56194ecf7560' AND id IN (
     '23f689c5-ab12-4cc8-8a95-a180b0941f47');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  IF t <> 1 THEN RAISE EXCEPTION 'DWA-M-1200-2 expected 1, got %', t; END IF;
  RAISE NOTICE 'DWA-M-1200-2 mis-homed warn: % re-homed', t;
END $$;
