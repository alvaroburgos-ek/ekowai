-- Read-back for scripts/migrations/20261007110000_m820_decisions_48_50.sql (DWA-M 820 decisions on 48_ / 50_). READ ONLY.
-- Run BEFORE the apply (step 0: R0 … R4) and AFTER (R0 … R5). Expected values: vault 52_APPLY-ORDER-m820-decisions-48-50.md and the
-- harness tests/harness/m820-decisions-48-50.integration.test.ts. The pre-state tuples in R0 were taken from the LIVE rows (prod-query,
-- 2026-10-07). No comment line ends with a semicolon (prod-query.mjs splits on semicolon + newline).

-- R0 · touched rows at pre / post state (before: gates_pre 22, fields_pre 23, *_post 0, new 0 · after: 0 / 0 / 22 / 23, new_gate 1, new_fields 3)
WITH g(std, ws, code, mc0, sev0, md0, cl0, mc1, sev1, md1, cl1) AS (VALUES
    ('DWA-M-820-1','M820-07','REQ-05','6dd012ea1d023fd20fc913b50b417c6c','warn','5cb1c4411c86e60a87d33e82dba8bfc1','§4.7, Anh. A','6dd012ea1d023fd20fc913b50b417c6c','block','3c996d1d3847d411a55d0286ba95a86a','§4.7, Anh. A'),
    ('DWA-M-820-1','M820-14','REQ-14','d41d8cd98f00b204e9800998ecf8427e','block','8a7fb4c4f16c721e882050f9085c570a','§8.10.3.3, Anh. E.2','6ddc9bb23da8bddaa2a5493ec379587c','block','7ec6cd208b849259970c6b4b8d263bca','§8.10.3.3, Anh. E.2'),
    ('DWA-M-820-1','M820-24','REQ-23','98e4d58354316a03634adc099ca3958b','block','6b17bd8ada43be4479d0e7443fa4777e','§8 VgV, §8.3, Anh. F','98e4d58354316a03634adc099ca3958b','block','4f1056c854e86b9e2762ebd105359077','§8 VgV, §8.3, Anh. F'),
    ('DWA-M-820-2','820-2-09','REQ-17','cb3b7e90c891c4ccc4a3cd2b5fba88b3','block','248981869b0172f40663aa0adfb94cec','§4.6.2','cb3b7e90c891c4ccc4a3cd2b5fba88b3','warn','4a398b1eb80825aded94c420e4133e99','§4.6.2'),
    ('DWA-M-820-2','820-2-09','REQ-18','c8bce2aa4a33660f8d1210a06499f020','block','d972cc4b796f4e9260bd3b917a0129ed','§4.7.1','c8bce2aa4a33660f8d1210a06499f020','warn','863314886aa7ec5c5ce5b05b06685267','§4.7.1'),
    ('DWA-M-820-2','820-2-09','REQ-19','5c0d8aae59b9636817621faabeba73fb','block','e849128b8325f313bd95d3314e3c6af7','§4.7.2','5c0d8aae59b9636817621faabeba73fb','warn','602261a96b86e7a45031e260b17769a2','§4.7.2'),
    ('DWA-M-820-2','820-2-10','REQ-20','6500b0fecae273701c335e0d640f95e4','block','2e114da67021f34639750396b67c28da','§4.8.2','6500b0fecae273701c335e0d640f95e4','warn','be4516e5779572069548188ee740f6fd','§4.8.2'),
    ('DWA-M-820-2','820-2-13','REQ-31','2f413fe89c123b5f5b0ee0144069284b','block','1945ef7adf6b537ea56667df6d821412','§5.3.8','2f413fe89c123b5f5b0ee0144069284b','warn','2fa2a965d6657344432ea17946006f71','§5.3.8'),
    ('DWA-M-820-2','820-2-14','REQ-33','1a6cebeedb45f20dde0a7b7a4a12e426','block','e8d2e8ea9977fe0e6661886969990b8d','§5.3.10, §5.6.5','1a6cebeedb45f20dde0a7b7a4a12e426','warn','f62a7694f3d96698f78a2619512571f4','§5.3.10, §5.6.5'),
    ('DWA-M-820-2','820-2-16','REQ-37','c76cfd2bb7fb44264127def74b1a2c2c','block','93a64afc3e2568689b1921141a62334b','§5.4.5','c76cfd2bb7fb44264127def74b1a2c2c','warn','9f7a95e380ba0061ff9ab1a74782c396','§5.4.5'),
    ('DWA-M-820-2','820-2-17','REQ-39','289c3d782875175301fa9e6cb722d72c','block','0f9249aed0f9c04a5130d077d9363cad','§5.5.2','289c3d782875175301fa9e6cb722d72c','warn','762af87b799db4c439daec34afea0c5a','§5.5.2'),
    ('DWA-M-820-2','820-2-18','REQ-41','e30d2be5b396ae13c8e7fe4d2e8cca2f','block','24d2d2065aafd5319b766ad0d813ac00','§5.5.4','e30d2be5b396ae13c8e7fe4d2e8cca2f','warn','e20e85a89c4f1a6c6b39189f5ab98d4b','§5.5.4'),
    ('DWA-M-820-2','820-2-22','REQ-47','96861060f66a9baf54914986e6f36ef5','block','68771b44579e24b88c64fdb96218d305','§5.7.3, Bild 4','96861060f66a9baf54914986e6f36ef5','warn','888c7e3292151ec4e07298630c5c8017','§5.7.3, Bild 4'),
    ('DWA-M-820-2','820-2-24','REQ-51','85e6d61190b55b287f2ab7eba6a4c6f4','block','a733688e8b130d39c46e298f29101a3d','§5.8.2','2a24260ced0997a34b5316dd739da335','warn','f65d6c9e6bd01de5f633549b6255e0a9','§5.8.2'),
    ('DWA-M-820-2','820-2-24','REQ-52-2','27f1635d9828c83aba9c9852b9563e0c','block','3054349e8987e21d23ed4076f4e7d242','§5.8.3','27f1635d9828c83aba9c9852b9563e0c','warn','777945f07b46ccfd438a0ce48443d432','§5.8.3'),
    ('DWA-M-820-2','820-2-17','REQ-38','81b45839f9c06e780baa7af85982dd84','block','1aa58d5500ff9107e96b1f4ad696ea9a','§5.5.1','b59271599b25d49f57b85d9cc0a3f768','block','33411342f9ed30671dd2f9129b5fab23','§5.5.1'),
    ('DWA-M-820-2','820-2-04','REQ-53','48ec6ee4a18f9194f7d99d6f8caeca71','block','2357a2909945e0b5d1bd3fe4eba36174','§6.3.1, §6.3.2','450b56dfa0d0af9c2c863c4c9a6f7c2b','block','481446ac880036f276a3c05ea9ac965c','§6.3.1, §6.3.2'),
    ('DWA-M-820-2','820-2-25','REQ-54','215c32b968d77da39ef562abcccb2cc5','block','0610e86bc1cbf112c8e998f6ee17df8f','§6.3.1, §6.3.3','d7ed892a9847e3d9190eac714944fe03','block','224a533807e3975281c829fe3984d200','§6.3.1, §6.3.3'),
    ('DWA-M-820-2','820-2-26','REQ-55','43e7f68918642d7be0104cf2399b1ad2','warn','8a1676beaf7617710606b17e56add2cb','§7.5','51f6317a3089c4ec60a094a052661576','block','baddcd67221203e6862a5f57368f024b','§7.3.4, §7.5'),
    ('DWA-M-820-2','820-2-26','REQ-56','143165ae017ac5504f4c18dd0948d8da','block','eebb2d38e53efb0e6b5e2904d5818452','§7.2, §7.6.2','6c942aa3fe67df4437d612e3405d95d1','block','d661f2153a3c84ac92d6a6aa1699ff8c','§7.2, §7.6.2'),
    ('DWA-M-820-2','820-2-27','REQ-57','3f2e24f1b98fd17e62e795b7ffc17552','warn','095af5619688a5d798bb3a9b430522aa','§8.2.1','3f2e24f1b98fd17e62e795b7ffc17552','warn','41028cb1dbcf169bac5144274a33617f','§8.2.1'),
    ('DWA-M-820-3','M8203-20','REQ-27','a5c13b367bfa60edb50edd5d3fc51fa0','warn','d4bf852c5f416ab136a14d9c6364d49b','§7.3','a5c13b367bfa60edb50edd5d3fc51fa0','warn','3835f7365974d0f3d3766c3332800ca6','§7.3')),
