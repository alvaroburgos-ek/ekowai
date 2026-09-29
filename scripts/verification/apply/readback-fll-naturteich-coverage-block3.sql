-- Read-back after block 3a (+ 3b). Run: node scripts/verification/prod-query.mjs scripts/verification/apply/readback-fll-naturteich-coverage-block3.sql
-- Expected after 3a: 13 fields (active, not required, verified_against_standard) + equation FLLNT-11-D3.
select w.code ws, f.symbol, f.data_type, f.unit, f.widget, f.visible_when, f.is_required, f.verification_status, f.order_index
  from fields f join worksheet_templates w on w.id = f.worksheet_template_id join standards s on s.id = w.standard_id
 where s.code = 'FLL-Naturteich' and f.symbol in ('total_water_volume_m3', 'liner_on_concrete_base', 'crease_height_max_cm', 'crease_length_max_m', 'crease_min_distance_m', 'creases_crossing', 'entry_exit_point_count', 'surface_discharge_hours_per_day', 'filter_feed_volume_per_day_m3', 'feed_share_of_volume_pct', 'filter_operation_hours_per_day', 'filter_max_downtime_h', 'overflow_connected_water_surface_m2') order by w.code, f.order_index;
select w.code ws, e.equation_number, e.formula from equations e join worksheet_templates w on w.id = e.worksheet_template_id join standards s on s.id = w.standard_id where s.code = 'FLL-Naturteich' and e.equation_number in ('FLLNT-11-D3','EQ-05') order by 2;
-- Expected after 3b: EQ-05 reads overflow_connected_water_surface_m2; REQ-33 on FLLNT-11; REQ-26 = acceptance_passed == true; REQ-34…REQ-42 present (9 new).
select w.code ws, cr.code, cr.severity, cr.condition from compliance_requirements cr join worksheet_templates w on w.id = cr.worksheet_template_id join standards s on s.id = w.standard_id
 where s.code = 'FLL-Naturteich' and cr.code in ('REQ-26','REQ-33','REQ-34','REQ-35','REQ-36','REQ-37','REQ-38','REQ-39','REQ-40','REQ-41','REQ-42') order by cr.code;
