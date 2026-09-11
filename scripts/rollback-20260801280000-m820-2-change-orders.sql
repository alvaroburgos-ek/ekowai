-- Rollback for 20260801280000_m820_2_change_orders_register.sql
-- Removes the added change_orders field and re-activates the count/volume numbers.
DO $$
DECLARE v_ws uuid;
BEGIN
  SELECT wt.id INTO v_ws FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
  WHERE s.code = 'DWA-M-820-2' AND wt.code = '820-2-21';
  IF v_ws IS NULL THEN RAISE EXCEPTION '820-2-21 not found'; END IF;

  DELETE FROM fields WHERE worksheet_template_id = v_ws AND symbol = 'change_orders';

  UPDATE fields
     SET active = true,
         description = regexp_replace(description, '\s*\[deaktiviert 2026-08-01:[^\]]*\]', '', 'g')
   WHERE worksheet_template_id = v_ws
     AND symbol IN ('aenderungs_anordnungen_count', 'aenderungs_volumen_eur')
     AND active = false;

  RAISE NOTICE '820-2-21 rollback: change_orders removed, count/volume re-activated';
END $$;
