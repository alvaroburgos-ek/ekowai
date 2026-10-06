-- Rollback of scripts/migrations/20261006100000_m820_2_structure.sql (DWA-M 820-2 structure block).
-- Scoped: every statement restores ONLY a row that still carries exactly what the block wrote (from the in-transaction archives
-- compliance_requirements_archive_m820_2_structure / fields_archive_m820_2_structure); a row edited since the apply is left
-- alone and shows up in the read-back. Restored archive rows are deleted; the archive tables stay.
-- BEFORE running: read-back R7 counts saved project values on the ten new fields — this rollback DELETES them (the fields are
-- removed). Values typed into fields that were hidden (820-2-18 / 820-2-19) or moved into section C are not touched.
-- Code: the rollback needs no code change (the inherited-carrier read in approval-gate.ts is inert without a contains() gate).
-- Run (from C:\Users\Ekowai\_wt-g2t, which holds .env.local):
--   node scripts/apply-migration.mjs C:\Users\Ekowai\_wt-m820\scripts\rollback-20261006100000-m820-2-structure.sql
BEGIN;

-- 7⁻¹. the new gate (only with the text the block wrote)
DELETE FROM compliance_requirements cr USING worksheet_templates w, standards s
 WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-24'
   AND cr.code = 'REQ-52-2' AND cr.condition = 'IF verantwortung_lph9 != ''entfaellt'' THEN (verantwortlich_lph9_name IS NOT NULL)';

-- 2⁻¹ / 3⁻¹. gate rows back to the archived row (condition, sheet, clause, description, titles) where the block's text is still live
UPDATE compliance_requirements cr
   SET condition = a.condition, worksheet_template_id = a.worksheet_template_id, clause_reference = a.clause_reference,
       description = a.description, title_de = a.title_de, title_en = a.title_en
  FROM compliance_requirements_archive_m820_2_structure a
 WHERE a.id = cr.id
   AND (cr.code, cr.condition) IN (
     ('REQ-19', 'IF verantwortung_lph8 != ''entfaellt'' THEN (qs_plan_lph8_present == true)'),
     ('REQ-43', 'IF verantwortung_lph8 != ''entfaellt'' THEN (quality_supervision_active == true)'),
     ('REQ-44', 'IF verantwortung_lph8 == ''auftragnehmer'' OR verantwortung_lph8 == ''dritter'' THEN (bauueberwachung_competencies == true)'),
     ('REQ-51', 'IF verantwortung_lph9 != ''entfaellt'' THEN (warranty_start_date IS NOT NULL AND warranty_end_date IS NOT NULL)'),
     ('REQ-52', 'IF verantwortung_lph9 != ''entfaellt'' THEN (defect_tracking_active == true)'),
     ('REQ-38', 'IF bauleistungen_vergeben == true THEN (nebenangebote_conditions == true)'),
     ('REQ-39', 'IF bauleistungen_vergeben == true THEN (eignungskriterien_set == true)'),
     ('REQ-40', 'IF bauleistungen_vergeben == true THEN (leistungsbeschreibung_type IS NOT NULL)'),
     ('REQ-41', 'IF bauleistungen_vergeben == true THEN (rahmenterminplan_attached == true)'),
     ('REQ-46', 'IF testbetrieb_vs_abnahme_choice == ''testbetrieb'' OR testbetrieb_vs_abnahme_choice == ''mischform'' THEN (testbetrieb_planned == true)'),
     ('REQ-35', 'IF einleitung_vorhanden == true THEN (discharge_permit_extension IN {"applied","granted","not_required"})'),
     ('REQ-06', 'betrieb_frueh_eingebunden == true'),
     ('REQ-13', 'kostenhinweise_auftragnehmer == true'),
     ('REQ-15', 'kostenziele_aenderungsprozess == true'),
     ('REQ-45', 'change_orders IS EMPTY OR aenderungsmanagement_gefuehrt == true'),
     ('REQ-50', 'inbetriebnahme_organisiert == true'),
     ('REQ-55', 'liability_clarified == true'),
     ('REQ-59', 'IF bim_methode_angewendet == true THEN (bim_basics_established == true)'));
DELETE FROM compliance_requirements_archive_m820_2_structure a USING compliance_requirements cr
 WHERE cr.id = a.id AND cr.condition = a.condition AND cr.worksheet_template_id = a.worksheet_template_id
   AND cr.clause_reference IS NOT DISTINCT FROM a.clause_reference AND cr.description IS NOT DISTINCT FROM a.description
   AND cr.title_de = a.title_de AND cr.title_en IS NOT DISTINCT FROM a.title_en;

