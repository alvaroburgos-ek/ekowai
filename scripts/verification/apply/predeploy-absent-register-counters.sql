-- Pre-deploy check for the [CODE] fix of M820 follow-up 1, item 4 (src/lib/eval/materialize-derived.ts). READ ONLY, all standards.
-- Lists every stored DERIVED counter (an equation over count_rows(<register>)) that holds a number although its register was
-- never saved for that project — the values the old save path invented as 0. After the deploy the next save of that sheet that
-- carries another register writes null there ("Fehlende oder leere Eingaben: <register>"), the same verdict the report / PDF /
-- MCP recompute already show. The last column lists the gates of the same standard whose condition names the counter (their
-- verdict can move from pass/fail to pending when the counter is cleared). No comment line ends with a semicolon.
SELECT s.code AS standard, p.name AS project, w.code AS ws, e.equation_number, e.output_symbol, reg.symbol AS register,
       pp.value_number AS stored_counter,
       (SELECT string_agg(w2.code || ' ' || cr.code || '/' || cr.severity, ', ' ORDER BY w2.code, cr.code)
          FROM compliance_requirements cr JOIN worksheet_templates w2 ON w2.id = cr.worksheet_template_id
         WHERE w2.standard_id = w.standard_id AND cr.condition ~ ('\m' || e.output_symbol || '\M')) AS gates_reading_it
  FROM equations e
  JOIN worksheet_templates w ON w.id = e.worksheet_template_id
  JOIN standards s ON s.id = w.standard_id
  JOIN fields reg ON reg.worksheet_template_id = w.id AND reg.data_type = 'json' AND reg.active
                 AND e.formula ~ ('count_rows\(\s*' || reg.symbol || '\M')
  JOIN fields fo ON fo.worksheet_template_id = w.id AND fo.symbol = e.output_symbol AND fo.active
  JOIN project_parameters pp ON pp.field_id = fo.id AND pp.value_number IS NOT NULL
  JOIN projects p ON p.id = pp.project_id
 WHERE NOT EXISTS (SELECT 1 FROM project_parameters pr WHERE pr.project_id = pp.project_id AND pr.field_id = reg.id AND pr.value_json IS NOT NULL)
 ORDER BY 1, 2, 3, 4;
