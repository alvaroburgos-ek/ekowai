-- Read-back for scripts/migrations/20261007120000_m820_small_fixes.sql (DWA-M 820 small fixes). READ ONLY.
-- Run BEFORE the apply (step 0: R0 … R3) and AFTER (R0 … R4). Expected values: vault 60_APPLY-ORDER-m820-small-fixes.md and the
-- harness tests/harness/m820-small-fixes.integration.test.ts. The pre-state signatures in R0 were taken from the LIVE rows (prod-query,
-- 2026-10-07). No comment line ends with a semicolon (prod-query.mjs splits on semicolon + newline).

-- R0 · touched rows at pre / post state (before: gates_pre 2, fields_pre 10, *_post 0 · after: 0 / 0 / 2 / 10)
WITH g(std, ws, code, sig0, sig1) AS (VALUES
    ('DWA-M-820-2','820-2-24','REQ-51','2a24260ced0997a34b5316dd739da335|warn|f65d6c9e6bd01de5f633549b6255e0a9','17f9543709f7909965c17586b86082d8|warn|716285c2ec127c1e1491caeb8ae905cc'),
    ('DWA-M-820-2','820-2-24','REQ-52','ac82bc47d7fa8a498f4ea2193993b3e5|block|3417a3f5501c220674e71a863f5b6dcb','6b4bdc60e616858891b5c040de9fcfc7|block|407b153ede9f940e1d2e4a9b5950c28d')),
f0(std, ws, symbol, sig0, sig1) AS (VALUES
    ('DWA-M-820-2','820-2-17','bauleistungen_vergeben','e1ac61e5749eeff30e82d8e1ce62970a|d41d8cd98f00b204e9800998ecf8427e|820-2-18,820-2-19|','5df66ffae4555fa4139e2556ab2203c6|d41d8cd98f00b204e9800998ecf8427e|820-2-18,820-2-19,820-2-24|'),
    ('DWA-M-820-2','820-2-24','warranty_start_date','6cbfa239888383c67d8994428fc78d42|1713bbbafade62030c60ede1875fe03d||','6cbfa239888383c67d8994428fc78d42|d379975b89a758dc25a668354dffefac||'),
    ('DWA-M-820-2','820-2-24','warranty_end_date','73e750397b3dbfd0db218ae1c8cb8af4|1713bbbafade62030c60ede1875fe03d||','73e750397b3dbfd0db218ae1c8cb8af4|d379975b89a758dc25a668354dffefac||'),
    ('DWA-M-820-2','820-2-24','defect_tracking_active','881b7b35d301d12657d0790d26a66049|1713bbbafade62030c60ede1875fe03d||','881b7b35d301d12657d0790d26a66049|d379975b89a758dc25a668354dffefac||'),
    ('DWA-M-820-2','820-2-24','gewaehrleistungen','7bb604397c331f9b6db8d4d074e6e3b0|d41d8cd98f00b204e9800998ecf8427e||','7bb604397c331f9b6db8d4d074e6e3b0|00ac634cbce764644e998b39338cda73||'),
    ('DWA-M-820-2','820-2-24','warranty_count','6b377a3d3e8fa353ed8678209088f07e|d41d8cd98f00b204e9800998ecf8427e||','6b377a3d3e8fa353ed8678209088f07e|00ac634cbce764644e998b39338cda73||'),
    ('DWA-M-820-2','820-2-24','warranty_open_defects','11aa049bae083ca360b4b71ed46e4dc7|d41d8cd98f00b204e9800998ecf8427e||','11aa049bae083ca360b4b71ed46e4dc7|00ac634cbce764644e998b39338cda73||'),
    ('DWA-M-820-2','820-2-06','status_report_frequency','66d2a8b410df95dd42e834b3b41e183d|d41d8cd98f00b204e9800998ecf8427e|820-2-09|d2decaa24d8b2c1c43c22053e89dfb2a','0b59329a912ecf8301bcb4a0ea469c5a|d41d8cd98f00b204e9800998ecf8427e|820-2-09|f1b50f076c0539d1fbd0a83751ef22a7'),
    ('DWA-M-820-1','M820-01','project_size','346403c64dc5001a7e44d90ddb6e8856|d41d8cd98f00b204e9800998ecf8427e||cad1acca4ac486594e988dcf42c0aea3','63223594972422fb690d01d12e421cdc|d41d8cd98f00b204e9800998ecf8427e||cad1acca4ac486594e988dcf42c0aea3'),
    ('DWA-M-820-3','M8203-01','project_size','c559af4ee6359fc3a81901db419d829f|d41d8cd98f00b204e9800998ecf8427e||cad1acca4ac486594e988dcf42c0aea3','46f48f3537849e3501f8bf583236cac9|d41d8cd98f00b204e9800998ecf8427e||cad1acca4ac486594e988dcf42c0aea3')),
