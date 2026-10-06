-- Rollback of scripts/migrations/20261006240000_m820_guideline_criteria.sql (DWA-M 820 guideline criteria).
-- Scoped and byte-equal: an archived row is restored ONLY while it is still exactly what the block wrote (md5 in m820_gc_written); a row edited since the
-- apply is left alone (its archive + ledger rows stay and show in read-back R4). Inserted rows (m820_gc_added) are deleted only while unchanged; a new
-- field that already holds a project value (project_parameters) is kept. Restored archive / ledger rows are deleted; the tables stay (empty).
-- Nothing is activated or deactivated. A project that saved the new enum tokens ("vergleichbare_institution", "keine", "monatlich") or rows with
-- Nr. "E" keeps those values; after the rollback they name no option / table row (the form asks to reselect; E rows stop counting as complete).
-- Run (from C:\Users\Ekowai\_wt-g2t, which holds .env.local):
--   node scripts/apply-migration.mjs C:\Users\Ekowai\_wt-m820\scripts\rollback-20261006240000-m820-guideline-criteria.sql
BEGIN;

CREATE TABLE IF NOT EXISTS compliance_requirements_archive_m820_gc AS SELECT * FROM compliance_requirements WHERE false;
CREATE TABLE IF NOT EXISTS fields_archive_m820_gc AS SELECT * FROM fields WHERE false;
CREATE TABLE IF NOT EXISTS equations_archive_m820_gc AS SELECT * FROM equations WHERE false;
CREATE TABLE IF NOT EXISTS m820_gc_written (tbl text NOT NULL, id uuid NOT NULL, md5 text NOT NULL, PRIMARY KEY (tbl, id));
CREATE TABLE IF NOT EXISTS m820_gc_added (tbl text NOT NULL, id uuid NOT NULL, md5 text NOT NULL, PRIMARY KEY (tbl, id));

-- inserted rows
DELETE FROM fields f USING m820_gc_added a
 WHERE a.tbl = 'fields' AND a.id = f.id AND md5(row_to_json(f)::text) = a.md5
   AND NOT EXISTS (SELECT 1 FROM project_parameters pp WHERE pp.field_id = f.id);
DELETE FROM regulation_table_rows r USING m820_gc_added a
 WHERE a.tbl = 'regulation_table_rows' AND a.id = r.id AND md5(row_to_json(r)::text) = a.md5;
DELETE FROM m820_gc_added a WHERE a.tbl = 'fields' AND NOT EXISTS (SELECT 1 FROM fields f WHERE f.id = a.id);
DELETE FROM m820_gc_added a WHERE a.tbl = 'regulation_table_rows' AND NOT EXISTS (SELECT 1 FROM regulation_table_rows r WHERE r.id = a.id);

-- updated rows (only the columns the block writes)
UPDATE compliance_requirements x
   SET condition = a.condition, clause_reference = a.clause_reference, severity = a.severity, description = a.description
  FROM compliance_requirements_archive_m820_gc a, m820_gc_written w
 WHERE a.id = x.id AND w.tbl = 'compliance_requirements' AND w.id = x.id AND md5(row_to_json(x)::text) = w.md5;
UPDATE fields x
   SET label_de = a.label_de, description = a.description, is_required = a.is_required, enum_values = a.enum_values,
       consumer_worksheets = a.consumer_worksheets, ui_config = a.ui_config, clause_reference = a.clause_reference
  FROM fields_archive_m820_gc a, m820_gc_written w
 WHERE a.id = x.id AND w.tbl = 'fields' AND w.id = x.id AND md5(row_to_json(x)::text) = w.md5;
UPDATE equations x
   SET formula = a.formula
  FROM equations_archive_m820_gc a, m820_gc_written w
 WHERE a.id = x.id AND w.tbl = 'equations' AND w.id = x.id AND md5(row_to_json(x)::text) = w.md5;

-- clean-up: archive + ledger rows whose base row equals the archive again
DELETE FROM m820_gc_written w USING compliance_requirements x, compliance_requirements_archive_m820_gc a WHERE w.tbl = 'compliance_requirements' AND x.id = w.id AND a.id = w.id AND row_to_json(x)::text = row_to_json(a)::text;
DELETE FROM m820_gc_written w USING fields x, fields_archive_m820_gc a WHERE w.tbl = 'fields' AND x.id = w.id AND a.id = w.id AND row_to_json(x)::text = row_to_json(a)::text;
DELETE FROM m820_gc_written w USING equations x, equations_archive_m820_gc a WHERE w.tbl = 'equations' AND x.id = w.id AND a.id = w.id AND row_to_json(x)::text = row_to_json(a)::text;
DELETE FROM compliance_requirements_archive_m820_gc a USING compliance_requirements x WHERE x.id = a.id AND row_to_json(x)::text = row_to_json(a)::text;
DELETE FROM fields_archive_m820_gc a USING fields x WHERE x.id = a.id AND row_to_json(x)::text = row_to_json(a)::text;
DELETE FROM equations_archive_m820_gc a USING equations x WHERE x.id = a.id AND row_to_json(x)::text = row_to_json(a)::text;

COMMIT;
