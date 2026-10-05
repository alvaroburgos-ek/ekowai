-- ROLLBACK for 20261005182000_plant_picker_wiring.sql — the `art` column of both FLL plant registers back to type 'text', the
-- `pick` key removed; every other column untouched. Guarded on type 'catalog_pick' (idempotent). STAGED — not applied.
BEGIN;
UPDATE fields f SET ui_config = jsonb_set(f.ui_config, '{columns}', (
    SELECT jsonb_agg(
      CASE WHEN c->>'key' = 'art' AND c->>'type' = 'catalog_pick'
           THEN (c - 'pick') || '{"type":"text"}'::jsonb
           ELSE c END ORDER BY ord)
    FROM jsonb_array_elements(f.ui_config->'columns') WITH ORDINALITY AS t(c, ord)))
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE f.worksheet_template_id = w.id AND f.widget = 'register' AND jsonb_typeof(f.ui_config->'columns') = 'array'
  AND ((w.code = 'FLLNT-12' AND s.code = 'FLL-Naturteich' AND f.symbol = 'plant_species_list')
    OR (w.code = 'FLL-GAR-24' AND s.code = 'FLL-GAR-2023' AND f.symbol = 'pflanzenarten'))
  AND EXISTS (SELECT 1 FROM jsonb_array_elements(f.ui_config->'columns') c WHERE c->>'key' = 'art' AND c->>'type' = 'catalog_pick');
COMMIT;
