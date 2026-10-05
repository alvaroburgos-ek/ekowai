-- ROLLBACK for 20261005130000_fll_naturteich_readiness_fixes.sql — restores the 2026-10-05 pre-block state.
BEGIN;
UPDATE fields f SET consumer_worksheets = NULLIF(array_remove(COALESCE(f.consumer_worksheets, ARRAY[]::text[]), 'FLLNT-04'), ARRAY[]::text[])
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE f.worksheet_template_id = w.id AND s.code = 'FLL-Naturteich' AND w.code = 'FLLNT-03' AND f.symbol = 'natural_pool_type';
UPDATE fields f SET consumer_worksheets = NULLIF(array_remove(COALESCE(f.consumer_worksheets, ARRAY[]::text[]), 'FLLNT-09'), ARRAY[]::text[])
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE f.worksheet_template_id = w.id AND s.code = 'FLL-Naturteich' AND w.code = 'FLLNT-10' AND f.symbol = 'filter_flow_type';
UPDATE fields f SET consumer_worksheets = NULLIF(array_remove(COALESCE(f.consumer_worksheets, ARRAY[]::text[]), 'FLLNT-11'), ARRAY[]::text[])
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE f.worksheet_template_id = w.id AND s.code = 'FLL-Naturteich' AND w.code = 'FLLNT-06' AND f.symbol = 'total_water_volume_m3';
UPDATE compliance_requirements cr SET condition = substring(cr.condition from length('IF filter_flow_type == slow THEN (') + 1 for length(cr.condition) - length('IF filter_flow_type == slow THEN (') - 1)
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE cr.worksheet_template_id = w.id AND s.code = 'FLL-Naturteich' AND w.code = 'FLLNT-09' AND cr.code = 'REQ-20' AND cr.condition LIKE 'IF filter_flow_type == slow THEN (%';
UPDATE compliance_requirements cr SET condition = substring(cr.condition from length('IF filter_flow_type == quick THEN (') + 1 for length(cr.condition) - length('IF filter_flow_type == quick THEN (') - 1)
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE cr.worksheet_template_id = w.id AND s.code = 'FLL-Naturteich' AND w.code = 'FLLNT-09' AND cr.code = 'REQ-21' AND cr.condition LIKE 'IF filter_flow_type == quick THEN (%';
UPDATE compliance_requirements cr SET worksheet_template_id = (SELECT w3.id FROM worksheet_templates w3 WHERE w3.standard_id = s.id AND w3.code = 'FLLNT-03')
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE cr.worksheet_template_id = w.id AND s.code = 'FLL-Naturteich' AND w.code = 'FLLNT-04' AND cr.code = 'REQ-10';
UPDATE compliance_requirements cr SET condition = 'filter_50x_rule_met == true'
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE cr.worksheet_template_id = w.id AND s.code = 'FLL-Naturteich' AND w.code = 'FLLNT-10' AND cr.code = 'REQ-22';
COMMIT;
