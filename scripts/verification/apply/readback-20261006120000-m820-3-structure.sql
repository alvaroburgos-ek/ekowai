-- Read-back for scripts/migrations/20261006120000_m820_3_structure.sql (DWA-M 820-3 structure block). READ ONLY.
-- Run BEFORE the apply (step 0: R0a, R0b, R0c) and AFTER (R1 to R8). Expected values come from the embedded-Postgres harness
-- tests/harness/m820-3-structure.integration.test.ts (seed = the 2026-10-05 dump). No comment line ends with a semicolon
-- (prod-query.mjs splits on semicolon + newline).

-- R0a · step 0: the 18 gates still carry their 2026-10-05 text on their 2026-10-05 sheet — expect 18 rows, every live_ok = true
SELECT cr.code, w.code AS ws, cr.severity, md5(cr.condition) AS md5_live,
       (cr.code, w.code, md5(cr.condition)) IN (('REQ-06','M8203-04','0affd58587301285dcfc54bbcc92d843'),('REQ-07','M8203-05','5612b4f87ae268f1616687b8d715b29f'),('REQ-08','M8203-06','9e85b07a298062b5b05bab96b1a1268f'),('REQ-09','M8203-11','29a4c4f530f8b72be333e6f142a4cd8f'),('REQ-10','M8203-12','57faec48ebd9616b6c4182d7ad19f224'),('REQ-11','M8203-14','5b7cb97c373a439636d164d0800e7d7e'),('REQ-12','M8203-16','a3f8c74171b63dc09940bb2210d1d98a'),('REQ-13','M8203-17','bd6e7fb5030f38a8d5c8a4c010a0119f'),('REQ-14','M8203-18','ab314d8cdf9a1c35771e0839b3104b4b'),('REQ-25','M8203-19','e102b5ca0ff25be4fc8741b388f4b2ca'),('REQ-26','M8203-19','067d64eaf428b0c70f846b5f52cab711'),('REQ-27','M8203-19','d41d8cd98f00b204e9800998ecf8427e'),('REQ-29','M8203-19','d41d8cd98f00b204e9800998ecf8427e'),('REQ-30','M8203-19','067d64eaf428b0c70f846b5f52cab711'),('REQ-02','M8203-01','d41d8cd98f00b204e9800998ecf8427e'),('REQ-03','M8203-01','d41d8cd98f00b204e9800998ecf8427e'),('REQ-05','M8203-04','d41d8cd98f00b204e9800998ecf8427e'),('REQ-31','M8203-22','d41d8cd98f00b204e9800998ecf8427e')) AS live_ok
  FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-3' AND cr.code IN ('REQ-06','REQ-07','REQ-08','REQ-09','REQ-10','REQ-11','REQ-12','REQ-13','REQ-14','REQ-25','REQ-26','REQ-27','REQ-29','REQ-30','REQ-02','REQ-03','REQ-05','REQ-31')
 ORDER BY 1;

-- R0b · step 0 (MUST-READ): DWA-M 820-3 projects that exist today, with their saved project type (NULL = not answered). After the
--   apply each must answer two NEW required questions (M8203-02 kleiner_kommunaler_betrieb, M8203-19 digitale_methoden_bim_angewendet)
--   and the Phasenziel checks wait while the project type is blank. Status = the M8203-01 instance status
SELECT wi.project_id, p.name AS project, wi.status AS status_m8203_01,
       (SELECT pp.value_enum FROM project_parameters pp JOIN fields f ON f.id = pp.field_id
         WHERE pp.project_id = wi.project_id AND f.worksheet_template_id = w.id AND f.symbol = 'project_type') AS project_type
  FROM worksheet_instances wi JOIN worksheet_templates w ON w.id = wi.worksheet_template_id JOIN standards s ON s.id = w.standard_id
  JOIN projects p ON p.id = wi.project_id
 WHERE s.code = 'DWA-M-820-3' AND w.code = 'M8203-01'
 ORDER BY 2;

