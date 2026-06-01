-- =====================================================================
-- Pile-6: Add Q_S field on A138-18 with unit m³/s (Gl. 18 Versickerungsleistung)
--
-- WHY: source DWA-A 138-1 §6.4.2 line 1778 reads verbatim:
--   "Die Versickerungsleistung Q_S (in m³/s) der Rigole ergibt sich
--    nach GL. (18) zu:  Q_S = [(b_R+h_R)·L_R + b_R·h_R] · k_i"
-- The standard genuinely uses m³/s here (unlike Gl. (4) on A138-12, which
-- has ·10³ to convert m³/s → l/s for flat-surface infiltration).  Therefore
-- the wizard field on A138-18 must be labelled m³/s — NOT l/s.
--
-- WHAT THIS DOES:
--   - INSERT a Q_S field on A138-18 with data_type 'number', unit 'm³/s'.
--   - is_required FALSE — engineer doesn't enter Q_S; the engine computes
--     it from b_R/h_R/L_R/k_i via Gl. (18).
--   - verification_status 'derived_from_structural_mapping' (audit's "I
--     added this from the source quote, please verify" state).
--   - Guarded with NOT EXISTS so re-imports are idempotent.
--
-- WHAT THIS DOES NOT DO:
--   - No change to the Gl. (18) formula.
--   - No change to existing fields' units.
--   - No change to Gl. (4)'s Q_S (l/s on A138-12), which remains correct.
--
-- DOWNSTREAM IMPLICATIONS (intentional — engine handles them):
--   - Two producers will now exist for symbol Q_S (Gl. 4 in l/s on A138-12,
--     Gl. 18 in m³/s on A138-18). The engine's mergeInheritedFields
--     ambiguity guard will refuse silent inheritance and surface the
--     mehrdeutige-Quelle error on any consumer that has both in scope.
--   - The unit guard on any equation profile that lists Q_S in
--     expectedUnits will fire on a mismatch (see formula-Gl18-Q_S.test.ts).
-- =====================================================================

INSERT INTO fields (
  worksheet_template_id, symbol, label_de, label_en, unit, data_type, is_required,
  clause_reference, description, order_index, verification_status, audit_status,
  source_file, source_anchor, source_quote, audit_notes, audited_at, audited_by, active
)
SELECT
  wt.id,
  'Q_S',
  'Versickerungsleistung Q_S Rigole',
  'Infiltration rate Q_S (trench)',
  'm³/s',
  'number',
  FALSE,
  '§6.4.2 Gl. 18',
  'Berechnet vom Engine via Gl. (18): Q_S = [(b_R+h_R)·L_R + b_R·h_R] · k_i. Einheit m³/s (nicht l/s, anders als Gl. (4))',
  20,  -- between L_VS (auto-grouped at 0) and r_D_n_used_R (30)
  'derived_from_structural_mapping',
  'match',
  'DWA-A_138-1_WD (5).md',
  '§6.4.2 L1778',
  'Die Versickerungsleistung Q_S (in m³/s) der Rigole ergibt sich nach GL. (18) zu: Q_S = [(b_R+h_R)·L_R + b_R·h_R] · k_i',
  'Pile-6 2026-05-29: Field added so the engine has a write-back target for Gl. (18). Unit m³/s per source line 1778 (verbatim). Resolves _OPEN-ITEMS.md item 1: standard genuinely omits the ×10³ factor present in Gl. (4); Gl. (18) Q_S is dimensionally m³/s. The cross-worksheet inheritance ambiguity guard will refuse silent re-use of Gl. (4)''s l/s Q_S in this field.',
  NOW(),
  'claude-code-2026-05-29',
  TRUE
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-18'
  AND NOT EXISTS (
    SELECT 1 FROM fields ff
    WHERE ff.worksheet_template_id = wt.id AND ff.symbol = 'Q_S'
  )
RETURNING id, symbol, unit, data_type;

-- Smoke check
SELECT symbol, label_de, unit, data_type, is_required, verification_status
FROM fields f
JOIN worksheet_templates wt ON wt.id = f.worksheet_template_id
JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-18' AND symbol = 'Q_S';
