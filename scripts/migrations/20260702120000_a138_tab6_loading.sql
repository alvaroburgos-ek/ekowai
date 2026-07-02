-- scripts/migrations/20260702120000_a138_tab6_loading.sql
-- DWA-A 138-1 Tab.6 loading check — DB schema for B1 Task 3.
-- WRITTEN-NOT-APPLIED — apply via Management-API POST after Alvaro's review.
-- Rollback: scripts/rollback-20260702120000-a138_tab6_loading.sql
--
-- Four idempotent operations:
--   (1) INSERT field `flaechengruppe` on A138-06 (data_type='enum', 19 Tab.5 codes)
--       so engineers can set the Flächengruppe that governs the Tab.6 tier.
--       consumer_worksheets='{A138-12}' declares A138-12 as the downstream consumer.
--   (2) UPDATE A138-07 field `A_C`: append 'A138-12' to consumer_worksheets so the
--       drainage-contributing area flows to the loading check (A138-12 reads it).
--   (3) ALTER A138-12 field `ac_as_ratio_check`: change data_type 'boolean' → 'text'
--       for the 4-state status; null value_boolean on ALL param rows of that field
--       (every boolean value is stale after the boolean→text retype; ~1 row today).
--   (4) INSERT field `ac_as_ratio_check_reason` on A138-12: companion text field for
--       the not_applicable / indeterminate reason text.
DO $$
DECLARE
  ws06  uuid;
  ws07  uuid;
  ws12  uuid;
  sec06 uuid;
  sec12 uuid;
  max_order06 int;
  max_order12 int;
  fld_ac_ratio_check uuid;
  fld_reason uuid;
BEGIN
  -- Resolve worksheet template IDs
  SELECT wt.id INTO ws06 FROM worksheet_templates wt
    JOIN standards s ON s.id = wt.standard_id
    WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-06';
  SELECT wt.id INTO ws07 FROM worksheet_templates wt
    JOIN standards s ON s.id = wt.standard_id
    WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-07';
  SELECT wt.id INTO ws12 FROM worksheet_templates wt
    JOIN standards s ON s.id = wt.standard_id
    WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-12';

  IF ws06 IS NULL OR ws07 IS NULL OR ws12 IS NULL THEN
    RAISE EXCEPTION 'a138_tab6_loading: worksheet not found (ws06=% ws07=% ws12=%)', ws06, ws07, ws12;
  END IF;

  -- Pick a section to attach to for each template (first section by order_index)
  SELECT section_id INTO sec06 FROM fields
    WHERE worksheet_template_id = ws06 AND section_id IS NOT NULL
    ORDER BY order_index LIMIT 1;
  SELECT section_id INTO sec12 FROM fields
    WHERE worksheet_template_id = ws12 AND section_id IS NOT NULL
    ORDER BY order_index LIMIT 1;

  IF sec06 IS NULL THEN
    RAISE EXCEPTION 'a138_tab6_loading: no section on A138-06';
  END IF;
  IF sec12 IS NULL THEN
    RAISE EXCEPTION 'a138_tab6_loading: no section on A138-12';
  END IF;

  -- ---------------------------------------------------------------------------
  -- (1) INSERT field `flaechengruppe` on A138-06 (enum, Tab.5, 19 codes)
  --     Guard: only insert if not already present (idempotent).
  --
  --     CANONICAL CODE LIST (19 entries, Tab.5 order):
  --       D, VW1, V1, VW2, V2, V3, BG1, BF, BL, BG2, BG3,
  --       SD1, SD2, SV, SVW, SF, SL, SG, SA
  --     Source of truth: flaechengruppeToTier() in
  --       src/lib/eval/tab6-loading.ts (FLAECHENGRUPPE_CODES export).
  --     Consistency test: src/lib/eval/__tests__/tab6-loading.test.ts
  --       "flaechengruppeToTier — enum/resolver consistency guard".
