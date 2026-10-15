-- Read-back for scripts/migrations/20261015150000_m820_1_c4_phase_drivers.sql (DWA-M 820-1 case C4 F2). READ ONLY.
-- Run BEFORE the apply (step 0: R0 … R4) and AFTER (R0 … R5). Expected values: vault 01-Projects/ekowai-wizard/m820-wizard-test/
-- 78_APPLY-ORDER-m820-1-c4-phase-drivers.md and the harness tests/harness/m820-1-c4-phase-drivers.integration.test.ts. Signatures sig0 come
-- from the harness seed (2026-10-05 dumps + every M820 block applied on prod up to 20261008100000 + 20261015130000), sig1 from the harness
-- after the apply. Field signature = md5 of description md5 | visible_when | consumer_worksheets | enum md5 | label_de | label_en |
-- is_required | data_type | verification_quote md5 | source_anchor. Gate signature = md5 of condition | severity | description md5 |
-- clause_reference. R0 f1_m820_24 = the M820-24 rows carrying the 20261015130000 procurement-law clause (must be 5: the order precondition).
-- No comment line ends with a semicolon.

-- R0 · touched rows at pre / post state + the order precondition (before: fields_pre 24, gates_pre 4, *_post 0, new_drivers 0, f1_m820_24 5 · after: 0 / 24, 0 / 4, new_drivers 1, f1_m820_24 5)
WITH fv(ws, sym, sig0, sig1) AS (VALUES
    ('M820-20','negotiation_rounds','5c51276220ad5097983267d8ba128198','2f947e4c2fef908c854255cd9758bcc1'),
    ('M820-20','verhandlung_datum','1722604343abe301bbf81725a0ed09bf','d498034774957ccf89e57e17368e504a'),
    ('M820-20','verhandlung_thema','757efb729b26ed351c2ed0d4a3f327b0','4a3a929795884e3f27d9c253553766cb'),
    ('M820-20','verhandlung_ergebnis','b44c8b26feccdbe80b6cfd4a3b105743','49828e3a82909ca57820761f86a2d82c'),
    ('M820-20','protokoll_signiert','426e0c88354468e17c0d15799991173b','66b833f1e683008acbca7fdbdf7ceab3'),
    ('M820-21','vertragsentwurf_in_unterlagen','05ea6962c0547871359167e96605aac1','7dbe4c3e407bd2d4e723810034584e2f'),
    ('M820-21','leistung_klar_definiert','6122543809cacca4f6f0938045dd814f','cd35801f92ec05d67d5d14c5112a82a3'),
    ('M820-21','verguetung_geregelt','63dc5ec3cf62aaed2996ba6d09d3ac37','72aea453ba473c2cf669a1ef0d6a4ae4'),
    ('M820-21','gewaehrleistung_geregelt','20a9ae3c780aa716c96722e815e34d12','21100f4f6b6adfb0c4eddd62139dbb0d'),
    ('M820-21','kuendigung_geregelt','d467c7e179217f51cbcd86f9733d35e2','6a5398fd63ca8607500909d7df3873ae'),
    ('M820-21','vertragspruefung_date','bcc27578b49889c27ba4a3f89b5ccd05','a5bb06a9691fe767c499c9b32fdd845e'),
    ('M820-22','haftpflicht_versicherungssumme','58e36245b0d0b55b515e3710216ab354','56cb7cfe1b555bcaf4032742ed2c2026'),
    ('M820-22','berufshaftpflicht_vorhanden','4bd6f76bf215885e7a694fd553529d73','a1e66d25b24f49cfb4bd972508193976'),
    ('M820-22','verschuldensgrenzen_definiert','c572adac8406c565beb8763003e291c9','2e9e5b68fc1bcfd8aef026050254a8fc'),
    ('M820-22','gewaehrleistungszeit_jahre','04d5aa876ea775ce7fce45e5134143d1','86186a80257bbff03758d1799ab18ce3'),
    ('M820-23','award_date','961ee44c450e7723175198dfba6f8a2c','0d4343e4fb672e671268d71b29dcfabe'),
    ('M820-23','contractor_auftragnehmer','2fa8d64a989a3e333158d3fbf05a7523','585ce011753df9ceee6c3da83a1bd613'),
    ('M820-24','vergabevermerk_complete','25c97e9d2e0d242f0d039fff05e8a559','4cddb5f3388620ff7ccae9e7c621690e'),
    ('M820-24','alle_unterlagen_archiviert','72a7504bf0b669f5aca60ea32daae367','d0ca376d815c1a73bf492df07f0663be'),
    ('M820-24','vergabeakte_unterzeichnet','47c73b2ba5625c71caf1f9dc5641a34b','fdd9e75871e2b7c5342e35251938b851'),
    ('M820-24','archive_location','ec7011a103908d2591aaa72e88ce1989','5429cc7e0c5c20c1a2b6f868d5d643db'),
    ('M820-24','final_signoff_date','2a4f72beb749c1385df6243b8f210c6c','64fb5fb376f19367cb5b49d7ff5b420b'),
    ('M820-07','mitigation_plan_date','91c81c8046d450ff5b2859df00742f79','0fb3546ddf485bbbed924e520646c7a2'),
    ('M820-07','mitigation_plan_approved','8bb30cecd45cb463adce769081315ac0','d610cd214e5bf0ca0bb34c4674dbea68')),
