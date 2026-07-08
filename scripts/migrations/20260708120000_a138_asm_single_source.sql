-- scripts/migrations/20260708120000_a138_asm_single_source.sql
-- DWA-A 138-1 B2 — A_S,m per-facility single-source. WRITTEN-NOT-APPLIED.
-- Apply via Management-API POST after Alvaro's review.
-- Rollback: scripts/rollback-20260708120000-a138_asm_single_source.sql
DO $$
DECLARE
  ws12 uuid; ws22 uuid; sec12 uuid; max_order12 int;
  becken_field uuid; becken_param_count int;
  asm_field uuid;
BEGIN
  SELECT wt.id INTO ws12 FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id
    WHERE s.code='DWA-A-138-1' AND wt.code='A138-12';
  SELECT wt.id INTO ws22 FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id
    WHERE s.code='DWA-A-138-1' AND wt.code='A138-22';
  IF ws12 IS NULL OR ws22 IS NULL THEN
    RAISE EXCEPTION 'a138_asm: worksheet not found (ws12=% ws22=%)', ws12, ws22;
  END IF;
  SELECT section_id INTO sec12 FROM fields WHERE worksheet_template_id=ws12 AND section_id IS NOT NULL ORDER BY order_index LIMIT 1;
  IF sec12 IS NULL THEN RAISE EXCEPTION 'a138_asm: no section on A138-12'; END IF;

  -- (1) a_s_m_determination_method (enum, default direct)
  IF NOT EXISTS (SELECT 1 FROM fields WHERE worksheet_template_id=ws12 AND symbol='a_s_m_determination_method') THEN
    SELECT COALESCE(MAX(order_index),0)+1 INTO max_order12 FROM fields WHERE worksheet_template_id=ws12;
    INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, is_required, active, order_index, clause_reference, consumer_worksheets, enum_values, default_value, verification_status)
    VALUES (ws12, sec12, 'a_s_m_determination_method', 'A_S,m — Bestimmungsmethode', 'enum', true, true, max_order12,
      '§5.3.3.6 / §6', NULL,
      '[{"value":"direct","label_de":"Direkt (A_S,min/A_S,max, Gl. 7)","label_en":"Direct (Gl.7)","order_index":0,"regulation_reference":"§5.3.3.6"},
        {"value":"geometry","label_de":"Geometrie (Mulde Gl. 16 / Rigole Gl. 17)","label_en":"Geometry","order_index":1,"regulation_reference":"§6.3.2/§6.4.2"},
        {"value":"soil_estimate","label_de":"Bodenart-Abschätzung (Tab. 13)","label_en":"Soil estimate (Tab.13)","order_index":2,"regulation_reference":"Tab. 13"},
        {"value":"manual","label_de":"Herstellerangabe / manuell","label_en":"Manual / datasheet","order_index":3,"regulation_reference":"§6.4.1"}]'::jsonb,
      '"direct"'::jsonb, 'imported_unverified');
  END IF;

  -- (2) a_s_m_provenance (text)
  IF NOT EXISTS (SELECT 1 FROM fields WHERE worksheet_template_id=ws12 AND symbol='a_s_m_provenance') THEN
    SELECT COALESCE(MAX(order_index),0)+1 INTO max_order12 FROM fields WHERE worksheet_template_id=ws12;
    INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, is_required, active, order_index, clause_reference, consumer_worksheets, verification_status)
    VALUES (ws12, sec12, 'a_s_m_provenance', 'A_S,m — Herkunft (bei manueller Angabe)', 'text', false, true, max_order12, '§6.4.1', NULL, 'imported_unverified');
  END IF;

  -- (2b) a_s_m_needs_reconfirmation (boolean, Task 8 — type-change manual flag)
  -- Set to true by the asm producer branch when facility_type_selected changes and
  -- method='manual', so the engineer must re-confirm the datasheet value still applies.
  -- Cleared to false on the next successful A138-12 owner save (materializeAsm produces
  -- a determined result), signalling re-confirmation complete.
  IF NOT EXISTS (SELECT 1 FROM fields WHERE worksheet_template_id=ws12 AND symbol='a_s_m_needs_reconfirmation') THEN
    SELECT COALESCE(MAX(order_index),0)+1 INTO max_order12 FROM fields WHERE worksheet_template_id=ws12;
    INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, is_required, active, order_index, clause_reference, consumer_worksheets, default_value, verification_status)
    VALUES (ws12, sec12, 'a_s_m_needs_reconfirmation', 'A_S,m — Bestätigung erforderlich (Anlagentypwechsel)', 'boolean', false, true, max_order12, '§6.4.1', NULL, 'false'::jsonb, 'imported_unverified');
  END IF;

  -- (2d) soil_bodenart_tab13 (enum, two verbatim Tab.13 rows, A-1)
  IF NOT EXISTS (SELECT 1 FROM fields WHERE worksheet_template_id=ws12 AND symbol='soil_bodenart_tab13') THEN
    SELECT COALESCE(MAX(order_index),0)+1 INTO max_order12 FROM fields WHERE worksheet_template_id=ws12;
    INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, is_required, active, order_index, clause_reference, consumer_worksheets, enum_values, verification_status)
    VALUES (ws12, sec12, 'soil_bodenart_tab13', 'Bodenart (Tab. 13 — nur bei Bodenart-Abschätzung)', 'enum', false, true, max_order12, 'Tab. 13', NULL,
      '[{"value":"mittel_feinsand","label_de":"Mittel-/Feinsand","label_en":"Medium/fine sand","order_index":0,"regulation_reference":"Tab. 13"},
        {"value":"schluffig","label_de":"schluffiger Sand / sandiger Schluff / Schluff","label_en":"Silty sand / sandy silt / silt","order_index":1,"regulation_reference":"Tab. 13"}]'::jsonb,
      'imported_unverified');
  END IF;

  -- (3) Backfill 'direct' for every project holding A138-12 params (baseline safety).
  SELECT id INTO asm_field FROM fields WHERE worksheet_template_id=ws12 AND symbol='a_s_m_determination_method' LIMIT 1;
  IF asm_field IS NULL THEN
    RAISE EXCEPTION 'a138_asm: a_s_m_determination_method field could not be resolved — migration aborted';
  END IF;
  INSERT INTO project_parameters (project_id, field_id, value_enum, source_type, entered_by, entered_at)
  SELECT DISTINCT pp.project_id, asm_field, 'direct', 'entered', 'migration:20260708120000', NOW()
  FROM project_parameters pp
  JOIN fields f ON f.id = pp.field_id
  WHERE f.worksheet_template_id = ws12
    AND NOT EXISTS (SELECT 1 FROM project_parameters x WHERE x.project_id=pp.project_id AND x.field_id=asm_field);

  -- (4) Retire orphan A_S_m_Becken (D-4). Surface residue values before deactivating.
  SELECT id INTO becken_field FROM fields WHERE worksheet_template_id=ws22 AND symbol='A_S_m_Becken' LIMIT 1;
  IF becken_field IS NOT NULL THEN
    SELECT COUNT(*) INTO becken_param_count FROM project_parameters WHERE field_id=becken_field AND (value_number IS NOT NULL OR value_text IS NOT NULL OR value_enum IS NOT NULL OR value_json IS NOT NULL);
    IF becken_param_count > 0 THEN
      RAISE NOTICE 'a138_asm RESIDUE: % stored A_S_m_Becken value(s) — projects: %',
        becken_param_count,
        (SELECT string_agg(DISTINCT project_id::text, ', ') FROM project_parameters WHERE field_id=becken_field AND (value_number IS NOT NULL OR value_text IS NOT NULL OR value_enum IS NOT NULL OR value_json IS NOT NULL));
    END IF;
    UPDATE fields SET active=false WHERE id=becken_field; -- param rows kept for audit/re-entry
  END IF;

  -- (5) Declare A138-13 + A138-22 as A_S_m consumers (append if missing).
  UPDATE fields SET consumer_worksheets = (
    SELECT array_agg(DISTINCT c) FROM unnest(coalesce(consumer_worksheets, ARRAY[]::text[]) || ARRAY['A138-13','A138-22']) AS c
  ) WHERE worksheet_template_id=ws12 AND symbol='A_S_m';
END $$;