--     NOTE: Tab. 5 lists "SV bzw. SVW" as ONE row with one shared specification and
--       defines no SV/SVW distinction. Both codes carry the same source wording
--       (differentiator = the code) and both route to `authority`.
  -- ---------------------------------------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM fields
    WHERE worksheet_template_id = ws06 AND symbol = 'flaechengruppe'
  ) THEN
    SELECT COALESCE(MAX(order_index), 0) + 1 INTO max_order06
      FROM fields WHERE worksheet_template_id = ws06;

    INSERT INTO fields (
      worksheet_template_id, section_id, symbol, label_de,
      data_type, is_required, active, order_index,
      clause_reference, consumer_worksheets, enum_values,
      verification_status
    ) VALUES (
      ws06, sec06, 'flaechengruppe', 'Flächengruppe (Tab. 5)',
      'enum', false, true, max_order06,
      '§5.2.3.2 / Tab. 5', ARRAY['A138-12'],
      '[
        {"label_de": "Dachflächen",                                                      "label_en": "Roof surfaces",                                          "value": "D",   "order_index": 0,  "regulation_reference": "Tab. 5"},
        {"label_de": "Hof-/Wegeflächen ohne Kfz-Verkehr",                               "label_en": "Yard/path surfaces without motor traffic",               "value": "VW1", "order_index": 1,  "regulation_reference": "Tab. 5"},
        {"label_de": "Verkehrsflächen, geringer Kfz-Verkehr (DTV ≤ 300)",              "label_en": "Traffic areas, low motor traffic (DTV ≤ 300)",           "value": "V1",  "order_index": 2,  "regulation_reference": "Tab. 5"},
        {"label_de": "Marktplätze / Veranstaltungs-/Einkaufsflächen",                  "label_en": "Market squares / event / shopping areas",                "value": "VW2", "order_index": 3,  "regulation_reference": "Tab. 5"},
        {"label_de": "Verkehrsflächen, mäßiger Kfz-Verkehr (DTV 300–15.000)",         "label_en": "Traffic areas, moderate motor traffic (DTV 300–15,000)", "value": "V2",  "order_index": 4,  "regulation_reference": "Tab. 5"},
        {"label_de": "Verkehrsflächen, hoher Kfz-Verkehr (DTV > 15.000)",              "label_en": "Traffic areas, high motor traffic (DTV > 15,000)",       "value": "V3",  "order_index": 5,  "regulation_reference": "Tab. 5"},
        {"label_de": "Gleisanlagen, Schotteroberbau ≤ 100.000 Lt/d",                  "label_en": "Rail track, ballast superstructure ≤ 100,000 trains/d",  "value": "BG1", "order_index": 6,  "regulation_reference": "Tab. 5"},
        {"label_de": "Flughafen-Betriebsflächen (Start-/Landebahnen)",                  "label_en": "Airport operational areas (runways/taxiways)",           "value": "BF",  "order_index": 7,  "regulation_reference": "Tab. 5"},
        {"label_de": "Landwirtschaftliche Hofflächen",                                   "label_en": "Agricultural yard areas",                                "value": "BL",  "order_index": 8,  "regulation_reference": "Tab. 5"},
        {"label_de": "Gleisanlagen, Schotter > 100.000 / feste Fahrbahn ≤ 100.000 Lt/d", "label_en": "Rail track, ballast > 100,000 / fixed trackway ≤ 100,000 trains/d", "value": "BG2", "order_index": 9,  "regulation_reference": "Tab. 5"},
        {"label_de": "Gleisanlagen, feste Fahrbahn > 100.000 Lt/d",                    "label_en": "Rail track, fixed trackway > 100,000 trains/d",          "value": "BG3", "order_index": 10, "regulation_reference": "Tab. 5"},
        {"label_de": "Dachflächen, bes. Materialbelastung (20–70 %)",                  "label_en": "Roof surfaces, special material load (20–70 %)",         "value": "SD1", "order_index": 11, "regulation_reference": "Tab. 5"},
        {"label_de": "Dachflächen, bes. Materialbelastung (> 70 %)",                   "label_en": "Roof surfaces, special material load (> 70 %)",          "value": "SD2", "order_index": 12, "regulation_reference": "Tab. 5"},
        {"label_de": "Sonderflächen Verkehr, Misch-/Gewerbe-/Industriegebiete, bes. Beeinträchtigung, z. B. Lagerflächen (SV)",      "label_en": "Special traffic areas, mixed/commercial/industrial zones, particular impairment, e.g. storage yards (SV)","value": "SV",  "order_index": 13, "regulation_reference": "Tab. 5"},
        {"label_de": "Sonderflächen Verkehr, Misch-/Gewerbe-/Industriegebiete, bes. Beeinträchtigung, z. B. Lagerflächen (SVW)",                        "label_en": "Special traffic areas, mixed/commercial/industrial zones, particular impairment, e.g. storage yards (SVW)",           "value": "SVW", "order_index": 14, "regulation_reference": "Tab. 5"},
        {"label_de": "Sonderflächen Flughafen (Wäsche/Betankung/Enteisung)",           "label_en": "Special airport areas (washing/fuelling/de-icing)",      "value": "SF",  "order_index": 15, "regulation_reference": "Tab. 5"},
        {"label_de": "Sonderflächen Landwirtschaft (Tierhaltung/Reinigung)",            "label_en": "Special agricultural areas (livestock/cleaning)",        "value": "SL",  "order_index": 16, "regulation_reference": "Tab. 5"},
        {"label_de": "Sonderflächen Gleis (Rangier-/Bremsstrecken, Herbizid)",         "label_en": "Special rail areas (shunting/braking sections, herbicide)","value": "SG", "order_index": 17, "regulation_reference": "Tab. 5"},
        {"label_de": "Sonderflächen Abfall-/Abwasseranlagen",                           "label_en": "Special waste/wastewater facility areas",                "value": "SA",  "order_index": 18, "regulation_reference": "Tab. 5"}
      ]'::jsonb,
      'imported_unverified'
    );
  END IF;

  -- ---------------------------------------------------------------------------
  -- (2) UPDATE A138-07 field `A_C`: append 'A138-12' to consumer_worksheets.
  --     Guard: only if 'A138-12' not already in the array.
  -- ---------------------------------------------------------------------------
  UPDATE fields
    SET consumer_worksheets = array_append(consumer_worksheets, 'A138-12')
    WHERE worksheet_template_id = ws07
      AND symbol = 'A_C'
      AND (consumer_worksheets IS NULL OR NOT ('A138-12' = ANY(consumer_worksheets)));

  -- ---------------------------------------------------------------------------
  -- (3) ALTER A138-12 field `ac_as_ratio_check`: boolean → text.
  --     Also clear the stale value_boolean param row (§10e shadow).
  -- ---------------------------------------------------------------------------
  UPDATE fields
    SET data_type = 'text'
    WHERE worksheet_template_id = ws12 AND symbol = 'ac_as_ratio_check';

  -- Null value_boolean on ALL param rows of this field (every boolean is stale after
  -- the boolean→text retype; ~1 such row today). Scoped to this field's rows only.
  UPDATE project_parameters
    SET value_boolean = null
    WHERE field_id = (
      SELECT f.id FROM fields f
      WHERE f.worksheet_template_id = ws12 AND f.symbol = 'ac_as_ratio_check'
      LIMIT 1
    );

  -- ---------------------------------------------------------------------------
  -- (4) INSERT field `ac_as_ratio_check_reason` on A138-12.
  --     Guard: only insert if not already present (idempotent).
  -- ---------------------------------------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM fields
    WHERE worksheet_template_id = ws12 AND symbol = 'ac_as_ratio_check_reason'
  ) THEN
    SELECT f.id INTO fld_ac_ratio_check FROM fields f
      WHERE f.worksheet_template_id = ws12 AND f.symbol = 'ac_as_ratio_check'
      LIMIT 1;

    SELECT COALESCE(
      (SELECT order_index FROM fields
        WHERE worksheet_template_id = ws12 AND symbol = 'ac_as_ratio_check'
        LIMIT 1),
      (SELECT MAX(order_index) FROM fields WHERE worksheet_template_id = ws12),
      0
    ) + 1 INTO max_order12;

    INSERT INTO fields (
      worksheet_template_id, section_id, symbol, label_de,
      data_type, is_required, active, order_index,
      consumer_worksheets, verification_status
    ) VALUES (
      ws12, sec12, 'ac_as_ratio_check_reason', 'Prüfung — Begründung',
      'text', false, true, max_order12,
      null,
      'imported_unverified'
    );
  END IF;

END $$;
