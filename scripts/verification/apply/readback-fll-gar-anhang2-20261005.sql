-- Read-back after 20261005150000_fll_gar_anhang2_and_edge_fields.sql (prod-query.mjs, read-only).
-- Expected: freibord_zu_bauwerk_cm visible_when = abschluss_anwendungsfall == 'bauteil_bauwerk' (freibord_zu_gelaende_cm unchanged NULL);
-- REQ-44 on FLL-GAR-22, severity block, condition 'IF Delta_u > 0 THEN g_prime >= (Delta_u * gamma_A) / cos(rad(beta)) - (…)';
-- equation 2b formula with the same structure.
select 'field' as kind, w.code as ws, f.symbol as item, coalesce(f.visible_when::text, 'NULL') as detail
from fields f join worksheet_templates w on w.id = f.worksheet_template_id join standards s on s.id = w.standard_id
where s.code = 'FLL-GAR-2023' and w.code = 'FLL-GAR-23' and f.symbol in ('freibord_zu_bauwerk_cm', 'freibord_zu_gelaende_cm', 'abschluss_anwendungsfall')
union all
select 'equation', w.code, e.equation_number, e.formula
from equations e join worksheet_templates w on w.id = e.worksheet_template_id join standards s on s.id = w.standard_id
where s.code = 'FLL-GAR-2023' and w.code = 'FLL-GAR-22' and e.equation_number = '2b'
union all
select 'gate', w.code, cr.code, cr.severity || ' · ' || left(cr.condition, 140)
from compliance_requirements cr join worksheet_templates w on w.id = cr.worksheet_template_id join standards s on s.id = w.standard_id
where s.code = 'FLL-GAR-2023' and w.code = 'FLL-GAR-22' and cr.code in ('REQ-11', 'REQ-24', 'REQ-25', 'REQ-44')
order by 1, 2, 3;
