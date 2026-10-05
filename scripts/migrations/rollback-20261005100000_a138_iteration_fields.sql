-- ROLLBACK for 20261005100000_a138_iteration_fields.sql — removes the three iteration fields and restores r_D_n_used_R.
-- NOTE: deleting a field cascades to its project_parameters values — run only if that is intended.
BEGIN;
DELETE FROM fields f USING worksheet_templates w, standards s
WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-A-138-1'
  AND (w.code, f.symbol) IN (('A138-17', 'r_D_n_used_M'), ('A138-17', 'D_used_M'), ('A138-18', 'D_used_R'));
UPDATE fields f SET widget = NULL, description = NULL,
  consumer_worksheets = NULLIF(array_remove(array_remove(COALESCE(f.consumer_worksheets, ARRAY[]::text[]), 'A138-19'), 'A138-20'), ARRAY[]::text[])
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE f.worksheet_template_id = w.id AND w.code = 'A138-18' AND s.code = 'DWA-A-138-1' AND f.symbol = 'r_D_n_used_R';
COMMIT;
