-- DIN-276 KG 100 — restructure inputs into KG 1NN sub-sections
DO $din276_subs_100$
DECLARE
  v_wt_id uuid;
  v_sec_c_id uuid;
  v_sub_id uuid;
BEGIN
  SELECT wt.id INTO v_wt_id FROM worksheet_templates wt
    JOIN standards s ON s.id = wt.standard_id
    WHERE s.code = 'DIN-276' AND wt.code = 'DIN-276-09';
  IF v_wt_id IS NULL THEN RAISE EXCEPTION 'Worksheet DIN-276-09 not found'; END IF;
  SELECT id INTO v_sec_c_id FROM worksheet_sections WHERE worksheet_template_id = v_wt_id AND code = 'C';
  IF v_sec_c_id IS NULL THEN RAISE EXCEPTION 'Section C missing for DIN-276-09'; END IF;

  -- KG 110 — Grundstückswert
  SELECT id INTO v_sub_id FROM worksheet_sections WHERE worksheet_template_id = v_wt_id AND parent_section_id = v_sec_c_id AND code = 'KG 110';
  IF v_sub_id IS NULL THEN
    INSERT INTO worksheet_sections (worksheet_template_id, parent_section_id, code, title_de, title_en, order_index)
      VALUES (v_wt_id, v_sec_c_id, 'KG 110', 'Grundstückswert', 'Property value', 110)
      RETURNING id INTO v_sub_id;
  END IF;
  UPDATE fields SET section_id = v_sub_id WHERE worksheet_template_id = v_wt_id AND symbol = 'kg_110';

  -- KG 120 — Grundstücksnebenkosten
  SELECT id INTO v_sub_id FROM worksheet_sections WHERE worksheet_template_id = v_wt_id AND parent_section_id = v_sec_c_id AND code = 'KG 120';
  IF v_sub_id IS NULL THEN
    INSERT INTO worksheet_sections (worksheet_template_id, parent_section_id, code, title_de, title_en, order_index)
      VALUES (v_wt_id, v_sec_c_id, 'KG 120', 'Grundstücksnebenkosten', 'Incidental property costs', 120)
      RETURNING id INTO v_sub_id;
  END IF;
  UPDATE fields SET section_id = v_sub_id WHERE worksheet_template_id = v_wt_id AND symbol IN ('kg_121', 'kg_122', 'kg_123', 'kg_124', 'kg_125', 'kg_126', 'kg_127', 'kg_128', 'kg_129');
  UPDATE fields SET section_id = v_sub_id, order_index = 9999 WHERE worksheet_template_id = v_wt_id AND symbol = 'kg_120_total';

  -- KG 130 — Rechte Dritter
  SELECT id INTO v_sub_id FROM worksheet_sections WHERE worksheet_template_id = v_wt_id AND parent_section_id = v_sec_c_id AND code = 'KG 130';
  IF v_sub_id IS NULL THEN
    INSERT INTO worksheet_sections (worksheet_template_id, parent_section_id, code, title_de, title_en, order_index)
      VALUES (v_wt_id, v_sec_c_id, 'KG 130', 'Rechte Dritter', 'Third party rights', 130)
      RETURNING id INTO v_sub_id;
  END IF;
  UPDATE fields SET section_id = v_sub_id WHERE worksheet_template_id = v_wt_id AND symbol IN ('kg_131', 'kg_132', 'kg_139');
  UPDATE fields SET section_id = v_sub_id, order_index = 9999 WHERE worksheet_template_id = v_wt_id AND symbol = 'kg_130_total';

END
$din276_subs_100$;
