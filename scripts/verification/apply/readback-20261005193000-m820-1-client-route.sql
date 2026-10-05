-- Read-back for scripts/migrations/20261005193000_m820_1_client_route.sql (DWA-M 820-1 client route). READ ONLY.
-- Run BEFORE the apply (step 0: R0 must show the baseline md5s) and AFTER (R1–R7 must show the expected values below).
-- Expected values were produced by the embedded-Postgres harness tests/harness/m820-1-client-route.integration.test.ts.

-- R0 · step 0 (before apply): the five guarded gates still carry the 2026-10-05 baseline text
--   expect: M820-04 REQ-07 2a0ff00c0efd0d54f3c34ff21b24c16d · M820-10 REQ-08 05c772bcfc41d111251f7aa2c900f845 ·
--           M820-12 REQ-10 759e85932a46e82593a24a61c100ddc9 · M820-23 REQ-22 7dedd983ac1ee5c379da759d5fbab75c ·
--           M820-23 REQ-26 dda8ecb39354511117b4341ff7f427ce
--   after apply: REQ-07 4d24b0248a3353ee098e079f2a7749b0 · REQ-08 094314327fc9edb2e6f3dfe37bb1f218 ·
--                REQ-10 94c9cc67f87fa3416961a6afca0cd315 · REQ-22 a3d7e2430a028e455f7bab44438c3c94 ·
--                REQ-26 471a80a40ed8345f2d0fe634e846c5bc   (R4)
SELECT w.code AS ws, cr.code, cr.severity, md5(cr.condition) AS md5
  FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-1' AND cr.code IN ('REQ-07','REQ-08','REQ-10','REQ-22','REQ-26')
 ORDER BY 1, 2;

-- R0b · step 0 (before apply): M820-1 projects whose client type is still blank — after the apply every guarded gate on
--   those projects reads pending (asks for the client type) until it is entered. Expect a count; list them to the owner.
SELECT count(DISTINCT wi.project_id) AS projects_with_m820_01,
       count(DISTINCT wi.project_id) FILTER (WHERE p.value_enum IS NULL) AS client_type_blank
  FROM worksheet_instances wi
  JOIN worksheet_templates w ON w.id = wi.worksheet_template_id AND w.code = 'M820-01'
  JOIN standards s ON s.id = w.standard_id AND s.code = 'DWA-M-820-1'
  JOIN fields f ON f.worksheet_template_id = w.id AND f.symbol = 'client_organization_type'
  LEFT JOIN project_parameters p ON p.project_id = wi.project_id AND p.field_id = f.id;

-- R1 · client tokens on M820-01 — before: 6 (municipality … other); after: 8, the last two privat_ohne_foerderung, privat_mit_foerderung
SELECT f.symbol, jsonb_array_length(f.enum_values) AS n, (SELECT string_agg(e->>'value', ',' ORDER BY (e->>'order_index')::int) FROM jsonb_array_elements(f.enum_values) e) AS tokens
  FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-1' AND w.code = 'M820-01' AND f.symbol = 'client_organization_type';

-- R2 · the decision field — before: 0 rows; after: 1 row, data_type boolean, is_required true, active true,
--   visible_when = client_organization_type == 'privat_ohne_foerderung', same section as client_organization_type, 7 consumers
SELECT f.symbol, f.data_type, f.is_required, f.active, f.visible_when, f.consumer_worksheets,
       f.section_id = (SELECT f0.section_id FROM fields f0 WHERE f0.worksheet_template_id = f.worksheet_template_id AND f0.symbol = 'client_organization_type') AS same_section,
       f.verification_status, left(f.verification_quote, 60) AS quote_start
  FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-1' AND w.code = 'M820-01' AND f.symbol = 'vergaberecht_freiwillig_angewendet';

-- R3 · consumer reach (after: each array contains the listed codes; existing entries kept in their order)
--   client_organization_type ⊇ {M820-04,M820-10,M820-12,M820-17,M820-23} · procurement_procedure ⊇ {M820-12,M820-17} ·
--   threshold_status ⊇ {M820-04,M820-23}
SELECT w.code AS ws, f.symbol, f.consumer_worksheets
  FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-1' AND ((w.code = 'M820-01' AND f.symbol = 'client_organization_type')
    OR (w.code = 'M820-10' AND f.symbol = 'procurement_procedure') OR (w.code = 'M820-09' AND f.symbol = 'threshold_status'))
 ORDER BY 1;

-- R4 · the guarded gate texts (after: each starts with IF (client_organization_type != 'privat_ohne_foerderung' OR …)
SELECT w.code AS ws, cr.code, cr.condition
  FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-1' AND cr.code IN ('REQ-07','REQ-08','REQ-10','REQ-22','REQ-26')
 ORDER BY 1, 2;

-- R5 · hidden-when fields — before: visible_when NULL (3 rows); after: md5(visible_when) =
--   publication_date a89b0fa9514a3df2ffa9e1e69d71bbde (G AND procurement_procedure == 'vgv_f') ·
--   required_standstill_days, standstill_period_days 11d2d717f0a9371acb4b922a8187551a (G AND threshold_status == 'oberschwellig')
SELECT w.code AS ws, f.symbol, f.is_required, f.visible_when, md5(f.visible_when) AS md5
  FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-1' AND ((w.code = 'M820-17' AND f.symbol = 'publication_date')
    OR (w.code = 'M820-23' AND f.symbol IN ('required_standstill_days','standstill_period_days')))
 ORDER BY 1, 2;

-- R6 · saved project values that use the new tokens / the decision field (run before a rollback; after a fresh apply: 0)
SELECT f.symbol, coalesce(p.value_enum, p.value_boolean::text) AS value, count(*) AS n
  FROM project_parameters p JOIN fields f ON f.id = p.field_id JOIN worksheet_templates w ON w.id = f.worksheet_template_id
  JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-1' AND w.code = 'M820-01'
   AND ((f.symbol = 'client_organization_type' AND p.value_enum IN ('privat_ohne_foerderung','privat_mit_foerderung'))
     OR f.symbol = 'vergaberecht_freiwillig_angewendet')
 GROUP BY 1, 2 ORDER BY 1, 2;

-- R7 · archives (exist only once the block has run) — after the apply: 5 gate rows, 6 field rows (fewer only if a row was already in its target state),
--   after a rollback: 0 / 0
SELECT 'gates' AS archive, count(*) AS n FROM compliance_requirements_archive_m820_1_client_route
UNION ALL SELECT 'fields', count(*) FROM fields_archive_m820_1_client_route;
