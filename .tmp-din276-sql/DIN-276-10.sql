-- DIN-276 KG 200 → DIN-276-10
-- Inputs: 23, Sub-totals: 4, Equations: 5
DO $din276_kg200$
DECLARE
  v_wt_id uuid;
  v_sec_c_id uuid;
  v_sec_d_id uuid;
BEGIN
  SELECT wt.id INTO v_wt_id FROM worksheet_templates wt
    JOIN standards s ON s.id = wt.standard_id
    WHERE s.code = 'DIN-276' AND wt.code = 'DIN-276-10';
  IF v_wt_id IS NULL THEN RAISE EXCEPTION 'Worksheet DIN-276-10 not found'; END IF;
  SELECT id INTO v_sec_c_id FROM worksheet_sections WHERE worksheet_template_id = v_wt_id AND code = 'C';
  SELECT id INTO v_sec_d_id FROM worksheet_sections WHERE worksheet_template_id = v_wt_id AND code = 'D';
  IF v_sec_c_id IS NULL OR v_sec_d_id IS NULL THEN RAISE EXCEPTION 'Section C or D missing for DIN-276-10'; END IF;

  -- Section C inputs (23)
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_211', 'Sicherungsmaßnahmen', 'Security measures', 'number', 'EUR', false, '§5.4, Tab.1 KG 211', 211, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_212', 'Abbruchmaßnahmen', 'Demolition measures', 'number', 'EUR', false, '§5.4, Tab.1 KG 212', 212, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_213', 'Altlastenbeseitigung', 'Removal of contaminated sites', 'number', 'EUR', false, '§5.4, Tab.1 KG 213', 213, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_214', 'Herrichten der Geländeoberfläche', 'Levelling the ground surface', 'number', 'EUR', false, '§5.4, Tab.1 KG 214', 214, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_215', 'Kampfmittelräumung', 'Explosive ordnance clearance', 'number', 'EUR', false, '§5.4, Tab.1 KG 215', 215, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_216', 'Kulturhistorische Funde', 'Cultural-historical finds', 'number', 'EUR', false, '§5.4, Tab.1 KG 216', 216, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_219', 'Sonstiges zu KG 210', 'Miscellaneous for KG 210', 'number', 'EUR', false, '§5.4, Tab.1 KG 219', 219, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_221', 'Abwasserentsorgung', 'Wastewater disposal', 'number', 'EUR', false, '§5.4, Tab.1 KG 221', 221, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_222', 'Wasserversorgung', 'Water supply', 'number', 'EUR', false, '§5.4, Tab.1 KG 222', 222, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_223', 'Gasversorgung', 'Gas supply', 'number', 'EUR', false, '§5.4, Tab.1 KG 223', 223, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_224', 'Fernwärmeversorgung', 'District heating supply', 'number', 'EUR', false, '§5.4, Tab.1 KG 224', 224, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_225', 'Stromversorgung', 'Power supply', 'number', 'EUR', false, '§5.4, Tab.1 KG 225', 225, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_226', 'Telekommunikation', 'Telecommunications', 'number', 'EUR', false, '§5.4, Tab.1 KG 226', 226, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_227', 'Verkehrserschließung', 'Traffic development', 'number', 'EUR', false, '§5.4, Tab.1 KG 227', 227, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_228', 'Abfallentsorgung', 'Waste disposal', 'number', 'EUR', false, '§5.4, Tab.1 KG 228', 228, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_229', 'Sonstiges zu KG 220', 'Miscellaneous for KG 220', 'number', 'EUR', false, '§5.4, Tab.1 KG 229', 229, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_230', 'Nichtöffentliche Erschließung', 'Non-public development', 'number', 'EUR', false, '§5.4, Tab.1 KG 230', 230, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_241', 'Ausgleichsmaßnahmen', 'Equalisation measures', 'number', 'EUR', false, '§5.4, Tab.1 KG 241', 241, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_242', 'Ausgleichsabgaben', 'Equalisation levies', 'number', 'EUR', false, '§5.4, Tab.1 KG 242', 242, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_249', 'Sonstiges zu KG 240', 'Miscellaneous for KG 240', 'number', 'EUR', false, '§5.4, Tab.1 KG 249', 249, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_251', 'Bauliche Maßnahmen', 'Structural measures', 'number', 'EUR', false, '§5.4, Tab.1 KG 251', 251, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_252', 'Organisatorische Maßnahmen', 'Organisational measures', 'number', 'EUR', false, '§5.4, Tab.1 KG 252', 252, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_259', 'Sonstiges zu KG 250', 'Miscellaneous for KG 250', 'number', 'EUR', false, '§5.4, Tab.1 KG 259', 259, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;

  -- Section D derived sub-totals (4)
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_d_id, 'kg_210_total', 'KG 210 Gesamt', 'Total preparation', 'number', 'EUR', false, '§5.4, Tab.1 KG 210', 210, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_d_id, 'kg_220_total', 'KG 220 Gesamt', 'Total public development', 'number', 'EUR', false, '§5.4, Tab.1 KG 220', 220, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_d_id, 'kg_240_total', 'KG 240 Gesamt', 'Total compensatory measures and levies', 'number', 'EUR', false, '§5.4, Tab.1 KG 240', 240, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_d_id, 'kg_250_total', 'KG 250 Gesamt', 'Total transitional measures', 'number', 'EUR', false, '§5.4, Tab.1 KG 250', 250, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;

  -- Equations (5)
  IF NOT EXISTS (SELECT 1 FROM equations WHERE worksheet_template_id = v_wt_id AND output_symbol = 'kg_210_total') THEN
    INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, verification_status)
      VALUES (v_wt_id, 'KG2-01', 'kg_211 + kg_212 + kg_213 + kg_214 + kg_215 + kg_216 + kg_219', ARRAY['kg_211', 'kg_212', 'kg_213', 'kg_214', 'kg_215', 'kg_216', 'kg_219']::text[], 'kg_210_total', 'EUR', '§5.4, Tab.1 KG 210', 'imported_unverified');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM equations WHERE worksheet_template_id = v_wt_id AND output_symbol = 'kg_220_total') THEN
    INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, verification_status)
      VALUES (v_wt_id, 'KG2-02', 'kg_221 + kg_222 + kg_223 + kg_224 + kg_225 + kg_226 + kg_227 + kg_228 + kg_229', ARRAY['kg_221', 'kg_222', 'kg_223', 'kg_224', 'kg_225', 'kg_226', 'kg_227', 'kg_228', 'kg_229']::text[], 'kg_220_total', 'EUR', '§5.4, Tab.1 KG 220', 'imported_unverified');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM equations WHERE worksheet_template_id = v_wt_id AND output_symbol = 'kg_240_total') THEN
    INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, verification_status)
      VALUES (v_wt_id, 'KG2-03', 'kg_241 + kg_242 + kg_249', ARRAY['kg_241', 'kg_242', 'kg_249']::text[], 'kg_240_total', 'EUR', '§5.4, Tab.1 KG 240', 'imported_unverified');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM equations WHERE worksheet_template_id = v_wt_id AND output_symbol = 'kg_250_total') THEN
    INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, verification_status)
      VALUES (v_wt_id, 'KG2-04', 'kg_251 + kg_252 + kg_259', ARRAY['kg_251', 'kg_252', 'kg_259']::text[], 'kg_250_total', 'EUR', '§5.4, Tab.1 KG 250', 'imported_unverified');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM equations WHERE worksheet_template_id = v_wt_id AND output_symbol = 'kg_200_total') THEN
    INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, verification_status)
      VALUES (v_wt_id, 'KG2-05', 'kg_210_total + kg_220_total + kg_230 + kg_240_total + kg_250_total', ARRAY['kg_210_total', 'kg_220_total', 'kg_230', 'kg_240_total', 'kg_250_total']::text[], 'kg_200_total', 'EUR', '§5.4, Tab.1 KG 200', 'imported_unverified');
  END IF;
END
$din276_kg200$;
