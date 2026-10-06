-- Rollback of scripts/migrations/20261006190000_m820_flow_1.sql (M820 flow block 1 — structure-settled order fixes).
-- Scoped: a row is restored ONLY while it still carries exactly what the block wrote:
--   gates   — on the block's new sheet, archived condition + severity, description = archived description + the block's note;
--   fields  — consumer_worksheets still exactly the block's new array (plan list below, the same as in the migration);
--   moved   — projektstopp_review_triggered still on M8203-24 section F, order_index 2, consumer NULL, description = archived + note.
-- A row edited since the apply is left alone and its archive row stays (read-back R1 / R5 then show it).
-- Restored archive rows are deleted; the two archive tables stay (empty). Nothing is deactivated or re-activated by this file.
-- project_parameters are not touched: values follow the field id back to M8203-02.
-- Run (from C:\Users\Ekowai\_wt-g2t, which holds .env.local):
--   node scripts/apply-migration.mjs C:\Users\Ekowai\_wt-m820\scripts\rollback-20261006190000-m820-flow-1.sql
BEGIN;

CREATE TABLE IF NOT EXISTS compliance_requirements_archive_m820_flow_1 AS SELECT * FROM compliance_requirements WHERE false;
CREATE TABLE IF NOT EXISTS fields_archive_m820_flow_1 AS SELECT * FROM fields WHERE false;

-- C⁻¹. projektstopp_review_triggered back to M8203-02 with the archived section / order / consumer / description
UPDATE fields f
   SET description = a.description, worksheet_template_id = a.worksheet_template_id, section_id = a.section_id,
       order_index = a.order_index, consumer_worksheets = a.consumer_worksheets
  FROM fields_archive_m820_flow_1 a, worksheet_templates w, worksheet_sections sc
 WHERE a.id = f.id AND f.symbol = 'projektstopp_review_triggered'
   AND w.id = f.worksheet_template_id AND w.code = 'M8203-24'
   AND sc.id = f.section_id AND sc.worksheet_template_id = w.id AND sc.code = 'F'
   AND f.order_index = 2 AND f.consumer_worksheets IS NULL
   AND left(f.description, length(COALESCE(a.description, '') || E'\n' || '[Flow 1, 2026-10-06] Blatt / sheet M8203-24'))
       = COALESCE(a.description, '') || E'\n' || '[Flow 1, 2026-10-06] Blatt / sheet M8203-24';

