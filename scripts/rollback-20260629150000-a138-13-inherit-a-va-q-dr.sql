-- ROLLBACK for supabase/migrations/20260629150000_a138_13_inherit_a_va_q_dr.sql
-- Remove A138-13 from the consumer_worksheets of A138-10.A_VA and A138-20.Q_Dr
-- (restore their pre-migration consumer sets). Pure field-definition change; no data.
-- Idempotent + re-runnable.
DO $$
BEGIN
  UPDATE fields f SET consumer_worksheets = array_remove(f.consumer_worksheets, 'A138-13')
  FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id
  WHERE f.worksheet_template_id=wt.id AND s.code='DWA-A-138-1'
    AND wt.code='A138-10' AND f.symbol='A_VA';

  UPDATE fields f SET consumer_worksheets = array_remove(f.consumer_worksheets, 'A138-13')
  FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id
  WHERE f.worksheet_template_id=wt.id AND s.code='DWA-A-138-1'
    AND wt.code='A138-20' AND f.symbol='Q_Dr';
END $$;
