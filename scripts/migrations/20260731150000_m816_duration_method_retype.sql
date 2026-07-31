-- SOURCE-SETTLED (authorized re-type class) — DWA-M-816 duration_method: required enum with NULL
-- enum_values made worksheet M816-19 permanently UN-APPROVABLE (hard workflow blocker). §4.2.2 prints
-- no method enumeration (verified), so re-type enum->text (free entry) is the honest working state.
-- Rollback: scripts/rollback-20260731150000-m816.sql
DO $$
DECLARE v int:=0;
BEGIN
  UPDATE fields f SET data_type='text', enum_values=NULL
  FROM worksheet_templates w, standards s
  WHERE f.worksheet_template_id=w.id AND w.standard_id=s.id AND s.code='DWA-M-816'
    AND f.symbol='duration_method' AND f.data_type='enum';
  GET DIAGNOSTICS v=ROW_COUNT; RAISE NOTICE 'duration_method re-type: %', v;
END $$;
