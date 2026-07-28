-- ROLLBACK 20260728266000 DWA-M-1200-2
DO $$ BEGIN
  UPDATE compliance_requirements SET worksheet_template_id='22ee1863-b4f4-40cb-b968-56194ecf7560' WHERE id IN ('23f689c5-ab12-4cc8-8a95-a180b0941f47');
END $$;
