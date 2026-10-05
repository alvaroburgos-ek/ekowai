-- Read-back after 20261005150000_fll_naturteich_tab1_operator.sql (prod-query.mjs, read-only).
-- Expected: REQ-07 contains 'regeneration_area_share >= 50' and 'regeneration_area_share >= 30' (no strict '>' before 50 / 30);
-- TABLE1 share_printed = '≥ 50%' (type_I, type_II), '≥ 30%' (type_III); type_IV / type_V unchanged ("information on construction …").
select 'gate' as kind, cr.code as item, substr(cr.condition, 1, 120) as a, substr(cr.condition, 121, 120) as b
from compliance_requirements cr join worksheet_templates w on w.id = cr.worksheet_template_id join standards s on s.id = w.standard_id
where s.code = 'FLL-Naturteich' and w.code = 'FLLNT-03' and cr.code = 'REQ-07'
union all
select 'row', r.row_key, r.row_values->>'share_printed', ''
from regulation_table_rows r join regulation_tables t on t.id = r.table_id
where t.standard_code = 'FLL-Naturteich' and t.table_code = 'TABLE1'
order by 1, 2;
