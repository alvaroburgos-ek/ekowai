-- GATE RE-HOME: move each mis-homed gate to the worksheet that OWNS its referenced fields, so it resolves
-- worksheet-locally (report/PDF path) instead of showing pending. Mechanical + deterministic (single-target
-- only; multi-worksheet gates are flagged, not moved). 34 gates. Rollback: -gaterehome.
DO $$
BEGIN
  UPDATE compliance_requirements SET worksheet_template_id='54c32010-95e1-42eb-b53c-7e98ae817bdb' WHERE id='fe8947a8-ba07-4d79-afae-546d214bab8e';
  UPDATE compliance_requirements SET worksheet_template_id='717a37f6-153f-4fbe-83a1-4f1d3a345033' WHERE id='3b012613-e590-4b89-93ab-fe2a6b37c8ea';
  UPDATE compliance_requirements SET worksheet_template_id='fa967545-18ee-4c83-9426-98d08fd143d1' WHERE id='a7b8e509-3de5-4bf5-81b1-2fb7ce140796';
  UPDATE compliance_requirements SET worksheet_template_id='ac188e24-8868-4967-ac87-4878078f49ed' WHERE id='41596c7a-b3bb-40e9-ad3d-75eaa5bd5c16';
  UPDATE compliance_requirements SET worksheet_template_id='d22d1c0f-4d11-4bcd-8086-2639a4313482' WHERE id='9dfaa022-0288-4065-8f64-356fc9df5030';
  UPDATE compliance_requirements SET worksheet_template_id='87decd1d-3483-449d-a3a5-3435b00b443e' WHERE id='7d5ca38a-daf2-499a-abc8-71f14725cca1';
  UPDATE compliance_requirements SET worksheet_template_id='d2745d54-399f-47a7-9204-7cd0f0a3db2f' WHERE id='4fccc258-28d4-42f1-bf71-63e1688eebe3';
  UPDATE compliance_requirements SET worksheet_template_id='4d934739-d910-4757-ac2d-022ca21fd5c5' WHERE id='87d1402f-2d10-47a8-93b9-78a92c3e7dd6';
  UPDATE compliance_requirements SET worksheet_template_id='6320b289-1988-419d-82ff-f3971f53781a' WHERE id='f88bb51e-b4fa-4974-b4f7-b67ce26bfba7';
  UPDATE compliance_requirements SET worksheet_template_id='91059385-04d4-49c9-93eb-a5575ab33d9d' WHERE id='cf9d7c41-88f2-4b12-98ad-75c062136bdc';
  UPDATE compliance_requirements SET worksheet_template_id='694a33e0-3159-4e91-b143-d4bfdea9a566' WHERE id='de89e350-d2a8-46f9-beab-3620e749c830';
  UPDATE compliance_requirements SET worksheet_template_id='1535237f-3882-4220-b234-64a9da43575f' WHERE id='025f8745-3556-4a91-9e9a-00c60359670b';
  UPDATE compliance_requirements SET worksheet_template_id='30a77450-7d83-443d-8938-25bcb1f87b9a' WHERE id='69015ae3-f9af-49f6-a9f1-a7fa8c142da7';
  UPDATE compliance_requirements SET worksheet_template_id='d94c8822-eeb6-4aa7-be9f-f681630b9f59' WHERE id='869c84ce-e0ff-41a3-a0e5-0895f2bee132';
  UPDATE compliance_requirements SET worksheet_template_id='adaf1855-3f47-4676-ade9-1198848cabc3' WHERE id='323f359f-dfc8-4027-8c6b-8ec46c68d3cb';
  UPDATE compliance_requirements SET worksheet_template_id='2c3578b4-624b-4792-a948-443de7da4103' WHERE id='836c0971-b9b6-4c71-8fe8-927d0086a879';
  UPDATE compliance_requirements SET worksheet_template_id='bf9a96f6-5b92-4716-aa3a-5097c78bf8f2' WHERE id='c19c26ff-328e-42ff-9c09-47233c0de337';
  UPDATE compliance_requirements SET worksheet_template_id='25c0d5a2-ce6e-407a-95a2-b3beef7145ac' WHERE id='9b44583d-1fa5-4134-9d6f-29e04024fc35';
  UPDATE compliance_requirements SET worksheet_template_id='22d1707d-2fe8-420d-a72e-0f938e61e3bd' WHERE id='f00d50ca-5c4b-4b2f-bef7-e38730031d2b';
  UPDATE compliance_requirements SET worksheet_template_id='71235b9a-bcaf-498d-be58-0cef301d1bef' WHERE id='7c147ff3-9496-45c6-a8ab-ce48d595a9f4';
  UPDATE compliance_requirements SET worksheet_template_id='2b5e075c-a7c1-4044-8138-ca14ab7601ab' WHERE id='199d1e0a-7727-44be-a5e9-6ae76b2bcaea';
  UPDATE compliance_requirements SET worksheet_template_id='fb70320b-6eaf-4bbe-859b-c33fbecf0228' WHERE id='dd5e41bb-9794-4d74-baff-f1344735583b';
  UPDATE compliance_requirements SET worksheet_template_id='1ce8fad3-3e41-40f8-895b-d5386f16178e' WHERE id='8f412cbc-e160-47ca-b491-0f31a5bede4e';
  UPDATE compliance_requirements SET worksheet_template_id='58b1615b-7bc4-4827-a6a9-eb36920c1b96' WHERE id='2ce99296-64f0-4773-a1b3-27d9fd420894';
  UPDATE compliance_requirements SET worksheet_template_id='0a422fc5-906d-4b0e-9359-91d30a328707' WHERE id='8a11515a-82fe-462f-aa8a-b247dad9cfbf';
  UPDATE compliance_requirements SET worksheet_template_id='5bfb6f9e-c35f-4e1a-a53b-20e49bf0025d' WHERE id='85719ad2-87e7-4402-974a-20a41151410b';
  UPDATE compliance_requirements SET worksheet_template_id='1db1f869-b1e4-46e4-80c9-3cc829193dc0' WHERE id='b954f37e-d67f-4889-a57f-f518946421f0';
  UPDATE compliance_requirements SET worksheet_template_id='68ad2af1-b5e1-4498-b47b-a3dae0ee81a6' WHERE id='0632e229-3535-4317-a5b3-0d5136060585';
  UPDATE compliance_requirements SET worksheet_template_id='25c51316-c35c-4975-95a8-ea80c215cc3e' WHERE id='0ab42efe-6862-4078-ade9-4d5be241f3fb';
  UPDATE compliance_requirements SET worksheet_template_id='25c51316-c35c-4975-95a8-ea80c215cc3e' WHERE id='328a10c6-e9ab-4bd0-8373-fd2d74103aa3';
  UPDATE compliance_requirements SET worksheet_template_id='9ded628f-9522-4841-aa29-aef6f19822b1' WHERE id='1b2f1655-af3a-4cf4-a91f-f8d47d8b9827';
  UPDATE compliance_requirements SET worksheet_template_id='2d834d44-cbfb-462b-9e5a-8d6020b7a905' WHERE id='d1cacb11-3cbb-421a-8ea5-03980ce5e5f8';
  UPDATE compliance_requirements SET worksheet_template_id='79a1599b-101b-431c-9d33-efefcdfd41b1' WHERE id='6a8fed5e-9e76-4fdd-bf2c-6c2cd5ed0b27';
  UPDATE compliance_requirements SET worksheet_template_id='f4743acb-236f-47c9-b65e-1d7d36972f41' WHERE id='1cf13cb8-edd2-4153-a04e-52af6fd77380';
END $$;
