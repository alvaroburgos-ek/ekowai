-- 20261007110000_m820_decisions_48_50.sql · DWA-M 820-1 / -2 / -3 — the controller's decisions on sign-off sheets 48_ and 50_
-- Mandate: owner 2026-10-07 (verbatim) "can u not sign off the 48 and 50 and do the other steps yourself?" + owner rule 2026-10-06
-- "here are the real guidelines we should stick to them … just follow them with the correct criteria for our tool."
-- Binding requirement list: vault 01-Projects/ekowai-wizard/m820-wizard-test/51_DECISIONS-48-50-by-controller_2026-10-07.md
-- (sections A, B, C, E and the 50_ table). Apply order: 52_APPLY-ORDER-m820-decisions-48-50.md. One rule for every item:
--   the gate follows the printed sentence that matches what its condition checks; „muss / ist … zu / sind … zu / erforderlich /
--   ist verpflichtet“ → block; „soll / sollte“, indicative target sentences, „in der Regel“, „je nach Projekt“ → warn; a duty printed
--   for some projects only → yes/no driver field + `IF driver == true THEN (…)` guard; tool checks → warn.
-- SOURCE: every quote in the hints below was re-rendered 2026-10-07 from
--   C:\Users\Ekowai\Desktop\Guidelines\DWA-M-820-{1,2,3}\DWA-M_820-{1,2,3}.pdf (scoop pdftotext -layout -enc UTF-8) and string-checked
--   against its PDF page by the generator; hints give the PRINTED page (= PDF page − 2, checked on the page footers).
--
-- WHAT CHANGES (plain English):
--   Severity block → warn (12, 820-2): REQ-17, REQ-18, REQ-19, REQ-37, REQ-39, REQ-41, REQ-47, REQ-51, REQ-52-2 (indicative target
--     sentences, 51_ A) · REQ-20 (the register it reads is printed „werden durchgeführt“) · REQ-31 („in der Regel“) · REQ-33 (planning
--     sheet → § 5.3.10 „Je nach Projekt“; the „erforderlich“ of § 5.6.5 belongs to the execution phase).
--   Severity warn → block (2): 820-1 REQ-05 (Anh. A „muss … um eine Spalte … ergänzt werden“) · 820-2 REQ-55 (§ 7.3.4 „müssen“, behind
--     its driver). Fix round 1 (51_ re-ruling): 820-2 REQ-57 and 820-3 REQ-27 STAY WARN (conditional duties) — hint text only.
--   Three new REQUIRED yes/no DRIVER fields on 820-2, section B (required where shown; fix round 1), with guards on the gates they switch (block stays block):
--     820-2-17 `nebenangebote_zugelassen` (shown only when bauleistungen_vergeben = yes) → REQ-38
--       `IF nebenangebote_zugelassen == true THEN (IF bauleistungen_vergeben == true THEN (nebenangebote_conditions == true))`
--     820-2-04 `eigene_regelwerke_vorhanden` (consumed by 820-2-25) → REQ-53 (-04) and REQ-54 (-25)
--     820-2-26 `innovation_verlangt` → REQ-55 (warn → block) and REQ-56
--     „No“ → the gate does not apply; unanswered → the block gate waits (refuses approval, names the question).
--   820-1 REQ-14 (block, empty condition) gets a condition: VgV-F guard of REQ-10 (§ 8.10.3.3 stands in § 8.10 „VgV-F-Verfahren“) and
--     `award_criteria_list IS NOT EMPTY AND award_weight_sum_pct > 0`; the guard symbols get M820-14 as consumer.
--   820-1 NEW warn gate REQ-23-2 on M820-24 (§ 8.3 „zwar nicht dazu verpflichtet, sollte es aber …“): guard of REQ-10 with
--     `procurement_procedure IN {suchverfahren, direktvergabe}` (the two procedures § 8.3 names) → vergabevermerk_complete == true.
--   820-2 REQ-51 re-bound from the single date pair to the warranty calendar: `IF verantwortung_lph9 != 'entfaellt' THEN
--     (warranty_count >= 1)` — warranty_count = count_rows(gewaehrleistungen) counts COMPLETE rows only (Auftragnehmer, Abnahme,
--     Beginn, Ende are required columns), so every counted row has start and end dates. Gates have no register scope (count_rows in a
--     gate condition would read as an unknown symbol), hence the existing D1 output.
--   Hints rewritten for every touched gate (bilingual `<de>\n[EN] <en>`, modal verb + printed page); field hints of warranty_count,
--     gewaehrleistungen, award_weight_sum_pct (now read by gates); 820-1 REQ-23 hint names the twin.
--   44_ E 2-3: projektsteuerung_scope option „Risikomanagement“ labelled „(Werkzeug-Option, in § 4.1 nicht genannt)“ (token unchanged).
--   50_ PS-1: 820-2-01 section B gets distinct order_index values in today's live display order, with project_size_begruendung moved
--     directly under project_size (order only; the ties at 0 were resolved by the index scan, prod-query 2026-10-07).
--   NOT changed (51_): 44_ 1-5 M820-13-D1 — Anh. E.1.4.1 (PDF S. 63) prints two bases („nicht mehr als das Zweifache des geschätzten
--     Auftragswerts“ and „Verhältnis Jahresumsatz zu Jahresauftragswert den Faktor 1,5“), no single formula → left, noted in 52_.
--     warranty_start_date / warranty_end_date stay as they are (required while LPH 9 takes place; no gate reads them any more).
--
-- Guards: every UPDATE matches the LIVE pre-state (gates: md5 of condition + description, severity, clause; fields: md5 of description,
-- the live jsonb / array / order_index + section) — taken with prod-query 2026-10-07 after 20261007100000 was applied. Inserts are
-- NOT EXISTS + ledger. Idempotent (a re-run changes nothing). In-transaction archives (compliance_requirements_archive_m820_d48,
-- fields_archive_m820_d48) + ledgers (m820_d48_written: md5 of every row as written; m820_d48_added: inserted rows). Rollback:
-- scripts/rollback-20261007110000-m820-decisions-48-50.sql (byte-equal; a row edited after the apply is left alone). Read-back:
-- scripts/verification/apply/readback-20261007110000-m820-decisions-48-50.sql. Nothing is (de)activated; inactive rows are never matched.
-- Order: AFTER 20261006240000 (guideline criteria) and 20261007100000 (size declaration), both live.
-- STAGED — not applied.
BEGIN;

CREATE TABLE IF NOT EXISTS compliance_requirements_archive_m820_d48 AS SELECT * FROM compliance_requirements WHERE false;
CREATE TABLE IF NOT EXISTS fields_archive_m820_d48 AS SELECT * FROM fields WHERE false;
CREATE TABLE IF NOT EXISTS m820_d48_written (tbl text NOT NULL, id uuid NOT NULL, md5 text NOT NULL, PRIMARY KEY (tbl, id));
CREATE TABLE IF NOT EXISTS m820_d48_added (tbl text NOT NULL, id uuid NOT NULL, md5 text NOT NULL, PRIMARY KEY (tbl, id));

-- ── 1. new driver fields (first, so the guarded conditions below never name a missing symbol) ──
-- DWA-M-820-2 820-2-17 nebenangebote_zugelassen: NEW optional boolean driver (section B)
WITH ins AS (
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, description, verification_status, verification_quote, source_anchor, widget, ui_config, lookup, visible_when, enum_values, consumer_worksheets, order_index, active)
  SELECT w.id, sec.id, $m$nebenangebote_zugelassen$m$, $m$Nebenangebote zugelassen$m$, $m$Alternative bids admitted$m$, 'boolean', NULL, true, $m$§5.5.1$m$,
         $m$Ja/Nein: lässt der Auftraggeber bei der Vergabe der Bauleistungen Nebenangebote zu? § 5.5.1 (S. 48): „Bei zugelassenen Nebenangeboten sind, wie es in der VOB/A gefordert ist, Mindestanforderungen an die Leistung zu formulieren.“ Ja: REQ-38 sperrt die Freigabe, bis nebenangebote_conditions bestätigt ist. Nein: REQ-38 gilt nicht. Pflichtfrage (wo sichtbar); ohne Antwort wartet REQ-38 (sperrt). Das Merkblatt empfiehlt: „Auf Nebenangebote sollte nicht generell verzichtet werden.“ Nur sichtbar, wenn bauleistungen_vergeben = ja.
[EN] Yes/No: does the client admit alternative bids when awarding the construction works? § 5.5.1 (p. 48): "where alternative bids are admitted, minimum requirements for the performance are to be formulated, as the VOB/A demands." Yes: REQ-38 blocks approval until nebenangebote_conditions is confirmed. No: REQ-38 does not apply. Required question (where shown); unanswered, REQ-38 waits (blocks). The Merkblatt recommends: "alternative bids should not be excluded in general." Only shown when bauleistungen_vergeben = yes.$m$,
         'imported_unverified', $m$Bei zugelassenen Nebenangeboten sind, wie es in der VOB/A gefordert ist, Mindestanforderungen an die Leistung zu formulieren.$m$, $m$DWA-M 820-2 §5.5.1 (PDF S. 50)$m$, NULL, NULL, NULL, $m$bauleistungen_vergeben == true$m$, NULL, NULL,
         (SELECT COALESCE(MAX(f3.order_index), -1) + 1 FROM fields f3 WHERE f3.worksheet_template_id = w.id AND f3.section_id = sec.id), true
    FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id JOIN worksheet_sections sec ON sec.worksheet_template_id = w.id AND sec.code = 'B'
   WHERE s.code = 'DWA-M-820-2' AND w.code = '820-2-17'
     AND NOT EXISTS (SELECT 1 FROM fields f2 WHERE f2.worksheet_template_id = w.id AND f2.symbol = $m$nebenangebote_zugelassen$m$)
  RETURNING *
)
INSERT INTO m820_d48_added (tbl, id, md5) SELECT 'fields', ins.id, md5(row_to_json(ins)::text) FROM ins ON CONFLICT DO NOTHING;
-- DWA-M-820-2 820-2-04 eigene_regelwerke_vorhanden: NEW optional boolean driver (section B)
WITH ins AS (
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, description, verification_status, verification_quote, source_anchor, widget, ui_config, lookup, visible_when, enum_values, consumer_worksheets, order_index, active)
  SELECT w.id, sec.id, $m$eigene_regelwerke_vorhanden$m$, $m$Auftraggeber hat eigene Richtlinien / Regelwerke$m$, $m$Client has its own guidelines / rules$m$, 'boolean', NULL, true, $m$§6.1, §6.3.1$m$,
         $m$Ja/Nein: verwendet der Auftraggeber eigene Richtlinien und Regelwerke (technisch oder organisatorisch, z. B. technische Standards, Kennzeichnungssystem AKZ, Betriebssatzung, Projekt- und Organisationshandbuch)? Abschnitt 6 betrifft die „Richtlinien und Regelwerke des Auftraggebers (Bauherr und Betreiber)“. § 6.1 (S. 63): „Vom Auftraggeber verwendete Richtlinien und Regelwerke müssen Anforderungen erfüllen im Hinblick auf ▪ Aktualität, ▪ Widerspruchsfreiheit und Übereinstimmung mit Normen, ▪ Handhabbarkeit.“ § 6.3.1 (S. 65): „Hier muss ein Prozess eingerichtet sein, der den Umgang mit Abweichungen bis hin zur Entscheidung und Freigabe seitens des Auftraggebers (Bauherr und Betrieb) regelt.“ Ja: REQ-53 (dieses Blatt) und REQ-54 (820-2-25) sperren die Freigabe, bis Aktualitätsprüfung bzw. Freigabeprozess bestätigt sind. Nein: beide gelten nicht. Pflichtfrage; ohne Antwort warten beide (sperren).