-- B⁻¹. consumer_worksheets new → archived, only while the live array is still exactly the block's new one
UPDATE fields f
   SET consumer_worksheets = a.consumer_worksheets
  FROM fields_archive_m820_flow_1 a, worksheet_templates w JOIN standards s ON s.id = w.standard_id,
       (VALUES
         ('DWA-M-820-1', 'M820-09', 'threshold_status', ARRAY['M820-10','M820-11','M820-12','M820-17','M820-04','M820-23']::text[], ARRAY['M820-10','M820-11','M820-12','M820-17','M820-23']::text[]),
         ('DWA-M-820-3', 'M8203-07', 'qe52_items_rated', NULL::text[], ARRAY['M8203-22']::text[]),
         ('DWA-M-820-3', 'M8203-08', 'qe53_items_rated', NULL::text[], ARRAY['M8203-22']::text[]),
         ('DWA-M-820-3', 'M8203-09', 'qe54_items_rated', NULL::text[], ARRAY['M8203-22']::text[]),
         ('DWA-M-820-3', 'M8203-10', 'qe55_items_rated', NULL::text[], ARRAY['M8203-22']::text[]),
         ('DWA-M-820-3', 'M8203-11', 'qe62_items_rated', NULL::text[], ARRAY['M8203-23']::text[]),
         ('DWA-M-820-3', 'M8203-12', 'qe63a_items_rated', NULL::text[], ARRAY['M8203-23']::text[]),
         ('DWA-M-820-3', 'M8203-13', 'qe63b_items_rated', NULL::text[], ARRAY['M8203-23']::text[]),
         ('DWA-M-820-3', 'M8203-14', 'qe64a_items_rated', NULL::text[], ARRAY['M8203-23']::text[]),
         ('DWA-M-820-3', 'M8203-15', 'qe64b_items_rated', NULL::text[], ARRAY['M8203-23']::text[]),
         ('DWA-M-820-3', 'M8203-16', 'qe65_items_rated', NULL::text[], ARRAY['M8203-23']::text[]),
         ('DWA-M-820-3', 'M8203-17', 'qe66_items_rated', NULL::text[], ARRAY['M8203-23']::text[]),
         ('DWA-M-820-3', 'M8203-18', 'qe67_items_rated', NULL::text[], ARRAY['M8203-23']::text[]),
         ('DWA-M-820-3', 'M8203-03', 'bild1_step_4_einzelprojekt_lifecycle', ARRAY['M8203-11..M8203-18','M8203-23','M8203-24']::text[], ARRAY['M8203-11','M8203-12','M8203-13','M8203-14','M8203-15','M8203-16','M8203-17','M8203-18','M8203-23','M8203-24']::text[]),
         ('DWA-M-820-2', '820-2-01', 'project_name_full', ARRAY['all']::text[], ARRAY['820-2-02','820-2-03','820-2-04','820-2-05','820-2-06','820-2-07','820-2-08','820-2-09','820-2-10','820-2-11','820-2-12','820-2-13','820-2-14','820-2-15','820-2-16','820-2-17','820-2-18','820-2-19','820-2-20','820-2-21','820-2-22','820-2-23','820-2-24','820-2-25','820-2-26','820-2-27','820-2-28']::text[]),
         ('DWA-M-820-2', '820-2-01', 'project_name_short', ARRAY['all']::text[], ARRAY['820-2-02','820-2-03','820-2-04','820-2-05','820-2-06','820-2-07','820-2-08','820-2-09','820-2-10','820-2-11','820-2-12','820-2-13','820-2-14','820-2-15','820-2-16','820-2-17','820-2-18','820-2-19','820-2-20','820-2-21','820-2-22','820-2-23','820-2-24','820-2-25','820-2-26','820-2-27','820-2-28']::text[]),
         ('DWA-M-820-2', '820-2-01', 'project_number', ARRAY['all']::text[], ARRAY['820-2-02','820-2-03','820-2-04','820-2-05','820-2-06','820-2-07','820-2-08','820-2-09','820-2-10','820-2-11','820-2-12','820-2-13','820-2-14','820-2-15','820-2-16','820-2-17','820-2-18','820-2-19','820-2-20','820-2-21','820-2-22','820-2-23','820-2-24','820-2-25','820-2-26','820-2-27','820-2-28']::text[]),
         ('DWA-M-820-2', '820-2-01', 'worksheet_status', ARRAY['all']::text[], NULL::text[]),
         ('DWA-M-820-3', 'M8203-01', 'applicable_lph', ARRAY['ALL']::text[], ARRAY['M8203-02','M8203-03','M8203-04','M8203-05','M8203-06','M8203-07','M8203-08','M8203-09','M8203-10','M8203-11','M8203-12','M8203-13','M8203-14','M8203-15','M8203-16','M8203-17','M8203-18','M8203-19','M8203-20','M8203-21','M8203-22','M8203-23','M8203-24']::text[]),
         ('DWA-M-820-3', 'M8203-01', 'client_auftraggeber', ARRAY['ALL']::text[], ARRAY['M8203-02','M8203-03','M8203-04','M8203-05','M8203-06','M8203-07','M8203-08','M8203-09','M8203-10','M8203-11','M8203-12','M8203-13','M8203-14','M8203-15','M8203-16','M8203-17','M8203-18','M8203-19','M8203-20','M8203-21','M8203-22','M8203-23','M8203-24']::text[]),
         ('DWA-M-820-3', 'M8203-01', 'contract_reference', ARRAY['ALL']::text[], ARRAY['M8203-02','M8203-03','M8203-04','M8203-05','M8203-06','M8203-07','M8203-08','M8203-09','M8203-10','M8203-11','M8203-12','M8203-13','M8203-14','M8203-15','M8203-16','M8203-17','M8203-18','M8203-19','M8203-20','M8203-21','M8203-22','M8203-23','M8203-24']::text[]),
         ('DWA-M-820-3', 'M8203-01', 'contractor_auftragnehmer', ARRAY['ALL']::text[], ARRAY['M8203-02','M8203-03','M8203-04','M8203-05','M8203-06','M8203-07','M8203-08','M8203-09','M8203-10','M8203-11','M8203-12','M8203-13','M8203-14','M8203-15','M8203-16','M8203-17','M8203-18','M8203-19','M8203-20','M8203-21','M8203-22','M8203-23','M8203-24']::text[]),
         ('DWA-M-820-3', 'M8203-01', 'project_location', ARRAY['ALL']::text[], ARRAY['M8203-02','M8203-03','M8203-04','M8203-05','M8203-06','M8203-07','M8203-08','M8203-09','M8203-10','M8203-11','M8203-12','M8203-13','M8203-14','M8203-15','M8203-16','M8203-17','M8203-18','M8203-19','M8203-20','M8203-21','M8203-22','M8203-23','M8203-24']::text[]),
         ('DWA-M-820-3', 'M8203-01', 'project_number', ARRAY['ALL']::text[], ARRAY['M8203-02','M8203-03','M8203-04','M8203-05','M8203-06','M8203-07','M8203-08','M8203-09','M8203-10','M8203-11','M8203-12','M8203-13','M8203-14','M8203-15','M8203-16','M8203-17','M8203-18','M8203-19','M8203-20','M8203-21','M8203-22','M8203-23','M8203-24']::text[]),
         ('DWA-M-820-3', 'M8203-01', 'project_title', ARRAY['ALL']::text[], ARRAY['M8203-02','M8203-03','M8203-04','M8203-05','M8203-06','M8203-07','M8203-08','M8203-09','M8203-10','M8203-11','M8203-12','M8203-13','M8203-14','M8203-15','M8203-16','M8203-17','M8203-18','M8203-19','M8203-20','M8203-21','M8203-22','M8203-23','M8203-24']::text[]),
         ('DWA-M-820-3', 'M8203-01', 'registration_date', ARRAY['ALL']::text[], ARRAY['M8203-02','M8203-03','M8203-04','M8203-05','M8203-06','M8203-07','M8203-08','M8203-09','M8203-10','M8203-11','M8203-12','M8203-13','M8203-14','M8203-15','M8203-16','M8203-17','M8203-18','M8203-19','M8203-20','M8203-21','M8203-22','M8203-23','M8203-24']::text[]),
         ('DWA-M-820-3', 'M8203-03', 'phase_definition_acknowledged', ARRAY['ALL']::text[], ARRAY['M8203-24']::text[]),
         ('DWA-M-820-3', 'M8203-03', 'phasenziele_definition_acknowledged', ARRAY['ALL']::text[], ARRAY['M8203-24']::text[]),
         ('DWA-M-820-3', 'M8203-03', 'projektziele_definition_acknowledged', ARRAY['ALL']::text[], ARRAY['M8203-24']::text[]),
         ('DWA-M-820-3', 'M8203-03', 'qe_definition_acknowledged', ARRAY['ALL']::text[], ARRAY['M8203-24']::text[])
       ) AS t(std, ws, symbol, old_cw, new_cw)
 WHERE a.id = f.id AND w.id = f.worksheet_template_id AND f.worksheet_template_id = a.worksheet_template_id
   AND t.std = s.code AND t.ws = w.code AND t.symbol = f.symbol
   AND f.consumer_worksheets IS NOT DISTINCT FROM t.new_cw
   AND a.consumer_worksheets IS NOT DISTINCT FROM t.old_cw;

