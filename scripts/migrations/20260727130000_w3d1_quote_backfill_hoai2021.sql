-- W3-D1 — evidence backfill for HOAI-2021 (23 CRs)
--
-- Second half of the rule-10a clearance, and the RE-CATCH case: HOAI-2021 was closed
-- ✅ COMPLIANT-pending-review in DATA-FIX-CAMPAIGN.md item 4 (commit fe85f05) with the
-- note "quotes backfilled VA". Live prod showed 23 of its 23 CRs carrying
-- '[Klausel-verifiziert: §N]' — a clause POINTER, never a quote. The earlier close was
-- premature; this is the write that makes the note true.
--
-- Every quote lifted VERBATIM, in-session, from the rendered PDF
--   C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\bayika_hoai_2021.pdf
-- (Textausgabe of the Verordnung, 135 pp) via the same re-runnable path as VDI-3814:
--   pdftotext -layout -enc UTF-8 <pdf> hoai.txt
--   node scripts/reasoning-map/extract-bilingual-column.mjs hoai.txt --pages 6-115 \
--        --side left --out hoai-body.txt
--   node scripts/reasoning-map/clause-slice.mjs hoai-body.txt <n> --style para
--
-- The slicer needed a cross-reference guard for this document: in a legal text
-- "§ 4 Absatz 1 Satz 3" occurs far more often than the heading of § 4, so a naive
-- first-match quotes the wrong paragraph — plausibly, and therefore dangerously.
-- Pages below come from the slicer's own page markers, not from any inherited offset.
--
-- SCOPE — evidence capture only. No condition, severity, or gate is touched. In
-- particular HOAI-CR-02/21/22/23 remain `condition = TRUE` (dead gates); whether they
-- should enforce anything is a separate ruling and is NOT decided here.
--
-- Idempotent per row; guarded on the stub still being present.
-- Rollback: scripts/rollback-20260727130000-w3d1-hoai2021.sql

DO $$
DECLARE
  v_std uuid;
  v_updated int := 0;
  v_pdf text := 'bayika_hoai_2021.pdf';
