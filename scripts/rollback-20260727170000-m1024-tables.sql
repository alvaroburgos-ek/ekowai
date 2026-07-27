-- ROLLBACK for 20260727170000_m1024_gap1_tables.sql
-- The standard had ZERO regulation_tables rows before the migration (verified live), so
-- rollback = delete everything under it. Restores the GAP-1 state honestly.
DO $$
DECLARE v_std uuid; v_n int;
BEGIN
  SELECT id INTO v_std FROM standards WHERE code = 'DWA-M-102-4';
  DELETE FROM regulation_tables WHERE standard_id = v_std;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RAISE NOTICE 'GAP1 M-102-4 ROLLBACK: % rows deleted', v_n;
END $$;
