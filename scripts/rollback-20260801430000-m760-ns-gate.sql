-- ROLLBACK for 20260801430000_m760_ns_sizing_gate.sql
DO $$
DECLARE v_ws uuid;
BEGIN
  SELECT wt.id INTO v_ws FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id
   WHERE s.code='DWA-M-760' AND wt.code='M760-15';
  DELETE FROM compliance_requirements WHERE worksheet_template_id=v_ws AND code='CR-M760-NS';
  RAISE NOTICE 'M760-15 ns>=NS gate rolled back';
END $$;
