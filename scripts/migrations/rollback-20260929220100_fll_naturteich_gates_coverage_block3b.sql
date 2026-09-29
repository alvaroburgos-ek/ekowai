-- ROLLBACK for 20260929220100_fll_naturteich_gates_coverage_block3b.sql
BEGIN;
UPDATE equations e SET formula = 'splash_water_tank_volume >= 150 * pool_underwater_surface', input_symbols = ARRAY['splash_water_tank_volume','pool_underwater_surface']::text[]
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE e.worksheet_template_id = w.id AND w.code = 'FLLNT-11' AND s.code = 'FLL-Naturteich' AND e.equation_number = 'EQ-05';
UPDATE compliance_requirements cr SET condition = 'IF rigid_overflow_used == true THEN splash_water_tank_volume >= 150 * pool_underwater_surface', worksheet_template_id = w.id, source_quote = NULL
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE w.code = 'FLLNT-09' AND s.code = 'FLL-Naturteich' AND cr.code = 'REQ-33' AND cr.worksheet_template_id = (SELECT w2.id FROM worksheet_templates w2 WHERE w2.standard_id = s.id AND w2.code = 'FLLNT-11');
UPDATE compliance_requirements cr SET condition = 'acceptance_passed == true OR defects_noted IS EMPTY', source_quote = NULL
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE cr.worksheet_template_id = w.id AND w.code = 'FLLNT-13' AND s.code = 'FLL-Naturteich' AND cr.code = 'REQ-26';
DELETE FROM compliance_requirements cr USING worksheet_templates w, standards s WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'FLL-Naturteich' AND w.code = 'FLLNT-11' AND cr.code = 'REQ-34';
DELETE FROM compliance_requirements cr USING worksheet_templates w, standards s WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'FLL-Naturteich' AND w.code = 'FLLNT-11' AND cr.code = 'REQ-35';
DELETE FROM compliance_requirements cr USING worksheet_templates w, standards s WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'FLL-Naturteich' AND w.code = 'FLLNT-11' AND cr.code = 'REQ-36';
DELETE FROM compliance_requirements cr USING worksheet_templates w, standards s WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'FLL-Naturteich' AND w.code = 'FLLNT-06' AND cr.code = 'REQ-37';
DELETE FROM compliance_requirements cr USING worksheet_templates w, standards s WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'FLL-Naturteich' AND w.code = 'FLLNT-07' AND cr.code = 'REQ-38';
DELETE FROM compliance_requirements cr USING worksheet_templates w, standards s WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'FLL-Naturteich' AND w.code = 'FLLNT-07' AND cr.code = 'REQ-39';
DELETE FROM compliance_requirements cr USING worksheet_templates w, standards s WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'FLL-Naturteich' AND w.code = 'FLLNT-11' AND cr.code = 'REQ-40';
DELETE FROM compliance_requirements cr USING worksheet_templates w, standards s WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'FLL-Naturteich' AND w.code = 'FLLNT-11' AND cr.code = 'REQ-41';
DELETE FROM compliance_requirements cr USING worksheet_templates w, standards s WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'FLL-Naturteich' AND w.code = 'FLLNT-13' AND cr.code = 'REQ-42';
COMMIT;
