-- Read-back for scripts/migrations/20261015120000_a138_flood_qs_labels.sql (DWA-A 138-1 A138-26: F-A9 Q_S_flood, F-A7 labels). READ ONLY.
-- Run BEFORE the apply (step 0: R0 … R3) and AFTER (R0 … R4). Expected values: vault 01-Projects/ekowai-wizard/m820-wizard-test/
-- 75_APPLY-ORDER-a138-flood-qs-labels.md and the harness tests/harness/a138-flood-qs-labels.integration.test.ts. Signatures sig0 were
-- read on prod 2026-10-15 (READ ONLY) and reproduced by the harness seed, sig1 come from the harness after the apply.
-- Field signature = md5 of description md5 | visible_when | consumer_worksheets | enum md5 | label_de | label_en | is_required |
-- data_type | active. No comment line ends with a semicolon.

-- R0 · touched rows at pre / post state (before: fields_pre 3, fields_post 0 · after: 0 / 3)
WITH fv(std, ws, sym, sig0, sig1) AS (VALUES
    ('DWA-A-138-1','A138-26','Q_S_flood','f5447c2739c8beda2ff1b400c02c03ea','69305977adeb2644f689863dcae3e17a'),
    ('DWA-A-138-1','A138-26','r_D_30','415570e4a1dbb034bbe1f383ab20ef2f','e496695883df1aed0bde1525bafafccf'),
    ('DWA-A-138-1','A138-26','T_n_Ue','6ebeab92c877bf70d1495f0d06791fb3','40ab34998857b0bf67530109b2c242ef')),
fl AS (SELECT fv.*, md5(concat_ws('|', md5(coalesce(f.description,'')), coalesce(f.visible_when,''), coalesce(array_to_string(f.consumer_worksheets, ','),''), coalesce(md5(f.enum_values::text),''), f.label_de, coalesce(f.label_en,''), f.is_required::text, f.data_type, f.active::text)) AS sig
         FROM fv JOIN standards s ON s.code = fv.std JOIN worksheet_templates w ON w.standard_id = s.id AND w.code = fv.ws
         JOIN fields f ON f.worksheet_template_id = w.id AND f.symbol = fv.sym)
SELECT (SELECT count(*) FROM fl) AS fields,
       (SELECT count(*) FROM fl WHERE sig = sig0) AS fields_pre,
       (SELECT count(*) FROM fl WHERE sig = sig1) AS fields_post,
       (SELECT string_agg(ws || ' ' || sym, ',') FROM fl WHERE sig <> sig0 AND sig <> sig1) AS fields_neither;

-- R1 · the 3 touched rows (before: Q_S_flood active + required, r_D_30 label „Regenspende r_D(30) für T_n=30 a“ · after: Q_S_flood inactive, r_D_30 relabelled)
SELECT w.code AS ws, f.symbol, f.active, f.is_required AS req, f.label_de, coalesce(f.label_en, '') AS label_en, left(f.description, 60) AS hint_start
  FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-A-138-1' AND w.code = 'A138-26' AND f.symbol IN ('Q_S_flood', 'r_D_30', 'T_n_Ue')
 ORDER BY 2;

-- R2 · any time: projects with a saved Q_S_flood and the A138-12 Q_S that Gl. (10) actually reads (values kept by the block)
SELECT p.name AS project, pf.value_number AS q_s_flood_saved, pq.value_number AS q_s_a138_12
  FROM project_parameters pf JOIN projects p ON p.id = pf.project_id JOIN fields ff ON ff.id = pf.field_id
  JOIN worksheet_templates wf ON wf.id = ff.worksheet_template_id JOIN standards s ON s.id = wf.standard_id
  LEFT JOIN (project_parameters pq JOIN fields fq ON fq.id = pq.field_id AND fq.symbol = 'Q_S'
             JOIN worksheet_templates wq ON wq.id = fq.worksheet_template_id AND wq.code = 'A138-12')
         ON pq.project_id = pf.project_id AND wq.standard_id = s.id
 WHERE s.code = 'DWA-A-138-1' AND wf.code = 'A138-26' AND ff.symbol = 'Q_S_flood'
 ORDER BY 1;

-- R3 · any time, unchanged by the block: the producer link (expect a138_12_q_s_feeds_26 true, gl10_reads_q_s true, readers_of_q_s_flood 0)
--   readers_of_q_s_flood scans equations, gates AND both visible_when columns (fields.visible_when, worksheet_sections.visible_when)
SELECT (SELECT bool_or('A138-26' = ANY (f.consumer_worksheets)) FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
         WHERE s.code = 'DWA-A-138-1' AND w.code = 'A138-12' AND f.symbol = 'Q_S' AND f.active) AS a138_12_q_s_feeds_26,
       (SELECT bool_or('Q_S' = ANY (e.input_symbols)) FROM equations e JOIN worksheet_templates w ON w.id = e.worksheet_template_id JOIN standards s ON s.id = w.standard_id
         WHERE s.code = 'DWA-A-138-1' AND w.code = 'A138-26' AND e.equation_number = '10') AS gl10_reads_q_s,
       (SELECT count(*) FROM equations e JOIN worksheet_templates w ON w.id = e.worksheet_template_id JOIN standards s ON s.id = w.standard_id
         WHERE s.code = 'DWA-A-138-1' AND (e.formula LIKE '%Q_S_flood%' OR 'Q_S_flood' = ANY (e.input_symbols)))
     + (SELECT count(*) FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id JOIN standards s ON s.id = w.standard_id
         WHERE s.code = 'DWA-A-138-1' AND cr.condition LIKE '%Q_S_flood%')
     + (SELECT count(*) FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
         WHERE s.code = 'DWA-A-138-1' AND f.visible_when LIKE '%Q_S_flood%')
     + (SELECT count(*) FROM worksheet_sections ws JOIN worksheet_templates w ON w.id = ws.worksheet_template_id JOIN standards s ON s.id = w.standard_id
         WHERE s.code = 'DWA-A-138-1' AND ws.visible_when LIKE '%Q_S_flood%') AS readers_of_q_s_flood;

-- R4 · after the apply only (the tables exist from then on): archive and ledger (expect 3 / 3)
SELECT (SELECT count(*) FROM fields_archive_a138_fqs) AS field_archive, (SELECT count(*) FROM a138_fqs_written) AS written;
