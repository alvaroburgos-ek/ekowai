-- ROLLBACK 20260728241000 ISO-14004
DO $$ BEGIN
  UPDATE compliance_requirements SET worksheet_template_id='bb96d1f0-49df-40c4-8cfb-bd6e32801aa4' WHERE id IN ('d92662d5-8199-44cc-bed2-7826bc74f921','3dd05227-8345-4564-8e92-b74d17e737a8','987e261f-22f0-4065-9c11-c39c15cb1472','dec7d1d8-9d8b-4f77-afdd-3e6ca86c1afb','26704a1d-7f77-40d9-b67c-2d982bc87a86');
  UPDATE compliance_requirements SET worksheet_template_id='bb96d1f0-49df-40c4-8cfb-bd6e32801aa4' WHERE id IN ('bb44742d-0ccb-46e1-874e-ff986b1c8556','2846e591-6d5d-49bd-b896-fc515769a6c0');
  UPDATE compliance_requirements SET worksheet_template_id='a8558733-16a3-4c1f-8172-c12ed8505aab' WHERE id IN ('3deb0863-61a3-46a5-a2f0-85bc9ac88377','f4dc3acb-1817-4c6c-b9dc-e9db3b375238','aceaeecf-f4fa-4d7e-9549-f4e90d96ff78');
END $$;
