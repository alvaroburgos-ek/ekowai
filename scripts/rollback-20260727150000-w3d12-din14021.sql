-- ROLLBACK for W3-D12 (DIN-14021 heading-as-evidence backfill).
-- Restores from w3d1_quote_backfill_backup, which holds the ACTUAL pre-write values.
-- Restores a state that FAILS validator rule 10b — correct: a rollback undoes a write.

DO $$
DECLARE
  v_reverted int := 0;
BEGIN
  UPDATE compliance_requirements c
     SET source_quote  = b.source_quote,
         source_file   = b.source_file,
         source_anchor = b.source_anchor,
         audit_status  = b.audit_status,
         audited_at    = b.audited_at,
         audited_by    = b.audited_by
    FROM w3d1_quote_backfill_backup b
   WHERE b.cr_id = c.id
     AND b.standard_code = 'DIN-14021'
     AND c.audited_by = 'W3-D12 quote backfill · claude-opus-5 · PDF-verbatim (SR-1/VA)';

  GET DIAGNOSTICS v_reverted = ROW_COUNT;
  RAISE NOTICE 'W3-D12 DIN-14021 ROLLBACK: % CR rows restored from backup', v_reverted;
END $$;
