-- ROLLBACK 20260728254000 ISO-46001
DO $$ BEGIN
  UPDATE compliance_requirements SET worksheet_template_id='e278eb02-0086-420f-a709-853a03d2e3b2' WHERE id IN ('af0eea7f-00da-4c60-93a2-31f5b3e48ec8','fdbce5e8-11fb-431d-b77b-cd0bc713dd18');
END $$;
