DO $$
BEGIN
  UPDATE compliance_requirements SET condition='objectives_defined eq true'
   WHERE code='CR-001' AND condition='objectives_defined == true'
     AND worksheet_template_id IN (SELECT id FROM worksheet_templates WHERE standard_id=(SELECT id FROM standards WHERE code='ISO-5667-1'));
  UPDATE compliance_requirements SET condition='sampling_location_identified eq true'
   WHERE code='CR-010' AND condition='sampling_location_identified == true'
     AND worksheet_template_id IN (SELECT id FROM worksheet_templates WHERE standard_id=(SELECT id FROM standards WHERE code='ISO-5667-1'));
  RAISE NOTICE 'ISO-5667-1 eq-operator rolled back';
END $$;
