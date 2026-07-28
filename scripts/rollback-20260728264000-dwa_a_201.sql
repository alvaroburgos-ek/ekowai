-- ROLLBACK 20260728264000 DWA-A-201
DO $$ BEGIN
  UPDATE compliance_requirements SET worksheet_template_id='dc019548-7320-4e8c-b776-397de871ba71' WHERE id IN ('33e5a46d-7f17-44b7-a624-36d601586a68');
END $$;