f0(std, ws, symbol, k_desc, k_enum, k_cw, k_ord, sig0, sig1) AS (VALUES
    ('DWA-M-820-2','820-2-24','warranty_count',true,false,false,false,'5f645a2b3361bb07eee92680f300261a','6b377a3d3e8fa353ed8678209088f07e'),
    ('DWA-M-820-2','820-2-24','gewaehrleistungen',true,false,false,false,'5b4366812682f1d6e72415110082e0ef','7bb604397c331f9b6db8d4d074e6e3b0'),
    ('DWA-M-820-1','M820-14','award_weight_sum_pct',true,false,false,false,'4c8c83fe872f23642312408e7e5cd2a3','ca9a1488c7041a7f5636f5bb040b919c'),
    ('DWA-M-820-2','820-2-05','projektsteuerung_scope',true,true,false,false,'a5cc4a38e6dbedd62486706cbce5f82c|Risikomanagement','5004909b911f64b090aa04c677b22f29|Risikomanagement (Werkzeug-Option, in § 4.1 nicht genannt)'),
    ('DWA-M-820-1','M820-01','client_organization_type',false,false,true,false,'M820-08,M820-09,M820-04,M820-10,M820-12,M820-17,M820-23,M820-18,M820-20,M820-21,M820-24','M820-08,M820-09,M820-04,M820-10,M820-12,M820-17,M820-23,M820-18,M820-20,M820-21,M820-24,M820-14'),
    ('DWA-M-820-1','M820-01','vergaberecht_freiwillig_angewendet',false,false,true,false,'M820-04,M820-08,M820-09,M820-10,M820-12,M820-17,M820-23,M820-18,M820-20,M820-21,M820-24','M820-04,M820-08,M820-09,M820-10,M820-12,M820-17,M820-23,M820-18,M820-20,M820-21,M820-24,M820-14'),
    ('DWA-M-820-1','M820-10','procurement_procedure',false,false,true,false,'M820-11,M820-16,M820-17,M820-18,M820-19,M820-12,M820-20,M820-21,M820-24','M820-11,M820-16,M820-17,M820-18,M820-19,M820-12,M820-20,M820-21,M820-24,M820-14'),
    ('DWA-M-820-2','820-2-01','project_number',false,false,false,true,'0','1'),
    ('DWA-M-820-2','820-2-01','project_location',false,false,false,true,'0','2'),
    ('DWA-M-820-2','820-2-01','client_name',false,false,false,true,'0','3'),
    ('DWA-M-820-2','820-2-01','client_type',false,false,false,true,'0','4'),
    ('DWA-M-820-2','820-2-01','complexity_level',false,false,false,true,'0','5'),
    ('DWA-M-820-2','820-2-01','included_hoai_phases',false,false,false,true,'0','6'),
    ('DWA-M-820-2','820-2-01','project_category',false,false,false,true,'0','7'),
    ('DWA-M-820-2','820-2-01','project_size',false,false,false,true,'0','8'),
    ('DWA-M-820-2','820-2-01','project_name_short',false,false,false,true,'0','10'),
    ('DWA-M-820-2','820-2-01','primary_sector',false,false,false,true,'0','11'),
    ('DWA-M-820-2','820-2-01','scope_technical',false,false,false,true,'0','12'),
    ('DWA-M-820-2','820-2-01','scope_excluded',false,false,false,true,'0','13'),
    ('DWA-M-820-2','820-2-01','verantwortung_lph0',false,false,false,true,'1','14'),
    ('DWA-M-820-2','820-2-01','verantwortung_lph8',false,false,false,true,'2','15'),
    ('DWA-M-820-2','820-2-01','verantwortung_lph9',false,false,false,true,'3','16'),
    ('DWA-M-820-2','820-2-01','project_size_begruendung',false,false,false,true,'4','9')),
