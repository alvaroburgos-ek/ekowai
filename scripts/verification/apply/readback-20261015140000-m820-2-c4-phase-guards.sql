-- Read-back for scripts/migrations/20261015140000_m820_2_c4_phase_guards.sql (DWA-M 820-2 case C4 F2 / F6). READ ONLY.
-- Run BEFORE the apply (step 0: R0 … R4) and AFTER (R0 … R5). Expected values: vault 01-Projects/ekowai-wizard/m820-wizard-test/
-- 77_APPLY-ORDER-m820-2-c4-phase-guards.md and the harness tests/harness/m820-2-c4-phase-guards.integration.test.ts. Signatures sig0 come
-- = prod 2026-10-17 (regenerated; was the harness seed: 2026-10-05 dumps + every M820 block applied on prod up to 20261008100000), sig1 from the harness after the apply.
-- Field signature = md5 of description md5 | visible_when | consumer_worksheets | enum md5 | label_de | label_en | is_required | data_type |
-- verification_quote md5 | source_anchor. Gate signature = md5 of condition | severity | description md5 | clause_reference.
-- No comment line ends with a semicolon.

-- R0 · touched rows at pre / post state (before: fields_pre 18, gates_pre 5, *_post 0, new_drivers 0 · after: 0 / 18, 0 / 5, new_drivers 3)
WITH fv(ws, sym, sig0, sig1) AS (VALUES
    ('820-2-09','contract_amendments_tracked','8ecd44163de218f50d8b2027c2565dab','e2e0fd227dd6d79227a9fa126aa32bdb'),
    ('820-2-09','approval_procedure_defined','88bc818e61ce17e4abe76e45e7d842b0','1170f82d7026edbfdc9c4cb449b93aec'),
    ('820-2-09','quality_monitoring_active','c7724b4831b817edcb6b61c9528baa70','84197de663c2c25fc4c32e93c4d0a944'),
    ('820-2-09','qs_plan_lph8_present','2d3aa864315d771e14fd955d85b742d4','ac269993005afd468fb5e8a9740056b6'),
    ('820-2-15','planning_summary_date','852683a89742373fb462d4d87b71fafa','0044407dfd784401064aa717dee628d1'),
    ('820-2-19','vergabeverfahren_used','0730fe8162ff707c0e39f8ad1f2f7f17','82b2735681748b740aeb340c08ea0d36'),
    ('820-2-19','auswahlentscheidung_dokumentiert','ebb8b90e641ed12c6cea7c92c9f5f9f4','ebc88190295fb0c4e888b9f62218ed4a'),
    ('820-2-19','zuschlag_erteilt_datum','da2a5e497b6ff4e389243a315bc05bec','d429f2cdc2fd0d68442d7d6e2e80e9fa'),
    ('820-2-19','final_contract_value','9f68a3102b8158d21475b41e389e5e46','dcaae7d8650cd4d0edfea4c35fbc9f26'),
    ('820-2-19','vergabesumme_summary_date','a79fc1a1719233964122b8cf4080bf37','7d20bb6f18008a248c75d708835e1b5a'),
    ('820-2-25','approval_release_process','ad194cd79271b2a0db1774bc654c5236','ba810f8062fa05cdb6f6dc6e8016c3ed'),
    ('820-2-25','guidelines_update_schedule','33c1aab69e99f1aaa5c8c705f1fc003e','86b56b523fb91509a36ec27120809e24'),
    ('820-2-21','changes_record_date','7ec5edf40c9c803786bdc2cab179d6d1','56f3cff96be0bf1de1d2ed6ef00d5d08'),
    ('820-2-21','kommunikations_plan_dokumentiert','026e78c8b0ba168a8ff68f6a188944bf','00382ff77e647997911b3804774af08e'),
    ('820-2-16','permit_conditions_tracked','86087e19b76b2f004c3623ff520bd518','4bb691bc1f55c33008801a92c7613314'),
    ('820-2-04','eigene_regelwerke_vorhanden','7303e8f54248deb96e3c94dfb1abe9ec','54c6d0dabb3c47dc0b5540f0b484d50d'),
    ('820-2-14','oeffentlichkeitsbeteiligung_vorgesehen','43bb8c5c24510530886811964e0e65a9','1c616a11dff660904b36f3a4f1eaee72'),
    ('820-2-20','phase_ausfuehrung_erreicht','37ab930379243190d04b8c31a3abeef2','805ff7c8e12a813b03221f49a0431550')),
