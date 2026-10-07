-- 20261007120000_m820_small_fixes.sql · DWA-M 820-1 / -2 / -3 — three small owner-requested fixes (2026-10-07)
-- Apply order + choices: vault 01-Projects/ekowai-wizard/m820-wizard-test/60_APPLY-ORDER-m820-small-fixes.md.
-- Pattern: 20261007110000_m820_decisions_48_50.sql (md5-guarded on the LIVE rows, in-transaction archives, byte-equal rollback).
--
-- WHAT CHANGES (plain English):
--   1. 820-2-24 Gewährleistungsmanagement is routed by the construction-award question `bauleistungen_vergeben` (820-2-17), the same
--      way 820-2-18 / 820-2-19 are (block 20261006100000): "No" (the client builds itself, Eigenleistung) = there are no contractor
--      warranties → the warranty part of the sheet is hidden (warranty_start_date, warranty_end_date, defect_tracking_active, the
--      warranty calendar gewaehrleistungen and its two counts) and the two warranty gates do not apply:
--        REQ-51 (warn, warranty calendar)  IF verantwortung_lph9 != 'entfaellt' THEN (IF bauleistungen_vergeben == true THEN (warranty_count >= 1))
--        REQ-52 (block, defect tracking)   IF verantwortung_lph9 != 'entfaellt' THEN (IF bauleistungen_vergeben == true THEN (defect_tracking_active == true))
--      KEPT unchanged: REQ-52-2 (warn, „Es ist festgelegt, wer für die Phase LPH 9 verantwortlich ist.“) and its field
--      verantwortlich_lph9_name — the print asks who is responsible for LPH 9 without tying it to awarded construction works; LPH 9
--      itself is switched off only by verantwortung_lph9 = entfaellt (820-2-01). Severities unchanged (REQ-51 warn, REQ-52 block).
--      bauleistungen_vergeben reaches 820-2-24 (consumer_worksheets + 820-2-24); its hint names the new effect.
--      "Yes" = everything as today. Unanswered = the fields stay visible and REQ-52 waits (refuses approval, names the question).
--      Owner, 2026-10-07 (verbatim): "what warranty? we are not giving warranty here".
--   2. 820-2-06 status_report_frequency: NEW token `halbjaehrlich` („Halbjährlich“ / „Every six months“), between quarterly and ad hoc
--      (ad_hoc order 5 → 6). Hint: the Merkblatt prints no cadence list; six-monthly is a tool option for contractually agreed cadences.
--      The only reader is REQ-08 (`status_report_frequency IS NOT NULL`, warn) — no equation reads the field.
--   3. M820-01 / M8203-01 project_size (optional copies): the hint sentence „Übernommen wird sie nur als Vorbelegung …“ is rewritten —
--      since the allow-list deploy (commit c9a655a) the 820-2-01 value carries over with the note „Übernommen aus DWA-M 820-2
--      (820-2-01)“ and counts as answered. The rest of the hint is byte-identical (replace() on the one sentence, DE and EN).
--
-- SOURCES (re-rendered 2026-10-07 from C:\Users\Ekowai\Desktop\Guidelines\DWA-M-820-2\DWA-M_820-2.pdf, scoop pdftotext -layout -enc UTF-8,
--   per-page match; printed page = PDF page − 2, checked on the page footers):
--   § 5.8.1 (PDF S. 63 / printed 61): „Die Gewährleistung bei Ingenieurleistungen hat zwei Aspekte. Zum einen muss der Auftragnehmer für
--     seine Leistungen die Gewährleistung übernehmen und zum anderen muss der Auftragnehmer – je nach Auftragsumfang – das Bauwerk
--     insbesondere innerhalb der Gewährleistungsfristen auf Mängel prüfen und diese weiterverfolgen.“ (see 60_ choices C-1)
--   § 5.8.2 (PDF S. 63 / 61): „Es wird ein Gewährleistungskalender, mit Angabe des Beginns und des Endes der jeweiligen
--     Gewährleistungsfristen, für jeden Auftragnehmer und für jede ausführende Firma geführt.“ · „Die Abnahmen werden mit Angabe des
--     Beginns und des Endes der jeweiligen Gewährleistungsfrist dokumentiert.“
--   § 5.8.3 (PDF S. 64 / 62): „Festgestellte Mängel sind zeitnah zum Auftreten bei der ausführenden Firma zu rügen.“ · „Eine konsequente
--     Verfolgung der Gewährleistungszeit, insbesondere die Mängelverfolgung der erbrachten Werkleistungen, ist ein wichtiges Element zu
--     einem kostengünstigen Betrieb der Anlagen.“ · „Es ist festgelegt, wer für die Phase LPH 9 verantwortlich ist.“ (REQ-52-2, kept)
--   § 4.1 (PDF S. 21 / 19): „Auch der Auftraggeber selbst bringt neben seinen (nicht delegierbaren) Bauherrenaufgaben (bspw.
--     Entscheidungen etc.) oft viele Eigenleistungen selbst ins Projekt ein.“
--   § 4.3.6 (PDF S. 27 / 25): „In der Regel werden mindestens vierteljährliche Statusberichte konsequent geführt.“ · „Der Berichtsturnus
--     sollte sich am Projekt- oder Baufortschritt orientieren. Es bietet sich in der Regel ein vierteljährlicher Turnus an.“
--     Anhang A (PDF S. 86 / 84) prints only „Periode: von … bis …“ — NO cadence list anywhere in 820-2.
--   Einleitung (PDF S. 13 / 11): „Darauf folgt das zweite Element, das sich mit der Zielsetzung und dem Optimierungspotenzial beschäftigt.“
--
-- Guards: every UPDATE matches the LIVE pre-state (prod-query 2026-10-07, after 20261007110000 was applied): gates md5 of condition +
-- description, severity, clause; fields md5 of description, visible_when, consumer_worksheets, md5 of enum_values, active only.
-- Idempotent (a re-run changes nothing). In-transaction archives compliance_requirements_archive_m820_sf / fields_archive_m820_sf +
-- ledger m820_sf_written (md5 of every row as written). No row is inserted, deleted, activated or deactivated.
-- Rollback:  scripts/rollback-20261007120000-m820-small-fixes.sql (byte-equal; a row edited after the apply is left alone).
-- Read-back: scripts/verification/apply/readback-20261007120000-m820-small-fixes.sql.
-- Order: AFTER 20261007110000 (decisions 48/50, live). Data only — no code prerequisite (c9a655a is already deployed for item 3).
-- STAGED — not applied.
BEGIN;

