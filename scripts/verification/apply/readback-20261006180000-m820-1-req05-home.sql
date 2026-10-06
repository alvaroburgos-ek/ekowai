-- Read-back for scripts/migrations/20261006180000_m820_1_req05_home.sql (DWA-M 820-1 REQ-05 M820-04 → M820-07). READ ONLY.
-- Run BEFORE the apply (step 0: R0) and AFTER (R1 to R3). Expected values come from the embedded-Postgres harness
-- tests/harness/m820-1-req05-home.integration.test.ts (seed = the 2026-10-05 dump + block 15). No comment line
-- ends with a semicolon (prod-query.mjs splits on semicolon + newline).

-- R0 · step 0: REQ-05 still on M820-04 with its 2026-10-05 condition — expect 1 row, ws M820-04, severity warn, clause §4.7, Anh. A, live_ok true
SELECT cr.code, w.code AS ws, cr.severity, cr.clause_reference, md5(cr.condition) AS md5_live,
       md5(cr.condition) = '6dd012ea1d023fd20fc913b50b417c6c' AS live_ok
  FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-1' AND cr.code = 'REQ-05'
 ORDER BY 1;

-- R1 · after: REQ-05 on M820-07, severity warn, clause unchanged, condition md5 unchanged (cond_ok true), description carries the note
SELECT cr.code, w.code AS ws, cr.severity, cr.clause_reference,
       md5(cr.condition) = '6dd012ea1d023fd20fc913b50b417c6c' AS cond_ok,
       position('[REQ-05 home, 2026-10-06]' IN cr.description) > 0 AS note_ok
  FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-1' AND cr.code = 'REQ-05'
 ORDER BY 1;

-- R2 · after: archive — expect gate_archive 1 (a re-apply keeps it at 1)
SELECT (SELECT count(*) FROM compliance_requirements_archive_m820_1_req05_home) AS gate_archive;

-- R3 · after: nothing else on M820-04 / M820-07 changed — the gates per sheet (expect M820-04: REQ-02/block, REQ-07/block, REQ-24/warn · M820-07: REQ-05/warn)
SELECT w.code AS ws, string_agg(cr.code || '/' || cr.severity, ', ' ORDER BY cr.code) AS gates
  FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-1' AND w.code IN ('M820-04','M820-07')
 GROUP BY 1 ORDER BY 1;