gl AS (SELECT g.*, concat_ws('|', md5(cr.condition), cr.severity, md5(coalesce(cr.description, ''))) AS sig
         FROM g JOIN standards s ON s.code = g.std JOIN worksheet_templates w ON w.standard_id = s.id AND w.code = g.ws
         JOIN compliance_requirements cr ON cr.worksheet_template_id = w.id AND cr.code = g.code),
fl AS (SELECT x.*, md5(coalesce(f.description, '')) || '|' || md5(coalesce(f.visible_when, '')) || '|' || coalesce(array_to_string(f.consumer_worksheets, ','), '') || '|' || coalesce(md5(f.enum_values::text), '') AS sig
         FROM f0 x JOIN standards s ON s.code = x.std JOIN worksheet_templates w ON w.standard_id = s.id AND w.code = x.ws
         JOIN fields f ON f.worksheet_template_id = w.id AND f.symbol = x.symbol AND f.active)
SELECT (SELECT count(*) FROM gl) AS gates,
       (SELECT count(*) FROM gl WHERE sig = sig0) AS gates_pre,
       (SELECT count(*) FROM gl WHERE sig = sig1) AS gates_post,
       (SELECT count(*) FROM fl) AS fields,
       (SELECT count(*) FROM fl WHERE sig = sig0) AS fields_pre,
       (SELECT count(*) FROM fl WHERE sig = sig1) AS fields_post,
       (SELECT string_agg(code, ',') FROM gl WHERE sig <> sig0 AND sig <> sig1) AS gates_neither,
       (SELECT string_agg(ws || ' ' || symbol, ',') FROM fl WHERE sig <> sig0 AND sig <> sig1) AS fields_neither;

-- R1 · 820-2-24: gate conditions and field visibility (after: REQ-51 / REQ-52 nested bauleistungen guard, REQ-52-2 unchanged · six warranty fields carry bauleistungen_vergeben == true, verantwortlich_lph9_name does not)
SELECT 'gate' AS kind, cr.code AS item, cr.severity AS sev, cr.condition AS rule
  FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-2' AND w.code = '820-2-24'
UNION ALL
SELECT 'field', f.symbol, ws.code, f.visible_when
  FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
  LEFT JOIN worksheet_sections ws ON ws.id = f.section_id
 WHERE s.code = 'DWA-M-820-2' AND w.code = '820-2-24' AND f.active
 ORDER BY 1, 2;

-- R2 · 820-2-06 status_report_frequency tokens in order (before: weekly,biweekly,monthly,quarterly,ad_hoc · after: … quarterly,halbjaehrlich,ad_hoc)
SELECT string_agg(e->>'value', ',' ORDER BY (e->>'order_index')::int) AS tokens, count(*) AS n
  FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id, jsonb_array_elements(f.enum_values) e
 WHERE s.code = 'DWA-M-820-2' AND w.code = '820-2-06' AND f.symbol = 'status_report_frequency' AND f.active;

-- R3 · any time: saved project values 'halbjaehrlich' — run BEFORE a rollback (the value stays saved, the token leaves the list)
SELECT p.name AS project, pp.value_text, pp.value_enum
  FROM project_parameters pp JOIN projects p ON p.id = pp.project_id JOIN fields f ON f.id = pp.field_id
  JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-2' AND w.code = '820-2-06' AND f.symbol = 'status_report_frequency'
   AND 'halbjaehrlich' IN (coalesce(pp.value_text, ''), coalesce(pp.value_enum, ''))
 ORDER BY 1;

-- R4 · after the apply only (the tables exist from then on): archives and ledger (expect 2 / 10 / 12)
SELECT (SELECT count(*) FROM compliance_requirements_archive_m820_sf) AS gate_archive, (SELECT count(*) FROM fields_archive_m820_sf) AS field_archive,
       (SELECT count(*) FROM m820_sf_written) AS written;
