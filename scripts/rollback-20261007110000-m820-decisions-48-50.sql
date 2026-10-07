-- Rollback of scripts/migrations/20261007110000_m820_decisions_48_50.sql (DWA-M 820 decisions on 48_ / 50_).
-- Scoped and byte-equal: an archived row is restored ONLY while it is still exactly what the block wrote (md5 in m820_d48_written); a row
-- edited since the apply is left alone (its archive + ledger rows stay and show in read-back R5). Inserted rows (m820_d48_added: the
-- three driver fields, gate REQ-23-2) are deleted only while unchanged; a driver field that already holds a project value
-- (project_parameters) is KEPT with its value (read-back R4 lists them — export or delete them first if the rollback must be complete).
-- Restored archive / ledger rows are deleted; the tables stay (empty). Nothing is activated or deactivated.
-- Run (from C:\Users\Ekowai\_wt-g2t, which holds .env.local):
--   node scripts/apply-migration.mjs C:\Users\Ekowai\_wt-m820\scripts\rollback-20261007110000-m820-decisions-48-50.sql
BEGIN;

CREATE TABLE IF NOT EXISTS compliance_requirements_archive_m820_d48 AS SELECT * FROM compliance_requirements WHERE false;
CREATE TABLE IF NOT EXISTS fields_archive_m820_d48 AS SELECT * FROM fields WHERE false;
CREATE TABLE IF NOT EXISTS m820_d48_written (tbl text NOT NULL, id uuid NOT NULL, md5 text NOT NULL, PRIMARY KEY (tbl, id));
CREATE TABLE IF NOT EXISTS m820_d48_added (tbl text NOT NULL, id uuid NOT NULL, md5 text NOT NULL, PRIMARY KEY (tbl, id));

-- inserted rows
DELETE FROM compliance_requirements x USING m820_d48_added a
 WHERE a.tbl = 'compliance_requirements' AND a.id = x.id AND md5(row_to_json(x)::text) = a.md5;
DELETE FROM fields f USING m820_d48_added a
 WHERE a.tbl = 'fields' AND a.id = f.id AND md5(row_to_json(f)::text) = a.md5
   AND NOT EXISTS (SELECT 1 FROM project_parameters pp WHERE pp.field_id = f.id);
DELETE FROM m820_d48_added a WHERE a.tbl = 'compliance_requirements' AND NOT EXISTS (SELECT 1 FROM compliance_requirements x WHERE x.id = a.id);
DELETE FROM m820_d48_added a WHERE a.tbl = 'fields' AND NOT EXISTS (SELECT 1 FROM fields f WHERE f.id = a.id);

-- updated rows (only the columns the block writes)
UPDATE compliance_requirements x
   SET condition = a.condition, clause_reference = a.clause_reference, severity = a.severity, description = a.description
  FROM compliance_requirements_archive_m820_d48 a, m820_d48_written w
 WHERE a.id = x.id AND w.tbl = 'compliance_requirements' AND w.id = x.id AND md5(row_to_json(x)::text) = w.md5;
UPDATE fields x
   SET description = a.description, enum_values = a.enum_values, consumer_worksheets = a.consumer_worksheets, order_index = a.order_index
  FROM fields_archive_m820_d48 a, m820_d48_written w
 WHERE a.id = x.id AND w.tbl = 'fields' AND w.id = x.id AND md5(row_to_json(x)::text) = w.md5;

-- clean-up: archive + ledger rows whose base row equals the archive again
DELETE FROM m820_d48_written w USING compliance_requirements x, compliance_requirements_archive_m820_d48 a WHERE w.tbl = 'compliance_requirements' AND x.id = w.id AND a.id = w.id AND row_to_json(x)::text = row_to_json(a)::text;
DELETE FROM m820_d48_written w USING fields x, fields_archive_m820_d48 a WHERE w.tbl = 'fields' AND x.id = w.id AND a.id = w.id AND row_to_json(x)::text = row_to_json(a)::text;
DELETE FROM compliance_requirements_archive_m820_d48 a USING compliance_requirements x WHERE x.id = a.id AND row_to_json(x)::text = row_to_json(a)::text;
DELETE FROM fields_archive_m820_d48 a USING fields x WHERE x.id = a.id AND row_to_json(x)::text = row_to_json(a)::text;

COMMIT;
