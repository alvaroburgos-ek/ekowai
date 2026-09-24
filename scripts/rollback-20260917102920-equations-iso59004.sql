-- Generated rollback for iso59004 equations (scripts/regulation-tables/emit-equations-sql.ts). Deletes only the 'Plan 3:' rows this migration inserted. Regenerate, do not hand-edit.
BEGIN;
DELETE FROM equations e USING worksheet_templates w, standards s WHERE e.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'ISO-59004' AND w.code = 'ISO-59004-05' AND e.equation_number = 'ISO-59004-05-D1' AND e.description LIKE 'Plan 3:%';
DELETE FROM equations e USING worksheet_templates w, standards s WHERE e.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'ISO-59004' AND w.code = 'ISO-59004-05' AND e.equation_number = 'ISO-59004-05-D2' AND e.description LIKE 'Plan 3:%';
DELETE FROM equations e USING worksheet_templates w, standards s WHERE e.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'ISO-59004' AND w.code = 'ISO-59004-05' AND e.equation_number = 'ISO-59004-05-D3' AND e.description LIKE 'Plan 3:%';
DELETE FROM equations e USING worksheet_templates w, standards s WHERE e.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'ISO-59004' AND w.code = 'ISO-59004-06' AND e.equation_number = 'ISO-59004-06-D1' AND e.description LIKE 'Plan 3:%';
DELETE FROM equations e USING worksheet_templates w, standards s WHERE e.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'ISO-59004' AND w.code = 'ISO-59004-06' AND e.equation_number = 'ISO-59004-06-D2' AND e.description LIKE 'Plan 3:%';
DELETE FROM equations e USING worksheet_templates w, standards s WHERE e.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'ISO-59004' AND w.code = 'ISO-59004-06' AND e.equation_number = 'ISO-59004-06-D3' AND e.description LIKE 'Plan 3:%';
COMMIT;
