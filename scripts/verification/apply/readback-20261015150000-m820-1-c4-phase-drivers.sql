-- Read-back for scripts/migrations/20261015150000_m820_1_c4_phase_drivers.sql (DWA-M 820-1 case C4 F2). READ ONLY.
-- Run BEFORE the apply (step 0: R0 … R4) and AFTER (R0 … R5). Expected values: vault 01-Projects/ekowai-wizard/m820-wizard-test/
-- 78_APPLY-ORDER-m820-1-c4-phase-drivers.md and the harness tests/harness/m820-1-c4-phase-drivers.integration.test.ts. Signatures sig0 come
-- = prod 2026-10-17 + 20261015130000 (regenerated; was the harness seed: 2026-10-05 dumps + every M820 block applied on prod up to 20261008100000 + 20261015130000), sig1 from the harness
-- after the apply. Field signature = md5 of description md5 | visible_when | consumer_worksheets | enum md5 | label_de | label_en |
-- is_required | data_type | verification_quote md5 | source_anchor. Gate signature = md5 of condition | severity | description md5 |
-- clause_reference. R0 f1_m820_24 = the M820-24 rows carrying the 20261015130000 procurement-law clause (must be 5: the order precondition).
-- No comment line ends with a semicolon.

-- R0 · touched rows at pre / post state + the order precondition (before: fields_pre 24, gates_pre 4, *_post 0, new_drivers 0, f1_m820_24 5 · after: 0 / 24, 0 / 4, new_drivers 2, f1_m820_24 5)
WITH fv(ws, sym, sig0, sig1) AS (VALUES
    ('M820-20','negotiation_rounds','b57328a990c0ddb1d0fcf294d793432c','cf57ffc4203b986d323b4e7d76283249'),
    ('M820-20','verhandlung_datum','1722604343abe301bbf81725a0ed09bf','1fd12dfd8e3db68a53eedc0bbd904e93'),
    ('M820-20','verhandlung_thema','19aab299230b3dfca77f6d5cc7e38e82','16c0cf5c6978f7cd746d27b49085f6ff'),
    ('M820-20','verhandlung_ergebnis','e847875c27779ac01dc15c1141f55b71','d4085a018f8f70e0c984451e7ac68e42'),
    ('M820-20','protokoll_signiert','426e0c88354468e17c0d15799991173b','92f433fcd11524e635e29a0f1f38c5b2'),
    ('M820-21','vertragsentwurf_in_unterlagen','fcf3edaa02918bc67ed87b62923ab3d5','e19cd7e4baedb46bf5216a5f2c15a982'),
    ('M820-21','leistung_klar_definiert','42719763ab51d89a627c62e7f677fc76','68be331bc78d7e225e878c44581a9f3d'),
    ('M820-21','verguetung_geregelt','2946c7a9c29996d9b5dd23ad53f0ec57','f935c3ec4a05a231181384e1f869c7fd'),
    ('M820-21','gewaehrleistung_geregelt','6337eaf8c05fbee001c7b18b552a7b51','52cb243fdd76f08a46b7125bcd57e25e'),
    ('M820-21','kuendigung_geregelt','be904d4ebeb7022e00529b25f2e483da','b21c4610382d83a38310e04da64e811a'),
    ('M820-21','vertragspruefung_date','bcc27578b49889c27ba4a3f89b5ccd05','0ec6f04fa7a9bde2b8ac3f1c5b622e8d'),
    ('M820-22','haftpflicht_versicherungssumme','df6e36fb26c78c27ca1727492a412839','42c5d6576020170fc6bcb674fcb14202'),
    ('M820-22','berufshaftpflicht_vorhanden','0285e27f4101509ffbfa0699c5823977','c654502aa64a5920e0c7680accd3025e'),
    ('M820-22','verschuldensgrenzen_definiert','faff3154a3713a7b80485c8abe476acf','c0d9a0cec1acb401f6677e29f1c5b32e'),
    ('M820-22','gewaehrleistungszeit_jahre','59c185e191ecf6f9007827291f3150dc','c53c69443cdb0d695fba8ed92121e54c'),
    ('M820-23','award_date','a091745fe91e9214d7bc568bceac0eef','44fd27b94bdd14562ab685ea5da39675'),
    ('M820-23','contractor_auftragnehmer','478dcd4cf4ac1c5c82bc5986fe60478d','8b25e9825d70703e4360953d8ef6e212'),
    ('M820-24','vergabevermerk_complete','2a478c040146e421a99accd1de7144d5','a9879bf7b126a379d15c2aa569100de7'),
    ('M820-24','alle_unterlagen_archiviert','07a0209742b61b51bad418239e0aec02','8dcb8065254dbac83b5a9463f77d54ac'),
    ('M820-24','vergabeakte_unterzeichnet','47c73b2ba5625c71caf1f9dc5641a34b','34eac289dd47a46369a7932b83b1598a'),
    ('M820-24','archive_location','b2ad0b34b5e2720357d1a273a172a343','d82e7dae45d61bb66e17bbe5407256ac'),
    ('M820-24','final_signoff_date','2a4f72beb749c1385df6243b8f210c6c','3ca07396de23c4c8800fdcf5e80fe5fa'),
    ('M820-07','mitigation_plan_date','91c81c8046d450ff5b2859df00742f79','1a0a9ff0c66ea518cc1d6ede6be5bedd'),
    ('M820-07','mitigation_plan_approved','8bb30cecd45cb463adce769081315ac0','d610cd214e5bf0ca0bb34c4674dbea68')),
