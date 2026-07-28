-- SOURCE-SETTLED — DWA-M-1200-1: mis-homed WARN gate re-home (4), ALL within DWA-M-1200-1 (no
-- cross-guideline content). Each warn CR's condition operands live only on the target worksheet, not
-- its current host; worksheet-local lookup => pending/fail forever. Re-home to the operands' worksheet.
-- warn->warn = zero enforcement change. Reproduction EXECUTED per row (evaluateCondition absent->
-- pending/fail, present->pass/fail). Guarded per-row + count-checked. Rule 15 class.
-- Rollback: scripts/rollback-20260728249000-dwa_m_1200_1.sql
DO $$ DECLARE v int:=0; t int:=0; BEGIN
  -- M12001-08 -> M12001-03: CR-018(fail->pass)
  UPDATE compliance_requirements SET worksheet_template_id='c3f4905e-a8cc-4028-b38d-b6de7ae1f821'
   WHERE worksheet_template_id='ccfe957d-c71a-4494-b166-1197f7f0e5e4' AND id IN (
     '93c7677a-8775-451d-828f-6a31d80d2137');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  -- M12001-08 -> M12001-19: CR-021(pending->pass)
  UPDATE compliance_requirements SET worksheet_template_id='a84bbc08-cbbf-412d-a8c6-0d35af2b143b'
   WHERE worksheet_template_id='ccfe957d-c71a-4494-b166-1197f7f0e5e4' AND id IN (
     'bfa7f0dd-070d-4e2a-9d8b-dbabbf6a4b55');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  -- M12001-12 -> M12001-13: CR-009(pending->pass), CR-020(pending->pass)
  UPDATE compliance_requirements SET worksheet_template_id='4978fb6e-ab8e-406c-8f26-59a45411ee4a'
   WHERE worksheet_template_id='87527244-a36d-41b8-8560-85a31522d2d2' AND id IN (
     'b0a5c5f8-6c3e-4f41-81ec-d872b20e0ff3',
     '86a7bb6b-3ff2-4c6b-a46c-84f42c07b0e3');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  IF t <> 4 THEN RAISE EXCEPTION 'DWA-M-1200-1 expected 4, got %', t; END IF;
  RAISE NOTICE 'DWA-M-1200-1 mis-homed warn: % re-homed', t;
END $$;
