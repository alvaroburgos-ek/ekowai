-- ROLLBACK 20260728246000 ISO-59032
DO $$ BEGIN
  UPDATE compliance_requirements SET worksheet_template_id='369a9a81-169b-4a57-a6c7-11afe01e6f2b' WHERE id IN ('f4313422-3195-41eb-87b4-1237bf8b8ff8','96bd1d3a-a0ae-4b0c-a8d0-217e6592de24','3c197c58-01dd-416a-bb6c-45b137c2100a');
  UPDATE compliance_requirements SET worksheet_template_id='cda32cad-07f7-4695-896e-86ed056b4f3b' WHERE id IN ('db736f64-a505-4979-8942-a56d25f07f1f','c20360db-8250-4a8e-bc6c-6bb5a113b137');
  UPDATE compliance_requirements SET worksheet_template_id='be0f5260-1678-4ee3-b43b-a883ef32a63a' WHERE id IN ('d1480b8c-f65d-4d6a-a105-92c87c821079','3777870d-cf1b-4484-aa0b-fc40b037d71a');
END $$;
