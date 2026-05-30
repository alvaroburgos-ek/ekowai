-- DIN-276 KG 200 — restructure inputs into KG 2NN sub-sections
DO $din276_subs_200$
DECLARE
  v_wt_id uuid;
  v_sec_c_id uuid;
  v_sub_id uuid;
BEGIN
  SELECT wt.id INTO v_wt_id FROM worksheet_templates wt
    JOIN standards s ON s.id = wt.standard_id
    WHERE s.code = 'DIN-276' AND wt.code = 'DIN-276-10';
  IF v_wt_id IS NULL THEN RAISE EXCEPTION 'Worksheet DIN-276-10 not found'; END IF;
  SELECT id INTO v_sec_c_id FROM worksheet_sections WHERE worksheet_template_id = v_wt_id AND code = 'C';
  IF v_sec_c_id IS NULL THEN RAISE EXCEPTION 'Section C missing for DIN-276-10'; END IF;

  -- KG 210 — Herrichten
  SELECT id INTO v_sub_id FROM worksheet_sections WHERE worksheet_template_id = v_wt_id AND parent_section_id = v_sec_c_id AND code = 'KG 210';
  IF v_sub_id IS NULL THEN
    INSERT INTO worksheet_sections (worksheet_template_id, parent_section_id, code, title_de, title_en, order_index)
      VALUES (v_wt_id, v_sec_c_id, 'KG 210', 'Herrichten', 'Preparation', 210)
      RETURNING id INTO v_sub_id;
  END IF;
  UPDATE fields SET section_id = v_sub_id WHERE worksheet_template_id = v_wt_id AND symbol IN ('kg_211', 'kg_212', 'kg_213', 'kg_214', 'kg_215', 'kg_216', 'kg_219');
  UPDATE fields SET section_id = v_sub_id, order_index = 9999 WHERE worksheet_template_id = v_wt_id AND symbol = 'kg_210_total';

  -- KG 220 — Öffentliche Erschließung
  SELECT id INTO v_sub_id FROM worksheet_sections WHERE worksheet_template_id = v_wt_id AND parent_section_id = v_sec_c_id AND code = 'KG 220';
  IF v_sub_id IS NULL THEN
    INSERT INTO worksheet_sections (worksheet_template_id, parent_section_id, code, title_de, title_en, order_index)
      VALUES (v_wt_id, v_sec_c_id, 'KG 220', 'Öffentliche Erschließung', 'Public development', 220)
      RETURNING id INTO v_sub_id;
  END IF;
  UPDATE fields SET section_id = v_sub_id WHERE worksheet_template_id = v_wt_id AND symbol IN ('kg_221', 'kg_222', 'kg_223', 'kg_224', 'kg_225', 'kg_226', 'kg_227', 'kg_228', 'kg_229');
  UPDATE fields SET section_id = v_sub_id, order_index = 9999 WHERE worksheet_template_id = v_wt_id AND symbol = 'kg_220_total';

  -- KG 230 — Nichtöffentliche Erschließung
  SELECT id INTO v_sub_id FROM worksheet_sections WHERE worksheet_template_id = v_wt_id AND parent_section_id = v_sec_c_id AND code = 'KG 230';
  IF v_sub_id IS NULL THEN
    INSERT INTO worksheet_sections (worksheet_template_id, parent_section_id, code, title_de, title_en, order_index)
      VALUES (v_wt_id, v_sec_c_id, 'KG 230', 'Nichtöffentliche Erschließung', 'Non-public development', 230)
      RETURNING id INTO v_sub_id;
  END IF;
  UPDATE fields SET section_id = v_sub_id WHERE worksheet_template_id = v_wt_id AND symbol = 'kg_230';

  -- KG 240 — Ausgleichsmaßnahmen und -abgaben
  SELECT id INTO v_sub_id FROM worksheet_sections WHERE worksheet_template_id = v_wt_id AND parent_section_id = v_sec_c_id AND code = 'KG 240';
  IF v_sub_id IS NULL THEN
    INSERT INTO worksheet_sections (worksheet_template_id, parent_section_id, code, title_de, title_en, order_index)
      VALUES (v_wt_id, v_sec_c_id, 'KG 240', 'Ausgleichsmaßnahmen und -abgaben', 'Compensatory measures and levies', 240)
      RETURNING id INTO v_sub_id;
  END IF;
  UPDATE fields SET section_id = v_sub_id WHERE worksheet_template_id = v_wt_id AND symbol IN ('kg_241', 'kg_242', 'kg_249');
  UPDATE fields SET section_id = v_sub_id, order_index = 9999 WHERE worksheet_template_id = v_wt_id AND symbol = 'kg_240_total';

  -- KG 250 — Übergangsmaßnahmen
  SELECT id INTO v_sub_id FROM worksheet_sections WHERE worksheet_template_id = v_wt_id AND parent_section_id = v_sec_c_id AND code = 'KG 250';
  IF v_sub_id IS NULL THEN
    INSERT INTO worksheet_sections (worksheet_template_id, parent_section_id, code, title_de, title_en, order_index)
      VALUES (v_wt_id, v_sec_c_id, 'KG 250', 'Übergangsmaßnahmen', 'Transitional measures', 250)
      RETURNING id INTO v_sub_id;
  END IF;
  UPDATE fields SET section_id = v_sub_id WHERE worksheet_template_id = v_wt_id AND symbol IN ('kg_251', 'kg_252', 'kg_259');
  UPDATE fields SET section_id = v_sub_id, order_index = 9999 WHERE worksheet_template_id = v_wt_id AND symbol = 'kg_250_total';

END
$din276_subs_200$;
