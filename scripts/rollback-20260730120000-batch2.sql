-- ROLLBACK for 20260730120000. title_en backfill cannot be perfectly reversed (was uniformly NULL for
-- the scoped set), so restore title_en=NULL for the scoped standards; revert CR-020 re-home + clause fixes.
DO $$ BEGIN
  UPDATE compliance_requirements c SET title_en=NULL FROM worksheet_templates w, standards s
   WHERE c.worksheet_template_id=w.id AND w.standard_id=s.id
     AND s.code IN ('ISO-14002-2','ISO-59010','ISO-59014','ISO-5667-1','ISO-59020','ISO-59032','ISO-14019-1','ISO-14015','ISO-14033','ISO-59004');
  UPDATE compliance_requirements SET worksheet_template_id=(SELECT w.id FROM worksheet_templates w JOIN standards s ON s.id=w.standard_id WHERE s.code='ISO-59020' AND w.code='ISO-59020-04')
   WHERE id=(SELECT c.id FROM compliance_requirements c JOIN worksheet_templates w ON w.id=c.worksheet_template_id JOIN standards s ON s.id=w.standard_id WHERE s.code='ISO-59020' AND c.code='CR-020');
  UPDATE compliance_requirements c SET clause_reference='17' FROM worksheet_templates w, standards s WHERE c.worksheet_template_id=w.id AND w.standard_id=s.id AND s.code='ISO-5667-1' AND c.code='CR-020';
END $$;
