-- Read-back for scripts/migrations/20261006230000_m820_3_projektstopp_paths.sql (DWA-M 820-3 · Projektstopp code per project path).
-- READ ONLY. Run R1 + R2 BEFORE the apply (step 0) and R1 to R3 AFTER. Expected values come from the embedded-Postgres harness
-- tests/harness/m820-3-projektstopp-paths.integration.test.ts. No comment line ends with a semicolon (prod-query.mjs splits on
-- semicolon + newline).

-- R1 · the equation, the consumer reach and the hint — expect BEFORE: formula_state old, n_inputs 67, first_input pz_52_1_status,
--   pt_reaches_24 false, pt_list block19, hint_new false · AFTER: new, 68, project_type, true, block19+M8203-24, true
SELECT e.equation_number,
       CASE md5(e.formula) WHEN '2d497935cfa3c2e9ac44081a90cec57a' THEN 'old' WHEN '0e7c0e64ba6c08ac022ea68a58e71ed3' THEN 'new' ELSE 'other' END AS formula_state,
       array_length(e.input_symbols, 1) AS n_inputs, e.input_symbols[1] AS first_input, e.output_symbol, e.clause_reference,
       'M8203-24' = ANY (pt.consumer_worksheets) AS pt_reaches_24,
       CASE WHEN md5(pt.consumer_worksheets::text) = '2f3cd1303a9a27b1a1b864f531ce3e8c' THEN 'block19'
            WHEN pt.consumer_worksheets = ARRAY['M8203-04', 'M8203-05', 'M8203-06', 'M8203-07', 'M8203-08', 'M8203-09', 'M8203-10', 'M8203-11', 'M8203-12', 'M8203-13', 'M8203-14', 'M8203-15', 'M8203-16', 'M8203-17', 'M8203-18', 'M8203-22', 'M8203-23', 'M8203-24']::text[] THEN 'block19+M8203-24'
            ELSE 'other' END AS pt_list,
       md5(f.description) = 'cfb9a0035741f43e5fef9f96ac9577f5' AND md5(e.description) = '0381ed497779801562fd2e17b3f34cd4' AS hint_new
  FROM equations e
  JOIN worksheet_templates w ON w.id = e.worksheet_template_id
  JOIN standards s ON s.id = w.standard_id
  JOIN fields f ON f.worksheet_template_id = w.id AND f.symbol = 'projektstopp_code'
  JOIN worksheet_templates pw ON pw.standard_id = s.id AND pw.code = 'M8203-01'
  JOIN fields pt ON pt.worksheet_template_id = pw.id AND pt.symbol = 'project_type'
 WHERE s.code = 'DWA-M-820-3' AND w.code = 'M8203-24' AND e.equation_number = 'M8203-24-D1';

-- R2 · projects with an 820-3 project_type: the stored codes (code_a M8203-22, code_b M8203-23, code M8203-24) — BEFORE: code empty for a
--   single-path project whose other path is unanswered · AFTER the M8203-24 save / recompute (41_ step 3): code = code_a (gesamtsystem),
--   code_b (einzelprojekt), max of both (both)
SELECT p.name AS project, pt.value_enum AS project_type,
       (SELECT pp.value_number FROM project_parameters pp JOIN fields f ON f.id = pp.field_id JOIN worksheet_templates w ON w.id = f.worksheet_template_id
         WHERE pp.project_id = p.id AND w.code = 'M8203-22' AND f.symbol = 'projektstopp_code_a') AS code_a,
       (SELECT pp.value_number FROM project_parameters pp JOIN fields f ON f.id = pp.field_id JOIN worksheet_templates w ON w.id = f.worksheet_template_id
         WHERE pp.project_id = p.id AND w.code = 'M8203-23' AND f.symbol = 'projektstopp_code_b') AS code_b,
       (SELECT pp.value_number FROM project_parameters pp JOIN fields f ON f.id = pp.field_id JOIN worksheet_templates w ON w.id = f.worksheet_template_id
         WHERE pp.project_id = p.id AND w.code = 'M8203-24' AND f.symbol = 'projektstopp_code') AS code
  FROM projects p
  JOIN project_parameters pt ON pt.project_id = p.id
  JOIN fields fp ON fp.id = pt.field_id AND fp.symbol = 'project_type'
  JOIN worksheet_templates wp ON wp.id = fp.worksheet_template_id AND wp.code = 'M8203-01'
 ORDER BY 1;

-- R3 · AFTER only: archives — expect equation_archive 1, field_archive 2 (a re-apply keeps both)
SELECT (SELECT count(*) FROM equations_archive_m820_3_projektstopp_paths) AS equation_archive,
       (SELECT count(*) FROM fields_archive_m820_3_projektstopp_paths) AS field_archive;
