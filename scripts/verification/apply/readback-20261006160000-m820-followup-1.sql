-- Read-back for scripts/migrations/20261006160000_m820_followup_1.sql (M820 follow-up block 1). READ ONLY.
-- Run BEFORE the apply (step 0: R0a, R0b, R0c) and AFTER (R1 to R4). Expected values come from the embedded-Postgres harness
-- tests/harness/m820-followup-1.integration.test.ts (seed = the 2026-10-05 dumps + blocks 15 / 16 / 17 / 19). No comment line
-- ends with a semicolon (prod-query.mjs splits on semicolon + newline).

-- R0a · step 0: REQ-20 / REQ-21 still on M8203-11 with their 2026-10-05 condition — expect 2 rows, ws M8203-11, severity warn, live_ok true
SELECT cr.code, w.code AS ws, cr.severity, cr.clause_reference, md5(cr.condition) AS md5_live,
       (cr.code, md5(cr.condition)) IN (('REQ-20','bbae8277c3de31e19ff4303da2b66633'),('REQ-21','ab3758b9f6a5a3fa1878465ecf48989b')) AS live_ok
  FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-3' AND cr.code IN ('REQ-20','REQ-21')
 ORDER BY 1;

-- R0b · step 0: ANHB23 rows (expect 6 before, 8 after) and the block-15 tokens on client_organization_type (expect 2 = block 15 is applied)
SELECT (SELECT count(*) FROM regulation_table_rows r JOIN regulation_tables t ON t.id = r.table_id
         WHERE t.standard_code = 'DWA-M-820-1' AND t.edition = '2020' AND t.table_code = 'ANHB23') AS anhb23_rows,
       (SELECT count(*) FROM regulation_table_rows r JOIN regulation_tables t ON t.id = r.table_id
         WHERE t.standard_code = 'DWA-M-820-1' AND t.table_code = 'ANHB23' AND r.row_key IN ('privat_ohne_foerderung','privat_mit_foerderung')) AS privat_rows,
       (SELECT count(*) FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id,
               jsonb_array_elements(f.enum_values) e
         WHERE s.code = 'DWA-M-820-1' AND w.code = 'M820-01' AND f.symbol = 'client_organization_type'
           AND e->>'value' IN ('privat_ohne_foerderung','privat_mit_foerderung')) AS privat_tokens;

-- R0c · step 0 + after the M820-09 recompute (25_ step 3): projects with a private client — type, entered threshold, table twin, D3 code
SELECT p.name AS project, ot.value_enum AS client_type, ev.value_number AS eu_threshold_value,
       tw.value_number AS eu_threshold_value_anhb23, kc.value_number AS eu_threshold_konsistent_code
  FROM projects p
  JOIN project_parameters ot ON ot.project_id = p.id
  JOIN fields fo ON fo.id = ot.field_id AND fo.symbol = 'client_organization_type'
  JOIN worksheet_templates wo ON wo.id = fo.worksheet_template_id AND wo.code = 'M820-01'
  LEFT JOIN LATERAL (SELECT pp.value_number FROM project_parameters pp JOIN fields f ON f.id = pp.field_id JOIN worksheet_templates w ON w.id = f.worksheet_template_id
                      WHERE pp.project_id = p.id AND w.code = 'M820-09' AND f.symbol = 'eu_threshold_value') ev ON true
  LEFT JOIN LATERAL (SELECT pp.value_number FROM project_parameters pp JOIN fields f ON f.id = pp.field_id JOIN worksheet_templates w ON w.id = f.worksheet_template_id
                      WHERE pp.project_id = p.id AND w.code = 'M820-09' AND f.symbol = 'eu_threshold_value_anhb23') tw ON true
  LEFT JOIN LATERAL (SELECT pp.value_number FROM project_parameters pp JOIN fields f ON f.id = pp.field_id JOIN worksheet_templates w ON w.id = f.worksheet_template_id
                      WHERE pp.project_id = p.id AND w.code = 'M820-09' AND f.symbol = 'eu_threshold_konsistent_code') kc ON true
 WHERE ot.value_enum IN ('privat_ohne_foerderung','privat_mit_foerderung')
 ORDER BY 1;

-- R1 · after: REQ-20 / REQ-21 on M8203-23, severity warn, condition md5 unchanged (cond_ok true), description carries the note
SELECT cr.code, w.code AS ws, cr.severity, cr.clause_reference,
       (cr.code, md5(cr.condition)) IN (('REQ-20','bbae8277c3de31e19ff4303da2b66633'),('REQ-21','ab3758b9f6a5a3fa1878465ecf48989b')) AS cond_ok,
       position('[Follow-up 1, 2026-10-06]' IN cr.description) > 0 AS note_ok
  FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-3' AND cr.code IN ('REQ-20','REQ-21')
 ORDER BY 1;

-- R2 · after: the ANHB23 rows — expect 8, bundesbehoerde 139000, the seven others 214000
SELECT r.row_key, r.order_index, (r.row_values->>'schwellenwert_eur')::numeric AS eur, r.row_values->>'gruppe_gedruckt' AS gruppe, r.verbatim_quote
  FROM regulation_table_rows r JOIN regulation_tables t ON t.id = r.table_id
 WHERE t.standard_code = 'DWA-M-820-1' AND t.edition = '2020' AND t.table_code = 'ANHB23'
 ORDER BY r.order_index, r.row_key;

-- R3 · after: archive + ledger — expect gate_archive 2, rows_added 2 (a re-apply keeps both at 2)
SELECT (SELECT count(*) FROM compliance_requirements_archive_m820_followup_1) AS gate_archive,
       (SELECT count(*) FROM regulation_table_rows_added_m820_followup_1) AS rows_added;

-- R4 · after: nothing else on M8203-11 / M8203-23 changed — the gates per sheet (expect M8203-11: REQ-09, REQ-09-2, REQ-09-3, REQ-19 · M8203-23: REQ-20, REQ-21)
SELECT w.code AS ws, string_agg(cr.code || '/' || cr.severity, ', ' ORDER BY cr.code) AS gates
  FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-3' AND w.code IN ('M8203-11','M8203-23')
 GROUP BY 1 ORDER BY 1;
