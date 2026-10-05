-- ROLLBACK for 20261005191000_fll_naturteich_filter_gate_hosts.sql — REQ-08 / REQ-20 / REQ-21 back to FLLNT-09.
BEGIN;
UPDATE compliance_requirements cr SET worksheet_template_id = (SELECT w9.id FROM worksheet_templates w9 WHERE w9.standard_id = s.id AND w9.code = 'FLLNT-09')
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE cr.worksheet_template_id = w.id AND s.code = 'FLL-Naturteich' AND w.code = 'FLLNT-10' AND cr.code IN ('REQ-08', 'REQ-20', 'REQ-21');
COMMIT;
