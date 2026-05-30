-- DIN-276 KG 600 → DIN-276-14
-- Inputs: 8, Sub-totals: 1, Equations: 2
DO $din276_kg600$
DECLARE
  v_wt_id uuid;
  v_sec_c_id uuid;
  v_sec_d_id uuid;
BEGIN
  SELECT wt.id INTO v_wt_id FROM worksheet_templates wt
    JOIN standards s ON s.id = wt.standard_id
    WHERE s.code = 'DIN-276' AND wt.code = 'DIN-276-14';
  IF v_wt_id IS NULL THEN RAISE EXCEPTION 'Worksheet DIN-276-14 not found'; END IF;
  SELECT id INTO v_sec_c_id FROM worksheet_sections WHERE worksheet_template_id = v_wt_id AND code = 'C';
  SELECT id INTO v_sec_d_id FROM worksheet_sections WHERE worksheet_template_id = v_wt_id AND code = 'D';
  IF v_sec_c_id IS NULL OR v_sec_d_id IS NULL THEN RAISE EXCEPTION 'Section C or D missing for DIN-276-14'; END IF;

  -- Section C inputs (8)
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_610', 'Allgemeine Ausstattung', 'General equipment', 'number', 'EUR', false, '§5.4, Tab.1 KG 610', 610, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_620', 'Besondere Ausstattung', 'Special equipment', 'number', 'EUR', false, '§5.4, Tab.1 KG 620', 620, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_630', 'Informationstechnische Ausstattung', 'Information technology equipment', 'number', 'EUR', false, '§5.4, Tab.1 KG 630', 630, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_641', 'Kunstobjekte', 'Objects of art', 'number', 'EUR', false, '§5.4, Tab.1 KG 641', 641, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_642', 'Künstlerische Gestaltung des Bauwerks', 'Artistic design of the building', 'number', 'EUR', false, '§5.4, Tab.1 KG 642', 642, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_643', 'Künstlerische Gestaltung der Außenanlagen und Freiflächen', 'Artistic design of outdoor facilities and open spaces', 'number', 'EUR', false, '§5.4, Tab.1 KG 643', 643, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_649', 'Sonstiges zu KG 640', 'Miscellaneous for KG 640', 'number', 'EUR', false, '§5.4, Tab.1 KG 649', 649, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_690', 'Sonstige Ausstattung', 'Other equipment', 'number', 'EUR', false, '§5.4, Tab.1 KG 690', 690, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;

  -- Section D derived sub-totals (1)
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_d_id, 'kg_640_total', 'KG 640 Gesamt', 'Total artistic equipment', 'number', 'EUR', false, '§5.4, Tab.1 KG 640', 640, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;

  -- Equations (2)
  IF NOT EXISTS (SELECT 1 FROM equations WHERE worksheet_template_id = v_wt_id AND output_symbol = 'kg_640_total') THEN
    INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, verification_status)
      VALUES (v_wt_id, 'KG6-01', 'kg_641 + kg_642 + kg_643 + kg_649', ARRAY['kg_641', 'kg_642', 'kg_643', 'kg_649']::text[], 'kg_640_total', 'EUR', '§5.4, Tab.1 KG 640', 'imported_unverified');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM equations WHERE worksheet_template_id = v_wt_id AND output_symbol = 'kg_600_total') THEN
    INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, verification_status)
      VALUES (v_wt_id, 'KG6-02', 'kg_610 + kg_620 + kg_630 + kg_640_total + kg_690', ARRAY['kg_610', 'kg_620', 'kg_630', 'kg_640_total', 'kg_690']::text[], 'kg_600_total', 'EUR', '§5.4, Tab.1 KG 600', 'imported_unverified');
  END IF;
END
$din276_kg600$;
