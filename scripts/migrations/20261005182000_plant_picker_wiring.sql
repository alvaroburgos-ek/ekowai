-- Plant reference catalogue · picker WIRING (2026-10-05): the `art` column of the two FLL plant registers becomes a `catalog_pick`
-- cell (text cell + autocomplete over GET /api/plant-catalog, non-normative reference). Every other column stays unchanged.
--   FLL-Naturteich FLLNT-12 `plant_species_list` → pick context: row column `zone` matched against the FLLNT-06 `zonen` register
--     (water depth, submerged technique) and a VISIBLE § 10.4.3 group proposal next to `plant_group` (never written).
--   FLL-GAR-2023 FLL-GAR-24 `pflanzenarten` → no depth context; a Tab.-29 hit shows the red badge inside the picker; the existing
--     `tab29_art` lookup + derived `tab29_flag` + FLL-GAR-24-D2 count stay exactly as block 5b wrote them.
-- GUARD: only a column with key 'art' AND type 'text' is touched (idempotent; a second run matches nothing). The widget must be
-- 'register' with a columns array. Code support: src/lib/eval/field-config.ts (`catalog_pick`), register-editor.tsx, widgets.tsx
-- — deploy that build BEFORE applying, otherwise parseFieldConfig rejects the unknown type and the register shows
-- "Register nicht konfiguriert" (the dynamic fallback input still saves).
-- SAFETY: ui_config only — no field, equation, gate, value or severity changes. Nothing from the catalogue can change a gate result.
-- STAGED — not applied. Apply: node scripts/apply-migration.mjs scripts/migrations/20261005182000_plant_picker_wiring.sql
-- Rollback: scripts/migrations/rollback-20261005182000_plant_picker_wiring.sql
BEGIN;
-- FLLNT-12 plant_species_list.art → catalog_pick with zone / zones / proposal context
UPDATE fields f SET ui_config = jsonb_set(f.ui_config, '{columns}', (
    SELECT jsonb_agg(
      CASE WHEN c->>'key' = 'art' AND c->>'type' = 'text'
           THEN c || '{"type":"catalog_pick","pick":{"zone_column":"zone","zones_symbol":"zonen","propose_group_column":"plant_group"}}'::jsonb
           ELSE c END ORDER BY ord)
    FROM jsonb_array_elements(f.ui_config->'columns') WITH ORDINALITY AS t(c, ord)))
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE f.worksheet_template_id = w.id AND w.code = 'FLLNT-12' AND s.code = 'FLL-Naturteich' AND f.symbol = 'plant_species_list' AND f.active
  AND f.widget = 'register' AND jsonb_typeof(f.ui_config->'columns') = 'array'
  AND EXISTS (SELECT 1 FROM jsonb_array_elements(f.ui_config->'columns') c WHERE c->>'key' = 'art' AND c->>'type' = 'text');
-- FLL-GAR-24 pflanzenarten.art → catalog_pick without context (no depth on this sheet; Tab.-29 badge comes from the API flag)
UPDATE fields f SET ui_config = jsonb_set(f.ui_config, '{columns}', (
    SELECT jsonb_agg(
      CASE WHEN c->>'key' = 'art' AND c->>'type' = 'text'
           THEN c || '{"type":"catalog_pick","pick":{}}'::jsonb
           ELSE c END ORDER BY ord)
    FROM jsonb_array_elements(f.ui_config->'columns') WITH ORDINALITY AS t(c, ord)))
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE f.worksheet_template_id = w.id AND w.code = 'FLL-GAR-24' AND s.code = 'FLL-GAR-2023' AND f.symbol = 'pflanzenarten' AND f.active
  AND f.widget = 'register' AND jsonb_typeof(f.ui_config->'columns') = 'array'
  AND EXISTS (SELECT 1 FROM jsonb_array_elements(f.ui_config->'columns') c WHERE c->>'key' = 'art' AND c->>'type' = 'text');
COMMIT;
-- Read-back (prod-query.mjs): expect 2 rows, each with art_type = 'catalog_pick' and the other columns unchanged in count.
-- select s.code, w.code, f.symbol, c->>'type' art_type, c->'pick' pick, jsonb_array_length(f.ui_config->'columns') ncols
--   from fields f join worksheet_templates w on w.id = f.worksheet_template_id join standards s on s.id = w.standard_id,
--        jsonb_array_elements(f.ui_config->'columns') c
--  where c->>'key' = 'art' and ((w.code = 'FLLNT-12' and f.symbol = 'plant_species_list') or (w.code = 'FLL-GAR-24' and f.symbol = 'pflanzenarten'));