BEGIN
  SELECT id INTO v_std FROM standards WHERE code = 'HOAI-2021';
  IF v_std IS NULL THEN
    RAISE EXCEPTION 'standard HOAI-2021 not found';
  END IF;

  -- Snapshot the ORIGINALS before overwriting. HOAI's stubs are not reconstructable
  -- from clause_reference: several carry encoder annotations the clause ref does not
  -- hold ('[Klausel-verifiziert: §5 (objektart-gated I-III/I-V)]' vs clause_reference
  -- '§5'). A reconstructing rollback would silently invent a slightly-wrong "original",
  -- which is the same fabrication class this whole rule is about. So the real prior
  -- values are kept, and rollback restores from them.
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
  SELECT c.id, 'HOAI-2021', c.code, c.source_quote, c.source_file, c.source_anchor,
         c.audit_status, c.audited_at, c.audited_by
    FROM compliance_requirements c
   WHERE c.worksheet_template_id IN (SELECT id FROM worksheet_templates WHERE standard_id = v_std)
     AND c.source_quote ~ '^\s*\[\s*Klausel[- ]verifiziert\s*:[^\]]*\]\s*(§[^\s;]+\s*;?\s*)*$'
  ON CONFLICT (cr_id) DO NOTHING;

  WITH q(cr, page, quote) AS (
    VALUES
    ('HOAI-CR-01', 6, $q$§ 1 Anwendungsbereich — Diese Verordnung gilt für Honorare für Ingenieur- und Architektenleistungen, soweit diese Leistungen durch diese Verordnung erfasst sind. Die Regelungen dieser Verordnung können zum Zwecke der Honorarberechnung einer Honorarvereinbarung zugrunde gelegt werden.$q$),
    ('HOAI-CR-02', 8, $q$[§ 2a Abs. 2] Basishonorarsatz ist der jeweils untere in den Honorartafeln dieser Verordnung enthaltene Honorarsatz. — [§ 7 Abs. 1] Das Honorar richtet sich nach der Vereinbarung, die die Vertragsparteien in Textform treffen. Sofern keine Vereinbarung über die Höhe des Honorars in Textform getroffen wurde, gilt für Grundleistungen der jeweilige Basishonorarsatz als vereinbart, der sich bei der Anwendung der Honorargrundlagen des § 6 ergibt.$q$),
    ('HOAI-CR-03', 7, $q$(1) Bei der Ermittlung des Honorars für Grundleistungen im Sinne des § 3 Absatz 1 sind zugrunde zu legen 1. das Leistungsbild, 2. die Honorarzone und 3. die dazugehörige Honorartafel zur Honorarorientierung.$q$),
    ('HOAI-CR-04', 7, $q$(1) Anrechenbare Kosten sind Teil der Kosten für die Herstellung, den Umbau, die Modernisierung, Instandhaltung oder Instandsetzung von Objekten sowie für die damit zusammenhängenden Aufwendungen. Sie sind nach allgemein anerkannten Regeln der Technik oder nach Verwaltungsvorschriften (Kostenvorschriften) auf der Grundlage ortsüblicher Preise zu ermitteln.$q$),
    ('HOAI-CR-05', 7, $q$(1) Die Grundleistungen der Flächen-, Objekt- oder Fachplanungen werden zur Berechnung der Honorare nach den jeweiligen Planungsanforderungen Honorarzonen zugeordnet, die von der Honorarzone I aus ansteigend den Schwierigkeitsgrad der Planung einstufen.$q$),
    ('HOAI-CR-06', 9, $q$§ 13 Interpolation — Zwischenstufen der in den Honorartafeln angegebenen anrechenbaren Kosten und Flächen oder Verrechnungseinheiten sind durch lineare Interpolation zu ermitteln.$q$),
    ('HOAI-CR-07', 8, $q$(1) Werden dem Auftragnehmer nicht alle Leistungsphasen eines Leistungsbildes übertragen, so dürfen nur die für die übertragenen Phasen vorgesehenen Prozentsätze berechnet und vereinbart werden. Die Vereinbarung hat in Textform zu erfolgen.$q$),
    ('HOAI-CR-08', 22, $q$(3) Die Grundleistungen sind in neun Leistungsphasen unterteilt und werden wie folgt in Prozentsätzen der Honorare des § 35 bewertet: 1. für die Leistungsphase 1 (Grundlagenermittlung) mit je 2 Prozent für Gebäude und Innenräume, 2. für die Leistungsphase 2 (Vorplanung) mit je 7 Prozent für Gebäude und Innenräume, 3. für die Leistungsphase 3 (Entwurfsplanung) mit 15 Prozent für Gebäude und Innenräume, 4. für die Leistungsphase 4 (Genehmigungsplanung) mit 3 Prozent für Gebäude und 2 Prozent für Innenräume, 5. für die Leistungsphase 5 (Ausführungsplanung) mit 25 Prozent für Gebäude und 30 Prozent für Innenräume, …$q$),
    ('HOAI-CR-09', 22, $q$(3) Die Grundleistungen sind in neun Leistungsphasen unterteilt und werden wie folgt in Prozentsätzen der Honorare des § 35 bewertet: … 4. für die Leistungsphase 4 (Genehmigungsplanung) mit 3 Prozent für Gebäude und 2 Prozent für Innenräume, 5. für die Leistungsphase 5 (Ausführungsplanung) mit 25 Prozent für Gebäude und 30 Prozent für Innenräume, … [Innenraum-Spalte desselben Absatzes]$q$),
    ('HOAI-CR-10', 25, $q$(3) Die Grundleistungen bei Freianlagen sind in neun Leistungsphasen unterteilt und werden wie folgt in Prozentsätzen der Honorare des § 40 bewertet.$q$),
    ('HOAI-CR-11', 28, $q$(1) § 34 Absatz 1 gilt entsprechend. Die Grundleistungen für Ingenieurbauwerke sind in neun Leistungsphasen unterteilt und werden wie folgt in Prozentsätzen der Honorare des § 44 bewertet: 1. für die Leistungsphase 1 (Grundlagenermittlung) mit 2 Prozent, 2. für die Leistungsphase 2 (Vorplanung) mit 20 Prozent, 3. für die Leistungsphase 3 (Entwurfsplanung) mit 25 Prozent, …$q$),
    ('HOAI-CR-12', 31, $q$(1) § 34 Absatz 1 gilt entsprechend. Die Grundleistungen für Verkehrsanlagen sind in neun Leistungsphasen unterteilt und werden wie folgt in Prozentsätzen der Honorare des § 48 bewertet: 1. für die Leistungsphase 1 (Grundlagenermittlung) mit 2 Prozent, 2. für die Leistungsphase 2 (Vorplanung) mit 20 Prozent, 3. für die Leistungsphase 3 (Entwurfsplanung) mit 25 Prozent, …$q$),
    ('HOAI-CR-13', 34, $q$(1) Die Grundleistungen der Tragwerksplanung sind für Gebäude und zugehörige bauliche Anlagen sowie für Ingenieurbauwerke nach § 41 Nummer 1 bis 5 in den Leistungsphasen 1 bis 6 sowie für Ingenieurbauwerke nach § 41 Nummer 6 und 7 in den Leistungsphasen 2 bis 6 zusammengefasst und werden wie folgt in Prozentsätzen der Honorare des § 52 bewertet.$q$),
    ('HOAI-CR-14', 36, $q$(1) Das Leistungsbild Technische Ausrüstung umfasst Grundleistungen für Neuanlagen, Wiederaufbauten, Erweiterungsbauten, Umbauten, Modernisierungen, Instandhaltungen und Instandsetzungen. Die Grundleistungen bei der Technischen Ausrüstung sind in neun Leistungsphasen zusammengefasst und werden wie folgt in Prozentsätzen der Honorare des § 56 bewertet.$q$),
    ('HOAI-CR-15', 8, $q$(2) Honorare für Grundleistungen bei Umbauten und Modernisierungen gemäß § 2 Absatz 5 und 6 sind zu ermitteln nach … 5. dem Umbau- oder Modernisierungszuschlag auf das Honorar. Der Umbau- oder Modernisierungszuschlag ist unter Berücksichtigung des Schwierigkeitsgrads der Leistungen in Textform zu vereinbaren. Sofern keine Vereinbarung in Textform getroffen wurde, gilt ein Zuschlag von 20 Prozent ab einem durchschnittlichen Schwierigkeitsgrad als vereinbart.$q$),
    ('HOAI-CR-16', 8, $q$(2) Der Auftragnehmer hat den Auftraggeber, sofern dieser Verbraucher ist, vor Abgabe von dessen verbindlicher Vertragserklärung zur Honorarvereinbarung in Textform darauf hinzuweisen, dass ein höheres oder niedrigeres Honorar als die in den Honorartafeln dieser Verordnung enthaltenen Werte vereinbart werden kann. Erfolgt der Hinweis nach Satz 1 nicht oder nicht rechtzeitig, gilt für die zwischen den Vertragsparteien vereinbarten Grundleistungen anstelle eines höheren Honorars ein Honorar in Höhe des jeweiligen Basishonorarsatzes als vereinbart.$q$),
    ('HOAI-CR-17', 8, $q$(1) Das Honorar richtet sich nach der Vereinbarung, die die Vertragsparteien in Textform treffen.$q$),
    ('HOAI-CR-18', 9, $q$(1) Der Auftragnehmer kann neben den Honoraren dieser Verordnung auch die für die Ausführung des Auftrags erforderlichen Nebenkosten in Rechnung stellen; ausgenommen sind die abziehbaren Vorsteuern gemäß § 15 Absatz 1 des Umsatzsteuergesetzes in der jeweils geltenden Fassung.$q$),
    ('HOAI-CR-19', 10, $q$(1) Der Auftragnehmer hat Anspruch auf Ersatz der gesetzlich geschuldeten Umsatzsteuer für nach dieser Verordnung abrechenbare Leistungen, sofern nicht die Kleinunternehmerregelung nach § 19 des Umsatzsteuergesetzes angewendet wird.$q$),
    ('HOAI-CR-20', 7, $q$(1) Anrechenbare Kosten sind Teil der Kosten für die Herstellung, den Umbau, die Modernisierung, Instandhaltung oder Instandsetzung von Objekten sowie für die damit zusammenhängenden Aufwendungen.$q$),
    ('HOAI-CR-21', 10, $q$§ 15 Fälligkeit des Honorars, Abschlagszahlungen — Für die Fälligkeit der Honorare für die von dieser Verordnung erfassten Leistungen gilt § 650g Absatz 4 des Bürgerlichen Gesetzbuchs entsprechend. Für das Recht, Abschlagszahlungen zu verlangen, gilt § 632a des Bürgerlichen Gesetzbuchs entsprechend.$q$),
    ('HOAI-CR-22', 10, $q$(1) Leistungen der Bauleitplanung umfassen die Vorbereitung der Aufstellung von Flächennutzungs- und Bebauungsplänen im Sinne des § 1 Absatz 2 des Baugesetzbuches in der jeweils geltenden Fassung die erforderlichen Ausarbeitungen und Planfassungen sowie die Mitwirkung beim Verfahren. (2) Leistungen beim Städtebaulichen Entwurf sind Besondere Leistungen.$q$),
    ('HOAI-CR-23', 9, $q$(1) Umfasst ein Auftrag mehrere Objekte, so sind die Honorare vorbehaltlich der folgenden Absätze für jedes Objekt getrennt zu berechnen.$q$)
  )
  UPDATE compliance_requirements c
     SET source_quote  = q.quote,
         source_file   = v_pdf,
         source_anchor = v_pdf || ' ' || c.clause_reference || ' (PDF p.' || q.page || ')',
         audited_at    = now(),
         audited_by    = 'W3-D1 quote backfill · claude-opus-5 · PDF-verbatim (SR-1/VA)'
    FROM q
   WHERE c.code = q.cr
     AND c.worksheet_template_id IN (SELECT id FROM worksheet_templates WHERE standard_id = v_std)
     AND c.source_quote ~ '^\s*\[\s*Klausel[- ]verifiziert\s*:[^\]]*\]\s*(§[^\s;]+\s*;?\s*)*$';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RAISE NOTICE 'W3-D1 HOAI-2021: % CR rows backfilled with PDF-verbatim quotes', v_updated;
END $$;
