-- Read-back after 20261005160000_fll_tp_rhizom_exemption_route.sql (prod-query.mjs, read-only). Run BEFORE (baseline: no route fields,
-- enum without werkstoffspezifisch_rhizomfest, REQ-RHZ21 'final_rhizom_conformity == ''rhizomfest''', 33 orphans, 0 visible_when) and AFTER.
-- Expected after: werkstoff_klasse on FLLTP-RHZ-02 (section B); nachweis_route, nachweis_begruendung, intensive_bepflanzung on FLLTP-RHZ-03
-- (section C); final_rhizom_conformity enum contains werkstoffspezifisch_rhizomfest; REQ-RHZ21-CONFORMITY starts with
-- 'nachweis_route IS NOT NULL AND'; REQ-RHZ18-VERDICT starts with 'IF nachweis_route == ''pruefung'' THEN'; REQ-RHZ03-INTENSIV and
-- REQ-RHZ03-WERKSTOFF present (warn); orphan fields 0; 119 fields with visible_when 'nachweis_route == ''pruefung'''.
select 'field' as kind, w.code as ws, f.symbol as item, 'required=' || f.is_required || ' section=' || coalesce(ws.code, 'NULL') || ' visible_when=' || coalesce(f.visible_when::text, '-') as detail
from fields f join worksheet_templates w on w.id = f.worksheet_template_id join standards s on s.id = w.standard_id
left join worksheet_sections ws on ws.id = f.section_id
where s.code = 'FLL-TP-RHIZOM-2023' and f.symbol in ('werkstoff_klasse', 'nachweis_route', 'nachweis_begruendung', 'intensive_bepflanzung', 'final_rhizom_conformity')
union all
select 'enum', w.code, f.symbol, (select string_agg(e->>'value', ',') from jsonb_array_elements(f.enum_values) e)
from fields f join worksheet_templates w on w.id = f.worksheet_template_id join standards s on s.id = w.standard_id
where s.code = 'FLL-TP-RHIZOM-2023' and f.symbol in ('final_rhizom_conformity', 'werkstoff_klasse', 'nachweis_route')
union all
select 'gate', w.code, cr.code, cr.severity || ' · ' || left(cr.condition, 150)
from compliance_requirements cr join worksheet_templates w on w.id = cr.worksheet_template_id join standards s on s.id = w.standard_id
where s.code = 'FLL-TP-RHIZOM-2023' and cr.code in ('REQ-RHZ21-CONFORMITY', 'REQ-RHZ18-VERDICT', 'REQ-RHZ03-INTENSIV', 'REQ-RHZ03-WERKSTOFF')
union all
select 'count', 'orphans (section NULL, active)', count(*)::text, ''
from fields f join worksheet_templates w on w.id = f.worksheet_template_id join standards s on s.id = w.standard_id
where s.code = 'FLL-TP-RHIZOM-2023' and f.section_id is null and f.active
union all
select 'count', 'visible_when = test route', count(*)::text, ''
from fields f join worksheet_templates w on w.id = f.worksheet_template_id join standards s on s.id = w.standard_id
where s.code = 'FLL-TP-RHIZOM-2023' and f.visible_when::text like '%nachweis_route == ''pruefung''%'
order by 1, 2, 3;