-- 6⁻¹. consumer reach back to the archived array where it still equals archive || the codes the block appended
UPDATE fields f
   SET consumer_worksheets = a.consumer_worksheets
  FROM fields_archive_m820_2_structure a
 WHERE a.id = f.id AND f.symbol IN ('testbetrieb_vs_abnahme_choice')
   AND f.consumer_worksheets = COALESCE(a.consumer_worksheets, '{}'::text[])
       || ARRAY(SELECT u.c FROM unnest(CASE f.symbol
                   WHEN 'testbetrieb_vs_abnahme_choice' THEN ARRAY['820-2-22']::text[] END) WITH ORDINALITY AS u(c, o)
                 WHERE NOT (u.c = ANY (COALESCE(a.consumer_worksheets, '{}'::text[]))) ORDER BY u.o);

-- 5⁻¹. visible_when back to the archived value where the block's rule is still live (plain or composed form)
UPDATE fields f
   SET visible_when = a.visible_when
  FROM fields_archive_m820_2_structure a, worksheet_templates w,
       (VALUES ('820-2-18','leistungsbeschreibung_type','bauleistungen_vergeben == true'),
               ('820-2-19','vergabeverfahren_used','bauleistungen_vergeben == true'),
               ('820-2-19','auswahlentscheidung_dokumentiert','bauleistungen_vergeben == true'),
               ('820-2-19','zuschlag_erteilt_datum','bauleistungen_vergeben == true'),
               ('820-2-19','final_contract_value','bauleistungen_vergeben == true'),
               ('820-2-19','vergabesumme_summary_date','bauleistungen_vergeben == true'),
               ('820-2-09','qs_plan_lph8_present','verantwortung_lph8 != ''entfaellt'''),
               ('820-2-20','quality_supervision_active','verantwortung_lph8 != ''entfaellt'''),
               ('820-2-20','bauueberwachung_competencies','verantwortung_lph8 == ''auftragnehmer'' OR verantwortung_lph8 == ''dritter'''),
               ('820-2-24','warranty_start_date','verantwortung_lph9 != ''entfaellt'''),
               ('820-2-24','warranty_end_date','verantwortung_lph9 != ''entfaellt'''),
               ('820-2-24','defect_tracking_active','verantwortung_lph9 != ''entfaellt''')) AS h(ws, sym, rule)
 WHERE a.id = f.id AND w.id = f.worksheet_template_id AND w.code = h.ws AND f.symbol = h.sym
   AND f.visible_when = CASE WHEN a.visible_when IS NULL THEN h.rule ELSE '(' || a.visible_when || ') AND (' || h.rule || ')' END;

-- 4⁻¹. section back to the archived (NULL) section where the field still sits in section C of its own sheet
UPDATE fields f
   SET section_id = a.section_id
  FROM fields_archive_m820_2_structure a, worksheet_sections ws
 WHERE a.id = f.id AND a.section_id IS NULL AND ws.id = f.section_id AND ws.worksheet_template_id = f.worksheet_template_id AND ws.code = 'C'
   AND f.symbol IN ('changed_needs_recognised', 'lph_completed', 'planning_milestones_met', 'cost_estimation_phase_done', 'permitting_complete', 'planning_summary_date', 'vergabeverfahren_used', 'auswahlentscheidung_dokumentiert', 'zuschlag_erteilt_datum', 'final_contract_value', 'vergabesumme_summary_date', 'change_orders', 'oeffentlichkeitsarbeit_durchgefuehrt', 'kommunikations_plan_dokumentiert', 'changes_record_date');

DELETE FROM fields_archive_m820_2_structure a USING fields f
 WHERE f.id = a.id
   AND f.section_id IS NOT DISTINCT FROM a.section_id
   AND f.visible_when IS NOT DISTINCT FROM a.visible_when
   AND f.consumer_worksheets IS NOT DISTINCT FROM a.consumer_worksheets;

-- 1⁻¹. the new fields and their saved values
DELETE FROM project_parameters p USING fields f, worksheet_templates w, standards s
 WHERE p.field_id = f.id AND f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2'
   AND (w.code, f.symbol) IN (('820-2-01','verantwortung_lph0'),('820-2-01','verantwortung_lph8'),('820-2-01','verantwortung_lph9'),('820-2-24','verantwortlich_lph9_name'),('820-2-17','bauleistungen_vergeben'),('820-2-05','betrieb_frueh_eingebunden'),('820-2-08','kostenhinweise_auftragnehmer'),('820-2-08','kostenziele_aenderungsprozess'),('820-2-21','aenderungsmanagement_gefuehrt'),('820-2-22','inbetriebnahme_organisiert'));
DELETE FROM fields f USING worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2'
   AND (w.code, f.symbol) IN (('820-2-01','verantwortung_lph0'),('820-2-01','verantwortung_lph8'),('820-2-01','verantwortung_lph9'),('820-2-24','verantwortlich_lph9_name'),('820-2-17','bauleistungen_vergeben'),('820-2-05','betrieb_frueh_eingebunden'),('820-2-08','kostenhinweise_auftragnehmer'),('820-2-08','kostenziele_aenderungsprozess'),('820-2-21','aenderungsmanagement_gefuehrt'),('820-2-22','inbetriebnahme_organisiert'));

COMMIT;
