-- Generated rollback for din14021 equations (scripts/regulation-tables/emit-equations-sql.ts). Deletes only the 'Plan 3:' rows this migration inserted. Regenerate, do not hand-edit.
BEGIN;
DELETE FROM equations e USING worksheet_templates w, standards s WHERE e.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DIN-14021' AND w.code = 'DIN-14021-01' AND e.equation_number = 'DIN-14021-01-D1' AND e.description LIKE 'Plan 3:%';
DELETE FROM equations e USING worksheet_templates w, standards s WHERE e.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DIN-14021' AND w.code = 'DIN-14021-01' AND e.equation_number = 'DIN-14021-01-D2' AND e.description LIKE 'Plan 3:%';
DELETE FROM equations e USING worksheet_templates w, standards s WHERE e.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DIN-14021' AND w.code = 'DIN-14021-01' AND e.equation_number = 'DIN-14021-01-D3' AND e.description LIKE 'Plan 3:%';
COMMIT;
