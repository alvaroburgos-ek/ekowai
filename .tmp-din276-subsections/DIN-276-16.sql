-- DIN-276 KG 800 — restructure inputs into KG 8NN sub-sections
DO $din276_subs_800$
DECLARE
  v_wt_id uuid;
  v_sec_c_id uuid;
  v_sub_id uuid;
BEGIN
  SELECT wt.id INTO v_wt_id FROM worksheet_templates wt
    JOIN standards s ON s.id = wt.standard_id
    WHERE s.code = 'DIN-276' AND wt.code = 'DIN-276-16';
  IF v_wt_id IS NULL THEN RAISE EXCEPTION 'Worksheet DIN-276-16 not found'; END IF;
  SELECT id INTO v_sec_c_id FROM worksheet_sections WHERE worksheet_template_id = v_wt_id AND code = 'C';
  IF v_sec_c_id IS NULL THEN RAISE EXCEPTION 'Section C missing for DIN-276-16'; END IF;

  -- KG 810 — Finanzierungsnebenkosten
  SELECT id INTO v_sub_id FROM worksheet_sections WHERE worksheet_template_id = v_wt_id AND parent_section_id = v_sec_c_id AND code = 'KG 810';
  IF v_sub_id IS NULL THEN
    INSERT INTO worksheet_sections (worksheet_template_id, parent_section_id, code, title_de, title_en, order_index)
      VALUES (v_wt_id, v_sec_c_id, 'KG 810', 'Finanzierungsnebenkosten', 'Ancillary financing costs', 810)
      RETURNING id INTO v_sub_id;
  END IF;
  UPDATE fields SET section_id = v_sub_id WHERE worksheet_template_id = v_wt_id AND symbol = 'kg_810';

  -- KG 820 — Fremdkapitalzinsen
  SELECT id INTO v_sub_id FROM worksheet_sections WHERE worksheet_template_id = v_wt_id AND parent_section_id = v_sec_c_id AND code = 'KG 820';
  IF v_sub_id IS NULL THEN
    INSERT INTO worksheet_sections (worksheet_template_id, parent_section_id, code, title_de, title_en, order_index)
      VALUES (v_wt_id, v_sec_c_id, 'KG 820', 'Fremdkapitalzinsen', 'Interest on borrowed capital', 820)
      RETURNING id INTO v_sub_id;
  END IF;
  UPDATE fields SET section_id = v_sub_id WHERE worksheet_template_id = v_wt_id AND symbol = 'kg_820';

  -- KG 830 — Eigenkapitalzinsen
  SELECT id INTO v_sub_id FROM worksheet_sections WHERE worksheet_template_id = v_wt_id AND parent_section_id = v_sec_c_id AND code = 'KG 830';
  IF v_sub_id IS NULL THEN
    INSERT INTO worksheet_sections (worksheet_template_id, parent_section_id, code, title_de, title_en, order_index)
      VALUES (v_wt_id, v_sec_c_id, 'KG 830', 'Eigenkapitalzinsen', 'Interest on equity', 830)
      RETURNING id INTO v_sub_id;
  END IF;
  UPDATE fields SET section_id = v_sub_id WHERE worksheet_template_id = v_wt_id AND symbol = 'kg_830';

  -- KG 840 — Bürgschaften
  SELECT id INTO v_sub_id FROM worksheet_sections WHERE worksheet_template_id = v_wt_id AND parent_section_id = v_sec_c_id AND code = 'KG 840';
  IF v_sub_id IS NULL THEN
    INSERT INTO worksheet_sections (worksheet_template_id, parent_section_id, code, title_de, title_en, order_index)
      VALUES (v_wt_id, v_sec_c_id, 'KG 840', 'Bürgschaften', 'Guarantees', 840)
      RETURNING id INTO v_sub_id;
  END IF;
  UPDATE fields SET section_id = v_sub_id WHERE worksheet_template_id = v_wt_id AND symbol = 'kg_840';

  -- KG 890 — Sonstige Finanzierungskosten
  SELECT id INTO v_sub_id FROM worksheet_sections WHERE worksheet_template_id = v_wt_id AND parent_section_id = v_sec_c_id AND code = 'KG 890';
  IF v_sub_id IS NULL THEN
    INSERT INTO worksheet_sections (worksheet_template_id, parent_section_id, code, title_de, title_en, order_index)
      VALUES (v_wt_id, v_sec_c_id, 'KG 890', 'Sonstige Finanzierungskosten', 'Other financing costs', 890)
      RETURNING id INTO v_sub_id;
  END IF;
  UPDATE fields SET section_id = v_sub_id WHERE worksheet_template_id = v_wt_id AND symbol = 'kg_890';

END
$din276_subs_800$;
