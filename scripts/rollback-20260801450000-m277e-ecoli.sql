DO $$
DECLARE v_ws uuid;
BEGIN
  SELECT wt.id INTO v_ws FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id WHERE s.code='DWA-M-277E' AND wt.code='M277E-10';
  DELETE FROM compliance_requirements WHERE worksheet_template_id=v_ws AND code='REQ-14E';
END $$;