CREATE TABLE IF NOT EXISTS compliance_requirements_archive_m820_sf AS SELECT * FROM compliance_requirements WHERE false;
CREATE TABLE IF NOT EXISTS fields_archive_m820_sf AS SELECT * FROM fields WHERE false;
CREATE TABLE IF NOT EXISTS m820_sf_written (tbl text NOT NULL, id uuid NOT NULL, md5 text NOT NULL, PRIMARY KEY (tbl, id));

-- ── 1. 820-2-24 routing by bauleistungen_vergeben ──
-- DWA-M-820-2 820-2-17 bauleistungen_vergeben: consumer_worksheets (+ 820-2-24) and hint (names the 820-2-24 effect)
INSERT INTO fields_archive_m820_sf SELECT f.* FROM fields f, worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-17' AND f.symbol = 'bauleistungen_vergeben' AND f.active
   AND md5(coalesce(f.description, '')) = 'e1ac61e5749eeff30e82d8e1ce62970a' AND f.consumer_worksheets = ARRAY['820-2-18','820-2-19']::text[]
   AND NOT EXISTS (SELECT 1 FROM fields_archive_m820_sf a WHERE a.id = f.id);
UPDATE fields f
   SET consumer_worksheets = ARRAY['820-2-18','820-2-19','820-2-24']::text[],
       description = replace(replace(f.description,
         $m$Leistungsbeschreibungsart (820-2-18) und Vergabe-Zusammenfassung (820-2-19) werden ausgeblendet. Ohne Antwort warten die vier Prüfungen.$m$,
         $m$Leistungsbeschreibungsart (820-2-18), Vergabe-Zusammenfassung (820-2-19) und der Gewährleistungsteil von 820-2-24 (Gewährleistungsdaten, Gewährleistungskalender, Mängelverfolgung) werden ausgeblendet; die Gewährleistungsprüfungen REQ-51 und REQ-52 (820-2-24) gelten nicht – ohne vergebene Bauleistungen gibt es keine Gewährleistung ausführender Firmen. Ohne Antwort warten diese Prüfungen.$m$),
         $m$specification type (820-2-18) and award summary (820-2-19) are hidden. Unanswered, the four checks wait.$m$,
         $m$specification type (820-2-18), award summary (820-2-19) and the warranty part of 820-2-24 (warranty dates, warranty calendar, defect tracking) are hidden; the warranty checks REQ-51 and REQ-52 (820-2-24) do not apply – without awarded construction works there is no warranty of executing firms. Unanswered, these checks wait.$m$)
  FROM worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-17' AND f.symbol = 'bauleistungen_vergeben' AND f.active
   AND md5(coalesce(f.description, '')) = 'e1ac61e5749eeff30e82d8e1ce62970a' AND f.consumer_worksheets = ARRAY['820-2-18','820-2-19']::text[];
