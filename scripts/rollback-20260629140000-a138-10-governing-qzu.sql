-- ROLLBACK for supabase/migrations/20260629140000_a138_10_governing_qzu.sql
-- Reverses the A138-10 governing-Q_zu consolidation:
--   (1) Delete the two A138-13 producer fields (r_D_n / D_min governing values).
--   (2) Re-activate A138-10's local r_D_n / D_min as required free-typed inputs
--       (their pre-migration state: active=true, is_required=true).
-- No project_parameters data was deleted by the forward migration, so the
-- Köln-Lindenthal r_D_n=200 / D_min=15 rows resurface once A138-10's fields are
-- re-activated. NOT a forward migration: lives in scripts/ so it is never
-- auto-applied. Idempotent + re-runnable.
--
-- CODE rollback (do separately, before deploying the reverted build): revert the
-- materializeBasinGoverning save-path persistence + the A138-10:3 whitelist + the
-- derivedExtras materialization (feat/a138-10-auto-qzu commits).
DO $$
DECLARE
  ws10 uuid;
BEGIN
  -- (1) remove the A138-13 producer fields
  DELETE FROM fields WHERE id IN (
    'd1381310-0000-4000-8000-000000000001',
    'd1381310-0000-4000-8000-000000000002');

  -- (2) restore A138-10's local fields
  SELECT wt.id INTO ws10 FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id
    WHERE s.code='DWA-A-138-1' AND wt.code='A138-10';
  IF ws10 IS NULL THEN
    RAISE EXCEPTION 'rollback A138-10 governing Q_zu: A138-10 not found';
  END IF;
  UPDATE fields SET active=true, is_required=true
    WHERE worksheet_template_id=ws10 AND symbol IN ('r_D_n','D_min');
END $$;
