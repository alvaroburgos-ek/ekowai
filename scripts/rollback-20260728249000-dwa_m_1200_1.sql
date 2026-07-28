-- ROLLBACK 20260728249000 DWA-M-1200-1
DO $$ BEGIN
  UPDATE compliance_requirements SET worksheet_template_id='ccfe957d-c71a-4494-b166-1197f7f0e5e4' WHERE id IN ('93c7677a-8775-451d-828f-6a31d80d2137');
  UPDATE compliance_requirements SET worksheet_template_id='ccfe957d-c71a-4494-b166-1197f7f0e5e4' WHERE id IN ('bfa7f0dd-070d-4e2a-9d8b-dbabbf6a4b55');
  UPDATE compliance_requirements SET worksheet_template_id='87527244-a36d-41b8-8560-85a31522d2d2' WHERE id IN ('b0a5c5f8-6c3e-4f41-81ec-d872b20e0ff3','86a7bb6b-3ff2-4c6b-a46c-84f42c07b0e3');
END $$;
