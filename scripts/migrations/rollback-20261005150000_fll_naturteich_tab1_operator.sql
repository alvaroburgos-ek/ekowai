-- ROLLBACK for 20261005150000_fll_naturteich_tab1_operator.sql — restores the strict operators and the extracted texts of 2026-10-05.
BEGIN;
UPDATE compliance_requirements cr
   SET condition = replace(replace(cr.condition, 'regeneration_area_share >= 50', 'regeneration_area_share > 50'), 'regeneration_area_share >= 30', 'regeneration_area_share > 30')
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE cr.worksheet_template_id = w.id AND s.code = 'FLL-Naturteich' AND w.code = 'FLLNT-03' AND cr.code = 'REQ-07'
   AND (cr.condition LIKE '%regeneration_area_share >= 50%' OR cr.condition LIKE '%regeneration_area_share >= 30%');
UPDATE regulation_table_rows r SET row_values = jsonb_set(r.row_values, '{share_printed}', '"> 50%"'::jsonb)
  FROM regulation_tables t
 WHERE r.table_id = t.id AND t.standard_code = 'FLL-Naturteich' AND t.table_code = 'TABLE1' AND r.row_key IN ('type_I', 'type_II') AND r.row_values->>'share_printed' = '≥ 50%';
UPDATE regulation_table_rows r SET row_values = jsonb_set(r.row_values, '{share_printed}', '"> 30%"'::jsonb)
  FROM regulation_tables t
 WHERE r.table_id = t.id AND t.standard_code = 'FLL-Naturteich' AND t.table_code = 'TABLE1' AND r.row_key = 'type_III' AND r.row_values->>'share_printed' = '≥ 30%';
COMMIT;
