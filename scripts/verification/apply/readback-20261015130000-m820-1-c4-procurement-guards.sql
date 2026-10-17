-- Read-back for scripts/migrations/20261015130000_m820_1_c4_procurement_guards.sql (DWA-M 820-1 case C4 finding F1). READ ONLY.
-- Run BEFORE the apply (step 0: R0 … R3) and AFTER (R0 … R4). Expected values: vault 01-Projects/ekowai-wizard/m820-wizard-test/
-- 76_APPLY-ORDER-m820-1-c4-procurement-guards.md and the harness tests/harness/m820-1-c4-procurement-guards.integration.test.ts.
-- Signatures sig0 = prod 2026-10-17 (regenerated; was the harness seed: 2026-10-05 dumps + every M820 block applied on prod up to 20261008100000), sig1 from the
-- harness after the apply. Field signature = md5 of description md5 | visible_when | consumer_worksheets | enum md5 | label_de |
-- label_en | is_required | data_type | verification_quote md5 | source_anchor. Section signature = md5 of visible_when | title_de | code.
-- Unaffected by 20261014100000 (DWA-M 820-2 only) — the same values before and after that block. No comment line ends with a semicolon.

-- R0 · touched rows at pre / post state (before: fields_pre 18, sections_pre 7, *_post 0 · after: 0 / 18 and 0 / 7)
WITH fv(ws, sym, guard, sig0, sig1) AS (VALUES
    ('M820-12','exclusion_123_gwb_checked','L','9cd22ec43c9aaaa68db20aeaefa608ec','e1daa13324885b4bda5d67c737741233'),
    ('M820-12','exclusion_124_gwb_selected','L','5dcf2c69c3b954215c12ee2c019f4b13','dde6437864d16383aa95e6a6233a0595'),
    ('M820-23','information_letters_sent','L','48b72f0e88f750c98d93f9dee0d2989a','24032b094b28b71b853ea718c4afc23a'),
    ('M820-23','electronic_transmission','L','ee591659f884581f6db2a69e3ab6231b','44aaad627cc6e1e4d81c525cdbb6b1db'),
    ('M820-23','contract_invalidity_135_gwb_risk','L','908bde35381b3a8a833cff6f7291d4c6','e7031e81813b25b8bce7064777bf7d1a'),
    ('M820-24','vergabevermerk_complete','L','d97aabb5c7066f7253b323c7eb936a30','2a478c040146e421a99accd1de7144d5'),
    ('M820-24','alle_unterlagen_archiviert','L','c8b338e7dbc29cca3b9b36629c03e809','07a0209742b61b51bad418239e0aec02'),
    ('M820-24','vergabeakte_unterzeichnet','L','589360fbc1c296bf9105fde06e737a0a','47c73b2ba5625c71caf1f9dc5641a34b'),
    ('M820-24','archive_location','L','dcef43c671446a17ab75b824f1af965e','b2ad0b34b5e2720357d1a273a172a343'),
    ('M820-24','final_signoff_date','L','f3d77e9514b525085c126daed37f1dc2','2a4f72beb749c1385df6243b8f210c6c'),
    ('M820-11','mindesteignung_definiert','D','457f0dc5f6fea9918bec5de9d053efea','54e06d6b9366b352fb51a1e70fe73a06'),
    ('M820-11','qualitaets_check_date','D','f07ec5e837e6da9a1f56775d36e8adfb','aa04fdcf2355134797d24a576402cd7f'),
    ('M820-13','liability_insurance_personenschaden','D','9244f366f05e39091f606ee0bf0a1892','9e137ce15d7580c2e63b1c82b5791d7a'),
    ('M820-13','liability_insurance_sonstige','D','0e02b2608059f7dcd3bd338bd6a26acb','21a861b4012d591a69e02dbb7a3bee0b'),
    ('M820-15','documentation_structure','D','3d987952e30cb85d3b4dab0ef63f016e','9f778d8051700def94bfadee6c0d1b46'),
    ('M820-17','date_procurement_start','D','b89c23a93d3ecb03b95cf2461fa098fc','cf43ef41e45f3759e27611647804b96c'),
    ('M820-01','vergaberecht_freiwillig_angewendet','hint','6fccd64e264121e8f2fb040943c5e1c3','cf2c8113ce8ea58e51205103359c76a7'),
    ('M820-10','procurement_procedure','hint','cac88579d920c3b0c3214104010a9766','ec1f9b36bbaf2cb9cd2ad0212b7f72d9')),
