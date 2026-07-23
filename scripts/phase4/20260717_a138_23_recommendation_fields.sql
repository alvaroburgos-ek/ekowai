-- scripts/phase4/20260717_a138_23_recommendation_fields.sql
-- WRITTEN-NOT-APPLIED — apply only at the Phase-4 import gate via Management-API POST
-- or importer, per B2 discipline. DO NOT run directly against prod without the
-- gated review sign-off.
--
-- Rollback: scripts/phase4/rollback-20260717_a138_23_recommendation_fields.sql
-- Verify:   scripts/phase4/verify-20260717_a138_23_recommendation_fields.sql
--
-- What this does:
--   Inserts TWO new engine-written, read-only fields on worksheet A138-23
--   (DWA-A-138-1), as Phase-4 recommendation companions to the existing
--   `phase_4_gate_result` field:
--
--   1. recommended_phase_4_gate  (enum, mirrors phase_4_gate_result enum_values
--                                  exactly: PASS / CONDITIONAL / FAIL)
--   2. phase_4_recommendation_reasons  (text, free-form explanation text)
--
--   Both fields:
--     - verification_status = 'imported_unverified'
--     - active = true
--     - NOT required (is_required = false)
--     - consumer_worksheets = NULL
--     - section_id = section F "Results Summary" (same as phase_4_gate_result)
--     - order_index AFTER the existing 7 fields (max is 70 → 80 and 90)
--
-- ============================================================================
-- B2 A4 MIGRATION REVIEW CHECKLIST
-- ============================================================================
--   [x] INSERT literals type-checked against information_schema:
--         - worksheet_template_id / section_id: uuid (resolved via subquery,
--           never hardcoded literals — no uuid::cast risk)
--         - enum_values: JSONB literal cast via ::jsonb (type-safe)
--         - is_required: boolean literal false
--         - active: boolean literal true
--         - order_index: integer literals 80 / 90
--         - data_type: text literals 'enum' / 'text'
--         - verification_status: text literal 'imported_unverified'
--         - consumer_worksheets: NULL (text[])
--         - unit: NULL
--   [x] FK delete order in rollback: project_parameters (FK field_id → fields.id,
--         ON DELETE NO ACTION) deleted BEFORE fields rows — per B2 defect #13 / A4.
--   [x] verification_status NOT overwritten on re-run: guard is
--         ON CONFLICT (worksheet_template_id, symbol) DO NOTHING
--         — conflict target mirrors _pass3c-db.ts, which also never overwrites
--         verification_status on a re-import unless content changed.
--   [x] Apply is the first real type-check (no DATABASE_URL for dry-parse here);
--         controller will type-check literals at the gate (B2 A4).
-- ============================================================================
DO $$
DECLARE
  ws23    uuid;
  sec_f   uuid;
  max_oi  int;
BEGIN
  -- -------------------------------------------------------------------------
  -- Resolve worksheet_template_id for A138-23 / DWA-A-138-1
  -- -------------------------------------------------------------------------
  SELECT wt.id INTO ws23
    FROM worksheet_templates wt
    JOIN standards s ON s.id = wt.standard_id
    WHERE wt.code = 'A138-23'
      AND s.code  = 'DWA-A-138-1';

  IF ws23 IS NULL THEN
    RAISE EXCEPTION '20260717_a138_23_recommendation_fields: worksheet A138-23 not found for DWA-A-138-1';
  END IF;

  -- -------------------------------------------------------------------------
  -- Resolve section_id: the same section as `phase_4_gate_result` (section F,
  -- "Results Summary") — the canonical summary/gate section on A138-23.
  -- -------------------------------------------------------------------------
  SELECT f.section_id INTO sec_f
    FROM fields f
    WHERE f.worksheet_template_id = ws23
      AND f.symbol = 'phase_4_gate_result';

  IF sec_f IS NULL THEN
    RAISE EXCEPTION '20260717_a138_23_recommendation_fields: could not resolve section_id from phase_4_gate_result on A138-23 — field missing or section_id is null';
  END IF;

  -- -------------------------------------------------------------------------
  -- Determine order_index base: place new fields AFTER the last existing one.
  -- Current max is 70; we use COALESCE for safety on empty worksheets.
  -- -------------------------------------------------------------------------
  SELECT COALESCE(MAX(f.order_index), 70) INTO max_oi
    FROM fields f
    WHERE f.worksheet_template_id = ws23;

  -- -------------------------------------------------------------------------
  -- (1) INSERT recommended_phase_4_gate
  --     Conflict target: (worksheet_template_id, symbol) — mirrors _pass3c-db.ts.
  --     DO NOTHING on conflict → idempotent, never overwrites verification_status.
  --
  --     enum_values: verbatim copy of phase_4_gate_result.enum_values from prod
  --     (SELECT confirmed values on 2026-07-17):
  --       PASS / CONDITIONAL / FAIL
  --     with German labels BESTANDEN / BEDINGT / NICHT BESTANDEN and
  --     regulation_reference "phase gates".
  -- -------------------------------------------------------------------------
  INSERT INTO fields (
    worksheet_template_id,
    section_id,
    symbol,
    label_de,
    label_en,
    data_type,
    enum_values,
    unit,
    is_required,
    active,
    order_index,
    consumer_worksheets,
    clause_reference,
    description,
    verification_status
  ) VALUES (
    ws23,
    sec_f,
    'recommended_phase_4_gate',
    'Empfohlenes Phase-4-Tor (Vorschlag)',
    'Recommended Phase-4 gate',
    'enum',
    '[
      {"value": "PASS",        "label_de": "BESTANDEN",       "label_en": "PASS",        "order_index": 1, "regulation_reference": "phase gates"},
      {"value": "CONDITIONAL", "label_de": "BEDINGT",         "label_en": "CONDITIONAL", "order_index": 2, "regulation_reference": "phase gates"},
      {"value": "FAIL",        "label_de": "NICHT BESTANDEN", "label_en": "FAIL",        "order_index": 3, "regulation_reference": "phase gates"}
    ]'::jsonb,
    NULL,
    false,
    true,
    max_oi + 10,
    NULL,
    NULL,
    'Engine-written read-only recommendation for the Phase-4 gate. Do not edit manually.',
    'imported_unverified'
  )
  ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;

  -- -------------------------------------------------------------------------
  -- (2) INSERT phase_4_recommendation_reasons
  --     Same section, same guard.
  -- -------------------------------------------------------------------------
  INSERT INTO fields (
    worksheet_template_id,
    section_id,
    symbol,
    label_de,
    label_en,
    data_type,
    enum_values,
    unit,
    is_required,
    active,
    order_index,
    consumer_worksheets,
    clause_reference,
    description,
    verification_status
  ) VALUES (
    ws23,
    sec_f,
    'phase_4_recommendation_reasons',
    'Begründung der Empfehlung',
    'Recommendation reasons',
    'text',
    NULL,
    NULL,
    false,
    true,
    max_oi + 20,
    NULL,
    NULL,
    'Engine-written free-form text explaining the recommended Phase-4 gate result.',
    'imported_unverified'
  )
  ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;

END $$;
