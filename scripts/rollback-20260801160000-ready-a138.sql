DO $$ BEGIN
  UPDATE compliance_requirements c SET condition='verify Gl. 2' FROM worksheet_templates w, standards s WHERE c.worksheet_template_id=w.id AND w.standard_id=s.id AND s.code='DWA-A-138-1' AND c.code='A138-REQ-10';
  UPDATE compliance_requirements c SET condition='verify Gl. 3' FROM worksheet_templates w, standards s WHERE c.worksheet_template_id=w.id AND w.standard_id=s.id AND s.code='DWA-A-138-1' AND c.code='A138-REQ-11';
  UPDATE compliance_requirements c SET condition='verify Gl. 5/6' FROM worksheet_templates w, standards s WHERE c.worksheet_template_id=w.id AND w.standard_id=s.id AND s.code='DWA-A-138-1' AND c.code='A138-REQ-12';
  UPDATE compliance_requirements c SET condition='verify Gl. 4' FROM worksheet_templates w, standards s WHERE c.worksheet_template_id=w.id AND w.standard_id=s.id AND s.code='DWA-A-138-1' AND c.code='A138-REQ-13';
  UPDATE compliance_requirements c SET condition='verify Gl. 8 iterated' FROM worksheet_templates w, standards s WHERE c.worksheet_template_id=w.id AND w.standard_id=s.id AND s.code='DWA-A-138-1' AND c.code='A138-REQ-14';
END $$;
