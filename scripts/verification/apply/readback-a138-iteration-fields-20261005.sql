-- Read-back after 20261005100000_a138_iteration_fields.sql (prod-query.mjs, read-only).
-- Expected: 3 new derived fields (A138-17 r_D_n_used_M, D_used_M; A138-18 D_used_R with consumers A138-19,A138-20);
-- A138-18 r_D_n_used_R widget = derived with consumers A138-19,A138-20.
select w.code as ws, f.symbol, f.data_type || coalesce(' ' || f.unit, '') as detail, f.widget, array_to_string(f.consumer_worksheets, ',') as consumers
from fields f join worksheet_templates w on w.id = f.worksheet_template_id join standards s on s.id = w.standard_id
where s.code = 'DWA-A-138-1' and (w.code, f.symbol) in (('A138-17','r_D_n_used_M'),('A138-17','D_used_M'),('A138-18','D_used_R'),('A138-18','r_D_n_used_R'))
order by 1, 2;
