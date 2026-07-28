-- SOURCE-SETTLED FIX — ISO-5667-1 CR-001/CR-010: condition uses the operator 'eq', which the
-- condition grammar does not parse -> evaluateCondition returns kind:'manual' (dead gate) both
-- ways. The engine's operator is '=='; sibling CR-003 already uses '== true'. Mechanical
-- operator repair, fully determined. Both warn severity -> zero blocking-behaviour change (a
-- dead 'manual' gate becomes a live pass/fail advisory).
-- EXECUTION PROOF (real evaluateCondition, this session):
--   'X eq true' -> manual / manual ;  'X == true' -> pass(true) / fail(false).
DO $$
DECLARE v_n int;
BEGIN
  UPDATE compliance_requirements SET condition = 'objectives_defined == true'
   WHERE code='CR-001' AND condition='objectives_defined eq true'
     AND worksheet_template_id IN (SELECT id FROM worksheet_templates WHERE standard_id=(SELECT id FROM standards WHERE code='ISO-5667-1'));
  GET DIAGNOSTICS v_n = ROW_COUNT; RAISE NOTICE 'CR-001: % row(s)', v_n;
  UPDATE compliance_requirements SET condition = 'sampling_location_identified == true'
   WHERE code='CR-010' AND condition='sampling_location_identified eq true'
     AND worksheet_template_id IN (SELECT id FROM worksheet_templates WHERE standard_id=(SELECT id FROM standards WHERE code='ISO-5667-1'));
  GET DIAGNOSTICS v_n = ROW_COUNT; RAISE NOTICE 'CR-010: % row(s)', v_n;
END $$;
