-- Generated rollback for din14021 field configs (scripts/regulation-tables/emit-field-configs-sql.ts). Restores the captured prior; deletes only 'Plan 3:' rows. Regenerate, do not hand-edit.
BEGIN;
DELETE FROM fields f USING worksheet_templates w, standards s WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DIN-14021' AND w.code = 'DIN-14021-01' AND f.symbol = 'claims' AND f.description LIKE 'Plan 3:%';
DELETE FROM fields f USING worksheet_templates w, standards s WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DIN-14021' AND w.code = 'DIN-14021-01' AND f.symbol = 'claims_count' AND f.description LIKE 'Plan 3:%';
DELETE FROM fields f USING worksheet_templates w, standards s WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DIN-14021' AND w.code = 'DIN-14021-01' AND f.symbol = 'claims_type_fail' AND f.description LIKE 'Plan 3:%';
DELETE FROM fields f USING worksheet_templates w, standards s WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DIN-14021' AND w.code = 'DIN-14021-01' AND f.symbol = 'specific_requirements_met_code' AND f.description LIKE 'Plan 3:%';
DELETE FROM fields f USING worksheet_templates w, standards s WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DIN-14021' AND w.code = 'DIN-14021-03' AND f.symbol = 'general_requirements_items' AND f.description LIKE 'Plan 3:%';
DELETE FROM fields f USING worksheet_templates w, standards s WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DIN-14021' AND w.code = 'DIN-14021-04' AND f.symbol = 'documentation_items' AND f.description LIKE 'Plan 3:%';
DELETE FROM fields f USING worksheet_templates w, standards s WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DIN-14021' AND w.code = 'DIN-14021-05' AND f.symbol = 'unqualified_claim' AND f.description LIKE 'Plan 3:%';
COMMIT;
