-- ROLLBACK for 20261005120000_fll_tp_rhizom_conditional_fields.sql — restores the 2026-10-05 pre-block state.
BEGIN;
UPDATE fields f SET visible_when = NULL
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE f.worksheet_template_id = w.id AND s.code = 'FLL-TP-RHIZOM-2023' AND w.code = 'FLLTP-RHZ-09'
  AND f.symbol IN ('arbeitsfuge_zeitabstand_h', 'naht_anzahl_wand_eck', 'naht_anzahl_boden_eck', 'naht_anzahl_t_naht', 'naht_anzahl_laengs_2_pruefmuster', 'pruefmuster_2_versatz_grad');
UPDATE fields f SET is_required = false, visible_when = NULL
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE f.worksheet_template_id = w.id AND s.code = 'FLL-TP-RHIZOM-2023' AND w.code = 'FLLTP-RHZ-02' AND f.symbol = 'schutzschicht_definition';
UPDATE fields f SET consumer_worksheets = NULLIF(array_remove(COALESCE(f.consumer_worksheets, ARRAY[]::text[]), 'FLLTP-RHZ-06'), ARRAY[]::text[])
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE f.worksheet_template_id = w.id AND s.code = 'FLL-TP-RHIZOM-2023' AND w.code = 'FLLTP-RHZ-09'
  AND f.symbol IN ('vts_untere_schicht_dicke_mm', 'vts_obere_schicht_dicke_mm');
COMMIT;
