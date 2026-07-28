-- SOURCE-SETTLED — DWA-M-102-4: populate 3 empty surface-type enums VERBATIM from the printed tables,
-- and correct their mis-attributed clause_reference.
--
-- These enum fields rendered as dead dropdowns (enum_values empty). The options are reproduced verbatim
-- from the guideline's OWN printed tables (in-session, rendered pages):
--   roof_type    <- Anhang A, Tabelle A.1 "Aufteilungswerte für Flächen", Flächentyp = Dach (p.27), 6 rows
--   street_type  <- Anhang A, Tabelle A.1, Flächentyp = Verkehrs- und Wegfläche (p.27), 8 rows
--   vegetation_type <- Anhang C, Tabelle C.5 "Flächenanteile der Landnutzungseinheiten" (p.44), 5 rows
-- German umlauts restored to the printed orthography; value keys are ascii snake_case.
--
-- The stored clause_reference "§5.2, Tab.4" is WRONG (Tab.4 there is HAD water-balance data, not
-- surface types) — verified this session — so it is corrected to the real source table (dead-reference
-- class c). Nothing invented; every option is a printed table row.
--
-- Rollback: scripts/rollback-20260728270000-m1024-surface-enums.sql
DO $$
DECLARE v int := 0;
BEGIN
  UPDATE fields SET
    clause_reference = 'Anhang A, Tabelle A.1',
    enum_values = '[
      {"value":"steildach_alle_materialien","label_de":"Steildach (alle Materialien)","label_en":"Pitched roof (all materials)","order_index":1,"regulation_reference":"Anhang A, Tabelle A.1 (S. 27)"},
      {"value":"flachdach_glatt","label_de":"Flachdach (glatt)","label_en":"Flat roof (smooth)","order_index":2,"regulation_reference":"Anhang A, Tabelle A.1 (S. 27)"},
      {"value":"flachdach_rau","label_de":"Flachdach (rau)","label_en":"Flat roof (rough)","order_index":3,"regulation_reference":"Anhang A, Tabelle A.1 (S. 27)"},
      {"value":"flachdach_kies","label_de":"Flachdach (Kies)","label_en":"Flat roof (gravel)","order_index":4,"regulation_reference":"Anhang A, Tabelle A.1 (S. 27)"},
      {"value":"gruendach","label_de":"Gründach","label_en":"Green roof","order_index":5,"regulation_reference":"Anhang A, Tabelle A.1 (S. 27)"},
      {"value":"einstaudach","label_de":"Einstaudach","label_en":"Retention (ponding) roof","order_index":6,"regulation_reference":"Anhang A, Tabelle A.1 (S. 27)"}
    ]'::jsonb
  WHERE id = '969669c5-d2f2-4133-8771-06c677133981' AND (enum_values IS NULL OR jsonb_array_length(enum_values)=0);
  GET DIAGNOSTICS v = ROW_COUNT; RAISE NOTICE 'roof_type: % row(s)', v;

  UPDATE fields SET
    clause_reference = 'Anhang A, Tabelle A.1',
    enum_values = '[
      {"value":"asphalt_fugenloser_beton","label_de":"Asphalt, fugenloser Beton","label_en":"Asphalt, jointless concrete","order_index":1,"regulation_reference":"Anhang A, Tabelle A.1 (S. 27)"},
      {"value":"pflaster_mit_dichten_fugen","label_de":"Pflaster mit dichten Fugen","label_en":"Paving with tight joints","order_index":2,"regulation_reference":"Anhang A, Tabelle A.1 (S. 27)"},
      {"value":"teildurchlaessige_flaechenbelaege_2_5","label_de":"Teildurchlässige Flächenbeläge (Fugenanteil 2 % bis 5 %)","label_en":"Partially permeable surface coverings (joint fraction 2 % to 5 %)","order_index":3,"regulation_reference":"Anhang A, Tabelle A.1 (S. 27)"},
      {"value":"teildurchlaessige_flaechenbelaege_6_10","label_de":"Teildurchlässige Flächenbeläge (Fugenanteil 6 % bis 10 %)","label_en":"Partially permeable surface coverings (joint fraction 6 % to 10 %)","order_index":4,"regulation_reference":"Anhang A, Tabelle A.1 (S. 27)"},
      {"value":"teildurchlaessige_belaege_porensteine_sickersteine","label_de":"Teildurchlässige Beläge (Porensteine, Sickersteine)","label_en":"Partially permeable coverings (porous / percolation blocks)","order_index":5,"regulation_reference":"Anhang A, Tabelle A.1 (S. 27)"},
      {"value":"kiesbelag_schotterrasen","label_de":"Kiesbelag, Schotterrasen","label_en":"Gravel surface, gravel lawn","order_index":6,"regulation_reference":"Anhang A, Tabelle A.1 (S. 27)"},
      {"value":"rasengittersteine_20_30","label_de":"Rasengittersteine (Fugenanteil 20 % bis 30 %)","label_en":"Grass paver blocks (joint fraction 20 % to 30 %)","order_index":7,"regulation_reference":"Anhang A, Tabelle A.1 (S. 27)"},
      {"value":"wassergebundene_decke","label_de":"Wassergebundene Decke","label_en":"Water-bound surface","order_index":8,"regulation_reference":"Anhang A, Tabelle A.1 (S. 27)"}
    ]'::jsonb
  WHERE id = '00974f75-41f1-4424-9cd5-9d4db836f3aa' AND (enum_values IS NULL OR jsonb_array_length(enum_values)=0);
  GET DIAGNOSTICS v = ROW_COUNT; RAISE NOTICE 'street_type: % row(s)', v;

  UPDATE fields SET
    clause_reference = 'Anhang C, Tabelle C.5',
    enum_values = '[
      {"value":"vegetationslose_flaeche","label_de":"Vegetationslose Fläche","label_en":"Vegetation-free area","order_index":1,"regulation_reference":"Anhang C, Tabelle C.5 (S. 44)"},
      {"value":"gruenland","label_de":"Grünland (Gras, Rasen)","label_en":"Grassland (grass, lawn)","order_index":2,"regulation_reference":"Anhang C, Tabelle C.5 (S. 44)"},
      {"value":"ackerland","label_de":"Ackerland (Stauden, kleine Büsche)","label_en":"Arable land (perennials, small shrubs)","order_index":3,"regulation_reference":"Anhang C, Tabelle C.5 (S. 44)"},
      {"value":"laubwald","label_de":"Laubwald (Große Laubgehölze)","label_en":"Deciduous forest (large broadleaf trees)","order_index":4,"regulation_reference":"Anhang C, Tabelle C.5 (S. 44)"},
      {"value":"nadelwald","label_de":"Nadelwald (Große Nadelgehölze)","label_en":"Coniferous forest (large conifers)","order_index":5,"regulation_reference":"Anhang C, Tabelle C.5 (S. 44)"}
    ]'::jsonb
  WHERE id = '0b34749f-3474-4e6d-976e-056e435ea9ab' AND (enum_values IS NULL OR jsonb_array_length(enum_values)=0);
  GET DIAGNOSTICS v = ROW_COUNT; RAISE NOTICE 'vegetation_type: % row(s)', v;
END $$;
