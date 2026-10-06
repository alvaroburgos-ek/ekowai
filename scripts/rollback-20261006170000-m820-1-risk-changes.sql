-- Rollback of scripts/migrations/20261006170000_m820_1_risk_changes.sql (DWA-M 820-1 M820-06 risk-analysis change log).
-- Scoped: removes only the equation M820-06-D1 with the block's formula and the two fields the block created (by sheet + symbol).
-- No existing row was changed by the block, so nothing is restored, nothing is re-activated.
-- BEFORE running: read-back R3 counts saved project values on the two new fields — this rollback DELETES them (their fields are
-- removed). Export the change rows first if they are to be kept.
-- Run (from C:\Users\Ekowai\_wt-g2t, which holds .env.local):
--   node scripts/apply-migration.mjs C:\Users\Ekowai\_wt-m820\scripts\rollback-20261006170000-m820-1-risk-changes.sql
BEGIN;

DELETE FROM equations e USING worksheet_templates w, standards s
 WHERE e.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-1' AND w.code = 'M820-06'
   AND e.equation_number = 'M820-06-D1' AND e.formula = 'risiko_aenderungen_count = count_rows(risiko_aenderungen)';

DELETE FROM project_parameters p USING fields f, worksheet_templates w, standards s
 WHERE p.field_id = f.id AND f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-1'
   AND w.code = 'M820-06' AND f.symbol IN ('risiko_aenderungen', 'risiko_aenderungen_count');
DELETE FROM fields f USING worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-1'
   AND w.code = 'M820-06' AND f.symbol IN ('risiko_aenderungen', 'risiko_aenderungen_count');

COMMIT;
