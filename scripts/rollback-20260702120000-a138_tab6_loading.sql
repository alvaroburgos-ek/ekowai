-- ROLLBACK for scripts/migrations/20260702120000_a138_tab6_loading.sql
-- Reverses the A138 Tab.6 loading check schema changes:
--   (1) DELETE field `flaechengruppe` from A138-06.
--   (2) REMOVE 'A138-12' from A138-07 `A_C` consumer_worksheets.
--   (3) Set A138-12 `ac_as_ratio_check` data_type back to 'boolean'.
--   (4) DELETE field `ac_as_ratio_check_reason` from A138-12.
-- No project_parameters data is deleted (beyond the value_boolean clear in the
-- forward migration); derived text values in ac_as_ratio_check will be orphaned
-- until the field is re-populated. Idempotent + re-runnable.
--
-- CODE rollback (do separately, before deploying reverted build): revert the
-- materializeLoadingCheck output type, the saveWorksheet loading-check block, and
-- the LoadingCheckOutput type back to the boolean shape.
DO $$
DECLARE
  ws06 uuid;
  ws07 uuid;
  ws12 uuid;
BEGIN
  SELECT wt.id INTO ws06 FROM worksheet_templates wt
    JOIN standards s ON s.id = wt.standard_id
    WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-06';
  SELECT wt.id INTO ws07 FROM worksheet_templates wt
    JOIN standards s ON s.id = wt.standard_id
    WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-07';
  SELECT wt.id INTO ws12 FROM worksheet_templates wt
    JOIN standards s ON s.id = wt.standard_id
    WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-12';

  IF ws06 IS NULL OR ws07 IS NULL OR ws12 IS NULL THEN
    RAISE EXCEPTION 'rollback a138_tab6_loading: worksheet not found (ws06=% ws07=% ws12=%)', ws06, ws07, ws12;
  END IF;

  -- (1) Delete `flaechengruppe` field from A138-06.
  DELETE FROM fields
    WHERE worksheet_template_id = ws06 AND symbol = 'flaechengruppe';

  -- (2) Remove 'A138-12' from A138-07 `A_C` consumer_worksheets.
  UPDATE fields
    SET consumer_worksheets = array_remove(consumer_worksheets, 'A138-12')
    WHERE worksheet_template_id = ws07 AND symbol = 'A_C';

  -- (3) Restore A138-12 `ac_as_ratio_check` data_type to 'boolean'.
  UPDATE fields
    SET data_type = 'boolean'
    WHERE worksheet_template_id = ws12 AND symbol = 'ac_as_ratio_check';

  -- (4) Delete `ac_as_ratio_check_reason` field from A138-12.
  DELETE FROM fields
    WHERE worksheet_template_id = ws12 AND symbol = 'ac_as_ratio_check_reason';

END $$;
