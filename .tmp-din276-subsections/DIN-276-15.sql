-- DIN-276 KG 700 — restructure inputs into KG 7NN sub-sections
DO $din276_subs_700$
DECLARE
  v_wt_id uuid;
  v_sec_c_id uuid;
  v_sub_id uuid;
BEGIN
  SELECT wt.id INTO v_wt_id FROM worksheet_templates wt
    JOIN standards s ON s.id = wt.standard_id
    WHERE s.code = 'DIN-276' AND wt.code = 'DIN-276-15';
  IF v_wt_id IS NULL THEN RAISE EXCEPTION 'Worksheet DIN-276-15 not found'; END IF;
  SELECT id INTO v_sec_c_id FROM worksheet_sections WHERE worksheet_template_id = v_wt_id AND code = 'C';
  IF v_sec_c_id IS NULL THEN RAISE EXCEPTION 'Section C missing for DIN-276-15'; END IF;

  -- KG 710 — Bauherrenaufgaben
  SELECT id INTO v_sub_id FROM worksheet_sections WHERE worksheet_template_id = v_wt_id AND parent_section_id = v_sec_c_id AND code = 'KG 710';
  IF v_sub_id IS NULL THEN
    INSERT INTO worksheet_sections (worksheet_template_id, parent_section_id, code, title_de, title_en, order_index)
      VALUES (v_wt_id, v_sec_c_id, 'KG 710', 'Bauherrenaufgaben', 'Client tasks', 710)
      RETURNING id INTO v_sub_id;
  END IF;
  UPDATE fields SET section_id = v_sub_id WHERE worksheet_template_id = v_wt_id AND symbol IN ('kg_711', 'kg_712', 'kg_713', 'kg_714', 'kg_715', 'kg_719');
  UPDATE fields SET section_id = v_sub_id, order_index = 9999 WHERE worksheet_template_id = v_wt_id AND symbol = 'kg_710_total';

  -- KG 720 — Vorbereitung der Objektplanung
  SELECT id INTO v_sub_id FROM worksheet_sections WHERE worksheet_template_id = v_wt_id AND parent_section_id = v_sec_c_id AND code = 'KG 720';
  IF v_sub_id IS NULL THEN
    INSERT INTO worksheet_sections (worksheet_template_id, parent_section_id, code, title_de, title_en, order_index)
      VALUES (v_wt_id, v_sec_c_id, 'KG 720', 'Vorbereitung der Objektplanung', 'Preparation of object planning', 720)
      RETURNING id INTO v_sub_id;
  END IF;
  UPDATE fields SET section_id = v_sub_id WHERE worksheet_template_id = v_wt_id AND symbol IN ('kg_721', 'kg_722', 'kg_723', 'kg_724', 'kg_725', 'kg_729');
  UPDATE fields SET section_id = v_sub_id, order_index = 9999 WHERE worksheet_template_id = v_wt_id AND symbol = 'kg_720_total';

  -- KG 730 — Objektplanung
  SELECT id INTO v_sub_id FROM worksheet_sections WHERE worksheet_template_id = v_wt_id AND parent_section_id = v_sec_c_id AND code = 'KG 730';
  IF v_sub_id IS NULL THEN
    INSERT INTO worksheet_sections (worksheet_template_id, parent_section_id, code, title_de, title_en, order_index)
      VALUES (v_wt_id, v_sec_c_id, 'KG 730', 'Objektplanung', 'Project planning', 730)
      RETURNING id INTO v_sub_id;
  END IF;
  UPDATE fields SET section_id = v_sub_id WHERE worksheet_template_id = v_wt_id AND symbol IN ('kg_731', 'kg_732', 'kg_733', 'kg_734', 'kg_739');
  UPDATE fields SET section_id = v_sub_id, order_index = 9999 WHERE worksheet_template_id = v_wt_id AND symbol = 'kg_730_total';

  -- KG 740 — Fachplanung
  SELECT id INTO v_sub_id FROM worksheet_sections WHERE worksheet_template_id = v_wt_id AND parent_section_id = v_sec_c_id AND code = 'KG 740';
  IF v_sub_id IS NULL THEN
    INSERT INTO worksheet_sections (worksheet_template_id, parent_section_id, code, title_de, title_en, order_index)
      VALUES (v_wt_id, v_sec_c_id, 'KG 740', 'Fachplanung', 'Specialised planning', 740)
      RETURNING id INTO v_sub_id;
  END IF;
  UPDATE fields SET section_id = v_sub_id WHERE worksheet_template_id = v_wt_id AND symbol IN ('kg_741', 'kg_742', 'kg_743', 'kg_744', 'kg_745', 'kg_746', 'kg_747', 'kg_748', 'kg_749');
  UPDATE fields SET section_id = v_sub_id, order_index = 9999 WHERE worksheet_template_id = v_wt_id AND symbol = 'kg_740_total';

  -- KG 750 — Künstlerische Leistungen
  SELECT id INTO v_sub_id FROM worksheet_sections WHERE worksheet_template_id = v_wt_id AND parent_section_id = v_sec_c_id AND code = 'KG 750';
  IF v_sub_id IS NULL THEN
    INSERT INTO worksheet_sections (worksheet_template_id, parent_section_id, code, title_de, title_en, order_index)
      VALUES (v_wt_id, v_sec_c_id, 'KG 750', 'Künstlerische Leistungen', 'Artistic performances', 750)
      RETURNING id INTO v_sub_id;
  END IF;
  UPDATE fields SET section_id = v_sub_id WHERE worksheet_template_id = v_wt_id AND symbol IN ('kg_751', 'kg_752', 'kg_759');
  UPDATE fields SET section_id = v_sub_id, order_index = 9999 WHERE worksheet_template_id = v_wt_id AND symbol = 'kg_750_total';

  -- KG 760 — Allgemeine Baunebenkosten
  SELECT id INTO v_sub_id FROM worksheet_sections WHERE worksheet_template_id = v_wt_id AND parent_section_id = v_sec_c_id AND code = 'KG 760';
  IF v_sub_id IS NULL THEN
    INSERT INTO worksheet_sections (worksheet_template_id, parent_section_id, code, title_de, title_en, order_index)
      VALUES (v_wt_id, v_sec_c_id, 'KG 760', 'Allgemeine Baunebenkosten', 'General ancillary construction costs', 760)
      RETURNING id INTO v_sub_id;
  END IF;
  UPDATE fields SET section_id = v_sub_id WHERE worksheet_template_id = v_wt_id AND symbol IN ('kg_761', 'kg_762', 'kg_763', 'kg_764', 'kg_765', 'kg_766', 'kg_769');
  UPDATE fields SET section_id = v_sub_id, order_index = 9999 WHERE worksheet_template_id = v_wt_id AND symbol = 'kg_760_total';

  -- KG 790 — Sonstige Baunebenkosten
  SELECT id INTO v_sub_id FROM worksheet_sections WHERE worksheet_template_id = v_wt_id AND parent_section_id = v_sec_c_id AND code = 'KG 790';
  IF v_sub_id IS NULL THEN
    INSERT INTO worksheet_sections (worksheet_template_id, parent_section_id, code, title_de, title_en, order_index)
      VALUES (v_wt_id, v_sec_c_id, 'KG 790', 'Sonstige Baunebenkosten', 'Other ancillary construction costs', 790)
      RETURNING id INTO v_sub_id;
  END IF;
  UPDATE fields SET section_id = v_sub_id WHERE worksheet_template_id = v_wt_id AND symbol IN ('kg_791', 'kg_799');
  UPDATE fields SET section_id = v_sub_id, order_index = 9999 WHERE worksheet_template_id = v_wt_id AND symbol = 'kg_790_total';

END
$din276_subs_700$;