-- DWA-M-820-2 820-2-24 warranty_start_date / warranty_end_date / defect_tracking_active: visible_when (+ bauleistungen_vergeben == true)
INSERT INTO fields_archive_m820_sf SELECT f.* FROM fields f, worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-24' AND f.active
   AND f.symbol IN ('warranty_start_date', 'warranty_end_date', 'defect_tracking_active')
   AND f.visible_when = $m$verantwortung_lph9 != 'entfaellt'$m$
   AND NOT EXISTS (SELECT 1 FROM fields_archive_m820_sf a WHERE a.id = f.id);
UPDATE fields f
   SET visible_when = $m$(verantwortung_lph9 != 'entfaellt') AND (bauleistungen_vergeben == true)$m$
  FROM worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-24' AND f.active
   AND f.symbol IN ('warranty_start_date', 'warranty_end_date', 'defect_tracking_active')
   AND f.visible_when = $m$verantwortung_lph9 != 'entfaellt'$m$;
-- DWA-M-820-2 820-2-24 gewaehrleistungen / warranty_count / warranty_open_defects: visible_when (register + its two counts, hidden together)
INSERT INTO fields_archive_m820_sf SELECT f.* FROM fields f, worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-24' AND f.active
   AND f.symbol IN ('gewaehrleistungen', 'warranty_count', 'warranty_open_defects')
   AND f.visible_when IS NULL
   AND NOT EXISTS (SELECT 1 FROM fields_archive_m820_sf a WHERE a.id = f.id);
UPDATE fields f
   SET visible_when = $m$bauleistungen_vergeben == true$m$
  FROM worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-24' AND f.active
   AND f.symbol IN ('gewaehrleistungen', 'warranty_count', 'warranty_open_defects')
   AND f.visible_when IS NULL;
-- DWA-M-820-2 820-2-24 REQ-51 (warn): condition (+ bauleistungen_vergeben guard), description
INSERT INTO compliance_requirements_archive_m820_sf SELECT cr.* FROM compliance_requirements cr, worksheet_templates w, standards s
 WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-24' AND cr.code = 'REQ-51'
   AND md5(cr.condition) = '2a24260ced0997a34b5316dd739da335' AND cr.severity = 'warn' AND md5(coalesce(cr.description, '')) = 'f65d6c9e6bd01de5f633549b6255e0a9'
   AND cr.clause_reference IS NOT DISTINCT FROM $m$§5.8.2$m$
   AND NOT EXISTS (SELECT 1 FROM compliance_requirements_archive_m820_sf a WHERE a.id = cr.id);
