-- DIN-276 KG 100 → DIN-276-09
-- Inputs: 13, Sub-totals: 2, Equations: 3
DO $din276_kg100$
DECLARE
  v_wt_id uuid;
  v_sec_c_id uuid;
  v_sec_d_id uuid;
BEGIN
  SELECT wt.id INTO v_wt_id FROM worksheet_templates wt
    JOIN standards s ON s.id = wt.standard_id
    WHERE s.code = 'DIN-276' AND wt.code = 'DIN-276-09';
  IF v_wt_id IS NULL THEN RAISE EXCEPTION 'Worksheet DIN-276-09 not found'; END IF;
  SELECT id INTO v_sec_c_id FROM worksheet_sections WHERE worksheet_template_id = v_wt_id AND code = 'C';
  SELECT id INTO v_sec_d_id FROM worksheet_sections WHERE worksheet_template_id = v_wt_id AND code = 'D';
  IF v_sec_c_id IS NULL OR v_sec_d_id IS NULL THEN RAISE EXCEPTION 'Section C or D missing for DIN-276-09'; END IF;

  -- Section C inputs (13)
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_110', 'Grundstückswert', 'Property value', 'number', 'EUR', false, '§5.4, Tab.1 KG 110', 110, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_121', 'Vermessungsgebühren', 'Surveying fees', 'number', 'EUR', false, '§5.4, Tab.1 KG 121', 121, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_122', 'Gerichtsgebühren', 'Court fees', 'number', 'EUR', false, '§5.4, Tab.1 KG 122', 122, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_123', 'Notarsgebühren', 'Notary fees', 'number', 'EUR', false, '§5.4, Tab.1 KG 123', 123, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_124', 'Grunderwerbsteuer', 'Real estate transfer tax', 'number', 'EUR', false, '§5.4, Tab.1 KG 124', 124, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_125', 'Untersuchungen', 'Investigations', 'number', 'EUR', false, '§5.4, Tab.1 KG 125', 125, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_126', 'Wertermittlungen', 'Valuations', 'number', 'EUR', false, '§5.4, Tab.1 KG 126', 126, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_127', 'Genehmigungsgebühren', 'Authorisation fees', 'number', 'EUR', false, '§5.4, Tab.1 KG 127', 127, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_128', 'Bodenordnung', 'Land readjustment', 'number', 'EUR', false, '§5.4, Tab.1 KG 128', 128, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_129', 'Sonstiges zu KG 120', 'Miscellaneous for KG 120', 'number', 'EUR', false, '§5.4, Tab.1 KG 129', 129, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_131', 'Abfindungen', 'Severance payments', 'number', 'EUR', false, '§5.4, Tab.1 KG 131', 131, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_132', 'Ablösen dinglicher Rechte', 'Redemption of rights in rem', 'number', 'EUR', false, '§5.4, Tab.1 KG 132', 132, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_139', 'Sonstiges zu KG 130', 'Miscellaneous for KG 130', 'number', 'EUR', false, '§5.4, Tab.1 KG 139', 139, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;

  -- Section D derived sub-totals (2)
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_d_id, 'kg_120_total', 'KG 120 Gesamt', 'Total incidental property costs', 'number', 'EUR', false, '§5.4, Tab.1 KG 120', 120, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_d_id, 'kg_130_total', 'KG 130 Gesamt', 'Total third party rights', 'number', 'EUR', false, '§5.4, Tab.1 KG 130', 130, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;

  -- Equations (3)
  IF NOT EXISTS (SELECT 1 FROM equations WHERE worksheet_template_id = v_wt_id AND output_symbol = 'kg_120_total') THEN
    INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, verification_status)
      VALUES (v_wt_id, 'KG1-01', 'kg_121 + kg_122 + kg_123 + kg_124 + kg_125 + kg_126 + kg_127 + kg_128 + kg_129', ARRAY['kg_121', 'kg_122', 'kg_123', 'kg_124', 'kg_125', 'kg_126', 'kg_127', 'kg_128', 'kg_129']::text[], 'kg_120_total', 'EUR', '§5.4, Tab.1 KG 120', 'imported_unverified');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM equations WHERE worksheet_template_id = v_wt_id AND output_symbol = 'kg_130_total') THEN
    INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, verification_status)
      VALUES (v_wt_id, 'KG1-02', 'kg_131 + kg_132 + kg_139', ARRAY['kg_131', 'kg_132', 'kg_139']::text[], 'kg_130_total', 'EUR', '§5.4, Tab.1 KG 130', 'imported_unverified');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM equations WHERE worksheet_template_id = v_wt_id AND output_symbol = 'kg_100_total') THEN
    INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, verification_status)
      VALUES (v_wt_id, 'KG1-03', 'kg_110 + kg_120_total + kg_130_total', ARRAY['kg_110', 'kg_120_total', 'kg_130_total']::text[], 'kg_100_total', 'EUR', '§5.4, Tab.1 KG 100', 'imported_unverified');
  END IF;
END
$din276_kg100$;
