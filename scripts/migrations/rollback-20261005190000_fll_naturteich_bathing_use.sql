-- ROLLBACK for 20261005190000_fll_naturteich_bathing_use.sql — removes the selector and the visible_when conditions it set.
-- Note: project_parameters rows saved for bathing_use (if any) block the field delete by foreign key; they are removed first.
BEGIN;
UPDATE fields f SET visible_when = NULL
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND s.code = 'FLL-Naturteich' AND f.visible_when = 'bathing_use == ''swimming_pool'''
   AND ((w.code = 'FLLNT-04' AND f.symbol IN ('swimming_test_ammonium','swimming_test_hardness','swimming_test_conductivity','swimming_test_nitrate','swimming_test_nitrite','swimming_test_ph','swimming_test_acid_capacity_ks43','swimming_test_p_total','swimming_test_orthophosphate','swimming_orthophosphate_limit','swimming_p_total_limit'))
     OR (w.code = 'FLLNT-06' AND f.symbol IN ('swimming_area_m2','attest_fllnt_06_req_18')));
UPDATE fields f SET visible_when = NULL
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND s.code = 'FLL-Naturteich' AND w.code = 'FLLNT-10' AND f.visible_when = 'filter_flow_type == ''quick'''
   AND f.symbol IN ('filter_50x_rule_met','filter_colonized_surface_actual','filter_volume_required','grain_specific_surface');
UPDATE fields f SET visible_when = NULL
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND s.code = 'FLL-Naturteich' AND w.code = 'FLLNT-06' AND f.symbol = 'pool_underwater_surface'
   AND f.visible_when = 'natural_pool_type IN {''type_IV'', ''type_V''}';
DELETE FROM project_parameters p USING fields f, worksheet_templates w, standards s
 WHERE p.field_id = f.id AND f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'FLL-Naturteich' AND w.code = 'FLLNT-03' AND f.symbol = 'bathing_use';
DELETE FROM fields f USING worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'FLL-Naturteich' AND w.code = 'FLLNT-03' AND f.symbol = 'bathing_use';
COMMIT;
