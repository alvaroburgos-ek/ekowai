-- Read-back after 20261005130000_fll_naturteich_readiness_fixes.sql (prod-query.mjs, read-only).
-- Expected: natural_pool_type consumers include FLLNT-04; filter_flow_type consumers include FLLNT-09; total_water_volume_m3 consumers
-- include FLLNT-11; REQ-20 starts with 'IF filter_flow_type == slow', REQ-21 with 'IF filter_flow_type == quick'; REQ-10 sits on FLLNT-04;
-- REQ-22 condition = 'filter_colonized_surface_actual >= 50 * pool_underwater_surface'.
select 'field' as kind, w.code as ws, f.symbol as item, array_to_string(f.consumer_worksheets, ',') as detail
from fields f join worksheet_templates w on w.id = f.worksheet_template_id join standards s on s.id = w.standard_id
where s.code = 'FLL-Naturteich' and f.symbol in ('natural_pool_type','filter_flow_type','total_water_volume_m3')
union all
select 'gate', w.code, cr.code, left(cr.condition, 90)
from compliance_requirements cr join worksheet_templates w on w.id = cr.worksheet_template_id join standards s on s.id = w.standard_id
where s.code = 'FLL-Naturteich' and cr.code in ('REQ-10','REQ-20','REQ-21','REQ-22')
order by 1, 2, 3;
