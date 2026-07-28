-- SOURCE-SETTLED — ISO-14004: mis-homed WARN gate re-home (10), ALL within ISO-14004 (no
-- cross-guideline content). Each warn CR's condition operands live only on the target worksheet, not
-- its current host; worksheet-local lookup => pending/fail forever. Re-home to the operands' worksheet.
-- warn->warn = zero enforcement change. Reproduction EXECUTED per row (evaluateCondition absent->
-- pending/fail, present->pass/fail). Guarded per-row + count-checked. Rule 15 class.
-- Rollback: scripts/rollback-20260728241000-iso_14004.sql
DO $$ DECLARE v int:=0; t int:=0; BEGIN
  -- ISO-14004-03 -> ISO-14004-05: CR-034(fail->pass), CR-015(fail->pass), CR-016(fail->pass), CR-017(fail->pass), CR-018(fail->pass)
  UPDATE compliance_requirements SET worksheet_template_id='f341160d-c105-4979-b2ca-484741f32a6f'
   WHERE worksheet_template_id='bb96d1f0-49df-40c4-8cfb-bd6e32801aa4' AND id IN (
     'd92662d5-8199-44cc-bed2-7826bc74f921',
     '3dd05227-8345-4564-8e92-b74d17e737a8',
     '987e261f-22f0-4065-9c11-c39c15cb1472',
     'dec7d1d8-9d8b-4f77-afdd-3e6ca86c1afb',
     '26704a1d-7f77-40d9-b67c-2d982bc87a86');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  -- ISO-14004-03 -> ISO-14004-04: CR-013(fail->pass), CR-014(pending->pass)
  UPDATE compliance_requirements SET worksheet_template_id='babc5125-43b8-4595-a1bb-41a224e4da3c'
   WHERE worksheet_template_id='bb96d1f0-49df-40c4-8cfb-bd6e32801aa4' AND id IN (
     'bb44742d-0ccb-46e1-874e-ff986b1c8556',
     '2846e591-6d5d-49bd-b896-fc515769a6c0');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  -- ISO-14004-08 -> ISO-14004-09: CR-031(fail->pass), CR-032(fail->pass), CR-030(fail->pass)
  UPDATE compliance_requirements SET worksheet_template_id='c25ab137-ab66-4551-b5a0-edb9f1595d8f'
   WHERE worksheet_template_id='a8558733-16a3-4c1f-8172-c12ed8505aab' AND id IN (
     '3deb0863-61a3-46a5-a2f0-85bc9ac88377',
     'f4dc3acb-1817-4c6c-b9dc-e9db3b375238',
     'aceaeecf-f4fa-4d7e-9549-f4e90d96ff78');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  IF t <> 10 THEN RAISE EXCEPTION 'ISO-14004 expected 10, got %', t; END IF;
  RAISE NOTICE 'ISO-14004 mis-homed warn: % re-homed', t;
END $$;
