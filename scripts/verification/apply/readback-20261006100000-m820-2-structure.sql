-- Read-back for scripts/migrations/20261006100000_m820_2_structure.sql (DWA-M 820-2 structure block). READ ONLY.
-- Run BEFORE the apply (step 0: R0a, R0b, R0c) and AFTER (R1 to R7). Expected values come from the embedded-Postgres harness
-- tests/harness/m820-2-structure.integration.test.ts (seed = 2026-10-05 dump + registers block). No comment line ends with a semicolon
-- (prod-query.mjs splits on semicolon + newline).

-- R0a · step 0: the 21 gates still carry their 2026-10-05 text on their 2026-10-05 sheet — expect 21 rows, every live_ok = true
SELECT cr.code, w.code AS ws, cr.severity, md5(cr.condition) AS md5_live,
       (w.code, md5(cr.condition)) IN (('820-2-11','2ba2c857cc940f0b3a22a84ca471e3b8'),('820-2-11','83f45f4cb407540bac4a7e18a975e6df'),('820-2-11','b1731a08be3aa3689fedc52d29271e5a'),('820-2-09','c387849e3a2530250c45899da8fe1a2a'),('820-2-20','0dc27b122a711062b3a39cee51c21d1d'),('820-2-20','50e840f5c37437c90f7bd827c855cfe7'),('820-2-24','113c7ddde973cd282d3bc727d2ddc50e'),('820-2-24','91f722c371adecf920ba417dc4f87002'),('820-2-17','83d8cdd4a19cfa2586d02bb3b72166cb'),('820-2-17','6bbf8408017e86eb5af299489d9ba2b7'),('820-2-18','d4417634fb104153b4002059561b172d'),('820-2-18','520e7f742a64fcc77e86c3a1c2e2d80c'),('820-2-22','eab8c4028cb5e1e3e6076dc369e50b08'),('820-2-16','2bb9d50c92d791a9b0ae64d9702941aa'),('820-2-05','41aa28121b9a19bd7e94c254e75a21a7'),('820-2-05','d41d8cd98f00b204e9800998ecf8427e'),('820-2-06','28203d1792af65496d587eb4aa0937b5'),('820-2-09','cb3b7e90c891c4ccc4a3cd2b5fba88b3'),('820-2-20','d41d8cd98f00b204e9800998ecf8427e'),('820-2-25','d41d8cd98f00b204e9800998ecf8427e'),('820-2-25','d41d8cd98f00b204e9800998ecf8427e')) AS live_ok
  FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-2' AND cr.code IN ('REQ-21','REQ-22','REQ-23','REQ-19','REQ-43','REQ-44','REQ-51','REQ-52','REQ-38','REQ-39','REQ-40','REQ-41','REQ-46','REQ-35','REQ-06','REQ-13','REQ-15','REQ-45','REQ-50','REQ-55','REQ-59')
 ORDER BY 1;

-- R0b · step 0 (MUST-READ): saved contracted-phase selections per project — a project whose selection lacks LPH 0 / LPH 8 / LPH 9
--   has the matching checks switched off after the apply (shown as met). has_lph0/8/9 = the exact stored token is ticked
SELECT p.project_id, jsonb_typeof(p.value_json) AS shape,
       COALESCE(p.value_json->'selected', p.value_json) ? 'LPH 0 – Bedarfsplanung' AS has_lph0,
       COALESCE(p.value_json->'selected', p.value_json) ? 'LPH 8 – Objektüberwachung (Bauüberwachung)' AS has_lph8,
       COALESCE(p.value_json->'selected', p.value_json) ? 'LPH 9 – Objektbetreuung' AS has_lph9
  FROM project_parameters p JOIN fields f ON f.id = p.field_id JOIN worksheet_templates w ON w.id = f.worksheet_template_id
  JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-2' AND w.code = '820-2-01' AND f.symbol = 'included_hoai_phases'
 ORDER BY 1;

