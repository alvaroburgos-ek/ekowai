-- FLL-Naturteich · Type III swimming-pool run 2026-10-05 (project TEST-FLLNT-B1b, _parts/run-nt-b1b-typeIII-2026-10-05.md), defects D13 / D14:
--   REQ-20 (Tab. 11, slow-flow substrate filter, printed p. 50), REQ-21 (Tab. 12, quick-flow filter, p. 52) and REQ-08 (§ 10.2.2, p. 50:
--   slow-flow substrate filters "must be equipped with a downstream phosphorous-binding purification stage") are hosted on FLLNT-09
--   (hydrobotanical system), while every input they read — filter_flow_type, filter_flow_direction, filter_water_column,
--   filter_layer_thickness, filter_grain_size_max, filter_kf, filter_frost_resistance, filter_layer_tolerance_pct, the feed rates — is
--   entered on FLLNT-10 (substrate filter), and p_binding_required (FLLNT-03) is inherited by FLLNT-10 but not by FLLNT-09.
--   Consequence seen in the run: FLLNT-10 approved with a filter water column of 5 cm (Tab. 11: ≥ 10 cm), and a slow filter without
--   the phosphate stage approved on FLLNT-03, -10 and -11 — the gates were judged on a sheet approved earlier, before the inputs
--   existed. Same structural class as D2 of the Naturteich run (REQ-10 → FLLNT-04, block 20261005130000).
-- Fix: the three gates move to FLLNT-10, the sheet that owns their inputs. Conditions and severities unchanged (REQ-08 keeps its
-- lower-case if/then, which the parser accepts). Idempotent (guarded on the current host).
-- STAGED — not applied. Apply: node scripts/apply-migration.mjs scripts/migrations/20261005191000_fll_naturteich_filter_gate_hosts.sql
-- Rollback: scripts/migrations/rollback-20261005191000_fll_naturteich_filter_gate_hosts.sql
-- Read-back: scripts/verification/apply/readback-fll-naturteich-filter-gates-20261005.sql
BEGIN;
UPDATE compliance_requirements cr SET worksheet_template_id = (SELECT w10.id FROM worksheet_templates w10 WHERE w10.standard_id = s.id AND w10.code = 'FLLNT-10')
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE cr.worksheet_template_id = w.id AND s.code = 'FLL-Naturteich' AND w.code = 'FLLNT-09' AND cr.code IN ('REQ-08', 'REQ-20', 'REQ-21');
COMMIT;
