-- GATE RE-HOME: move each mis-homed gate to the worksheet that OWNS its referenced fields, so it resolves
-- worksheet-locally (report/PDF path) instead of showing pending. Mechanical + deterministic (single-target
-- only; multi-worksheet gates are flagged, not moved). 24 gates. Rollback: -gaterehome.
DO $$
BEGIN
  UPDATE compliance_requirements SET worksheet_template_id='ffc4e0ec-a064-44b2-8ade-c050e83b00ce' WHERE id='fe8947a8-ba07-4d79-afae-546d214bab8e';
  UPDATE compliance_requirements SET worksheet_template_id='e1aadb78-c57c-458e-b6ed-a6fb1e5f5ae6' WHERE id='3b012613-e590-4b89-93ab-fe2a6b37c8ea';
  UPDATE compliance_requirements SET worksheet_template_id='ce643024-2708-4e10-b3f2-01289dc5210f' WHERE id='a7b8e509-3de5-4bf5-81b1-2fb7ce140796';
  UPDATE compliance_requirements SET worksheet_template_id='0274fb97-3d42-4647-8e71-b23b3c582b4e' WHERE id='9dfaa022-0288-4065-8f64-356fc9df5030';
  UPDATE compliance_requirements SET worksheet_template_id='22944ccc-8cc9-409c-bec8-42ccdc72d8f6' WHERE id='41596c7a-b3bb-40e9-ad3d-75eaa5bd5c16';
  UPDATE compliance_requirements SET worksheet_template_id='09b57793-d3c2-427c-9d01-87d046885d7c' WHERE id='4fccc258-28d4-42f1-bf71-63e1688eebe3';
  UPDATE compliance_requirements SET worksheet_template_id='c4571a1b-39ef-4488-a1ec-fb6367a6ba2c' WHERE id='87d1402f-2d10-47a8-93b9-78a92c3e7dd6';
  UPDATE compliance_requirements SET worksheet_template_id='22ee1863-b4f4-40cb-b968-56194ecf7560' WHERE id='f88bb51e-b4fa-4974-b4f7-b67ce26bfba7';
  UPDATE compliance_requirements SET worksheet_template_id='d94c1798-c40c-462b-9e82-e8fe587048fc' WHERE id='de89e350-d2a8-46f9-beab-3620e749c830';
  UPDATE compliance_requirements SET worksheet_template_id='423f3ed0-dc61-466e-b7bf-86bce6722e8a' WHERE id='e327677d-06f2-403f-b006-f9be70cbc848';
  UPDATE compliance_requirements SET worksheet_template_id='423f3ed0-dc61-466e-b7bf-86bce6722e8a' WHERE id='140195d4-cd38-45ba-9cd5-baec9e7bb79c';
  UPDATE compliance_requirements SET worksheet_template_id='ea9af14c-0a36-4795-9196-4572b980efdf' WHERE id='7c147ff3-9496-45c6-a8ab-ce48d595a9f4';
  UPDATE compliance_requirements SET worksheet_template_id='d49b34c0-71ec-4e2b-a786-071150810038' WHERE id='869c84ce-e0ff-41a3-a0e5-0895f2bee132';
  UPDATE compliance_requirements SET worksheet_template_id='88e32304-cca7-4dc7-a53e-290461a4c72d' WHERE id='199d1e0a-7727-44be-a5e9-6ae76b2bcaea';
  UPDATE compliance_requirements SET worksheet_template_id='1be6a188-6f25-49d9-b236-963d9b3051b7' WHERE id='dd5e41bb-9794-4d74-baff-f1344735583b';
  UPDATE compliance_requirements SET worksheet_template_id='f16ece7c-c8d7-4ae4-a733-5e5f3a1bbc60' WHERE id='8f412cbc-e160-47ca-b491-0f31a5bede4e';
  UPDATE compliance_requirements SET worksheet_template_id='1ce8fad3-3e41-40f8-895b-d5386f16178e' WHERE id='2ce99296-64f0-4773-a1b3-27d9fd420894';
  UPDATE compliance_requirements SET worksheet_template_id='40304142-4f30-4f66-a0ef-3c0c5296473a' WHERE id='8a11515a-82fe-462f-aa8a-b247dad9cfbf';
  UPDATE compliance_requirements SET worksheet_template_id='41ed0f17-200c-4efa-8b19-10820ff90c3e' WHERE id='b954f37e-d67f-4889-a57f-f518946421f0';
  UPDATE compliance_requirements SET worksheet_template_id='e2b7afeb-f940-45b2-b054-53012000f9b3' WHERE id='0632e229-3535-4317-a5b3-0d5136060585';
  UPDATE compliance_requirements SET worksheet_template_id='6d4bcfd9-a78d-45d6-9442-9cae7080e252' WHERE id='1b2f1655-af3a-4cf4-a91f-f8d47d8b9827';
  UPDATE compliance_requirements SET worksheet_template_id='e48c94ce-ebac-4c2b-8d48-7d987f89a272' WHERE id='d1cacb11-3cbb-421a-8ea5-03980ce5e5f8';
  UPDATE compliance_requirements SET worksheet_template_id='3ebd246e-4d04-4ef3-ba68-28317b414706' WHERE id='6a8fed5e-9e76-4fdd-bf2c-6c2cd5ed0b27';
  UPDATE compliance_requirements SET worksheet_template_id='cb4f61e6-3532-4391-b5fc-e43293422233' WHERE id='1cf13cb8-edd2-4153-a04e-52af6fd77380';
END $$;
