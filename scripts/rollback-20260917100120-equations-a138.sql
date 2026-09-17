-- Generated rollback for a138 equations (scripts/regulation-tables/emit-equations-sql.ts). Deletes only the 'Plan 3:' rows this migration inserted. Regenerate, do not hand-edit.
BEGIN;
DELETE FROM equations e USING worksheet_templates w, standards s WHERE e.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-A-138-1' AND w.code = 'A138-02' AND e.equation_number = 'A138-02-D1' AND e.description LIKE 'Plan 3:%';
DELETE FROM equations e USING worksheet_templates w, standards s WHERE e.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-A-138-1' AND w.code = 'A138-05' AND e.equation_number = 'A138-05-D1' AND e.description LIKE 'Plan 3:%';
DELETE FROM equations e USING worksheet_templates w, standards s WHERE e.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-A-138-1' AND w.code = 'A138-05' AND e.equation_number = 'A138-05-D3' AND e.description LIKE 'Plan 3:%';
DELETE FROM equations e USING worksheet_templates w, standards s WHERE e.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-A-138-1' AND w.code = 'A138-08' AND e.equation_number = 'A138-08-D1' AND e.description LIKE 'Plan 3:%';
DELETE FROM equations e USING worksheet_templates w, standards s WHERE e.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-A-138-1' AND w.code = 'A138-26' AND e.equation_number = 'A138-26-D1' AND e.description LIKE 'Plan 3:%';
COMMIT;
