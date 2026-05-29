-- =====================================================================
-- DWA-A 138-1, A138-10, Gl. 2 — extend data model to per-sub-area rows.
-- Additive only: no DROP, no ALTER on existing columns, no destructive
-- migration. Existing totals + C_m fields remain; they're marked
-- inferred_from_worksheet so the badge in the UI reflects their new
-- derived/optional role.
-- =====================================================================

-- 1. Add the sub-area carrier field. Stored as data_type='json' (allowed
--    by existing CHECK constraint). The wizard's existing DynamicField
--    renderer ignores json (no branch), so a custom SubAreasEditor
--    handles the UI; the value flows through the normal
--    project_parameters.value_json save path.
--
--    Payload shape (validated client-side):
--      { rows: [
--          { id: <uuid>, label: <text>, kind: 'paved'|'unpaved',
--            area_m2: <number>, c: <number> },
--          ... ]
--      }

INSERT INTO fields (
  worksheet_template_id,
  symbol, label_de, label_en, unit, data_type, is_required,
  clause_reference, description,
  order_index, verification_status, audit_status, source_file,
  source_anchor, source_quote, audit_notes, audited_at, audited_by,
  active
)
SELECT
  wt.id,
  'sub_areas_A138_10',
  'Teilflächen (per Sub-Areal)',
  'Sub-areas (per row)',
  NULL,                                         -- unit not applicable
  'json',
  FALSE,                                        -- optional; engineer can keep using totals fallback
  '§5.3.3.5 Gl. 2',
  'Pro Sub-Areal: { area_m2, c, kind: ''paved''|''unpaved'', label? }. Engine berechnet A_C = Σ(area·c) direkt über die Zeilen.',
  35,                                           -- between A_VA (0) and A_E_b_a_total (40)
  'derived_from_structural_mapping',
  'match',
  'DWA-A_138-1_WD (5).md',
  '§5.3.3.5 Gl. 2',
  'A_C = Σ(A_E,b,a,i · C_i) + Σ(A_E,nb,a,i · C_i)',
  'Pile-3 2026-05-29: New carrier field for per-sub-area data (iteration 2 of formula engine). Replaces the mean-C_m rewrite path; engine now sums Σ(area·c) directly.',
  NOW(),
  'claude-code-2026-05-29',
  TRUE
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-10'
  AND NOT EXISTS (
    SELECT 1 FROM fields ff
    WHERE ff.worksheet_template_id = wt.id AND ff.symbol = 'sub_areas_A138_10'
  );

-- 2. Mark the three totals/mean fields as inferred_from_worksheet so the
--    UI badge reflects that they are now derivable from sub-areas. We do
--    NOT change is_required — engineers without sub-area data can still
--    type totals, but the engine returns manual_required for Gl. 2 unless
--    the sub-area carrier is populated.

UPDATE fields f
SET verification_status = 'inferred_from_worksheet',
    audit_notes = COALESCE(audit_notes, '') || ' | Pile-3 2026-05-29: role downgraded from primary input to derived/optional after sub-area carrier introduced.',
    audited_at = NOW()
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id
WHERE f.worksheet_template_id = wt.id
  AND s.code = 'DWA-A-138-1' AND wt.code = 'A138-10'
  AND f.symbol IN ('A_E_b_a_total', 'A_E_nb_a_total', 'C_m')
  AND f.verification_status <> 'inferred_from_worksheet';

-- 3. Smoke-check.
SELECT f.symbol, f.data_type, f.verification_status, f.is_required, f.order_index
FROM fields f
JOIN worksheet_templates wt ON wt.id = f.worksheet_template_id
JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-10'
ORDER BY f.order_index;
