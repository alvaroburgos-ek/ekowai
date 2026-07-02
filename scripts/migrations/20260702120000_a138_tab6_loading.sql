-- scripts/migrations/20260702120000_a138_tab6_loading.sql
-- DWA-A 138-1 Tab.6 loading check — DB schema for B1 Task 3.
-- WRITTEN-NOT-APPLIED — apply via Management-API POST after Alvaro's review.
-- Rollback: scripts/rollback-20260702120000-a138_tab6_loading.sql
--
-- Four idempotent operations:
--   (1) INSERT field `flaechengruppe` on A138-06 (data_type='enum', 18 Tab.5 codes)
--       so engineers can set the Flächengruppe that governs the Tab.6 tier.
--       consumer_worksheets='{A138-12}' declares A138-12 as the downstream consumer.
--   (2) UPDATE A138-07 field `A_C`: append 'A138-12' to consumer_worksheets so the
--       drainage-contributing area flows to the loading check (A138-12 reads it).
--   (3) ALTER A138-12 field `ac_as_ratio_check`: change data_type 'boolean' → 'text'
--       for the 4-state status; clear the stale value_boolean param row from the §10e
--       shadow (removes leftover boolean value after type change).
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
  -- (1) INSERT field `flaechengruppe` on A138-06 (enum, Tab.5, 18 codes)
  --     Guard: only insert if not already present (idempotent).
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
        {"label_de": "Dachflächen",                             "label_en": "Roof surfaces",                          "value": "D",   "order_index": 0,  "regulation_reference": "Tab. 5"},
        {"label_de": "Verkehrsflächen (gering belastet)",        "label_en": "Traffic areas (low load)",               "value": "VW1", "order_index": 1,  "regulation_reference": "Tab. 5"},
        {"label_de": "Verkehrsflächen (schwach belastet)",       "label_en": "Traffic areas (slightly loaded)",        "value": "V1",  "order_index": 2,  "regulation_reference": "Tab. 5"},
        {"label_de": "Verkehrsflächen (mäßig belastet)",        "label_en": "Traffic areas (moderately loaded)",      "value": "VW2", "order_index": 3,  "regulation_reference": "Tab. 5"},
        {"label_de": "Verkehrsflächen (mäßig-stark belastet)",  "label_en": "Traffic areas (medium-high load)",       "value": "V2",  "order_index": 4,  "regulation_reference": "Tab. 5"},
        {"label_de": "Verkehrsflächen (stark belastet)",         "label_en": "Traffic areas (heavily loaded)",         "value": "V3",  "order_index": 5,  "regulation_reference": "Tab. 5"},
        {"label_de": "Begrünte Flächen (gering belastet)",      "label_en": "Vegetated areas (low load)",             "value": "BG1", "order_index": 6,  "regulation_reference": "Tab. 5"},
        {"label_de": "Begrünte Flächen (Friedhöfe etc.)",       "label_en": "Vegetated areas (cemeteries etc.)",      "value": "BF",  "order_index": 7,  "regulation_reference": "Tab. 5"},
        {"label_de": "Landwirtschaftliche Hofflächen",           "label_en": "Agricultural yard areas",                "value": "BL",  "order_index": 8,  "regulation_reference": "Tab. 5"},
        {"label_de": "Begrünte Flächen (stärker belastet)",     "label_en": "Vegetated areas (higher load)",          "value": "BG2", "order_index": 9,  "regulation_reference": "Tab. 5"},
        {"label_de": "Dachflächen (bes. Belastung, einfach)",   "label_en": "Roof surfaces (special load, simple)",   "value": "SD1", "order_index": 10, "regulation_reference": "Tab. 5"},
        {"label_de": "Dachflächen (bes. Belastung, komplex)",   "label_en": "Roof surfaces (special load, complex)",  "value": "SD2", "order_index": 11, "regulation_reference": "Tab. 5"},
        {"label_de": "Sonderflächen Verkehr",                    "label_en": "Special traffic areas",                  "value": "SV",  "order_index": 12, "regulation_reference": "Tab. 5"},
        {"label_de": "Sonderflächen Verkehr (Waschen)",         "label_en": "Special traffic areas (washing)",        "value": "SVW", "order_index": 13, "regulation_reference": "Tab. 5"},
        {"label_de": "Sonderflächen Feuerwehr",                  "label_en": "Special fire-service areas",             "value": "SF",  "order_index": 14, "regulation_reference": "Tab. 5"},
        {"label_de": "Sonderflächen Lagerung",                   "label_en": "Special storage areas",                  "value": "SL",  "order_index": 15, "regulation_reference": "Tab. 5"},
        {"label_de": "Sonderflächen Gewerbe",                    "label_en": "Special commercial areas",               "value": "SG",  "order_index": 16, "regulation_reference": "Tab. 5"},
        {"label_de": "Sonderflächen Altlasten",                  "label_en": "Special contaminated-site areas",        "value": "SA",  "order_index": 17, "regulation_reference": "Tab. 5"}
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

  -- Clear stale boolean value (if any) so it doesn't linger as a ghost after type change.
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
