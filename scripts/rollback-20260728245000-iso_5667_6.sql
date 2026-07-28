-- ROLLBACK 20260728245000 ISO-5667-6
DO $$ BEGIN
  UPDATE compliance_requirements SET worksheet_template_id='e25451cb-4153-4ea1-93aa-db734ed2b04e' WHERE id IN ('2dcc349b-e12c-45ce-b3bf-7184d6ba40e1','b5714b56-81b0-42dd-8877-1edd930eb4a0','ac57f1cd-7ccf-47fa-908f-54cbb53c175d');
  UPDATE compliance_requirements SET worksheet_template_id='1f4c1a76-ccbb-4022-bd6e-2d8931adfbce' WHERE id IN ('5a77cbfa-2947-4485-bfeb-2c410e50eaba');
  UPDATE compliance_requirements SET worksheet_template_id='5a5e268b-a60d-4617-83f7-28a447ca257d' WHERE id IN ('cb53a188-3d62-49ca-b61b-56b3626f9868');
  UPDATE compliance_requirements SET worksheet_template_id='5a5e268b-a60d-4617-83f7-28a447ca257d' WHERE id IN ('bed92dff-07d5-47da-b3ce-b86ac37709f2','2709daff-a0c2-4e67-a49c-1ba9f70717cd');
  UPDATE compliance_requirements SET worksheet_template_id='9d172a48-f93a-4740-961f-ab77f040fb33' WHERE id IN ('4cb09788-54a7-4edd-bf88-7a58881d1790');
END $$;
