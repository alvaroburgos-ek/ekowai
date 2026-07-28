-- ROLLBACK 20260728262000 DWA-M-820-2
DO $$ BEGIN
  UPDATE compliance_requirements SET worksheet_template_id='0ad1188c-d998-4c22-bad6-b202ea73e84e' WHERE id IN ('0a4788a5-aeb5-4cf2-a835-305d162064b8');
  UPDATE compliance_requirements SET worksheet_template_id='42a5471e-04b2-4c9e-bb87-21a16110d9a3' WHERE id IN ('75b3dd34-1dc9-4a05-8e14-c37032d49f0f','8b691c7e-2dd1-4a9f-ad76-f69c81e5567a');
  UPDATE compliance_requirements SET worksheet_template_id='dba8519c-632e-4374-b0b5-826ac0fcb0d4' WHERE id IN ('182d8337-937f-4678-990e-cb0f454543e8');
  UPDATE compliance_requirements SET worksheet_template_id='4a400a26-4bbf-4017-b2d9-aa6c95ec9acb' WHERE id IN ('6e1ab13f-cb65-4552-aea5-912431684d8c');
  UPDATE compliance_requirements SET worksheet_template_id='379a0cd7-9842-4db6-8269-c90ea2f90766' WHERE id IN ('55067b99-ba04-4327-90fc-e8e986a5a317');
  UPDATE compliance_requirements SET worksheet_template_id='d79d19f5-8415-4fda-8a01-4535f72575b0' WHERE id IN ('e781b81b-444c-45e6-99b0-1816733195ce');
  UPDATE compliance_requirements SET worksheet_template_id='d79d19f5-8415-4fda-8a01-4535f72575b0' WHERE id IN ('8c1a34a1-1290-4cb2-a906-b00749a43ab6');
END $$;
