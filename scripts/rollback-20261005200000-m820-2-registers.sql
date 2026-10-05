-- Rollback of scripts/migrations/20261005200000_m820_2_registers.sql (DWA-M 820-2 registers).
-- Scoped: the two edited field rows (change_orders, risk_register) are restored from the in-transaction archive
-- fields_archive_m820_2_registers ONLY where they still carry exactly what the block wrote (a row edited since the apply is
-- left alone and shows up in the read-back R4 / R5). Restored archive rows are deleted; the archive table stays.
-- BEFORE running: read-back R7 counts saved project values on the new registers / counters — this rollback DELETES them
-- (the fields they belong to are removed). Values typed into the two new change_orders columns stay inside the stored
-- change_orders json (rows keep their keys), they are only no longer shown as columns.
-- Run (from C:\Users\Ekowai\_wt-g2t, which holds .env.local):
--   node scripts/apply-migration.mjs C:\Users\Ekowai\_wt-m820\scripts\rollback-20261005200000-m820-2-registers.sql
BEGIN;

-- gate REQ-09-2 (only with the text the block wrote)
DELETE FROM compliance_requirements cr USING worksheet_templates w, standards s
 WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-21'
   AND cr.code = 'REQ-09-2' AND cr.condition = 'change_orders IS EMPTY OR change_orders_ohne_ausloeser_kosten == 0';

-- the seven equations
DELETE FROM equations e USING worksheet_templates w, standards s
 WHERE e.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2'
   AND (w.code, e.equation_number) IN (('820-2-03','820-2-03-D1'),('820-2-03','820-2-03-D2'),('820-2-05','820-2-05-D1'),
        ('820-2-05','820-2-05-D2'),('820-2-06','820-2-06-D3'),('820-2-10','820-2-10-D1'),('820-2-21','820-2-21-D4'));

-- saved values of the new fields, then the fields (three registers + seven counters + risk_mitigation_plan)
DELETE FROM project_parameters p USING fields f, worksheet_templates w, standards s
 WHERE p.field_id = f.id AND f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2'
   AND (w.code, f.symbol) IN (('820-2-03','korrespondenz'),('820-2-03','korrespondenz_count'),('820-2-03','korrespondenz_nachverfolgung_offen'),
        ('820-2-05','projektschritte'),('820-2-05','projektschritte_count'),('820-2-05','projektschritte_offen'),
        ('820-2-06','statusberichte'),('820-2-06','statusberichte_count'),('820-2-10','risiken_count'),
        ('820-2-21','change_orders_ohne_ausloeser_kosten'),('820-2-10','risk_mitigation_plan'));
DELETE FROM fields f USING worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2'
   AND (w.code, f.symbol) IN (('820-2-03','korrespondenz'),('820-2-03','korrespondenz_count'),('820-2-03','korrespondenz_nachverfolgung_offen'),
        ('820-2-05','projektschritte'),('820-2-05','projektschritte_count'),('820-2-05','projektschritte_offen'),
        ('820-2-06','statusberichte'),('820-2-06','statusberichte_count'),('820-2-10','risiken_count'),
        ('820-2-21','change_orders_ohne_ausloeser_kosten'),('820-2-10','risk_mitigation_plan'));

-- change_orders ui_config back to the archived one where it still equals archive + the two appended columns + footer symbol
UPDATE fields f
   SET ui_config = a.ui_config
  FROM fields_archive_m820_2_registers a
 WHERE a.id = f.id AND f.symbol = 'change_orders'
   AND f.ui_config = jsonb_set(jsonb_set(a.ui_config, '{columns}', (a.ui_config->'columns') || '[{"key":"ausloeser","type":"text","label":"Auslöser / Verursacher · Trigger / originator"},{"key":"kostenuebernahme","type":"text","label":"Kostenübernahme · Cost borne by"}]'::jsonb),
                     '{footer}', COALESCE(a.ui_config->'footer', '[]'::jsonb) || '["change_orders_ohne_ausloeser_kosten"]'::jsonb);

-- risk_register back to widget NULL / ui_config NULL / archived section where it still carries the block's register config
UPDATE fields f
   SET widget = a.widget, ui_config = a.ui_config, section_id = a.section_id
  FROM fields_archive_m820_2_registers a
 WHERE a.id = f.id AND f.symbol = 'risk_register'
   AND f.widget = 'register' AND f.ui_config->>'editor' = 'risk_register' AND f.ui_config->'footer' = '["risiken_count"]'::jsonb;

DELETE FROM fields_archive_m820_2_registers a USING fields f
 WHERE f.id = a.id
   AND f.widget IS NOT DISTINCT FROM a.widget
   AND f.ui_config IS NOT DISTINCT FROM a.ui_config
   AND f.section_id IS NOT DISTINCT FROM a.section_id;

COMMIT;
