-- ROLLBACK 20260728263000 DWA-A-102-2
DO $$ BEGIN
  UPDATE compliance_requirements SET worksheet_template_id='5f42ca6f-a115-401a-80c5-8700c7d0959e' WHERE id IN ('b32088ed-4ee4-4cad-b32a-7a5567b58943');
END $$;
