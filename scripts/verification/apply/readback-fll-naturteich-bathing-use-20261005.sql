-- Read-back after 20261005190000_fll_naturteich_bathing_use.sql (prod-query.mjs, read-only).
-- Expected: one field bathing_use on FLLNT-03 (required, enum swimming_pool / ornamental_no_bathing, 14 consumers);
-- 13 fields with visible_when bathing_use == 'swimming_pool' (11 on FLLNT-04, 2 on FLLNT-06); 4 FLLNT-10 fields with
-- filter_flow_type == 'quick'; pool_underwater_surface with natural_pool_type IN {'type_IV', 'type_V'}.
select 'selector' as kind, w.code as ws, f.symbol as item, 'required=' || f.is_required || ' consumers=' || coalesce(array_length(f.consumer_worksheets, 1), 0) || ' enum=' || (select string_agg(e->>'value', ',') from jsonb_array_elements(f.enum_values) e) as detail
from fields f join worksheet_templates w on w.id = f.worksheet_template_id join standards s on s.id = w.standard_id
where s.code = 'FLL-Naturteich' and f.symbol = 'bathing_use'
union all
select 'visible_when', w.code, f.symbol, f.visible_when::text
from fields f join worksheet_templates w on w.id = f.worksheet_template_id join standards s on s.id = w.standard_id
where s.code = 'FLL-Naturteich' and f.visible_when::text in ('bathing_use == ''swimming_pool''', 'filter_flow_type == ''quick''', 'natural_pool_type IN {''type_IV'', ''type_V''}')
order by 1, 2, 3;
