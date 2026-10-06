-- Rollback of scripts/migrations/20261006210000_m820_flow_3.sql (M820 flow block 3, data part — identity symbols).
-- Scoped: a row is restored ONLY while it still carries exactly what the block wrote —
--   fields — symbol = the planned new symbol and every other column still equal to the archived row → symbol back;
--   REQ-01 — condition = the archived condition with client_auftraggeber → client_name (and nothing else changed since) → condition back.
-- Only the column the block wrote is restored. A row edited since the apply is left alone and its archive row stays (read-back R2 then shows it). Restored archive rows
-- are deleted; the archive tables stay (empty). Nothing is deactivated or re-activated; project_parameters are not touched.
-- Run (from C:\Users\Ekowai\_wt-g2t, which holds .env.local):
--   node scripts/apply-migration.mjs C:\Users\Ekowai\_wt-m820\scripts\rollback-20261006210000-m820-flow-3.sql
BEGIN;

CREATE TABLE IF NOT EXISTS fields_archive_m820_flow_3 AS SELECT * FROM fields WHERE false;
CREATE TABLE IF NOT EXISTS compliance_requirements_archive_m820_flow_3 AS SELECT * FROM compliance_requirements WHERE false;

UPDATE fields f
   SET symbol = a.symbol
  FROM fields_archive_m820_flow_3 a,
       (VALUES ('project_name_de', 'project_name'), ('project_name_full', 'project_name'), ('project_title', 'project_name'),
               ('client_organization_name', 'client_name'), ('client_organization', 'client_name'), ('client_auftraggeber', 'client_name'),
               ('date_registration', 'registration_date'), ('winning_bidder', 'contractor_auftragnehmer')) AS t(old_symbol, new_symbol)
 WHERE a.id = f.id AND a.symbol = t.old_symbol AND f.symbol = t.new_symbol
   AND (to_jsonb(f) - 'symbol') = (to_jsonb(a) - 'symbol');

UPDATE compliance_requirements cr
   SET condition = a.condition
  FROM compliance_requirements_archive_m820_flow_3 a
 WHERE a.id = cr.id AND cr.worksheet_template_id = a.worksheet_template_id
   AND cr.condition = regexp_replace(a.condition, '\mclient_auftraggeber\M', 'client_name', 'g');

DELETE FROM fields_archive_m820_flow_3 a USING fields f WHERE f.id = a.id AND to_jsonb(f) = to_jsonb(a);
DELETE FROM compliance_requirements_archive_m820_flow_3 a USING compliance_requirements cr WHERE cr.id = a.id AND to_jsonb(cr) = to_jsonb(a);

COMMIT;
