DO $$
DECLARE atv uuid:=(SELECT id FROM standards WHERE code='ATV-A-704E'); s46 uuid:=(SELECT id FROM standards WHERE code='ISO-46001'); s16 uuid:=(SELECT id FROM standards WHERE code='ISO-5667-16');
BEGIN
  UPDATE equations e SET clause_reference=replace(e.clause_reference,'IQC-Card','IGC-Card') FROM worksheet_templates w WHERE e.worksheet_template_id=w.id AND w.standard_id=atv AND e.clause_reference LIKE '%IQC-Card%';
  UPDATE equations e SET output_unit=NULL FROM worksheet_templates w WHERE e.worksheet_template_id=w.id AND w.standard_id=atv AND e.output_symbol IN ('deviation_equivalency_pct','deviation_parallel_pct');
  UPDATE equations e SET output_unit=NULL FROM worksheet_templates w WHERE e.worksheet_template_id=w.id AND w.standard_id=s46 AND e.equation_number IN ('C.3','C.5');
  UPDATE equations e SET formula=replace(e.formula,'0.6931','log_e2') FROM worksheet_templates w WHERE e.worksheet_template_id=w.id AND w.standard_id=s16 AND e.formula LIKE '%0.6931%';
  UPDATE compliance_requirements c SET title_en=NULL FROM worksheet_templates w, standards s WHERE c.worksheet_template_id=w.id AND w.standard_id=s.id AND s.code IN ('ATV-A-704E','ISO-5667-16');
  UPDATE worksheet_sections sec SET title_en=NULL FROM worksheet_templates w, standards s WHERE sec.worksheet_template_id=w.id AND w.standard_id=s.id AND s.code IN ('ATV-A-704E','ISO-5667-16');
END $$;
