-- ROLLBACK 20260728247000 ISO-14097
DO $$ BEGIN
  UPDATE compliance_requirements SET worksheet_template_id='6ca13aa9-1c03-4d3d-b56f-ec187cf267a8' WHERE id IN ('23d2fb70-3346-45c4-9024-bc093e170023','6242e82a-481b-48c5-9fe8-293f6df54a8f');
  UPDATE compliance_requirements SET worksheet_template_id='986247df-0841-4a43-ab57-21725030a244' WHERE id IN ('a865b845-ef6f-4744-8fff-8929151a6076','70f2c4a2-f7b8-46d8-9289-405ad56adc82');
  UPDATE compliance_requirements SET worksheet_template_id='061d48d6-5f98-4bc0-b384-f3d7efcb0522' WHERE id IN ('0d7a2075-2b8e-4cd7-b29c-3b6bacd42547','fb28155f-1e25-403c-81fb-deac1833921a');
END $$;