gl AS (SELECT g.*, md5(cr.condition) AS mc, cr.severity AS sev, md5(coalesce(cr.description, '')) AS md, cr.clause_reference AS cl
         FROM g JOIN standards s ON s.code = g.std JOIN worksheet_templates w ON w.standard_id = s.id AND w.code = g.ws
         JOIN compliance_requirements cr ON cr.worksheet_template_id = w.id AND cr.code = g.code),
fl AS (SELECT x.symbol, x.sig0, x.sig1, concat_ws('|', CASE WHEN x.k_desc THEN md5(coalesce(f.description, '')) END, CASE WHEN x.k_enum THEN coalesce((SELECT e->>'label_de' FROM jsonb_array_elements(CASE WHEN jsonb_typeof(f.enum_values) = 'array' THEN f.enum_values ELSE '[]'::jsonb END) e WHERE e->>'value' = 'Risikomanagement'), '') END, CASE WHEN x.k_cw THEN array_to_string(f.consumer_worksheets, ',') END, CASE WHEN x.k_ord THEN f.order_index::text END) AS sig
         FROM f0 x JOIN standards s ON s.code = x.std JOIN worksheet_templates w ON w.standard_id = s.id AND w.code = x.ws
         JOIN fields f ON f.worksheet_template_id = w.id AND f.symbol = x.symbol AND f.active)
