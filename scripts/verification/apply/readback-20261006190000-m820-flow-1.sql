-- Read-back for scripts/migrations/20261006190000_m820_flow_1.sql (M820 flow block 1). READ ONLY.
-- Run BEFORE the apply (step 0: R0a, R0b, R0c) and AFTER (R1 to R5). Expected values come from the embedded-Postgres harness
-- tests/harness/m820-flow-1.integration.test.ts (seed = the 2026-10-05 dumps + blocks 15 / 16 / 17 / 19 / follow-up 1 / risk changes).
-- No comment line ends with a semicolon (prod-query.mjs splits on semicolon + newline).

-- R0a · step 0: the four gates on their old sheets with the guarded values — expect REQ-04 M820-01, REQ-07 M820-04, REQ-14 M820-10, REQ-24 M820-04, live_ok true
SELECT cr.code, w.code AS ws, cr.severity, cr.clause_reference,
       CASE cr.code WHEN 'REQ-07' THEN md5(cr.condition) = '4d24b0248a3353ee098e079f2a7749b0'
                    WHEN 'REQ-04' THEN cr.condition = '' AND md5(COALESCE(cr.description, '')) = '6c931c4fc0603ba6dc5ebc2cc06a13b0'
                    WHEN 'REQ-24' THEN cr.condition = '' AND md5(COALESCE(cr.description, '')) = '9030ce6a7aa94d9cf4997f9fd07864b8'
                    WHEN 'REQ-14' THEN cr.condition = '' AND md5(COALESCE(cr.description, '')) = '0670f04abccbabbabb57b8bbce871c2e' END AS live_ok
  FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-1' AND cr.code IN ('REQ-04','REQ-07','REQ-14','REQ-24')
 ORDER BY 1;