[EN] Yes/No: does the client use its own guidelines and rules (technical or organisational, e.g. technical standards, AKZ labelling system, operating statutes, project and organisation handbook)? Section 6 concerns the "guidelines and rules of the client (owner and operator)". § 6.1 (p. 63): "guidelines and rules used by the client must meet requirements regarding ▪ currency, ▪ freedom from contradiction and conformity with standards, ▪ manageability." § 6.3.1 (p. 65): "a process must be in place here that governs the handling of deviations up to the decision and release by the client (owner and operator)." Yes: REQ-53 (this sheet) and REQ-54 (820-2-25) block approval until the currency check or the release process is confirmed. No: neither applies. Required question; unanswered, both wait (block).$m$,
         'imported_unverified', $m$Vom Auftraggeber verwendete Richtlinien und Regelwerke müssen Anforderungen erfüllen im Hinblick auf$m$, $m$DWA-M 820-2 §6.1 (PDF S. 65)$m$, NULL, NULL, NULL, NULL, NULL, ARRAY['820-2-25']::text[],
         (SELECT COALESCE(MAX(f3.order_index), -1) + 1 FROM fields f3 WHERE f3.worksheet_template_id = w.id AND f3.section_id = sec.id), true
    FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id JOIN worksheet_sections sec ON sec.worksheet_template_id = w.id AND sec.code = 'B'
   WHERE s.code = 'DWA-M-820-2' AND w.code = '820-2-04'
     AND NOT EXISTS (SELECT 1 FROM fields f2 WHERE f2.worksheet_template_id = w.id AND f2.symbol = $m$eigene_regelwerke_vorhanden$m$)
  RETURNING *
)
INSERT INTO m820_d48_added (tbl, id, md5) SELECT 'fields', ins.id, md5(row_to_json(ins)::text) FROM ins ON CONFLICT DO NOTHING;
-- DWA-M-820-2 820-2-26 innovation_verlangt: NEW optional boolean driver (section B)
WITH ins AS (
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, description, verification_status, verification_quote, source_anchor, widget, ui_config, lookup, visible_when, enum_values, consumer_worksheets, order_index, active)
  SELECT w.id, sec.id, $m$innovation_verlangt$m$, $m$Innovationen verlangt$m$, $m$Innovation required$m$, 'boolean', NULL, true, $m$§7.2, §7.3.4$m$,
         $m$Ja/Nein: verlangt der Auftraggeber in diesem Projekt Innovationen von Planungsschaffenden bzw. Firmen (neuartige Lösungen, z. B. über die anerkannten Regeln der Technik hinaus)? § 7.3.4 (S. 70): „Werden Innovationen von Planungsschaffenden bzw. Firmen verlangt, müssen Risiken im Rahmen einer systematischen Risikoanalyse erfasst und die Risikoverteilung vertraglich festgelegt werden.“ § 7.2 (S. 68): „Bei Innovationen muss immer über Rechte an Patenten, Gebrauchsmustern und Erfindungen sowie über Verschwiegenheitserklärungen gesprochen werden.“ Ja: REQ-55 und REQ-56 sperren die Freigabe, bis liability_clarified bzw. ip_rights_defined bestätigt sind. Nein: beide gelten nicht. Pflichtfrage; ohne Antwort warten beide (sperren).
[EN] Yes/No: does the client require innovation from planners or firms in this project (novel solutions, e.g. beyond the accepted rules of technology)? § 7.3.4 (p. 70): "if innovations are required from planners or firms, risks must be captured in a systematic risk analysis and the risk allocation must be fixed by contract." § 7.2 (p. 68): "with innovations, rights to patents, utility models and inventions as well as confidentiality agreements must always be discussed." Yes: REQ-55 and REQ-56 block approval until liability_clarified or ip_rights_defined is confirmed. No: neither applies. Required question; unanswered, both wait (block).$m$,
         'imported_unverified', $m$Werden Innovationen von Planungsschaffenden bzw. Firmen verlangt, müssen Risiken im Rahmen einer systematischen Risikoanalyse erfasst und die Risikoverteilung vertraglich festgelegt werden.$m$, $m$DWA-M 820-2 §7.3.4 (PDF S. 72)$m$, NULL, NULL, NULL, NULL, NULL, NULL,
         (SELECT COALESCE(MAX(f3.order_index), -1) + 1 FROM fields f3 WHERE f3.worksheet_template_id = w.id AND f3.section_id = sec.id), true
    FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id JOIN worksheet_sections sec ON sec.worksheet_template_id = w.id AND sec.code = 'B'
   WHERE s.code = 'DWA-M-820-2' AND w.code = '820-2-26'
     AND NOT EXISTS (SELECT 1 FROM fields f2 WHERE f2.worksheet_template_id = w.id AND f2.symbol = $m$innovation_verlangt$m$)
  RETURNING *
)
INSERT INTO m820_d48_added (tbl, id, md5) SELECT 'fields', ins.id, md5(row_to_json(ins)::text) FROM ins ON CONFLICT DO NOTHING;

-- ── 2. gates (severity / condition / clause / hint) ──
-- DWA-M-820-1 M820-07 REQ-05: severity, description (warn → block (51_ B: Anh. A „muss … ergänzt werden“))
INSERT INTO compliance_requirements_archive_m820_d48 SELECT cr.* FROM compliance_requirements cr, worksheet_templates w, standards s
 WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-1' AND w.code = 'M820-07' AND cr.code = 'REQ-05'
   AND md5(cr.condition) = '6dd012ea1d023fd20fc913b50b417c6c' AND cr.severity = 'warn' AND md5(coalesce(cr.description, '')) = '5cb1c4411c86e60a87d33e82dba8bfc1'
   AND cr.clause_reference IS NOT DISTINCT FROM $m$§4.7, Anh. A$m$
   AND NOT EXISTS (SELECT 1 FROM compliance_requirements_archive_m820_d48 a WHERE a.id = cr.id);
UPDATE compliance_requirements cr
   SET severity = $m$block$m$,
       description = $m$Sperrt die Freigabe, bis das Risikoregister (M820-06) und der Maßnahmenplan auf diesem Blatt beide vorliegen. § 4.7 (S. 22): „Die Risikoanalyse ist über alle Projektphasen fortzuschreiben.“ Anhang A (S. 43): „Die Risikoanalyse muss in der Praxis um eine Spalte „Präventions- und Korrekturmaßnahmen“ ergänzt werden, in der die projektspezifischen Maßnahmenpläne festgehalten werden (siehe Tabelle A.2).“ Dazu den Maßnahmenplan nach Tabelle A.2 auf diesem Blatt anlegen.
[EN] Blocks approval until the risk register (M820-06) and the measure plan on this sheet are both present. § 4.7 (p. 22): "the risk analysis is to be updated over all project phases." Annex A (p. 43): "in practice the risk analysis must be extended by a column 'prevention and corrective measures', in which the project-specific measure plans are recorded (see Table A.2)." Create the measure plan per Table A.2 on this sheet to pass.$m$
  FROM worksheet_templates w, standards s
 WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-1' AND w.code = 'M820-07' AND cr.code = 'REQ-05'
   AND md5(cr.condition) = '6dd012ea1d023fd20fc913b50b417c6c' AND cr.severity = 'warn' AND md5(coalesce(cr.description, '')) = '5cb1c4411c86e60a87d33e82dba8bfc1'
   AND cr.clause_reference IS NOT DISTINCT FROM $m$§4.7, Anh. A$m$;
-- DWA-M-820-1 M820-14 REQ-14: condition, description (empty condition → award criteria + weighting entered (51_ C-4), VgV-F guard (§ 8.10.3.3 sits in § 8.10 VgV-F-Verfahren))
INSERT INTO compliance_requirements_archive_m820_d48 SELECT cr.* FROM compliance_requirements cr, worksheet_templates w, standards s
 WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-1' AND w.code = 'M820-14' AND cr.code = 'REQ-14'
   AND md5(cr.condition) = 'd41d8cd98f00b204e9800998ecf8427e' AND cr.severity = 'block' AND md5(coalesce(cr.description, '')) = '8a7fb4c4f16c721e882050f9085c570a'
   AND cr.clause_reference IS NOT DISTINCT FROM $m$§8.10.3.3, Anh. E.2$m$
   AND NOT EXISTS (SELECT 1 FROM compliance_requirements_archive_m820_d48 a WHERE a.id = cr.id);
UPDATE compliance_requirements cr
   SET condition = $m$IF (client_organization_type != 'privat_ohne_foerderung' OR vergaberecht_freiwillig_angewendet == true) AND procurement_procedure == 'vgv_f' THEN (award_criteria_list IS NOT EMPTY AND award_weight_sum_pct > 0)$m$,
       description = $m$Gilt beim VgV-F-Verfahren (procurement_procedure auf M820-10), wenn der Auftraggeber an das Vergaberecht gebunden ist (kein privater Auftraggeber ohne Fördermittel, oder vergaberecht_freiwillig_angewendet = ja; beides auf M820-01). Bei Suchverfahren, Direktvergabe oder Planungswettbewerb prüft sie nicht. Dann sperrt sie die Freigabe, bis das Register der Zuschlagskriterien (award_criteria_list, dieses Blatt) mindestens eine vollständige Zeile mit Gewichtung hat (award_weight_sum_pct > 0). § 8.10.3.3 (S. 40): „Der Auftraggeber ist verpflichtet, spätestens bei der Aufforderung zur Angebotsabgabe, besser bereits bei der Bekanntmachung, die Zuschlagskriterien und deren Gewichtung anzugeben (§ 127 GWB).“ Zuschlagskriterien nach Anhang E.2 eintragen (Schlüsselpersonal, Bauüberwachung, Organisation usw.), je Zeile mit Gewichtung.
[EN] Applies in a VgV-F procedure (procurement_procedure on M820-10) when the client is bound by procurement law (not a private client without public funding, or vergaberecht_freiwillig_angewendet = yes; both on M820-01). It does not check in a search procedure, direct award or design competition. It then blocks approval until the award-criteria register (award_criteria_list, this sheet) has at least one complete row with a weighting (award_weight_sum_pct > 0). § 8.10.3.3 (p. 40): "the client is obliged to state the award criteria and their weighting at the latest when inviting tenders, better already in the publication notice (§ 127 GWB)." Enter the award criteria per Annex E.2 (key personnel, site supervision, organisation etc.), each row with its weighting.$m$
  FROM worksheet_templates w, standards s
 WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-1' AND w.code = 'M820-14' AND cr.code = 'REQ-14'
   AND md5(cr.condition) = 'd41d8cd98f00b204e9800998ecf8427e' AND cr.severity = 'block' AND md5(coalesce(cr.description, '')) = '8a7fb4c4f16c721e882050f9085c570a'
   AND cr.clause_reference IS NOT DISTINCT FROM $m$§8.10.3.3, Anh. E.2$m$;
-- DWA-M-820-1 M820-24 REQ-23: description (hint only: names the new warn twin REQ-23-2)
INSERT INTO compliance_requirements_archive_m820_d48 SELECT cr.* FROM compliance_requirements cr, worksheet_templates w, standards s
 WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-1' AND w.code = 'M820-24' AND cr.code = 'REQ-23'
   AND md5(cr.condition) = '98e4d58354316a03634adc099ca3958b' AND cr.severity = 'block' AND md5(coalesce(cr.description, '')) = '6b17bd8ada43be4479d0e7443fa4777e'
   AND cr.clause_reference IS NOT DISTINCT FROM $m$§8 VgV, §8.3, Anh. F$m$
   AND NOT EXISTS (SELECT 1 FROM compliance_requirements_archive_m820_d48 a WHERE a.id = cr.id);
UPDATE compliance_requirements cr
   SET description = $m$Gilt beim VgV-F-Verfahren (procurement_procedure auf M820-10), wenn der Auftraggeber an das Vergaberecht gebunden ist (kein privater Auftraggeber ohne Fördermittel, oder vergaberecht_freiwillig_angewendet = ja; beides auf M820-01). Bei Suchverfahren, Direktvergabe oder Planungswettbewerb prüft sie nicht. Zum Bestehen muss vergabevermerk_complete dann bestätigt sein. § 8.3 (S. 32): „Als Abschluss des Vergabeverfahrens ist ein Vergabevermerk anzufertigen (§ 8 VgV).“ Bei Direktvergabe oder Suchverfahren ist der Auftraggeber „zwar nicht dazu verpflichtet“, sollte ihn aber fertigen – das prüft die Warnung REQ-23-2. Anhang F schlägt eine Gliederung vor.
[EN] Applies in a VgV-F procedure (procurement_procedure on M820-10) when the client is bound by procurement law (not a private client without public funding, or vergaberecht_freiwillig_angewendet = yes; both on M820-01). It does not check in a search procedure, direct award or design competition. To pass, vergabevermerk_complete must then be confirmed. § 8.3 (p. 32): "a procurement memo is to be prepared to close the procedure (§ 8 VgV)." For a direct award or search procedure the client is not obliged, but should prepare one – the warning REQ-23-2 checks that. Annex F proposes a structure.$m$
  FROM worksheet_templates w, standards s
 WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-1' AND w.code = 'M820-24' AND cr.code = 'REQ-23'
   AND md5(cr.condition) = '98e4d58354316a03634adc099ca3958b' AND cr.severity = 'block' AND md5(coalesce(cr.description, '')) = '6b17bd8ada43be4479d0e7443fa4777e'
   AND cr.clause_reference IS NOT DISTINCT FROM $m$§8 VgV, §8.3, Anh. F$m$;
