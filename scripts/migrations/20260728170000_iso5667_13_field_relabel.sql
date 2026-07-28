-- SOURCE-SETTLED FIX — ISO-5667-13 sample_record_field option a): labelled "Sample
-- identification" / "Probenkennung" but printed §9 a) (p.13, verified in-session) reads "the
-- name of the plant". Relabel to match the guideline. Display labels only; the stable value
-- key 'sample_identification' is preserved (no data-reference migration). Class (b) value
-- contradicting the printed page. Unique strings -> safe text replace, guarded.
DO $$
DECLARE v_n int; v_std uuid;
BEGIN
  SELECT id INTO v_std FROM standards WHERE code='ISO-5667-13';
  UPDATE fields
     SET enum_values = replace(replace(enum_values::text,
           '"label_en": "Sample identification"', '"label_en": "Name of the plant"'),
           '"label_de": "Probenkennung"', '"label_de": "Name der Anlage"')::jsonb
   WHERE symbol='sample_record_field'
     AND worksheet_template_id IN (SELECT id FROM worksheet_templates WHERE standard_id=v_std)
     AND enum_values::text LIKE '%Sample identification%';
  GET DIAGNOSTICS v_n = ROW_COUNT; RAISE NOTICE 'relabel: % field', v_n;
END $$;