gv(ws, code, sig0, sig1) AS (VALUES
    ('820-2-09','REQ-16','c878af5ceae882134b77219b67d2ae68','1586fa188a8e7fb1a8fedecb321495f1'),
    ('820-2-09','REQ-17','a8d3d6fa476f1ce55ee3fe71ae0d3317','266bbdfad56fe944c22842ec577d2a08'),
    ('820-2-09','REQ-18','73a4516f12e5ed3c77c5f3c5f5c48829','2a3fe6857d07a668dc3f6b038d971aeb'),
    ('820-2-09','REQ-19','6b52ba4903bb1f997ce4ab1bc5b799bc','69d9994801060f24335d6125da2a396b'),
    ('820-2-16','REQ-37','4e6d4583e096e1649395faca525b844b','05659845cff02f41fdc2f19defbb83d2')),
fl AS (SELECT fv.*, md5(concat_ws('|', md5(coalesce(f.description,'')), coalesce(f.visible_when,''), coalesce(array_to_string(f.consumer_worksheets, ','),''), coalesce(md5(f.enum_values::text),''), f.label_de, coalesce(f.label_en,''), f.is_required::text, f.data_type, md5(coalesce(f.verification_quote,'')), coalesce(f.source_anchor,''))) AS sig
         FROM fv JOIN standards s ON s.code = 'DWA-M-820-2' JOIN worksheet_templates w ON w.standard_id = s.id AND w.code = fv.ws
         JOIN fields f ON f.worksheet_template_id = w.id AND f.symbol = fv.sym AND f.active),
gl AS (SELECT gv.*, md5(concat_ws('|', coalesce(cr.condition,''), cr.severity, md5(coalesce(cr.description,'')), coalesce(cr.clause_reference,''))) AS sig
         FROM gv JOIN standards s ON s.code = 'DWA-M-820-2' JOIN worksheet_templates w ON w.standard_id = s.id AND w.code = gv.ws
         JOIN compliance_requirements cr ON cr.worksheet_template_id = w.id AND cr.code = gv.code)
SELECT (SELECT count(*) FROM fl) AS fields,
       (SELECT count(*) FROM fl WHERE sig = sig0) AS fields_pre,
       (SELECT count(*) FROM fl WHERE sig = sig1) AS fields_post,
       (SELECT count(*) FROM gl) AS gates,
       (SELECT count(*) FROM gl WHERE sig = sig0) AS gates_pre,
       (SELECT count(*) FROM gl WHERE sig = sig1) AS gates_post,
       (SELECT string_agg(ws || ' ' || sym, ',') FROM fl WHERE sig <> sig0 AND sig <> sig1) AS fields_neither,
       (SELECT string_agg(ws || ' ' || code, ',') FROM gl WHERE sig <> sig0 AND sig <> sig1) AS gates_neither,
       (SELECT count(*) FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
         WHERE s.code = 'DWA-M-820-2' AND (w.code, f.symbol) IN (('820-2-09', 'phase_auftrag_erteilt'), ('820-2-15', 'phase_planung_abgeschlossen'), ('820-2-19', 'phase_vergabe_abgeschlossen'))) AS new_drivers;

-- R1 · rule columns of the touched rows + the new drivers (before: guarded fields without the phase / driver clause, drivers absent · after: guarded)
SELECT w.code AS ws, 'field' AS kind, f.symbol AS item, coalesce(f.visible_when, '') AS rule, coalesce(array_to_string(f.consumer_worksheets, ','), '') AS consumers, f.is_required::text AS req_or_sev
  FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-2' AND f.active AND (w.code, f.symbol) IN (('820-2-09', 'contract_amendments_tracked'), ('820-2-09', 'approval_procedure_defined'), ('820-2-09', 'quality_monitoring_active'), ('820-2-09', 'qs_plan_lph8_present'), ('820-2-15', 'planning_summary_date'), ('820-2-19', 'vergabeverfahren_used'), ('820-2-19', 'auswahlentscheidung_dokumentiert'), ('820-2-19', 'zuschlag_erteilt_datum'), ('820-2-19', 'final_contract_value'), ('820-2-19', 'vergabesumme_summary_date'), ('820-2-25', 'approval_release_process'), ('820-2-25', 'guidelines_update_schedule'), ('820-2-21', 'changes_record_date'), ('820-2-21', 'kommunikations_plan_dokumentiert'), ('820-2-16', 'permit_conditions_tracked'), ('820-2-04', 'eigene_regelwerke_vorhanden'), ('820-2-14', 'oeffentlichkeitsbeteiligung_vorgesehen'), ('820-2-20', 'phase_ausfuehrung_erreicht'), ('820-2-09', 'phase_auftrag_erteilt'), ('820-2-15', 'phase_planung_abgeschlossen'), ('820-2-19', 'phase_vergabe_abgeschlossen'))
