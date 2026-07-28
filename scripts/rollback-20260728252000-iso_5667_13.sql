-- ROLLBACK 20260728252000 ISO-5667-13
DO $$ BEGIN
  UPDATE compliance_requirements SET worksheet_template_id='f67a47d8-e079-4736-ad4e-ba7fade08d24' WHERE id IN ('bb5ba502-83ba-4c08-8fb0-aab514222553','cacc091b-2080-47ff-8963-9d60198e2d54');
  UPDATE compliance_requirements SET worksheet_template_id='c63df2be-c8f4-4749-8c21-e7f37bafe33a' WHERE id IN ('09d05802-2e4c-46bc-ba7a-04abc8211d82','44aff6d3-43d5-471f-901f-827f0de94d24');
END $$;
