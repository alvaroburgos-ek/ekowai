-- W3-D12 — evidence backfill for DIN-14021's 27 heading-as-evidence CRs (rule 10b)
--
-- The larger cousin of W3-D1. These 27 CRs assert `audit_status = 'match'` while their
-- `source_quote` is a LaTeX section HEADING — `\subsection*{7.3 Degradable}` — i.e. a
-- POINTER to where the requirement lives, not the requirement. Same UNVERIFIED PROVENANCE
-- class as the 54 label stubs, different shape; surfaced by validator rule 10b.
-- With the 3 stubs already fixed, 30 of this standard's 50 CRs carried non-evidence.
--
-- Quotes lifted verbatim in-session from the rendered PDF
--   C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DIN-14021\DIN-EN-ISO-14021.pdf
--   (DIN EN ISO 14021:2016-07, German edition) via:
--     pdftotext -layout -enc UTF-8 <pdf> din14021.txt
--     node scripts/reasoning-map/extract-bilingual-column.mjs din14021.txt \
--          --pages 14-63 --side left --out din14021-body.txt
--     node scripts/reasoning-map/clause-slice.mjs din14021-body.txt <clause>
--
-- LANGUAGE NOTE, deliberate: the old quotes were ENGLISH headings (from an English
-- markdown source); the quotes below are GERMAN, because the PDF in the library is the
-- German edition and SR-3 makes the rendered PDF ground truth. Clause NUMBERING is
-- identical across editions, so the anchors still line up. Storing the German text of the
-- document we actually hold beats storing English we cannot verify against it.
--
-- PAGE OFFSET +6, derived here and cross-checked twice: printed folio "38" appears on PDF
-- p.44, and printed "16" closes §5.6 on PDF p.22. Anchors carry both.
--
-- Where a requirement lives in a numbered sub-clause (7.x.2 "Voraussetzungen") the quote
-- is taken from there and the sub-clause is named inline, because that is where the
-- normative sentence actually sits — the parent heading has none.
--
-- REQ-41/42/47/49 intentionally repeat the quote of REQ-22/23/26/25: those CR pairs anchor
-- the SAME clause. Duplication is honest here; inventing distinct text would not be.
--
-- SCOPE — evidence capture only. No condition, severity, or gate touched. Note all 27 are
-- `block`, and several now visibly rest on "darf nicht"/"müssen" (genuine mandates) while
-- others rest on definitional text (7.12.1.1/7.12.1.2 define terms, they do not command).
-- That severity question is NOT decided here; it is a ruling, queued as A14021-D1.
--
-- Idempotent per row, guarded on the heading shape still being present.
-- Rollback: scripts/rollback-20260727150000-w3d12-din14021.sql

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

  CREATE TABLE IF NOT EXISTS w3d1_quote_backfill_backup (
    cr_id         uuid PRIMARY KEY,
    standard_code text,
    cr_code       text,
    source_quote  text,
    source_file   text,
    source_anchor text,
    audit_status  text,
    audited_at    timestamptz,
    audited_by    text,
    backed_up_at  timestamptz DEFAULT now()
  );

  INSERT INTO w3d1_quote_backfill_backup
    (cr_id, standard_code, cr_code, source_quote, source_file, source_anchor, audit_status, audited_at, audited_by)
  SELECT c.id, 'DIN-14021', c.code, c.source_quote, c.source_file, c.source_anchor,
         c.audit_status, c.audited_at, c.audited_by
    FROM compliance_requirements c
   WHERE c.worksheet_template_id IN (SELECT id FROM worksheet_templates WHERE standard_id = v_std)
     AND starts_with(c.source_quote, chr(92) || 'subsection*{')
  ON CONFLICT (cr_id) DO NOTHING;

  WITH q(cr, page, printed, quote) AS (
    VALUES
    ('REQ-26', 21, 15, $q$[5.2] Zusätzlich zu den Anforderungen dieser Internationalen Norm gelten die in ISO 14020 aufgestellten Prinzipien. Dort, wo diese Internationale Norm spezifischere Anforderungen stellt als ISO 14020, müssen diese spezifischeren Anforderungen erfüllt werden.$q$),
    ('REQ-47', 21, 15, $q$[5.2] Zusätzlich zu den Anforderungen dieser Internationalen Norm gelten die in ISO 14020 aufgestellten Prinzipien. Dort, wo diese Internationale Norm spezifischere Anforderungen stellt als ISO 14020, müssen diese spezifischeren Anforderungen erfüllt werden.$q$),
    ('REQ-01', 22, 16, $q$[5.3] Eine unbestimmte oder unspezifische Umweltaussage oder eine, die allgemein darauf abzielt, dass ein Produkt günstig für die Umwelt oder umweltverträglich ist, darf nicht gemacht werden. Deshalb dürfen keine Umweltaussagen wie „umweltsicher“, „umweltfreundlich“, „freundlich zur Erde“, „ohne Emissionen“, „grün“, „naturfreundlich“ und „ozonfreundlich“ verwendet werden.$q$),
    ('REQ-02', 22, 16, $q$[5.4] Eine Aussage von „... frei“ darf nur gemacht werden, wenn der Anteil des bestimmten Stoffes nicht größer ist als der, der als anerkannte Spurenverunreinigung oder natürliche Grundbelastung vorzufinden wäre.$q$),
    ('REQ-03', 22, 16, $q$[5.5] Konzepte im Zusammenhang mit Nachhaltigkeit sind äußerst kompliziert und werden noch untersucht. Gegenwärtig gibt es keine bestimmten Verfahren zur Messung von Nachhaltigkeit oder zu ihrer Bestätigung. Deshalb darf keine Aussage über das Erreichen von Nachhaltigkeit gemacht werden.$q$),
    ('REQ-04', 22, 16, $q$[5.6] Umweltbezogene Anbietererklärungen müssen mit einer ergänzenden Erklärung verbunden sein, wenn die Aussage allein möglicherweise zu Missverständnissen führen kann. Eine Umweltaussage darf nur dann ohne ergänzende Erklärung erfolgen, wenn sie unter allen vorhersehbaren Umständen ohne Einschränkungen gültig ist.$q$),
    ('REQ-46', 28, 22, $q$[6.3.1] Vergleichende Aussagen müssen im Hinblick auf einen oder mehrere der folgenden Punkte bewertet werden: a) vorheriges Verfahren einer Organisation; b) vorheriges Produkt einer Organisation; c) Verfahren einer anderen Organisation; oder d) Produkt einer anderen Organisation.$q$),
    ('REQ-17', 29, 23, $q$[6.4] Bewertungsverfahren und Verfahren zur Überprüfung von Aussagen müssen in der Reihenfolge Internationale Normen, anerkannte Normen internationaler Akzeptanz (diese können regionale oder nationale Normen sein) oder Verfahren von Industrie und Handel, die sich in einer Prüfung durch Dritte als gleichwertig erwiesen haben, durchgeführt werden.$q$),
    ('REQ-28', 32, 26, $q$[7.2.2.1] Eine Aussage zur Kompostierbarkeit darf nicht erfolgen, wenn ein Produkt, eine Verpackung oder ein Produkt- oder Verpackungsbestandteil: a) den Gesamtnutzen des Komposts als Bodenverbesserungsmittel negativ beeinflusst; b) zu irgendeinem Zeitpunkt der Zersetzung oder danach Stoffe in gefährlichen Konzentrationen freisetzt …$q$),
    ('REQ-29', 34, 28, $q$[7.3.2.1 a)] Aussagen zur Abbaubarkeit dürfen nur in Bezug auf ein bestimmtes Prüfverfahren erfolgen, das den zu erreichenden Abbaugrad und die Testdauer einschließt, und sie müssen für die Umstände zutreffen, unter denen [das Produkt entsorgt wird].$q$),
    ('REQ-30', 35, 29, $q$[7.4.2.1] Die Aussage für zerlegbar konstruiert muss mit einer erklärenden Stellungnahme verbunden sein, die die Bestandteile oder Einzelteile festlegt, die wiederzuverwenden, zu recyceln, zur Rückgewinnung von Energie zu nutzen oder auf bestimmte andere Weise vom anfallenden Abfall abzutrennen sind.$q$),
    ('REQ-31', 37, 31, $q$[7.5.2.1] Sämtliche Aussagen zum verlängerten Produktleben müssen dargelegt werden. Weil die Aussagen zum verlängerten Produktleben vergleichende Aussagen sind, müssen die Anforderungen von 6.3 erfüllt sein.$q$),
    ('REQ-32', 37, 31, $q$[7.6.2] Damit die Aussage erfolgen kann, dass ein Produkt mit zurückgewonnener Energie produziert wurde, muss die verwendete Energie folgende Anforderungen erfüllen und nach 7.6.3 bewertet werden.$q$),
    ('REQ-33', 39, 33, $q$[7.7.2] Falls keine Sammelstellen oder Sammeleinrichtungen für das Recycling des Produktes oder der Verpackung für einen angemessenen Anteil an Käufern, potentiellen Käufern oder Anwendern des Produktes in verkehrsgünstiger Lage zur Verfügung stehen, gilt Folgendes: a) Es muss eine konkrete Aussage zur Recyclingfähigkeit [erfolgen] …$q$),
    ('REQ-34', 42, 36, $q$[7.8.2.1] Erfolgt eine Aussage zum Recyclatgehalt, muss der prozentuale Anteil an recyceltem Material angegeben werden. [7.8.2.2] Der prozentuale Anteil des Recyclats für Produkte und Verpackung muss einzeln angegeben und darf nicht zusammengefasst werden.$q$),
    ('REQ-38', 47, 41, $q$[7.12.1.1 Wiederverwendbar] Charakteristisches Merkmal von Produkten oder Verpackungen, die dafür vorgesehen und konstruiert wurden, während ihres Lebensweges eine gewisse Anzahl an Gebrauchszyklen oder Umläufen im Rahmen der vorgesehenen Verwendung zu durchlaufen.$q$),
    ('REQ-39', 47, 41, $q$[7.12.1.2 Nachfüllbar] Charakteristisches Merkmal von Produkten oder Verpackungen, die in der Ausgangsform mit dem gleichen oder einem vergleichbaren Produkt mehr als einmal ohne zusätzliche Bearbeitung, mit Ausnahme von bestimmten Anforderungen wie Reinigen und Waschen, befüllt werden können.$q$),
    ('REQ-40', 49, 43, $q$[7.13.2.1] Alle Aussagen zur Abfallminderung müssen begründet sein. Weil Abfallminderung eine vergleichende Aussage ist, müssen die Anforderungen von 6.3 erfüllt sein.$q$),
    ('REQ-22', 50, 44, $q$[7.14.2] Wenn bei Primärrohstoffen Aussagen zur Erneuerbarkeit gemacht werden, müssen diese Materialien aus Quellen stammen, die sich mit einer Geschwindigkeit regenerieren, die gleich oder höher als die Geschwindigkeit des Abbaus ist.$q$),
    ('REQ-41', 50, 44, $q$[7.14.2] Wenn bei Primärrohstoffen Aussagen zur Erneuerbarkeit gemacht werden, müssen diese Materialien aus Quellen stammen, die sich mit einer Geschwindigkeit regenerieren, die gleich oder höher als die Geschwindigkeit des Abbaus ist.$q$),
    ('REQ-23', 51, 45, $q$[7.15.2] Eine uneingeschränkte Aussage zur erneuerbaren Energie ist nur zulässig, wenn 100 % der Energie erneuerbar ist. Andernfalls müssen Aussagen zur erneuerbaren Energie wie folgt eingeschränkt werden. Wenn ein Anteil der Energie aus erneuerbaren Energiequellen stammt, muss der prozentuale Anteil eindeutig angegeben werden.$q$),
    ('REQ-42', 51, 45, $q$[7.15.2] Eine uneingeschränkte Aussage zur erneuerbaren Energie ist nur zulässig, wenn 100 % der Energie erneuerbar ist. Andernfalls müssen Aussagen zur erneuerbaren Energie wie folgt eingeschränkt werden. Wenn ein Anteil der Energie aus erneuerbaren Energiequellen stammt, muss der prozentuale Anteil eindeutig angegeben werden.$q$),
    ('REQ-43', 52, 46, $q$[7.16.1] Wie in 5.5 angeführt, darf keine Anbietererklärung über das Erreichen von Nachhaltigkeit abgegeben werden. Im vorliegenden Unterabschnitt wird nochmals betont, dass Anbietererklärungen zu „nachhaltig“ und „Nachhaltigkeit“ nicht verwendet werden dürfen.$q$),
    ('REQ-44', 53, 47, $q$[7.17.2.1] Unter einem „Carbon Footprint“ eines Produktes wird die Nettosumme der Treibhausgase (siehe 3.1.9) eines Produkt-Lebenswegs (siehe 3.1.10) verstanden. Dieser schließt auch langzeitige netto CO2-Entfernung ein.$q$),
    ('REQ-25', 53, 47, $q$[7.17.2.2] Die Quantifizierung und Kommunikation von „Carbon Footprints“ von Produkten muss nach ISO/TS 14067 durchgeführt werden.$q$),
    ('REQ-49', 53, 47, $q$[7.17.2.2] Die Quantifizierung und Kommunikation von „Carbon Footprints“ von Produkten muss nach ISO/TS 14067 durchgeführt werden.$q$),
    ('REQ-45', 53, 47, $q$[7.17.3.1] „CO2-neutral“ bezieht sich auf ein Produkt (als ein Produktsystem) mit einem „Carbon Footprint“ (siehe 7.17.2) von null oder einem Produkt, bei dem der „Carbon Footprint“ ausgeglichen wurde.$q$)
  )
  UPDATE compliance_requirements c
     SET source_quote  = q.quote,
         source_file   = v_pdf,
         source_anchor = v_pdf || ' §' || c.clause_reference || ' (PDF p.' || q.page || ' = gedruckt S.' || q.printed || ')',
         audited_at    = now(),
         audited_by    = 'W3-D12 quote backfill · claude-opus-5 · PDF-verbatim (SR-1/VA)'
    FROM q
   WHERE c.code = q.cr
     AND c.worksheet_template_id IN (SELECT id FROM worksheet_templates WHERE standard_id = v_std)
     -- NOT `LIKE '\subsection*{%'`: in LIKE, backslash is the DEFAULT ESCAPE character,
     -- so that pattern means "starts with subsection*{" and matches NOTHING. The first
     -- run of this migration returned HTTP 201, raised NOTICE with 0 rows, and changed
     -- nothing — a silent no-op that looked like a success. starts_with() does no
     -- pattern interpretation, and chr(92) removes the literal-escaping question.
     AND starts_with(c.source_quote, chr(92) || 'subsection*{');

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RAISE NOTICE 'W3-D12 DIN-14021: % CR rows backfilled with PDF-verbatim quotes', v_updated;
END $$;