gv(ws, code, sig0, sig1) AS (VALUES
    ('M820-20','REQ-20','dd3e806c3cb7ee82bff70f3b4799dd2f','a562091600b15ebef6b3cfc4581e1061'),
    ('M820-21','REQ-21','b06de699fbc5434398913efc6fd438f5','77ef3076cdf27c234f04e627c078c40a'),
    ('M820-24','REQ-23','ce8bac014a8aa078a1364bc2804bb7df','1482aebd6bea6d419c73a5756a5e2790'),
    ('M820-24','REQ-23-2','5a4edf1068f3ce533b88ead3bb44b4be','3df69bd910a197506684d8ae2c4092a9')),
fl AS (SELECT fv.*, md5(concat_ws('|', md5(coalesce(f.description,'')), coalesce(f.visible_when,''), coalesce(array_to_string(f.consumer_worksheets, ','),''), coalesce(md5(f.enum_values::text),''), f.label_de, coalesce(f.label_en,''), f.is_required::text, f.data_type, md5(coalesce(f.verification_quote,'')), coalesce(f.source_anchor,''))) AS sig
         FROM fv JOIN standards s ON s.code = 'DWA-M-820-1' JOIN worksheet_templates w ON w.standard_id = s.id AND w.code = fv.ws
         JOIN fields f ON f.worksheet_template_id = w.id AND f.symbol = fv.sym AND f.active),
gl AS (SELECT gv.*, md5(concat_ws('|', coalesce(cr.condition,''), cr.severity, md5(coalesce(cr.description,'')), coalesce(cr.clause_reference,''))) AS sig
         FROM gv JOIN standards s ON s.code = 'DWA-M-820-1' JOIN worksheet_templates w ON w.standard_id = s.id AND w.code = gv.ws
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
         WHERE s.code = 'DWA-M-820-1' AND w.code = 'M820-20' AND f.symbol = 'phase_auftrag_erteilt') AS new_drivers,
       (SELECT count(*) FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
         WHERE s.code = 'DWA-M-820-1' AND w.code = 'M820-24' AND f.active AND f.visible_when LIKE '%vergaberecht_freiwillig_angewendet == true%') AS f1_m820_24;

-- R1 · rule columns of the touched rows + the new driver (before: guarded fields without the driver clause, driver absent · after: guarded)
SELECT w.code AS ws, 'field' AS kind, f.symbol AS item, coalesce(f.visible_when, '') AS rule, coalesce(array_to_string(f.consumer_worksheets, ','), '') AS consumers, f.is_required::text AS req_or_sev
  FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-1' AND f.active AND (w.code, f.symbol) IN (('M820-20', 'negotiation_rounds'), ('M820-20', 'verhandlung_datum'), ('M820-20', 'verhandlung_thema'), ('M820-20', 'verhandlung_ergebnis'), ('M820-20', 'protokoll_signiert'), ('M820-21', 'vertragsentwurf_in_unterlagen'), ('M820-21', 'leistung_klar_definiert'), ('M820-21', 'verguetung_geregelt'), ('M820-21', 'gewaehrleistung_geregelt'), ('M820-21', 'kuendigung_geregelt'), ('M820-21', 'vertragspruefung_date'), ('M820-22', 'haftpflicht_versicherungssumme'), ('M820-22', 'berufshaftpflicht_vorhanden'), ('M820-22', 'verschuldensgrenzen_definiert'), ('M820-22', 'gewaehrleistungszeit_jahre'), ('M820-23', 'award_date'), ('M820-23', 'contractor_auftragnehmer'), ('M820-24', 'vergabevermerk_complete'), ('M820-24', 'alle_unterlagen_archiviert'), ('M820-24', 'vergabeakte_unterzeichnet'), ('M820-24', 'archive_location'), ('M820-24', 'final_signoff_date'), ('M820-07', 'mitigation_plan_date'), ('M820-07', 'mitigation_plan_approved'), ('M820-20', 'phase_auftrag_erteilt'))
UNION ALL
SELECT w.code, 'gate', cr.code, cr.condition, coalesce(cr.clause_reference, ''), cr.severity
  FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-1' AND (w.code, cr.code) IN (('M820-20', 'REQ-20'), ('M820-21', 'REQ-21'), ('M820-24', 'REQ-23'), ('M820-24', 'REQ-23-2'))
 ORDER BY 1, 2, 3;

