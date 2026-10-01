-- Read-back after 20261001100000_a138_mulden_rigolen_guideline_settled.sql (prod-query.mjs, read-only).
-- Expected: 9 fields (A138-17: k_i_Mulde, V_M_erf · A138-19: k_f_BBZ, k_f_BBZ_quelle, k_i_BBZ · A138-20: V_MR, k_f_BBZ,
-- k_f_BBZ_quelle, k_i_BBZ), 3 equations (A138-19-D1, A138-20-D1, A138-20 '26'), 1 gate (A138-REQ-34 block), f_ort/f_K consumers
-- contain A138-19 and A138-20, V_MUE description starts with the formula and names V_MR.
select 'field' as kind, w.code as ws, f.symbol as item, f.data_type || coalesce(' ' || f.unit, '') as detail, f.is_required::text as flag
from fields f join worksheet_templates w on w.id = f.worksheet_template_id join standards s on s.id = w.standard_id
where s.code = 'DWA-A-138-1' and (w.code, f.symbol) in (('A138-17','k_i_Mulde'),('A138-17','V_M_erf'),('A138-19','k_f_BBZ'),('A138-19','k_f_BBZ_quelle'),('A138-19','k_i_BBZ'),('A138-20','V_MR'),('A138-20','k_f_BBZ'),('A138-20','k_f_BBZ_quelle'),('A138-20','k_i_BBZ'))
union all
select 'equation', w.code, e.equation_number, e.formula, e.id::text
from equations e join worksheet_templates w on w.id = e.worksheet_template_id join standards s on s.id = w.standard_id
where s.code = 'DWA-A-138-1' and ((w.code = 'A138-19' and e.equation_number = 'A138-19-D1') or (w.code = 'A138-20' and e.equation_number in ('A138-20-D1','26')))
union all
select 'gate', w.code, cr.code, cr.condition, cr.severity
from compliance_requirements cr join worksheet_templates w on w.id = cr.worksheet_template_id join standards s on s.id = w.standard_id
where s.code = 'DWA-A-138-1' and cr.code = 'A138-REQ-34'
union all
select 'consumers', w.code, f.symbol, array_to_string(f.consumer_worksheets, ','), ''
from fields f join worksheet_templates w on w.id = f.worksheet_template_id join standards s on s.id = w.standard_id
where s.code = 'DWA-A-138-1' and ((w.code = 'A138-08' and f.symbol = 'f_ort') or (w.code = 'A138-11' and f.symbol = 'f_K'))
union all
select 'description', w.code, f.symbol, left(f.description, 90), ''
from fields f join worksheet_templates w on w.id = f.worksheet_template_id join standards s on s.id = w.standard_id
where s.code = 'DWA-A-138-1' and w.code = 'A138-20' and f.symbol = 'V_MUE'
order by 1, 2, 3;
