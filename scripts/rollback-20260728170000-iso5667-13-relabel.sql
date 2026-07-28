DO $$
DECLARE v_std uuid;
BEGIN
  SELECT id INTO v_std FROM standards WHERE code='ISO-5667-13';
  UPDATE fields SET enum_values = replace(replace(enum_values::text,
      '"label_en": "Name of the plant"', '"label_en": "Sample identification"'),
      '"label_de": "Name der Anlage"', '"label_de": "Probenkennung"')::jsonb
   WHERE symbol='sample_record_field' AND worksheet_template_id IN (SELECT id FROM worksheet_templates WHERE standard_id=v_std);
  RAISE NOTICE 'ISO-5667-13 relabel rolled back';
END $$;
