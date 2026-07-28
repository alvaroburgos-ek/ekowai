-- ROLLBACK 20260728265000 DWA-A-222
DO $$ BEGIN
  UPDATE compliance_requirements SET worksheet_template_id='5c7edc3a-12c8-4d82-a41d-d4d8706d3cc2' WHERE id IN ('7fbea212-eaa0-4143-87f3-e1438c717829');
END $$;