-- DWA-M-820-2 820-2-09 REQ-17: severity, description (block → warn (51_ A))
INSERT INTO compliance_requirements_archive_m820_d48 SELECT cr.* FROM compliance_requirements cr, worksheet_templates w, standards s
 WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-09' AND cr.code = 'REQ-17'
   AND md5(cr.condition) = 'cb3b7e90c891c4ccc4a3cd2b5fba88b3' AND cr.severity = 'block' AND md5(coalesce(cr.description, '')) = '248981869b0172f40663aa0adfb94cec'
   AND cr.clause_reference IS NOT DISTINCT FROM $m$§4.6.2$m$
   AND NOT EXISTS (SELECT 1 FROM compliance_requirements_archive_m820_d48 a WHERE a.id = cr.id);
UPDATE compliance_requirements cr
   SET severity = $m$warn$m$,
       description = $m$Warnt (sperrt die Freigabe nicht), solange approval_procedure_defined (dieses Blatt) nicht bestätigt ist. § 4.6.2 (S. 33): „Nach jeder abgeschlossenen Leistungsphase erfolgt eine Freigabe der Planungsleistungen. Passend zum Projektablauf und zur Projektlaufzeit wird auch die Abnahme der Planungsleistungen geregelt.“ Gedruckt ist ein Zielbild im Indikativ ohne Modalverb (zweites Element des Qualitätsbausteins, Einleitung S. 11: „Darauf folgt das zweite Element, das sich mit der Zielsetzung und dem Optimierungspotenzial beschäftigt.“) – deshalb Warnung.
[EN] Warns (does not block approval) while approval_procedure_defined (this sheet) is not confirmed. § 4.6.2 (p. 33): "after each completed service phase the planning work is released; acceptance of the planning work is also regulated to fit the project sequence and duration." What is printed is a target state in the indicative, without a modal verb (second element of the quality module, introduction p. 11: "then follows the second element, dealing with the objective and the optimisation potential") – hence a warning.$m$
  FROM worksheet_templates w, standards s
 WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-09' AND cr.code = 'REQ-17'
   AND md5(cr.condition) = 'cb3b7e90c891c4ccc4a3cd2b5fba88b3' AND cr.severity = 'block' AND md5(coalesce(cr.description, '')) = '248981869b0172f40663aa0adfb94cec'
   AND cr.clause_reference IS NOT DISTINCT FROM $m$§4.6.2$m$;
-- DWA-M-820-2 820-2-09 REQ-18: severity, description (block → warn (51_ A))
INSERT INTO compliance_requirements_archive_m820_d48 SELECT cr.* FROM compliance_requirements cr, worksheet_templates w, standards s
 WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-09' AND cr.code = 'REQ-18'
   AND md5(cr.condition) = 'c8bce2aa4a33660f8d1210a06499f020' AND cr.severity = 'block' AND md5(coalesce(cr.description, '')) = 'd972cc4b796f4e9260bd3b917a0129ed'
   AND cr.clause_reference IS NOT DISTINCT FROM $m$§4.7.1$m$
   AND NOT EXISTS (SELECT 1 FROM compliance_requirements_archive_m820_d48 a WHERE a.id = cr.id);
UPDATE compliance_requirements cr
   SET severity = $m$warn$m$,
       description = $m$Warnt (sperrt die Freigabe nicht), solange quality_monitoring_active (dieses Blatt) nicht bestätigt ist. § 4.7.1 (S. 34): „Eine phasenbezogene Prüfung der Qualität der Ingenieurleistungen wird in einem Qualitätssicherungsplan festgelegt, der neben der Eigenüberwachung auch die Fremdüberwachung festlegt.“ Gedruckt ist ein Zielbild im Indikativ ohne Modalverb (zweites Element des Qualitätsbausteins, Einleitung S. 11: „Darauf folgt das zweite Element, das sich mit der Zielsetzung und dem Optimierungspotenzial beschäftigt.“) – deshalb Warnung.
[EN] Warns (does not block approval) while quality_monitoring_active (this sheet) is not confirmed. § 4.7.1 (p. 34): "a phase-related check of the quality of the engineering services is laid down in a quality-assurance plan that sets out third-party monitoring besides self-monitoring." What is printed is a target state in the indicative, without a modal verb (second element of the quality module, introduction p. 11: "then follows the second element, dealing with the objective and the optimisation potential") – hence a warning.$m$
  FROM worksheet_templates w, standards s
 WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-09' AND cr.code = 'REQ-18'
   AND md5(cr.condition) = 'c8bce2aa4a33660f8d1210a06499f020' AND cr.severity = 'block' AND md5(coalesce(cr.description, '')) = 'd972cc4b796f4e9260bd3b917a0129ed'
   AND cr.clause_reference IS NOT DISTINCT FROM $m$§4.7.1$m$;
-- DWA-M-820-2 820-2-09 REQ-19: severity, description (block → warn (51_ A))
INSERT INTO compliance_requirements_archive_m820_d48 SELECT cr.* FROM compliance_requirements cr, worksheet_templates w, standards s
 WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-09' AND cr.code = 'REQ-19'
   AND md5(cr.condition) = '5c0d8aae59b9636817621faabeba73fb' AND cr.severity = 'block' AND md5(coalesce(cr.description, '')) = 'e849128b8325f313bd95d3314e3c6af7'
   AND cr.clause_reference IS NOT DISTINCT FROM $m$§4.7.2$m$
   AND NOT EXISTS (SELECT 1 FROM compliance_requirements_archive_m820_d48 a WHERE a.id = cr.id);
UPDATE compliance_requirements cr
   SET severity = $m$warn$m$,
       description = $m$Warnt (sperrt die Freigabe nicht), solange qs_plan_lph8_present (dieses Blatt) nicht bestätigt ist – nur solange LPH 8 stattfindet (820-2-01: verantwortung_lph8 ≠ entfällt). § 4.7.2 (S. 34): „Ein fundierter Qualitätssicherungsplan mit entsprechenden Arbeitsaufträgen und Dokumentationsfunktionen wird gemeinsam erstellt und aktiv umgesetzt.“ Gedruckt ist ein Zielbild im Indikativ ohne Modalverb (zweites Element des Qualitätsbausteins, Einleitung S. 11: „Darauf folgt das zweite Element, das sich mit der Zielsetzung und dem Optimierungspotenzial beschäftigt.“) – deshalb Warnung.
[EN] Warns (does not block approval) while qs_plan_lph8_present (this sheet) is not confirmed – only while LPH 8 takes place (820-2-01: verantwortung_lph8 ≠ does not occur). § 4.7.2 (p. 34): "a sound quality-assurance plan with corresponding work orders and documentation functions is jointly drawn up and actively implemented." What is printed is a target state in the indicative, without a modal verb (second element of the quality module, introduction p. 11: "then follows the second element, dealing with the objective and the optimisation potential") – hence a warning.$m$
  FROM worksheet_templates w, standards s
 WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-09' AND cr.code = 'REQ-19'
   AND md5(cr.condition) = '5c0d8aae59b9636817621faabeba73fb' AND cr.severity = 'block' AND md5(coalesce(cr.description, '')) = 'e849128b8325f313bd95d3314e3c6af7'
   AND cr.clause_reference IS NOT DISTINCT FROM $m$§4.7.2$m$;
-- DWA-M-820-2 820-2-10 REQ-20: severity, description (block → warn (51_ B: the read register is printed in the indicative))
INSERT INTO compliance_requirements_archive_m820_d48 SELECT cr.* FROM compliance_requirements cr, worksheet_templates w, standards s
 WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-10' AND cr.code = 'REQ-20'
   AND md5(cr.condition) = '6500b0fecae273701c335e0d640f95e4' AND cr.severity = 'block' AND md5(coalesce(cr.description, '')) = '2e114da67021f34639750396b67c28da'
   AND cr.clause_reference IS NOT DISTINCT FROM $m$§4.8.2$m$
   AND NOT EXISTS (SELECT 1 FROM compliance_requirements_archive_m820_d48 a WHERE a.id = cr.id);
UPDATE compliance_requirements cr
   SET severity = $m$warn$m$,
       description = $m$Warnt (sperrt die Freigabe nicht), solange risk_register_present (dieses Blatt) nicht bestätigt ist. Die Prüfung liest das Risikoregister; dazu druckt § 4.8.2 (S. 35) den Indikativ: „Fundierte Risikoanalysen (Hinweise gibt Merkblatt DWA-M 820-1:2020 in Anhang A) für die verschiedenen Risikogruppen werden durchgeführt.“ Das „muss“ desselben Abschnitts betrifft das Know-how des Auftraggebers („grundsätzliches Know-how muss beim Auftraggeber unbedingt vorhanden sein“), das diese Prüfung nicht liest – deshalb Warnung.
[EN] Warns (does not block approval) while risk_register_present (this sheet) is not confirmed. The check reads the risk register; for that § 4.8.2 (p. 35) prints the indicative: "sound risk analyses (guidance in DWA-M 820-1:2020 Annex A) are carried out for the various risk groups." The "muss" of the same section concerns the client's know-how ("basic know-how must be present on the client side"), which this check does not read – hence a warning.$m$
  FROM worksheet_templates w, standards s
 WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-10' AND cr.code = 'REQ-20'
   AND md5(cr.condition) = '6500b0fecae273701c335e0d640f95e4' AND cr.severity = 'block' AND md5(coalesce(cr.description, '')) = '2e114da67021f34639750396b67c28da'
   AND cr.clause_reference IS NOT DISTINCT FROM $m$§4.8.2$m$;
-- DWA-M-820-2 820-2-13 REQ-31: severity, description (block → warn (51_ B: „in der Regel“))
INSERT INTO compliance_requirements_archive_m820_d48 SELECT cr.* FROM compliance_requirements cr, worksheet_templates w, standards s
 WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-13' AND cr.code = 'REQ-31'
   AND md5(cr.condition) = '2f413fe89c123b5f5b0ee0144069284b' AND cr.severity = 'block' AND md5(coalesce(cr.description, '')) = '1945ef7adf6b537ea56667df6d821412'
   AND cr.clause_reference IS NOT DISTINCT FROM $m$§5.3.8$m$
   AND NOT EXISTS (SELECT 1 FROM compliance_requirements_archive_m820_d48 a WHERE a.id = cr.id);
UPDATE compliance_requirements cr
   SET severity = $m$warn$m$,
       description = $m$Warnt (sperrt die Freigabe nicht), solange lot_strategy_documented (dieses Blatt) nicht bestätigt ist. § 5.3.8 (S. 43): „Gewerke und Lose bei Planungs- und Bauleistungen dürfen in der Regel nur aus technischen Gründen zusammengefasst werden.“ „in der Regel“ lässt Ausnahmen zu; Ziel: „Die für den Projekterfolg erforderliche Aufteilung von Losen und Gewerken wird nach technischen Erfordernissen intensiv durchdacht und transparent begründet.“ – deshalb Warnung.
[EN] Warns (does not block approval) while lot_strategy_documented (this sheet) is not confirmed. § 5.3.8 (p. 43): "trades and lots in planning and construction services may as a rule only be combined for technical reasons." "As a rule" admits exceptions; target: "the division into lots and trades needed for project success is thought through intensively by technical need and transparently justified" – hence a warning.$m$
  FROM worksheet_templates w, standards s
 WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-13' AND cr.code = 'REQ-31'
   AND md5(cr.condition) = '2f413fe89c123b5f5b0ee0144069284b' AND cr.severity = 'block' AND md5(coalesce(cr.description, '')) = '1945ef7adf6b537ea56667df6d821412'
   AND cr.clause_reference IS NOT DISTINCT FROM $m$§5.3.8$m$;
