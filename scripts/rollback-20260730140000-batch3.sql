DO $$ BEGIN
  UPDATE equations SET formula='sampling_day_k = A + (365 * k) / number_of_samples   for k = 1, 2, ..., number_of_samples' WHERE id='ba1bf923-06cc-46aa-aab2-40f0dfa7ae22';
  UPDATE equations SET formula='sampling_week_k = A + (52 * k) / number_of_samples   for k = 1, 2, ..., number_of_samples' WHERE id='c7908fa3-c685-4d8d-a7cd-57e134794a85';
  UPDATE equations SET output_unit=NULL WHERE id='6a587ea8-30d9-4eb9-ad5a-b8d8fd60228d';
  UPDATE compliance_requirements SET clause_reference='2' WHERE id='6d2f13bc-8b7f-4288-a7c9-f85703042b83';
  UPDATE compliance_requirements SET clause_reference='6.4' WHERE id='76cb80aa-3db0-44cf-a76e-1db8ff836416';
  UPDATE compliance_requirements SET clause_reference='8' WHERE id='2e3d5ff6-abe8-4774-94fd-d47ed0850cba';
  UPDATE compliance_requirements c SET title_en=NULL FROM worksheet_templates w, standards s WHERE c.worksheet_template_id=w.id AND w.standard_id=s.id AND s.code IN ('ISO-5667-10','ISO-5667-13','ISO-14050');
  UPDATE worksheet_sections sec SET title_en=NULL FROM worksheet_templates w, standards s WHERE sec.worksheet_template_id=w.id AND w.standard_id=s.id AND s.code IN ('ISO-5667-10','ISO-5667-13','ISO-14050');
END $$;
