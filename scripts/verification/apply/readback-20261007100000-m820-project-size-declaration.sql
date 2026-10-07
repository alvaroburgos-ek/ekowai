-- Read-back for scripts/migrations/20261007100000_m820_project_size_declaration.sql (DWA-M 820 project-size declaration). READ ONLY.
-- Run BEFORE the apply (step 0: R0 expect new_fields 0, saved_values 0, untouched_ok true) and AFTER (R0: 3 / 0 / true, R1, R2, R3).
-- Expected values come from the harness tests/harness/m820-project-size-declaration.integration.test.ts. The md5 pins in R0 were
-- taken from the LIVE rows (prod-query, 2026-10-07). No comment line ends with a semicolon (prod-query.mjs splits on semicolon + newline).

-- R0 · new fields of the block (before 0, after 3) · saved project values on them (0 right after the apply) · untouched_ok = the
--      required 820-2-01 project_size and complexity_level are byte-identical in description + enum_values and still required (true)
SELECT (SELECT count(*) FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
         WHERE (s.code, w.code, f.symbol) IN (('DWA-M-820-2','820-2-01','project_size_begruendung'),('DWA-M-820-1','M820-01','project_size'),('DWA-M-820-3','M8203-01','project_size'))) AS new_fields,
       (SELECT count(*) FROM project_parameters p JOIN fields f ON f.id = p.field_id JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
         WHERE (s.code, w.code, f.symbol) IN (('DWA-M-820-2','820-2-01','project_size_begruendung'),('DWA-M-820-1','M820-01','project_size'),('DWA-M-820-3','M8203-01','project_size'))) AS saved_values,
       (SELECT count(*) = 2 FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
         WHERE s.code = 'DWA-M-820-2' AND w.code = '820-2-01' AND f.is_required AND f.active
           AND (f.symbol, md5(f.description), md5(f.enum_values::text)) IN (('project_size','c26dd84bc342ef93801bcef0d43de77a','539e594f94f4ad5b64b0a82938328fd6'),
                                                                          ('complexity_level','2ba2466aceb33796df9c3a1700d02291','f4f7f9ead1cad1690883548065a08ecd'))) AS untouched_ok;

-- R1 · after: the three fields — section B, optional, no widget / visible_when, tokens value:label_de:label_en in order (null for the text field)
SELECT s.code AS std, w.code AS ws, f.symbol, ws.code AS section, f.data_type, f.is_required, f.widget, f.visible_when, f.order_index,
       (SELECT string_agg((e->>'value') || ':' || (e->>'label_de') || ':' || (e->>'label_en'), ', ' ORDER BY (e->>'order_index')::int)
          FROM jsonb_array_elements(f.enum_values) e) AS tokens
  FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
  LEFT JOIN worksheet_sections ws ON ws.id = f.section_id
 WHERE (s.code, w.code, f.symbol) IN (('DWA-M-820-2','820-2-01','project_size_begruendung'),('DWA-M-820-1','M820-01','project_size'),('DWA-M-820-3','M8203-01','project_size'),('DWA-M-820-2','820-2-01','project_size'))
 ORDER BY 1, 3;

-- R2 · any time: nothing reads the size (expect gates 0, equations 0, visible_when 0, section_visible 0 in the three standards)
SELECT (SELECT count(*) FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id JOIN standards s ON s.id = w.standard_id
         WHERE s.code IN ('DWA-M-820-1','DWA-M-820-2','DWA-M-820-3') AND cr.condition ~ '\mproject_size') AS gates,
       (SELECT count(*) FROM equations e JOIN worksheet_templates w ON w.id = e.worksheet_template_id JOIN standards s ON s.id = w.standard_id
         WHERE s.code IN ('DWA-M-820-1','DWA-M-820-2','DWA-M-820-3') AND (e.formula ~ '\mproject_size' OR 'project_size' = ANY(e.input_symbols))) AS equations,
       (SELECT count(*) FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
         WHERE s.code IN ('DWA-M-820-1','DWA-M-820-2','DWA-M-820-3') AND f.visible_when ~ '\mproject_size') AS visible_when,
       (SELECT count(*) FROM worksheet_sections ws JOIN worksheet_templates w ON w.id = ws.worksheet_template_id JOIN standards s ON s.id = w.standard_id
         WHERE s.code IN ('DWA-M-820-1','DWA-M-820-2','DWA-M-820-3') AND ws.visible_when ~ '\mproject_size') AS section_visible;

-- R3 · any time: saved size answers per project (820-2-01 size + reason, the two copies) — run BEFORE a rollback (it deletes the copies' values)
SELECT p.name AS project, s.code AS std, w.code AS ws, f.symbol, COALESCE(pp.value_enum, left(pp.value_text, 80)) AS value
  FROM project_parameters pp JOIN projects p ON p.id = pp.project_id JOIN fields f ON f.id = pp.field_id
  JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE (s.code, w.code, f.symbol) IN (('DWA-M-820-2','820-2-01','project_size'),('DWA-M-820-2','820-2-01','project_size_begruendung'),('DWA-M-820-1','M820-01','project_size'),('DWA-M-820-3','M8203-01','project_size'))
 ORDER BY 1, 2, 4;
