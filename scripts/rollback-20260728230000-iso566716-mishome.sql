-- ROLLBACK for 20260728230000_iso566716_mishome_rehome.sql — restore prior homes (all within ISO-5667-16)
DO $$
DECLARE
  ws01 uuid := '167c7efd-3823-4555-a100-e44ee066cc42';
  ws03 uuid := 'db935b3c-5d8c-4da7-8951-7f0b974e64e2';
  ws05 uuid := 'f2ff0173-7d37-4498-997e-250b4108eaeb';
  ws07 uuid := '1036e063-2ad5-469b-86c6-7f4b2e0de1ef';
BEGIN
  UPDATE compliance_requirements SET worksheet_template_id=ws01 WHERE id IN
    ('8c4898ae-9b2e-4e50-92d3-84cf85584921','83508274-f2fa-4424-9f59-aff0b7dde12b','f9f21e0e-791e-4ba1-8fbb-479ae48e062e',
     '9a36f0f2-02df-4d58-9d4e-ebcb66802bd1','d0bdcc6f-6f5a-4b02-8c1d-08ef35ed3aa7');
  UPDATE compliance_requirements SET worksheet_template_id=ws03 WHERE id IN
    ('a1f49bb8-1876-4e72-a6f9-ca70a0f92494','05b70597-f4a4-44d1-adf2-91dbd7001ca1','b6443fba-077e-4f64-a37b-0babca7770b0',
     '04fba4ba-2df8-4ba9-8f4f-50626f5085fd','21806c73-726e-4d37-ac55-20b20760c852','c62d52f9-d202-4c29-87a1-1fa00269feff');
  UPDATE compliance_requirements SET worksheet_template_id=ws05 WHERE id IN
    ('a6ffc69f-68ee-4446-8901-cfc38113faf7','66d791f5-0f87-4be8-83bb-00d832465e45','8014b138-1f6e-438a-ab06-b283b08b1bdc');
  UPDATE compliance_requirements SET worksheet_template_id=ws07 WHERE id IN
    ('6bf1e1fd-0680-4082-9f39-a263b5fe68c6','d9887208-07a0-4a18-bc75-2cce8548c4fb','5ce778f2-cddc-4c08-be59-fb13f1958690');
  RAISE NOTICE 'ISO-5667-16 rollback complete';
END $$;