-- R0b · step 0 and after: the 30 planned consumer arrays per standard — before expect old 1 / 4 / 25, new 0 / 0 / 0 · after expect old 0, new 1 / 4 / 25
SELECT t.std, count(f.id) FILTER (WHERE f.consumer_worksheets IS NOT DISTINCT FROM t.old_cw) AS old_match,
       count(f.id) FILTER (WHERE f.consumer_worksheets IS NOT DISTINCT FROM t.new_cw) AS new_match, count(f.id) AS found
  FROM (VALUES
         ('DWA-M-820-1', 'M820-09', 'threshold_status', ARRAY['M820-10','M820-11','M820-12','M820-17','M820-04','M820-23']::text[], ARRAY['M820-10','M820-11','M820-12','M820-17','M820-23']::text[]),
         ('DWA-M-820-3', 'M8203-07', 'qe52_items_rated', NULL::text[], ARRAY['M8203-22']::text[]),
         ('DWA-M-820-3', 'M8203-08', 'qe53_items_rated', NULL::text[], ARRAY['M8203-22']::text[]),
         ('DWA-M-820-3', 'M8203-09', 'qe54_items_rated', NULL::text[], ARRAY['M8203-22']::text[]),
         ('DWA-M-820-3', 'M8203-10', 'qe55_items_rated', NULL::text[], ARRAY['M8203-22']::text[]),
         ('DWA-M-820-3', 'M8203-11', 'qe62_items_rated', NULL::text[], ARRAY['M8203-23']::text[]),
         ('DWA-M-820-3', 'M8203-12', 'qe63a_items_rated', NULL::text[], ARRAY['M8203-23']::text[]),
         ('DWA-M-820-3', 'M8203-13', 'qe63b_items_rated', NULL::text[], ARRAY['M8203-23']::text[]),
         ('DWA-M-820-3', 'M8203-14', 'qe64a_items_rated', NULL::text[], ARRAY['M8203-23']::text[]),
         ('DWA-M-820-3', 'M8203-15', 'qe64b_items_rated', NULL::text[], ARRAY['M8203-23']::text[]),
         ('DWA-M-820-3', 'M8203-16', 'qe65_items_rated', NULL::text[], ARRAY['M8203-23']::text[]),
         ('DWA-M-820-3', 'M8203-17', 'qe66_items_rated', NULL::text[], ARRAY['M8203-23']::text[]),
         ('DWA-M-820-3', 'M8203-18', 'qe67_items_rated', NULL::text[], ARRAY['M8203-23']::text[]),
         ('DWA-M-820-3', 'M8203-03', 'bild1_step_4_einzelprojekt_lifecycle', ARRAY['M8203-11..M8203-18','M8203-23','M8203-24']::text[], ARRAY['M8203-11','M8203-12','M8203-13','M8203-14','M8203-15','M8203-16','M8203-17','M8203-18','M8203-23','M8203-24']::text[]),
         ('DWA-M-820-2', '820-2-01', 'project_name_full', ARRAY['all']::text[], ARRAY['820-2-02','820-2-03','820-2-04','820-2-05','820-2-06','820-2-07','820-2-08','820-2-09','820-2-10','820-2-11','820-2-12','820-2-13','820-2-14','820-2-15','820-2-16','820-2-17','820-2-18','820-2-19','820-2-20','820-2-21','820-2-22','820-2-23','820-2-24','820-2-25','820-2-26','820-2-27','820-2-28']::text[]),
         ('DWA-M-820-2', '820-2-01', 'project_name_short', ARRAY['all']::text[], ARRAY['820-2-02','820-2-03','820-2-04','820-2-05','820-2-06','820-2-07','820-2-08','820-2-09','820-2-10','820-2-11','820-2-12','820-2-13','820-2-14','820-2-15','820-2-16','820-2-17','820-2-18','820-2-19','820-2-20','820-2-21','820-2-22','820-2-23','820-2-24','820-2-25','820-2-26','820-2-27','820-2-28']::text[]),
         ('DWA-M-820-2', '820-2-01', 'project_number', ARRAY['all']::text[], ARRAY['820-2-02','820-2-03','820-2-04','820-2-05','820-2-06','820-2-07','820-2-08','820-2-09','820-2-10','820-2-11','820-2-12','820-2-13','820-2-14','820-2-15','820-2-16','820-2-17','820-2-18','820-2-19','820-2-20','820-2-21','820-2-22','820-2-23','820-2-24','820-2-25','820-2-26','820-2-27','820-2-28']::text[]),
         ('DWA-M-820-2', '820-2-01', 'worksheet_status', ARRAY['all']::text[], NULL::text[]),
         ('DWA-M-820-3', 'M8203-01', 'applicable_lph', ARRAY['ALL']::text[], ARRAY['M8203-02','M8203-03','M8203-04','M8203-05','M8203-06','M8203-07','M8203-08','M8203-09','M8203-10','M8203-11','M8203-12','M8203-13','M8203-14','M8203-15','M8203-16','M8203-17','M8203-18','M8203-19','M8203-20','M8203-21','M8203-22','M8203-23','M8203-24']::text[]),
         ('DWA-M-820-3', 'M8203-01', 'client_auftraggeber', ARRAY['ALL']::text[], ARRAY['M8203-02','M8203-03','M8203-04','M8203-05','M8203-06','M8203-07','M8203-08','M8203-09','M8203-10','M8203-11','M8203-12','M8203-13','M8203-14','M8203-15','M8203-16','M8203-17','M8203-18','M8203-19','M8203-20','M8203-21','M8203-22','M8203-23','M8203-24']::text[]),
         ('DWA-M-820-3', 'M8203-01', 'contract_reference', ARRAY['ALL']::text[], ARRAY['M8203-02','M8203-03','M8203-04','M8203-05','M8203-06','M8203-07','M8203-08','M8203-09','M8203-10','M8203-11','M8203-12','M8203-13','M8203-14','M8203-15','M8203-16','M8203-17','M8203-18','M8203-19','M8203-20','M8203-21','M8203-22','M8203-23','M8203-24']::text[]),
         ('DWA-M-820-3', 'M8203-01', 'contractor_auftragnehmer', ARRAY['ALL']::text[], ARRAY['M8203-02','M8203-03','M8203-04','M8203-05','M8203-06','M8203-07','M8203-08','M8203-09','M8203-10','M8203-11','M8203-12','M8203-13','M8203-14','M8203-15','M8203-16','M8203-17','M8203-18','M8203-19','M8203-20','M8203-21','M8203-22','M8203-23','M8203-24']::text[]),
         ('DWA-M-820-3', 'M8203-01', 'project_location', ARRAY['ALL']::text[], ARRAY['M8203-02','M8203-03','M8203-04','M8203-05','M8203-06','M8203-07','M8203-08','M8203-09','M8203-10','M8203-11','M8203-12','M8203-13','M8203-14','M8203-15','M8203-16','M8203-17','M8203-18','M8203-19','M8203-20','M8203-21','M8203-22','M8203-23','M8203-24']::text[]),
         ('DWA-M-820-3', 'M8203-01', 'project_number', ARRAY['ALL']::text[], ARRAY['M8203-02','M8203-03','M8203-04','M8203-05','M8203-06','M8203-07','M8203-08','M8203-09','M8203-10','M8203-11','M8203-12','M8203-13','M8203-14','M8203-15','M8203-16','M8203-17','M8203-18','M8203-19','M8203-20','M8203-21','M8203-22','M8203-23','M8203-24']::text[]),
         ('DWA-M-820-3', 'M8203-01', 'project_title', ARRAY['ALL']::text[], ARRAY['M8203-02','M8203-03','M8203-04','M8203-05','M8203-06','M8203-07','M8203-08','M8203-09','M8203-10','M8203-11','M8203-12','M8203-13','M8203-14','M8203-15','M8203-16','M8203-17','M8203-18','M8203-19','M8203-20','M8203-21','M8203-22','M8203-23','M8203-24']::text[]),
         ('DWA-M-820-3', 'M8203-01', 'registration_date', ARRAY['ALL']::text[], ARRAY['M8203-02','M8203-03','M8203-04','M8203-05','M8203-06','M8203-07','M8203-08','M8203-09','M8203-10','M8203-11','M8203-12','M8203-13','M8203-14','M8203-15','M8203-16','M8203-17','M8203-18','M8203-19','M8203-20','M8203-21','M8203-22','M8203-23','M8203-24']::text[]),
         ('DWA-M-820-3', 'M8203-03', 'phase_definition_acknowledged', ARRAY['ALL']::text[], ARRAY['M8203-24']::text[]),
         ('DWA-M-820-3', 'M8203-03', 'phasenziele_definition_acknowledged', ARRAY['ALL']::text[], ARRAY['M8203-24']::text[]),
         ('DWA-M-820-3', 'M8203-03', 'projektziele_definition_acknowledged', ARRAY['ALL']::text[], ARRAY['M8203-24']::text[]),
         ('DWA-M-820-3', 'M8203-03', 'qe_definition_acknowledged', ARRAY['ALL']::text[], ARRAY['M8203-24']::text[])
       ) AS t(std, ws, symbol, old_cw, new_cw)
  LEFT JOIN standards s ON s.code = t.std
  LEFT JOIN worksheet_templates w ON w.standard_id = s.id AND w.code = t.ws
  LEFT JOIN fields f ON f.worksheet_template_id = w.id AND f.symbol = t.symbol AND f.active
 GROUP BY 1 ORDER BY 1;

