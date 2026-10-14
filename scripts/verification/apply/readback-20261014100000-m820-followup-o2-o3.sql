-- Read-back for scripts/migrations/20261014100000_m820_followup_o2_o3.sql (DWA-M 820 follow-up O-2 / O-3). READ ONLY.
-- Run BEFORE the apply (step 0: R0 … R3) and AFTER (R0 … R4). Expected values: vault 01-Projects/ekowai-wizard/m820-wizard-test/
-- 69_APPLY-ORDER-m820-followup-O2-O3.md and the harness tests/harness/m820-followup-o2-o3.integration.test.ts. Signatures sig0 come
-- from the harness seed (2026-10-05 dumps + every M820 block applied on prod up to 20261008100000), sig1 from the harness after the apply.
-- Field signature = md5 of description md5 | visible_when | consumer_worksheets | enum md5 | label_de | label_en | is_required | data_type.
-- Gate signature = md5 of condition | severity | description md5 | clause_reference. No comment line ends with a semicolon.

-- R0 · touched rows at pre / post state (before: fields_pre 2, gates_pre 1, *_post 0 · after: 0 / 2 and 0 / 1)
WITH fv(std, ws, sym, sig0, sig1) AS (VALUES
    ('DWA-M-820-2','820-2-18','testbetrieb_vs_abnahme_choice','15772f8168764ee2882c10b61c59f26e','0483b5deae0975bb559f0252e2cc9247'),
    ('DWA-M-820-2','820-2-17','bauleistungen_vergeben','e7c21572715e51bec1f2967d972829ab','17e7c6e64ee9d02ad172e596d65d5c88')),
gv(std, ws, code, sig0, sig1) AS (VALUES
    ('DWA-M-820-2','820-2-22','REQ-46','38e3610a38be4c2c2185315e51106408','a3b46171855456c13dd328571c20d2e5')),
fl AS (SELECT fv.*, md5(concat_ws('|', md5(coalesce(f.description,'')), coalesce(f.visible_when,''), coalesce(array_to_string(f.consumer_worksheets, ','),''), coalesce(md5(f.enum_values::text),''), f.label_de, coalesce(f.label_en,''), f.is_required::text, f.data_type)) AS sig
         FROM fv JOIN standards s ON s.code = fv.std JOIN worksheet_templates w ON w.standard_id = s.id AND w.code = fv.ws
         JOIN fields f ON f.worksheet_template_id = w.id AND f.symbol = fv.sym AND f.active),
gl AS (SELECT gv.*, md5(concat_ws('|', coalesce(cr.condition,''), cr.severity, md5(coalesce(cr.description,'')), coalesce(cr.clause_reference,''))) AS sig
         FROM gv JOIN standards s ON s.code = gv.std JOIN worksheet_templates w ON w.standard_id = s.id AND w.code = gv.ws
         JOIN compliance_requirements cr ON cr.worksheet_template_id = w.id AND cr.code = gv.code)
SELECT (SELECT count(*) FROM fl) AS fields,
       (SELECT count(*) FROM fl WHERE sig = sig0) AS fields_pre,
       (SELECT count(*) FROM fl WHERE sig = sig1) AS fields_post,
       (SELECT count(*) FROM gl) AS gates,
       (SELECT count(*) FROM gl WHERE sig = sig0) AS gates_pre,
       (SELECT count(*) FROM gl WHERE sig = sig1) AS gates_post,
       (SELECT string_agg(ws || ' ' || sym, ',') FROM fl WHERE sig <> sig0 AND sig <> sig1) AS fields_neither,
       (SELECT string_agg(ws || ' ' || code, ',') FROM gl WHERE sig <> sig0 AND sig <> sig1) AS gates_neither;

-- R1 · the 3 touched rows: rule columns (before: choice visible_when empty, consumers without 820-2-22, REQ-46 unguarded · after: guarded)
SELECT w.code AS ws, 'field' AS kind, f.symbol AS item, coalesce(f.visible_when, '') AS rule, coalesce(array_to_string(f.consumer_worksheets, ','), '') AS consumers, '' AS sev
  FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-2' AND f.active AND (w.code, f.symbol) IN (('820-2-17', 'bauleistungen_vergeben'), ('820-2-18', 'testbetrieb_vs_abnahme_choice'))
UNION ALL
SELECT w.code, 'gate', cr.code, cr.condition, coalesce(cr.clause_reference, ''), cr.severity
  FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-2' AND w.code = '820-2-22' AND cr.code = 'REQ-46'
 ORDER BY 1, 2, 3;

-- R2 · any time: projects with a saved Testbetrieb / Abnahme choice and their construction-award answer (self-built = the choice is hidden after the apply)
SELECT p.name AS project, pc.value_enum AS choice, coalesce(pb.value_boolean::text, '(unanswered)') AS bauleistungen_vergeben
  FROM project_parameters pc JOIN projects p ON p.id = pc.project_id JOIN fields fc ON fc.id = pc.field_id
  JOIN worksheet_templates wc ON wc.id = fc.worksheet_template_id JOIN standards s ON s.id = wc.standard_id
  LEFT JOIN (project_parameters pb JOIN fields fb ON fb.id = pb.field_id AND fb.symbol = 'bauleistungen_vergeben' AND fb.active
             JOIN worksheet_templates wb ON wb.id = fb.worksheet_template_id AND wb.code = '820-2-17')
         ON pb.project_id = pc.project_id AND wb.standard_id = s.id
 WHERE s.code = 'DWA-M-820-2' AND wc.code = '820-2-18' AND fc.symbol = 'testbetrieb_vs_abnahme_choice' AND fc.active
 ORDER BY 1;

-- R3 · O-3 class scan, any time: 820-3 fields that are computed (equation output or widget derived) AND required (expect 0 rows before and after)
SELECT w.code AS ws, f.symbol, f.widget, f.is_required AS req
  FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-3' AND f.active AND f.is_required
   AND (f.widget = 'derived' OR EXISTS (SELECT 1 FROM equations e WHERE e.worksheet_template_id = w.id AND e.output_symbol = f.symbol))
 ORDER BY 1, 2;

-- R4 · after the apply only (the tables exist from then on): archives and ledger (expect 1 / 2 / 3)
SELECT (SELECT count(*) FROM compliance_requirements_archive_m820_o23) AS gate_archive, (SELECT count(*) FROM fields_archive_m820_o23) AS field_archive,
       (SELECT count(*) FROM m820_o23_written) AS written;