-- DWA-M-820-2 820-2-14 REQ-33: severity, description (block → warn (51_ B: planning sheet → § 5.3.10 „Je nach Projekt“))
INSERT INTO compliance_requirements_archive_m820_d48 SELECT cr.* FROM compliance_requirements cr, worksheet_templates w, standards s
 WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-14' AND cr.code = 'REQ-33'
   AND md5(cr.condition) = '1a6cebeedb45f20dde0a7b7a4a12e426' AND cr.severity = 'block' AND md5(coalesce(cr.description, '')) = 'e8d2e8ea9977fe0e6661886969990b8d'
   AND cr.clause_reference IS NOT DISTINCT FROM $m$§5.3.10, §5.6.5$m$
   AND NOT EXISTS (SELECT 1 FROM compliance_requirements_archive_m820_d48 a WHERE a.id = cr.id);
UPDATE compliance_requirements cr
   SET severity = $m$warn$m$,
       description = $m$Warnt (sperrt die Freigabe nicht), solange public_relations_strategy (dieses Blatt) nicht bestätigt ist. Dieses Blatt gehört zur Phase „Planung“; § 5.3.10 (S. 44): „Je nach Projekt ist die Beteiligung der Öffentlichkeit frühzeitig erfolgt.“ – Zielbild, „je nach Projekt“ → Warnung. Das „erforderlich“ in § 5.6.5 (Phase „Ausführung“, S. 54) – „ist es erforderlich, ein Konzept für eine Öffentlichkeitsbeteiligung zu erarbeiten“ – gehört zur Ausführungsphase, nicht zu diesem Planungsblatt.
[EN] Warns (does not block approval) while public_relations_strategy (this sheet) is not confirmed. This sheet belongs to the "planning" phase; § 5.3.10 (p. 44): "depending on the project, the public has been involved early" – a target state, "depending on the project" → warning. The "erforderlich" in § 5.6.5 (phase "execution", p. 54) – "it is required to develop a concept for public participation" – belongs to the execution phase, not to this planning sheet.$m$
  FROM worksheet_templates w, standards s
 WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-14' AND cr.code = 'REQ-33'
   AND md5(cr.condition) = '1a6cebeedb45f20dde0a7b7a4a12e426' AND cr.severity = 'block' AND md5(coalesce(cr.description, '')) = 'e8d2e8ea9977fe0e6661886969990b8d'
   AND cr.clause_reference IS NOT DISTINCT FROM $m$§5.3.10, §5.6.5$m$;
-- DWA-M-820-2 820-2-16 REQ-37: severity, description (block → warn (51_ A))
INSERT INTO compliance_requirements_archive_m820_d48 SELECT cr.* FROM compliance_requirements cr, worksheet_templates w, standards s
 WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-16' AND cr.code = 'REQ-37'
   AND md5(cr.condition) = 'c76cfd2bb7fb44264127def74b1a2c2c' AND cr.severity = 'block' AND md5(coalesce(cr.description, '')) = '93a64afc3e2568689b1921141a62334b'
   AND cr.clause_reference IS NOT DISTINCT FROM $m$§5.4.5$m$
   AND NOT EXISTS (SELECT 1 FROM compliance_requirements_archive_m820_d48 a WHERE a.id = cr.id);
UPDATE compliance_requirements cr
   SET severity = $m$warn$m$,
       description = $m$Warnt (sperrt die Freigabe nicht), solange permit_conditions_tracked (dieses Blatt) nicht bestätigt ist. § 5.4.5 (S. 47): „Die von den Behörden erteilten Auflagen werden vollständig und sorgfältig beachtet.“ Gedruckt ist ein Zielbild im Indikativ ohne Modalverb (zweites Element des Qualitätsbausteins, Einleitung S. 11: „Darauf folgt das zweite Element, das sich mit der Zielsetzung und dem Optimierungspotenzial beschäftigt.“) – deshalb Warnung.
[EN] Warns (does not block approval) while permit_conditions_tracked (this sheet) is not confirmed. § 5.4.5 (p. 47): "the conditions imposed by the authorities are observed fully and carefully." What is printed is a target state in the indicative, without a modal verb (second element of the quality module, introduction p. 11: "then follows the second element, dealing with the objective and the optimisation potential") – hence a warning.$m$
  FROM worksheet_templates w, standards s
 WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-16' AND cr.code = 'REQ-37'
   AND md5(cr.condition) = 'c76cfd2bb7fb44264127def74b1a2c2c' AND cr.severity = 'block' AND md5(coalesce(cr.description, '')) = '93a64afc3e2568689b1921141a62334b'
   AND cr.clause_reference IS NOT DISTINCT FROM $m$§5.4.5$m$;
-- DWA-M-820-2 820-2-17 REQ-39: severity, description (block → warn (51_ A))
INSERT INTO compliance_requirements_archive_m820_d48 SELECT cr.* FROM compliance_requirements cr, worksheet_templates w, standards s
 WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-17' AND cr.code = 'REQ-39'
   AND md5(cr.condition) = '289c3d782875175301fa9e6cb722d72c' AND cr.severity = 'block' AND md5(coalesce(cr.description, '')) = '0f9249aed0f9c04a5130d077d9363cad'
   AND cr.clause_reference IS NOT DISTINCT FROM $m$§5.5.2$m$
   AND NOT EXISTS (SELECT 1 FROM compliance_requirements_archive_m820_d48 a WHERE a.id = cr.id);
UPDATE compliance_requirements cr
   SET severity = $m$warn$m$,
       description = $m$Warnt (sperrt die Freigabe nicht), solange eignungskriterien_set nicht bestätigt ist – nur wenn bauleistungen_vergeben (dieses Blatt) mit „ja“ beantwortet ist. § 5.5.2 (S. 49): „Die Eignungskriterien werden nach dem Vertragsgegenstand ausgerichtet. In den Vergabeunterlagen sind die Eignungsnachweise präzise benannt.“ Gedruckt ist ein Zielbild im Indikativ ohne Modalverb (zweites Element des Qualitätsbausteins, Einleitung S. 11: „Darauf folgt das zweite Element, das sich mit der Zielsetzung und dem Optimierungspotenzial beschäftigt.“) – deshalb Warnung.
[EN] Warns (does not block approval) while eignungskriterien_set is not confirmed – only when bauleistungen_vergeben (this sheet) is answered "yes". § 5.5.2 (p. 49): "the eligibility criteria are aligned with the subject of the contract. The tender documents name the evidence of eligibility precisely." What is printed is a target state in the indicative, without a modal verb (second element of the quality module, introduction p. 11: "then follows the second element, dealing with the objective and the optimisation potential") – hence a warning.$m$
  FROM worksheet_templates w, standards s
 WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-17' AND cr.code = 'REQ-39'
   AND md5(cr.condition) = '289c3d782875175301fa9e6cb722d72c' AND cr.severity = 'block' AND md5(coalesce(cr.description, '')) = '0f9249aed0f9c04a5130d077d9363cad'
   AND cr.clause_reference IS NOT DISTINCT FROM $m$§5.5.2$m$;
-- DWA-M-820-2 820-2-18 REQ-41: severity, description (block → warn (51_ A))
INSERT INTO compliance_requirements_archive_m820_d48 SELECT cr.* FROM compliance_requirements cr, worksheet_templates w, standards s
 WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-18' AND cr.code = 'REQ-41'
   AND md5(cr.condition) = 'e30d2be5b396ae13c8e7fe4d2e8cca2f' AND cr.severity = 'block' AND md5(coalesce(cr.description, '')) = '24d2d2065aafd5319b766ad0d813ac00'
   AND cr.clause_reference IS NOT DISTINCT FROM $m$§5.5.4$m$
   AND NOT EXISTS (SELECT 1 FROM compliance_requirements_archive_m820_d48 a WHERE a.id = cr.id);
UPDATE compliance_requirements cr
   SET severity = $m$warn$m$,
       description = $m$Warnt (sperrt die Freigabe nicht), solange rahmenterminplan_attached (dieses Blatt) nicht bestätigt ist – nur wenn bauleistungen_vergeben (820-2-17) mit „ja“ beantwortet ist. § 5.5.4 (S. 50): „Der ausreichend detaillierte, realistische und mit den notwendigen Pufferzeiten versehene Terminplan des Auftraggebers ist Teil der Vergabeunterlagen für die Leistungen der zu beauftragenden Unternehmen.“ Gedruckt ist ein Zielbild im Indikativ ohne Modalverb (zweites Element des Qualitätsbausteins, Einleitung S. 11: „Darauf folgt das zweite Element, das sich mit der Zielsetzung und dem Optimierungspotenzial beschäftigt.“) – deshalb Warnung.
[EN] Warns (does not block approval) while rahmenterminplan_attached (this sheet) is not confirmed – only when bauleistungen_vergeben (820-2-17) is answered "yes". § 5.5.4 (p. 50): "the client's sufficiently detailed, realistic schedule with the necessary buffer times is part of the tender documents for the services of the firms to be commissioned." What is printed is a target state in the indicative, without a modal verb (second element of the quality module, introduction p. 11: "then follows the second element, dealing with the objective and the optimisation potential") – hence a warning.$m$
  FROM worksheet_templates w, standards s
 WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-18' AND cr.code = 'REQ-41'
   AND md5(cr.condition) = 'e30d2be5b396ae13c8e7fe4d2e8cca2f' AND cr.severity = 'block' AND md5(coalesce(cr.description, '')) = '24d2d2065aafd5319b766ad0d813ac00'
   AND cr.clause_reference IS NOT DISTINCT FROM $m$§5.5.4$m$;
-- DWA-M-820-2 820-2-22 REQ-47: severity, description (block → warn (51_ A))
INSERT INTO compliance_requirements_archive_m820_d48 SELECT cr.* FROM compliance_requirements cr, worksheet_templates w, standards s
 WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-22' AND cr.code = 'REQ-47'
   AND md5(cr.condition) = '96861060f66a9baf54914986e6f36ef5' AND cr.severity = 'block' AND md5(coalesce(cr.description, '')) = '68771b44579e24b88c64fdb96218d305'
   AND cr.clause_reference IS NOT DISTINCT FROM $m$§5.7.3, Bild 4$m$
   AND NOT EXISTS (SELECT 1 FROM compliance_requirements_archive_m820_d48 a WHERE a.id = cr.id);
UPDATE compliance_requirements cr
   SET severity = $m$warn$m$,
       description = $m$Warnt (sperrt die Freigabe nicht), solange abnahme_per_bild4 (dieses Blatt) nicht bestätigt ist. § 5.7.3 (S. 57, Bild 4): „Statt einer reinen Abnahme findet eine Abnahmeprüfung statt, die sich dadurch auszeichnet, dass über die reine Sichtprüfung hinaus relevante Funktionalitäten geprüft werden.“ Gedruckt ist ein Zielbild im Indikativ ohne Modalverb (zweites Element des Qualitätsbausteins, Einleitung S. 11: „Darauf folgt das zweite Element, das sich mit der Zielsetzung und dem Optimierungspotenzial beschäftigt.“) – deshalb Warnung.
[EN] Warns (does not block approval) while abnahme_per_bild4 (this sheet) is not confirmed. § 5.7.3 (p. 57, Bild 4): "instead of a plain acceptance an acceptance test takes place, distinguished by checking relevant functionalities beyond a plain visual inspection." What is printed is a target state in the indicative, without a modal verb (second element of the quality module, introduction p. 11: "then follows the second element, dealing with the objective and the optimisation potential") – hence a warning.$m$
  FROM worksheet_templates w, standards s
 WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-22' AND cr.code = 'REQ-47'
   AND md5(cr.condition) = '96861060f66a9baf54914986e6f36ef5' AND cr.severity = 'block' AND md5(coalesce(cr.description, '')) = '68771b44579e24b88c64fdb96218d305'
   AND cr.clause_reference IS NOT DISTINCT FROM $m$§5.7.3, Bild 4$m$;
-- DWA-M-820-2 820-2-24 REQ-51: severity, condition, description (block → warn (51_ A) + re-bound to the warranty register (51_ E 2-4))
INSERT INTO compliance_requirements_archive_m820_d48 SELECT cr.* FROM compliance_requirements cr, worksheet_templates w, standards s
 WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-24' AND cr.code = 'REQ-51'
   AND md5(cr.condition) = '85e6d61190b55b287f2ab7eba6a4c6f4' AND cr.severity = 'block' AND md5(coalesce(cr.description, '')) = 'a733688e8b130d39c46e298f29101a3d'
   AND cr.clause_reference IS NOT DISTINCT FROM $m$§5.8.2$m$
   AND NOT EXISTS (SELECT 1 FROM compliance_requirements_archive_m820_d48 a WHERE a.id = cr.id);