-- R0c · step 0: nothing of the block exists yet — expect new_fields 0, new_gates 0, token_enums 0, section_rules 0, pt_all 1 (after the apply: 11, 9, 67, 153, 0)
SELECT (SELECT count(*) FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
         WHERE s.code = 'DWA-M-820-3' AND f.symbol IN ('pz_52_projektstopp_risikoanalyse','pz_53_projektstopp_risikoanalyse','pz_54_projektstopp_risikoanalyse','pz_62_projektstopp_risikoanalyse','pz_63_projektstopp_risikoanalyse','pz_64_projektstopp_risikoanalyse','pz_65_projektstopp_risikoanalyse','pz_66_projektstopp_risikoanalyse','pz_67_projektstopp_risikoanalyse','kleiner_kommunaler_betrieb','digitale_methoden_bim_angewendet')) AS new_fields,
       (SELECT count(*) FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id JOIN standards s ON s.id = w.standard_id
         WHERE s.code = 'DWA-M-820-3' AND cr.code IN ('REQ-06-2','REQ-07-2','REQ-08-2','REQ-09-2','REQ-10-2','REQ-11-2','REQ-12-2','REQ-13-2','REQ-14-2')) AS new_gates,
       (SELECT count(*) FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
         WHERE s.code = 'DWA-M-820-3' AND f.symbol LIKE 'pz\_%\_status' AND f.enum_values @> '[{"value":"noch_nicht_erreicht"}]'::jsonb) AS token_enums,
       (SELECT count(*) FROM worksheet_sections ws JOIN worksheet_templates w ON w.id = ws.worksheet_template_id JOIN standards s ON s.id = w.standard_id
         WHERE s.code = 'DWA-M-820-3' AND ws.visible_when IN ('project_type IN {''gesamtsystem'', ''both''}', 'project_type IN {''einzelprojekt'', ''both''}')) AS section_rules,
       (SELECT count(*) FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
         WHERE s.code = 'DWA-M-820-3' AND w.code = 'M8203-01' AND f.symbol = 'project_type' AND f.consumer_worksheets = ARRAY['ALL']::text[]) AS pt_all;

-- R1 · after: the 18 edited gates + the 9 new ones — sheet, severity (unchanged: 9 block + 9 warn, new: 9 block), cond_ok = true
SELECT cr.code, w.code AS ws, cr.severity, cr.clause_reference,
       (cr.code, w.code, md5(cr.condition)) IN (('REQ-06','M8203-04','77d14757727fe777599269585b1c7307'),('REQ-07','M8203-05','5ee60c9e057ae93a89772607ef800f11'),('REQ-08','M8203-06','eb53307384a0b136f9f06210aff2a38a'),('REQ-09','M8203-11','228bb1d7147e3396b431da16a0be87bb'),('REQ-10','M8203-12','179cbd016843c9a978922a1f8938031b'),('REQ-11','M8203-14','c90bc125c86d72d2981080223b487aa9'),('REQ-12','M8203-16','2ee19c2f38048d3dbe30bbf7b08f7ea9'),('REQ-13','M8203-17','8076577db25657ca87efee701ec42517'),('REQ-14','M8203-18','9f4a2183f18f4b36d3e0193b68fdee36'),('REQ-25','M8203-19','971871b66e1ede33ace5e24b86e73586'),('REQ-26','M8203-19','5d85a8c7e7927f2beaac15aa88005c95'),('REQ-27','M8203-20','a5c13b367bfa60edb50edd5d3fc51fa0'),('REQ-29','M8203-21','2654b1f77fcdfa5524956d634bf3fdf4'),('REQ-30','M8203-21','cf6eadc160de92e142004740f24247ad'),('REQ-02','M8203-02','c586521c4fb7c30e873e8cd08bf60a23'),('REQ-03','M8203-03','135f911de3a337dacfa059d25f4b2d83'),('REQ-05','M8203-02','6c5a4b9087ef2bf7ec91547693ace813'),('REQ-31','M8203-24','31c8d9752b756b46207fa701dcfc1bdd'),('REQ-06-2','M8203-04','c0d4475fb99f56398fedc60a760d20ee'),('REQ-07-2','M8203-05','c50825ad359fedcc3e10958f2b3bf798'),('REQ-08-2','M8203-06','45ceaec4f253adfb2c5e915b50013dd2'),('REQ-09-2','M8203-11','4deecf738b8f7a961936ce44add831d4'),('REQ-10-2','M8203-12','de928cafb161348fce101a8a0f0e27f7'),('REQ-11-2','M8203-14','98b5acb5860fd369d7212a0faba82a04'),('REQ-12-2','M8203-16','04c8cc07d3f20f7ad176003c42c26b3a'),('REQ-13-2','M8203-17','0716a67ebdd97c8af91baa707a03fab9'),('REQ-14-2','M8203-18','ffca5955badb74dc7dcdd692fce0473d')) AS cond_ok
  FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-3' AND cr.code IN ('REQ-06','REQ-07','REQ-08','REQ-09','REQ-10','REQ-11','REQ-12','REQ-13','REQ-14','REQ-25','REQ-26','REQ-27','REQ-29','REQ-30','REQ-02','REQ-03','REQ-05','REQ-31','REQ-06-2','REQ-07-2','REQ-08-2','REQ-09-2','REQ-10-2','REQ-11-2','REQ-12-2','REQ-13-2','REQ-14-2')
 ORDER BY 1;

