-- Rollback of scripts/migrations/20261014100000_m820_followup_o2_o3.sql (DWA-M 820 follow-up O-2 testbetrieb choice / O-3 no change).
-- Scoped and byte-equal: an archived row is restored ONLY while it is still exactly what the block wrote (md5 in m820_o23_written); a row
-- edited since the apply is left alone (its archive + ledger rows stay and show in read-back R4). Only the columns the block writes are
-- restored (fields: description, visible_when, consumer_worksheets · gates: condition, description, clause_reference). Nothing is
-- inserted, deleted, activated or deactivated; saved project values are not touched (a leftover testbetrieb_vs_abnahme_choice becomes
-- visible again and REQ-46 reads it again — read-back R2 lists such projects).
-- Restored archive / ledger rows are deleted; the tables stay (empty).
-- Run (from C:\Users\Ekowai\_wt-g2t, which holds .env.local):
--   node scripts/apply-migration.mjs C:\Users\Ekowai\_wt-m820-data\scripts\rollback-20261014100000-m820-followup-o2-o3.sql
BEGIN;

CREATE TABLE IF NOT EXISTS compliance_requirements_archive_m820_o23 AS SELECT * FROM compliance_requirements WHERE false;
CREATE TABLE IF NOT EXISTS fields_archive_m820_o23 AS SELECT * FROM fields WHERE false;
CREATE TABLE IF NOT EXISTS m820_o23_written (tbl text NOT NULL, id uuid NOT NULL, md5 text NOT NULL, PRIMARY KEY (tbl, id));

-- updated rows (only the columns the block writes)
UPDATE compliance_requirements x
   SET condition = a.condition, description = a.description, clause_reference = a.clause_reference
  FROM compliance_requirements_archive_m820_o23 a, m820_o23_written w
 WHERE a.id = x.id AND w.tbl = 'compliance_requirements' AND w.id = x.id AND md5(row_to_json(x)::text) = w.md5;
UPDATE fields x
   SET description = a.description, visible_when = a.visible_when, consumer_worksheets = a.consumer_worksheets
  FROM fields_archive_m820_o23 a, m820_o23_written w
 WHERE a.id = x.id AND w.tbl = 'fields' AND w.id = x.id AND md5(row_to_json(x)::text) = w.md5;

-- clean-up: archive + ledger rows whose base row equals the archive again
DELETE FROM m820_o23_written w USING compliance_requirements x, compliance_requirements_archive_m820_o23 a WHERE w.tbl = 'compliance_requirements' AND x.id = w.id AND a.id = w.id AND row_to_json(x)::text = row_to_json(a)::text;
DELETE FROM m820_o23_written w USING fields x, fields_archive_m820_o23 a WHERE w.tbl = 'fields' AND x.id = w.id AND a.id = w.id AND row_to_json(x)::text = row_to_json(a)::text;
DELETE FROM compliance_requirements_archive_m820_o23 a USING compliance_requirements x WHERE x.id = a.id AND row_to_json(x)::text = row_to_json(a)::text;
DELETE FROM fields_archive_m820_o23 a USING fields x WHERE x.id = a.id AND row_to_json(x)::text = row_to_json(a)::text;

COMMIT;
