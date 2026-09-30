-- ROLLBACK for 20260930100100_fll_gar_2023_gates_coverage_block5b.sql
BEGIN;
DELETE FROM compliance_requirements cr USING worksheet_templates w, standards s WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'FLL-GAR-2023' AND w.code = 'FLL-GAR-17' AND cr.code = 'REQ-41';
DELETE FROM compliance_requirements cr USING worksheet_templates w, standards s WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'FLL-GAR-2023' AND w.code = 'FLL-GAR-14' AND cr.code = 'REQ-42';
DELETE FROM compliance_requirements cr USING worksheet_templates w, standards s WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'FLL-GAR-2023' AND w.code = 'FLL-GAR-12' AND cr.code = 'REQ-43';
UPDATE fields f SET ui_config = jsonb_set(f.ui_config, '{columns}', '[{"key":"art","type":"text","label":"Pflanzenart","required":true},{"key":"aggressiv","type":"boolean","label":"aggressiv wurzelnd / rhizombildend"}]'::jsonb)
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE f.worksheet_template_id = w.id AND w.code = 'FLL-GAR-24' AND s.code = 'FLL-GAR-2023' AND f.symbol = 'pflanzenarten';
UPDATE equations e SET formula = 'pflanzen_aggressiv_count = count_rows(pflanzenarten, aggressiv == true)'
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE e.worksheet_template_id = w.id AND w.code = 'FLL-GAR-24' AND s.code = 'FLL-GAR-2023' AND e.equation_number = 'FLL-GAR-24-D2';
COMMIT;
