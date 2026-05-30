-- DIN-276 KG 500 → DIN-276-13
-- Inputs: 60, Sub-totals: 9, Equations: 10
DO $din276_kg500$
DECLARE
  v_wt_id uuid;
  v_sec_c_id uuid;
  v_sec_d_id uuid;
BEGIN
  SELECT wt.id INTO v_wt_id FROM worksheet_templates wt
    JOIN standards s ON s.id = wt.standard_id
    WHERE s.code = 'DIN-276' AND wt.code = 'DIN-276-13';
  IF v_wt_id IS NULL THEN RAISE EXCEPTION 'Worksheet DIN-276-13 not found'; END IF;
  SELECT id INTO v_sec_c_id FROM worksheet_sections WHERE worksheet_template_id = v_wt_id AND code = 'C';
  SELECT id INTO v_sec_d_id FROM worksheet_sections WHERE worksheet_template_id = v_wt_id AND code = 'D';
  IF v_sec_c_id IS NULL OR v_sec_d_id IS NULL THEN RAISE EXCEPTION 'Section C or D missing for DIN-276-13'; END IF;

  -- Section C inputs (60)
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_511', 'Herstellen', 'Manufacture', 'number', 'EUR', false, '§5.4, Tab.1 KG 511', 511, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_512', 'Umschließung', 'Enclosure', 'number', 'EUR', false, '§5.4, Tab.1 KG 512', 512, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_513', 'Wasserhaltung', 'Dewatering', 'number', 'EUR', false, '§5.4, Tab.1 KG 513', 513, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_514', 'Vortrieb', 'Propulsion', 'number', 'EUR', false, '§5.4, Tab.1 KG 514', 514, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_519', 'Sonstiges zu KG 510', 'Miscellaneous for KG 510', 'number', 'EUR', false, '§5.4, Tab.1 KG 519', 519, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_521', 'Baugrundverbesserung', 'Ground improvement', 'number', 'EUR', false, '§5.4, Tab.1 KG 521', 521, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_522', 'Flachgründungen, Bodenplatten', 'Foundations and floor slabs', 'number', 'EUR', false, '§5.4, Tab.1 KG 522', 522, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_523', 'Unterböden, Bodenbeläge', 'Foundation coverings', 'number', 'EUR', false, '§5.4, Tab.1 KG 523', 523, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_524', 'Bauwerksabdichtungen', 'Sealing and cladding', 'number', 'EUR', false, '§5.4, Tab.1 KG 524', 524, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_525', 'Dränungen', 'Drainage systems', 'number', 'EUR', false, '§5.4, Tab.1 KG 525', 525, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_529', 'Sonstiges zu KG 520', 'Miscellaneous for KG 520', 'number', 'EUR', false, '§5.4, Tab.1 KG 529', 529, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_531', 'Wege', 'Paths', 'number', 'EUR', false, '§5.4, Tab.1 KG 531', 531, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_532', 'Straßen', 'Roads', 'number', 'EUR', false, '§5.4, Tab.1 KG 532', 532, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_533', 'Plätze, Höfe, Terrassen', 'Squares, courtyards, terraces', 'number', 'EUR', false, '§5.4, Tab.1 KG 533', 533, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_534', 'Stellplätze', 'Pitches', 'number', 'EUR', false, '§5.4, Tab.1 KG 534', 534, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_535', 'Sportplatzflächen', 'Sports field areas', 'number', 'EUR', false, '§5.4, Tab.1 KG 535', 535, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_536', 'Spielplatzflächen', 'Playground areas', 'number', 'EUR', false, '§5.4, Tab.1 KG 536', 536, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_537', 'Gleisanlagen', 'Track systems', 'number', 'EUR', false, '§5.4, Tab.1 KG 537', 537, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_538', 'Flugplatzflächen', 'Aerodrome areas', 'number', 'EUR', false, '§5.4, Tab.1 KG 538', 538, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_539', 'Sonstiges zu KG 530', 'Miscellaneous for KG 530', 'number', 'EUR', false, '§5.4, Tab.1 KG 539', 539, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_541', 'Einfriedungen', 'Enclosures', 'number', 'EUR', false, '§5.4, Tab.1 KG 541', 541, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_542', 'Schutzkonstruktionen', 'Protective structures', 'number', 'EUR', false, '§5.4, Tab.1 KG 542', 542, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_543', 'Wandkonstruktionen', 'Wall constructions', 'number', 'EUR', false, '§5.4, Tab.1 KG 543', 543, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_544', 'Rampen, Treppen, Tribünen', 'Ramps, stairs, grandstands', 'number', 'EUR', false, '§5.4, Tab.1 KG 544', 544, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_545', 'Überdachungen', 'Canopies', 'number', 'EUR', false, '§5.4, Tab.1 KG 545', 545, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_546', 'Brücken', 'Bridges', 'number', 'EUR', false, '§5.4, Tab.1 KG 546', 546, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_547', 'Kanal- und Schachtbauten', 'Channel and manhole constructions', 'number', 'EUR', false, '§5.4, Tab.1 KG 547', 547, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_548', 'Wasserbecken', 'Water basin', 'number', 'EUR', false, '§5.4, Tab.1 KG 548', 548, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_549', 'Sonstiges zu KG 540', 'Miscellaneous for KG 540', 'number', 'EUR', false, '§5.4, Tab.1 KG 549', 549, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_551', 'Abwasseranlagen', 'Sewage systems', 'number', 'EUR', false, '§5.4, Tab.1 KG 551', 551, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_552', 'Wasseranlagen', 'Water systems', 'number', 'EUR', false, '§5.4, Tab.1 KG 552', 552, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_553', 'Gas- und Flüssigkeitsanlagen', 'Systems for gases and liquids', 'number', 'EUR', false, '§5.4, Tab.1 KG 553', 553, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_554', 'Wärmeversorgungsanlagen', 'Heat supply systems', 'number', 'EUR', false, '§5.4, Tab.1 KG 554', 554, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_555', 'Raumlufttechnische Anlagen', 'Ventilation and air conditioning systems', 'number', 'EUR', false, '§5.4, Tab.1 KG 555', 555, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_556', 'Elektrische Anlagen', 'Electrical systems', 'number', 'EUR', false, '§5.4, Tab.1 KG 556', 556, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_557', 'Kommunikations-, sicherheits- und informationstechnische Anlagen, Automation', 'Communication, security and information technology systems, automation', 'number', 'EUR', false, '§5.4, Tab.1 KG 557', 557, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_558', 'Nutzungsspezifische Anlagen', 'Utilisation-specific systems', 'number', 'EUR', false, '§5.4, Tab.1 KG 558', 558, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_559', 'Sonstiges zu KG 550', 'Miscellaneous for KG 550', 'number', 'EUR', false, '§5.4, Tab.1 KG 559', 559, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_561', 'Allgemeine Einbauten', 'General fixtures', 'number', 'EUR', false, '§5.4, Tab.1 KG 561', 561, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_562', 'Besondere Einbauten', 'Special fixtures', 'number', 'EUR', false, '§5.4, Tab.1 KG 562', 562, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_563', 'Orientierungs- und Informationssysteme', 'Orientation and information systems', 'number', 'EUR', false, '§5.4, Tab.1 KG 563', 563, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_569', 'Sonstiges zu KG 560', 'Miscellaneous for KG 560', 'number', 'EUR', false, '§5.4, Tab.1 KG 569', 569, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_571', 'Vegetationstechnische Bodenbearbeitung', 'Vegetation tillage', 'number', 'EUR', false, '§5.4, Tab.1 KG 571', 571, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_572', 'Sicherungsbauweisen', 'Fuse construction methods', 'number', 'EUR', false, '§5.4, Tab.1 KG 572', 572, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_573', 'Pflanzflächen', 'Planting areas', 'number', 'EUR', false, '§5.4, Tab.1 KG 573', 573, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_574', 'Rasen- und Saatflächen', 'Lawns and seeded areas', 'number', 'EUR', false, '§5.4, Tab.1 KG 574', 574, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_579', 'Sonstiges zu KG 570', 'Miscellaneous for KG 570', 'number', 'EUR', false, '§5.4, Tab.1 KG 579', 579, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_581', 'Befestigungen', 'Attachments', 'number', 'EUR', false, '§5.4, Tab.1 KG 581', 581, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_582', 'Abdichtungen', 'Sealings', 'number', 'EUR', false, '§5.4, Tab.1 KG 582', 582, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_583', 'Bepflanzungen', 'Plantings', 'number', 'EUR', false, '§5.4, Tab.1 KG 583', 583, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_589', 'Sonstiges zu KG 580', 'Miscellaneous for KG 580', 'number', 'EUR', false, '§5.4, Tab.1 KG 589', 589, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_591', 'Baustelleneinrichtung', 'Construction site equipment', 'number', 'EUR', false, '§5.4, Tab.1 KG 591', 591, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_592', 'Gerüste', 'Scaffolding', 'number', 'EUR', false, '§5.4, Tab.1 KG 592', 592, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_593', 'Sicherungsmaßnahmen', 'Security measures', 'number', 'EUR', false, '§5.4, Tab.1 KG 593', 593, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_594', 'Abbruchmaßnahmen', 'Demolition measures', 'number', 'EUR', false, '§5.4, Tab.1 KG 594', 594, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_595', 'Instandsetzungen', 'Repairs', 'number', 'EUR', false, '§5.4, Tab.1 KG 595', 595, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_596', 'Materialentsorgung', 'Material disposal', 'number', 'EUR', false, '§5.4, Tab.1 KG 596', 596, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_597', 'Zusätzliche Maßnahmen', 'Additional measures', 'number', 'EUR', false, '§5.4, Tab.1 KG 597', 597, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_598', 'Provisorische Außenanlagen und Freiflächen', 'Provisional outdoor facilities and open spaces', 'number', 'EUR', false, '§5.4, Tab.1 KG 598', 598, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_599', 'Sonstiges zu KG 590', 'Miscellaneous for KG 590', 'number', 'EUR', false, '§5.4, Tab.1 KG 599', 599, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;

  -- Section D derived sub-totals (9)
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_d_id, 'kg_510_total', 'KG 510 Gesamt', 'Total earthworks', 'number', 'EUR', false, '§5.4, Tab.1 KG 510', 510, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_d_id, 'kg_520_total', 'KG 520 Gesamt', 'Total foundation, substructure', 'number', 'EUR', false, '§5.4, Tab.1 KG 520', 520, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_d_id, 'kg_530_total', 'KG 530 Gesamt', 'Total superstructure, surface courses', 'number', 'EUR', false, '§5.4, Tab.1 KG 530', 530, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_d_id, 'kg_540_total', 'KG 540 Gesamt', 'Total building constructions', 'number', 'EUR', false, '§5.4, Tab.1 KG 540', 540, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_d_id, 'kg_550_total', 'KG 550 Gesamt', 'Total technical installations', 'number', 'EUR', false, '§5.4, Tab.1 KG 550', 550, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_d_id, 'kg_560_total', 'KG 560 Gesamt', 'Total installations in outdoor facilities and open spaces', 'number', 'EUR', false, '§5.4, Tab.1 KG 560', 560, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_d_id, 'kg_570_total', 'KG 570 Gesamt', 'Total vegetation areas', 'number', 'EUR', false, '§5.4, Tab.1 KG 570', 570, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_d_id, 'kg_580_total', 'KG 580 Gesamt', 'Total water surfaces', 'number', 'EUR', false, '§5.4, Tab.1 KG 580', 580, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_d_id, 'kg_590_total', 'KG 590 Gesamt', 'Total other measures for outdoor facilities and open spaces', 'number', 'EUR', false, '§5.4, Tab.1 KG 590', 590, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;

  -- Equations (10)
  IF NOT EXISTS (SELECT 1 FROM equations WHERE worksheet_template_id = v_wt_id AND output_symbol = 'kg_510_total') THEN
    INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, verification_status)
      VALUES (v_wt_id, 'KG5-01', 'kg_511 + kg_512 + kg_513 + kg_514 + kg_519', ARRAY['kg_511', 'kg_512', 'kg_513', 'kg_514', 'kg_519']::text[], 'kg_510_total', 'EUR', '§5.4, Tab.1 KG 510', 'imported_unverified');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM equations WHERE worksheet_template_id = v_wt_id AND output_symbol = 'kg_520_total') THEN
    INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, verification_status)
      VALUES (v_wt_id, 'KG5-02', 'kg_521 + kg_522 + kg_523 + kg_524 + kg_525 + kg_529', ARRAY['kg_521', 'kg_522', 'kg_523', 'kg_524', 'kg_525', 'kg_529']::text[], 'kg_520_total', 'EUR', '§5.4, Tab.1 KG 520', 'imported_unverified');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM equations WHERE worksheet_template_id = v_wt_id AND output_symbol = 'kg_530_total') THEN
    INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, verification_status)
      VALUES (v_wt_id, 'KG5-03', 'kg_531 + kg_532 + kg_533 + kg_534 + kg_535 + kg_536 + kg_537 + kg_538 + kg_539', ARRAY['kg_531', 'kg_532', 'kg_533', 'kg_534', 'kg_535', 'kg_536', 'kg_537', 'kg_538', 'kg_539']::text[], 'kg_530_total', 'EUR', '§5.4, Tab.1 KG 530', 'imported_unverified');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM equations WHERE worksheet_template_id = v_wt_id AND output_symbol = 'kg_540_total') THEN
    INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, verification_status)
      VALUES (v_wt_id, 'KG5-04', 'kg_541 + kg_542 + kg_543 + kg_544 + kg_545 + kg_546 + kg_547 + kg_548 + kg_549', ARRAY['kg_541', 'kg_542', 'kg_543', 'kg_544', 'kg_545', 'kg_546', 'kg_547', 'kg_548', 'kg_549']::text[], 'kg_540_total', 'EUR', '§5.4, Tab.1 KG 540', 'imported_unverified');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM equations WHERE worksheet_template_id = v_wt_id AND output_symbol = 'kg_550_total') THEN
    INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, verification_status)
      VALUES (v_wt_id, 'KG5-05', 'kg_551 + kg_552 + kg_553 + kg_554 + kg_555 + kg_556 + kg_557 + kg_558 + kg_559', ARRAY['kg_551', 'kg_552', 'kg_553', 'kg_554', 'kg_555', 'kg_556', 'kg_557', 'kg_558', 'kg_559']::text[], 'kg_550_total', 'EUR', '§5.4, Tab.1 KG 550', 'imported_unverified');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM equations WHERE worksheet_template_id = v_wt_id AND output_symbol = 'kg_560_total') THEN
    INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, verification_status)
      VALUES (v_wt_id, 'KG5-06', 'kg_561 + kg_562 + kg_563 + kg_569', ARRAY['kg_561', 'kg_562', 'kg_563', 'kg_569']::text[], 'kg_560_total', 'EUR', '§5.4, Tab.1 KG 560', 'imported_unverified');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM equations WHERE worksheet_template_id = v_wt_id AND output_symbol = 'kg_570_total') THEN
    INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, verification_status)
      VALUES (v_wt_id, 'KG5-07', 'kg_571 + kg_572 + kg_573 + kg_574 + kg_579', ARRAY['kg_571', 'kg_572', 'kg_573', 'kg_574', 'kg_579']::text[], 'kg_570_total', 'EUR', '§5.4, Tab.1 KG 570', 'imported_unverified');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM equations WHERE worksheet_template_id = v_wt_id AND output_symbol = 'kg_580_total') THEN
    INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, verification_status)
      VALUES (v_wt_id, 'KG5-08', 'kg_581 + kg_582 + kg_583 + kg_589', ARRAY['kg_581', 'kg_582', 'kg_583', 'kg_589']::text[], 'kg_580_total', 'EUR', '§5.4, Tab.1 KG 580', 'imported_unverified');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM equations WHERE worksheet_template_id = v_wt_id AND output_symbol = 'kg_590_total') THEN
    INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, verification_status)
      VALUES (v_wt_id, 'KG5-09', 'kg_591 + kg_592 + kg_593 + kg_594 + kg_595 + kg_596 + kg_597 + kg_598 + kg_599', ARRAY['kg_591', 'kg_592', 'kg_593', 'kg_594', 'kg_595', 'kg_596', 'kg_597', 'kg_598', 'kg_599']::text[], 'kg_590_total', 'EUR', '§5.4, Tab.1 KG 590', 'imported_unverified');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM equations WHERE worksheet_template_id = v_wt_id AND output_symbol = 'kg_500_total') THEN
    INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, verification_status)
      VALUES (v_wt_id, 'KG5-10', 'kg_510_total + kg_520_total + kg_530_total + kg_540_total + kg_550_total + kg_560_total + kg_570_total + kg_580_total + kg_590_total', ARRAY['kg_510_total', 'kg_520_total', 'kg_530_total', 'kg_540_total', 'kg_550_total', 'kg_560_total', 'kg_570_total', 'kg_580_total', 'kg_590_total']::text[], 'kg_500_total', 'EUR', '§5.4, Tab.1 KG 500', 'imported_unverified');
  END IF;
END
$din276_kg500$;
