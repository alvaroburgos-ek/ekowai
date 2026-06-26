-- ROLLBACK for supabase/migrations/20260626140000_a138_area_singlesource.sql
-- Reverses the A138-07 area single-source consolidation:
--   - Re-activates A138-10's four duplicate fields (A_E_b_a_total, A_E_nb_a_total, A_C_sealed, A_C_unsealed).
--   - Deletes the two new A138-07 equations (Gl. 2f / 2g).
--   - Deactivates the two new A138-07 producer fields (A_C_sealed, A_C_unsealed).
--   - Resets A138-07 A_E_ba / A_E_nba consumer_worksheets back to NULL.
-- NOT a forward migration: lives in scripts/ so it is never auto-applied.
-- Idempotent + re-runnable.
--
-- CODE rollback (must be done separately before deploying):
--   - Remove whitelist keys 'A138-07:2f' and 'A138-07:2g' from
--       lib/engine/a138/whitelist.ts  AND  lib/engine/a138/whitelist-client.ts
--   - Remove the two ID consts from A138_07_SURFACE_IDS in both
--       lib/engine/a138/surface-engine.ts  AND  lib/engine/a138/surface-engine-client.ts
--       (A_C_SEALED_ID = 'a1380700-0000-4000-8000-000000000005' and
--        A_C_UNSEALED_ID = 'a1380700-0000-4000-8000-000000000006')
--   - Remove the two aggregator registry entries for A_C_sealed / A_C_unsealed.
--   - Remove 'A_C_sealed' and 'A_C_unsealed' from SURFACE_DERIVED_SYMBOLS,
--     the materialize call list, and the backfill script.
DO $$
DECLARE
  ws07 uuid;
  ws10 uuid;
BEGIN
  SELECT wt.id INTO ws07 FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id
    WHERE s.code='DWA-A-138-1' AND wt.code='A138-07';
  SELECT wt.id INTO ws10 FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id
    WHERE s.code='DWA-A-138-1' AND wt.code='A138-10';
  IF ws07 IS NULL OR ws10 IS NULL THEN
    RAISE EXCEPTION 'rollback: A138-07/10 templates not found (ws07=% ws10=%)', ws07, ws10;
  END IF;

  -- 1. Re-activate A138-10's four duplicate fields (all had is_required=false pre-migration).
  UPDATE fields SET active=true, is_required=false, consumer_worksheets=NULL
    WHERE worksheet_template_id=ws10 AND symbol IN ('A_E_b_a_total','A_E_nb_a_total','A_C_sealed','A_C_unsealed');

  -- 2. Delete the two A138-07 equations added by the forward migration (Gl. 2f / 2g).
  DELETE FROM equations WHERE id IN (
    'a1380702-0000-4000-8000-000000000005',
    'a1380702-0000-4000-8000-000000000006');

  -- 3. Deactivate the two new A138-07 producer fields added by the forward migration.
  UPDATE fields SET active=false, consumer_worksheets=NULL
    WHERE id IN (
      'a1380700-0000-4000-8000-000000000005',
      'a1380700-0000-4000-8000-000000000006');

  -- 4. Reset A138-07 A_E_ba / A_E_nba consumer_worksheets back to NULL
  --    (they had NULL before the forward migration registered A138-10).
  UPDATE fields SET consumer_worksheets=NULL
    WHERE worksheet_template_id=ws07 AND symbol IN ('A_E_ba','A_E_nba');
END $$;
