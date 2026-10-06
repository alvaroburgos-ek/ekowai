-- Read-back for scripts/migrations/20261006170000_m820_1_risk_changes.sql (DWA-M 820-1 M820-06 risk-analysis change log). READ ONLY.
-- Run BEFORE the apply (R0: expect 0 / 0 / 0) and AFTER (R0: 2 / 1 / 0, R1, R2, R3). Expected values come from the harness
-- tests/harness/m820-1-risk-changes.integration.test.ts. No comment line ends with a semicolon.

-- R0 · objects of the block on M820-06 — before: fields 0, equations 0, saved_values 0 · after: fields 2, equations 1
SELECT (SELECT count(*) FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
         WHERE s.code = 'DWA-M-820-1' AND w.code = 'M820-06' AND f.symbol IN ('risiko_aenderungen','risiko_aenderungen_count')) AS fields,
       (SELECT count(*) FROM equations e JOIN worksheet_templates w ON w.id = e.worksheet_template_id JOIN standards s ON s.id = w.standard_id
         WHERE s.code = 'DWA-M-820-1' AND w.code = 'M820-06' AND e.equation_number = 'M820-06-D1') AS equations,
       (SELECT count(*) FROM project_parameters p JOIN fields f ON f.id = p.field_id JOIN worksheet_templates w ON w.id = f.worksheet_template_id
         JOIN standards s ON s.id = w.standard_id
         WHERE s.code = 'DWA-M-820-1' AND w.code = 'M820-06' AND f.symbol IN ('risiko_aenderungen','risiko_aenderungen_count')) AS saved_values;

-- R1 · after: the two fields — section B / F, widget register / derived, optional, the 7 column keys in order
SELECT f.symbol, ws.code AS section, f.widget, f.data_type, f.is_required,
       (SELECT string_agg(c->>'key' || CASE WHEN (c->>'required')::boolean THEN '*' ELSE '' END, ', ' ORDER BY o)
          FROM jsonb_array_elements(f.ui_config->'columns') WITH ORDINALITY AS t(c, o)) AS columns
  FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
  LEFT JOIN worksheet_sections ws ON ws.id = f.section_id
 WHERE s.code = 'DWA-M-820-1' AND w.code = 'M820-06' AND f.symbol IN ('risiko_aenderungen','risiko_aenderungen_count')
 ORDER BY 1;

-- R2 · after: the equation (expect risiko_aenderungen_count = count_rows(risiko_aenderungen)) and no gate naming the new symbols (gates 0)
SELECT e.equation_number, e.formula, e.input_symbols, e.output_symbol,
       (SELECT count(*) FROM compliance_requirements cr JOIN worksheet_templates w2 ON w2.id = cr.worksheet_template_id
         WHERE w2.standard_id = w.standard_id AND cr.condition ~ 'risiko_aenderungen') AS gates
  FROM equations e JOIN worksheet_templates w ON w.id = e.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-1' AND w.code = 'M820-06' AND e.equation_number = 'M820-06-D1';

-- R3 · any time: saved change rows per project (count of stored rows, stored counter) — run BEFORE a rollback
SELECT p.name AS project,
       jsonb_array_length(COALESCE(reg.value_json->'rows', '[]'::jsonb)) AS stored_rows,
       cnt.value_number AS risiko_aenderungen_count
  FROM projects p
  JOIN project_parameters reg ON reg.project_id = p.id
  JOIN fields fr ON fr.id = reg.field_id AND fr.symbol = 'risiko_aenderungen'
  JOIN worksheet_templates w ON w.id = fr.worksheet_template_id AND w.code = 'M820-06'
  LEFT JOIN LATERAL (SELECT pp.value_number FROM project_parameters pp JOIN fields fc ON fc.id = pp.field_id
                      WHERE pp.project_id = p.id AND fc.worksheet_template_id = w.id AND fc.symbol = 'risiko_aenderungen_count') cnt ON true
 ORDER BY 1;
