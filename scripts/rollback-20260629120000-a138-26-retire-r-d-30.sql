-- ROLLBACK for supabase/migrations/20260629120000_a138_26_retire_r_d_30.sql
-- Restores A138-26 `r_D_30` to a REQUIRED input (its pre-migration state:
-- is_required=true, active=true). The forward migration made NO data change,
-- so there is nothing to restore in project_parameters.
-- NOT a forward migration: lives in scripts/ so it is never auto-applied. Idempotent.
--
-- CODE rollback (do separately, before deploying the reverted build): revert the
-- A138-26 Gl.10 flood wiring (Task 5) so it reads the typed r_D_30 + D_flood_min
-- single-eval again instead of iterating the grid's T_n=30 column.
DO $$
DECLARE
  ws uuid;
BEGIN
  SELECT wt.id INTO ws FROM worksheet_templates wt
    JOIN standards s ON s.id = wt.standard_id
    WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-26';
  IF ws IS NULL THEN
    RAISE EXCEPTION 'rollback r_D_30: worksheet A138-26 not found';
  END IF;
  UPDATE fields SET is_required = true
    WHERE worksheet_template_id = ws AND symbol = 'r_D_30';
END $$;
