-- DIN-276 KG 400 — restructure inputs into KG 4NN sub-sections
DO $din276_subs_400$
DECLARE
  v_wt_id uuid;
  v_sec_c_id uuid;
  v_sub_id uuid;
BEGIN
  SELECT wt.id INTO v_wt_id FROM worksheet_templates wt
    JOIN standards s ON s.id = wt.standard_id
    WHERE s.code = 'DIN-276' AND wt.code = 'DIN-276-12';
  IF v_wt_id IS NULL THEN RAISE EXCEPTION 'Worksheet DIN-276-12 not found'; END IF;
  SELECT id INTO v_sec_c_id FROM worksheet_sections WHERE worksheet_template_id = v_wt_id AND code = 'C';
  IF v_sec_c_id IS NULL THEN RAISE EXCEPTION 'Section C missing for DIN-276-12'; END IF;

  -- KG 410 — Abwasser-, Wasser-, Gasanlagen
  SELECT id INTO v_sub_id FROM worksheet_sections WHERE worksheet_template_id = v_wt_id AND parent_section_id = v_sec_c_id AND code = 'KG 410';
  IF v_sub_id IS NULL THEN
    INSERT INTO worksheet_sections (worksheet_template_id, parent_section_id, code, title_de, title_en, order_index)
      VALUES (v_wt_id, v_sec_c_id, 'KG 410', 'Abwasser-, Wasser-, Gasanlagen', 'Sewage, water and gas systems', 410)
      RETURNING id INTO v_sub_id;
  END IF;
  UPDATE fields SET section_id = v_sub_id WHERE worksheet_template_id = v_wt_id AND symbol IN ('kg_411', 'kg_412', 'kg_413', 'kg_419');
  UPDATE fields SET section_id = v_sub_id, order_index = 9999 WHERE worksheet_template_id = v_wt_id AND symbol = 'kg_410_total';

  -- KG 420 — Wärmeversorgungsanlagen
  SELECT id INTO v_sub_id FROM worksheet_sections WHERE worksheet_template_id = v_wt_id AND parent_section_id = v_sec_c_id AND code = 'KG 420';
  IF v_sub_id IS NULL THEN
    INSERT INTO worksheet_sections (worksheet_template_id, parent_section_id, code, title_de, title_en, order_index)
      VALUES (v_wt_id, v_sec_c_id, 'KG 420', 'Wärmeversorgungsanlagen', 'Heat supply systems', 420)
      RETURNING id INTO v_sub_id;
  END IF;
  UPDATE fields SET section_id = v_sub_id WHERE worksheet_template_id = v_wt_id AND symbol IN ('kg_421', 'kg_422', 'kg_423', 'kg_424', 'kg_429');
  UPDATE fields SET section_id = v_sub_id, order_index = 9999 WHERE worksheet_template_id = v_wt_id AND symbol = 'kg_420_total';

  -- KG 430 — Raumlufttechnische Anlagen
  SELECT id INTO v_sub_id FROM worksheet_sections WHERE worksheet_template_id = v_wt_id AND parent_section_id = v_sec_c_id AND code = 'KG 430';
  IF v_sub_id IS NULL THEN
    INSERT INTO worksheet_sections (worksheet_template_id, parent_section_id, code, title_de, title_en, order_index)
      VALUES (v_wt_id, v_sec_c_id, 'KG 430', 'Raumlufttechnische Anlagen', 'Ventilation and air conditioning systems', 430)
      RETURNING id INTO v_sub_id;
  END IF;
  UPDATE fields SET section_id = v_sub_id WHERE worksheet_template_id = v_wt_id AND symbol IN ('kg_431', 'kg_432', 'kg_433', 'kg_434', 'kg_439');
  UPDATE fields SET section_id = v_sub_id, order_index = 9999 WHERE worksheet_template_id = v_wt_id AND symbol = 'kg_430_total';

  -- KG 440 — Elektrische Anlagen
  SELECT id INTO v_sub_id FROM worksheet_sections WHERE worksheet_template_id = v_wt_id AND parent_section_id = v_sec_c_id AND code = 'KG 440';
  IF v_sub_id IS NULL THEN
    INSERT INTO worksheet_sections (worksheet_template_id, parent_section_id, code, title_de, title_en, order_index)
      VALUES (v_wt_id, v_sec_c_id, 'KG 440', 'Elektrische Anlagen', 'Electrical systems', 440)
      RETURNING id INTO v_sub_id;
  END IF;
  UPDATE fields SET section_id = v_sub_id WHERE worksheet_template_id = v_wt_id AND symbol IN ('kg_441', 'kg_442', 'kg_443', 'kg_444', 'kg_445', 'kg_446', 'kg_447', 'kg_449');
  UPDATE fields SET section_id = v_sub_id, order_index = 9999 WHERE worksheet_template_id = v_wt_id AND symbol = 'kg_440_total';

  -- KG 450 — Kommunikations-, sicherheits- und informationstechnische Anlagen
  SELECT id INTO v_sub_id FROM worksheet_sections WHERE worksheet_template_id = v_wt_id AND parent_section_id = v_sec_c_id AND code = 'KG 450';
  IF v_sub_id IS NULL THEN
    INSERT INTO worksheet_sections (worksheet_template_id, parent_section_id, code, title_de, title_en, order_index)
      VALUES (v_wt_id, v_sec_c_id, 'KG 450', 'Kommunikations-, sicherheits- und informationstechnische Anlagen', 'Communication, security and information technology systems', 450)
      RETURNING id INTO v_sub_id;
  END IF;
  UPDATE fields SET section_id = v_sub_id WHERE worksheet_template_id = v_wt_id AND symbol IN ('kg_451', 'kg_452', 'kg_453', 'kg_454', 'kg_455', 'kg_456', 'kg_457', 'kg_458', 'kg_459');
  UPDATE fields SET section_id = v_sub_id, order_index = 9999 WHERE worksheet_template_id = v_wt_id AND symbol = 'kg_450_total';

  -- KG 460 — Förderanlagen
  SELECT id INTO v_sub_id FROM worksheet_sections WHERE worksheet_template_id = v_wt_id AND parent_section_id = v_sec_c_id AND code = 'KG 460';
  IF v_sub_id IS NULL THEN
    INSERT INTO worksheet_sections (worksheet_template_id, parent_section_id, code, title_de, title_en, order_index)
      VALUES (v_wt_id, v_sec_c_id, 'KG 460', 'Förderanlagen', 'Conveyor systems', 460)
      RETURNING id INTO v_sub_id;
  END IF;
  UPDATE fields SET section_id = v_sub_id WHERE worksheet_template_id = v_wt_id AND symbol IN ('kg_461', 'kg_462', 'kg_463', 'kg_464', 'kg_465', 'kg_466', 'kg_469');
  UPDATE fields SET section_id = v_sub_id, order_index = 9999 WHERE worksheet_template_id = v_wt_id AND symbol = 'kg_460_total';

  -- KG 470 — Nutzungsspezifische und verfahrenstechnische Anlagen
  SELECT id INTO v_sub_id FROM worksheet_sections WHERE worksheet_template_id = v_wt_id AND parent_section_id = v_sec_c_id AND code = 'KG 470';
  IF v_sub_id IS NULL THEN
    INSERT INTO worksheet_sections (worksheet_template_id, parent_section_id, code, title_de, title_en, order_index)
      VALUES (v_wt_id, v_sec_c_id, 'KG 470', 'Nutzungsspezifische und verfahrenstechnische Anlagen', 'Utilisation-specific and process engineering systems', 470)
      RETURNING id INTO v_sub_id;
  END IF;
  UPDATE fields SET section_id = v_sub_id WHERE worksheet_template_id = v_wt_id AND symbol IN ('kg_471', 'kg_472', 'kg_473', 'kg_474', 'kg_475', 'kg_476', 'kg_477', 'kg_478', 'kg_479');
  UPDATE fields SET section_id = v_sub_id, order_index = 9999 WHERE worksheet_template_id = v_wt_id AND symbol = 'kg_470_total';

  -- KG 480 — Gebäude- und Anlagenautomation
  SELECT id INTO v_sub_id FROM worksheet_sections WHERE worksheet_template_id = v_wt_id AND parent_section_id = v_sec_c_id AND code = 'KG 480';
  IF v_sub_id IS NULL THEN
    INSERT INTO worksheet_sections (worksheet_template_id, parent_section_id, code, title_de, title_en, order_index)
      VALUES (v_wt_id, v_sec_c_id, 'KG 480', 'Gebäude- und Anlagenautomation', 'Building and plant automation', 480)
      RETURNING id INTO v_sub_id;
  END IF;
  UPDATE fields SET section_id = v_sub_id WHERE worksheet_template_id = v_wt_id AND symbol IN ('kg_481', 'kg_482', 'kg_483', 'kg_484', 'kg_485', 'kg_489');
  UPDATE fields SET section_id = v_sub_id, order_index = 9999 WHERE worksheet_template_id = v_wt_id AND symbol = 'kg_480_total';

  -- KG 490 — Sonstige Maßnahmen für Technische Anlagen
  SELECT id INTO v_sub_id FROM worksheet_sections WHERE worksheet_template_id = v_wt_id AND parent_section_id = v_sec_c_id AND code = 'KG 490';
  IF v_sub_id IS NULL THEN
    INSERT INTO worksheet_sections (worksheet_template_id, parent_section_id, code, title_de, title_en, order_index)
      VALUES (v_wt_id, v_sec_c_id, 'KG 490', 'Sonstige Maßnahmen für Technische Anlagen', 'Other measures for technical installations', 490)
      RETURNING id INTO v_sub_id;
  END IF;
  UPDATE fields SET section_id = v_sub_id WHERE worksheet_template_id = v_wt_id AND symbol IN ('kg_491', 'kg_492', 'kg_493', 'kg_494', 'kg_495', 'kg_496', 'kg_497', 'kg_498', 'kg_499');
  UPDATE fields SET section_id = v_sub_id, order_index = 9999 WHERE worksheet_template_id = v_wt_id AND symbol = 'kg_490_total';

END
$din276_subs_400$;
