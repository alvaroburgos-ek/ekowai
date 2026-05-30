-- DIN-276 KG 800 → DIN-276-16
-- Inputs: 5, Sub-totals: 0, Equations: 1
DO $din276_kg800$
DECLARE
  v_wt_id uuid;
  v_sec_c_id uuid;
  v_sec_d_id uuid;
BEGIN
  SELECT wt.id INTO v_wt_id FROM worksheet_templates wt
    JOIN standards s ON s.id = wt.standard_id
    WHERE s.code = 'DIN-276' AND wt.code = 'DIN-276-16';
  IF v_wt_id IS NULL THEN RAISE EXCEPTION 'Worksheet DIN-276-16 not found'; END IF;
  SELECT id INTO v_sec_c_id FROM worksheet_sections WHERE worksheet_template_id = v_wt_id AND code = 'C';
  SELECT id INTO v_sec_d_id FROM worksheet_sections WHERE worksheet_template_id = v_wt_id AND code = 'D';
  IF v_sec_c_id IS NULL OR v_sec_d_id IS NULL THEN RAISE EXCEPTION 'Section C or D missing for DIN-276-16'; END IF;

  -- Section C inputs (5)
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_810', 'Finanzierungsnebenkosten', 'Ancillary financing costs', 'number', 'EUR', false, '§5.4, Tab.1 KG 810', 810, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_820', 'Fremdkapitalzinsen', 'Interest on borrowed capital', 'number', 'EUR', false, '§5.4, Tab.1 KG 820', 820, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_830', 'Eigenkapitalzinsen', 'Interest on equity', 'number', 'EUR', false, '§5.4, Tab.1 KG 830', 830, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_840', 'Bürgschaften', 'Guarantees', 'number', 'EUR', false, '§5.4, Tab.1 KG 840', 840, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_890', 'Sonstige Finanzierungskosten', 'Other financing costs', 'number', 'EUR', false, '§5.4, Tab.1 KG 890', 890, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;

  -- Section D derived sub-totals (0)

  -- Equations (1)
  IF NOT EXISTS (SELECT 1 FROM equations WHERE worksheet_template_id = v_wt_id AND output_symbol = 'kg_800_total') THEN
    INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, verification_status)
      VALUES (v_wt_id, 'KG8-01', 'kg_810 + kg_820 + kg_830 + kg_840 + kg_890', ARRAY['kg_810', 'kg_820', 'kg_830', 'kg_840', 'kg_890']::text[], 'kg_800_total', 'EUR', '§5.4, Tab.1 KG 800', 'imported_unverified');
  END IF;
END
$din276_kg800$;
