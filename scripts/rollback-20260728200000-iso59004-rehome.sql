-- ROLLBACK for 20260728200000_iso59004_rehome_cr003_005.sql
-- Restores CR-003/004/005 to their original home worksheet_template_id = ISO-59004-01.
DO $$
DECLARE v_n int := 0;
  ws01 uuid := 'd8783583-55f5-4224-ab4e-fa6aace611e7';
BEGIN
  UPDATE compliance_requirements SET worksheet_template_id = ws01
   WHERE id IN ('102122d1-acd6-43f1-b9d6-eab15744b171',
                '3a33395b-79f1-4a45-be55-1e7b1c0c3194',
                'f4938924-939d-450c-ae0a-84b9e222b132');
  GET DIAGNOSTICS v_n = ROW_COUNT; RAISE NOTICE 'rolled back % rows to ws01', v_n;
END $$;
