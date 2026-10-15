-- Rollback of scripts/migrations/20261015150000_m820_1_c4_phase_drivers.sql (DWA-M 820-1 case C4 finding F2 — phase drivers and guards, incl. fix round 1).
-- Scoped and byte-equal: an archived row is restored ONLY while it is still exactly what the block wrote (md5 in m820_c4d_written); a row
-- edited since the apply is left alone (its archive + ledger rows stay and show in read-back R5). Only the columns the block writes are
-- restored (fields: visible_when, description, verification_quote, source_anchor · gates: condition, description).
-- The two phase drivers the block INSERTED (M820-17 phase_vergabeverfahren_erreicht, M820-23 phase_auftrag_erteilt) are deleted together
-- with their saved project values - only while each row is still exactly as inserted.
-- BEFORE running: read-back R4 lists the saved answers on the two drivers (they are deleted) - export them first if they are to be kept.
-- Nothing is activated or deactivated; values on the guarded fields stay saved (they become visible and are read again).
-- Restored archive / ledger rows are deleted; the tables stay (empty).
-- Order: roll this block back BEFORE 20261015130000 (reverse apply order). Independent of 20261014100000 and 20261015140000.
-- Run (from C:\Users\Ekowai\_wt-g2t, which holds .env.local):
--   node scripts/apply-migration.mjs C:\Users\Ekowai\_wt-m820-guards\scripts\rollback-20261015150000-m820-1-c4-phase-drivers.sql
BEGIN;

CREATE TABLE IF NOT EXISTS compliance_requirements_archive_m820_c4d AS SELECT * FROM compliance_requirements WHERE false;
CREATE TABLE IF NOT EXISTS fields_archive_m820_c4d AS SELECT * FROM fields WHERE false;
CREATE TABLE IF NOT EXISTS m820_c4d_written (tbl text NOT NULL, id uuid NOT NULL, md5 text NOT NULL, PRIMARY KEY (tbl, id));

-- updated rows (only the columns the block writes)
UPDATE compliance_requirements x
   SET condition = a.condition, description = a.description
  FROM compliance_requirements_archive_m820_c4d a, m820_c4d_written w
 WHERE a.id = x.id AND w.tbl = 'compliance_requirements' AND w.id = x.id AND md5(row_to_json(x)::text) = w.md5;
UPDATE fields x
   SET visible_when = a.visible_when, description = a.description, verification_quote = a.verification_quote, source_anchor = a.source_anchor
  FROM fields_archive_m820_c4d a, m820_c4d_written w
 WHERE a.id = x.id AND w.tbl = 'fields' AND w.id = x.id AND md5(row_to_json(x)::text) = w.md5;

-- the two inserted phase drivers: deleted together with their saved project values, only while still exactly as inserted
DELETE FROM project_parameters p USING fields f, m820_c4d_written w
 WHERE w.tbl = 'fields_new' AND f.id = w.id AND md5(row_to_json(f)::text) = w.md5 AND p.field_id = f.id;
DELETE FROM fields f USING m820_c4d_written w
 WHERE w.tbl = 'fields_new' AND f.id = w.id AND md5(row_to_json(f)::text) = w.md5;
DELETE FROM m820_c4d_written w WHERE w.tbl = 'fields_new' AND NOT EXISTS (SELECT 1 FROM fields f WHERE f.id = w.id);

-- clean-up: archive + ledger rows whose base row equals the archive again
DELETE FROM m820_c4d_written w USING compliance_requirements x, compliance_requirements_archive_m820_c4d a WHERE w.tbl = 'compliance_requirements' AND x.id = w.id AND a.id = w.id AND row_to_json(x)::text = row_to_json(a)::text;
DELETE FROM m820_c4d_written w USING fields x, fields_archive_m820_c4d a WHERE w.tbl = 'fields' AND x.id = w.id AND a.id = w.id AND row_to_json(x)::text = row_to_json(a)::text;
DELETE FROM compliance_requirements_archive_m820_c4d a USING compliance_requirements x WHERE x.id = a.id AND row_to_json(x)::text = row_to_json(a)::text;
DELETE FROM fields_archive_m820_c4d a USING fields x WHERE x.id = a.id AND row_to_json(x)::text = row_to_json(a)::text;

COMMIT;