-- A⁻¹. the four gates back to their archived sheet + description (only while the block's text is still live)
UPDATE compliance_requirements cr
   SET description = a.description, worksheet_template_id = a.worksheet_template_id
  FROM compliance_requirements_archive_m820_flow_1 a, worksheet_templates w,
       (VALUES ('REQ-07', 'M820-09'), ('REQ-04', 'M820-03'), ('REQ-24', 'M820-09'), ('REQ-14', 'M820-14')) AS t(code, ws)
 WHERE a.id = cr.id AND w.id = cr.worksheet_template_id AND w.code = t.ws AND cr.code = t.code
   AND cr.condition = a.condition AND cr.severity = a.severity
   AND left(cr.description, length(COALESCE(a.description, '') || E'\n' || '[Flow 1, 2026-10-06] Blatt / sheet ' || t.ws))
       = COALESCE(a.description, '') || E'\n' || '[Flow 1, 2026-10-06] Blatt / sheet ' || t.ws;

-- archive rows whose live row is back to the archived state
DELETE FROM compliance_requirements_archive_m820_flow_1 a USING compliance_requirements cr
 WHERE cr.id = a.id AND to_jsonb(cr) = to_jsonb(a);
DELETE FROM fields_archive_m820_flow_1 a USING fields f
 WHERE f.id = a.id AND to_jsonb(f) = to_jsonb(a);

COMMIT;
