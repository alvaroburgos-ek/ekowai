-- Read-back for scripts/migrations/20261006210000_m820_flow_3.sql (M820 flow block 3, data part — identity symbols). READ ONLY.
-- Run BEFORE the apply (step 0: R0, R1) and AFTER (R0, R1, R2). Expected values come from the embedded-Postgres harness
-- tests/harness/m820-flow-3.integration.test.ts. No comment line ends with a semicolon (prod-query.mjs splits on semicolon + newline).

-- R0 · step 0 and after: the 8 renames — before expect old 1 / new 0 on every row · after old 0 / new 1 (saved_values unchanged, prod 2026-10-06: 8 in total on the 8 renamed fields)
SELECT t.std, t.ws, t.old_symbol, t.new_symbol,
       count(f.id) FILTER (WHERE f.symbol = t.old_symbol) AS old_found, count(f.id) FILTER (WHERE f.symbol = t.new_symbol) AS new_found,
       (SELECT count(*) FROM project_parameters pp JOIN fields f2 ON f2.id = pp.field_id
         WHERE f2.worksheet_template_id = w.id AND f2.symbol IN (t.old_symbol, t.new_symbol)) AS saved_values
  FROM (VALUES ('DWA-M-820-1', 'M820-01', 'project_name_de', 'project_name'), ('DWA-M-820-2', '820-2-01', 'project_name_full', 'project_name'),
               ('DWA-M-820-3', 'M8203-01', 'project_title', 'project_name'), ('DWA-M-820-1', 'M820-01', 'client_organization_name', 'client_name'),
               ('DWA-M-820-2', '820-2-01', 'client_organization', 'client_name'), ('DWA-M-820-3', 'M8203-01', 'client_auftraggeber', 'client_name'),
               ('DWA-M-820-1', 'M820-01', 'date_registration', 'registration_date'), ('DWA-M-820-1', 'M820-23', 'winning_bidder', 'contractor_auftragnehmer'))
       AS t(std, ws, old_symbol, new_symbol)
  JOIN standards s ON s.code = t.std JOIN worksheet_templates w ON w.standard_id = s.id AND w.code = t.ws
  LEFT JOIN fields f ON f.worksheet_template_id = w.id AND f.symbol IN (t.old_symbol, t.new_symbol) AND f.active
 GROUP BY t.std, t.ws, t.old_symbol, t.new_symbol, w.id ORDER BY 1, 2, 3;

-- R1 · step 0 and after: 820-3 REQ-01 — before expect old_ok true · after new_ok true
SELECT cr.code, w.code AS ws, cr.severity, md5(cr.condition) = '0e0883c979c586e8b1f4e9ecd76c8d1c' AS old_ok,
       cr.condition ~ '\mclient_name IS NOT EMPTY\M' AND cr.condition !~ '\mclient_auftraggeber\M' AS new_ok
  FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-3' AND w.code = 'M8203-01' AND cr.code = 'REQ-01';

-- R2 · after: archive rows — expect 8 / 1 (after a rollback 0 / 0)
SELECT (SELECT count(*) FROM fields_archive_m820_flow_3) AS field_archive,
       (SELECT count(*) FROM compliance_requirements_archive_m820_flow_3) AS gate_archive;
