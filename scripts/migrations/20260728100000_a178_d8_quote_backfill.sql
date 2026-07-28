-- A178-D8 — quote backfill for DWA-A-178's 6 NULL-quote CRs (pre-authorized evidence capture)
-- Quotes re-captured in-session from the a178-de.txt extraction (grep, 2026-07-28); equation
-- renderings (Gl.1/9/10) were verified against RENDERED pages by the wave-3/4 equation sweeps.
-- Superscripts restored where pdftotext hoists them (m² — render-verified). NULL originals →
-- rollback = revert to NULL where audited_by matches. No condition/severity/gate touched.
DO $$
DECLARE v_std uuid; v_n int;
BEGIN
  SELECT id INTO v_std FROM standards WHERE code = 'DWA-A-178';
  WITH q(cr, page, quote) AS (VALUES
    ('REQ-07', 19, $q$Ein Eintrag feinpartikulärer Feststoffe (AFS63), der das in Misch- und Trennsystemen sowie bei der Straßenentwässerung übliche Frachtaufkommen von bis zu 1.000 kg/(ha·a) (FUCHS et al. 2010) deutlich überschreitet, erzeugt ein erhebliches Kolmationsrisiko.$q$),
    ('REQ-14', 25, $q$Es ist sicherzustellen, dass bei Volleinstau des Retentionsraums die spezifische Drosselabflussspende auf qDr,RBF = 0,05 l/(s·m²) begrenzt ist.$q$),
    ('REQ-17', 27, $q$1. Vorbemessung der Bodenfilteroberfläche AF über die Stoffbilanz: Die erforderliche Bodenfilteroberfläche wird über die zulässige Filterflächenbelastung, bezogen auf AFS63, ermittelt. — Vorbemessung Bodenfilteroberfläche: AF = (BRBF,zu / bkrit) · ηB,soll (Gl. 1)$q$),
    ('REQ-19', 32, $q$Zulässige AFS63-Bodenfilteroberflächenbelastung: 4 kg/(m²·a) ≤ bF ≤ bkrit = 7 kg/(m²·a) (Gl. 9)$q$),
    ('REQ-20', 32, $q$Spezifische Einleitfracht aus der Retentionsbodenfilteranlage: BRBFA,ab / AE,b,a ≤ bR,e,zul (Gl. 10)$q$),
    ('REQ-22', 34, $q$Die Beschickungshäufigkeit muss im langjährigen Mittel ≥ 10 a sein.$q$)
  )
  UPDATE compliance_requirements c
     SET source_quote = q.quote,
         source_file = 'DWA-A_178.pdf',
         source_anchor = 'DWA-A_178.pdf ' || c.clause_reference || ' (PDF p.' || q.page || ' = gedruckt S.' || (q.page - 2) || ')',
         audited_at = now(),
         audited_by = 'A178-D8 quote backfill · claude-fable-5 · PDF-verbatim (SR-1/VA)'
    FROM q
   WHERE c.code = q.cr AND c.source_quote IS NULL
     AND c.worksheet_template_id IN (SELECT id FROM worksheet_templates WHERE standard_id = v_std);
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RAISE NOTICE 'A178-D8: % rows backfilled', v_n;
END $$;
