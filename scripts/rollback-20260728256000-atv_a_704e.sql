-- ROLLBACK 20260728256000 ATV-A-704E
DO $$ BEGIN
  UPDATE compliance_requirements SET worksheet_template_id='ad55e50e-0295-41e7-808d-e5ab4e06eed2' WHERE id IN ('35cc7d55-8215-40b1-ab11-b5e430d4ebee');
END $$;
