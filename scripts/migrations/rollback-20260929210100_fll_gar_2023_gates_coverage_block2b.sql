-- ROLLBACK for 20260929210100_fll_gar_2023_gates_coverage_block2b.sql — restores the pre-block conditions/hosts and deletes REQ-31…REQ-40.
BEGIN;
UPDATE compliance_requirements cr SET condition = 'IF abdichtungs_art == mineralisch_ohne_zusatzstoffe THEN kornanteil_unter_2micron >= 15 AND organische_substanz_VGL <= 5 AND kalkgehalt_VCA <= 15 AND kf_abdichtung <= 0.000000001 AND verdichtungsgrad_Dpr >= 97', source_quote = NULL
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE cr.worksheet_template_id = w.id AND w.code = 'FLL-GAR-10' AND s.code = 'FLL-GAR-2023' AND cr.code = 'REQ-12';
UPDATE compliance_requirements cr SET condition = 'IF abdichtungs_art == bahn_pe THEN peeh_dichte_g_cm3 > 0.940 AND peeh_mfr >= 1.0 AND peeh_mfr <= 3.0 AND peeh_russgehalt_pct >= 2 AND peeh_russgehalt_pct <= 3', source_quote = NULL
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE cr.worksheet_template_id = w.id AND w.code = 'FLL-GAR-10' AND s.code = 'FLL-GAR-2023' AND cr.code = 'REQ-20';
UPDATE compliance_requirements cr SET condition = 'IF abdichtungs_art == bahn_kunststoff_elastomer THEN bahnendicke_mm >= 1.2', worksheet_template_id = w.id, source_quote = NULL
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE w.code = 'FLL-GAR-10' AND s.code = 'FLL-GAR-2023' AND cr.code = 'REQ-18' AND cr.worksheet_template_id = (SELECT w2.id FROM worksheet_templates w2 WHERE w2.standard_id = s.id AND w2.code = 'FLL-GAR-16');
UPDATE compliance_requirements cr SET condition = 'IF abdichtungs_art == alkalisilikat THEN schichtdicke_abdichtung_cm >= 25 AND feinkornanteil_063_pct >= 20', worksheet_template_id = w.id, source_quote = NULL
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE w.code = 'FLL-GAR-10' AND s.code = 'FLL-GAR-2023' AND cr.code = 'REQ-22' AND cr.worksheet_template_id = (SELECT w2.id FROM worksheet_templates w2 WHERE w2.standard_id = s.id AND w2.code = 'FLL-GAR-20');
UPDATE compliance_requirements cr SET condition = '', severity = 'warn', source_quote = NULL
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE cr.worksheet_template_id = w.id AND w.code = 'FLL-GAR-22' AND s.code = 'FLL-GAR-2023' AND cr.code = 'REQ-11';
UPDATE compliance_requirements cr SET condition = '', severity = 'warn', source_quote = NULL
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE cr.worksheet_template_id = w.id AND w.code = 'FLL-GAR-22' AND s.code = 'FLL-GAR-2023' AND cr.code = 'REQ-24';
UPDATE compliance_requirements cr SET condition = 'freibord_zu_gelaende_cm >= 5 AND freibord_zu_bauwerk_cm >= 30', source_quote = NULL
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE cr.worksheet_template_id = w.id AND w.code = 'FLL-GAR-23' AND s.code = 'FLL-GAR-2023' AND cr.code = 'REQ-23';
DELETE FROM compliance_requirements cr USING worksheet_templates w, standards s WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'FLL-GAR-2023' AND w.code = 'FLL-GAR-06' AND cr.code = 'REQ-31';
DELETE FROM compliance_requirements cr USING worksheet_templates w, standards s WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'FLL-GAR-2023' AND w.code = 'FLL-GAR-06' AND cr.code = 'REQ-32';
DELETE FROM compliance_requirements cr USING worksheet_templates w, standards s WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'FLL-GAR-2023' AND w.code = 'FLL-GAR-18' AND cr.code = 'REQ-33';
DELETE FROM compliance_requirements cr USING worksheet_templates w, standards s WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'FLL-GAR-2023' AND w.code = 'FLL-GAR-18' AND cr.code = 'REQ-34';
DELETE FROM compliance_requirements cr USING worksheet_templates w, standards s WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'FLL-GAR-2023' AND w.code = 'FLL-GAR-18' AND cr.code = 'REQ-35';
DELETE FROM compliance_requirements cr USING worksheet_templates w, standards s WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'FLL-GAR-2023' AND w.code = 'FLL-GAR-18' AND cr.code = 'REQ-36';
DELETE FROM compliance_requirements cr USING worksheet_templates w, standards s WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'FLL-GAR-2023' AND w.code = 'FLL-GAR-18' AND cr.code = 'REQ-37';
DELETE FROM compliance_requirements cr USING worksheet_templates w, standards s WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'FLL-GAR-2023' AND w.code = 'FLL-GAR-20' AND cr.code = 'REQ-38';
DELETE FROM compliance_requirements cr USING worksheet_templates w, standards s WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'FLL-GAR-2023' AND w.code = 'FLL-GAR-16' AND cr.code = 'REQ-39';
DELETE FROM compliance_requirements cr USING worksheet_templates w, standards s WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'FLL-GAR-2023' AND w.code = 'FLL-GAR-27' AND cr.code = 'REQ-40';
COMMIT;
