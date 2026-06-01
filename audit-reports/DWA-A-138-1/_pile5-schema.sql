-- =====================================================================
-- Pile-5: Flood-sub-area carrier for Gl. 10 (V_Rück flood check, A138-26)
-- ADDITIVE: no DROP, no ALTER on existing columns, IF NOT EXISTS guarded.
-- =====================================================================

-- Add the sub-area carrier field on A138-26. JSON payload per row:
--   { rows: [{
--       id: <uuid>, label: <text>, kind: 'paved'|'unpaved',
--       area_m2: <number>, c_S: <number>   -- C_S is the FLOOD-event runoff
--                                          --  coefficient per Tab. 9
--                                          --  (typically C_S = 1.0 paved
--                                          --   in worst case)
--     }, ... ]
--   }
-- Engine reads this in the Gl. 10 aggregator. Without it, Gl. 10 stays
-- in manual_required and the flood compliance gate cannot pass silently.

INSERT INTO fields (
  worksheet_template_id, symbol, label_de, label_en, unit, data_type, is_required,
  clause_reference, description, order_index, verification_status, audit_status,
  source_file, source_anchor, source_quote, audit_notes, audited_at, audited_by, active
)
SELECT
  wt.id,
  'sub_areas_A138_26',
  'Flut-Teilflächen (per Sub-Areal)',
  'Flood sub-areas (per row)',
  NULL,
  'json',
  FALSE,
  '§5.3.4 Gl. 10',
  'Pro Sub-Areal: { area_m2, c_S, kind: ''paved''|''unpaved'', label? }. Engine berechnet V_Rück = Σ(area·C_S) für die Flood-Bilanz.',
  35,
  'derived_from_structural_mapping',
  'match',
  'DWA-A_138-1_WD (5).md',
  '§5.3.4 Gl. 10',
  'V_Rück = ((r_D(T_n,Ü)·(Σ(A_E,b,a·C_S)+A_VA)/10000) − (Q_S+Q_Dr))·D·60/1000 − V_VA ≥ 0',
  'Pile-5 2026-06-01: Flood-event sub-area carrier for Gl. 10. C_S is the flood-event runoff coefficient per Tab. 9 (typically 1.0 paved, worst case). Required so the aggregator does not silently fall back to the design-event C from sub_areas_A138_10, which would understate the required flood retention.',
  NOW(),
  'claude-code-2026-06-01',
  TRUE
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-26'
  AND NOT EXISTS (
    SELECT 1 FROM fields ff
    WHERE ff.worksheet_template_id = wt.id AND ff.symbol = 'sub_areas_A138_26'
  )
RETURNING id, symbol, data_type;

-- Smoke check
SELECT symbol, data_type, verification_status, is_required, active
FROM fields f
JOIN worksheet_templates wt ON wt.id = f.worksheet_template_id
JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-26'
ORDER BY order_index;