sv(ws, code, sig0, sig1) AS (VALUES
    ('M820-09','A','43dd40326d5839cf5946de96549bf4fb','294668f1db4721124e02576c2dfd36bc'),
    ('M820-09','B','6c1970325ca947af0a5574df5f469079','d4995d595d1ca66fb3e95105ec948b8c'),
    ('M820-09','F','966c67a12debc197ecef1cba216f8930','5c4e84c9127c73360bc704f7c08751c6'),
    ('M820-09','J','4ee245735139ae83e50f9b37870abe16','380718c976cade6b976de66972660e12'),
    ('M820-09','K','9d71c96014631fa8342c1a9ead3cab8d','7820ef3befd1a5250899a7c13bdabaaf'),
    ('M820-09','L','a67fcb945ae2e36f9b870af1fac6c6c3','b388eba7230e316a703a26c9c93c0a66'),
    ('M820-09','M','1f7a33700dee9c51ffeabdcd22ebbbaf','fd658ace78d86d821455c1a71e8936da')),
fl AS (SELECT fv.*, md5(concat_ws('|', md5(coalesce(f.description,'')), coalesce(f.visible_when,''), coalesce(array_to_string(f.consumer_worksheets, ','),''), coalesce(md5(f.enum_values::text),''), f.label_de, coalesce(f.label_en,''), f.is_required::text, f.data_type, md5(coalesce(f.verification_quote,'')), coalesce(f.source_anchor,''))) AS sig
         FROM fv JOIN standards s ON s.code = 'DWA-M-820-1' JOIN worksheet_templates w ON w.standard_id = s.id AND w.code = fv.ws
         JOIN fields f ON f.worksheet_template_id = w.id AND f.symbol = fv.sym AND f.active),
sl AS (SELECT sv.*, md5(concat_ws('|', coalesce(ws.visible_when,''), ws.title_de, coalesce(ws.code,''))) AS sig
         FROM sv JOIN standards s ON s.code = 'DWA-M-820-1' JOIN worksheet_templates w ON w.standard_id = s.id AND w.code = sv.ws
         JOIN worksheet_sections ws ON ws.worksheet_template_id = w.id AND ws.code = sv.code)
SELECT (SELECT count(*) FROM fl) AS fields,
       (SELECT count(*) FROM fl WHERE sig = sig0) AS fields_pre,
       (SELECT count(*) FROM fl WHERE sig = sig1) AS fields_post,
       (SELECT count(*) FROM sl) AS sections,
       (SELECT count(*) FROM sl WHERE sig = sig0) AS sections_pre,
       (SELECT count(*) FROM sl WHERE sig = sig1) AS sections_post,
       (SELECT string_agg(ws || ' ' || sym, ',') FROM fl WHERE sig <> sig0 AND sig <> sig1) AS fields_neither,
       (SELECT string_agg(ws || ' ' || code, ',') FROM sl WHERE sig <> sig0 AND sig <> sig1) AS sections_neither;

-- R1 · the rules on M820-09 sections and the 16 guarded fields (before: rule empty everywhere · after: L on M820-09 / -12 / -23 / -24, D on -11 / -13 / -15 / -17)
SELECT w.code AS ws, 'section' AS kind, ws.code AS item, coalesce(ws.visible_when, '') AS rule, '' AS req
  FROM worksheet_sections ws JOIN worksheet_templates w ON w.id = ws.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-1' AND w.code = 'M820-09'
UNION ALL
SELECT w.code, 'field', f.symbol, coalesce(f.visible_when, ''), f.is_required::text
  FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-1' AND f.active AND (w.code, f.symbol) IN (
       ('M820-12', 'exclusion_123_gwb_checked'), ('M820-12', 'exclusion_124_gwb_selected'),
       ('M820-23', 'information_letters_sent'), ('M820-23', 'electronic_transmission'), ('M820-23', 'contract_invalidity_135_gwb_risk'),
       ('M820-24', 'vergabevermerk_complete'), ('M820-24', 'alle_unterlagen_archiviert'), ('M820-24', 'vergabeakte_unterzeichnet'),
       ('M820-24', 'archive_location'), ('M820-24', 'final_signoff_date'),
       ('M820-11', 'mindesteignung_definiert'), ('M820-11', 'qualitaets_check_date'),
       ('M820-13', 'liability_insurance_personenschaden'), ('M820-13', 'liability_insurance_sonstige'),
       ('M820-15', 'documentation_structure'), ('M820-17', 'date_procurement_start'))
 ORDER BY 1, 2, 3;

