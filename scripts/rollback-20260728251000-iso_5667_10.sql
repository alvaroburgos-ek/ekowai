-- ROLLBACK 20260728251000 ISO-5667-10
DO $$ BEGIN
  UPDATE compliance_requirements SET worksheet_template_id='cd6b4cc1-df10-4e00-912f-9514e8fdc06d' WHERE id IN ('72d198c3-438a-4227-b7e0-b29609bb9fb4');
  UPDATE compliance_requirements SET worksheet_template_id='76e30179-117a-40a9-acbc-9924a26dddbb' WHERE id IN ('54506f66-2ce1-440f-865a-cf37a7597968','306fe50f-7cd3-4a25-bbb3-650dd34c797b','e82fa780-b38c-44c5-b0b2-a13f0e87e51e');
END $$;