-- R0c · step 0: nothing of the block exists yet — expect new_fields 0, sectionless 15 (after the apply: 6 and 0)
SELECT (SELECT count(*) FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
         WHERE s.code = 'DWA-M-820-2' AND f.symbol IN ('bauleistungen_vergeben','betrieb_frueh_eingebunden','kostenhinweise_auftragnehmer','kostenziele_aenderungsprozess','aenderungsmanagement_gefuehrt','inbetriebnahme_organisiert')) AS new_fields,
       (SELECT count(*) FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
         WHERE s.code = 'DWA-M-820-2' AND f.section_id IS NULL AND (w.code, f.symbol) IN (('820-2-11','changed_needs_recognised'),('820-2-15','lph_completed'),('820-2-15','planning_milestones_met'),('820-2-15','cost_estimation_phase_done'),('820-2-15','permitting_complete'),('820-2-15','planning_summary_date'),('820-2-19','vergabeverfahren_used'),('820-2-19','auswahlentscheidung_dokumentiert'),('820-2-19','zuschlag_erteilt_datum'),('820-2-19','final_contract_value'),('820-2-19','vergabesumme_summary_date'),('820-2-21','change_orders'),('820-2-21','oeffentlichkeitsarbeit_durchgefuehrt'),('820-2-21','kommunikations_plan_dokumentiert'),('820-2-21','changes_record_date'))) AS sectionless;

-- R1 · after: the 21 gates — sheet, severity unchanged (11 block / 10 warn, as before), the block's condition (cond_ok = true)
SELECT cr.code, w.code AS ws, cr.severity, cr.clause_reference,
       (cr.code, cr.condition) IN (('REQ-21','IF contains(included_hoai_phases, ''LPH 0 – Bedarfsplanung'') THEN (framework_conditions_clarified == true)'),('REQ-22','IF contains(included_hoai_phases, ''LPH 0 – Bedarfsplanung'') THEN (forward_planning_done == true)'),('REQ-23','IF contains(included_hoai_phases, ''LPH 0 – Bedarfsplanung'') THEN (changed_needs_recognised == true)'),('REQ-19','IF contains(included_hoai_phases, ''LPH 8 – Objektüberwachung (Bauüberwachung)'') THEN (qs_plan_lph8_present == true)'),('REQ-43','IF contains(included_hoai_phases, ''LPH 8 – Objektüberwachung (Bauüberwachung)'') THEN (quality_supervision_active == true)'),('REQ-44','IF contains(included_hoai_phases, ''LPH 8 – Objektüberwachung (Bauüberwachung)'') THEN (bauueberwachung_competencies == true)'),('REQ-51','IF contains(included_hoai_phases, ''LPH 9 – Objektbetreuung'') THEN (warranty_start_date IS NOT NULL AND warranty_end_date IS NOT NULL)'),('REQ-52','IF contains(included_hoai_phases, ''LPH 9 – Objektbetreuung'') THEN (defect_tracking_active == true)'),('REQ-38','IF bauleistungen_vergeben == true THEN (nebenangebote_conditions == true)'),('REQ-39','IF bauleistungen_vergeben == true THEN (eignungskriterien_set == true)'),('REQ-40','IF bauleistungen_vergeben == true THEN (leistungsbeschreibung_type IS NOT NULL)'),('REQ-41','IF bauleistungen_vergeben == true THEN (rahmenterminplan_attached == true)'),('REQ-46','IF testbetrieb_vs_abnahme_choice == ''testbetrieb'' OR testbetrieb_vs_abnahme_choice == ''mischform'' THEN (testbetrieb_planned == true)'),('REQ-35','IF einleitung_vorhanden == true THEN (discharge_permit_extension IN {"applied","granted","not_required"})'),('REQ-06','betrieb_frueh_eingebunden == true'),('REQ-13','kostenhinweise_auftragnehmer == true'),('REQ-15','kostenziele_aenderungsprozess == true'),('REQ-45','change_orders IS EMPTY OR aenderungsmanagement_gefuehrt == true'),('REQ-50','inbetriebnahme_organisiert == true'),('REQ-55','liability_clarified == true'),('REQ-59','IF bim_methode_angewendet == true THEN (bim_basics_established == true)')) AS cond_ok
  FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-2' AND cr.code IN ('REQ-21','REQ-22','REQ-23','REQ-19','REQ-43','REQ-44','REQ-51','REQ-52','REQ-38','REQ-39','REQ-40','REQ-41','REQ-46','REQ-35','REQ-06','REQ-13','REQ-15','REQ-45','REQ-50','REQ-55','REQ-59')
 ORDER BY 1;

