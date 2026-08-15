-- scripts/phase4/verify-20260717_a138_23_recommendation_fields.sql
-- Verification queries to run AFTER applying 20260717_a138_23_recommendation_fields.sql.
-- Expected: both rows are returned with correct data_type, enum_values, active, and
-- verification_status. If either query returns 0 rows, the forward migration did not apply.

-- ----------------------------------------------------------------
-- 1. Existence + core attributes check
-- ----------------------------------------------------------------
SELECT
  f.symbol,
  f.label_de,
  f.label_en,
  f.data_type,
  f.is_required,
  f.active,
  f.verification_status,
  f.unit,
  f.consumer_worksheets,
  f.order_index,
  f.section_id
FROM fields f
JOIN worksheet_templates wt ON wt.id = f.worksheet_template_id
JOIN standards s             ON s.id  = wt.standard_id
WHERE wt.code = 'A138-23'
  AND s.code  = 'DWA-A-138-1'
  AND f.symbol IN ('recommended_phase_4_gate', 'phase_4_recommendation_reasons')
ORDER BY f.order_index;
-- Expected: 2 rows
--   recommended_phase_4_gate        | data_type=enum  | is_required=false | active=true | verification_status=imported_unverified | unit=NULL | consumer_worksheets=NULL
--   phase_4_recommendation_reasons  | data_type=text  | is_required=false | active=true | verification_status=imported_unverified | unit=NULL | consumer_worksheets=NULL

-- ----------------------------------------------------------------
-- 2. enum_values check for recommended_phase_4_gate
--    Must mirror phase_4_gate_result: PASS / CONDITIONAL / FAIL
-- ----------------------------------------------------------------
SELECT
  f.symbol,
  f.enum_values
FROM fields f
JOIN worksheet_templates wt ON wt.id = f.worksheet_template_id
JOIN standards s             ON s.id  = wt.standard_id
WHERE wt.code = 'A138-23'
  AND s.code  = 'DWA-A-138-1'
  AND f.symbol = 'recommended_phase_4_gate';
-- Expected: enum_values JSONB array with 3 elements:
--   {"value":"PASS",        "label_de":"BESTANDEN",       "label_en":"PASS",        "order_index":1, "regulation_reference":"phase gates"}
--   {"value":"CONDITIONAL", "label_de":"BEDINGT",         "label_en":"CONDITIONAL", "order_index":2, "regulation_reference":"phase gates"}
--   {"value":"FAIL",        "label_de":"NICHT BESTANDEN", "label_en":"FAIL",        "order_index":3, "regulation_reference":"phase gates"}

-- ----------------------------------------------------------------
-- 3. Placement check: new fields must be AFTER existing 7 (max order_index 70)
-- ----------------------------------------------------------------
SELECT
  f.symbol,
  f.order_index
FROM fields f
JOIN worksheet_templates wt ON wt.id = f.worksheet_template_id
JOIN standards s             ON s.id  = wt.standard_id
WHERE wt.code = 'A138-23'
  AND s.code  = 'DWA-A-138-1'
ORDER BY f.order_index;
-- Expected: recommended_phase_4_gate at order_index=80,
--           phase_4_recommendation_reasons at order_index=90
--           (or max_existing+10 / max_existing+20 if max changed before apply)

-- ----------------------------------------------------------------
-- 4. Section alignment: both new fields must share section_id with phase_4_gate_result
-- ----------------------------------------------------------------
SELECT
  f.symbol,
  f.section_id,
  ws.code AS section_code,
  ws.title_de AS section_title
FROM fields f
JOIN worksheet_templates wt ON wt.id = f.worksheet_template_id
JOIN standards s             ON s.id  = wt.standard_id
LEFT JOIN worksheet_sections ws ON ws.id = f.section_id
WHERE wt.code = 'A138-23'
  AND s.code  = 'DWA-A-138-1'
  AND f.symbol IN (
    'phase_4_gate_result',
    'recommended_phase_4_gate',
    'phase_4_recommendation_reasons'
  )
ORDER BY f.order_index;
-- Expected: all 3 rows share the same section_id (section F, "Results Summary")
