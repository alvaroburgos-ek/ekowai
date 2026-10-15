-- Rollback of scripts/migrations/20261015160000_m820_3_c4_qe_guards.sql (DWA-M 820-3 case C4 F3 / F4 — QE assessment guards, derived totals).
-- Scoped and byte-equal: an archived row is restored ONLY while it is still exactly what the block wrote (md5 in m820_c4q_written); a row
-- edited since the apply is left alone (its archive + ledger rows stay and show in read-back R5). Only the columns the block writes are
-- restored (fields: visible_when, description, verification_quote, source_anchor, consumer_worksheets, is_required, widget · gates:
-- condition, description). The 8 equations the block INSERTED (<ws>-D10, qe*_items_total = N) are deleted only while each row is still
-- exactly as inserted. Saved project values are not touched: a total written by the browser engine / recompute stays saved (source_type
-- 'derived') on the field that becomes an input again — read-back R4 lists them.
-- Nothing is activated or deactivated. Restored archive / ledger rows are deleted; the tables stay (empty).
-- Independent of 20261014100000, 20261015130000, 20261015140000, 20261015150000 (disjoint rows, own tables): roll back in any order.
-- Run (from C:\Users\Ekowai\_wt-g2t, which holds .env.local):
--   node scripts/apply-migration.mjs C:\Users\Ekowai\_wt-m820-3g\scripts\rollback-20261015160000-m820-3-c4-qe-guards.sql
BEGIN;

CREATE TABLE IF NOT EXISTS compliance_requirements_archive_m820_c4q AS SELECT * FROM compliance_requirements WHERE false;
CREATE TABLE IF NOT EXISTS fields_archive_m820_c4q AS SELECT * FROM fields WHERE false;
CREATE TABLE IF NOT EXISTS m820_c4q_written (tbl text NOT NULL, id uuid NOT NULL, md5 text NOT NULL, PRIMARY KEY (tbl, id));

-- updated rows (only the columns the block writes)
UPDATE compliance_requirements x
   SET condition = a.condition, description = a.description
  FROM compliance_requirements_archive_m820_c4q a, m820_c4q_written w
 WHERE a.id = x.id AND w.tbl = 'compliance_requirements' AND w.id = x.id AND md5(row_to_json(x)::text) = w.md5;
UPDATE fields x
   SET visible_when = a.visible_when, description = a.description, verification_quote = a.verification_quote, source_anchor = a.source_anchor,
       consumer_worksheets = a.consumer_worksheets, is_required = a.is_required, widget = a.widget
  FROM fields_archive_m820_c4q a, m820_c4q_written w
 WHERE a.id = x.id AND w.tbl = 'fields' AND w.id = x.id AND md5(row_to_json(x)::text) = w.md5;

-- the inserted equations: deleted only while still exactly as inserted
DELETE FROM equations e USING m820_c4q_written w
 WHERE w.tbl = 'equations_new' AND e.id = w.id AND md5(row_to_json(e)::text) = w.md5;
DELETE FROM m820_c4q_written w WHERE w.tbl = 'equations_new' AND NOT EXISTS (SELECT 1 FROM equations e WHERE e.id = w.id);

-- clean-up: archive + ledger rows whose base row equals the archive again
DELETE FROM m820_c4q_written w USING compliance_requirements x, compliance_requirements_archive_m820_c4q a WHERE w.tbl = 'compliance_requirements' AND x.id = w.id AND a.id = w.id AND row_to_json(x)::text = row_to_json(a)::text;
DELETE FROM m820_c4q_written w USING fields x, fields_archive_m820_c4q a WHERE w.tbl = 'fields' AND x.id = w.id AND a.id = w.id AND row_to_json(x)::text = row_to_json(a)::text;
DELETE FROM compliance_requirements_archive_m820_c4q a USING compliance_requirements x WHERE x.id = a.id AND row_to_json(x)::text = row_to_json(a)::text;
DELETE FROM fields_archive_m820_c4q a USING fields x WHERE x.id = a.id AND row_to_json(x)::text = row_to_json(a)::text;

COMMIT;