-- R2 · after: the 6 new boolean fields — sheet, section, required (only bauleistungen_vergeben), consumers
SELECT w.code AS ws, f.symbol, f.data_type, f.is_required, ws.code AS section, f.consumer_worksheets
  FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
  LEFT JOIN worksheet_sections ws ON ws.id = f.section_id
 WHERE s.code = 'DWA-M-820-2' AND f.symbol IN ('bauleistungen_vergeben','betrieb_frueh_eingebunden','kostenhinweise_auftragnehmer','kostenziele_aenderungsprozess','aenderungsmanagement_gefuehrt','inbetriebnahme_organisiert')
 ORDER BY 1, 2;

-- R3 · after: the 15 formerly sectionless fields — expect section C on all 15
SELECT w.code AS ws, f.symbol, ws.code AS section
  FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
  LEFT JOIN worksheet_sections ws ON ws.id = f.section_id
 WHERE s.code = 'DWA-M-820-2' AND (w.code, f.symbol) IN (('820-2-11','changed_needs_recognised'),('820-2-15','lph_completed'),('820-2-15','planning_milestones_met'),('820-2-15','cost_estimation_phase_done'),('820-2-15','permitting_complete'),('820-2-15','planning_summary_date'),('820-2-19','vergabeverfahren_used'),('820-2-19','auswahlentscheidung_dokumentiert'),('820-2-19','zuschlag_erteilt_datum'),('820-2-19','final_contract_value'),('820-2-19','vergabesumme_summary_date'),('820-2-21','change_orders'),('820-2-21','oeffentlichkeitsarbeit_durchgefuehrt'),('820-2-21','kommunikations_plan_dokumentiert'),('820-2-21','changes_record_date'))
 ORDER BY 1, 2;

-- R4 · after: visible_when on the six award-only entries — expect bauleistungen_vergeben == true
SELECT w.code AS ws, f.symbol, f.visible_when
  FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-2' AND (w.code, f.symbol) IN (('820-2-18','leistungsbeschreibung_type'),('820-2-19','vergabeverfahren_used'),('820-2-19','auswahlentscheidung_dokumentiert'),('820-2-19','zuschlag_erteilt_datum'),('820-2-19','final_contract_value'),('820-2-19','vergabesumme_summary_date'))
 ORDER BY 1, 2;

-- R5 · after: consumer reach of the two drivers on other sheets
SELECT w.code AS ws, f.symbol, f.consumer_worksheets
  FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-2' AND f.symbol IN ('included_hoai_phases','testbetrieb_vs_abnahme_choice')
 ORDER BY 1, 2;

-- R6 · archives (exist only once the block has run) — after the apply: 21 gate rows, 17 field rows (testbetrieb_vs_abnahme_choice is archived only if its reach lacks 820-2-22), after a rollback: 0 and 0
SELECT (SELECT count(*) FROM compliance_requirements_archive_m820_2_structure) AS gate_archive,
       (SELECT count(*) FROM fields_archive_m820_2_structure) AS field_archive;

-- R7 · saved project values on the six new fields (run before a rollback — the rollback deletes them. After a fresh apply: 0 rows)
SELECT f.symbol, count(*) AS n
  FROM project_parameters p JOIN fields f ON f.id = p.field_id JOIN worksheet_templates w ON w.id = f.worksheet_template_id
  JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-2' AND f.symbol IN ('bauleistungen_vergeben','betrieb_frueh_eingebunden','kostenhinweise_auftragnehmer','kostenziele_aenderungsprozess','aenderungsmanagement_gefuehrt','inbetriebnahme_organisiert')
 GROUP BY 1 ORDER BY 1;
