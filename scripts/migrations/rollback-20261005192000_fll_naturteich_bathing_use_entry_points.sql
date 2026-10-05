-- ROLLBACK for 20261005192000_fll_naturteich_bathing_use_entry_points.sql
BEGIN;
UPDATE fields f SET visible_when = NULL
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND s.code = 'FLL-Naturteich' AND w.code = 'FLLNT-07' AND f.symbol = 'entry_exit_point_count'
   AND f.visible_when = 'bathing_use == ''swimming_pool''';
COMMIT;
