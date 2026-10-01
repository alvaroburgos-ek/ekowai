-- ROLLBACK for 20261001100000_a138_mulden_rigolen_guideline_settled.sql — removes exactly the block's fields, equations and gate;
-- restores the V_MÜ description and the f_Ort / f_K consumer lists.
-- NOTE: deleting a field cascades to its project_parameters values (if any were entered after apply) — run only if that is intended.
BEGIN;
DELETE FROM compliance_requirements cr USING worksheet_templates w, standards s
WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-A-138-1' AND w.code = 'A138-17' AND cr.code = 'A138-REQ-34';
DELETE FROM equations e USING worksheet_templates w, standards s
WHERE e.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-A-138-1'
  AND ((w.code = 'A138-19' AND e.equation_number = 'A138-19-D1') OR (w.code = 'A138-20' AND e.equation_number IN ('A138-20-D1', '26')));
DELETE FROM fields f USING worksheet_templates w, standards s
WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-A-138-1'
  AND (w.code, f.symbol) IN (('A138-19', 'k_f_BBZ'), ('A138-19', 'k_f_BBZ_quelle'), ('A138-19', 'k_i_BBZ'),
                             ('A138-20', 'V_MR'), ('A138-20', 'k_f_BBZ'), ('A138-20', 'k_f_BBZ_quelle'), ('A138-20', 'k_i_BBZ'),
                             ('A138-17', 'k_i_Mulde'), ('A138-17', 'V_M_erf'));
UPDATE fields f SET description = 'V_MÜ = [(A_C + A_VA) · r_D(n_R) · 10⁻⁷ − A_S,m · k_i] · D · 60 · f_Z − V_M per Gl. 30 (iterate D).'
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE f.worksheet_template_id = w.id AND w.code = 'A138-20' AND s.code = 'DWA-A-138-1' AND f.symbol = 'V_MUE';
UPDATE fields f SET consumer_worksheets = array_remove(array_remove(f.consumer_worksheets, 'A138-19'), 'A138-20')
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE f.worksheet_template_id = w.id AND s.code = 'DWA-A-138-1' AND ((w.code = 'A138-08' AND f.symbol = 'f_ort') OR (w.code = 'A138-11' AND f.symbol = 'f_K'));
COMMIT;