UPDATE compliance_requirements cr
   SET severity = $m$warn$m$,
       condition = $m$IF verantwortung_lph9 != 'entfaellt' THEN (warranty_count >= 1)$m$,
       description = $m$Warnt (sperrt die Freigabe nicht), solange LPH 9 stattfindet (820-2-01: verantwortung_lph9 ≠ entfällt) und der Gewährleistungskalender (gewaehrleistungen, dieses Blatt) keine vollständige Zeile hat (warranty_count ≥ 1). Vollständig ist eine Zeile mit Auftragnehmer/Firma, Abnahme, Beginn und Ende der Gewährleistungsfrist; eine Zeile ohne Beginn oder Ende meldet das Speichern als unvollständig, sie wird nicht gezählt. § 5.8.2 (S. 61): „Die Abnahmen werden mit Angabe des Beginns und des Endes der jeweiligen Gewährleistungsfrist dokumentiert.“ „Es wird ein Gewährleistungskalender, mit Angabe des Beginns und des Endes der jeweiligen Gewährleistungsfristen, für jeden Auftragnehmer und für jede ausführende Firma geführt.“ Je Auftragnehmer und ausführender Firma eine Zeile anlegen. Gedruckt ist ein Zielbild im Indikativ ohne Modalverb (zweites Element des Qualitätsbausteins, Einleitung S. 11: „Darauf folgt das zweite Element, das sich mit der Zielsetzung und dem Optimierungspotenzial beschäftigt.“) – deshalb Warnung.
[EN] Warns (does not block approval) while LPH 9 takes place (820-2-01: verantwortung_lph9 ≠ does not occur) and the warranty calendar (gewaehrleistungen, this sheet) has no complete row (warranty_count ≥ 1). A row is complete with contractor/firm, acceptance, start and end of the warranty period; saving reports a row without start or end as incomplete, and it is not counted. § 5.8.2 (p. 61): "the acceptances are documented with the start and end of the respective warranty period." "A warranty calendar with the start and end of the respective warranty periods is kept for every contractor and every executing firm." Add one row per contractor and executing firm. What is printed is a target state in the indicative, without a modal verb (second element of the quality module, introduction p. 11: "then follows the second element, dealing with the objective and the optimisation potential") – hence a warning.$m$
  FROM worksheet_templates w, standards s
 WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-24' AND cr.code = 'REQ-51'
   AND md5(cr.condition) = '85e6d61190b55b287f2ab7eba6a4c6f4' AND cr.severity = 'block' AND md5(coalesce(cr.description, '')) = 'a733688e8b130d39c46e298f29101a3d'
   AND cr.clause_reference IS NOT DISTINCT FROM $m$§5.8.2$m$;
-- DWA-M-820-2 820-2-24 REQ-52-2: severity, description (block → warn (51_ A))
INSERT INTO compliance_requirements_archive_m820_d48 SELECT cr.* FROM compliance_requirements cr, worksheet_templates w, standards s
 WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-24' AND cr.code = 'REQ-52-2'
   AND md5(cr.condition) = '27f1635d9828c83aba9c9852b9563e0c' AND cr.severity = 'block' AND md5(coalesce(cr.description, '')) = '3054349e8987e21d23ed4076f4e7d242'
   AND cr.clause_reference IS NOT DISTINCT FROM $m$§5.8.3$m$
   AND NOT EXISTS (SELECT 1 FROM compliance_requirements_archive_m820_d48 a WHERE a.id = cr.id);
UPDATE compliance_requirements cr
   SET severity = $m$warn$m$,
       description = $m$Warnt (sperrt die Freigabe nicht), solange verantwortlich_lph9_name (dieses Blatt) leer ist – nur solange LPH 9 stattfindet (820-2-01). § 5.8.3 (S. 62): „Es ist festgelegt, wer für die Phase LPH 9 verantwortlich ist.“ Gedruckt ist ein Zielbild im Indikativ ohne Modalverb (zweites Element des Qualitätsbausteins, Einleitung S. 11: „Darauf folgt das zweite Element, das sich mit der Zielsetzung und dem Optimierungspotenzial beschäftigt.“) – deshalb Warnung.
[EN] Warns (does not block approval) while verantwortlich_lph9_name (this sheet) is empty – only while LPH 9 takes place (820-2-01). § 5.8.3 (p. 62): "it is laid down who is responsible for phase LPH 9." What is printed is a target state in the indicative, without a modal verb (second element of the quality module, introduction p. 11: "then follows the second element, dealing with the objective and the optimisation potential") – hence a warning.$m$
  FROM worksheet_templates w, standards s
 WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-24' AND cr.code = 'REQ-52-2'
   AND md5(cr.condition) = '27f1635d9828c83aba9c9852b9563e0c' AND cr.severity = 'block' AND md5(coalesce(cr.description, '')) = '3054349e8987e21d23ed4076f4e7d242'
   AND cr.clause_reference IS NOT DISTINCT FROM $m$§5.8.3$m$;
-- DWA-M-820-2 820-2-17 REQ-38: condition, description (block behind driver nebenangebote_zugelassen (51_ B))
INSERT INTO compliance_requirements_archive_m820_d48 SELECT cr.* FROM compliance_requirements cr, worksheet_templates w, standards s
 WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-17' AND cr.code = 'REQ-38'
   AND md5(cr.condition) = '81b45839f9c06e780baa7af85982dd84' AND cr.severity = 'block' AND md5(coalesce(cr.description, '')) = '1aa58d5500ff9107e96b1f4ad696ea9a'
   AND cr.clause_reference IS NOT DISTINCT FROM $m$§5.5.1$m$
   AND NOT EXISTS (SELECT 1 FROM compliance_requirements_archive_m820_d48 a WHERE a.id = cr.id);
UPDATE compliance_requirements cr
   SET condition = $m$IF nebenangebote_zugelassen == true THEN (IF bauleistungen_vergeben == true THEN (nebenangebote_conditions == true))$m$,
       description = $m$Gilt nur, wenn Bauleistungen vergeben werden (bauleistungen_vergeben) und Nebenangebote zugelassen sind (nebenangebote_zugelassen; beides auf diesem Blatt). Dann sperrt sie die Freigabe, bis nebenangebote_conditions bestätigt ist. § 5.5.1 (S. 48): „Bei zugelassenen Nebenangeboten sind, wie es in der VOB/A gefordert ist, Mindestanforderungen an die Leistung zu formulieren.“ Sind Nebenangebote nicht zugelassen, prüft sie nicht; solange die Frage offen ist, wartet sie (sperrt). Das Merkblatt empfiehlt außerdem: „Auf Nebenangebote sollte nicht generell verzichtet werden.“
[EN] Applies only when construction works are awarded (bauleistungen_vergeben) and alternative bids are admitted (nebenangebote_zugelassen; both on this sheet). It then blocks approval until nebenangebote_conditions is confirmed. § 5.5.1 (p. 48): "where alternative bids are admitted, minimum requirements for the performance are to be formulated, as the VOB/A demands." If alternative bids are not admitted, it does not check; while the question is open, it waits (blocks). The Merkblatt also recommends: "alternative bids should not be excluded in general."$m$
  FROM worksheet_templates w, standards s
 WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-17' AND cr.code = 'REQ-38'
   AND md5(cr.condition) = '81b45839f9c06e780baa7af85982dd84' AND cr.severity = 'block' AND md5(coalesce(cr.description, '')) = '1aa58d5500ff9107e96b1f4ad696ea9a'
   AND cr.clause_reference IS NOT DISTINCT FROM $m$§5.5.1$m$;
-- DWA-M-820-2 820-2-04 REQ-53: condition, description (block behind driver eigene_regelwerke_vorhanden (51_ B))
INSERT INTO compliance_requirements_archive_m820_d48 SELECT cr.* FROM compliance_requirements cr, worksheet_templates w, standards s
 WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-04' AND cr.code = 'REQ-53'
   AND md5(cr.condition) = '48ec6ee4a18f9194f7d99d6f8caeca71' AND cr.severity = 'block' AND md5(coalesce(cr.description, '')) = '2357a2909945e0b5d1bd3fe4eba36174'
   AND cr.clause_reference IS NOT DISTINCT FROM $m$§6.3.1, §6.3.2$m$
   AND NOT EXISTS (SELECT 1 FROM compliance_requirements_archive_m820_d48 a WHERE a.id = cr.id);
UPDATE compliance_requirements cr
   SET condition = $m$IF eigene_regelwerke_vorhanden == true THEN (regulations_current_check == true)$m$,
       description = $m$Gilt nur, wenn der Auftraggeber eigene Richtlinien und Regelwerke verwendet (eigene_regelwerke_vorhanden, dieses Blatt; Abschnitt 6 betrifft die „Richtlinien und Regelwerke des Auftraggebers (Bauherr und Betreiber)“). Dann sperrt sie die Freigabe, bis regulations_current_check bestätigt ist. § 6.3.1 (S. 65): „Die Regelwerke müssen frei von Widersprüchen sein und die aktuellen rechtlichen, technischen und organisatorischen Gegebenheiten berücksichtigen, also stets auf dem neuesten Stand sein.“ § 6.3.2 (S. 65): „Dem Projekt zugrunde liegende Richtlinien und Regelwerke werden zu Projektbeginn auf Aktualität geprüft und aufgelistet.“ Ohne eigene Regelwerke prüft sie nicht; solange die Frage offen ist, wartet sie (sperrt).
[EN] Applies only when the client uses its own guidelines and rules (eigene_regelwerke_vorhanden, this sheet; section 6 concerns the "guidelines and rules of the client (owner and operator)"). It then blocks approval until regulations_current_check is confirmed. § 6.3.1 (p. 65): "the rules must be free of contradictions and take account of the current legal, technical and organisational conditions, i.e. always be up to date." § 6.3.2 (p. 65): "the guidelines and rules underlying the project are checked for currency and listed at project start." Without own rules it does not check; while the question is open, it waits (blocks).$m$
  FROM worksheet_templates w, standards s
 WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-04' AND cr.code = 'REQ-53'
   AND md5(cr.condition) = '48ec6ee4a18f9194f7d99d6f8caeca71' AND cr.severity = 'block' AND md5(coalesce(cr.description, '')) = '2357a2909945e0b5d1bd3fe4eba36174'
   AND cr.clause_reference IS NOT DISTINCT FROM $m$§6.3.1, §6.3.2$m$;
-- DWA-M-820-2 820-2-25 REQ-54: condition, description (block behind driver eigene_regelwerke_vorhanden (51_ B, 48_ C-1))
INSERT INTO compliance_requirements_archive_m820_d48 SELECT cr.* FROM compliance_requirements cr, worksheet_templates w, standards s
 WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-25' AND cr.code = 'REQ-54'
   AND md5(cr.condition) = '215c32b968d77da39ef562abcccb2cc5' AND cr.severity = 'block' AND md5(coalesce(cr.description, '')) = '0610e86bc1cbf112c8e998f6ee17df8f'
   AND cr.clause_reference IS NOT DISTINCT FROM $m$§6.3.1, §6.3.3$m$
   AND NOT EXISTS (SELECT 1 FROM compliance_requirements_archive_m820_d48 a WHERE a.id = cr.id);
UPDATE compliance_requirements cr
   SET condition = $m$IF eigene_regelwerke_vorhanden == true THEN (approval_release_process == true)$m$,
       description = $m$Gilt nur, wenn der Auftraggeber eigene Richtlinien und Regelwerke verwendet (eigene_regelwerke_vorhanden auf 820-2-04). Dann sperrt sie die Freigabe, bis approval_release_process (dieses Blatt) bestätigt ist. § 6.3.1 (S. 65): „Hier muss ein Prozess eingerichtet sein, der den Umgang mit Abweichungen bis hin zur Entscheidung und Freigabe seitens des Auftraggebers (Bauherr und Betrieb) regelt.“ § 6.3.3 (S. 66) beschreibt als Ziel funktionierende Fortschreibungs- und Freigabeprozesse. Ohne eigene Regelwerke prüft sie nicht; solange die Frage offen ist, wartet sie (sperrt).
