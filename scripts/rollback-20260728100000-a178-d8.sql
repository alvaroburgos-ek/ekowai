-- ROLLBACK A178-D8: originals were NULL; revert to NULL where this backfill stamped them.
DO $$
BEGIN
  UPDATE compliance_requirements
     SET source_quote=NULL, source_file=NULL, source_anchor=NULL, audited_at=NULL, audited_by=NULL
   WHERE audited_by = 'A178-D8 quote backfill · claude-fable-5 · PDF-verbatim (SR-1/VA)';
  RAISE NOTICE 'A178-D8 rolled back';
END $$;