-- R0c · step 0 and after: projektstopp_review_triggered — sheet, section, order, consumer, saved project values (prod 2026-10-06: M8203-02 / C / 0 / {M8203-24} / 0)
SELECT w.code AS ws, sc.code AS section, f.order_index, array_to_string(f.consumer_worksheets, ',') AS cw,
       (SELECT count(*) FROM project_parameters pp WHERE pp.field_id = f.id) AS saved_values,
       position('[Flow 1, 2026-10-06]' IN COALESCE(f.description, '')) > 0 AS note_ok
  FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
  LEFT JOIN worksheet_sections sc ON sc.id = f.section_id
 WHERE s.code = 'DWA-M-820-3' AND f.symbol = 'projektstopp_review_triggered';

-- R1 · after: the four gates on their new sheets — expect REQ-04 M820-03, REQ-07 M820-09, REQ-14 M820-14, REQ-24 M820-09, cond_ok true, note_ok true
SELECT cr.code, w.code AS ws, cr.severity, cr.clause_reference,
       CASE cr.code WHEN 'REQ-07' THEN md5(cr.condition) = '4d24b0248a3353ee098e079f2a7749b0' ELSE cr.condition = '' END AS cond_ok,
       position('[Flow 1, 2026-10-06] Blatt / sheet ' || w.code IN cr.description) > 0 AS note_ok
  FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-1' AND cr.code IN ('REQ-04','REQ-07','REQ-14','REQ-24')
 ORDER BY 1;

-- R2 · after: no consumer entry "all" / "ALL" / ".." left in 820-2 / 820-3 — expect 0 rows
SELECT s.code AS std, w.code AS ws, f.symbol, array_to_string(f.consumer_worksheets, ',') AS cw
  FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code IN ('DWA-M-820-2','DWA-M-820-3') AND f.active
   AND EXISTS (SELECT 1 FROM unnest(f.consumer_worksheets) c WHERE upper(c) = 'ALL' OR c LIKE '%..%')
 ORDER BY 1, 2, 3;

-- R3 · after: threshold_status no longer passed back to M820-04 — expect cw M820-10,M820-11,M820-12,M820-17,M820-23
SELECT w.code AS ws, f.symbol, array_to_string(f.consumer_worksheets, ',') AS cw
  FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-1' AND f.symbol = 'threshold_status';

-- R4 · after: archives — expect gate_archive 4, field_archive 31 (a re-apply keeps them)
SELECT (SELECT count(*) FROM compliance_requirements_archive_m820_flow_1) AS gate_archive,
       (SELECT count(*) FROM fields_archive_m820_flow_1) AS field_archive;

-- R5 · after: gates per touched sheet (expect M820-01 none of REQ-04 · M820-03 REQ-04/warn · M820-04 REQ-02/block, REQ-05/warn (until block 20261006180000) · M820-09 REQ-07/block, REQ-24/warn · M820-10 without REQ-14 · M820-14 REQ-14/warn)
SELECT w.code AS ws, string_agg(cr.code || '/' || cr.severity, ', ' ORDER BY cr.code) AS gates
  FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-1' AND w.code IN ('M820-01','M820-03','M820-04','M820-09','M820-10','M820-14')
 GROUP BY 1 ORDER BY 1;