gv(ws, code, sig0, sig1) AS (VALUES
    ('M820-20','REQ-20','dd3e806c3cb7ee82bff70f3b4799dd2f','df35f32a4db44d27fce0c5e126e55658'),
    ('M820-21','REQ-21','b06de699fbc5434398913efc6fd438f5','dfaad05d3bcfbb18edffc5e98f249e45'),
    ('M820-24','REQ-23','ce8bac014a8aa078a1364bc2804bb7df','01acc19db2847dbdbba3d24234c147d1'),
    ('M820-24','REQ-23-2','5a4edf1068f3ce533b88ead3bb44b4be','af7100f51e01808fa7e0e02c73a7eab9')),
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
         WHERE s.code = 'DWA-M-820-1' AND (w.code, f.symbol) IN (('M820-17', 'phase_vergabeverfahren_erreicht'), ('M820-23', 'phase_auftrag_erteilt'))) AS new_drivers,
       (SELECT count(*) FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
         WHERE s.code = 'DWA-M-820-1' AND w.code = 'M820-24' AND f.active AND f.visible_when LIKE '%vergaberecht_freiwillig_angewendet == true%') AS f1_m820_24;

-- R1 · rule columns of the touched rows + the two new drivers (before: guarded fields without a driver clause, drivers absent · after: guarded)
SELECT w.code AS ws, 'field' AS kind, f.symbol AS item, coalesce(f.visible_when, '') AS rule, coalesce(array_to_string(f.consumer_worksheets, ','), '') AS consumers, f.is_required::text AS req_or_sev
  FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-1' AND f.active AND (w.code, f.symbol) IN (('M820-20', 'negotiation_rounds'), ('M820-20', 'verhandlung_datum'), ('M820-20', 'verhandlung_thema'), ('M820-20', 'verhandlung_ergebnis'), ('M820-20', 'protokoll_signiert'), ('M820-21', 'vertragsentwurf_in_unterlagen'), ('M820-21', 'leistung_klar_definiert'), ('M820-21', 'verguetung_geregelt'), ('M820-21', 'gewaehrleistung_geregelt'), ('M820-21', 'kuendigung_geregelt'), ('M820-21', 'vertragspruefung_date'), ('M820-22', 'haftpflicht_versicherungssumme'), ('M820-22', 'berufshaftpflicht_vorhanden'), ('M820-22', 'verschuldensgrenzen_definiert'), ('M820-22', 'gewaehrleistungszeit_jahre'), ('M820-23', 'award_date'), ('M820-23', 'contractor_auftragnehmer'), ('M820-24', 'vergabevermerk_complete'), ('M820-24', 'alle_unterlagen_archiviert'), ('M820-24', 'vergabeakte_unterzeichnet'), ('M820-24', 'archive_location'), ('M820-24', 'final_signoff_date'), ('M820-07', 'mitigation_plan_date'), ('M820-07', 'mitigation_plan_approved'), ('M820-17', 'phase_vergabeverfahren_erreicht'), ('M820-23', 'phase_auftrag_erteilt'))
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
WITH g(sym, drv) AS (VALUES ('negotiation_rounds', 'phase_vergabeverfahren_erreicht'), ('verhandlung_datum', 'phase_vergabeverfahren_erreicht'), ('verhandlung_thema', 'phase_vergabeverfahren_erreicht'), ('verhandlung_ergebnis', 'phase_vergabeverfahren_erreicht'), ('protokoll_signiert', 'phase_vergabeverfahren_erreicht'), ('vertragsentwurf_in_unterlagen', 'phase_vergabeverfahren_erreicht'), ('leistung_klar_definiert', 'phase_vergabeverfahren_erreicht'), ('verguetung_geregelt', 'phase_vergabeverfahren_erreicht'), ('gewaehrleistung_geregelt', 'phase_vergabeverfahren_erreicht'), ('kuendigung_geregelt', 'phase_vergabeverfahren_erreicht'), ('vertragspruefung_date', 'phase_vergabeverfahren_erreicht'), ('haftpflicht_versicherungssumme', 'phase_vergabeverfahren_erreicht'), ('berufshaftpflicht_vorhanden', 'phase_vergabeverfahren_erreicht'), ('verschuldensgrenzen_definiert', 'phase_vergabeverfahren_erreicht'), ('gewaehrleistungszeit_jahre', 'phase_vergabeverfahren_erreicht'), ('award_date', 'phase_auftrag_erteilt'), ('contractor_auftragnehmer', 'phase_auftrag_erteilt'), ('vergabevermerk_complete', 'phase_auftrag_erteilt'), ('alle_unterlagen_archiviert', 'phase_auftrag_erteilt'), ('vergabeakte_unterzeichnet', 'phase_auftrag_erteilt'), ('archive_location', 'phase_auftrag_erteilt'), ('final_signoff_date', 'phase_auftrag_erteilt'), ('mitigation_plan_date', 'mitigation_plan_approved'))
SELECT w.code AS ws, cr.code, cr.severity, g.sym, g.drv
  FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id JOIN standards s ON s.id = w.standard_id, g
 WHERE s.code = 'DWA-M-820-1' AND cr.condition ~ ('(^|[^a-z_])' || g.sym || '($|[^a-z_])') AND cr.condition !~ ('(^|[^a-z_])' || g.drv || '($|[^a-z_])')
 ORDER BY 1, 2, 4;

-- R4 · any time: saved answers on the two new drivers (before: 0 rows - the fields do not exist · after: what the rollback would delete)
SELECT p.name AS project, w.code AS ws, f.symbol, coalesce(pp.value_boolean::text, '(null)') AS value
  FROM project_parameters pp JOIN fields f ON f.id = pp.field_id JOIN worksheet_templates w ON w.id = f.worksheet_template_id
  JOIN standards s ON s.id = w.standard_id JOIN projects p ON p.id = pp.project_id
 WHERE s.code = 'DWA-M-820-1' AND (w.code, f.symbol) IN (('M820-17', 'phase_vergabeverfahren_erreicht'), ('M820-23', 'phase_auftrag_erteilt'))
 ORDER BY 1, 2, 3;

-- R5 · after the apply only (the tables exist from then on): archives and ledger (expect 4 / 24 / 30, of which fields_new 2)
SELECT (SELECT count(*) FROM compliance_requirements_archive_m820_c4d) AS gate_archive, (SELECT count(*) FROM fields_archive_m820_c4d) AS field_archive,
       (SELECT count(*) FROM m820_c4d_written) AS written, (SELECT count(*) FROM m820_c4d_written WHERE tbl = 'fields_new') AS written_new;
