-- Rollback of scripts/migrations/20261006200000_m820_flow_2.sql (M820 flow block 2 — order and home rulings).
-- Scoped and all-or-nothing per group, like the apply: a group is restored ONLY while every row of it still carries exactly what
-- the block wrote —
--   sheet order (per standard) — every planned template at its new (phase, order_index);
--   phase-goal family (§ 6.3 / § 6.4) — every archived field on the new sheet, its section B, with the block's consumer array, and
--     every archived gate on the new sheet with the archived condition + severity and description = archived description + the note.
-- Only the columns the block wrote are restored (phase / order_index; worksheet_template_id / section_id / consumer_worksheets;
-- worksheet_template_id / description), from the archive. A group edited since the apply is left alone and its archive rows stay
-- (read-back R4 then shows them). Restored archive rows are deleted; the archive tables stay (empty). Nothing is deactivated or
-- re-activated. project_parameters are not touched: values follow the field id back.
-- Run (from C:\Users\Ekowai\_wt-g2t, which holds .env.local):
--   node scripts/apply-migration.mjs C:\Users\Ekowai\_wt-m820\scripts\rollback-20261006200000-m820-flow-2.sql
BEGIN;

CREATE TABLE IF NOT EXISTS worksheet_templates_archive_m820_flow_2 AS SELECT * FROM worksheet_templates WHERE false;
CREATE TABLE IF NOT EXISTS fields_archive_m820_flow_2 AS SELECT * FROM fields WHERE false;
CREATE TABLE IF NOT EXISTS compliance_requirements_archive_m820_flow_2 AS SELECT * FROM compliance_requirements WHERE false;

CREATE TEMP TABLE m820f2r_tpl ON COMMIT DROP AS SELECT * FROM (VALUES
  ('DWA-M-820-1', 'M820-16', 4, 16, 3, 11),
  ('DWA-M-820-1', 'M820-11', 3, 11, 3, 12),
  ('DWA-M-820-1', 'M820-12', 3, 12, 3, 13),
  ('DWA-M-820-1', 'M820-13', 3, 13, 3, 14),
  ('DWA-M-820-1', 'M820-14', 3, 14, 3, 15),
  ('DWA-M-820-1', 'M820-15', 3, 15, 3, 16),
  ('DWA-M-820-2', '820-2-16', 4, 16, 3, 15),
  ('DWA-M-820-2', '820-2-15', 3, 15, 3, 16)
) AS t(std, code, old_phase, old_order, new_phase, new_order);
CREATE TEMP TABLE m820f2r_fam ON COMMIT DROP AS SELECT * FROM (VALUES ('63', 'M8203-12', 'M8203-13'), ('64', 'M8203-14', 'M8203-15'))
  AS t(fam, old_ws, new_ws);

-- A⁻¹. sheet order: per standard, only while every planned template is at its new state AND archived at its old state
CREATE TEMP TABLE m820f2r_tpl_new ON COMMIT DROP AS
SELECT w.id, t.std, a.phase AS a_phase, a.order_index AS a_order FROM m820f2r_tpl t
  JOIN standards s ON s.code = t.std JOIN worksheet_templates w ON w.standard_id = s.id AND w.code = t.code
  JOIN worksheet_templates_archive_m820_flow_2 a ON a.id = w.id
 WHERE w.phase IS NOT DISTINCT FROM t.new_phase AND w.order_index = t.new_order
   AND a.phase IS NOT DISTINCT FROM t.old_phase AND a.order_index = t.old_order;
UPDATE worksheet_templates w
   SET phase = n.a_phase, order_index = n.a_order
  FROM m820f2r_tpl_new n
 WHERE w.id = n.id
   AND (SELECT count(*) FROM m820f2r_tpl_new n2 WHERE n2.std = n.std) = (SELECT count(*) FROM m820f2r_tpl t2 WHERE t2.std = n.std);