[EN] Applies only when the client uses its own guidelines and rules (eigene_regelwerke_vorhanden on 820-2-04). It then blocks approval until approval_release_process (this sheet) is confirmed. § 6.3.1 (p. 65): "a process must be in place here that governs the handling of deviations up to the decision and release by the client (owner and operator)." § 6.3.3 (p. 66) describes working update and release processes as the target. Without own rules it does not check; while the question is open, it waits (blocks).$m$
  FROM worksheet_templates w, standards s
 WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-25' AND cr.code = 'REQ-54'
   AND md5(cr.condition) = '215c32b968d77da39ef562abcccb2cc5' AND cr.severity = 'block' AND md5(coalesce(cr.description, '')) = '0610e86bc1cbf112c8e998f6ee17df8f'
   AND cr.clause_reference IS NOT DISTINCT FROM $m$§6.3.1, §6.3.3$m$;
-- DWA-M-820-2 820-2-26 REQ-55: severity, condition, clause_reference, description (warn → block behind driver innovation_verlangt (51_ B))
INSERT INTO compliance_requirements_archive_m820_d48 SELECT cr.* FROM compliance_requirements cr, worksheet_templates w, standards s
 WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-26' AND cr.code = 'REQ-55'
   AND md5(cr.condition) = '43e7f68918642d7be0104cf2399b1ad2' AND cr.severity = 'warn' AND md5(coalesce(cr.description, '')) = '8a1676beaf7617710606b17e56add2cb'
   AND cr.clause_reference IS NOT DISTINCT FROM $m$§7.5$m$
   AND NOT EXISTS (SELECT 1 FROM compliance_requirements_archive_m820_d48 a WHERE a.id = cr.id);
UPDATE compliance_requirements cr
   SET severity = $m$block$m$,
       condition = $m$IF innovation_verlangt == true THEN (liability_clarified == true)$m$,
       clause_reference = $m$§7.3.4, §7.5$m$,
       description = $m$Gilt nur, wenn in diesem Projekt Innovationen verlangt werden (innovation_verlangt, dieses Blatt). Dann sperrt sie die Freigabe, bis liability_clarified bestätigt ist. § 7.3.4 (S. 70): „Werden Innovationen von Planungsschaffenden bzw. Firmen verlangt, müssen Risiken im Rahmen einer systematischen Risikoanalyse erfasst und die Risikoverteilung vertraglich festgelegt werden.“ Zielbild § 7.5 (S. 72): die Haftungsfragen „sind vertraglich fair verteilt“. Ohne verlangte Innovation prüft sie nicht; solange die Frage offen ist, wartet sie (sperrt).
[EN] Applies only when innovation is required in this project (innovation_verlangt, this sheet). It then blocks approval until liability_clarified is confirmed. § 7.3.4 (p. 70): "if innovations are required from planners or firms, risks must be captured in a systematic risk analysis and the risk allocation must be fixed by contract." Target state § 7.5 (p. 72): the liability questions "are fairly distributed by contract". Without required innovation it does not check; while the question is open, it waits (blocks).$m$
  FROM worksheet_templates w, standards s
 WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-26' AND cr.code = 'REQ-55'
   AND md5(cr.condition) = '43e7f68918642d7be0104cf2399b1ad2' AND cr.severity = 'warn' AND md5(coalesce(cr.description, '')) = '8a1676beaf7617710606b17e56add2cb'
   AND cr.clause_reference IS NOT DISTINCT FROM $m$§7.5$m$;
-- DWA-M-820-2 820-2-26 REQ-56: condition, description (block behind driver innovation_verlangt (51_ B))
INSERT INTO compliance_requirements_archive_m820_d48 SELECT cr.* FROM compliance_requirements cr, worksheet_templates w, standards s
 WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-26' AND cr.code = 'REQ-56'
   AND md5(cr.condition) = '143165ae017ac5504f4c18dd0948d8da' AND cr.severity = 'block' AND md5(coalesce(cr.description, '')) = 'eebb2d38e53efb0e6b5e2904d5818452'
   AND cr.clause_reference IS NOT DISTINCT FROM $m$§7.2, §7.6.2$m$
   AND NOT EXISTS (SELECT 1 FROM compliance_requirements_archive_m820_d48 a WHERE a.id = cr.id);
UPDATE compliance_requirements cr
   SET condition = $m$IF innovation_verlangt == true THEN (ip_rights_defined == true)$m$,
       description = $m$Gilt nur, wenn in diesem Projekt Innovationen verlangt werden (innovation_verlangt, dieses Blatt). Dann sperrt sie die Freigabe, bis ip_rights_defined bestätigt ist. § 7.2 (S. 68): „Bei Innovationen muss immer über Rechte an Patenten, Gebrauchsmustern und Erfindungen sowie über Verschwiegenheitserklärungen gesprochen werden.“ § 7.6.2 (S. 73) empfiehlt zusätzlich: „Im Vertrag mit dem Auftraggeber sollten der Umfang der Nutzung und die Nutzungsbefugnis sowie die dafür zu zahlende Vergütung angemessen und klar geregelt werden.“ Ohne verlangte Innovation prüft sie nicht; solange die Frage offen ist, wartet sie (sperrt).
[EN] Applies only when innovation is required in this project (innovation_verlangt, this sheet). It then blocks approval until ip_rights_defined is confirmed. § 7.2 (p. 68): "with innovations, rights to patents, utility models and inventions as well as confidentiality agreements must always be discussed." § 7.6.2 (p. 73) also recommends: "the contract with the client should regulate the scope of use, the authority to use and the fee for it appropriately and clearly." Without required innovation it does not check; while the question is open, it waits (blocks).$m$
  FROM worksheet_templates w, standards s
 WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-26' AND cr.code = 'REQ-56'
   AND md5(cr.condition) = '143165ae017ac5504f4c18dd0948d8da' AND cr.severity = 'block' AND md5(coalesce(cr.description, '')) = 'eebb2d38e53efb0e6b5e2904d5818452'
   AND cr.clause_reference IS NOT DISTINCT FROM $m$§7.2, §7.6.2$m$;
-- DWA-M-820-2 820-2-27 REQ-57: description (stays warn, hint only (51_ re-ruling: „sollten nur in Einzelfällen“; „müssen … transparent“ only for requirements actually set))
INSERT INTO compliance_requirements_archive_m820_d48 SELECT cr.* FROM compliance_requirements cr, worksheet_templates w, standards s
 WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-27' AND cr.code = 'REQ-57'
   AND md5(cr.condition) = '3f2e24f1b98fd17e62e795b7ffc17552' AND cr.severity = 'warn' AND md5(coalesce(cr.description, '')) = '095af5619688a5d798bb3a9b430522aa'
   AND cr.clause_reference IS NOT DISTINCT FROM $m$§8.2.1$m$
   AND NOT EXISTS (SELECT 1 FROM compliance_requirements_archive_m820_d48 a WHERE a.id = cr.id);
UPDATE compliance_requirements cr
   SET description = $m$Warnt (sperrt die Freigabe nicht), solange das Software-Register (software_products_defined, dieses Blatt) leer ist. § 8.2.1 (S. 74): „Anforderungen der Auftraggeber an einzusetzende Software sollten nur in Einzelfällen formuliert werden. Grundsätzlich müssen sie in der Angebotsanfrage transparent gemacht werden.“ Das „müssen … transparent gemacht werden“ gilt nur für Softwarevorgaben, die der Auftraggeber tatsächlich setzt; solche Vorgaben „sollten“ die Ausnahme sein – deshalb Warnung. Vorgegebene bzw. eingesetzte Software mit Einsatzzweck im Register eintragen.
[EN] Warns (does not block approval) while the software register (software_products_defined, this sheet) is empty. § 8.2.1 (p. 74): "client requirements on the software to be used should only be formulated in individual cases. In principle they must be made transparent in the request for proposals." The "must be made transparent" applies only to software requirements the client actually sets, and such requirements "should" be the exception – hence a warning. Enter the prescribed or used software, with its purpose, in the register.$m$
  FROM worksheet_templates w, standards s
 WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-27' AND cr.code = 'REQ-57'
   AND md5(cr.condition) = '3f2e24f1b98fd17e62e795b7ffc17552' AND cr.severity = 'warn' AND md5(coalesce(cr.description, '')) = '095af5619688a5d798bb3a9b430522aa'
   AND cr.clause_reference IS NOT DISTINCT FROM $m$§8.2.1$m$;
-- DWA-M-820-3 M8203-20 REQ-27: description (stays warn, hint only (51_ re-ruling: the „sind … zu berücksichtigen“ is conditional; the other items are indicative))
INSERT INTO compliance_requirements_archive_m820_d48 SELECT cr.* FROM compliance_requirements cr, worksheet_templates w, standards s
 WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-3' AND w.code = 'M8203-20' AND cr.code = 'REQ-27'
   AND md5(cr.condition) = 'a5c13b367bfa60edb50edd5d3fc51fa0' AND cr.severity = 'warn' AND md5(coalesce(cr.description, '')) = 'd4bf852c5f416ab136a14d9c6364d49b'
   AND cr.clause_reference IS NOT DISTINCT FROM $m$§7.3$m$
   AND NOT EXISTS (SELECT 1 FROM compliance_requirements_archive_m820_d48 a WHERE a.id = cr.id);
UPDATE compliance_requirements cr
   SET description = $m$Warnt (sperrt die Freigabe nicht), solange nicht alle drei Felder dieses Blatts bestätigt sind: Bestandsdaten vollständig/aktuell/digital (bestandsdaten_complete_digital), AKZ vorhanden (akz_in_place), Anforderungen zur kritischen Infrastruktur abgeklärt (critical_infra_assessed). § 7.3 (S. 21): „Die Anforderungen der Gesetzgebung zur kritischen Infrastruktur wurden im Vorfeld abgeklärt und sind im Projekt berücksichtigt.“ Die Pflicht gilt nur bedingt: „Werden einem Externen Daten zur Verfügung gestellt, beispielsweise für Wartungszwecke, sind die Anforderungen der Gesetzgebung an die kritische Infrastruktur im Vorfeld zu berücksichtigen.“ Die übrigen Ziele von § 7.3 (S. 20–21) sind im Indikativ gedruckt – deshalb Warnung.
[EN] Warns (does not block approval) until all three fields on this sheet are confirmed: existing data complete/current/digital (bestandsdaten_complete_digital), AKZ in place (akz_in_place), critical-infrastructure requirements assessed (critical_infra_assessed). § 7.3 (p. 21): "the legal requirements on critical infrastructure were clarified beforehand and are taken into account in the project." The duty is conditional only: "if data are made available to an external party, e.g. for maintenance, the legal requirements on critical infrastructure are to be taken into account beforehand." The other § 7.3 goals (pp. 20–21) are printed in the indicative – hence a warning.$m$
  FROM worksheet_templates w, standards s
 WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-3' AND w.code = 'M8203-20' AND cr.code = 'REQ-27'
   AND md5(cr.condition) = 'a5c13b367bfa60edb50edd5d3fc51fa0' AND cr.severity = 'warn' AND md5(coalesce(cr.description, '')) = 'd4bf852c5f416ab136a14d9c6364d49b'
   AND cr.clause_reference IS NOT DISTINCT FROM $m$§7.3$m$;

-- ── 3. new gate ──
-- DWA-M-820-1 M820-24 REQ-23-2: NEW warn gate (51_ C-2, § 8.3 „zwar nicht dazu verpflichtet, sollte es aber …“)
WITH ins AS (
  INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, title_en, condition, clause_reference, severity, description, source_quote, source_anchor)
  SELECT w.id, $m$REQ-23-2$m$, $m$Vergabevermerk auch bei Direktvergabe / Suchverfahren$m$, $m$Procurement memo also for a direct award / search procedure$m$, $m$IF (client_organization_type != 'privat_ohne_foerderung' OR vergaberecht_freiwillig_angewendet == true) AND procurement_procedure IN {suchverfahren, direktvergabe} THEN (vergabevermerk_complete == true)$m$, $m$§8.3, Anh. F$m$, $m$warn$m$,
         $m$Warnt (sperrt die Freigabe nicht). Gilt bei Suchverfahren oder Direktvergabe (procurement_procedure auf M820-10), wenn der Auftraggeber an das Vergaberecht gebunden ist oder Fördermittel erhält (kein privater Auftraggeber ohne Fördermittel, oder vergaberecht_freiwillig_angewendet = ja; beides auf M820-01). Dann soll vergabevermerk_complete (dieses Blatt) bestätigt sein. § 8.3 (S. 32): „Bei einer Direktvergabe oder einem Suchverfahren ist der Auftraggeber zwar nicht dazu verpflichtet, sollte es aber bereits aus haushaltsrechtlichen Gründen oder bei dem Erhalt von Fördermitteln zwecks Dokumentation tun.“ – „sollte“ → Warnung. Beim VgV-F-Verfahren prüft REQ-23 (Pflicht, sperrt); beim Planungswettbewerb prüft keine der beiden (§ 8.3 nennt ihn hier nicht). Anhang F schlägt eine Gliederung vor.
