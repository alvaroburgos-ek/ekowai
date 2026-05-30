-- DIN-276 KG 400 → DIN-276-12
-- Inputs: 62, Sub-totals: 9, Equations: 10
DO $din276_kg400$
DECLARE
  v_wt_id uuid;
  v_sec_c_id uuid;
  v_sec_d_id uuid;
BEGIN
  SELECT wt.id INTO v_wt_id FROM worksheet_templates wt
    JOIN standards s ON s.id = wt.standard_id
    WHERE s.code = 'DIN-276' AND wt.code = 'DIN-276-12';
  IF v_wt_id IS NULL THEN RAISE EXCEPTION 'Worksheet DIN-276-12 not found'; END IF;
  SELECT id INTO v_sec_c_id FROM worksheet_sections WHERE worksheet_template_id = v_wt_id AND code = 'C';
  SELECT id INTO v_sec_d_id FROM worksheet_sections WHERE worksheet_template_id = v_wt_id AND code = 'D';
  IF v_sec_c_id IS NULL OR v_sec_d_id IS NULL THEN RAISE EXCEPTION 'Section C or D missing for DIN-276-12'; END IF;

  -- Section C inputs (62)
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_411', 'Abwasseranlagen', 'Sewage systems', 'number', 'EUR', false, '§5.4, Tab.1 KG 411', 411, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_412', 'Wasseranlagen', 'Water systems', 'number', 'EUR', false, '§5.4, Tab.1 KG 412', 412, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_413', 'Gasanlagen', 'Gas systems', 'number', 'EUR', false, '§5.4, Tab.1 KG 413', 413, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_419', 'Sonstiges zu KG 410', 'Miscellaneous for KG 410', 'number', 'EUR', false, '§5.4, Tab.1 KG 419', 419, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_421', 'Wärmeerzeugungsanlagen', 'Heat generation systems', 'number', 'EUR', false, '§5.4, Tab.1 KG 421', 421, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_422', 'Wärmeverteilnetze', 'Heat distribution networks', 'number', 'EUR', false, '§5.4, Tab.1 KG 422', 422, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_423', 'Raumheizflächen', 'Space heating surfaces', 'number', 'EUR', false, '§5.4, Tab.1 KG 423', 423, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_424', 'Verkehrsheizflächen', 'Traffic heating surfaces', 'number', 'EUR', false, '§5.4, Tab.1 KG 424', 424, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_429', 'Sonstiges zu KG 420', 'Miscellaneous for KG 420', 'number', 'EUR', false, '§5.4, Tab.1 KG 429', 429, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_431', 'Lüftungsanlagen', 'Ventilation systems', 'number', 'EUR', false, '§5.4, Tab.1 KG 431', 431, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_432', 'Teilklimaanlagen', 'Partial air conditioning systems', 'number', 'EUR', false, '§5.4, Tab.1 KG 432', 432, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_433', 'Klimaanlagen', 'Air conditioning systems', 'number', 'EUR', false, '§5.4, Tab.1 KG 433', 433, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_434', 'Kälteanlagen', 'Refrigeration systems', 'number', 'EUR', false, '§5.4, Tab.1 KG 434', 434, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_439', 'Sonstiges zu KG 430', 'Miscellaneous for KG 430', 'number', 'EUR', false, '§5.4, Tab.1 KG 439', 439, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_441', 'Hoch- und Mittelspannungsanlagen', 'High and medium-voltage systems', 'number', 'EUR', false, '§5.4, Tab.1 KG 441', 441, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_442', 'Eigenstromversorgungsanlagen', 'Own power supply systems', 'number', 'EUR', false, '§5.4, Tab.1 KG 442', 442, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_443', 'Niederspannungsschaltanlagen', 'Low-voltage switchgear', 'number', 'EUR', false, '§5.4, Tab.1 KG 443', 443, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_444', 'Niederspannungsinstallationsanlagen', 'Low-voltage installations', 'number', 'EUR', false, '§5.4, Tab.1 KG 444', 444, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_445', 'Beleuchtungsanlagen', 'Lighting systems', 'number', 'EUR', false, '§5.4, Tab.1 KG 445', 445, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_446', 'Blitzschutz- und Erdungsanlagen', 'Lightning protection and earthing systems', 'number', 'EUR', false, '§5.4, Tab.1 KG 446', 446, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_447', 'Fahrleitungssysteme', 'Catenary systems', 'number', 'EUR', false, '§5.4, Tab.1 KG 447', 447, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_449', 'Sonstiges zu KG 440', 'Miscellaneous for KG 440', 'number', 'EUR', false, '§5.4, Tab.1 KG 449', 449, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_451', 'Telekommunikationsanlagen', 'Telecommunications systems', 'number', 'EUR', false, '§5.4, Tab.1 KG 451', 451, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_452', 'Such- und Signalanlagen', 'Search and signalling systems', 'number', 'EUR', false, '§5.4, Tab.1 KG 452', 452, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_453', 'Zeitdienstanlagen', 'Time service systems', 'number', 'EUR', false, '§5.4, Tab.1 KG 453', 453, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_454', 'Elektroakustische Anlagen', 'Electroacoustic systems', 'number', 'EUR', false, '§5.4, Tab.1 KG 454', 454, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_455', 'Audiovisuelle Medien- und Antennenanlagen', 'Audiovisual media and antenna systems', 'number', 'EUR', false, '§5.4, Tab.1 KG 455', 455, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_456', 'Gefahrenmelde- und Alarmanlagen', 'Hazard detection and alarm systems', 'number', 'EUR', false, '§5.4, Tab.1 KG 456', 456, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_457', 'Datenübertragungsnetze', 'Data transmission networks', 'number', 'EUR', false, '§5.4, Tab.1 KG 457', 457, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_458', 'Verkehrsbeeinflussungsanlagen', 'Traffic control systems', 'number', 'EUR', false, '§5.4, Tab.1 KG 458', 458, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_459', 'Sonstiges zu KG 450', 'Miscellaneous for KG 450', 'number', 'EUR', false, '§5.4, Tab.1 KG 459', 459, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_461', 'Aufzugsanlagen', 'Lifts', 'number', 'EUR', false, '§5.4, Tab.1 KG 461', 461, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_462', 'Fahrtreppen, Fahrsteige', 'Escalators, moving walks', 'number', 'EUR', false, '§5.4, Tab.1 KG 462', 462, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_463', 'Befahranlagen', 'Drive-on systems', 'number', 'EUR', false, '§5.4, Tab.1 KG 463', 463, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_464', 'Transportanlagen', 'Transport systems', 'number', 'EUR', false, '§5.4, Tab.1 KG 464', 464, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_465', 'Krananlagen', 'Crane systems', 'number', 'EUR', false, '§5.4, Tab.1 KG 465', 465, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_466', 'Hydraulikanlagen', 'Hydraulic systems', 'number', 'EUR', false, '§5.4, Tab.1 KG 466', 466, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_469', 'Sonstiges zu KG 460', 'Miscellaneous for KG 460', 'number', 'EUR', false, '§5.4, Tab.1 KG 469', 469, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_471', 'Küchentechnische Anlagen', 'Kitchen equipment', 'number', 'EUR', false, '§5.4, Tab.1 KG 471', 471, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_472', 'Wäscherei-, Reinigungs- und badetechnische Anlagen', 'Laundry, cleaning and bathing facilities', 'number', 'EUR', false, '§5.4, Tab.1 KG 472', 472, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_473', 'Medienversorgungsanlagen, medizin- und labortechnische Anlagen', 'Media supply, medical and laboratory equipment', 'number', 'EUR', false, '§5.4, Tab.1 KG 473', 473, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_474', 'Feuerlöschanlagen', 'Fire extinguishing systems', 'number', 'EUR', false, '§5.4, Tab.1 KG 474', 474, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_475', 'Prozesswärme-, kälte- und -luftanlagen', 'Process heating, cooling and air systems', 'number', 'EUR', false, '§5.4, Tab.1 KG 475', 475, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_476', 'Weitere nutzungsspezifische Anlagen', 'Other utilisation-specific systems', 'number', 'EUR', false, '§5.4, Tab.1 KG 476', 476, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_477', 'Verfahrenstechnische Anlagen, Wasser, Abwasser und Gase', 'Process engineering systems, water, waste water and gases', 'number', 'EUR', false, '§5.4, Tab.1 KG 477', 477, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_478', 'Verfahrenstechnische Anlagen, Feststoffe, Wertstoffe und Abfälle', 'Process plants, solids, recyclables and waste', 'number', 'EUR', false, '§5.4, Tab.1 KG 478', 478, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_479', 'Sonstiges zu KG 470', 'Miscellaneous for KG 470', 'number', 'EUR', false, '§5.4, Tab.1 KG 479', 479, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_481', 'Automationseinrichtungen', 'Automation equipment', 'number', 'EUR', false, '§5.4, Tab.1 KG 481', 481, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_482', 'Schaltschränke, Automationsschwerpunkte', 'Switch cabinets, automation focal points', 'number', 'EUR', false, '§5.4, Tab.1 KG 482', 482, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_483', 'Automationsmanagement', 'Automation management', 'number', 'EUR', false, '§5.4, Tab.1 KG 483', 483, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_484', 'Kabel, Leitungen und Verlegesysteme', 'Cables, lines and installation systems', 'number', 'EUR', false, '§5.4, Tab.1 KG 484', 484, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_485', 'Datenübertragungsnetze', 'Data transmission networks', 'number', 'EUR', false, '§5.4, Tab.1 KG 485', 485, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_489', 'Sonstiges zu KG 480', 'Miscellaneous for KG 480', 'number', 'EUR', false, '§5.4, Tab.1 KG 489', 489, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_491', 'Baustelleneinrichtung', 'Construction site equipment', 'number', 'EUR', false, '§5.4, Tab.1 KG 491', 491, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_492', 'Gerüste', 'Scaffolding', 'number', 'EUR', false, '§5.4, Tab.1 KG 492', 492, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_493', 'Sicherungsmaßnahmen', 'Security measures', 'number', 'EUR', false, '§5.4, Tab.1 KG 493', 493, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_494', 'Abbruchmaßnahmen', 'Demolition measures', 'number', 'EUR', false, '§5.4, Tab.1 KG 494', 494, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_495', 'Instandsetzungen', 'Repairs', 'number', 'EUR', false, '§5.4, Tab.1 KG 495', 495, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_496', 'Materialentsorgung', 'Material disposal', 'number', 'EUR', false, '§5.4, Tab.1 KG 496', 496, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_497', 'Zusätzliche Maßnahmen', 'Additional measures', 'number', 'EUR', false, '§5.4, Tab.1 KG 497', 497, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_498', 'Provisorische Technische Anlagen', 'Provisional technical installations', 'number', 'EUR', false, '§5.4, Tab.1 KG 498', 498, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_499', 'Sonstiges zu KG 490', 'Miscellaneous for KG 490', 'number', 'EUR', false, '§5.4, Tab.1 KG 499', 499, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;

  -- Section D derived sub-totals (9)
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_d_id, 'kg_410_total', 'KG 410 Gesamt', 'Total sewage, water and gas systems', 'number', 'EUR', false, '§5.4, Tab.1 KG 410', 410, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_d_id, 'kg_420_total', 'KG 420 Gesamt', 'Total heat supply systems', 'number', 'EUR', false, '§5.4, Tab.1 KG 420', 420, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_d_id, 'kg_430_total', 'KG 430 Gesamt', 'Total ventilation and air conditioning systems', 'number', 'EUR', false, '§5.4, Tab.1 KG 430', 430, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_d_id, 'kg_440_total', 'KG 440 Gesamt', 'Total electrical systems', 'number', 'EUR', false, '§5.4, Tab.1 KG 440', 440, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_d_id, 'kg_450_total', 'KG 450 Gesamt', 'Total communication, security and information technology systems', 'number', 'EUR', false, '§5.4, Tab.1 KG 450', 450, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_d_id, 'kg_460_total', 'KG 460 Gesamt', 'Total conveyor systems', 'number', 'EUR', false, '§5.4, Tab.1 KG 460', 460, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_d_id, 'kg_470_total', 'KG 470 Gesamt', 'Total utilisation-specific and process engineering systems', 'number', 'EUR', false, '§5.4, Tab.1 KG 470', 470, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_d_id, 'kg_480_total', 'KG 480 Gesamt', 'Total building and plant automation', 'number', 'EUR', false, '§5.4, Tab.1 KG 480', 480, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_d_id, 'kg_490_total', 'KG 490 Gesamt', 'Total other measures for technical installations', 'number', 'EUR', false, '§5.4, Tab.1 KG 490', 490, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;

  -- Equations (10)
  IF NOT EXISTS (SELECT 1 FROM equations WHERE worksheet_template_id = v_wt_id AND output_symbol = 'kg_410_total') THEN
    INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, verification_status)
      VALUES (v_wt_id, 'KG4-01', 'kg_411 + kg_412 + kg_413 + kg_419', ARRAY['kg_411', 'kg_412', 'kg_413', 'kg_419']::text[], 'kg_410_total', 'EUR', '§5.4, Tab.1 KG 410', 'imported_unverified');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM equations WHERE worksheet_template_id = v_wt_id AND output_symbol = 'kg_420_total') THEN
    INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, verification_status)
      VALUES (v_wt_id, 'KG4-02', 'kg_421 + kg_422 + kg_423 + kg_424 + kg_429', ARRAY['kg_421', 'kg_422', 'kg_423', 'kg_424', 'kg_429']::text[], 'kg_420_total', 'EUR', '§5.4, Tab.1 KG 420', 'imported_unverified');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM equations WHERE worksheet_template_id = v_wt_id AND output_symbol = 'kg_430_total') THEN
    INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, verification_status)
      VALUES (v_wt_id, 'KG4-03', 'kg_431 + kg_432 + kg_433 + kg_434 + kg_439', ARRAY['kg_431', 'kg_432', 'kg_433', 'kg_434', 'kg_439']::text[], 'kg_430_total', 'EUR', '§5.4, Tab.1 KG 430', 'imported_unverified');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM equations WHERE worksheet_template_id = v_wt_id AND output_symbol = 'kg_440_total') THEN
    INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, verification_status)
      VALUES (v_wt_id, 'KG4-04', 'kg_441 + kg_442 + kg_443 + kg_444 + kg_445 + kg_446 + kg_447 + kg_449', ARRAY['kg_441', 'kg_442', 'kg_443', 'kg_444', 'kg_445', 'kg_446', 'kg_447', 'kg_449']::text[], 'kg_440_total', 'EUR', '§5.4, Tab.1 KG 440', 'imported_unverified');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM equations WHERE worksheet_template_id = v_wt_id AND output_symbol = 'kg_450_total') THEN
    INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, verification_status)
      VALUES (v_wt_id, 'KG4-05', 'kg_451 + kg_452 + kg_453 + kg_454 + kg_455 + kg_456 + kg_457 + kg_458 + kg_459', ARRAY['kg_451', 'kg_452', 'kg_453', 'kg_454', 'kg_455', 'kg_456', 'kg_457', 'kg_458', 'kg_459']::text[], 'kg_450_total', 'EUR', '§5.4, Tab.1 KG 450', 'imported_unverified');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM equations WHERE worksheet_template_id = v_wt_id AND output_symbol = 'kg_460_total') THEN
    INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, verification_status)
      VALUES (v_wt_id, 'KG4-06', 'kg_461 + kg_462 + kg_463 + kg_464 + kg_465 + kg_466 + kg_469', ARRAY['kg_461', 'kg_462', 'kg_463', 'kg_464', 'kg_465', 'kg_466', 'kg_469']::text[], 'kg_460_total', 'EUR', '§5.4, Tab.1 KG 460', 'imported_unverified');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM equations WHERE worksheet_template_id = v_wt_id AND output_symbol = 'kg_470_total') THEN
    INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, verification_status)
      VALUES (v_wt_id, 'KG4-07', 'kg_471 + kg_472 + kg_473 + kg_474 + kg_475 + kg_476 + kg_477 + kg_478 + kg_479', ARRAY['kg_471', 'kg_472', 'kg_473', 'kg_474', 'kg_475', 'kg_476', 'kg_477', 'kg_478', 'kg_479']::text[], 'kg_470_total', 'EUR', '§5.4, Tab.1 KG 470', 'imported_unverified');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM equations WHERE worksheet_template_id = v_wt_id AND output_symbol = 'kg_480_total') THEN
    INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, verification_status)
      VALUES (v_wt_id, 'KG4-08', 'kg_481 + kg_482 + kg_483 + kg_484 + kg_485 + kg_489', ARRAY['kg_481', 'kg_482', 'kg_483', 'kg_484', 'kg_485', 'kg_489']::text[], 'kg_480_total', 'EUR', '§5.4, Tab.1 KG 480', 'imported_unverified');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM equations WHERE worksheet_template_id = v_wt_id AND output_symbol = 'kg_490_total') THEN
    INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, verification_status)
      VALUES (v_wt_id, 'KG4-09', 'kg_491 + kg_492 + kg_493 + kg_494 + kg_495 + kg_496 + kg_497 + kg_498 + kg_499', ARRAY['kg_491', 'kg_492', 'kg_493', 'kg_494', 'kg_495', 'kg_496', 'kg_497', 'kg_498', 'kg_499']::text[], 'kg_490_total', 'EUR', '§5.4, Tab.1 KG 490', 'imported_unverified');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM equations WHERE worksheet_template_id = v_wt_id AND output_symbol = 'kg_400_total') THEN
    INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, verification_status)
      VALUES (v_wt_id, 'KG4-10', 'kg_410_total + kg_420_total + kg_430_total + kg_440_total + kg_450_total + kg_460_total + kg_470_total + kg_480_total + kg_490_total', ARRAY['kg_410_total', 'kg_420_total', 'kg_430_total', 'kg_440_total', 'kg_450_total', 'kg_460_total', 'kg_470_total', 'kg_480_total', 'kg_490_total']::text[], 'kg_400_total', 'EUR', '§5.4, Tab.1 KG 400', 'imported_unverified');
  END IF;
END
$din276_kg400$;
