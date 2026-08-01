-- ROLLBACK for 20260801410000_a222_clarifier_surface_gates.sql
-- Removes the two added clarifier-surface block gates on A222-14.
DO $$
DECLARE v_ws uuid;
BEGIN
  SELECT wt.id INTO v_ws FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id
   WHERE s.code='DWA-A-222' AND wt.code='A222-14';
  DELETE FROM compliance_requirements WHERE worksheet_template_id=v_ws AND code IN ('CR-A222-22','CR-A222-27');
  RAISE NOTICE 'A222-14 clarifier-surface gates rolled back';
END $$;