UNION ALL
SELECT w.code, 'gate', cr.code, cr.condition, coalesce(cr.clause_reference, ''), cr.severity
  FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-2' AND (w.code, cr.code) IN (('820-2-09', 'REQ-16'), ('820-2-09', 'REQ-17'), ('820-2-09', 'REQ-18'), ('820-2-09', 'REQ-19'), ('820-2-16', 'REQ-37'))
 ORDER BY 1, 2, 3;

-- R2 · any time: saved values on the 15 guarded fields per field (after the apply such a value stays saved; it is hidden while its driver says no)
SELECT w.code AS ws, f.symbol, count(pp.id) AS saved_values
  FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
  LEFT JOIN project_parameters pp ON pp.field_id = f.id
 WHERE s.code = 'DWA-M-820-2' AND f.active AND (w.code, f.symbol) IN (('820-2-09', 'contract_amendments_tracked'), ('820-2-09', 'approval_procedure_defined'), ('820-2-09', 'quality_monitoring_active'), ('820-2-09', 'qs_plan_lph8_present'), ('820-2-15', 'planning_summary_date'), ('820-2-19', 'vergabeverfahren_used'), ('820-2-19', 'auswahlentscheidung_dokumentiert'), ('820-2-19', 'zuschlag_erteilt_datum'), ('820-2-19', 'final_contract_value'), ('820-2-19', 'vergabesumme_summary_date'), ('820-2-25', 'approval_release_process'), ('820-2-25', 'guidelines_update_schedule'), ('820-2-21', 'changes_record_date'), ('820-2-21', 'kommunikations_plan_dokumentiert'), ('820-2-16', 'permit_conditions_tracked'))
 GROUP BY 1, 2 ORDER BY 1, 2;

-- R3 · any time: 820-2 gates that read a guarded symbol WITHOUT that field's driver in the condition (before: REQ-16, REQ-17, REQ-18, REQ-19, REQ-37 · after: 0 rows)
WITH g(sym, drv) AS (VALUES ('contract_amendments_tracked', 'phase_auftrag_erteilt'), ('approval_procedure_defined', 'phase_auftrag_erteilt'), ('quality_monitoring_active', 'phase_auftrag_erteilt'), ('qs_plan_lph8_present', 'phase_auftrag_erteilt'), ('planning_summary_date', 'phase_planung_abgeschlossen'), ('vergabeverfahren_used', 'phase_vergabe_abgeschlossen'), ('auswahlentscheidung_dokumentiert', 'phase_vergabe_abgeschlossen'), ('zuschlag_erteilt_datum', 'phase_vergabe_abgeschlossen'), ('final_contract_value', 'phase_vergabe_abgeschlossen'), ('vergabesumme_summary_date', 'phase_vergabe_abgeschlossen'), ('approval_release_process', 'eigene_regelwerke_vorhanden'), ('guidelines_update_schedule', 'eigene_regelwerke_vorhanden'), ('changes_record_date', 'phase_ausfuehrung_erreicht'), ('kommunikations_plan_dokumentiert', 'oeffentlichkeitsbeteiligung_vorgesehen'), ('permit_conditions_tracked', 'auflagen_count'))
SELECT w.code AS ws, cr.code, cr.severity, g.sym, g.drv
  FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id JOIN standards s ON s.id = w.standard_id, g
 WHERE s.code = 'DWA-M-820-2' AND cr.condition ~ ('(^|[^a-z_])' || g.sym || '($|[^a-z_])') AND cr.condition !~ ('(^|[^a-z_])' || g.drv || '($|[^a-z_])')
 ORDER BY 1, 2, 4;

-- R4 · any time: saved answers on the three new drivers (before: 0 rows - the fields do not exist · after: what the rollback would delete)
SELECT p.name AS project, w.code AS ws, f.symbol, coalesce(pp.value_boolean::text, '(null)') AS value
  FROM project_parameters pp JOIN fields f ON f.id = pp.field_id JOIN worksheet_templates w ON w.id = f.worksheet_template_id
  JOIN standards s ON s.id = w.standard_id JOIN projects p ON p.id = pp.project_id
 WHERE s.code = 'DWA-M-820-2' AND (w.code, f.symbol) IN (('820-2-09', 'phase_auftrag_erteilt'), ('820-2-15', 'phase_planung_abgeschlossen'), ('820-2-19', 'phase_vergabe_abgeschlossen'))
 ORDER BY 1, 2, 3;

-- R5 · after the apply only (the tables exist from then on): archives and ledger (expect 5 / 18 / 26, of which fields_new 3)
SELECT (SELECT count(*) FROM compliance_requirements_archive_m820_c4p) AS gate_archive, (SELECT count(*) FROM fields_archive_m820_c4p) AS field_archive,
       (SELECT count(*) FROM m820_c4p_written) AS written, (SELECT count(*) FROM m820_c4p_written WHERE tbl = 'fields_new') AS written_new;