-- R2 · any time: saved values on the 23 guarded fields per field (after the apply such a value stays saved; it is hidden while its driver says no)
SELECT w.code AS ws, f.symbol, count(pp.id) AS saved_values
  FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
  LEFT JOIN project_parameters pp ON pp.field_id = f.id
 WHERE s.code = 'DWA-M-820-1' AND f.active AND (w.code, f.symbol) IN (('M820-20', 'negotiation_rounds'), ('M820-20', 'verhandlung_datum'), ('M820-20', 'verhandlung_thema'), ('M820-20', 'verhandlung_ergebnis'), ('M820-20', 'protokoll_signiert'), ('M820-21', 'vertragsentwurf_in_unterlagen'), ('M820-21', 'leistung_klar_definiert'), ('M820-21', 'verguetung_geregelt'), ('M820-21', 'gewaehrleistung_geregelt'), ('M820-21', 'kuendigung_geregelt'), ('M820-21', 'vertragspruefung_date'), ('M820-22', 'haftpflicht_versicherungssumme'), ('M820-22', 'berufshaftpflicht_vorhanden'), ('M820-22', 'verschuldensgrenzen_definiert'), ('M820-22', 'gewaehrleistungszeit_jahre'), ('M820-23', 'award_date'), ('M820-23', 'contractor_auftragnehmer'), ('M820-24', 'vergabevermerk_complete'), ('M820-24', 'alle_unterlagen_archiviert'), ('M820-24', 'vergabeakte_unterzeichnet'), ('M820-24', 'archive_location'), ('M820-24', 'final_signoff_date'), ('M820-07', 'mitigation_plan_date'))
 GROUP BY 1, 2 ORDER BY 1, 2;

-- R3 · any time: 820-1 gates that read a guarded symbol WITHOUT that field's driver in the condition (before: REQ-20, REQ-21, REQ-23, REQ-23-2 · after: 0 rows)
WITH g(sym, drv) AS (VALUES ('negotiation_rounds', 'phase_auftrag_erteilt'), ('verhandlung_datum', 'phase_auftrag_erteilt'), ('verhandlung_thema', 'phase_auftrag_erteilt'), ('verhandlung_ergebnis', 'phase_auftrag_erteilt'), ('protokoll_signiert', 'phase_auftrag_erteilt'), ('vertragsentwurf_in_unterlagen', 'phase_auftrag_erteilt'), ('leistung_klar_definiert', 'phase_auftrag_erteilt'), ('verguetung_geregelt', 'phase_auftrag_erteilt'), ('gewaehrleistung_geregelt', 'phase_auftrag_erteilt'), ('kuendigung_geregelt', 'phase_auftrag_erteilt'), ('vertragspruefung_date', 'phase_auftrag_erteilt'), ('haftpflicht_versicherungssumme', 'phase_auftrag_erteilt'), ('berufshaftpflicht_vorhanden', 'phase_auftrag_erteilt'), ('verschuldensgrenzen_definiert', 'phase_auftrag_erteilt'), ('gewaehrleistungszeit_jahre', 'phase_auftrag_erteilt'), ('award_date', 'phase_auftrag_erteilt'), ('contractor_auftragnehmer', 'phase_auftrag_erteilt'), ('vergabevermerk_complete', 'phase_auftrag_erteilt'), ('alle_unterlagen_archiviert', 'phase_auftrag_erteilt'), ('vergabeakte_unterzeichnet', 'phase_auftrag_erteilt'), ('archive_location', 'phase_auftrag_erteilt'), ('final_signoff_date', 'phase_auftrag_erteilt'), ('mitigation_plan_date', 'mitigation_plan_approved'))
SELECT w.code AS ws, cr.code, cr.severity, g.sym, g.drv
  FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id JOIN standards s ON s.id = w.standard_id, g
 WHERE s.code = 'DWA-M-820-1' AND cr.condition ~ ('(^|[^a-z_])' || g.sym || '($|[^a-z_])') AND cr.condition !~ ('(^|[^a-z_])' || g.drv || '($|[^a-z_])')
 ORDER BY 1, 2, 4;

-- R4 · any time: saved answers on the new driver (before: 0 rows - the field does not exist · after: what the rollback would delete)
SELECT p.name AS project, w.code AS ws, f.symbol, coalesce(pp.value_boolean::text, '(null)') AS value
  FROM project_parameters pp JOIN fields f ON f.id = pp.field_id JOIN worksheet_templates w ON w.id = f.worksheet_template_id
  JOIN standards s ON s.id = w.standard_id JOIN projects p ON p.id = pp.project_id
 WHERE s.code = 'DWA-M-820-1' AND w.code = 'M820-20' AND f.symbol = 'phase_auftrag_erteilt'
 ORDER BY 1, 2, 3;

-- R5 · after the apply only (the tables exist from then on): archives and ledger (expect 4 / 24 / 29, of which fields_new 1)
SELECT (SELECT count(*) FROM compliance_requirements_archive_m820_c4d) AS gate_archive, (SELECT count(*) FROM fields_archive_m820_c4d) AS field_archive,
       (SELECT count(*) FROM m820_c4d_written) AS written, (SELECT count(*) FROM m820_c4d_written WHERE tbl = 'fields_new') AS written_new;
