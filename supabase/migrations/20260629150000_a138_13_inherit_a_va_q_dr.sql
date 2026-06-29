-- supabase/migrations/20260629150000_a138_13_inherit_a_va_q_dr.sql
-- Prereq for A138-10 auto-Q_zu: the basin (A138-13) Gl.8 needs A_VA, Q_S, Q_Dr to
-- compute its governing duration. Q_S (A138-12) already lists A138-13 as a consumer,
-- but A_VA (A138-10) and Q_Dr (A138-20) do NOT — so the basin could never resolve them
-- and has always shown "Fehlt: A_VA … Q_Dr". Register A138-13 as a consumer of both so
-- they inherit by reference (single producer each: A_VA←A138-10, Q_Dr←A138-20). Pure
-- field-definition change (consumer_worksheets array append); no project_parameters touched.
-- Idempotent (append only if absent). Rollback: scripts/rollback-20260629150000-…sql.
DO $$
BEGIN
  -- A_VA owned by A138-10
  UPDATE fields f SET consumer_worksheets = f.consumer_worksheets || ARRAY['A138-13']
  FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id
  WHERE f.worksheet_template_id=wt.id AND s.code='DWA-A-138-1' AND wt.code='A138-10'
    AND f.symbol='A_VA' AND NOT ('A138-13' = ANY(f.consumer_worksheets));

  -- Q_Dr owned by A138-20
  UPDATE fields f SET consumer_worksheets = f.consumer_worksheets || ARRAY['A138-13']
  FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id
  WHERE f.worksheet_template_id=wt.id AND s.code='DWA-A-138-1' AND wt.code='A138-20'
    AND f.symbol='Q_Dr' AND NOT ('A138-13' = ANY(f.consumer_worksheets));
END $$;