[EN] Warns (does not block approval). Applies in a search procedure or direct award (procurement_procedure on M820-10) when the client is bound by procurement law or receives public funding (not a private client without public funding, or vergaberecht_freiwillig_angewendet = yes; both on M820-01). vergabevermerk_complete (this sheet) should then be confirmed. § 8.3 (p. 32): "for a direct award or a search procedure the client is not obliged, but should do so already for budget-law reasons or when receiving public funding, for documentation." – "sollte" → warning. In a VgV-F procedure REQ-23 checks (duty, blocks); in a design competition neither checks (§ 8.3 does not name it here). Annex F proposes a structure.$m$,
         $m$Bei einer Direktvergabe oder einem Suchverfahren ist der Auftraggeber zwar nicht dazu verpflichtet, sollte es aber bereits aus haushaltsrechtlichen Gründen oder bei dem Erhalt von Fördermitteln zwecks Dokumentation tun.$m$, $m$DWA-M 820-1 §8.3 (PDF S. 34)$m$
    FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
   WHERE s.code = 'DWA-M-820-1' AND w.code = 'M820-24'
     AND NOT EXISTS (SELECT 1 FROM compliance_requirements x WHERE x.worksheet_template_id = w.id AND x.code = $m$REQ-23-2$m$)
  RETURNING *
)
INSERT INTO m820_d48_added (tbl, id, md5) SELECT 'compliance_requirements', ins.id, md5(row_to_json(ins)::text) FROM ins ON CONFLICT DO NOTHING;

-- ── 4. fields (hints of re-read fields, E 2-3 label, REQ-14 guard consumers, PS-1 order) ──
-- DWA-M-820-2 820-2-24 warranty_count: description (hint: REQ-51 now reads it)
INSERT INTO fields_archive_m820_d48 SELECT f.* FROM fields f, worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-24' AND f.symbol = 'warranty_count' AND f.active
   AND md5(coalesce(f.description, '')) = '5f645a2b3361bb07eee92680f300261a'
   AND NOT EXISTS (SELECT 1 FROM fields_archive_m820_d48 a WHERE a.id = f.id);
UPDATE fields f
   SET description = $m$Zählt die vollständigen Zeilen des Gewährleistungskalenders (Auftragnehmer/Firma, Abnahme, Beginn und Ende der Gewährleistungsfrist eingetragen); unvollständige Zeilen meldet das Speichern, sie werden nicht gezählt. REQ-51 liest diesen Wert: solange LPH 9 stattfindet, warnt sie bei 0. § 5.8.2 (S. 61): „Es wird ein Gewährleistungskalender, mit Angabe des Beginns und des Endes der jeweiligen Gewährleistungsfristen, für jeden Auftragnehmer und für jede ausführende Firma geführt.“
[EN] Counts the complete rows of the warranty calendar (contractor/firm, acceptance, start and end of the warranty period entered); saving reports incomplete rows, and they are not counted. REQ-51 reads this value: while LPH 9 takes place, it warns at 0. § 5.8.2 (p. 61): "a warranty calendar with the start and end of the respective warranty periods is kept for every contractor and every executing firm."$m$
  FROM worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-24' AND f.symbol = 'warranty_count' AND f.active
   AND md5(coalesce(f.description, '')) = '5f645a2b3361bb07eee92680f300261a';
-- DWA-M-820-2 820-2-24 gewaehrleistungen: description (hint: REQ-51 now reads it (via warranty_count))
INSERT INTO fields_archive_m820_d48 SELECT f.* FROM fields f, worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-24' AND f.symbol = 'gewaehrleistungen' AND f.active
   AND md5(coalesce(f.description, '')) = '5b4366812682f1d6e72415110082e0ef'
   AND NOT EXISTS (SELECT 1 FROM fields_archive_m820_d48 a WHERE a.id = f.id);
UPDATE fields f
   SET description = $m$Gewährleistungskalender je Auftragnehmer/ausführender Firma (Abnahme, Beginn, Ende, offene Mängel). §5.8.2: je Auftragnehmer ein eindeutiger Abnahmezeitpunkt und ein benanntes Fristende; §5.8.3: konsequente Mängelverfolgung. REQ-51 prüft über warranty_count, dass mindestens eine vollständige Zeile vorliegt (Warnung, solange LPH 9 stattfindet).
[EN] Warranty calendar per contractor/executing firm (acceptance, start, end, open defects). §5.8.2: a clear acceptance point and a named end date per contractor; §5.8.3: consistent defect tracking. REQ-51 checks through warranty_count that at least one complete row exists (warning, while LPH 9 takes place).$m$
  FROM worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-24' AND f.symbol = 'gewaehrleistungen' AND f.active
   AND md5(coalesce(f.description, '')) = '5b4366812682f1d6e72415110082e0ef';
-- DWA-M-820-1 M820-14 award_weight_sum_pct: description (hint: REQ-14 now reads it)
INSERT INTO fields_archive_m820_d48 SELECT f.* FROM fields f, worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-1' AND w.code = 'M820-14' AND f.symbol = 'award_weight_sum_pct' AND f.active
   AND md5(coalesce(f.description, '')) = '4c8c83fe872f23642312408e7e5cd2a3'
   AND NOT EXISTS (SELECT 1 FROM fields_archive_m820_d48 a WHERE a.id = f.id);
UPDATE fields f
   SET description = $m$Summiert die Gewichtungen aller vollständigen Zeilen des Zuschlagskriterien-Registers; das Merkblatt druckt keine Soll-Summe. REQ-14 liest den Wert: größer 0 heißt, mindestens ein Zuschlagskriterium mit Gewichtung ist eingetragen (§ 8.10.3.3, S. 40: „die Zuschlagskriterien und deren Gewichtung anzugeben“).
[EN] Sums the weightings of all complete rows of the award-criteria register; the Merkblatt prints no target sum. REQ-14 reads the value: greater than 0 means at least one award criterion with a weighting is entered (§ 8.10.3.3, p. 40: "to state the award criteria and their weighting").$m$
  FROM worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-1' AND w.code = 'M820-14' AND f.symbol = 'award_weight_sum_pct' AND f.active
   AND md5(coalesce(f.description, '')) = '4c8c83fe872f23642312408e7e5cd2a3';
-- DWA-M-820-2 820-2-05 projektsteuerung_scope: description, enum_values (E 2-3: label „Risikomanagement“ as tool option)
INSERT INTO fields_archive_m820_d48 SELECT f.* FROM fields f, worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-05' AND f.symbol = 'projektsteuerung_scope' AND f.active
   AND md5(coalesce(f.description, '')) = 'a5cc4a38e6dbedd62486706cbce5f82c'
   AND f.enum_values = $m$[{"value": "Projektorganisation", "label_de": "Projektorganisation", "order_index": 0}, {"value": "Terminmanagement", "label_de": "Terminmanagement", "order_index": 1}, {"value": "Kostenmanagement", "label_de": "Kostenmanagement", "order_index": 2}, {"value": "Vertragsmanagement", "label_de": "Vertragsmanagement", "order_index": 3}, {"value": "Qualitätsmanagement", "label_de": "Qualitätsmanagement", "order_index": 4}, {"value": "Risikomanagement", "label_de": "Risikomanagement", "order_index": 5}, {"value": "keine", "label_de": "Keine gesonderte Projektsteuerung (Projektleitung deckt die Bereiche ab)", "order_index": 6}]$m$::jsonb
   AND NOT EXISTS (SELECT 1 FROM fields_archive_m820_d48 a WHERE a.id = f.id);
UPDATE fields f
   SET description = $m$Mehrfachauswahl der Handlungsbereiche der Projektsteuerung. §4.1 nennt Projektorganisation, Terminmanagement, Kostenmanagement, Qualitätsmanagement und Vertragsmanagement; „Risikomanagement“ ist eine Werkzeug-Option (in § 4.1 nicht genannt; vgl. § 4.8). „Keine gesonderte Projektsteuerung“ ist eine Werkzeug-Option (nicht gedruckt) für Projekte, in denen die Projektleitung diese Bereiche selbst abdeckt; §4.1 (S. 20) verlangt nur: „Umgang mit der extern beauftragten Projektsteuerung (Rollen, Aufgaben, Kompetenzen, Schnittstellen etc.) muss geklärt sein.“
[EN] Multi-select of the Projektsteuerung's action areas. §4.1 names project organisation, schedule, cost, quality and contract management; "Risikomanagement" is a tool option (not named in § 4.1; cf. § 4.8). "No separate project steering" is a tool option (not printed) for projects where the project management covers these areas itself; §4.1 (p. 20) only requires that the handling of an externally commissioned project steering (roles, tasks, competences, interfaces) must be clarified.$m$,
       enum_values = $m$[{"value":"Projektorganisation","label_de":"Projektorganisation","order_index":0},{"value":"Terminmanagement","label_de":"Terminmanagement","order_index":1},{"value":"Kostenmanagement","label_de":"Kostenmanagement","order_index":2},{"value":"Vertragsmanagement","label_de":"Vertragsmanagement","order_index":3},{"value":"Qualitätsmanagement","label_de":"Qualitätsmanagement","order_index":4},{"value":"Risikomanagement","label_de":"Risikomanagement (Werkzeug-Option, in § 4.1 nicht genannt)","order_index":5},{"value":"keine","label_de":"Keine gesonderte Projektsteuerung (Projektleitung deckt die Bereiche ab)","order_index":6}]$m$::jsonb
  FROM worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-05' AND f.symbol = 'projektsteuerung_scope' AND f.active
   AND md5(coalesce(f.description, '')) = 'a5cc4a38e6dbedd62486706cbce5f82c'
   AND f.enum_values = $m$[{"value": "Projektorganisation", "label_de": "Projektorganisation", "order_index": 0}, {"value": "Terminmanagement", "label_de": "Terminmanagement", "order_index": 1}, {"value": "Kostenmanagement", "label_de": "Kostenmanagement", "order_index": 2}, {"value": "Vertragsmanagement", "label_de": "Vertragsmanagement", "order_index": 3}, {"value": "Qualitätsmanagement", "label_de": "Qualitätsmanagement", "order_index": 4}, {"value": "Risikomanagement", "label_de": "Risikomanagement", "order_index": 5}, {"value": "keine", "label_de": "Keine gesonderte Projektsteuerung (Projektleitung deckt die Bereiche ab)", "order_index": 6}]$m$::jsonb;
-- DWA-M-820-1 M820-01 client_organization_type: consumer_worksheets (consumer M820-14 (REQ-14 guard))
INSERT INTO fields_archive_m820_d48 SELECT f.* FROM fields f, worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-1' AND w.code = 'M820-01' AND f.symbol = 'client_organization_type' AND f.active
   AND f.consumer_worksheets = ARRAY['M820-08','M820-09','M820-04','M820-10','M820-12','M820-17','M820-23','M820-18','M820-20','M820-21','M820-24']::text[]
   AND NOT EXISTS (SELECT 1 FROM fields_archive_m820_d48 a WHERE a.id = f.id);
UPDATE fields f
   SET consumer_worksheets = ARRAY['M820-08','M820-09','M820-04','M820-10','M820-12','M820-17','M820-23','M820-18','M820-20','M820-21','M820-24','M820-14']::text[]
  FROM worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-1' AND w.code = 'M820-01' AND f.symbol = 'client_organization_type' AND f.active
   AND f.consumer_worksheets = ARRAY['M820-08','M820-09','M820-04','M820-10','M820-12','M820-17','M820-23','M820-18','M820-20','M820-21','M820-24']::text[];
-- DWA-M-820-1 M820-01 vergaberecht_freiwillig_angewendet: consumer_worksheets (consumer M820-14 (REQ-14 guard))
INSERT INTO fields_archive_m820_d48 SELECT f.* FROM fields f, worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-1' AND w.code = 'M820-01' AND f.symbol = 'vergaberecht_freiwillig_angewendet' AND f.active
   AND f.consumer_worksheets = ARRAY['M820-04','M820-08','M820-09','M820-10','M820-12','M820-17','M820-23','M820-18','M820-20','M820-21','M820-24']::text[]
   AND NOT EXISTS (SELECT 1 FROM fields_archive_m820_d48 a WHERE a.id = f.id);
