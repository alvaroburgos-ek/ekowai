-- Generated rollback for the Plan 2b widget migrations (scripts/regulation-tables/emit-widget-configs-sql.ts; reverse apply order). Regenerate, do not hand-edit.
-- Restores widget/ui_config/lookup to NULL — the prior state, because none of these symbols carries a Plan-1 selection config
-- (scripts/regulation-tables/selection-config-entries.json) and every forward migration only filled rows WHERE widget IS NULL.
-- Each statement is guarded by `f.widget = '<widget the forward migration wrote>'` so a row whose widget was later changed by hand
-- is left alone; a never-applied (e.g. still GATED) forward migration makes its rollback statement a no-op. Idempotent + re-runnable.
-- CODE note: with widget NULL again the TS fallbacks (REGISTER_CONFIGS_FALLBACK / REFERENCE_CONFIGS_FALLBACK / LOOKUP_BINDINGS_FALLBACK)
-- serve the identical config — the engineer sees the same widgets either way. NOT a forward migration: lives in scripts/, never auto-applied.
BEGIN;
UPDATE fields f SET widget = NULL, ui_config = NULL, lookup = NULL FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE f.symbol = 'ac_as_ratio_limit' AND s.code = 'DWA-A-138-1' AND w.code = 'A138-12' AND f.worksheet_template_id = w.id AND f.widget = 'lookup_fill';
UPDATE fields f SET widget = NULL, ui_config = NULL, lookup = NULL FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE f.symbol = 'rainfall_table_ref' AND s.code = 'DWA-A-138-1' AND f.worksheet_template_id = w.id AND f.widget = 'reference';
UPDATE fields f SET widget = NULL, ui_config = NULL, lookup = NULL FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE f.symbol = 'pollutant_register' AND s.code = 'VSME' AND f.worksheet_template_id = w.id AND f.widget = 'register';
UPDATE fields f SET widget = NULL, ui_config = NULL, lookup = NULL FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE f.symbol = 'surface_inventory' AND s.code = 'DWA-A-138-1' AND f.worksheet_template_id = w.id AND f.widget = 'register';
COMMIT;
