-- ROLLBACK for 20260727120000_w3d1_quote_backfill_vdi3814.sql
--
-- Restores the 28 VDI-3814 CRs to the evidence-free stub they carried before the
-- backfill: source_quote = '[Klausel-verifiziert: ]<clause_reference>', markdown
-- source_file, markdown-derived anchor, and no audit attribution.
--
-- NOTE: this deliberately restores a state that validator rule 10a FAILS. That is
-- correct — the rollback's job is to undo the write, not to leave a prettier corpus.
-- After running it, `10.evidence-backs-match` returns to 54 findings.
--
-- Guarded per row on the backfill's own audited_by stamp, so it cannot clobber a
-- later, better quote written by someone else.

DO $$
DECLARE
  v_std uuid;
  v_reverted int := 0;
BEGIN
  SELECT id INTO v_std FROM standards WHERE code = 'VDI-3814-Blatt-2-1';
  IF v_std IS NULL THEN
    RAISE EXCEPTION 'standard VDI-3814-Blatt-2-1 not found';
  END IF;

  UPDATE compliance_requirements c
     SET source_quote  = '[Klausel-verifiziert: ]' || c.clause_reference,
         source_file   = 'VDI-3814-Blatt-2.md',
         source_anchor = 'VDI-3814-Blatt-2.md ' || c.clause_reference,
         audited_at    = NULL,
         audited_by    = NULL
   WHERE c.worksheet_template_id IN (SELECT id FROM worksheet_templates WHERE standard_id = v_std)
     AND c.audited_by = 'W3-D1 quote backfill · claude-opus-5 · PDF-verbatim (SR-1/VA)';

  GET DIAGNOSTICS v_reverted = ROW_COUNT;
  RAISE NOTICE 'W3-D1 VDI-3814 ROLLBACK: % CR rows reverted to stub', v_reverted;
END $$;