-- R2 · any time: projects with a private client without funding and their two driver answers (after the apply, Nein hides the L set and direktvergabe the D set)
SELECT p.name AS project, coalesce(fw.value_boolean::text, '(unanswered)') AS vergaberecht_freiwillig_angewendet,
       coalesce(pr.value_enum, '(unanswered)') AS procurement_procedure
  FROM project_parameters pc JOIN projects p ON p.id = pc.project_id JOIN fields fc ON fc.id = pc.field_id AND fc.symbol = 'client_organization_type' AND fc.active
  JOIN worksheet_templates wc ON wc.id = fc.worksheet_template_id AND wc.code = 'M820-01' JOIN standards s ON s.id = wc.standard_id AND s.code = 'DWA-M-820-1'
  LEFT JOIN (project_parameters fw JOIN fields ff ON ff.id = fw.field_id AND ff.symbol = 'vergaberecht_freiwillig_angewendet' AND ff.active
             JOIN worksheet_templates wf ON wf.id = ff.worksheet_template_id AND wf.code = 'M820-01')
         ON fw.project_id = pc.project_id AND wf.standard_id = s.id
  LEFT JOIN (project_parameters pr JOIN fields fp ON fp.id = pr.field_id AND fp.symbol = 'procurement_procedure' AND fp.active
             JOIN worksheet_templates wp ON wp.id = fp.worksheet_template_id AND wp.code = 'M820-10')
         ON pr.project_id = pc.project_id AND wp.standard_id = s.id
 WHERE pc.value_enum = 'privat_ohne_foerderung'
 ORDER BY 1;

-- R3 · any time: DWA-M 820-1 gates (any severity) that read a guarded symbol without being switched off by the same guard. Expect 0 rows
-- before and after (no gate is changed by this block). Part L: the 38 procurement-law symbols (28 of M820-09 + 10 fields) read by a gate
-- whose condition lacks the L clause. Part D: any gate reading one of the 6 competition symbols (none exists).
-- Gates that read L symbols today, all with the L clause: REQ-07, REQ-08, REQ-10, REQ-22, REQ-23, REQ-26 (block), REQ-23-2 (warn).
SELECT 'L' AS guard, w.code AS ws, cr.code, cr.severity, cr.condition
  FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-1'
   AND cr.condition ~ '\m(threshold_status|eu_threshold_value|eu_threshold_review_interval_years|cost_estimate_near_threshold|auftragswert_manipulation_check|loseausnahme_applicable|lot_share_threshold_pct|lot_value_threshold_construction|lot_value_threshold_services|oberschwellig_check|eu_threshold_value_anhb23|eu_threshold_verordnung_anhb23|eu_threshold_konsistent_code|oberschwellig_code|cost_estimate_near_threshold_code|lot_value_threshold_services_calc|lot_value_threshold_construction_calc|lot_share_threshold_pct_calc|eu_threshold_review_interval_years_calc|lose|lose_count|lose_gesamt_eur|lose_gesamt_ok|lose_ausnahme_sum_eur|lose_ausnahme_anteil_pct|lose_ausnahme_max_eur|lose_ausnahme_verletzt|loseausnahme_code|exclusion_123_gwb_checked|exclusion_124_gwb_selected|information_letters_sent|electronic_transmission|contract_invalidity_135_gwb_risk|vergabevermerk_complete|alle_unterlagen_archiviert|vergabeakte_unterzeichnet|archive_location|final_signoff_date)\M'
   AND position($q$client_organization_type != 'privat_ohne_foerderung' OR vergaberecht_freiwillig_angewendet == true$q$ IN cr.condition) = 0
UNION ALL
SELECT 'D', w.code, cr.code, cr.severity, cr.condition
  FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-1'
   AND cr.condition ~ '\m(mindesteignung_definiert|qualitaets_check_date|liability_insurance_personenschaden|liability_insurance_sonstige|documentation_structure|date_procurement_start)\M'
 ORDER BY 1, 2, 3;

-- R4 · after the apply only (the tables exist from then on): archives and ledger (expect 18 / 7 / 25)
SELECT (SELECT count(*) FROM fields_archive_m820_c4g) AS field_archive, (SELECT count(*) FROM worksheet_sections_archive_m820_c4g) AS section_archive,
       (SELECT count(*) FROM m820_c4g_written) AS written;
