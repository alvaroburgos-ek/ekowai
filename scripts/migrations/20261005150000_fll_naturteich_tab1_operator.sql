-- FLL-Naturteich (2017, EN edition) · guideline re-read 2026-10-05 (owner: "read the guidelines, check it yourself"): run defect D12 of
-- 14_FLL-Run_Naturteich_2026-10-05.md was recorded as a PRINTED discrepancy (Tab. 1 "> 30 %" vs Tab. 4 "≥ 30 %"). The rendered pages
-- settle the Type-III bound — the ">" in the run log came from the text extraction, which drops the underline of the "≥" glyph:
--   Tab. 1 "Complete overview natural pool types" (printed p. 22, PDF p. 25), row "Dimension of the regeneration area compared to the
--     total area": Type I "≥ 50%" · Type II "≥ 50%" · Type III "≥ 30%" · Type IV / V "information on construction based on design refer
--     to Tab. 5 / Tab. 6".
--   Tab. 4 "Natural pool type III" (printed p. 25, PDF p. 28), column "Regeneration area in % of the total water area": "≥ 30%".
--   Tab. 2 "Natural pool type I" (printed p. 23, PDF p. 26) and Tab. 3 "Natural pool type II" (printed p. 24, PDF p. 27), same column:
--     "> 50%" — "therefrom at least half as submerged hydrobotanical system".
-- Type III: both tables print the inclusive bound; the encoding compared with the STRICT operator (REQ-07 `regeneration_area_share > 30`)
-- and the Tab.-1 row text read "> 30%" → a share of exactly 30 % was refused and shown with the wrong sign. SOURCE-SETTLED (class b).
-- Types I / II: the overview (Tab. 1, "≥ 50%") and the type tables (Tab. 2 / 3, "> 50%") disagree at exactly 50 %. NOT settled by the
-- page — the gate keeps the strict operator of the type-specific tables, and the Tab.-1 row text names both prints so the engineer
-- sees the discrepancy. Owner ruling: which table governs at exactly 50 % (note 21). No new gate, no severity change. Idempotent.
-- STAGED — not applied. Apply: node scripts/apply-migration.mjs scripts/migrations/20261005150000_fll_naturteich_tab1_operator.sql
-- Rollback: scripts/migrations/rollback-20261005150000_fll_naturteich_tab1_operator.sql
-- Read-back: scripts/verification/apply/readback-fll-naturteich-tab1-20261005.sql
BEGIN;

-- REQ-07 (FLLNT-03): the inclusive Type-III bound (Tab. 1 and Tab. 4); Types I / II unchanged (> 50, Tab. 2 / 3)
UPDATE compliance_requirements cr
   SET condition = replace(cr.condition, 'regeneration_area_share > 30', 'regeneration_area_share >= 30')
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE cr.worksheet_template_id = w.id AND s.code = 'FLL-Naturteich' AND w.code = 'FLLNT-03' AND cr.code = 'REQ-07'
   AND cr.condition LIKE '%regeneration_area_share > 30%';

-- Tab. 1 rows: the printed text of the share cell (Type III as printed; Types I / II with both prints named)
UPDATE regulation_table_rows r SET row_values = jsonb_set(r.row_values, '{share_printed}', '"> 50% (Tab. 2 / 3; Tab. 1 prints ≥ 50%)"'::jsonb)
  FROM regulation_tables t
 WHERE r.table_id = t.id AND t.standard_code = 'FLL-Naturteich' AND t.table_code = 'TABLE1'
   AND r.row_key IN ('type_I', 'type_II') AND r.row_values->>'share_printed' = '> 50%';

UPDATE regulation_table_rows r SET row_values = jsonb_set(r.row_values, '{share_printed}', '"≥ 30%"'::jsonb)
  FROM regulation_tables t
 WHERE r.table_id = t.id AND t.standard_code = 'FLL-Naturteich' AND t.table_code = 'TABLE1'
   AND r.row_key = 'type_III' AND r.row_values->>'share_printed' = '> 30%';

COMMIT;
