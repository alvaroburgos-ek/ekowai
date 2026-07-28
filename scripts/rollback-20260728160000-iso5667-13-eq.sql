DO $$
DECLARE v_std uuid;
BEGIN
  SELECT id INTO v_std FROM standards WHERE code='ISO-5667-13';
  UPDATE compliance_requirements SET condition = replace(condition, ' == ', ' eq ')
   WHERE code IN ('CR-007','CR-008','CR-021','CR-023') AND condition LIKE '% == true'
     AND worksheet_template_id IN (SELECT id FROM worksheet_templates WHERE standard_id=v_std);
  RAISE NOTICE 'ISO-5667-13 eq rolled back';
END $$;
