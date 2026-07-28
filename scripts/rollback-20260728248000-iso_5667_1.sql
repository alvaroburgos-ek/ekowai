-- ROLLBACK 20260728248000 ISO-5667-1
DO $$ BEGIN
  UPDATE compliance_requirements SET worksheet_template_id='5eeffbaf-5b5b-4feb-9ced-308c709e2189' WHERE id IN ('3672bcda-7e04-43d1-a557-cf1b33539de5','c7d91d41-551e-47b1-9bb5-83c149570a02');
  UPDATE compliance_requirements SET worksheet_template_id='ada4dd5b-873e-45e1-8ff6-fd7ebd60cef6' WHERE id IN ('1a0c6f63-f2a9-46ff-9f3d-2e62c5a79e98','09b73f91-f71d-4efd-973f-0f327217a69c','62b68d94-16d2-4c06-b865-3268d3ee49ea');
  UPDATE compliance_requirements SET worksheet_template_id='26b92cbb-52b9-4ac7-a81c-fc531a629a66' WHERE id IN ('0aa104a1-dae0-4d13-85ab-6848b2b041ee');
END $$;
