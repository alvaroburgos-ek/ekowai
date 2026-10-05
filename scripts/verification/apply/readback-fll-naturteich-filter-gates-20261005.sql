-- Read-back after 20261005191000_fll_naturteich_filter_gate_hosts.sql (prod-query.mjs, read-only).
-- Expected: REQ-08, REQ-20, REQ-21 on FLLNT-10; FLLNT-09 keeps REQ-19 and its other gates; conditions unchanged.
select w.code as ws, cr.code as item, cr.severity || ' · ' || left(cr.condition, 110) as detail
from compliance_requirements cr join worksheet_templates w on w.id = cr.worksheet_template_id join standards s on s.id = w.standard_id
where s.code = 'FLL-Naturteich' and w.code in ('FLLNT-09', 'FLLNT-10')
order by 1, 2;
