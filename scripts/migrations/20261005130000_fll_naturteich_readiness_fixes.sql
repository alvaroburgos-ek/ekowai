-- FLL-Naturteich · readiness run 2026-10-05 (defects D1, D2, D3, D4, D6 of 14_FLL-Run_Naturteich_2026-10-05.md) — source-settled by the
-- printed tables and by the encoding's own structure:
--   D1  Tab. 11 "Structural requirements for substrate filters with a controlled slow flow" and Tab. 12 "… with a controlled quick flow"
--       (FLL 2017, p. 45/47): REQ-20 (Tab. 11) and REQ-21 (Tab. 12) fired regardless of the filter type, so a slow filter was refused by
--       Tab. 12 and a quick filter by Tab. 11. Fix: guard each gate with `filter_flow_type` (FLLNT-10, now inherited by FLLNT-09).
--   D2  REQ-10 (swimming-water limits) sits on FLLNT-03 while its nine inputs live on FLLNT-04 → FLLNT-03 approved with the inputs
--       empty. Fix: the gate moves to the sheet that owns its inputs.
--   D3  FLLNT-11-D3 `feed_share_of_volume_pct = filter_feed_volume_per_day_m3 · 100 / total_water_volume_m3` reads a FLLNT-06 field with
--       no consumer → never computed; REQ-35 (Tab. 4/5/6: > 25 % / > 80 %) unreachable. Fix: FLLNT-11 added as consumer.
--   D4  REQ-22 read the hand-typed boolean `filter_50x_rule_met` while EQ-01 computes the 50× rule display-only → the rule was never
--       enforced by calculation. Fix: the gate compares the computed quantities (Tab. 10 / §9.5: colonised filter surface ≥ 50 × pool
--       underwater surface), the typed boolean stays as documentation.
--   D6  The swimming-water limits on FLLNT-04 are lookup fills keyed by `natural_pool_type` (TABLE8_P), which FLLNT-04 did not inherit →
--       the fills never resolved. Fix: FLLNT-04 added as consumer of natural_pool_type.
-- SAFETY: no new gate and no severity change; two gate conditions narrowed to their printed applicability (D1) and one gate rewired to
-- the computed quantities (D4) — the owner's apply ratifies these as written. Idempotent.
-- STAGED — not applied. Apply: node scripts/apply-migration.mjs scripts/migrations/20261005130000_fll_naturteich_readiness_fixes.sql
-- Rollback: scripts/migrations/rollback-20261005130000_fll_naturteich_readiness_fixes.sql
BEGIN;

-- D6 + D1 consumers
UPDATE fields f SET consumer_worksheets = COALESCE(f.consumer_worksheets, ARRAY[]::text[]) || ARRAY['FLLNT-04']::text[]
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE f.worksheet_template_id = w.id AND s.code = 'FLL-Naturteich' AND w.code = 'FLLNT-03' AND f.symbol = 'natural_pool_type'
  AND NOT ('FLLNT-04' = ANY (COALESCE(f.consumer_worksheets, ARRAY[]::text[])));

UPDATE fields f SET consumer_worksheets = COALESCE(f.consumer_worksheets, ARRAY[]::text[]) || ARRAY['FLLNT-09']::text[]
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE f.worksheet_template_id = w.id AND s.code = 'FLL-Naturteich' AND w.code = 'FLLNT-10' AND f.symbol = 'filter_flow_type'
  AND NOT ('FLLNT-09' = ANY (COALESCE(f.consumer_worksheets, ARRAY[]::text[])));

-- D3 consumer
UPDATE fields f SET consumer_worksheets = COALESCE(f.consumer_worksheets, ARRAY[]::text[]) || ARRAY['FLLNT-11']::text[]
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE f.worksheet_template_id = w.id AND s.code = 'FLL-Naturteich' AND w.code = 'FLLNT-06' AND f.symbol = 'total_water_volume_m3'
  AND NOT ('FLLNT-11' = ANY (COALESCE(f.consumer_worksheets, ARRAY[]::text[])));

-- D1 guards (Tab. 11 = slow flow, Tab. 12 = quick flow)
UPDATE compliance_requirements cr SET condition = 'IF filter_flow_type == slow THEN (' || cr.condition || ')'
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE cr.worksheet_template_id = w.id AND s.code = 'FLL-Naturteich' AND w.code = 'FLLNT-09' AND cr.code = 'REQ-20' AND cr.condition NOT LIKE 'IF filter_flow_type%';

UPDATE compliance_requirements cr SET condition = 'IF filter_flow_type == quick THEN (' || cr.condition || ')'
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE cr.worksheet_template_id = w.id AND s.code = 'FLL-Naturteich' AND w.code = 'FLLNT-09' AND cr.code = 'REQ-21' AND cr.condition NOT LIKE 'IF filter_flow_type%';

-- D2: REQ-10 moves to FLLNT-04 (the sheet that owns its inputs)
UPDATE compliance_requirements cr SET worksheet_template_id = (SELECT w4.id FROM worksheet_templates w4 WHERE w4.standard_id = s.id AND w4.code = 'FLLNT-04')
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE cr.worksheet_template_id = w.id AND s.code = 'FLL-Naturteich' AND w.code = 'FLLNT-03' AND cr.code = 'REQ-10';

-- D4: the 50× rule is checked on the computed quantities
UPDATE compliance_requirements cr SET condition = 'filter_colonized_surface_actual >= 50 * pool_underwater_surface'
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE cr.worksheet_template_id = w.id AND s.code = 'FLL-Naturteich' AND w.code = 'FLLNT-10' AND cr.code = 'REQ-22' AND cr.condition = 'filter_50x_rule_met == true';

COMMIT;