UPDATE compliance_requirements cr
   SET condition = $m$IF verantwortung_lph9 != 'entfaellt' THEN (IF bauleistungen_vergeben == true THEN (warranty_count >= 1))$m$,
       description = $m$Warnt (sperrt die Freigabe nicht), solange LPH 9 stattfindet (820-2-01: verantwortung_lph9 ≠ entfällt), Bauleistungen an ausführende Firmen vergeben werden (820-2-17: bauleistungen_vergeben = ja) und der Gewährleistungskalender (gewaehrleistungen, dieses Blatt) keine vollständige Zeile hat (warranty_count ≥ 1). Erbringt der Auftraggeber die Bauleistungen selbst (bauleistungen_vergeben = nein; § 4.1, S. 19: „Auch der Auftraggeber selbst bringt neben seinen (nicht delegierbaren) Bauherrenaufgaben (bspw. Entscheidungen etc.) oft viele Eigenleistungen selbst ins Projekt ein.“), gibt es keine Gewährleistung ausführender Firmen: die Prüfung gilt dann nicht, der Gewährleistungsteil dieses Blatts ist ausgeblendet. Vollständig ist eine Zeile mit Auftragnehmer/Firma, Abnahme, Beginn und Ende der Gewährleistungsfrist; eine Zeile ohne Beginn oder Ende meldet das Speichern als unvollständig, sie wird nicht gezählt. § 5.8.2 (S. 61): „Die Abnahmen werden mit Angabe des Beginns und des Endes der jeweiligen Gewährleistungsfrist dokumentiert.“ „Es wird ein Gewährleistungskalender, mit Angabe des Beginns und des Endes der jeweiligen Gewährleistungsfristen, für jeden Auftragnehmer und für jede ausführende Firma geführt.“ Je Auftragnehmer und ausführender Firma eine Zeile anlegen. Gedruckt ist ein Zielbild im Indikativ ohne Modalverb (zweites Element des Qualitätsbausteins, Einleitung S. 11: „Darauf folgt das zweite Element, das sich mit der Zielsetzung und dem Optimierungspotenzial beschäftigt.“) – deshalb Warnung.
[EN] Warns (does not block approval) while LPH 9 takes place (820-2-01: verantwortung_lph9 ≠ does not occur), construction works are awarded to executing firms (820-2-17: bauleistungen_vergeben = yes) and the warranty calendar (gewaehrleistungen, this sheet) has no complete row (warranty_count ≥ 1). If the client performs the construction works itself (bauleistungen_vergeben = no; § 4.1, p. 19: "the client himself often contributes many own services to the project besides his (non-delegable) client tasks (e.g. decisions etc.)"), there is no warranty of executing firms: the check does not apply and the warranty part of this sheet is hidden. A row is complete with contractor/firm, acceptance, start and end of the warranty period; saving reports a row without start or end as incomplete, and it is not counted. § 5.8.2 (p. 61): "the acceptances are documented with the start and end of the respective warranty period." "A warranty calendar with the start and end of the respective warranty periods is kept for every contractor and every executing firm." Add one row per contractor and executing firm. What is printed is a target state in the indicative, without a modal verb (second element of the quality module, introduction p. 11: "then follows the second element, dealing with the objective and the optimisation potential") – hence a warning.$m$
  FROM worksheet_templates w, standards s
 WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-24' AND cr.code = 'REQ-51'
   AND md5(cr.condition) = '2a24260ced0997a34b5316dd739da335' AND cr.severity = 'warn' AND md5(coalesce(cr.description, '')) = 'f65d6c9e6bd01de5f633549b6255e0a9'
   AND cr.clause_reference IS NOT DISTINCT FROM $m$§5.8.2$m$;
-- DWA-M-820-2 820-2-24 REQ-52 (block, stays block): condition (+ bauleistungen_vergeben guard), description
INSERT INTO compliance_requirements_archive_m820_sf SELECT cr.* FROM compliance_requirements cr, worksheet_templates w, standards s
 WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-24' AND cr.code = 'REQ-52'
   AND md5(cr.condition) = 'ac82bc47d7fa8a498f4ea2193993b3e5' AND cr.severity = 'block' AND md5(coalesce(cr.description, '')) = '3417a3f5501c220674e71a863f5b6dcb'
   AND cr.clause_reference IS NOT DISTINCT FROM $m$§5.8.3$m$
   AND NOT EXISTS (SELECT 1 FROM compliance_requirements_archive_m820_sf a WHERE a.id = cr.id);
