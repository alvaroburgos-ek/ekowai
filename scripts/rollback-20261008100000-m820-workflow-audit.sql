-- Rollback of scripts/migrations/20261008100000_m820_workflow_audit.sql (DWA-M 820 workflow improvements from the Forscheln audit).
-- Scoped and byte-equal: an archived row is restored ONLY while it is still exactly what the block wrote (md5 in m820_wa_written); a row
-- edited since the apply is left alone (its archive + ledger rows stay and show in read-back R4). Only the columns the block writes are
-- restored (fields: label_de, label_en, description, enum_values, consumer_worksheets, visible_when · gates: condition, description,
-- clause_reference). Nothing is activated or deactivated.
-- The 5 fields the block INSERTED are deleted by (standard, sheet, symbol), together with their saved project values. BEFORE running:
-- read-back R3 lists saved values on the new fields and saved 'wasserwirtschaft' / 'anlassbezogen' answers (those two stay saved although
-- the token leaves the list) - export or change them first if they are to be kept.
-- Restored archive / ledger rows are deleted; the tables stay (empty).
-- Run (from C:\Users\Ekowai\_wt-g2t, which holds .env.local):
--   node scripts/apply-migration.mjs C:\Users\Ekowai\_wt-m820\scripts\rollback-20261008100000-m820-workflow-audit.sql
BEGIN;

CREATE TABLE IF NOT EXISTS compliance_requirements_archive_m820_wa AS SELECT * FROM compliance_requirements WHERE false;
CREATE TABLE IF NOT EXISTS fields_archive_m820_wa AS SELECT * FROM fields WHERE false;
CREATE TABLE IF NOT EXISTS m820_wa_written (tbl text NOT NULL, id uuid NOT NULL, md5 text NOT NULL, PRIMARY KEY (tbl, id));

-- updated rows (only the columns the block writes)
UPDATE compliance_requirements x
   SET condition = a.condition, description = a.description, clause_reference = a.clause_reference
  FROM compliance_requirements_archive_m820_wa a, m820_wa_written w
 WHERE a.id = x.id AND w.tbl = 'compliance_requirements' AND w.id = x.id AND md5(row_to_json(x)::text) = w.md5;
UPDATE fields x
   SET label_de = a.label_de, label_en = a.label_en, description = a.description, enum_values = a.enum_values,
       consumer_worksheets = a.consumer_worksheets, visible_when = a.visible_when
  FROM fields_archive_m820_wa a, m820_wa_written w
 WHERE a.id = x.id AND w.tbl = 'fields' AND w.id = x.id AND md5(row_to_json(x)::text) = w.md5;

-- inserted fields (and their saved project values)
DELETE FROM project_parameters p USING fields f, worksheet_templates w, standards s
 WHERE p.field_id = f.id AND f.worksheet_template_id = w.id AND w.standard_id = s.id
   AND (s.code, w.code, f.symbol) IN (('DWA-M-820-2', '820-2-04', 'weitere_regelwerke'),
                                      ('DWA-M-820-2', '820-2-14', 'oeffentlichkeitsbeteiligung_vorgesehen'),
                                      ('DWA-M-820-2', '820-2-20', 'phase_ausfuehrung_erreicht'),
                                      ('DWA-M-820-2', '820-2-22', 'phase_inbetriebnahme_erreicht'),
                                      ('DWA-M-820-2', '820-2-24', 'phase_gewaehrleistung_erreicht'));
DELETE FROM fields f USING worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id
   AND (s.code, w.code, f.symbol) IN (('DWA-M-820-2', '820-2-04', 'weitere_regelwerke'),
                                      ('DWA-M-820-2', '820-2-14', 'oeffentlichkeitsbeteiligung_vorgesehen'),
                                      ('DWA-M-820-2', '820-2-20', 'phase_ausfuehrung_erreicht'),
                                      ('DWA-M-820-2', '820-2-22', 'phase_inbetriebnahme_erreicht'),
                                      ('DWA-M-820-2', '820-2-24', 'phase_gewaehrleistung_erreicht'));

-- clean-up: archive + ledger rows whose base row equals the archive again
DELETE FROM m820_wa_written w USING compliance_requirements x, compliance_requirements_archive_m820_wa a WHERE w.tbl = 'compliance_requirements' AND x.id = w.id AND a.id = w.id AND row_to_json(x)::text = row_to_json(a)::text;
DELETE FROM m820_wa_written w USING fields x, fields_archive_m820_wa a WHERE w.tbl = 'fields' AND x.id = w.id AND a.id = w.id AND row_to_json(x)::text = row_to_json(a)::text;
DELETE FROM compliance_requirements_archive_m820_wa a USING compliance_requirements x WHERE x.id = a.id AND row_to_json(x)::text = row_to_json(a)::text;
DELETE FROM fields_archive_m820_wa a USING fields x WHERE x.id = a.id AND row_to_json(x)::text = row_to_json(a)::text;

COMMIT;
