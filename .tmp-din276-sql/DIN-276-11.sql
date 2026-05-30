-- DIN-276 KG 300 → DIN-276-11
-- Inputs: 68, Sub-totals: 9, Equations: 10
DO $din276_kg300$
DECLARE
  v_wt_id uuid;
  v_sec_c_id uuid;
  v_sec_d_id uuid;
BEGIN
  SELECT wt.id INTO v_wt_id FROM worksheet_templates wt
    JOIN standards s ON s.id = wt.standard_id
    WHERE s.code = 'DIN-276' AND wt.code = 'DIN-276-11';
  IF v_wt_id IS NULL THEN RAISE EXCEPTION 'Worksheet DIN-276-11 not found'; END IF;
  SELECT id INTO v_sec_c_id FROM worksheet_sections WHERE worksheet_template_id = v_wt_id AND code = 'C';
  SELECT id INTO v_sec_d_id FROM worksheet_sections WHERE worksheet_template_id = v_wt_id AND code = 'D';
  IF v_sec_c_id IS NULL OR v_sec_d_id IS NULL THEN RAISE EXCEPTION 'Section C or D missing for DIN-276-11'; END IF;

  -- Section C inputs (68)
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_311', 'Herstellen', 'Manufacture', 'number', 'EUR', false, '§5.4, Tab.1 KG 311', 311, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_312', 'Umschließung', 'Enclosure', 'number', 'EUR', false, '§5.4, Tab.1 KG 312', 312, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_313', 'Wasserhaltung', 'Dewatering', 'number', 'EUR', false, '§5.4, Tab.1 KG 313', 313, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_314', 'Vortrieb', 'Propulsion', 'number', 'EUR', false, '§5.4, Tab.1 KG 314', 314, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_319', 'Sonstiges zu KG 310', 'Miscellaneous for KG 310', 'number', 'EUR', false, '§5.4, Tab.1 KG 319', 319, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_321', 'Baugrundverbesserung', 'Ground improvement', 'number', 'EUR', false, '§5.4, Tab.1 KG 321', 321, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_322', 'Flachgründungen, Bodenplatten', 'Shallow foundations and floor slabs', 'number', 'EUR', false, '§5.4, Tab.1 KG 322', 322, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_323', 'Tiefgründungen', 'Deep foundations', 'number', 'EUR', false, '§5.4, Tab.1 KG 323', 323, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_324', 'Unterböden, Bodenbeläge', 'Foundation coverings', 'number', 'EUR', false, '§5.4, Tab.1 KG 324', 324, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_325', 'Bauwerksabdichtungen', 'Sealing and cladding', 'number', 'EUR', false, '§5.4, Tab.1 KG 325', 325, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_326', 'Dränungen', 'Drainage systems', 'number', 'EUR', false, '§5.4, Tab.1 KG 326', 326, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_329', 'Sonstiges zu KG 320', 'Miscellaneous for KG 320', 'number', 'EUR', false, '§5.4, Tab.1 KG 329', 329, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_331', 'Tragende Außenwände', 'Load-bearing exterior walls', 'number', 'EUR', false, '§5.4, Tab.1 KG 331', 331, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_332', 'Nichttragende Außenwände', 'Non-loadbearing exterior walls', 'number', 'EUR', false, '§5.4, Tab.1 KG 332', 332, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_333', 'Außenstützen', 'External supports', 'number', 'EUR', false, '§5.4, Tab.1 KG 333', 333, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_334', 'Außentüren und -fenster', 'External wall openings', 'number', 'EUR', false, '§5.4, Tab.1 KG 334', 334, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_335', 'Außenwandbekleidungen, außen', 'Exterior wall cladding, exterior', 'number', 'EUR', false, '§5.4, Tab.1 KG 335', 335, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_336', 'Außenwandbekleidungen, innen', 'Exterior wall cladding, interior', 'number', 'EUR', false, '§5.4, Tab.1 KG 336', 336, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_337', 'Elementierte Außenwandkonstruktionen', 'Elementised exterior wall constructions', 'number', 'EUR', false, '§5.4, Tab.1 KG 337', 337, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_338', 'Sonnenschutz zu KG 330', 'Light protection for KG 330', 'number', 'EUR', false, '§5.4, Tab.1 KG 338', 338, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_339', 'Sonstiges zu KG 330', 'Miscellaneous for KG 330', 'number', 'EUR', false, '§5.4, Tab.1 KG 339', 339, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_341', 'Tragende Innenwände', 'Load-bearing interior walls', 'number', 'EUR', false, '§5.4, Tab.1 KG 341', 341, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_342', 'Nichttragende Innenwände', 'Non-load-bearing interior walls', 'number', 'EUR', false, '§5.4, Tab.1 KG 342', 342, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_343', 'Innenstützen', 'Internal supports', 'number', 'EUR', false, '§5.4, Tab.1 KG 343', 343, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_344', 'Innentüren und -fenster', 'Interior wall openings', 'number', 'EUR', false, '§5.4, Tab.1 KG 344', 344, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_345', 'Innenwandbekleidungen', 'Interior wall panelling', 'number', 'EUR', false, '§5.4, Tab.1 KG 345', 345, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_346', 'Elementierte Innenwandkonstruktionen', 'Elementised interior wall constructions', 'number', 'EUR', false, '§5.4, Tab.1 KG 346', 346, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_347', 'Sonnenschutz zu KG 340', 'Light protection for KG 340', 'number', 'EUR', false, '§5.4, Tab.1 KG 347', 347, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_349', 'Sonstiges zu KG 340', 'Miscellaneous for KG 340', 'number', 'EUR', false, '§5.4, Tab.1 KG 349', 349, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_351', 'Deckenkonstruktionen', 'Ceiling constructions', 'number', 'EUR', false, '§5.4, Tab.1 KG 351', 351, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_352', 'Deckenöffnungen', 'Ceiling openings', 'number', 'EUR', false, '§5.4, Tab.1 KG 352', 352, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_353', 'Deckenbeläge', 'Ceiling coverings', 'number', 'EUR', false, '§5.4, Tab.1 KG 353', 353, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_354', 'Deckenbekleidungen', 'Ceiling panelling', 'number', 'EUR', false, '§5.4, Tab.1 KG 354', 354, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_355', 'Elementierte Deckenkonstruktionen', 'Elementised ceiling constructions', 'number', 'EUR', false, '§5.4, Tab.1 KG 355', 355, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_359', 'Sonstiges zu KG 350', 'Miscellaneous for KG 350', 'number', 'EUR', false, '§5.4, Tab.1 KG 359', 359, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_361', 'Dachkonstruktionen', 'Roof constructions', 'number', 'EUR', false, '§5.4, Tab.1 KG 361', 361, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_362', 'Dachöffnungen', 'Roof openings', 'number', 'EUR', false, '§5.4, Tab.1 KG 362', 362, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_363', 'Dachbeläge', 'Roof coverings', 'number', 'EUR', false, '§5.4, Tab.1 KG 363', 363, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_364', 'Dachbekleidungen', 'Roof panelling', 'number', 'EUR', false, '§5.4, Tab.1 KG 364', 364, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_365', 'Elementierte Dachkonstruktionen', 'Elementised roof constructions', 'number', 'EUR', false, '§5.4, Tab.1 KG 365', 365, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_366', 'Sonnenschutz zu KG 360', 'Light protection for KG 360', 'number', 'EUR', false, '§5.4, Tab.1 KG 366', 366, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_369', 'Sonstiges zu KG 360', 'Miscellaneous for KG 360', 'number', 'EUR', false, '§5.4, Tab.1 KG 369', 369, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_371', 'Anlagen für den Straßenverkehr', 'Systems for road traffic', 'number', 'EUR', false, '§5.4, Tab.1 KG 371', 371, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_372', 'Anlagen für den Schienenverkehr', 'Systems for rail transport', 'number', 'EUR', false, '§5.4, Tab.1 KG 372', 372, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_373', 'Anlagen für den Luftverkehr', 'Installations for air traffic', 'number', 'EUR', false, '§5.4, Tab.1 KG 373', 373, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_374', 'Wasserbauliche Anlagen', 'Hydraulic engineering facilities', 'number', 'EUR', false, '§5.4, Tab.1 KG 374', 374, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_375', 'Abwasserentsorgungsanlagen', 'Wastewater disposal systems', 'number', 'EUR', false, '§5.4, Tab.1 KG 375', 375, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_376', 'Wasserversorgungsanlagen', 'Water supply systems', 'number', 'EUR', false, '§5.4, Tab.1 KG 376', 376, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_377', 'Energie- und Informationsversorgungsanlagen', 'Energy and information supply systems', 'number', 'EUR', false, '§5.4, Tab.1 KG 377', 377, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_378', 'Abfallentsorgungsanlagen', 'Waste disposal facilities', 'number', 'EUR', false, '§5.4, Tab.1 KG 378', 378, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_379', 'Sonstiges zu KG 370', 'Miscellaneous for KG 370', 'number', 'EUR', false, '§5.4, Tab.1 KG 379', 379, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_381', 'Allgemeine Einbauten', 'General fixtures', 'number', 'EUR', false, '§5.4, Tab.1 KG 381', 381, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_382', 'Besondere Einbauten', 'Special fixtures', 'number', 'EUR', false, '§5.4, Tab.1 KG 382', 382, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_383', 'Landschaftsgestalterische Einbauten', 'Landscaping installations', 'number', 'EUR', false, '§5.4, Tab.1 KG 383', 383, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_384', 'Mechanische Einbauten', 'Mechanical installations', 'number', 'EUR', false, '§5.4, Tab.1 KG 384', 384, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_385', 'Einbauten in Ingenieurbauwerken', 'Fixtures in civil engineering structures', 'number', 'EUR', false, '§5.4, Tab.1 KG 385', 385, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_386', 'Orientierungs- und Informationssysteme', 'Orientation and information systems', 'number', 'EUR', false, '§5.4, Tab.1 KG 386', 386, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_387', 'Schutzeinbauten', 'Protective fittings', 'number', 'EUR', false, '§5.4, Tab.1 KG 387', 387, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_389', 'Sonstiges zu KG 380', 'Miscellaneous for KG 380', 'number', 'EUR', false, '§5.4, Tab.1 KG 389', 389, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_391', 'Baustelleneinrichtung', 'Construction site equipment', 'number', 'EUR', false, '§5.4, Tab.1 KG 391', 391, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_392', 'Gerüste', 'Scaffolding', 'number', 'EUR', false, '§5.4, Tab.1 KG 392', 392, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_393', 'Sicherungsmaßnahmen', 'Security measures', 'number', 'EUR', false, '§5.4, Tab.1 KG 393', 393, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_394', 'Abbruchmaßnahmen', 'Demolition measures', 'number', 'EUR', false, '§5.4, Tab.1 KG 394', 394, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_395', 'Instandsetzungen', 'Repairs', 'number', 'EUR', false, '§5.4, Tab.1 KG 395', 395, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_396', 'Materialentsorgung', 'Material disposal', 'number', 'EUR', false, '§5.4, Tab.1 KG 396', 396, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_397', 'Zusätzliche Maßnahmen', 'Additional measures', 'number', 'EUR', false, '§5.4, Tab.1 KG 397', 397, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_398', 'Provisorische Baukonstruktionen', 'Temporary building structures', 'number', 'EUR', false, '§5.4, Tab.1 KG 398', 398, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_c_id, 'kg_399', 'Sonstiges zu KG 390', 'Miscellaneous for KG 390', 'number', 'EUR', false, '§5.4, Tab.1 KG 399', 399, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;

  -- Section D derived sub-totals (9)
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_d_id, 'kg_310_total', 'KG 310 Gesamt', 'Total excavation/earthworks', 'number', 'EUR', false, '§5.4, Tab.1 KG 310', 310, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_d_id, 'kg_320_total', 'KG 320 Gesamt', 'Total foundation, substructure', 'number', 'EUR', false, '§5.4, Tab.1 KG 320', 320, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_d_id, 'kg_330_total', 'KG 330 Gesamt', 'Total exterior walls/vertical building structures, exterior', 'number', 'EUR', false, '§5.4, Tab.1 KG 330', 330, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_d_id, 'kg_340_total', 'KG 340 Gesamt', 'Total interior walls/vertical building structures, interior', 'number', 'EUR', false, '§5.4, Tab.1 KG 340', 340, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_d_id, 'kg_350_total', 'KG 350 Gesamt', 'Total ceilings/horizontal building structures', 'number', 'EUR', false, '§5.4, Tab.1 KG 350', 350, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_d_id, 'kg_360_total', 'KG 360 Gesamt', 'Total roofs', 'number', 'EUR', false, '§5.4, Tab.1 KG 360', 360, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_d_id, 'kg_370_total', 'KG 370 Gesamt', 'Total infrastructure facilities', 'number', 'EUR', false, '§5.4, Tab.1 KG 370', 370, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_d_id, 'kg_380_total', 'KG 380 Gesamt', 'Total structural fixtures', 'number', 'EUR', false, '§5.4, Tab.1 KG 380', 380, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, order_index, verification_status)
    VALUES (v_wt_id, v_sec_d_id, 'kg_390_total', 'KG 390 Gesamt', 'Total other measures for building structures', 'number', 'EUR', false, '§5.4, Tab.1 KG 390', 390, 'imported_unverified')
    ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;

  -- Equations (10)
  IF NOT EXISTS (SELECT 1 FROM equations WHERE worksheet_template_id = v_wt_id AND output_symbol = 'kg_310_total') THEN
    INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, verification_status)
      VALUES (v_wt_id, 'KG3-01', 'kg_311 + kg_312 + kg_313 + kg_314 + kg_319', ARRAY['kg_311', 'kg_312', 'kg_313', 'kg_314', 'kg_319']::text[], 'kg_310_total', 'EUR', '§5.4, Tab.1 KG 310', 'imported_unverified');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM equations WHERE worksheet_template_id = v_wt_id AND output_symbol = 'kg_320_total') THEN
    INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, verification_status)
      VALUES (v_wt_id, 'KG3-02', 'kg_321 + kg_322 + kg_323 + kg_324 + kg_325 + kg_326 + kg_329', ARRAY['kg_321', 'kg_322', 'kg_323', 'kg_324', 'kg_325', 'kg_326', 'kg_329']::text[], 'kg_320_total', 'EUR', '§5.4, Tab.1 KG 320', 'imported_unverified');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM equations WHERE worksheet_template_id = v_wt_id AND output_symbol = 'kg_330_total') THEN
    INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, verification_status)
      VALUES (v_wt_id, 'KG3-03', 'kg_331 + kg_332 + kg_333 + kg_334 + kg_335 + kg_336 + kg_337 + kg_338 + kg_339', ARRAY['kg_331', 'kg_332', 'kg_333', 'kg_334', 'kg_335', 'kg_336', 'kg_337', 'kg_338', 'kg_339']::text[], 'kg_330_total', 'EUR', '§5.4, Tab.1 KG 330', 'imported_unverified');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM equations WHERE worksheet_template_id = v_wt_id AND output_symbol = 'kg_340_total') THEN
    INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, verification_status)
      VALUES (v_wt_id, 'KG3-04', 'kg_341 + kg_342 + kg_343 + kg_344 + kg_345 + kg_346 + kg_347 + kg_349', ARRAY['kg_341', 'kg_342', 'kg_343', 'kg_344', 'kg_345', 'kg_346', 'kg_347', 'kg_349']::text[], 'kg_340_total', 'EUR', '§5.4, Tab.1 KG 340', 'imported_unverified');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM equations WHERE worksheet_template_id = v_wt_id AND output_symbol = 'kg_350_total') THEN
    INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, verification_status)
      VALUES (v_wt_id, 'KG3-05', 'kg_351 + kg_352 + kg_353 + kg_354 + kg_355 + kg_359', ARRAY['kg_351', 'kg_352', 'kg_353', 'kg_354', 'kg_355', 'kg_359']::text[], 'kg_350_total', 'EUR', '§5.4, Tab.1 KG 350', 'imported_unverified');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM equations WHERE worksheet_template_id = v_wt_id AND output_symbol = 'kg_360_total') THEN
    INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, verification_status)
      VALUES (v_wt_id, 'KG3-06', 'kg_361 + kg_362 + kg_363 + kg_364 + kg_365 + kg_366 + kg_369', ARRAY['kg_361', 'kg_362', 'kg_363', 'kg_364', 'kg_365', 'kg_366', 'kg_369']::text[], 'kg_360_total', 'EUR', '§5.4, Tab.1 KG 360', 'imported_unverified');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM equations WHERE worksheet_template_id = v_wt_id AND output_symbol = 'kg_370_total') THEN
    INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, verification_status)
      VALUES (v_wt_id, 'KG3-07', 'kg_371 + kg_372 + kg_373 + kg_374 + kg_375 + kg_376 + kg_377 + kg_378 + kg_379', ARRAY['kg_371', 'kg_372', 'kg_373', 'kg_374', 'kg_375', 'kg_376', 'kg_377', 'kg_378', 'kg_379']::text[], 'kg_370_total', 'EUR', '§5.4, Tab.1 KG 370', 'imported_unverified');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM equations WHERE worksheet_template_id = v_wt_id AND output_symbol = 'kg_380_total') THEN
    INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, verification_status)
      VALUES (v_wt_id, 'KG3-08', 'kg_381 + kg_382 + kg_383 + kg_384 + kg_385 + kg_386 + kg_387 + kg_389', ARRAY['kg_381', 'kg_382', 'kg_383', 'kg_384', 'kg_385', 'kg_386', 'kg_387', 'kg_389']::text[], 'kg_380_total', 'EUR', '§5.4, Tab.1 KG 380', 'imported_unverified');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM equations WHERE worksheet_template_id = v_wt_id AND output_symbol = 'kg_390_total') THEN
    INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, verification_status)
      VALUES (v_wt_id, 'KG3-09', 'kg_391 + kg_392 + kg_393 + kg_394 + kg_395 + kg_396 + kg_397 + kg_398 + kg_399', ARRAY['kg_391', 'kg_392', 'kg_393', 'kg_394', 'kg_395', 'kg_396', 'kg_397', 'kg_398', 'kg_399']::text[], 'kg_390_total', 'EUR', '§5.4, Tab.1 KG 390', 'imported_unverified');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM equations WHERE worksheet_template_id = v_wt_id AND output_symbol = 'kg_300_total') THEN
    INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, verification_status)
      VALUES (v_wt_id, 'KG3-10', 'kg_310_total + kg_320_total + kg_330_total + kg_340_total + kg_350_total + kg_360_total + kg_370_total + kg_380_total + kg_390_total', ARRAY['kg_310_total', 'kg_320_total', 'kg_330_total', 'kg_340_total', 'kg_350_total', 'kg_360_total', 'kg_370_total', 'kg_380_total', 'kg_390_total']::text[], 'kg_300_total', 'EUR', '§5.4, Tab.1 KG 300', 'imported_unverified');
  END IF;
END
$din276_kg300$;
