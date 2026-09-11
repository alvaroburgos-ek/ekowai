-- Rollback: remove the added risk_register field from 820-2-10.
DO $$
DECLARE v_ws uuid;
BEGIN
  SELECT wt.id INTO v_ws FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
  WHERE s.code = 'DWA-M-820-2' AND wt.code = '820-2-10';
  DELETE FROM fields WHERE worksheet_template_id = v_ws AND symbol = 'risk_register';
  RAISE NOTICE '820-2-10 rollback: risk_register removed';
END $$;
