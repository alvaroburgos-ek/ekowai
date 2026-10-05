-- ROLLBACK for 20261005173000_fll_naturteich_followup_hints.sql — restores the pre-block descriptions (inventory snapshot 20261005).
BEGIN;
UPDATE compliance_requirements x SET description = 'All swimming-area water parameters within Tab. 8 target values. Tab. 8 verbatim: ammonium ≤ 0.3, P_total ≤ 0.03 (Type I-III) / ≤ 0.01 (Type IV-V), hardness ≥ 1.0 mmol/l, conductivity ≤ 1000 µS/cm, nitrate ≤ 30.0, nitrite ≤ 0.01, orthophosphate ≤ 0.03 (I-III) / ≤ 0.01 (IV-V), pH 7.0-9.0, KS 4.3 ≥ 2 mmol/l.' FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE x.worksheet_template_id = w.id AND s.code = 'FLL-Naturteich' AND w.code = 'FLLNT-04' AND x.code = 'REQ-10';
COMMIT;
