-- Read-back for scripts/migrations/20261005200000_m820_2_registers.sql (DWA-M 820-2 registers). READ ONLY.
-- Run BEFORE the apply (step 0: R0a / R0b / R0c) and AFTER (R1 to R7 must show the expected values below).
-- Expected values were produced by the embedded-Postgres harness tests/harness/m820-2-registers.integration.test.ts.

-- R0a · step 0: the two rows the block edits are still in their 2026-10-05 baseline state
--   expect: change_orders widget register, 6 columns aenderung,datum,kosten_eur,terminwirkung,entscheidung,status ·
--           risk_register widget NULL, ui_config NULL, section NULL
SELECT w.code AS ws, f.symbol, f.widget, f.section_id IS NULL AS no_section,
       (SELECT string_agg(c->>'key', ',') FROM jsonb_array_elements(f.ui_config->'columns') c) AS column_keys
  FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-2' AND ((w.code = '820-2-21' AND f.symbol = 'change_orders') OR (w.code = '820-2-10' AND f.symbol = 'risk_register'))
 ORDER BY 1;

-- R0b · step 0: stored project values on the two edited registers (none is modified by the block; list them to the owner)
--   change_orders rows WITHOUT ausloeser / kostenuebernahme will count in the new counter -> REQ-09-2 blocks those projects
--   until both columns are filled; risk_register values keep the editor's shape (rows with ratings), only counted.
SELECT f.symbol, count(p.*) AS saved_values,
       coalesce(sum(jsonb_array_length(p.value_json->'rows')) FILTER (WHERE jsonb_typeof(p.value_json->'rows') = 'array'), 0) AS stored_rows,
       count(p.*) FILTER (WHERE p.value_json IS NOT NULL AND jsonb_typeof(p.value_json->'rows') IS DISTINCT FROM 'array') AS other_shape
  FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
  LEFT JOIN project_parameters p ON p.field_id = f.id
 WHERE s.code = 'DWA-M-820-2' AND f.symbol IN ('change_orders','risk_register')
 GROUP BY 1 ORDER BY 1;

-- R0c · step 0: nothing of the block exists yet — expect 0 fields, 0 equations, 0 gates
SELECT (SELECT count(*) FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
         WHERE s.code = 'DWA-M-820-2' AND f.symbol IN ('korrespondenz','korrespondenz_count','korrespondenz_nachverfolgung_offen','projektschritte','projektschritte_count','projektschritte_offen','statusberichte','statusberichte_count','risiken_count','change_orders_ohne_ausloeser_kosten')) AS new_fields,
       (SELECT count(*) FROM equations e JOIN worksheet_templates w ON w.id = e.worksheet_template_id JOIN standards s ON s.id = w.standard_id
         WHERE s.code = 'DWA-M-820-2' AND e.equation_number IN ('820-2-03-D1','820-2-03-D2','820-2-05-D1','820-2-05-D2','820-2-06-D3','820-2-10-D1','820-2-21-D4')) AS new_equations,
       (SELECT count(*) FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id JOIN standards s ON s.id = w.standard_id
         WHERE s.code = 'DWA-M-820-2' AND cr.code = 'REQ-09-2') AS new_gates;

-- R1 · after: the three new registers + seven counters (10 rows: registers json/register/section C, counters number/derived/section D)
SELECT w.code AS ws, f.symbol, f.data_type, f.widget, f.is_required, f.active, ws.code AS section,
       (SELECT string_agg(c->>'key', ',') FROM jsonb_array_elements(f.ui_config->'columns') c) AS column_keys
  FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
  LEFT JOIN worksheet_sections ws ON ws.id = f.section_id
 WHERE s.code = 'DWA-M-820-2' AND f.symbol IN ('korrespondenz','korrespondenz_count','korrespondenz_nachverfolgung_offen','projektschritte','projektschritte_count','projektschritte_offen','statusberichte','statusberichte_count','risiken_count','change_orders_ohne_ausloeser_kosten')
 ORDER BY 1, 2;

-- R2 · after: the seven equations (formula as listed in the migration header)
SELECT w.code AS ws, e.equation_number, e.formula, e.input_symbols
  FROM equations e JOIN worksheet_templates w ON w.id = e.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-2' AND e.equation_number IN ('820-2-03-D1','820-2-03-D2','820-2-05-D1','820-2-05-D2','820-2-06-D3','820-2-10-D1','820-2-21-D4')
 ORDER BY 2;

-- R3 · after: gate REQ-09-2 on 820-2-21, block, condition change_orders IS EMPTY OR change_orders_ohne_ausloeser_kosten == 0
SELECT w.code AS ws, cr.code, cr.severity, cr.condition, cr.clause_reference
  FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-2' AND cr.code = 'REQ-09-2';

-- R4 · after: change_orders = the six baseline columns + ausloeser, kostenuebernahme; footer + change_orders_ohne_ausloeser_kosten
SELECT f.symbol, (SELECT string_agg(c->>'key', ',') FROM jsonb_array_elements(f.ui_config->'columns') c) AS column_keys,
       f.ui_config->'footer' AS footer
  FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-2' AND w.code = '820-2-21' AND f.symbol = 'change_orders';

-- R5 · after: risk_register widget register, editor risk_register, columns group,risk,description, section C
SELECT f.symbol, f.widget, f.ui_config->>'editor' AS editor, ws.code AS section,
       (SELECT string_agg(c->>'key', ',') FROM jsonb_array_elements(f.ui_config->'columns') c) AS column_keys
  FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
  LEFT JOIN worksheet_sections ws ON ws.id = f.section_id
 WHERE s.code = 'DWA-M-820-2' AND w.code = '820-2-10' AND f.symbol = 'risk_register';

-- R6 · archive (exists only once the block has run) — after the apply: 2 rows; after a rollback: 0
SELECT 'fields' AS archive, count(*) AS n FROM fields_archive_m820_2_registers;

-- R7 · saved project values on the new fields (run before a rollback — the rollback deletes them; after a fresh apply: 0)
SELECT f.symbol, count(*) AS n
  FROM project_parameters p JOIN fields f ON f.id = p.field_id JOIN worksheet_templates w ON w.id = f.worksheet_template_id
  JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-2' AND f.symbol IN ('korrespondenz','korrespondenz_count','korrespondenz_nachverfolgung_offen','projektschritte','projektschritte_count','projektschritte_offen','statusberichte','statusberichte_count','risiken_count','change_orders_ohne_ausloeser_kosten')
 GROUP BY 1 ORDER BY 1;
