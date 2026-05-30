-- DIN-276 KG 700 → DIN-276-15
-- Inputs: 38, Sub-totals: 7, Equations: 8
DO $din276_kg700$
DECLARE
  v_wt_id uuid;
  v_sec_c_id uuid;
  v_sec_d_id uuid;
BEGIN
  SELECT wt.id INTO v_wt_id FROM worksheet_templates wt
    JOIN standards s ON s.id = wt.standard_id
    WHERE s.code = 'DIN-276' AND wt.code = 'DIN-276-15';
  IF v_wt_id IS NULL THEN RAISE EXCEPTION 'Worksheet DIN-276-15 not found'; END IF;
  SELECT id INTO v_sec_c_id FROM worksheet_sections WHERE worksheet_template_id = v_wt_id AND code = 'C';
  SELECT id INTO v_sec_d_id FROM worksheet_sections WHERE worksheet_template_id = v_wt_id AND code = 'D';
  IF v_sec_c_id IS NULL OR v_sec_d_id IS NULL THEN RAISE EXCEPTION 'Section C or D missing for DIN-276-15'; END IF;

  -- Section C inputs (38)
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_711', 'Projektleitung', 'Project management', 'number', 'EUR', false, '§5.4, Tab.1 KG 711', 711, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_712', 'Bedarfsplanung', 'Requirements planning', 'number', 'EUR', false, '§5.4, Tab.1 KG 712', 712, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_713', 'Projektsteuerung', 'Project steering', 'number', 'EUR', false, '§5.4, Tab.1 KG 713', 713, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_714', 'Sicherheits- und Gesundheitsschutzkoordination', 'Health and safety coordination', 'number', 'EUR', false, '§5.4, Tab.1 KG 714', 714, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_715', 'Vergabeverfahren', 'Award procedure', 'number', 'EUR', false, '§5.4, Tab.1 KG 715', 715, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_719', 'Sonstiges zu KG 710', 'Miscellaneous for KG 710', 'number', 'EUR', false, '§5.4, Tab.1 KG 719', 719, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_721', 'Untersuchungen', 'Investigations', 'number', 'EUR', false, '§5.4, Tab.1 KG 721', 721, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_722', 'Wertermittlungen', 'Valuations', 'number', 'EUR', false, '§5.4, Tab.1 KG 722', 722, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_723', 'Städtebauliche Leistungen', 'Urban planning services', 'number', 'EUR', false, '§5.4, Tab.1 KG 723', 723, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_724', 'Landschaftsplanerische Leistungen', 'Landscape planning services', 'number', 'EUR', false, '§5.4, Tab.1 KG 724', 724, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_725', 'Wettbewerbe', 'Competitions', 'number', 'EUR', false, '§5.4, Tab.1 KG 725', 725, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_729', 'Sonstiges zu KG 720', 'Miscellaneous for KG 720', 'number', 'EUR', false, '§5.4, Tab.1 KG 729', 729, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_731', 'Gebäude und Innenräume', 'Buildings and interiors', 'number', 'EUR', false, '§5.4, Tab.1 KG 731', 731, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_732', 'Außenanlagen', 'Outdoor facilities', 'number', 'EUR', false, '§5.4, Tab.1 KG 732', 732, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_733', 'Ingenieurbauwerke', 'Civil engineering structures', 'number', 'EUR', false, '§5.4, Tab.1 KG 733', 733, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_734', 'Verkehrsanlagen', 'Transport facilities', 'number', 'EUR', false, '§5.4, Tab.1 KG 734', 734, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_739', 'Sonstiges zu KG 730', 'Miscellaneous for KG 730', 'number', 'EUR', false, '§5.4, Tab.1 KG 739', 739, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_741', 'Tragwerksplanung', 'Structural design', 'number', 'EUR', false, '§5.4, Tab.1 KG 741', 741, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_742', 'Technische Ausrüstung', 'Technical equipment', 'number', 'EUR', false, '§5.4, Tab.1 KG 742', 742, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_743', 'Bauphysik', 'Building physics', 'number', 'EUR', false, '§5.4, Tab.1 KG 743', 743, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_744', 'Geotechnik', 'Geotechnics', 'number', 'EUR', false, '§5.4, Tab.1 KG 744', 744, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_745', 'Ingenieurvermessung', 'Engineering surveying', 'number', 'EUR', false, '§5.4, Tab.1 KG 745', 745, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_746', 'Lichttechnik, Tageslichttechnik', 'Lighting technology, daylight technology', 'number', 'EUR', false, '§5.4, Tab.1 KG 746', 746, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_747', 'Brandschutz', 'Fire protection', 'number', 'EUR', false, '§5.4, Tab.1 KG 747', 747, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_748', 'Altlasten, Kampfmittel, kulturhistorische Funde', 'Contaminated sites, explosive ordnance, cultural-historical finds', 'number', 'EUR', false, '§5.4, Tab.1 KG 748', 748, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_749', 'Sonstiges zu KG 740', 'Miscellaneous for KG 740', 'number', 'EUR', false, '§5.4, Tab.1 KG 749', 749, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_751', 'Kunstwettbewerbe', 'Art competitions', 'number', 'EUR', false, '§5.4, Tab.1 KG 751', 751, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_752', 'Honorare', 'Fees', 'number', 'EUR', false, '§5.4, Tab.1 KG 752', 752, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_759', 'Sonstiges zu KG 750', 'Miscellaneous for KG 750', 'number', 'EUR', false, '§5.4, Tab.1 KG 759', 759, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_761', 'Gutachten und Beratung', 'Expertise and consulting', 'number', 'EUR', false, '§5.4, Tab.1 KG 761', 761, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_762', 'Prüfungen, Genehmigungen, Abnahmen', 'Tests, authorisations, approvals', 'number', 'EUR', false, '§5.4, Tab.1 KG 762', 762, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_763', 'Betriebskosten', 'Operating costs', 'number', 'EUR', false, '§5.4, Tab.1 KG 763', 763, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_764', 'Bemusterungskosten', 'Sampling costs', 'number', 'EUR', false, '§5.4, Tab.1 KG 764', 764, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_765', 'Betriebskosten nach Abnahme', 'Operating costs after acceptance', 'number', 'EUR', false, '§5.4, Tab.1 KG 765', 765, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_766', 'Versicherungen', 'Insurances', 'number', 'EUR', false, '§5.4, Tab.1 KG 766', 766, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_769', 'Sonstiges zu KG 760', 'Miscellaneous for KG 760', 'number', 'EUR', false, '§5.4, Tab.1 KG 769', 769, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_791', 'Bestandsdokumentation', 'Inventory documentation', 'number', 'EUR', false, '§5.4, Tab.1 KG 791', 791, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_799', 'Sonstiges zu KG 790', 'Miscellaneous for KG 790', 'number', 'EUR', false, '§5.4, Tab.1 KG 799', 799, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;

  -- Section D derived sub-totals (7)
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_d_id, 'kg_710_total', 'KG 710 Gesamt', 'Total client tasks', 'number', 'EUR', false, '§5.4, Tab.1 KG 710', 710, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_d_id, 'kg_720_total', 'KG 720 Gesamt', 'Total preparation of object planning', 'number', 'EUR', false, '§5.4, Tab.1 KG 720', 720, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_d_id, 'kg_730_total', 'KG 730 Gesamt', 'Total project planning', 'number', 'EUR', false, '§5.4, Tab.1 KG 730', 730, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_d_id, 'kg_740_total', 'KG 740 Gesamt', 'Total specialised planning', 'number', 'EUR', false, '§5.4, Tab.1 KG 740', 740, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_d_id, 'kg_750_total', 'KG 750 Gesamt', 'Total artistic performances', 'number', 'EUR', false, '§5.4, Tab.1 KG 750', 750, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_d_id, 'kg_760_total', 'KG 760 Gesamt', 'Total general ancillary construction costs', 'number', 'EUR', false, '§5.4, Tab.1 KG 760', 760, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_d_id, 'kg_790_total', 'KG 790 Gesamt', 'Total other ancillary construction costs', 'number', 'EUR', false, '§5.4, Tab.1 KG 790', 790, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;

  -- Equations (8)
  IF NOT EXISTS (SELECT 1 FROM equations WHERE worksheet_template_id = v_wt_id AND output_symbol = 'kg_710_total') THEN
    INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, verification_status)
      VALUES (v_wt_id, 'KG7-01', 'kg_711 + kg_712 + kg_713 + kg_714 + kg_715 + kg_719', ARRAY['kg_711', 'kg_712', 'kg_713', 'kg_714', 'kg_715', 'kg_719']::text[], 'kg_710_total', 'EUR', '§5.4, Tab.1 KG 710', 'imported_unverified');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM equations WHERE worksheet_template_id = v_wt_id AND output_symbol = 'kg_720_total') THEN
    INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, verification_status)
      VALUES (v_wt_id, 'KG7-02', 'kg_721 + kg_722 + kg_723 + kg_724 + kg_725 + kg_729', ARRAY['kg_721', 'kg_722', 'kg_723', 'kg_724', 'kg_725', 'kg_729']::text[], 'kg_720_total', 'EUR', '§5.4, Tab.1 KG 720', 'imported_unverified');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM equations WHERE worksheet_template_id = v_wt_id AND output_symbol = 'kg_730_total') THEN
    INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, verification_status)
      VALUES (v_wt_id, 'KG7-03', 'kg_731 + kg_732 + kg_733 + kg_734 + kg_739', ARRAY['kg_731', 'kg_732', 'kg_733', 'kg_734', 'kg_739']::text[], 'kg_730_total', 'EUR', '§5.4, Tab.1 KG 730', 'imported_unverified');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM equations WHERE worksheet_template_id = v_wt_id AND output_symbol = 'kg_740_total') THEN
    INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, verification_status)
      VALUES (v_wt_id, 'KG7-04', 'kg_741 + kg_742 + kg_743 + kg_744 + kg_745 + kg_746 + kg_747 + kg_748 + kg_749', ARRAY['kg_741', 'kg_742', 'kg_743', 'kg_744', 'kg_745', 'kg_746', 'kg_747', 'kg_748', 'kg_749']::text[], 'kg_740_total', 'EUR', '§5.4, Tab.1 KG 740', 'imported_unverified');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM equations WHERE worksheet_template_id = v_wt_id AND output_symbol = 'kg_750_total') THEN
    INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, verification_status)
      VALUES (v_wt_id, 'KG7-05', 'kg_751 + kg_752 + kg_759', ARRAY['kg_751', 'kg_752', 'kg_759']::text[], 'kg_750_total', 'EUR', '§5.4, Tab.1 KG 750', 'imported_unverified');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM equations WHERE worksheet_template_id = v_wt_id AND output_symbol = 'kg_760_total') THEN
    INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, verification_status)
      VALUES (v_wt_id, 'KG7-06', 'kg_761 + kg_762 + kg_763 + kg_764 + kg_765 + kg_766 + kg_769', ARRAY['kg_761', 'kg_762', 'kg_763', 'kg_764', 'kg_765', 'kg_766', 'kg_769']::text[], 'kg_760_total', 'EUR', '§5.4, Tab.1 KG 760', 'imported_unverified');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM equations WHERE worksheet_template_id = v_wt_id AND output_symbol = 'kg_790_total') THEN
    INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, verification_status)
      VALUES (v_wt_id, 'KG7-07', 'kg_791 + kg_799', ARRAY['kg_791', 'kg_799']::text[], 'kg_790_total', 'EUR', '§5.4, Tab.1 KG 790', 'imported_unverified');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM equations WHERE worksheet_template_id = v_wt_id AND output_symbol = 'kg_700_total') THEN
    INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, verification_status)
      VALUES (v_wt_id, 'KG7-08', 'kg_710_total + kg_720_total + kg_730_total + kg_740_total + kg_750_total + kg_760_total + kg_790_total', ARRAY['kg_710_total', 'kg_720_total', 'kg_730_total', 'kg_740_total', 'kg_750_total', 'kg_760_total', 'kg_790_total']::text[], 'kg_700_total', 'EUR', '§5.4, Tab.1 KG 700', 'imported_unverified');
  END IF;
END
$din276_kg700$;
