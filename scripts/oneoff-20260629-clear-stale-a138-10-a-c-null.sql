-- ONE-OFF prod data fix (not a schema migration) — 2026-06-29.
-- Remove A138-10's STALE local A_C param row on PLT-HS-01: a NULL placeholder
-- (source_type='entered', value_number IS NULL, from 2026-06-25) left by the
-- area-consolidation that deactivated A138-10's local A_C. Because a local param
-- row wins even when NULL (page.tsx:169-192), it shadows the real A_C=4836.43
-- produced by A138-07 → A138-10 Gl.3 shows "Fehlt: A_C". Deleting the placeholder
-- lets A_C seed from A138-07 via the same-symbol path.
-- GUARDED to value_number IS NULL so only the empty placeholder is removed — never
-- a real value. Scoped to A138-10 / A_C / PLT-HS-01.
DELETE FROM project_parameters pp
USING fields f, worksheet_templates wt, standards s
WHERE pp.field_id = f.id
  AND f.worksheet_template_id = wt.id
  AND wt.standard_id = s.id
  AND s.code = 'DWA-A-138-1'
  AND wt.code = 'A138-10'
  AND f.symbol = 'A_C'
  AND pp.project_id = '02f93026-fb20-4463-abd6-540befc049a9'
  AND pp.value_number IS NULL;
