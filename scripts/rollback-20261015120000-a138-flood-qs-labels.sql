-- Rollback of scripts/migrations/20261015120000_a138_flood_qs_labels.sql (DWA-A 138-1 A138-26: F-A9 Q_S_flood retired, F-A7 labels).
-- Scoped and byte-equal: an archived row is restored ONLY while it is still exactly what the block wrote (md5 in a138_fqs_written); a row
-- edited since the apply is left alone (its archive + ledger rows stay and show in read-back R4). Only the columns the block writes are
-- restored (fields: active, description, label_de, label_en). Nothing is inserted or deleted; saved project values are not touched
-- (Q_S_flood becomes active, visible and required again with whatever value a project saved — read-back R2 lists them).
-- Restored archive / ledger rows are deleted; the tables stay (empty).
-- Run (from C:\Users\Ekowai\_wt-g2t, which holds .env.local):
--   node scripts/apply-migration.mjs C:\Users\Ekowai\_wt-a138-data\scripts\rollback-20261015120000-a138-flood-qs-labels.sql
BEGIN;

CREATE TABLE IF NOT EXISTS fields_archive_a138_fqs AS SELECT * FROM fields WHERE false;
CREATE TABLE IF NOT EXISTS a138_fqs_written (tbl text NOT NULL, id uuid NOT NULL, md5 text NOT NULL, PRIMARY KEY (tbl, id));

-- updated rows (only the columns the block writes)
UPDATE fields x
   SET active = a.active, description = a.description, label_de = a.label_de, label_en = a.label_en
  FROM fields_archive_a138_fqs a, a138_fqs_written w
 WHERE a.id = x.id AND w.tbl = 'fields' AND w.id = x.id AND md5(row_to_json(x)::text) = w.md5;

-- clean-up: archive + ledger rows whose base row equals the archive again
DELETE FROM a138_fqs_written w USING fields x, fields_archive_a138_fqs a WHERE w.tbl = 'fields' AND x.id = w.id AND a.id = w.id AND row_to_json(x)::text = row_to_json(a)::text;
DELETE FROM fields_archive_a138_fqs a USING fields x WHERE x.id = a.id AND row_to_json(x)::text = row_to_json(a)::text;

COMMIT;
