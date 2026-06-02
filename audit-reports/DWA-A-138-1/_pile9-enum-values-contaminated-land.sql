-- =====================================================================
-- Pile-9: populate fields.enum_values for contaminated_land_status (A138-02).
--
-- ROOT CAUSE: the Pass3c importer flattened the field's enum binding
--   into the `validation_rules.raw` hint ("see Enum_Values: contamination_status")
--   but never copied the three contamination_status enum entries from the
--   source JSON into the field's `enum_values` jsonb column. The form
--   reads `field.enumValues ?? []` (dynamic-field.tsx:202), so an empty
--   array reaches SegmentedControl and no buttons render — the field is
--   non-functional even though the field's `description` text reads
--   "None / Nearby / Present." (which is what was visible in the preview).
--
-- FIX: UPDATE the row's enum_values to the verbatim three options from
--   the source JSON (`Supabase data/file pipeline v2/_json_exports/DWA-A-138-1.json`
--   lines 10163–10190, enum_name "contamination_status"). Idempotent: only
--   writes when currently NULL so re-applying is a no-op once populated.
--
-- SCOPE: this PR fixes ONLY contaminated_land_status. 18 other enum
--   fields on DWA-A-138-1 are similarly broken (also NULL enum_values);
--   logged separately so the engineer can scope a follow-up sweep.
-- =====================================================================

UPDATE fields f
SET enum_values = jsonb_build_array(
  jsonb_build_object(
    'value', 'none',
    'label_de', 'Keine',
    'label_en', 'None',
    'order_index', 1,
    'regulation_reference', '§5.1.2, BBodSchG'
  ),
  jsonb_build_object(
    'value', 'nearby',
    'label_de', 'In der Nähe',
    'label_en', 'Nearby',
    'order_index', 2,
    'regulation_reference', '§5.1.2'
  ),
  jsonb_build_object(
    'value', 'present',
    'label_de', 'Vorhanden',
    'label_en', 'Present',
    'order_index', 3,
    'regulation_reference', '§5.1.2'
  )
),
audit_notes = COALESCE(audit_notes, '') || ' | Pile-9 2026-06-02: enum_values populated from source JSON (Pass3c importer left it NULL). Three options: none / nearby / present.',
audited_at = NOW(),
audited_by = 'claude-code-2026-06-02'
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id
WHERE f.worksheet_template_id = wt.id
  AND s.code = 'DWA-A-138-1'
  AND wt.code = 'A138-02'
  AND f.symbol = 'contaminated_land_status'
  AND f.enum_values IS NULL;

-- Smoke check
SELECT f.symbol, jsonb_array_length(f.enum_values) AS option_count,
       f.enum_values->0->>'value' AS first_value,
       f.enum_values->2->>'value' AS last_value
FROM fields f
JOIN worksheet_templates wt ON wt.id = f.worksheet_template_id
JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND f.symbol = 'contaminated_land_status';