UPDATE fields f
   SET consumer_worksheets = ARRAY['M820-04','M820-08','M820-09','M820-10','M820-12','M820-17','M820-23','M820-18','M820-20','M820-21','M820-24','M820-14']::text[]
  FROM worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-1' AND w.code = 'M820-01' AND f.symbol = 'vergaberecht_freiwillig_angewendet' AND f.active
   AND f.consumer_worksheets = ARRAY['M820-04','M820-08','M820-09','M820-10','M820-12','M820-17','M820-23','M820-18','M820-20','M820-21','M820-24']::text[];
-- DWA-M-820-1 M820-10 procurement_procedure: consumer_worksheets (consumer M820-14 (REQ-14 guard))
INSERT INTO fields_archive_m820_d48 SELECT f.* FROM fields f, worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-1' AND w.code = 'M820-10' AND f.symbol = 'procurement_procedure' AND f.active
   AND f.consumer_worksheets = ARRAY['M820-11','M820-16','M820-17','M820-18','M820-19','M820-12','M820-20','M820-21','M820-24']::text[]
   AND NOT EXISTS (SELECT 1 FROM fields_archive_m820_d48 a WHERE a.id = f.id);
UPDATE fields f
   SET consumer_worksheets = ARRAY['M820-11','M820-16','M820-17','M820-18','M820-19','M820-12','M820-20','M820-21','M820-24','M820-14']::text[]
  FROM worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-1' AND w.code = 'M820-10' AND f.symbol = 'procurement_procedure' AND f.active
   AND f.consumer_worksheets = ARRAY['M820-11','M820-16','M820-17','M820-18','M820-19','M820-12','M820-20','M820-21','M820-24']::text[];
-- DWA-M-820-2 820-2-01 project_number: order_index (PS-1 order (section B))
INSERT INTO fields_archive_m820_d48 SELECT f.* FROM fields f, worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-01' AND f.symbol = 'project_number' AND f.active
   AND f.order_index = 0 AND f.section_id = (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'B')
   AND NOT EXISTS (SELECT 1 FROM fields_archive_m820_d48 a WHERE a.id = f.id);
UPDATE fields f
   SET order_index = 1
  FROM worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-01' AND f.symbol = 'project_number' AND f.active
   AND f.order_index = 0 AND f.section_id = (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'B');
-- DWA-M-820-2 820-2-01 project_location: order_index (PS-1 order (section B))
INSERT INTO fields_archive_m820_d48 SELECT f.* FROM fields f, worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-01' AND f.symbol = 'project_location' AND f.active
   AND f.order_index = 0 AND f.section_id = (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'B')
   AND NOT EXISTS (SELECT 1 FROM fields_archive_m820_d48 a WHERE a.id = f.id);
UPDATE fields f
   SET order_index = 2
  FROM worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-01' AND f.symbol = 'project_location' AND f.active
   AND f.order_index = 0 AND f.section_id = (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'B');
-- DWA-M-820-2 820-2-01 client_name: order_index (PS-1 order (section B))
INSERT INTO fields_archive_m820_d48 SELECT f.* FROM fields f, worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-01' AND f.symbol = 'client_name' AND f.active
   AND f.order_index = 0 AND f.section_id = (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'B')
   AND NOT EXISTS (SELECT 1 FROM fields_archive_m820_d48 a WHERE a.id = f.id);
UPDATE fields f
   SET order_index = 3
  FROM worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-01' AND f.symbol = 'client_name' AND f.active
   AND f.order_index = 0 AND f.section_id = (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'B');
-- DWA-M-820-2 820-2-01 client_type: order_index (PS-1 order (section B))
INSERT INTO fields_archive_m820_d48 SELECT f.* FROM fields f, worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-01' AND f.symbol = 'client_type' AND f.active
   AND f.order_index = 0 AND f.section_id = (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'B')
   AND NOT EXISTS (SELECT 1 FROM fields_archive_m820_d48 a WHERE a.id = f.id);
UPDATE fields f
   SET order_index = 4
  FROM worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-01' AND f.symbol = 'client_type' AND f.active
   AND f.order_index = 0 AND f.section_id = (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'B');
-- DWA-M-820-2 820-2-01 complexity_level: order_index (PS-1 order (section B))
INSERT INTO fields_archive_m820_d48 SELECT f.* FROM fields f, worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-01' AND f.symbol = 'complexity_level' AND f.active
   AND f.order_index = 0 AND f.section_id = (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'B')
   AND NOT EXISTS (SELECT 1 FROM fields_archive_m820_d48 a WHERE a.id = f.id);
UPDATE fields f
   SET order_index = 5
  FROM worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-01' AND f.symbol = 'complexity_level' AND f.active
   AND f.order_index = 0 AND f.section_id = (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'B');
-- DWA-M-820-2 820-2-01 included_hoai_phases: order_index (PS-1 order (section B))
INSERT INTO fields_archive_m820_d48 SELECT f.* FROM fields f, worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-01' AND f.symbol = 'included_hoai_phases' AND f.active
   AND f.order_index = 0 AND f.section_id = (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'B')
   AND NOT EXISTS (SELECT 1 FROM fields_archive_m820_d48 a WHERE a.id = f.id);
UPDATE fields f
   SET order_index = 6
  FROM worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-01' AND f.symbol = 'included_hoai_phases' AND f.active
   AND f.order_index = 0 AND f.section_id = (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'B');
-- DWA-M-820-2 820-2-01 project_category: order_index (PS-1 order (section B))
INSERT INTO fields_archive_m820_d48 SELECT f.* FROM fields f, worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-01' AND f.symbol = 'project_category' AND f.active
   AND f.order_index = 0 AND f.section_id = (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'B')
   AND NOT EXISTS (SELECT 1 FROM fields_archive_m820_d48 a WHERE a.id = f.id);
UPDATE fields f
   SET order_index = 7
  FROM worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-01' AND f.symbol = 'project_category' AND f.active
   AND f.order_index = 0 AND f.section_id = (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'B');
-- DWA-M-820-2 820-2-01 project_size: order_index (PS-1 order (section B))
INSERT INTO fields_archive_m820_d48 SELECT f.* FROM fields f, worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-01' AND f.symbol = 'project_size' AND f.active
   AND f.order_index = 0 AND f.section_id = (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'B')
   AND NOT EXISTS (SELECT 1 FROM fields_archive_m820_d48 a WHERE a.id = f.id);
UPDATE fields f
   SET order_index = 8
  FROM worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-01' AND f.symbol = 'project_size' AND f.active
   AND f.order_index = 0 AND f.section_id = (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'B');
-- DWA-M-820-2 820-2-01 project_name_short: order_index (PS-1 order (section B))
INSERT INTO fields_archive_m820_d48 SELECT f.* FROM fields f, worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-01' AND f.symbol = 'project_name_short' AND f.active
   AND f.order_index = 0 AND f.section_id = (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'B')
   AND NOT EXISTS (SELECT 1 FROM fields_archive_m820_d48 a WHERE a.id = f.id);
UPDATE fields f
   SET order_index = 10
  FROM worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-01' AND f.symbol = 'project_name_short' AND f.active
   AND f.order_index = 0 AND f.section_id = (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'B');
-- DWA-M-820-2 820-2-01 primary_sector: order_index (PS-1 order (section B))
INSERT INTO fields_archive_m820_d48 SELECT f.* FROM fields f, worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-01' AND f.symbol = 'primary_sector' AND f.active
   AND f.order_index = 0 AND f.section_id = (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'B')
   AND NOT EXISTS (SELECT 1 FROM fields_archive_m820_d48 a WHERE a.id = f.id);
UPDATE fields f
   SET order_index = 11
  FROM worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-01' AND f.symbol = 'primary_sector' AND f.active
   AND f.order_index = 0 AND f.section_id = (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'B');
-- DWA-M-820-2 820-2-01 scope_technical: order_index (PS-1 order (section B))
INSERT INTO fields_archive_m820_d48 SELECT f.* FROM fields f, worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-01' AND f.symbol = 'scope_technical' AND f.active
   AND f.order_index = 0 AND f.section_id = (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'B')
   AND NOT EXISTS (SELECT 1 FROM fields_archive_m820_d48 a WHERE a.id = f.id);
UPDATE fields f
   SET order_index = 12
  FROM worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-01' AND f.symbol = 'scope_technical' AND f.active
   AND f.order_index = 0 AND f.section_id = (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'B');
-- DWA-M-820-2 820-2-01 scope_excluded: order_index (PS-1 order (section B))
INSERT INTO fields_archive_m820_d48 SELECT f.* FROM fields f, worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-01' AND f.symbol = 'scope_excluded' AND f.active
   AND f.order_index = 0 AND f.section_id = (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'B')
   AND NOT EXISTS (SELECT 1 FROM fields_archive_m820_d48 a WHERE a.id = f.id);
UPDATE fields f
   SET order_index = 13
  FROM worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-01' AND f.symbol = 'scope_excluded' AND f.active
   AND f.order_index = 0 AND f.section_id = (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'B');
-- DWA-M-820-2 820-2-01 verantwortung_lph0: order_index (PS-1 order (section B))
INSERT INTO fields_archive_m820_d48 SELECT f.* FROM fields f, worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-01' AND f.symbol = 'verantwortung_lph0' AND f.active
   AND f.order_index = 1 AND f.section_id = (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'B')
   AND NOT EXISTS (SELECT 1 FROM fields_archive_m820_d48 a WHERE a.id = f.id);
UPDATE fields f
   SET order_index = 14
  FROM worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-01' AND f.symbol = 'verantwortung_lph0' AND f.active
   AND f.order_index = 1 AND f.section_id = (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'B');
-- DWA-M-820-2 820-2-01 verantwortung_lph8: order_index (PS-1 order (section B))
INSERT INTO fields_archive_m820_d48 SELECT f.* FROM fields f, worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-01' AND f.symbol = 'verantwortung_lph8' AND f.active
   AND f.order_index = 2 AND f.section_id = (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'B')
   AND NOT EXISTS (SELECT 1 FROM fields_archive_m820_d48 a WHERE a.id = f.id);
UPDATE fields f
   SET order_index = 15
  FROM worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-01' AND f.symbol = 'verantwortung_lph8' AND f.active
   AND f.order_index = 2 AND f.section_id = (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'B');
-- DWA-M-820-2 820-2-01 verantwortung_lph9: order_index (PS-1 order (section B))
INSERT INTO fields_archive_m820_d48 SELECT f.* FROM fields f, worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-01' AND f.symbol = 'verantwortung_lph9' AND f.active
   AND f.order_index = 3 AND f.section_id = (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'B')
   AND NOT EXISTS (SELECT 1 FROM fields_archive_m820_d48 a WHERE a.id = f.id);
UPDATE fields f
   SET order_index = 16
  FROM worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-01' AND f.symbol = 'verantwortung_lph9' AND f.active
   AND f.order_index = 3 AND f.section_id = (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'B');
-- DWA-M-820-2 820-2-01 project_size_begruendung: order_index (PS-1 order (section B))
INSERT INTO fields_archive_m820_d48 SELECT f.* FROM fields f, worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-01' AND f.symbol = 'project_size_begruendung' AND f.active
   AND f.order_index = 4 AND f.section_id = (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'B')
   AND NOT EXISTS (SELECT 1 FROM fields_archive_m820_d48 a WHERE a.id = f.id);
UPDATE fields f
   SET order_index = 9
  FROM worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-01' AND f.symbol = 'project_size_begruendung' AND f.active
   AND f.order_index = 4 AND f.section_id = (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'B');

-- ── 5. ledger: md5 of every archived row as this block left it (the rollback restores only rows still in that state) ──
INSERT INTO m820_d48_written (tbl, id, md5) SELECT 'compliance_requirements', x.id, md5(row_to_json(x)::text) FROM compliance_requirements x WHERE x.id IN (SELECT id FROM compliance_requirements_archive_m820_d48) ON CONFLICT DO NOTHING;
INSERT INTO m820_d48_written (tbl, id, md5) SELECT 'fields', x.id, md5(row_to_json(x)::text) FROM fields x WHERE x.id IN (SELECT id FROM fields_archive_m820_d48) ON CONFLICT DO NOTHING;

COMMIT;
