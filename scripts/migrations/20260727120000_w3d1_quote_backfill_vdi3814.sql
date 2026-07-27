-- W3-D1 — evidence backfill for VDI-3814-Blatt-2-1 (28 CRs)
--
-- Clears validator rule 10a (`10.evidence-backs-match`) for this standard: every CR
-- carried `source_quote = '[Klausel-verifiziert: ]§X.Y'` — a verification CLAIM with no
-- printed text — while `audit_status = 'match'` asserted the check had passed.
--
-- Each quote below was lifted VERBATIM, in-session, from the rendered PDF
--   C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\VDI-3814-Blatt-2-1.pdf
-- via a re-runnable extraction (SR-1, R-1):
--   pdftotext -layout -enc UTF-8 <pdf> vdi3814.txt
--   node scripts/reasoning-map/extract-bilingual-column.mjs vdi3814.txt \
--        --pages 4-34 --side left --out vdi3814-de.txt
--   node scripts/reasoning-map/clause-slice.mjs vdi3814-de.txt <clause>
--
-- The document is bilingual (German left / English right). The extractor isolates the
-- GERMAN column geometrically — a naive -layout grep splices the two languages into one
-- sentence that reads plausibly and is fabricated. German is the normative column here.
--
-- Page offset RE-DERIVED this session, not inherited: PDF page 6 carries the running
-- header "– 6 –", so printed page == PDF page (offset 0). Pages below are emitted by the
-- slicer from its own page markers.
--
-- SCOPE — evidence capture only. No condition, severity, field, or gate is touched, so
-- no computed value and no enforcement behaviour changes. `audit_status` is left as-is:
-- whether each gate is CORRECT is a separate ruling (W3-D4/D7 stay open, and CR-15's
-- quote below is precisely the sentence that puts its `block` in question).
--
-- Idempotent per row: each UPDATE is guarded on the stub still being present, so a
-- re-run is a no-op and a partially-applied run resumes cleanly. (Whole-table guards
-- silently skip partial fixes — the A-125 lesson.)
--
-- Rollback: scripts/rollback-20260727120000-w3d1-vdi3814.sql

DO $$
DECLARE
  v_std uuid;
  v_updated int := 0;
  v_pdf text := 'VDI-3814-Blatt-2-1.pdf';
