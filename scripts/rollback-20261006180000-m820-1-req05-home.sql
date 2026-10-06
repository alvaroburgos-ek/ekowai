-- Rollback of scripts/migrations/20261006180000_m820_1_req05_home.sql (DWA-M 820-1 REQ-05 M820-04 → M820-07).
-- Scoped: the gate row is restored ONLY while it still carries exactly what the block wrote (sheet M820-07, the archived condition and
-- severity, the archived description + the block's note); a row edited since the apply is left alone and shows up in read-back R1.
-- The restored archive row is deleted; the archive table stays (empty). Nothing is deactivated or re-activated by this file.
-- Run (from C:\Users\Ekowai\_wt-g2t, which holds .env.local):
--   node scripts/apply-migration.mjs C:\Users\Ekowai\_wt-m820\scripts\rollback-20261006180000-m820-1-req05-home.sql
BEGIN;

CREATE TABLE IF NOT EXISTS compliance_requirements_archive_m820_1_req05_home AS SELECT * FROM compliance_requirements WHERE false;

-- 1⁻¹. REQ-05 back to M820-04 with the archived description (only while the block's text is still live)
UPDATE compliance_requirements cr
   SET description = a.description, worksheet_template_id = a.worksheet_template_id
  FROM compliance_requirements_archive_m820_1_req05_home a, worksheet_templates w
 WHERE a.id = cr.id AND w.id = cr.worksheet_template_id AND w.code = 'M820-07'
   AND cr.code = 'REQ-05'
   AND cr.condition = a.condition AND cr.severity = a.severity
   AND left(cr.description, length(COALESCE(a.description, '') || E'\n' || '[REQ-05 home, 2026-10-06] Blatt / sheet M820-07'))
       = COALESCE(a.description, '') || E'\n' || '[REQ-05 home, 2026-10-06] Blatt / sheet M820-07';
DELETE FROM compliance_requirements_archive_m820_1_req05_home a USING compliance_requirements cr
 WHERE cr.id = a.id AND cr.condition = a.condition AND cr.worksheet_template_id = a.worksheet_template_id
   AND cr.description IS NOT DISTINCT FROM a.description;

COMMIT;
