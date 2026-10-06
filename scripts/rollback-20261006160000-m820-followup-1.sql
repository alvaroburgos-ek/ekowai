-- Rollback of scripts/migrations/20261006160000_m820_followup_1.sql (M820 follow-up block 1).
-- Scoped: a gate row is restored ONLY while it still carries exactly what the block wrote (sheet M8203-23, the archived condition,
-- the archived description + the block's note); a row edited since the apply is left alone and shows up in read-back R1.
-- Table rows: ONLY the ids the block inserted (ledger regulation_table_rows_added_m820_followup_1) and only while their values
-- are still the block's. Restored archive / ledger rows are deleted; the two tables stay (empty). Nothing is deactivated or
-- re-activated by this file.
-- Code: the materialiser change of the same follow-up (src/lib/eval/materialize-derived.ts, item 4) is NOT undone by this file.
-- After the rollback a private-client project keeps the 214000 already filled into eu_threshold_value_anhb23 (a saved value);
-- the next save of M820-09 clears it (lookup_fill: key without a table row → value cleared, with a warning).
-- Run (from C:\Users\Ekowai\_wt-g2t, which holds .env.local):
--   node scripts/apply-migration.mjs C:\Users\Ekowai\_wt-m820\scripts\rollback-20261006160000-m820-followup-1.sql
BEGIN;

CREATE TABLE IF NOT EXISTS compliance_requirements_archive_m820_followup_1 AS SELECT * FROM compliance_requirements WHERE false;
CREATE TABLE IF NOT EXISTS regulation_table_rows_added_m820_followup_1 (id uuid PRIMARY KEY);

-- 2⁻¹. the two ANHB23 rows the block inserted (still with the block's values)
DELETE FROM regulation_table_rows r USING regulation_table_rows_added_m820_followup_1 l
 WHERE r.id = l.id
   AND r.row_key IN ('privat_ohne_foerderung', 'privat_mit_foerderung')
   AND r.row_values = '{"schwellenwert_eur":214000,"gruppe_gedruckt":"für alle anderen","verordnung":"Verordnung (EU) 2019/1828 vom 30.10.2019","gueltig_ab":"01.01.2020"}'::jsonb
   AND r.verbatim_quote = 'für alle anderen 214.000 €.';
DELETE FROM regulation_table_rows_added_m820_followup_1 l WHERE NOT EXISTS (SELECT 1 FROM regulation_table_rows r WHERE r.id = l.id);

-- 1⁻¹. REQ-20 / REQ-21 back to M8203-11 with the archived description (only while the block's text is still live)
UPDATE compliance_requirements cr
   SET description = a.description, worksheet_template_id = a.worksheet_template_id
  FROM compliance_requirements_archive_m820_followup_1 a, worksheet_templates w
 WHERE a.id = cr.id AND w.id = cr.worksheet_template_id AND w.code = 'M8203-23'
   AND cr.code IN ('REQ-20', 'REQ-21')
   AND cr.condition = a.condition AND cr.severity = a.severity
   AND left(cr.description, length(COALESCE(a.description, '') || E'\n' || '[Follow-up 1, 2026-10-06] Blatt / sheet M8203-23'))
       = COALESCE(a.description, '') || E'\n' || '[Follow-up 1, 2026-10-06] Blatt / sheet M8203-23';
DELETE FROM compliance_requirements_archive_m820_followup_1 a USING compliance_requirements cr
 WHERE cr.id = a.id AND cr.condition = a.condition AND cr.worksheet_template_id = a.worksheet_template_id
   AND cr.description IS NOT DISTINCT FROM a.description;

COMMIT;
