-- Read-back for scripts/migrations/20261015130000_m820_1_c4_procurement_guards.sql (DWA-M 820-1 case C4 finding F1). READ ONLY.
-- Run BEFORE the apply (step 0: R0 … R3) and AFTER (R0 … R4). Expected values: vault 01-Projects/ekowai-wizard/m820-wizard-test/
-- 76_APPLY-ORDER-m820-1-c4-procurement-guards.md and the harness tests/harness/m820-1-c4-procurement-guards.integration.test.ts.
-- Signatures sig0 come from the harness seed (2026-10-05 dumps + every M820 block applied on prod up to 20261008100000), sig1 from the
-- harness after the apply. Field signature = md5 of description md5 | visible_when | consumer_worksheets | enum md5 | label_de |
-- label_en | is_required | data_type | verification_quote md5 | source_anchor. Section signature = md5 of visible_when | title_de | code.
-- Unaffected by 20261014100000 (DWA-M 820-2 only) — the same values before and after that block. No comment line ends with a semicolon.

-- R0 · touched rows at pre / post state (before: fields_pre 18, sections_pre 7, *_post 0 · after: 0 / 18 and 0 / 7)
WITH fv(ws, sym, guard, sig0, sig1) AS (VALUES
    ('M820-12','exclusion_123_gwb_checked','L','8a4f55d87860495a149a20773b16b0ab','fb69e79a7cebc6bd0a1b307782fa2816'),
    ('M820-12','exclusion_124_gwb_selected','L','a29d9ca9f4c376b38e5a84520c4ee95e','5e72023f78d978fe211fee033977c653'),
    ('M820-23','information_letters_sent','L','4401df0bcdfab77a66ea3498c4ed21f8','0e57871af7ede6c6aa88c7428304b93c'),
    ('M820-23','electronic_transmission','L','48c7957257c29512a09100541ffc5e51','f3024256127861548ef0cf3e26a78b5e'),
    ('M820-23','contract_invalidity_135_gwb_risk','L','e1b8a9868d8be05eb67179ca2a12486b','386be4cc675925ecb8c9d414611fecfc'),
    ('M820-24','vergabevermerk_complete','L','3887ea6e9962db66ac99aa5f9cf95c65','25c97e9d2e0d242f0d039fff05e8a559'),
    ('M820-24','alle_unterlagen_archiviert','L','b633ff2c51bf8b63868fcbae63ca2ae9','72a7504bf0b669f5aca60ea32daae367'),
    ('M820-24','vergabeakte_unterzeichnet','L','589360fbc1c296bf9105fde06e737a0a','47c73b2ba5625c71caf1f9dc5641a34b'),
    ('M820-24','archive_location','L','dcd91a06a09499b03e531ab750324711','ec7011a103908d2591aaa72e88ce1989'),
    ('M820-24','final_signoff_date','L','f3d77e9514b525085c126daed37f1dc2','2a4f72beb749c1385df6243b8f210c6c'),
    ('M820-11','mindesteignung_definiert','D','19f4269309b535eb0e27719af561c801','0c6b04ce25c4aaf1c24c879a54a9e16c'),
    ('M820-11','qualitaets_check_date','D','f07ec5e837e6da9a1f56775d36e8adfb','aa04fdcf2355134797d24a576402cd7f'),
    ('M820-13','liability_insurance_personenschaden','D','b7b2ff375e3c23648a5c8b21c0920fe9','9ccc0e974de5665324687e3878f501b7'),
    ('M820-13','liability_insurance_sonstige','D','8905cd473eaf58f475a14f027662be41','4a266986ee08af336f678170ef24b740'),
    ('M820-15','documentation_structure','D','88a3f1019639ad8ccafe35440b6a0a07','43fc64ae3a581619f344899d490ee562'),
    ('M820-17','date_procurement_start','D','b89c23a93d3ecb03b95cf2461fa098fc','cf43ef41e45f3759e27611647804b96c'),
    ('M820-01','vergaberecht_freiwillig_angewendet','hint','6fccd64e264121e8f2fb040943c5e1c3','b19db154d9a7b88a9e406185b59b7a8f'),
    ('M820-10','procurement_procedure','hint','a0c31e8244a5013dd1c57e01a5b8170e','c480dee5bfa82f8b0e663015287308a2')),
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

-- R3 · any time: 820-1 block gates that read an L-guarded symbol WITHOUT the L clause (expect 0 rows before and after — no gate is changed by this block)
SELECT w.code AS ws, cr.code, cr.severity, cr.condition
  FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-1' AND cr.severity = 'block'
   AND cr.condition ~ '(threshold_status|eu_threshold_value|oberschwellig_check|auftragswert_manipulation_check|exclusion_123_gwb_checked|information_letters_sent|electronic_transmission|contract_invalidity_135_gwb_risk|vergabevermerk_complete|alle_unterlagen_archiviert|vergabeakte_unterzeichnet|final_signoff_date)'
   AND position($q$client_organization_type != 'privat_ohne_foerderung' OR vergaberecht_freiwillig_angewendet == true$q$ IN cr.condition) = 0
 ORDER BY 1, 2;

-- R4 · after the apply only (the tables exist from then on): archives and ledger (expect 18 / 7 / 25)
SELECT (SELECT count(*) FROM fields_archive_m820_c4g) AS field_archive, (SELECT count(*) FROM worksheet_sections_archive_m820_c4g) AS section_archive,
       (SELECT count(*) FROM m820_c4g_written) AS written;
