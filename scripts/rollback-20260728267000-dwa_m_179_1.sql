-- ROLLBACK 20260728267000 DWA-M-179-1
DO $$ BEGIN
  UPDATE compliance_requirements SET worksheet_template_id='a8cd23da-919d-4424-9355-26f7ca7caa84' WHERE id IN ('39ffa8e3-c9dc-4cec-9e9e-9ca5e0041a19');
END $$;
