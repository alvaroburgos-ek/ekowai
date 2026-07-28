-- SOURCE-SETTLED — DWA-M-820-2: mis-homed WARN gate re-home (8), ALL within DWA-M-820-2 (no
-- cross-guideline content). Each warn CR's condition operands live only on the target worksheet, not
-- its current host; worksheet-local lookup => pending/fail forever. Re-home to the operands' worksheet.
-- warn->warn = zero enforcement change. Reproduction EXECUTED per row (evaluateCondition absent->
-- pending/fail, present->pass/fail). Guarded per-row + count-checked. Rule 15 class.
-- Rollback: scripts/rollback-20260728262000-dwa_m_820_2.sql
DO $$ DECLARE v int:=0; t int:=0; BEGIN
  -- 820-2-01 -> 820-2-02: REQ-02(fail->pass)
  UPDATE compliance_requirements SET worksheet_template_id='ba4ef107-b98d-4556-b593-56e1bd9564c2'
   WHERE worksheet_template_id='0ad1188c-d998-4c22-bad6-b202ea73e84e' AND id IN (
     '0a4788a5-aeb5-4cf2-a835-305d162064b8');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  -- 820-2-05 -> 820-2-06: REQ-08(fail->pass), REQ-15(pending->pass)
  UPDATE compliance_requirements SET worksheet_template_id='3afd1179-d2a3-420a-aac2-b1ffb267e61c'
   WHERE worksheet_template_id='42a5471e-04b2-4c9e-bb87-21a16110d9a3' AND id IN (
     '75b3dd34-1dc9-4a05-8e14-c37032d49f0f',
     '8b691c7e-2dd1-4a9f-ad76-f69c81e5567a');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  -- 820-2-11 -> 820-2-02: REQ-26(fail->pass)
  UPDATE compliance_requirements SET worksheet_template_id='ba4ef107-b98d-4556-b593-56e1bd9564c2'
   WHERE worksheet_template_id='dba8519c-632e-4374-b0b5-826ac0fcb0d4' AND id IN (
     '182d8337-937f-4678-990e-cb0f454543e8');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  -- 820-2-16 -> 820-2-18: REQ-40(fail->pass)
  UPDATE compliance_requirements SET worksheet_template_id='8f208905-8928-4858-9fae-8a066f0b1354'
   WHERE worksheet_template_id='4a400a26-4bbf-4017-b2d9-aa6c95ec9acb' AND id IN (
     '6e1ab13f-cb65-4552-aea5-912431684d8c');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  -- 820-2-20 -> 820-2-09: REQ-45(pending->pass)
  UPDATE compliance_requirements SET worksheet_template_id='d0321800-d356-4df7-b80b-1e6f789ac213'
   WHERE worksheet_template_id='379a0cd7-9842-4db6-8269-c90ea2f90766' AND id IN (
     '55067b99-ba04-4327-90fc-e8e986a5a317');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  -- 820-2-25 -> 820-2-27: REQ-57(fail->pass)
  UPDATE compliance_requirements SET worksheet_template_id='2084198a-18e3-49b1-b0e8-0bd17c06d49f'
   WHERE worksheet_template_id='d79d19f5-8415-4fda-8a01-4535f72575b0' AND id IN (
     'e781b81b-444c-45e6-99b0-1816733195ce');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  -- 820-2-25 -> 820-2-28: REQ-60(fail->pass)
  UPDATE compliance_requirements SET worksheet_template_id='ead1cce4-a075-482b-a089-e9eab59d1c2b'
   WHERE worksheet_template_id='d79d19f5-8415-4fda-8a01-4535f72575b0' AND id IN (
     '8c1a34a1-1290-4cb2-a906-b00749a43ab6');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  IF t <> 8 THEN RAISE EXCEPTION 'DWA-M-820-2 expected 8, got %', t; END IF;
  RAISE NOTICE 'DWA-M-820-2 mis-homed warn: % re-homed', t;
END $$;
