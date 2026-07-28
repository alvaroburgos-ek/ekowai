-- SOURCE-SETTLED FIX — ISO-5667-13 CR-007/008/021/023: condition operator 'eq' is unparseable
-- -> dead gate (manual both ways). Engine operator is '=='. All warn -> zero blocking change.
-- Same class + execution proof as ISO-5667-1 wave 12 ('eq'->manual, '=='->pass/fail).
DO $$
DECLARE v_n int; v_std uuid;
BEGIN
  SELECT id INTO v_std FROM standards WHERE code='ISO-5667-13';
  UPDATE compliance_requirements SET condition = replace(condition, ' eq ', ' == ')
   WHERE code IN ('CR-007','CR-008','CR-021','CR-023') AND condition LIKE '% eq true'
     AND worksheet_template_id IN (SELECT id FROM worksheet_templates WHERE standard_id=v_std);
  GET DIAGNOSTICS v_n = ROW_COUNT; RAISE NOTICE 'ISO-5667-13 eq->==: % row(s)', v_n;
END $$;
