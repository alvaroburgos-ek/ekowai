-- Rollback for 20260801320000_m820_2_11_bedarfsplanung_gates.sql
DO $$
DECLARE v_ws uuid;
BEGIN
  SELECT wt.id INTO v_ws FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
  WHERE s.code = 'DWA-M-820-2' AND wt.code = '820-2-11';
  IF v_ws IS NULL THEN RAISE EXCEPTION '820-2-11 not found'; END IF;

  DELETE FROM fields WHERE worksheet_template_id = v_ws AND symbol = 'changed_needs_recognised';

  UPDATE compliance_requirements
     SET condition = 'forward_planning_done == true',
         clause_reference = '5.2.4 Geaenderter Bedarf aus Gebietsentwicklungen wird nicht erkannt'
   WHERE id = 'c267f75d-f29e-4443-b029-275783b2eebb' AND code = 'REQ-23';

  INSERT INTO compliance_requirements (id, worksheet_template_id, code, condition, severity, clause_reference, description)
  VALUES ('e677668c-d15e-498e-97c9-dcee5ce54bec', v_ws, 'REQ-32', '', 'warn',
          '5.2.4 Geaenderter Bedarf aus Gebietsentwicklungen wird nicht erkannt',
          'Lot-wise procurement of planning services timed appropriately to each other to avoid coordination losses.')
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE '820-2-11 rollback complete';
END $$;
