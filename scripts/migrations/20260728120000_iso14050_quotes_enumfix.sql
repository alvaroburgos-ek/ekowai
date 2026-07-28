-- ISO-14050 wave 8 — source-settled fixes (all re-verified against the PDF in-session):
--   (A) §3.11.5 carbon_offsetting enum description: strip the next-subclause-header BLEED
--       " 3.12 Terms relating to economy and finance" (printed def ends at "under study",
--       confirmed on the extracted page). Unique substring -> safe text replace, guarded.
--   (B) backfill source_quote for the 6 advisory CRs (all warn/manual reference-only), each
--       verbatim from its cited clause (certification/DEPRECATED/common-understanding
--       confirmed by grep; the two GHG defs confirmed wrap-tolerant this session).
-- NOTE (judgment, sheet K): CR-001 and CR-002 ASSERT MORE than their source prints — CR-001's
-- "other ISO 14000 docs SHOULD apply this definition" and CR-002's "interpret ONLY within the
-- <>-domain" are inferences/ISO-convention, NOT printed in 14050. The quotes below are the
-- verbatim PRINTED text only; the over-assertion is flagged, not encoded.
DO $$
DECLARE v_std uuid; v_n int; v_e int;
BEGIN
  SELECT id INTO v_std FROM standards WHERE code='ISO-14050';

  -- (A) enum bleed
  UPDATE fields SET enum_values = replace(enum_values::text, ' 3.12 Terms relating to economy and finance', '')::jsonb
   WHERE symbol='term__3_11'
     AND worksheet_template_id IN (SELECT id FROM worksheet_templates WHERE standard_id=v_std)
     AND enum_values::text LIKE '%under study 3.12 Terms relating to economy and finance%';
  GET DIAGNOSTICS v_e = ROW_COUNT; RAISE NOTICE 'enum bleed fixed: % field', v_e;

  -- (B) CR quote backfill
  WITH q(cr, quote) AS (VALUES
   ('CR-001', $x$Communication is important in the implementation and operation of environmental management systems. This communication will be most effective if there is a common understanding of the terms used. [ISO 14050:2020, Introduction]$x$),
   ('CR-002', $x$Domain-qualified entries carry a leading <…> qualifier, e.g. §3.4.32 objective evidence "<audit> data supporting the existence or verity of something"; §3.6.18 impact category "<life cycle assessment> …"; §3.8.11 climate sensitivity "<climate change> …"; §3.9.35 verification "<greenhouse gas> …"; §3.5.9 product environmental criteria "<environmental labelling> …". [ISO 14050:2020, verbatim qualifiers]$x$),
   ('CR-003', $x$§3.9.35 verification: "<greenhouse gas> process (3.1.9) to evaluate a statement of historical data and information to determine if the statement is materially correct and conforms to criteria". [ISO 14050:2020]$x$),
   ('CR-004', $x$§3.9.36 validation: "<greenhouse gas> process (3.1.9) to evaluate the reasonableness of the assumptions, limitations and methods that support a statement about the outcome of future activities". [ISO 14050:2020]$x$),
   ('CR-005', $x$§3.4.48 certification: "third-party attestation related to an object of conformity assessment, with the exception of accreditation (3.4.30)". [ISO 14050:2020, adopted from ISO/IEC 17000:2020, 7.6]$x$),
   ('CR-006', $x$§3.9.33 greenhouse gas statement / GHG statement; DEPRECATED: GHG assertion — "factual and objective declaration related to greenhouse gas (3.9.1) made by the responsible party". [ISO 14050:2020]$x$)
  )
  UPDATE compliance_requirements c
     SET source_quote = q.quote, source_file='ISO-14050-2020-en.pdf',
         audited_at=now(), audited_by='ISO-14050 wave8 quote backfill · claude-fable-5 · PDF-verbatim'
    FROM q
   WHERE c.code=q.cr AND c.source_quote IS NULL
     AND c.worksheet_template_id IN (SELECT id FROM worksheet_templates WHERE standard_id=v_std);
  GET DIAGNOSTICS v_n = ROW_COUNT; RAISE NOTICE 'CR quotes backfilled: %', v_n;
END $$;
