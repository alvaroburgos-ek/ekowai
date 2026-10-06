-- Read-back for scripts/migrations/20261006200000_m820_flow_2.sql (M820 flow block 2). READ ONLY.
-- Run BEFORE the apply (step 0: R0, R1) and AFTER (R0, R2, R3, R4). Expected values come from the embedded-Postgres harness
-- tests/harness/m820-flow-2.integration.test.ts (seed = the 2026-10-05 dumps + the six applied blocks + REQ-05 block + flow block 1).
-- No comment line ends with a semicolon (prod-query.mjs splits on semicolon + newline).

-- R0 · step 0 and after: planned sheet-order rows per standard — before expect old 6 / 2, new 0 / 0 · after old 0, new 6 / 2
SELECT t.std, count(w.id) FILTER (WHERE w.phase IS NOT DISTINCT FROM t.old_phase AND w.order_index = t.old_order) AS old_match,
       count(w.id) FILTER (WHERE w.phase IS NOT DISTINCT FROM t.new_phase AND w.order_index = t.new_order) AS new_match, count(w.id) AS found
  FROM (VALUES ('DWA-M-820-1', 'M820-16', 4, 16, 3, 11), ('DWA-M-820-1', 'M820-11', 3, 11, 3, 12), ('DWA-M-820-1', 'M820-12', 3, 12, 3, 13),
               ('DWA-M-820-1', 'M820-13', 3, 13, 3, 14), ('DWA-M-820-1', 'M820-14', 3, 14, 3, 15), ('DWA-M-820-1', 'M820-15', 3, 15, 3, 16),
               ('DWA-M-820-2', '820-2-16', 4, 16, 3, 15), ('DWA-M-820-2', '820-2-15', 3, 15, 3, 16)) AS t(std, code, old_phase, old_order, new_phase, new_order)
  LEFT JOIN standards s ON s.code = t.std LEFT JOIN worksheet_templates w ON w.standard_id = s.id AND w.code = t.code
 GROUP BY 1 ORDER BY 1;

-- R1 · step 0: the two phase-goal families on their OLD sheets — expect 63 / M8203-12 / 9 / 3 / live_ok true and 64 / M8203-14 / 13 / 3 / true (prod saved_values 8 / 12)
SELECT fm.fam, fm.ws,
       (SELECT count(*) FROM fields f JOIN worksheet_sections sc ON sc.id = f.section_id AND sc.code = 'B'
         WHERE f.worksheet_template_id = w.id AND f.active AND f.symbol LIKE 'pz\_' || fm.fam || '\_%') AS fields,
       (SELECT count(*) FROM compliance_requirements cr WHERE cr.worksheet_template_id = w.id AND cr.code IN (fm.g1, fm.g1 || '-2', fm.g1 || '-3')) AS gates,
       (SELECT string_agg(md5(cr.condition), ',' ORDER BY cr.code) FROM compliance_requirements cr WHERE cr.worksheet_template_id = w.id AND cr.code IN (fm.g1, fm.g1 || '-2', fm.g1 || '-3'))
         = fm.md5s
       AND NOT EXISTS (SELECT 1 FROM fields f2 JOIN worksheet_sections st ON st.id = f2.section_id AND st.code = 'B' JOIN worksheet_templates wt ON wt.id = st.worksheet_template_id
                        WHERE wt.standard_id = s.id AND wt.code = fm.new_ws AND f2.active) AS live_ok,
       (SELECT count(*) FROM project_parameters pp JOIN fields f ON f.id = pp.field_id JOIN worksheet_templates w3 ON w3.id = f.worksheet_template_id
         WHERE w3.standard_id = s.id AND f.symbol LIKE 'pz\_' || fm.fam || '\_%') AS saved_values
  FROM (VALUES ('63', 'M8203-12', 'M8203-13', 'REQ-10', '179cbd016843c9a978922a1f8938031b,de928cafb161348fce101a8a0f0e27f7,90526a541774bb75a5e4ff117cb83866'),
               ('64', 'M8203-14', 'M8203-15', 'REQ-11', 'c90bc125c86d72d2981080223b487aa9,98b5acb5860fd369d7212a0faba82a04,2b5c3fd599db7e1d751010aad78e4a36'))
       AS fm(fam, ws, new_ws, g1, md5s)
  JOIN standards s ON s.code = 'DWA-M-820-3' JOIN worksheet_templates w ON w.standard_id = s.id AND w.code = fm.ws
 ORDER BY 1;

-- R2 · after: the families on their NEW sheets — expect 63 / M8203-13 / 9 / 3 / 3 / 9 and 64 / M8203-15 / 13 / 3 / 3 / 13 (saved_values unchanged)
SELECT fm.fam, fm.ws,
       (SELECT count(*) FROM fields f JOIN worksheet_sections sc ON sc.id = f.section_id AND sc.code = 'B'
         WHERE f.worksheet_template_id = w.id AND f.active AND f.symbol LIKE 'pz\_' || fm.fam || '\_%') AS fields,
       (SELECT count(*) FROM compliance_requirements cr WHERE cr.worksheet_template_id = w.id AND cr.code IN (fm.g1, fm.g1 || '-2', fm.g1 || '-3')) AS gates,
       (SELECT count(*) FROM compliance_requirements cr WHERE cr.worksheet_template_id = w.id AND cr.code IN (fm.g1, fm.g1 || '-2', fm.g1 || '-3')
           AND position('[Flow 2, 2026-10-06] Blatt / sheet ' || fm.ws IN COALESCE(cr.description, '')) > 0) AS note_ok,
       (SELECT count(*) FROM fields f WHERE f.worksheet_template_id = w.id AND f.active AND f.symbol LIKE 'pz\_' || fm.fam || '\_%'
           AND f.consumer_worksheets IS NOT DISTINCT FROM (CASE WHEN f.symbol LIKE '%\_status' THEN ARRAY['M8203-23','M8203-24']::text[] END)) AS cw_ok,
       (SELECT count(*) FROM project_parameters pp JOIN fields f ON f.id = pp.field_id JOIN worksheet_templates w3 ON w3.id = f.worksheet_template_id
         WHERE w3.standard_id = s.id AND f.symbol LIKE 'pz\_' || fm.fam || '\_%') AS saved_values
  FROM (VALUES ('63', 'M8203-13', 'REQ-10'), ('64', 'M8203-15', 'REQ-11')) AS fm(fam, ws, g1)
  JOIN standards s ON s.code = 'DWA-M-820-3' JOIN worksheet_templates w ON w.standard_id = s.id AND w.code = fm.ws
 ORDER BY 1;

-- R3 · after: archive rows — expect 8 / 22 / 6 (after a rollback 0 / 0 / 0)
SELECT (SELECT count(*) FROM worksheet_templates_archive_m820_flow_2) AS template_archive,
       (SELECT count(*) FROM fields_archive_m820_flow_2) AS field_archive,
       (SELECT count(*) FROM compliance_requirements_archive_m820_flow_2) AS gate_archive;

-- R4 · after: sidebar order (phase, order_index) of 820-1 then 820-2 — expect M820-01 … -10, -16, -11 … -15, -17 … -25 and 820-2-01 … -14, -16, -15, -17 … -28
SELECT w.code FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE s.code IN ('DWA-M-820-1', 'DWA-M-820-2')
 ORDER BY s.code, w.phase NULLS LAST, w.order_index, w.code;
