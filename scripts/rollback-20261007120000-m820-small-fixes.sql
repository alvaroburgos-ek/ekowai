-- Rollback of scripts/migrations/20261007120000_m820_small_fixes.sql (DWA-M 820 small fixes: 820-2-24 routing, halbjaehrlich, project_size hints).
-- Scoped and byte-equal: an archived row is restored ONLY while it is still exactly what the block wrote (md5 in m820_sf_written); a row
-- edited since the apply is left alone (its archive + ledger rows stay and show in read-back R4). The block inserts no row.
-- Saved project values are never touched. A project that saved status_report_frequency = 'halbjaehrlich' keeps that value after the
-- rollback although the token is gone from the list (read-back R3 lists such values — change them first if the rollback must be clean).
-- Restored archive / ledger rows are deleted; the tables stay (empty). Nothing is activated or deactivated.
-- Run (from C:\Users\Ekowai\_wt-g2t, which holds .env.local):
--   node scripts/apply-migration.mjs C:\Users\Ekowai\_wt-m820\scripts\rollback-20261007120000-m820-small-fixes.sql
BEGIN;

CREATE TABLE IF NOT EXISTS compliance_requirements_archive_m820_sf AS SELECT * FROM compliance_requirements WHERE false;
CREATE TABLE IF NOT EXISTS fields_archive_m820_sf AS SELECT * FROM fields WHERE false;
CREATE TABLE IF NOT EXISTS m820_sf_written (tbl text NOT NULL, id uuid NOT NULL, md5 text NOT NULL, PRIMARY KEY (tbl, id));

-- updated rows (only the columns the block writes)
UPDATE compliance_requirements x
   SET condition = a.condition, description = a.description
  FROM compliance_requirements_archive_m820_sf a, m820_sf_written w
 WHERE a.id = x.id AND w.tbl = 'compliance_requirements' AND w.id = x.id AND md5(row_to_json(x)::text) = w.md5;
UPDATE fields x
   SET description = a.description, enum_values = a.enum_values, consumer_worksheets = a.consumer_worksheets, visible_when = a.visible_when
  FROM fields_archive_m820_sf a, m820_sf_written w
 WHERE a.id = x.id AND w.tbl = 'fields' AND w.id = x.id AND md5(row_to_json(x)::text) = w.md5;

-- clean-up: archive + ledger rows whose base row equals the archive again
DELETE FROM m820_sf_written w USING compliance_requirements x, compliance_requirements_archive_m820_sf a WHERE w.tbl = 'compliance_requirements' AND x.id = w.id AND a.id = w.id AND row_to_json(x)::text = row_to_json(a)::text;
DELETE FROM m820_sf_written w USING fields x, fields_archive_m820_sf a WHERE w.tbl = 'fields' AND x.id = w.id AND a.id = w.id AND row_to_json(x)::text = row_to_json(a)::text;
DELETE FROM compliance_requirements_archive_m820_sf a USING compliance_requirements x WHERE x.id = a.id AND row_to_json(x)::text = row_to_json(a)::text;
DELETE FROM fields_archive_m820_sf a USING fields x WHERE x.id = a.id AND row_to_json(x)::text = row_to_json(a)::text;

COMMIT;
