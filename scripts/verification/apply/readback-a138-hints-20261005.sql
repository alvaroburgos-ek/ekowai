-- Read-back after the hint block: counts of bilingual descriptions (expected fields 283, equations 54).
select 'fields' as kind, count(*) filter (where f.description like '%' || chr(10) || '[EN] %') as bilingual, count(*) filter (where f.active) as active
from fields f join worksheet_templates w on w.id = f.worksheet_template_id join standards s on s.id = w.standard_id where s.code = 'DWA-A-138-1'
union all
select 'equations', count(*) filter (where e.description like '%' || chr(10) || '[EN] %'), count(*)
from equations e join worksheet_templates w on w.id = e.worksheet_template_id join standards s on s.id = w.standard_id where s.code = 'DWA-A-138-1';
