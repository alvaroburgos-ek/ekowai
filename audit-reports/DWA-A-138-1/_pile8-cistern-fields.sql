-- =====================================================================
-- Pile-8: Cistern crediting on V_VA (Gl. 8) per §6.1 L1596 — deferred
--   coverage item I from _coverage-sweep-2026-05-29.md (now in scope).
--
-- SOURCE QUOTE (verbatim, §6.1 L1596):
--   "Die Zwischenspeicherung des Niederschlagswassers in Zisternen und
--    Nutzung des Niederschlagswassers ist als zusätzliche Maßnahme zu
--    begrüßen. Speicherräume können für eine Rückhaltung des Nieder-
--    schlagswassers rechnerisch nur angesetzt werden, wenn sie ein
--    zwangsentleertes Teilvolumen aufweisen oder mithilfe von geeigneten
--    Simulationsmodellen … nachgewiesen wurden."
--
-- CONSEQUENCE: cistern volume V_Zisterne may reduce the required V_VA
--   only when forced emptying (Zwangsentleerung) is in place. Without
--   Zwangsentleerung the cistern volume MUST NOT be credited toward
--   V_VA — the engine would otherwise silently under-size storage.
--
-- WHAT THIS DOES (additive, NOT EXISTS guarded):
--   - INSERT field zisterne_zwangsentleerung (boolean) on A138-13.
--   - INSERT field V_Zisterne (m³) on A138-13.
--   The aggregator branch lives in src/lib/eval/aggregators.ts: when
--   zisterne_zwangsentleerung == true AND V_Zisterne is set, the engine
--   subtracts V_Zisterne from the computed max-V_VA (clamped at 0).
--
-- WHAT THIS DOES NOT DO:
--   - No DROP, no ALTER on existing columns.
--   - No formula changes — the Gl. 8 formula stays verbatim DB. Cistern
--     crediting is a post-compute step in the aggregator, not a formula
--     rewrite.
-- =====================================================================

INSERT INTO fields (
  worksheet_template_id, symbol, label_de, label_en, unit, data_type, is_required,
  clause_reference, description, order_index, verification_status, audit_status,
  source_file, source_anchor, source_quote, audit_notes, audited_at, audited_by, active
)
SELECT wt.id,
  'zisterne_zwangsentleerung',
  'Zisterne mit Zwangsentleerung',
  'Cistern with forced emptying',
  NULL, 'boolean', FALSE,
  '§6.1 L1596',
  'Hat das Zisternen-Teilvolumen eine Zwangsentleerung? §6.1 fordert dies als Voraussetzung dafür, dass das Zisternenvolumen rechnerisch auf V_VA angerechnet werden darf. Ohne Zwangsentleerung (oder ohne nachgewiesenes Simulationsmodell) wird V_Zisterne NICHT auf V_VA angerechnet.',
  50, 'derived_from_structural_mapping', 'match',
  'DWA-A_138-1_WD (5).md', '§6.1 L1596',
  'Speicherräume können für eine Rückhaltung des Niederschlagswassers rechnerisch nur angesetzt werden, wenn sie ein zwangsentleertes Teilvolumen aufweisen oder mithilfe von geeigneten Simulationsmodellen … nachgewiesen wurden.',
  'Pile-8 2026-06-02: Gates the V_Zisterne crediting branch in the Gl. 8 aggregator.',
  NOW(), 'claude-code-2026-06-02', TRUE
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-13'
  AND NOT EXISTS (
    SELECT 1 FROM fields ff WHERE ff.worksheet_template_id = wt.id AND ff.symbol = 'zisterne_zwangsentleerung'
  );

INSERT INTO fields (
  worksheet_template_id, symbol, label_de, label_en, unit, data_type, is_required,
  clause_reference, description, order_index, verification_status, audit_status,
  source_file, source_anchor, source_quote, audit_notes, audited_at, audited_by, active
)
SELECT wt.id,
  'V_Zisterne',
  'Zisternenvolumen V_Zisterne',
  'Cistern volume V_Zisterne',
  'm³', 'number', FALSE,
  '§6.1 L1596',
  'Geplantes oder vorhandenes Zisternen-Teilvolumen. Wird nur dann auf V_VA angerechnet, wenn zisterne_zwangsentleerung == true. Ohne Flag bzw. mit Flag=false bleibt das Volumen unberücksichtigt (V_VA wird nicht reduziert).',
  51, 'derived_from_structural_mapping', 'match',
  'DWA-A_138-1_WD (5).md', '§6.1 L1596',
  'Die Zwischenspeicherung des Niederschlagswassers in Zisternen … Speicherräume können für eine Rückhaltung des Niederschlagswassers rechnerisch nur angesetzt werden, wenn sie ein zwangsentleertes Teilvolumen aufweisen …',
  'Pile-8 2026-06-02: Volume that the Gl. 8 aggregator subtracts from max-V_VA when Zwangsentleerung is true. Clamped at ≥ 0.',
  NOW(), 'claude-code-2026-06-02', TRUE
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-13'
  AND NOT EXISTS (
    SELECT 1 FROM fields ff WHERE ff.worksheet_template_id = wt.id AND ff.symbol = 'V_Zisterne'
  );


-- Smoke check
SELECT symbol, data_type, unit, is_required, verification_status
FROM fields f
JOIN worksheet_templates wt ON wt.id = f.worksheet_template_id
JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-13'
  AND f.symbol IN ('V_Zisterne','zisterne_zwangsentleerung')
ORDER BY f.symbol;