UPDATE compliance_requirements cr
   SET condition = $m$IF verantwortung_lph9 != 'entfaellt' THEN (IF bauleistungen_vergeben == true THEN (defect_tracking_active == true))$m$,
       description = $m$Sperrt die Freigabe, bis defect_tracking_active (dieses Blatt) bestätigt ist – solange LPH 9 stattfindet (820-2-01: verantwortung_lph9 ≠ entfällt) und Bauleistungen an ausführende Firmen vergeben werden (820-2-17: bauleistungen_vergeben = ja). § 5.8.3 (S. 62): „Festgestellte Mängel sind zeitnah zum Auftreten bei der ausführenden Firma zu rügen.“ Zielbild: „Eine konsequente Verfolgung der Gewährleistungszeit, insbesondere die Mängelverfolgung der erbrachten Werkleistungen, ist ein wichtiges Element zu einem kostengünstigen Betrieb der Anlagen.“ Erbringt der Auftraggeber die Bauleistungen selbst (bauleistungen_vergeben = nein), gibt es keine ausführende Firma, bei der Mängel zu rügen wären: die Prüfung gilt dann nicht, defect_tracking_active ist ausgeblendet. Solange bauleistungen_vergeben offen ist, wartet sie (sperrt) und nennt die Frage.
[EN] Blocks approval until defect_tracking_active (this sheet) is confirmed – while LPH 9 takes place (820-2-01: verantwortung_lph9 ≠ does not occur) and construction works are awarded to executing firms (820-2-17: bauleistungen_vergeben = yes). § 5.8.3 (p. 62): "defects found are to be notified to the executing firm promptly after they occur." Target state: "consistent tracking of the warranty period, in particular defect tracking of the works performed, is an important element of cost-effective plant operation." If the client performs the construction works itself (bauleistungen_vergeben = no), there is no executing firm to notify defects to: the check does not apply and defect_tracking_active is hidden. While bauleistungen_vergeben is open, it waits (blocks) and names the question.$m$
  FROM worksheet_templates w, standards s
 WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-24' AND cr.code = 'REQ-52'
   AND md5(cr.condition) = 'ac82bc47d7fa8a498f4ea2193993b3e5' AND cr.severity = 'block' AND md5(coalesce(cr.description, '')) = '3417a3f5501c220674e71a863f5b6dcb'
   AND cr.clause_reference IS NOT DISTINCT FROM $m$§5.8.3$m$;

-- ── 2. 820-2-06 status_report_frequency: token halbjaehrlich ──
INSERT INTO fields_archive_m820_sf SELECT f.* FROM fields f, worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-06' AND f.symbol = 'status_report_frequency' AND f.active
   AND md5(coalesce(f.description, '')) = '66d2a8b410df95dd42e834b3b41e183d' AND md5(f.enum_values::text) = 'd2decaa24d8b2c1c43c22053e89dfb2a'
   AND NOT EXISTS (SELECT 1 FROM fields_archive_m820_sf a WHERE a.id = f.id);
UPDATE fields f
   SET enum_values = $m$[{"value": "weekly", "label_de": "Wöchentlich", "label_en": "Weekly", "order_index": 1, "regulation_reference": "§4.3.6"}, {"value": "biweekly", "label_de": "Zweiwöchentlich", "label_en": "Biweekly", "order_index": 2, "regulation_reference": "§4.3.6"}, {"value": "monthly", "label_de": "Monatlich", "label_en": "Monthly", "order_index": 3, "regulation_reference": "§4.3.6"}, {"value": "quarterly", "label_de": "Quartalsweise", "label_en": "Quarterly", "order_index": 4, "regulation_reference": "§4.3.6"}, {"value": "halbjaehrlich", "label_de": "Halbjährlich", "label_en": "Every six months", "order_index": 5}, {"value": "ad_hoc", "label_de": "Anlassbezogen", "label_en": "Ad hoc", "order_index": 6, "regulation_reference": "§4.3.6"}]$m$::jsonb,
       description = $m$Takt der Statusberichte. § 4.3.6 (S. 25): „In der Regel werden mindestens vierteljährliche Statusberichte konsequent geführt.“ „Der Berichtsturnus sollte sich am Projekt- oder Baufortschritt orientieren. Es bietet sich in der Regel ein vierteljährlicher Turnus an.“ Das Merkblatt druckt keine Auswahlliste von Berichtstakten (Anhang A, S. 84, sieht nur „Periode: von … bis …“ vor); die Optionen sind Werkzeug-Optionen. „Halbjährlich“ ist eine Werkzeug-Option für vertraglich vereinbarte Berichtstakte (z. B. ein Fortschrittsbericht alle sechs Monate laut Dienstleistungsvertrag); sie liegt unter dem gedruckten Regelfall „mindestens vierteljährlich“, den „in der Regel“ für Ausnahmen offen lässt. REQ-08 prüft nur, dass ein Takt gewählt ist.
