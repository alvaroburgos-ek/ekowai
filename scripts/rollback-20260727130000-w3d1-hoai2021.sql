-- ROLLBACK for the HOAI-2021 half of the W3-D1 quote backfill.
--
-- Restores from w3d1_quote_backfill_backup, which holds the ACTUAL pre-write values.
-- It does not reconstruct them from clause_reference: several HOAI-2021 stubs carried
-- encoder annotations the clause ref never held, so a reconstruction would invent a
-- near-miss "original" — the same fabrication class rule 10 exists to catch.
--
-- This deliberately restores a state that FAILS validator rule 10a. That is correct:
-- a rollback undoes a write, it does not curate the corpus.

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
     AND b.standard_code = 'HOAI-2021'
     AND c.audited_by = 'W3-D1 quote backfill · claude-opus-5 · PDF-verbatim (SR-1/VA)';

  GET DIAGNOSTICS v_reverted = ROW_COUNT;
  RAISE NOTICE 'W3-D1 HOAI-2021 ROLLBACK: % CR rows restored from backup', v_reverted;
END $$;
