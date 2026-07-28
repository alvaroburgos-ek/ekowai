-- ROLLBACK 20260728253000 FLL-GAR-2023
DO $$ BEGIN
  UPDATE compliance_requirements SET worksheet_template_id='969d527d-be79-4f80-9c19-d45a5cdf5e53' WHERE id IN ('ab65828e-1b3d-4ff2-956b-f0207558c101');
  UPDATE compliance_requirements SET worksheet_template_id='00bbe3e9-e4c3-4d86-be48-5274762cfa28' WHERE id IN ('cf4cfe44-5bcd-415b-8f43-13f0b1fc496c');
END $$;