[EN] Cadence of status reports. § 4.3.6 (p. 25): "as a rule, at least quarterly status reports are kept consistently." "The reporting cycle should follow the project or construction progress. As a rule a quarterly cycle suggests itself." The Merkblatt prints no list of reporting cadences (Annex A, p. 84, only provides "period: from … to …"); the options are tool options. "Every six months" is a tool option for contractually agreed cadences (e.g. a progress report every six months under the service contract); it is below the printed normal case "at least quarterly", which "as a rule" leaves open for exceptions. REQ-08 only checks that a cadence is chosen.$m$
  FROM worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-06' AND f.symbol = 'status_report_frequency' AND f.active
   AND md5(coalesce(f.description, '')) = '66d2a8b410df95dd42e834b3b41e183d' AND md5(f.enum_values::text) = 'd2decaa24d8b2c1c43c22053e89dfb2a';

-- ── 3. project_size copies (M820-01, M8203-01): the pre-fill sentence → carried over + counts as answered ──
INSERT INTO fields_archive_m820_sf SELECT f.* FROM fields f, worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND f.symbol = 'project_size' AND f.active
   AND ((s.code = 'DWA-M-820-1' AND w.code = 'M820-01' AND md5(coalesce(f.description, '')) = '346403c64dc5001a7e44d90ddb6e8856')
     OR (s.code = 'DWA-M-820-3' AND w.code = 'M8203-01' AND md5(coalesce(f.description, '')) = 'c559af4ee6359fc3a81901db419d829f'))
   AND NOT EXISTS (SELECT 1 FROM fields_archive_m820_sf a WHERE a.id = f.id);
UPDATE fields f
   SET description = replace(replace(f.description,
         $m$Übernommen wird sie nur als Vorbelegung: solange dieses Blatt keine eigene Antwort hat und alle im Projekt gespeicherten Antworten übereinstimmen, zeigt die Seite die dort gewählte Größe an; hier überschreibbar.$m$,
         $m$Die dort gespeicherte Größe wird übernommen: solange dieses Blatt keine eigene Antwort hat, zeigt die Seite sie mit dem Hinweis „Übernommen aus DWA-M 820-2 (820-2-01)“ an, und sie zählt hier als beantwortet; hier überschreibbar.$m$),
         $m$It is carried over only as a pre-fill: while this sheet has no own answer and all answers saved in the project agree, the page shows the size chosen there; it can be overwritten here.$m$,
         $m$The size saved there is taken over: while this sheet has no own answer, the page shows it with the note "taken from DWA-M 820-2 (820-2-01)", and it counts as answered here; it can be overwritten here.$m$)
  FROM worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND f.symbol = 'project_size' AND f.active
   AND ((s.code = 'DWA-M-820-1' AND w.code = 'M820-01' AND md5(coalesce(f.description, '')) = '346403c64dc5001a7e44d90ddb6e8856')
     OR (s.code = 'DWA-M-820-3' AND w.code = 'M8203-01' AND md5(coalesce(f.description, '')) = 'c559af4ee6359fc3a81901db419d829f'));

-- ── ledger: md5 of every archived row as this block left it (the rollback restores only rows still in that state) ──
INSERT INTO m820_sf_written (tbl, id, md5) SELECT 'compliance_requirements', x.id, md5(row_to_json(x)::text) FROM compliance_requirements x WHERE x.id IN (SELECT id FROM compliance_requirements_archive_m820_sf) ON CONFLICT DO NOTHING;
INSERT INTO m820_sf_written (tbl, id, md5) SELECT 'fields', x.id, md5(row_to_json(x)::text) FROM fields x WHERE x.id IN (SELECT id FROM fields_archive_m820_sf) ON CONFLICT DO NOTHING;

COMMIT;
