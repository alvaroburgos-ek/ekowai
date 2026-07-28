-- ROLLBACK 20260728242000 ISO-59010
DO $$ BEGIN
  UPDATE compliance_requirements SET worksheet_template_id='d4ab76e2-6e6c-4a2b-9170-772e54d7af19' WHERE id IN ('29c70e07-ab90-402a-b602-8df7c84b863d','c7369112-ae32-4189-a00f-7a5559cea802');
  UPDATE compliance_requirements SET worksheet_template_id='5811059b-3d05-49c4-b773-668f8913ceaa' WHERE id IN ('13bbbf33-c7be-4512-9a89-097d66505f1e','fae5bacc-74cc-4151-a1c6-870f2f1e4798');
  UPDATE compliance_requirements SET worksheet_template_id='22b3a962-e4e3-4457-9565-a1ceeef27eaa' WHERE id IN ('493c964c-2d0a-4c16-a6f0-0c97b4ce3264','ea40cfe0-e06a-4bf9-a4bd-a0990d98270f','810b34eb-1e11-4d35-83c0-cca8a49b2512');
  UPDATE compliance_requirements SET worksheet_template_id='8d2297dd-b1b3-47fc-8c80-189b15608b4b' WHERE id IN ('7d19ba04-6c58-4055-af96-08ec7aa2b63c','811333f6-63f5-4fa0-b46a-3bd7da2c382e');
END $$;