-- R2 · after: the 11 new fields — sheet, type, section, required (the two drivers), consumers
SELECT w.code AS ws, f.symbol, f.data_type, f.is_required, ws.code AS section, f.consumer_worksheets, f.visible_when
  FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
  LEFT JOIN worksheet_sections ws ON ws.id = f.section_id
 WHERE s.code = 'DWA-M-820-3' AND f.symbol IN ('pz_52_projektstopp_risikoanalyse','pz_53_projektstopp_risikoanalyse','pz_54_projektstopp_risikoanalyse','pz_62_projektstopp_risikoanalyse','pz_63_projektstopp_risikoanalyse','pz_64_projektstopp_risikoanalyse','pz_65_projektstopp_risikoanalyse','pz_66_projektstopp_risikoanalyse','pz_67_projektstopp_risikoanalyse','kleiner_kommunaler_betrieb','digitale_methoden_bim_angewendet')
 ORDER BY 1, 2;

-- R3 · after: Phasenziel enums carrying the new token, per sheet (expect 04: 5, 05: 5, 06: 3, 11: 5, 12: 8, 14: 12, 16: 12, 17: 11, 18: 6 = 67)
SELECT w.code AS ws, count(*) AS with_token
  FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-3' AND f.symbol LIKE 'pz\_%\_status' AND f.enum_values @> '[{"value":"noch_nicht_erreicht"}]'::jsonb
 GROUP BY 1 ORDER BY 1;

-- R4 · after: visible_when on 8 existing fields (grundsatz_two_step_followed, five on M8203-19, two on M8203-21)
SELECT w.code AS ws, f.symbol, f.visible_when
  FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-3' AND (w.code, f.symbol) IN (('M8203-02','grundsatz_two_step_followed'),('M8203-19','aia_available'),('M8203-19','bap_defined'),('M8203-19','bim_project_definition_complete'),('M8203-19','cde_platform_defined'),('M8203-19','digital_twin_after_project'),('M8203-21','bim_communication_interfaces'),('M8203-21','cde_used_for_communication'))
 ORDER BY 1, 2;

-- R5 · after: project_type reach (17 sheets) and the BIM driver reach (M8203-21)
SELECT w.code AS ws, f.symbol, f.consumer_worksheets
  FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-3' AND f.symbol IN ('project_type', 'digitale_methoden_bim_angewendet')
 ORDER BY 1, 2;

-- R6 · after: section rules per sheet — expect 9 per sheet, 8 Gesamtsystem sheets (72) + 9 Projekt sheets (81) = 153
SELECT w.code AS ws, ws.visible_when, count(*) AS sections
  FROM worksheet_sections ws JOIN worksheet_templates w ON w.id = ws.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-3' AND ws.visible_when IS NOT NULL
 GROUP BY 1, 2 ORDER BY 1;

-- R7 · archives (exist only once the block has run) — after the apply: 18 gate rows, 76 field rows, 153 section rows; after a rollback: 0, 0, 0
SELECT (SELECT count(*) FROM compliance_requirements_archive_m820_3_structure) AS gate_archive,
       (SELECT count(*) FROM fields_archive_m820_3_structure) AS field_archive,
       (SELECT count(*) FROM worksheet_sections_archive_m820_3_structure) AS section_archive;

-- R8 · saved project values on the eleven new fields and saved "noch_nicht_erreicht" answers (run before a rollback — it deletes the
--   former and leaves the latter, see the rollback header. After a fresh apply: 0 rows)
SELECT f.symbol, count(*) AS n
  FROM project_parameters p JOIN fields f ON f.id = p.field_id JOIN worksheet_templates w ON w.id = f.worksheet_template_id
  JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-3' AND (f.symbol IN ('pz_52_projektstopp_risikoanalyse','pz_53_projektstopp_risikoanalyse','pz_54_projektstopp_risikoanalyse','pz_62_projektstopp_risikoanalyse','pz_63_projektstopp_risikoanalyse','pz_64_projektstopp_risikoanalyse','pz_65_projektstopp_risikoanalyse','pz_66_projektstopp_risikoanalyse','pz_67_projektstopp_risikoanalyse','kleiner_kommunaler_betrieb','digitale_methoden_bim_angewendet') OR p.value_enum = 'noch_nicht_erreicht')
 GROUP BY 1 ORDER BY 1;
