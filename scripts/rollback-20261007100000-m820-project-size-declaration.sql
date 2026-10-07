-- Rollback of scripts/migrations/20261007100000_m820_project_size_declaration.sql (DWA-M 820-1 / -2 / -3 project-size declaration).
-- Scoped: removes only the three fields the block created, by standard + sheet + symbol:
--   DWA-M-820-2 820-2-01 project_size_begruendung · DWA-M-820-1 M820-01 project_size · DWA-M-820-3 M8203-01 project_size.
-- The required 820-2-01 `project_size` (pre-existing) is NOT touched: its sheet is excluded by the (standard, sheet, symbol) triples.
-- No existing row was changed by the block, so nothing is restored, nothing is re-activated.
-- BEFORE running: read-back R3 counts saved project values on the three new fields — this rollback DELETES them (their fields are
-- removed). Export them first if they are to be kept.
-- Run (from C:\Users\Ekowai\_wt-g2t, which holds .env.local):
--   node scripts/apply-migration.mjs C:\Users\Ekowai\_wt-m820\scripts\rollback-20261007100000-m820-project-size-declaration.sql
BEGIN;

DELETE FROM project_parameters p USING fields f, worksheet_templates w, standards s
 WHERE p.field_id = f.id AND f.worksheet_template_id = w.id AND w.standard_id = s.id
   AND (s.code, w.code, f.symbol) IN (('DWA-M-820-2', '820-2-01', 'project_size_begruendung'),
                                      ('DWA-M-820-1', 'M820-01', 'project_size'),
                                      ('DWA-M-820-3', 'M8203-01', 'project_size'));
DELETE FROM fields f USING worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id
   AND (s.code, w.code, f.symbol) IN (('DWA-M-820-2', '820-2-01', 'project_size_begruendung'),
                                      ('DWA-M-820-1', 'M820-01', 'project_size'),
                                      ('DWA-M-820-3', 'M8203-01', 'project_size'));

COMMIT;
