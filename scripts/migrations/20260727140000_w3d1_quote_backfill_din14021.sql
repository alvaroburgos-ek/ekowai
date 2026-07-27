-- W3-D1 — evidence backfill for DIN-14021 (3 CRs) — completes rule 10a to zero
--
-- Source: C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DIN-14021\DIN-EN-ISO-14021.pdf
-- (DIN EN ISO 14021:2016-07, German edition). Quotes lifted verbatim in-session via:
--   pdftotext -layout -enc UTF-8 <pdf> din14021.txt
--   node scripts/reasoning-map/extract-bilingual-column.mjs din14021.txt \
--        --pages 14-63 --side left --out din14021-body.txt      # 14+ skips the TOC
--   node scripts/reasoning-map/clause-slice.mjs din14021-body.txt <clause>
--
-- TWO extraction traps hit here, both fixed in the tooling rather than worked around:
--  1. Slicing from page 1 matched the TABLE OF CONTENTS ("7.9 Reduzierter
--     Energieverbrauch ... 38") instead of the clause. Body starts at PDF p.14.
--  2. The Beuth per-licensee download watermark sits on every page and landed INSIDE
--     the §6 slice. Now filtered in extract-bilingual-column.mjs. Re-checked: the
--     already-applied VDI-3814 and HOAI-2021 extracts contain 0 watermark hits.
--
-- PAGE OFFSET for this document is +6, derived here, NOT inherited: the printed folio
-- "38" is captured mid-slice on PDF page 44. Anchors below record the PDF page (SR-3
-- wants the PDF locator) with the printed page alongside.
--
-- SCOPE — evidence capture only; no condition/severity/gate touched.
--
-- NOT IN SCOPE, and still open: DIN-14021 has a further 27 CRs flagged by rule 10b
-- whose `source_quote` is a LaTeX section HEADING (e.g. '\subsection*{7.3 Degradable}')
-- rather than clause text. Same class, larger and separate — 30 of this standard's 50
-- CRs carry non-evidence. Tracked as W3-D12; not silently folded in here.
--
-- Rollback: scripts/rollback-20260727140000-w3d1-din14021.sql

DO $$
DECLARE
  v_std uuid;
  v_updated int := 0;
  v_pdf text := 'DIN-EN-ISO-14021.pdf';
BEGIN
  SELECT id INTO v_std FROM standards WHERE code = 'DIN-14021';
  IF v_std IS NULL THEN
    RAISE EXCEPTION 'standard DIN-14021 not found';
  END IF;

  INSERT INTO w3d1_quote_backfill_backup
    (cr_id, standard_code, cr_code, source_quote, source_file, source_anchor, audit_status, audited_at, audited_by)
  SELECT c.id, 'DIN-14021', c.code, c.source_quote, c.source_file, c.source_anchor,
         c.audit_status, c.audited_at, c.audited_by
    FROM compliance_requirements c
   WHERE c.worksheet_template_id IN (SELECT id FROM worksheet_templates WHERE standard_id = v_std)
     AND c.source_quote ~ '^\s*\[\s*Klausel[- ]verifiziert\s*:[^\]]*\]\s*(§[^\s;]+\s*;?\s*)*$'
  ON CONFLICT (cr_id) DO NOTHING;

  WITH q(cr, page, printed, quote) AS (
    VALUES
    ('REQ-27', 21, 15, $q$[Abschnitt 5, PDF S.21] Die in Abschnitt 5 aufgeführten Anforderungen gelten für sämtliche umweltbezogenen Anbietererklärungen, unabhängig davon, ob es eine von den ausgewählten Aussagen ist, auf die in Abschnitt 7 verwiesen wird, oder eine sonstige Umweltaussage. — [Abschnitt 6, PDF S.27] Der für Umweltaussagen Zuständige ist für Bewertung und Bereitstellung von Daten verantwortlich, die für die Überprüfung von umweltbezogenen Anbietererklärungen notwendig sind. — [Abschnitt 7, PDF S.31] Abschnitt 7 gibt Erklärungen und Anwendungshinweise für ausgewählte, häufig in umweltbezogenen Anbietererklärungen verwendete Begriffe.$q$),
    ('REQ-35', 44, 38, $q$7.9.2.1 Alle Aussagen zum reduzierten Energieverbrauch müssen begründet sein. Weil der reduzierte Energieverbrauch eine vergleichende Aussage ist, müssen die Anforderungen von 6.3 erfüllt sein.$q$),
    ('REQ-36', 45, 39, $q$7.10.2.2 Alle Aussagen zum reduzierten Ressourcenverbrauch müssen begründet sein. 7.10.2.3 Reduzierungen des Ressourcenverbrauchs für Produkte und Verpackung müssen getrennt angegeben und dürfen nicht zusammengefasst werden.$q$)
  )
  UPDATE compliance_requirements c
     SET source_quote  = q.quote,
         source_file   = v_pdf,
         source_anchor = v_pdf || ' §' || c.clause_reference || ' (PDF p.' || q.page || ' = gedruckt S.' || q.printed || ')',
         audited_at    = now(),
         audited_by    = 'W3-D1 quote backfill · claude-opus-5 · PDF-verbatim (SR-1/VA)'
    FROM q
   WHERE c.code = q.cr
     AND c.worksheet_template_id IN (SELECT id FROM worksheet_templates WHERE standard_id = v_std)
     AND c.source_quote ~ '^\s*\[\s*Klausel[- ]verifiziert\s*:[^\]]*\]\s*(§[^\s;]+\s*;?\s*)*$';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RAISE NOTICE 'W3-D1 DIN-14021: % CR rows backfilled with PDF-verbatim quotes', v_updated;
END $$;
