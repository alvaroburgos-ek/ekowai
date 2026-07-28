-- ROLLBACK 20260728250000 ISO-14019-1
DO $$ BEGIN
  UPDATE compliance_requirements SET worksheet_template_id='072885e4-9498-4c0c-9585-fb94ba5501ef' WHERE id IN ('0c2129bd-cafb-4ded-bd92-04ed8c7f74c8','51842dd0-e51d-4718-a046-80899462a8f9','e957c5da-fbfe-4bdc-93eb-32d42aa3a944');
  UPDATE compliance_requirements SET worksheet_template_id='169f0dc8-5fcf-49b6-9c8d-9cc69cf80835' WHERE id IN ('6b143ac4-907e-4c54-9ee2-ac23c1460614');
END $$;
