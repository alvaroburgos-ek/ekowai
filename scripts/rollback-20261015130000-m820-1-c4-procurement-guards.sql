-- Rollback of scripts/migrations/20261015130000_m820_1_c4_procurement_guards.sql (DWA-M 820-1 case C4 finding F1 — procurement guards).
-- Scoped and byte-equal: an archived row is restored ONLY while it is still exactly what the block wrote (md5 in m820_c4g_written); a row
-- edited since the apply is left alone (its archive + ledger rows stay and show in read-back R4). Only the columns the block writes are
-- restored (fields: visible_when, description, verification_quote, source_anchor · worksheet_sections: visible_when). Nothing is
-- inserted, deleted, activated or deactivated; saved project values are not touched (values saved while a field was hidden become
-- visible and are read again).
-- Restored archive / ledger rows are deleted; the tables stay (empty).
-- Independent of 20261014100000 (other standard, other tables): roll back in any order.
-- Run (from C:\Users\Ekowai\_wt-g2t, which holds .env.local):
--   node scripts/apply-migration.mjs C:\Users\Ekowai\_wt-m820-guards\scripts\rollback-20261015130000-m820-1-c4-procurement-guards.sql
BEGIN;

CREATE TABLE IF NOT EXISTS fields_archive_m820_c4g AS SELECT * FROM fields WHERE false;
CREATE TABLE IF NOT EXISTS worksheet_sections_archive_m820_c4g AS SELECT * FROM worksheet_sections WHERE false;
CREATE TABLE IF NOT EXISTS m820_c4g_written (tbl text NOT NULL, id uuid NOT NULL, md5 text NOT NULL, PRIMARY KEY (tbl, id));

-- updated rows (only the columns the block writes)
UPDATE fields x
   SET visible_when = a.visible_when, description = a.description, verification_quote = a.verification_quote, source_anchor = a.source_anchor
  FROM fields_archive_m820_c4g a, m820_c4g_written w
 WHERE a.id = x.id AND w.tbl = 'fields' AND w.id = x.id AND md5(row_to_json(x)::text) = w.md5;
UPDATE worksheet_sections x
   SET visible_when = a.visible_when
  FROM worksheet_sections_archive_m820_c4g a, m820_c4g_written w
 WHERE a.id = x.id AND w.tbl = 'worksheet_sections' AND w.id = x.id AND md5(row_to_json(x)::text) = w.md5;

-- clean-up: archive + ledger rows whose base row equals the archive again
DELETE FROM m820_c4g_written w USING fields x, fields_archive_m820_c4g a WHERE w.tbl = 'fields' AND x.id = w.id AND a.id = w.id AND row_to_json(x)::text = row_to_json(a)::text;
DELETE FROM m820_c4g_written w USING worksheet_sections x, worksheet_sections_archive_m820_c4g a WHERE w.tbl = 'worksheet_sections' AND x.id = w.id AND a.id = w.id AND row_to_json(x)::text = row_to_json(a)::text;
DELETE FROM fields_archive_m820_c4g a USING fields x WHERE x.id = a.id AND row_to_json(x)::text = row_to_json(a)::text;
DELETE FROM worksheet_sections_archive_m820_c4g a USING worksheet_sections x WHERE x.id = a.id AND row_to_json(x)::text = row_to_json(a)::text;

COMMIT;