SELECT (SELECT count(*) FROM gl) AS gates,
       (SELECT count(*) FROM gl WHERE mc = mc0 AND sev = sev0 AND md = md0 AND cl IS NOT DISTINCT FROM cl0) AS gates_pre,
       (SELECT count(*) FROM gl WHERE mc = mc1 AND sev = sev1 AND md = md1 AND cl IS NOT DISTINCT FROM cl1) AS gates_post,
       (SELECT count(*) FROM fl) AS fields,
       (SELECT count(*) FROM fl WHERE sig = sig0) AS fields_pre,
       (SELECT count(*) FROM fl WHERE sig = sig1) AS fields_post,
       (SELECT string_agg(code, ',') FROM gl WHERE NOT ((mc = mc0 AND sev = sev0 AND md = md0 AND cl IS NOT DISTINCT FROM cl0) OR (mc = mc1 AND sev = sev1 AND md = md1 AND cl IS NOT DISTINCT FROM cl1))) AS gates_neither,
       (SELECT string_agg(symbol, ',') FROM fl WHERE sig <> sig0 AND sig <> sig1) AS fields_neither,
       (SELECT count(*) FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id JOIN standards s ON s.id = w.standard_id
         WHERE s.code = 'DWA-M-820-1' AND w.code = 'M820-24' AND cr.code = 'REQ-23-2' AND cr.severity = 'warn' AND md5(cr.description) = 'd351e2a21b96148eb11dda153e51b08b') AS new_gate,
       (SELECT count(*) FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
         WHERE (s.code, w.code, f.symbol) IN (('DWA-M-820-2','820-2-17','nebenangebote_zugelassen'),('DWA-M-820-2','820-2-04','eigene_regelwerke_vorhanden'),('DWA-M-820-2','820-2-26','innovation_verlangt'))) AS new_fields;

-- R1 · gate severities per standard (before 17/9 · 51/10 · 20/30 · after 18/9 · 40/21 · 20/30)
SELECT s.code AS std, sum((cr.severity = 'block')::int) AS block, sum((cr.severity = 'warn')::int) AS warn, sum((cr.severity NOT IN ('block', 'warn'))::int) AS other
  FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code IN ('DWA-M-820-1', 'DWA-M-820-2', 'DWA-M-820-3') GROUP BY 1 ORDER BY 1;

-- R2 · after: the three driver fields (section B, required boolean, visibility, consumers)
SELECT w.code AS ws, f.symbol, ws.code AS section, f.data_type, f.is_required, f.active, f.visible_when, array_to_string(f.consumer_worksheets, ',') AS consumers, f.order_index
  FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
  LEFT JOIN worksheet_sections ws ON ws.id = f.section_id
 WHERE (s.code, w.code, f.symbol) IN (('DWA-M-820-2','820-2-17','nebenangebote_zugelassen'),('DWA-M-820-2','820-2-04','eigene_regelwerke_vorhanden'),('DWA-M-820-2','820-2-26','innovation_verlangt')) ORDER BY 1;

-- R3 · 50_ PS-1: 820-2-01 section B (before 17 fields, 5 distinct orders, gap 4 · after 17 / 17 / gap 1 = the reason sits directly under project_size)
SELECT count(*) AS b_fields, count(DISTINCT f.order_index) AS distinct_orders,
       max(f.order_index) FILTER (WHERE f.symbol = 'project_size_begruendung') - max(f.order_index) FILTER (WHERE f.symbol = 'project_size') AS gap
  FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
  JOIN worksheet_sections ws ON ws.id = f.section_id
 WHERE s.code = 'DWA-M-820-2' AND w.code = '820-2-01' AND ws.code = 'B' AND f.active;

-- R4 · any time: saved project values on the three driver fields — run BEFORE a rollback (a driver field with values is kept)
SELECT p.name AS project, w.code AS ws, f.symbol, pp.value_boolean
  FROM project_parameters pp JOIN projects p ON p.id = pp.project_id JOIN fields f ON f.id = pp.field_id
  JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE (s.code, w.code, f.symbol) IN (('DWA-M-820-2','820-2-17','nebenangebote_zugelassen'),('DWA-M-820-2','820-2-04','eigene_regelwerke_vorhanden'),('DWA-M-820-2','820-2-26','innovation_verlangt')) ORDER BY 1, 2;

-- R5 · after the apply only (the tables exist from then on): archives and ledgers (expect 22 / 23 / 45 / 4)
SELECT (SELECT count(*) FROM compliance_requirements_archive_m820_d48) AS gate_archive, (SELECT count(*) FROM fields_archive_m820_d48) AS field_archive,
       (SELECT count(*) FROM m820_d48_written) AS written, (SELECT count(*) FROM m820_d48_added) AS added;
