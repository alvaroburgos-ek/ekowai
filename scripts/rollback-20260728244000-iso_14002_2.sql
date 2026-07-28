-- ROLLBACK 20260728244000 ISO-14002-2
DO $$ BEGIN
  UPDATE compliance_requirements SET worksheet_template_id='2c676600-ddac-4c84-a2d0-c414abcc9357' WHERE id IN ('f5d167c2-e08a-4b71-b113-2a1607e74229','a65ecf2b-a970-48f7-a463-8d8e93f16ece');
  UPDATE compliance_requirements SET worksheet_template_id='2c676600-ddac-4c84-a2d0-c414abcc9357' WHERE id IN ('599032d2-aa2b-47c7-ad37-21f6a055510a','d4234b6e-9ac5-4122-b735-facfd8bd0c3b');
  UPDATE compliance_requirements SET worksheet_template_id='8f2a6139-7e94-4380-8742-30e747d344f9' WHERE id IN ('0db1fdf0-d13e-4528-aff9-188089e0ba6b','cb7e317b-048a-4cae-903b-c0cadd5f48cc','4dca991c-ae8e-4f16-87e9-c4972bd19317','59919b50-a81e-4761-b136-2090ca94a8df');
END $$;
