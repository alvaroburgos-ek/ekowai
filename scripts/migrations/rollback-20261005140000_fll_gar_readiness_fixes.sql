-- ROLLBACK for 20261005140000_fll_gar_readiness_fixes.sql — restores the 2026-10-05 pre-block state (hosts, conditions and row values
-- taken literally from the live dump enc-FLL-GAR-2023.json of 2026-10-05).
BEGIN;
-- D7 consumer (the block added FLL-GAR-07; the run proved it absent before — "abdichtungs_art not consumed", fll_gar-C-1 gap)
UPDATE fields f SET consumer_worksheets = NULLIF(array_remove(COALESCE(f.consumer_worksheets, ARRAY[]::text[]), 'FLL-GAR-07'), ARRAY[]::text[])
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE f.worksheet_template_id = w.id AND s.code = 'FLL-GAR-2023' AND w.code = 'FLL-GAR-09' AND f.symbol = 'abdichtungs_art';
-- C-1 literal back: the twelve codes become the one-element range notation again (pre-block live value {FLL-GAR-10..21})
UPDATE fields f SET consumer_worksheets = ARRAY['FLL-GAR-10..21']::text[]
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE f.worksheet_template_id = w.id AND s.code = 'FLL-GAR-2023' AND w.code = 'FLL-GAR-09' AND f.symbol = 'abdichtungs_art'
  AND 'FLL-GAR-10' = ANY (f.consumer_worksheets) AND NOT ('FLL-GAR-07' = ANY (f.consumer_worksheets));
-- D7 REQ-08 back to the empty condition
UPDATE compliance_requirements cr SET condition = ''
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE cr.worksheet_template_id = w.id AND s.code = 'FLL-GAR-2023' AND w.code = 'FLL-GAR-07' AND cr.code = 'REQ-08' AND cr.condition = 'boeschung_steilste_1m >= boeschungsneigung_limit';
-- D6 REQ-02 / REQ-03 back to the `== True` form
UPDATE compliance_requirements cr SET condition = 'lbo_genehmigung_erforderlich == True'
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE cr.worksheet_template_id = w.id AND s.code = 'FLL-GAR-2023' AND w.code = 'FLL-GAR-03' AND cr.code = 'REQ-02' AND cr.condition = 'lbo_genehmigung_erforderlich IS NOT NULL';
UPDATE compliance_requirements cr SET condition = 'whg_einleitung_genehmigung == True'
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE cr.worksheet_template_id = w.id AND s.code = 'FLL-GAR-2023' AND w.code = 'FLL-GAR-03' AND cr.code = 'REQ-03' AND cr.condition = 'whg_einleitung_genehmigung IS NOT NULL';
-- D5 hosts back to FLL-GAR-10 (conditions of REQ-13/14/15/16/20 were never changed)
UPDATE compliance_requirements cr SET worksheet_template_id = (SELECT w10.id FROM worksheet_templates w10 WHERE w10.standard_id = s.id AND w10.code = 'FLL-GAR-10')
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE cr.worksheet_template_id = w.id AND s.code = 'FLL-GAR-2023' AND w.code = 'FLL-GAR-11' AND cr.code = 'REQ-13';
UPDATE compliance_requirements cr SET worksheet_template_id = (SELECT w10.id FROM worksheet_templates w10 WHERE w10.standard_id = s.id AND w10.code = 'FLL-GAR-10')
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE cr.worksheet_template_id = w.id AND s.code = 'FLL-GAR-2023' AND w.code = 'FLL-GAR-12' AND cr.code = 'REQ-14';
UPDATE compliance_requirements cr SET worksheet_template_id = (SELECT w10.id FROM worksheet_templates w10 WHERE w10.standard_id = s.id AND w10.code = 'FLL-GAR-10')
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE cr.worksheet_template_id = w.id AND s.code = 'FLL-GAR-2023' AND w.code = 'FLL-GAR-13' AND cr.code = 'REQ-15';
UPDATE compliance_requirements cr SET worksheet_template_id = (SELECT w10.id FROM worksheet_templates w10 WHERE w10.standard_id = s.id AND w10.code = 'FLL-GAR-10')
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE cr.worksheet_template_id = w.id AND s.code = 'FLL-GAR-2023' AND w.code = 'FLL-GAR-14' AND cr.code = 'REQ-16';
UPDATE compliance_requirements cr SET worksheet_template_id = (SELECT w10.id FROM worksheet_templates w10 WHERE w10.standard_id = s.id AND w10.code = 'FLL-GAR-10')
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE cr.worksheet_template_id = w.id AND s.code = 'FLL-GAR-2023' AND w.code = 'FLL-GAR-18' AND cr.code = 'REQ-20';
-- D5 attestation gates and their fields back to FLL-GAR-10 with the unguarded condition
UPDATE compliance_requirements cr SET condition = 'attest_fll_gar_10_req_19 == True',
  worksheet_template_id = (SELECT w10.id FROM worksheet_templates w10 WHERE w10.standard_id = s.id AND w10.code = 'FLL-GAR-10')
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE cr.worksheet_template_id = w.id AND s.code = 'FLL-GAR-2023' AND w.code = 'FLL-GAR-17' AND cr.code = 'REQ-19';
UPDATE fields f SET worksheet_template_id = (SELECT w10.id FROM worksheet_templates w10 WHERE w10.standard_id = s.id AND w10.code = 'FLL-GAR-10')
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE f.worksheet_template_id = w.id AND s.code = 'FLL-GAR-2023' AND w.code = 'FLL-GAR-17' AND f.symbol = 'attest_fll_gar_10_req_19';
UPDATE compliance_requirements cr SET condition = 'attest_fll_gar_10_req_21 == True',
  worksheet_template_id = (SELECT w10.id FROM worksheet_templates w10 WHERE w10.standard_id = s.id AND w10.code = 'FLL-GAR-10')
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE cr.worksheet_template_id = w.id AND s.code = 'FLL-GAR-2023' AND w.code = 'FLL-GAR-19' AND cr.code = 'REQ-21';
UPDATE fields f SET worksheet_template_id = (SELECT w10.id FROM worksheet_templates w10 WHERE w10.standard_id = s.id AND w10.code = 'FLL-GAR-10')
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE f.worksheet_template_id = w.id AND s.code = 'FLL-GAR-2023' AND w.code = 'FLL-GAR-19' AND f.symbol = 'attest_fll_gar_10_req_21';
-- D15 Tab. 28 row 5 back to the undecidable (U-4) encoding
UPDATE regulation_table_rows r SET row_values = '{"hinweis":"Zelle leer gedruckt (Tab. 28, Zeile 0) — fll_gar-U-4","fussnote":null,"gedruckt":null,"zulaessig":null,"hoehe_min_cm":0}'::jsonb
FROM regulation_tables t
WHERE r.table_id = t.id AND t.standard_code = 'FLL-GAR-2023' AND t.edition = '2023-12' AND t.table_code = 'TAB28'
  AND r.row_key IN ('zero|freiflaeche', 'zero|schwimmteich') AND r.row_values->>'zulaessig' = 'sonder';
COMMIT;