-- B⁻¹ / C⁻¹. phase-goal families: only while every archived row of the family is still exactly at the block's new state
CREATE TEMP TABLE m820f2r_fld_new ON COMMIT DROP AS
SELECT f.id, fm.fam FROM m820f2r_fam fm
  JOIN standards s ON s.code = 'DWA-M-820-3' JOIN worksheet_templates wt ON wt.standard_id = s.id AND wt.code = fm.new_ws
  JOIN worksheet_sections sct ON sct.worksheet_template_id = wt.id AND sct.code = 'B'
  JOIN fields f ON f.worksheet_template_id = wt.id AND f.section_id = sct.id
  JOIN fields_archive_m820_flow_2 a ON a.id = f.id
  JOIN worksheet_templates wo ON wo.id = a.worksheet_template_id AND wo.code = fm.old_ws
 WHERE f.active
   AND f.consumer_worksheets IS NOT DISTINCT FROM (CASE WHEN a.consumer_worksheets IS NULL THEN NULL ELSE array_remove(a.consumer_worksheets, fm.new_ws) END);
CREATE TEMP TABLE m820f2r_gate_new ON COMMIT DROP AS
SELECT cr.id, fm.fam FROM m820f2r_fam fm
  JOIN standards s ON s.code = 'DWA-M-820-3' JOIN worksheet_templates wt ON wt.standard_id = s.id AND wt.code = fm.new_ws
  JOIN compliance_requirements cr ON cr.worksheet_template_id = wt.id
  JOIN compliance_requirements_archive_m820_flow_2 a ON a.id = cr.id
  JOIN worksheet_templates wo ON wo.id = a.worksheet_template_id AND wo.code = fm.old_ws
 WHERE cr.condition = a.condition AND cr.severity = a.severity
   AND left(cr.description, length(COALESCE(a.description, '') || E'\n' || '[Flow 2, 2026-10-06] Blatt / sheet ' || fm.new_ws))
       = COALESCE(a.description, '') || E'\n' || '[Flow 2, 2026-10-06] Blatt / sheet ' || fm.new_ws;
CREATE TEMP TABLE m820f2r_fam_ok ON COMMIT DROP AS
SELECT fm.fam FROM m820f2r_fam fm
  JOIN standards s ON s.code = 'DWA-M-820-3' JOIN worksheet_templates wo ON wo.standard_id = s.id AND wo.code = fm.old_ws
 WHERE (SELECT count(*) FROM m820f2r_fld_new n WHERE n.fam = fm.fam) = (SELECT count(*) FROM fields_archive_m820_flow_2 a WHERE a.worksheet_template_id = wo.id)
   AND (SELECT count(*) FROM m820f2r_gate_new n WHERE n.fam = fm.fam) = (SELECT count(*) FROM compliance_requirements_archive_m820_flow_2 a WHERE a.worksheet_template_id = wo.id)
   AND (SELECT count(*) FROM fields_archive_m820_flow_2 a WHERE a.worksheet_template_id = wo.id) > 0;

UPDATE fields f
   SET worksheet_template_id = a.worksheet_template_id, section_id = a.section_id, consumer_worksheets = a.consumer_worksheets
  FROM fields_archive_m820_flow_2 a, m820f2r_fld_new n JOIN m820f2r_fam_ok k ON k.fam = n.fam
 WHERE n.id = f.id AND a.id = f.id;
UPDATE compliance_requirements cr
   SET worksheet_template_id = a.worksheet_template_id, description = a.description
  FROM compliance_requirements_archive_m820_flow_2 a, m820f2r_gate_new n JOIN m820f2r_fam_ok k ON k.fam = n.fam
 WHERE n.id = cr.id AND a.id = cr.id;

-- archive rows whose live row is back to the archived state
DELETE FROM worksheet_templates_archive_m820_flow_2 a USING worksheet_templates w WHERE w.id = a.id AND to_jsonb(w) = to_jsonb(a);
DELETE FROM fields_archive_m820_flow_2 a USING fields f WHERE f.id = a.id AND to_jsonb(f) = to_jsonb(a);
DELETE FROM compliance_requirements_archive_m820_flow_2 a USING compliance_requirements cr WHERE cr.id = a.id AND to_jsonb(cr) = to_jsonb(a);

COMMIT;
