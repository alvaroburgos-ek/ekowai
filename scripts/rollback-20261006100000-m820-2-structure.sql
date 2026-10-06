-- Rollback of scripts/migrations/20261006100000_m820_2_structure.sql (DWA-M 820-2 structure block).
-- Scoped: every statement restores ONLY a row that still carries exactly what the block wrote (from the in-transaction archives
-- compliance_requirements_archive_m820_2_structure / fields_archive_m820_2_structure); a row edited since the apply is left
-- alone and shows up in the read-back. Restored archive rows are deleted; the archive tables stay.
-- BEFORE running: read-back R7 counts saved project values on the six new fields — this rollback DELETES them (the fields are
-- removed). Values typed into fields that were hidden (820-2-18 / 820-2-19) or moved into section C are not touched.
-- Code: the rollback needs no code change (the inherited-carrier read in approval-gate.ts is inert without a contains() gate).
-- Run (from C:\Users\Ekowai\_wt-g2t, which holds .env.local):
--   node scripts/apply-migration.mjs C:\Users\Ekowai\_wt-m820\scripts\rollback-20261006100000-m820-2-structure.sql
BEGIN;

-- 2⁻¹ / 3⁻¹. gate rows back to the archived row (condition, sheet, clause, description, titles) where the block's text is still live
UPDATE compliance_requirements cr
   SET condition = a.condition, worksheet_template_id = a.worksheet_template_id, clause_reference = a.clause_reference,
       description = a.description, title_de = a.title_de, title_en = a.title_en
  FROM compliance_requirements_archive_m820_2_structure a
 WHERE a.id = cr.id
   AND (cr.code, cr.condition) IN (
     ('REQ-21', 'IF contains(included_hoai_phases, ''LPH 0 – Bedarfsplanung'') THEN (framework_conditions_clarified == true)'),
     ('REQ-22', 'IF contains(included_hoai_phases, ''LPH 0 – Bedarfsplanung'') THEN (forward_planning_done == true)'),
     ('REQ-23', 'IF contains(included_hoai_phases, ''LPH 0 – Bedarfsplanung'') THEN (changed_needs_recognised == true)'),
     ('REQ-19', 'IF contains(included_hoai_phases, ''LPH 8 – Objektüberwachung (Bauüberwachung)'') THEN (qs_plan_lph8_present == true)'),
     ('REQ-43', 'IF contains(included_hoai_phases, ''LPH 8 – Objektüberwachung (Bauüberwachung)'') THEN (quality_supervision_active == true)'),
     ('REQ-44', 'IF contains(included_hoai_phases, ''LPH 8 – Objektüberwachung (Bauüberwachung)'') THEN (bauueberwachung_competencies == true)'),
     ('REQ-51', 'IF contains(included_hoai_phases, ''LPH 9 – Objektbetreuung'') THEN (warranty_start_date IS NOT NULL AND warranty_end_date IS NOT NULL)'),
     ('REQ-52', 'IF contains(included_hoai_phases, ''LPH 9 – Objektbetreuung'') THEN (defect_tracking_active == true)'),
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
 WHERE a.id = f.id AND f.symbol IN ('included_hoai_phases', 'testbetrieb_vs_abnahme_choice')
   AND f.consumer_worksheets = COALESCE(a.consumer_worksheets, '{}'::text[])
       || ARRAY(SELECT u.c FROM unnest(CASE f.symbol
                   WHEN 'included_hoai_phases' THEN ARRAY['820-2-09','820-2-11','820-2-20','820-2-24']::text[]
                   WHEN 'testbetrieb_vs_abnahme_choice' THEN ARRAY['820-2-22']::text[] END) WITH ORDINALITY AS u(c, o)
                 WHERE NOT (u.c = ANY (COALESCE(a.consumer_worksheets, '{}'::text[]))) ORDER BY u.o);

-- 5⁻¹. visible_when back to the archived value where the block's rule is still live (plain or composed form)
UPDATE fields f
   SET visible_when = a.visible_when
  FROM fields_archive_m820_2_structure a
 WHERE a.id = f.id AND f.symbol IN ('leistungsbeschreibung_type', 'vergabeverfahren_used', 'auswahlentscheidung_dokumentiert', 'zuschlag_erteilt_datum', 'final_contract_value', 'vergabesumme_summary_date')
   AND f.visible_when = CASE WHEN a.visible_when IS NULL THEN 'bauleistungen_vergeben == true' ELSE '(' || a.visible_when || ') AND (bauleistungen_vergeben == true)' END;

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

-- 1⁻¹. the six new fields and their saved values
DELETE FROM project_parameters p USING fields f, worksheet_templates w, standards s
 WHERE p.field_id = f.id AND f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2'
   AND (w.code, f.symbol) IN (('820-2-17','bauleistungen_vergeben'),('820-2-05','betrieb_frueh_eingebunden'),('820-2-08','kostenhinweise_auftragnehmer'),('820-2-08','kostenziele_aenderungsprozess'),('820-2-21','aenderungsmanagement_gefuehrt'),('820-2-22','inbetriebnahme_organisiert'));
DELETE FROM fields f USING worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2'
   AND (w.code, f.symbol) IN (('820-2-17','bauleistungen_vergeben'),('820-2-05','betrieb_frueh_eingebunden'),('820-2-08','kostenhinweise_auftragnehmer'),('820-2-08','kostenziele_aenderungsprozess'),('820-2-21','aenderungsmanagement_gefuehrt'),('820-2-22','inbetriebnahme_organisiert'));

COMMIT;
