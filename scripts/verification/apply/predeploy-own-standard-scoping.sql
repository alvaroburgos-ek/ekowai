-- Pre-DEPLOY read-only check for the approval-gate change of the DWA-M 820-3 structure block (commit series ef8e4bc + review fix 1):
--   (a) gate fallback / visibility: a symbol that is a field of the gate's own standard is read only from that standard;
--   (b) A4 required-field inheritance: a foreign occurrence of an own symbol counts only when the own standard has no value and,
--       for an enum, the token is one of the own field's tokens;
--   (c) page prefill: an enum is never prefilled with a token outside its own option list.
-- These take effect at the DEPLOY, independent of the 820-3 migration. READ ONLY. Run from C:\Users\Ekowai\_wt-g2t:
--   node scripts/verification/prod-query.mjs C:\Users\Ekowai\_wt-m820\scripts\verification\apply\predeploy-own-standard-scoping.sql
-- No comment line ends with a semicolon (prod-query.mjs splits on semicolon + newline).

-- P1 · every live project where one standard defines a symbol that ANOTHER standard of the same project has a saved value for.
--   own_has_value = false, other_has_value = true → after the deploy the foreign value no longer decides: a gate of own_std that
--     reads the symbol from another sheet waits (pending) instead of using it, and a REQUIRED own field (required_in_own) is no
--     longer counted as filled if the foreign value is an enum token outside the own option list (text / number values still count)
--   own_has_value = true, other_has_value = true, values differ → before: conflict (gate pending / A4 nothing); after: the own value decides
SELECT pr.name AS project, a.symbol, a.std AS own_std, string_agg(DISTINCT b.std, ', ') AS other_stds,
       bool_or(a.is_required) AS required_in_own, bool_or(a.data_type = 'enum') AS enum_in_own,
       bool_or(a.has_value) AS own_has_value, bool_or(b.has_value) AS other_has_value,
       string_agg(DISTINCT a.v, ' | ') AS own_values, string_agg(DISTINCT b.v, ' | ') AS other_values
  FROM (SELECT wi.project_id, s.id AS std_id, s.code AS std, f.symbol, f.is_required, f.data_type,
               pp.id IS NOT NULL AND coalesce(pp.value_number::text, pp.value_text, pp.value_enum, pp.value_boolean::text, pp.value_date::text, pp.value_json::text) IS NOT NULL AS has_value,
               coalesce(pp.value_number::text, pp.value_text, pp.value_enum, pp.value_boolean::text, pp.value_date::text, left(pp.value_json::text, 40)) AS v
          FROM worksheet_instances wi
          JOIN worksheet_templates w ON w.id = wi.worksheet_template_id
          JOIN standards s ON s.id = w.standard_id
          JOIN fields f ON f.worksheet_template_id = w.id AND f.active
          LEFT JOIN project_parameters pp ON pp.project_id = wi.project_id AND pp.field_id = f.id) a
  JOIN (SELECT wi.project_id, s.id AS std_id, s.code AS std, f.symbol,
               pp.id IS NOT NULL AND coalesce(pp.value_number::text, pp.value_text, pp.value_enum, pp.value_boolean::text, pp.value_date::text, pp.value_json::text) IS NOT NULL AS has_value,
               coalesce(pp.value_number::text, pp.value_text, pp.value_enum, pp.value_boolean::text, pp.value_date::text, left(pp.value_json::text, 40)) AS v
          FROM worksheet_instances wi
          JOIN worksheet_templates w ON w.id = wi.worksheet_template_id
          JOIN standards s ON s.id = w.standard_id
          JOIN fields f ON f.worksheet_template_id = w.id AND f.active
          LEFT JOIN project_parameters pp ON pp.project_id = wi.project_id AND pp.field_id = f.id) b
    ON b.project_id = a.project_id AND b.symbol = a.symbol AND b.std_id <> a.std_id
  JOIN projects pr ON pr.id = a.project_id
 GROUP BY pr.name, a.symbol, a.std
HAVING bool_or(b.has_value)
 ORDER BY 1, 2, 3;

-- P2 · the gates of the SB-8 list (20_SIGN-OFF-m820-3) on live projects that carry BOTH standards of the pair — the gate verdicts that may change
SELECT pr.name AS project, x.own_std, x.gate, x.symbol, x.other_std
  FROM (VALUES ('DWA-A-138-1','A138-REQ-03','k_f','DIN-18130-1'),
               ('DWA-A-178','REQ-16','h_RR','DWA-M-187'),
               ('DWA-A-178','REQ-18','A_F','DWA-M-187'),
               ('ISO-5667-1','CR-023','n','DWA-A-138-1'),
               ('ISO-5667-1','CR-023','n','DIN-EN-16941-2'),
               ('ISO-5667-1','CR-023','n','DIN-1989-1'),
               ('DWA-M-1200-1','CR-015','bewaesserungsmethode','DWA-M-1200-2'),
               ('DWA-M-1200-3','CR-15','anwendungsbereich','DIN-1989-1'),
               ('DWA-M-1200-3','CR-15','anwendungsbereich','DWA-M-1200-2'),
               ('DWA-M-187','REQ-03','q_Dr_RBF','DWA-A-178'),
               ('DWA-M-187','REQ-04','q_Dr_RBF','DWA-A-178'),
               ('DWA-M-820-1','REQ-05','risk_register','DWA-M-820-2'),
               ('DWA-M-820-3','REQ-06 … REQ-14 (after the migration)','project_type','DWA-M-820-1'),
               ('DWA-M-820-3','REQ-06 … REQ-14 (after the migration)','project_type','DWA-A-138-1'),
               ('DWA-M-820-3','REQ-06 … REQ-14 (after the migration)','project_type','DIN-276')) AS x(own_std, gate, symbol, other_std)
  JOIN projects pr ON EXISTS (SELECT 1 FROM project_standards ps JOIN standards s ON s.id = ps.standard_id WHERE ps.project_id = pr.id AND s.code = x.own_std)
                  AND EXISTS (SELECT 1 FROM project_standards ps JOIN standards s ON s.id = ps.standard_id WHERE ps.project_id = pr.id AND s.code = x.other_std)
 ORDER BY 1, 2, 3;
