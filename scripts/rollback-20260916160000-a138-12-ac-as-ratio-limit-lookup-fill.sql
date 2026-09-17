-- ROLLBACK for scripts/migrations/20260916160000_a138_12_ac_as_ratio_limit_lookup_fill.sql (Plan 2b Task 7, GATED D-2b-3).
-- Restores widget/ui_config/lookup of DWA-A-138-1 `ac_as_ratio_limit` on its HOME template A138-12 (mirrors the
-- forward WHERE — `w.code = 'A138-12'`) to NULL. Prior value is NULL by construction:
-- the forward migration only fills rows WHERE widget IS NULL, and the symbol is not among the 36 Plan-1 selection
-- entries (scripts/regulation-tables/selection-config-entries.json carries no 'ac_as_ratio_limit'), so no capture needed.
-- NOT a forward migration: lives in scripts/ so it is never auto-applied. Idempotent + re-runnable.
-- Superseded by the combined scripts/rollback-20260916130000-widget-configs.sql once Plan 2b Task 5 emits it.
--
-- CODE note: with widget NULL again, LOOKUP_BINDINGS_FALLBACK.ac_as_ratio_limit (src/lib/eval/lookup-fill.ts) supplies
-- the identical binding to the form — the engineer sees the same display-mode widget either way.
BEGIN;
UPDATE fields f SET widget = NULL, ui_config = NULL, lookup = NULL
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
  WHERE f.symbol = 'ac_as_ratio_limit' AND s.code = 'DWA-A-138-1' AND w.code = 'A138-12' AND f.worksheet_template_id = w.id AND f.widget = 'lookup_fill';
COMMIT;
