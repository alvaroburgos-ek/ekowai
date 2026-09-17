-- Rollback for scripts/migrations/20260916110000_vsme_b04_register_equations.sql
-- Removes the three VSME-B04.100 per-medium sum equation rows by (worksheet_template_id, equation_number).
-- The migration only INSERTs (ON CONFLICT DO NOTHING) — there is no prior row state to restore; after this
-- rollback the engine falls back to FALLBACK_REGISTER_EQUATIONS (src/lib/eval/register-configs.ts) again.
-- WRITTEN, NOT APPLIED.
BEGIN;
DELETE FROM equations e
USING worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE e.worksheet_template_id = wt.id
  AND s.code = 'VSME' AND wt.code = 'VSME-B04.100'
  AND e.equation_number IN ('B04.100-air', 'B04.100-water', 'B04.100-soil');
COMMIT;
