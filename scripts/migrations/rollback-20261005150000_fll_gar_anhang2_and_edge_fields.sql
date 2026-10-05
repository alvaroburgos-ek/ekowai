-- ROLLBACK for 20261005150000_fll_gar_anhang2_and_edge_fields.sql — restores the 2026-10-05 pre-block state.
BEGIN;
UPDATE fields f SET visible_when = NULL
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND s.code = 'FLL-GAR-2023' AND w.code = 'FLL-GAR-23' AND f.symbol = 'freibord_zu_bauwerk_cm'
   AND f.visible_when = 'abschluss_anwendungsfall == ''bauteil_bauwerk''';
DELETE FROM compliance_requirements cr
 USING worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE cr.worksheet_template_id = w.id AND s.code = 'FLL-GAR-2023' AND w.code = 'FLL-GAR-22' AND cr.code = 'REQ-44'
   AND cr.condition LIKE 'IF Delta_u > 0 THEN g_prime >= %';
COMMIT;
