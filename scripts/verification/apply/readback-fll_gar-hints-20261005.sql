-- Read-back after 20261005172000_fll_gar_hints.sql: counts of bilingual descriptions (expected fields 292, equations 24, gates 43).
select 'fields' as kind, count(*) filter (where x.description like '%' || chr(10) || '[EN] %') as bilingual, count(*) filter (where x.active) as total
from fields x join worksheet_templates w on w.id = x.worksheet_template_id join standards s on s.id = w.standard_id where s.code = 'FLL-GAR-2023'
union all
select 'equations', count(*) filter (where x.description like '%' || chr(10) || '[EN] %'), count(*)
from equations x join worksheet_templates w on w.id = x.worksheet_template_id join standards s on s.id = w.standard_id where s.code = 'FLL-GAR-2023'
union all
select 'gates', count(*) filter (where x.description like '%' || chr(10) || '[EN] %'), count(*)
from compliance_requirements x join worksheet_templates w on w.id = x.worksheet_template_id join standards s on s.id = w.standard_id where s.code = 'FLL-GAR-2023';