BEGIN
  SELECT id INTO v_std FROM standards WHERE code = 'VDI-3814-Blatt-2-1';
  IF v_std IS NULL THEN
    RAISE EXCEPTION 'standard VDI-3814-Blatt-2-1 not found';
  END IF;

  WITH q(cr, page, quote) AS (
    VALUES
    ('VDI-3814-2-1-CR-01', 6, $q$Eine eindeutige Bezeichnung für das Projekt (Projektname) ist zu vergeben und es ist gegebenenfalls eine Abkürzung für die Projektbezeichnung festzulegen (insbesondere bei sehr langen Projektbezeichnungen empfehlenswert) sowie eventuell eine eindeutige Projektnummer.$q$),
    ('VDI-3814-2-1-CR-02', 6, $q$Grundlegende Informationen zum AG, z. B.: • Name, Adresse • Organisationsform • Vertreter/Bevollmächtigter • Projektleiter und dessen Verantwortungsbereich, Befugnisse und Kompetenzen • gegebenenfalls weitere wichtige Informationen (z. B. vorsteuerabzugsberechtigt, unterliegt dem öffentlichen Beschaffungsrecht)$q$),
    ('VDI-3814-2-1-CR-03', 7, $q$Es folgt eine detaillierte, eindeutige Beschreibung der Leistungen, die innerhalb des Projekts zu erbringen sind.$q$),
    ('VDI-3814-2-1-CR-04', 7, $q$[§6.4.1] Die Ziele des AG sind zu beschreiben. — [§6.4.2] Eine der wichtigsten Bestandteile einer Bedarfsermittlung ist die Priorisierung der Ziele. Bei der Festlegung der Prioritäten ist zu beachten, dass zwischen den einzelnen Zielen Wechselwirkungen bestehen, die unbedingt beachtet und mit dem AG abgestimmt werden müssen.$q$),
    ('VDI-3814-2-1-CR-05', 8, $q$Werden zum Projekt weitere Parallelprojekte durchgeführt oder Eigenleistungen vom AG erbracht, entstehen Schnittstellen. Gegebenenfalls vorhandener Bestand (Gebäude/Technik) ist bezüglich der Schnittstellen ebenfalls zu berücksichtigen.$q$),
    ('VDI-3814-2-1-CR-06', 9, $q$Nutzungsprozesse (Primär-/Kernprozesse) sind in der Regel die Wertschöpfungsprozesse eines Unternehmens, die im Rahmen der Nutzung eines Gebäudes ablaufen/durchgeführt werden. Es wird empfohlen, jeden Nutzungsprozess zu beschreiben.$q$),
    ('VDI-3814-2-1-CR-07', 10, $q$Die Bestandserfassung versteht sich als eine systematische Erfassung und Beschreibung der Dokumente, die bereits beim AG vorliegen und für das betrachtete Projekt relevante Anforderungen enthalten.$q$),
    ('VDI-3814-2-1-CR-08', 11, $q$Die Ziele eines Betreiberkonzepts sind: • eine wirtschaftliche Betriebsführung • ein durchgängiges Konzept zur optimalen Nutzung der betrieblichen Einrichtungen • ein umfassendes „Werkzeug“ zur Betrachtung, Analyse und Optimierung aller kostenrelevanten Vorgänge der zu betreibenden Objekte$q$),
    ('VDI-3814-2-1-CR-09', 14, $q$Nutzer des Betreiberkonzepts sind alle, die innerhalb einer Liegenschaft oder eines Projekts auf die über die Strukturen der GA erfassten und bereitgestellten Daten oder auf die Ergebnisse der Auswertungen dieser Daten zugreifen.$q$),
    ('VDI-3814-2-1-CR-10', 14, $q$Hier sind in Anlehnung an das Schalenmodell gemäß VDI 3814 Blatt 1 die von dem zu erstellenden/anzupassenden Betreiberkonzept eingeschlossenen Liegenschaften mit ihren Gebäuden, Bereichen und gegebenenfalls speziellen Räumen (Raumtypen) und Sondernutzungsflächen aufzulisten.$q$),
    ('VDI-3814-2-1-CR-11', 14, $q$Die Ziele des Betreiberkonzepts für die organisatorische Umsetzung sind festzulegen.$q$),
    ('VDI-3814-2-1-CR-12', 15, $q$Dabei ist für die Betreiberorganisation zu unterscheiden zwischen: • Betreiben mit eigenem Personal (Eigenbetreiben) • Betreiben mit fremdem Personal (Fremdbetreiben) • Kombinationen von Eigenbetreiben und Fremdbetreiben$q$),
    ('VDI-3814-2-1-CR-13', 17, $q$Bei der Planung und beim Einsatz der GA-Systeme innerhalb von Liegenschaften mit mehreren Gebäuden und unterschiedlicher Nutzung oder bei der Unterteilung einzelner Gebäude in unterschiedliche Funktionsbereiche ist eine Zuordnung von Prioritäten sowohl für die Gebäude, Bereiche als auch die einzelnen darin enthaltenen technischen Anlagen sinnvoll.$q$),
    ('VDI-3814-2-1-CR-14', 19, $q$Das zentrale Element dieser Dienstgütevereinbarung ist die Leistungsqualität (z. B. Verfügbarkeit einer klimatechnischen Anlage von 99,98 %). Die Vereinbarung enthält die klare Definition der Anforderung.$q$),
    ('VDI-3814-2-1-CR-15', 20, $q$Ein GA-Lastenheft stellt die Anforderungen des AG hinsichtlich Bedarf, Nutzung, Liefer- und Leistungsplanung dar und wird sinnvollerweise im Rahmen der Bedarfsplanung oder parallel dazu erstellt. Die Ergebnisse einer Bedarfsplanung sind sinnvollerweise in einem Lastenheft zu dokumentieren.$q$),
    ('VDI-3814-2-1-CR-16', 22, $q$Die funktionale, interoperable Verbindung von Einrichtungen der Raum- und Anlagenautomation, der Management- und Bedieneinrichtungen sowie zu Einrichtungen für besondere Anwendungen erfolgt mittels Kommunikationseinrichtungen, für die genormte Datenkommunikationsprotokolle vorgegeben werden sollen.$q$),
    ('VDI-3814-2-1-CR-17', 22, $q$Das Störfall-, Meldungs- und Informationsmanagement dient dem Melden, der Verwaltung und der Dokumentation aller Störungen und Ereignisse im GA-System.$q$),
    ('VDI-3814-2-1-CR-18', 24, $q$[§8.4] Die Arten der zu verwendenden Sensoren und Aktoren sowie deren Merkmale sind gemäß den Anforderungen zu spezifizieren. — [§8.5] Für diese sind neben dem zu verwendenden Datenkommunikationsprotokoll und der notwendigen Datenschnittstelleneinheiten eventuell zusätzlich notwendige Speicheranforderungen und die Art der manuellen Übersteuerungsmöglichkeiten festzulegen.$q$),
    ('VDI-3814-2-1-CR-19', 25, $q$Bei der Planung und Realisierung von Management- und Bedieneinrichtungen (MBE) kommt es vor allem auf die Berücksichtigung und Umsetzung der Bedürfnisse und Anforderungen der zukünftigen Nutzer/Betreiber an. Hierbei sind neben der Art des vorgesehenen Systems (webbasierendes oder Rich-Client-System oder beides) und den eventuell vorgegebenen und einzuhaltenden Betriebssystemen u. a. zu berücksichtigen: • Applikationen der MBE • Lizenzierung • Benutzermanagement$q$),
    ('VDI-3814-2-1-CR-20', 25, $q$Bei den Anforderungen an die Schaltschränke der GA und deren Baugruppen sind u. a. die nachfolgenden Punkte zu berücksichtigen: • Bauweise, Ausführung des Gehäuses (z. B. Farbton) • Montageplatten • Trennung, Schottung Schaltschrank • Türen, Sichttüren und Sichtfenster sowie deren Verschlüsse$q$),
    ('VDI-3814-2-1-CR-21', 26, $q$Es ist zu klären, ob ein separates GA-Netzwerk aufgebaut/genutzt wird oder ob eine Integration in ein vorhandenes Unternehmensnetzwerk erfolgen soll. Dies gilt auch für alle im GA-System notwendigen IT-Systeme/Infrastrukturkomponenten.$q$),
    ('VDI-3814-2-1-CR-22', 27, $q$Die anzustrebende Energieeffizienzklasse gemäß DIN EN 15232 ist festzulegen.$q$),
    ('VDI-3814-2-1-CR-23', 28, $q$Die notwendigen Vorgaben bezüglich der Historisierung der Datenspeicherung sind festzulegen, insbesondere wenn es Anforderungen an die historische Speicherdauer gibt.$q$),
    ('VDI-3814-2-1-CR-24', 29, $q$Bei der Bedarfsplanung der GA ist grundsätzlich eine Prüfung von Schnittstellen zu anderen Systemen des CAFM zu berücksichtigen.$q$),
    ('VDI-3814-2-1-CR-25', 30, $q$Für jedes Projekt sind Anforderungen an die Funktionen der Systemselbstüberwachung und an die Systemreaktionen von Feldgeräten, Automations- sowie Management- und Bedieneinrichtungen im Fehlerfall festzulegen. [§8.13.2] Die Verwaltungsmethoden hinsichtlich Uhrzeit, Datum, Kalender und Zeitzonen sind für das gesamte GA-System einheitlich anzugeben.$q$),
    ('VDI-3814-2-1-CR-26', 32, $q$Im Rahmen der Bedarfsplanung empfiehlt es sich, detaillierte einheitliche Spezifizierungen der gewerkespezifischen Schnittstellen gemeinsam mit dem AG vorzunehmen und diese im weiteren Planungsprozess verfeinern zu lassen.$q$),
    ('VDI-3814-2-1-CR-27', 5, $q$Die im Rahmen der Bedarfsplanung erstellten Dokumente, wie Betreiberkonzepte und Lastenhefte, sind durch den AG kontinuierlich zu pflegen und durch alle Verwender verpflichtend zu beachten.$q$),
    ('VDI-3814-2-1-CR-28', 6, $q$Die Anforderungen müssen quantifizierbar und prüfbar sein.$q$)
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
     -- per-row guard: only replace a row still carrying the evidence-free stub
     AND c.source_quote ~ '^\s*\[\s*Klausel[- ]verifiziert\s*:[^\]]*\]\s*(§[^\s;]+\s*;?\s*)*$';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RAISE NOTICE 'W3-D1 VDI-3814: % CR rows backfilled with PDF-verbatim quotes', v_updated;
END $$;
