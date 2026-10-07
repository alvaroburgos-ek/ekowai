-- 20261007100000_m820_project_size_declaration.sql · DWA-M 820-1 / -2 / -3: project-size SELF-DECLARATION (declaration only).
-- Owner intent 2026-10-06: one workflow with the same sheets for every project size; the depth is set by the printed modal verb
-- (block 20261006240000, applied). What remains of the size design (vault 01-Projects/ekowai-wizard/m820-wizard-test/
-- 39_DESIGN-project-size-option_2026-10-06.md, sections 1-2, RU-1 / RU-2 / RU-3 / RU-7) is the DECLARATION only:
-- no severity change, no required-field change, no visible_when by size, no gate. Apply order: 49_APPLY-ORDER-m820-project-size-
-- declaration.md. Sign-off: 50_SIGN-OFF-m820-project-size-declaration.md. Pattern: 20261006170000 (field insert, NOT EXISTS).
--
-- WHAT THE PROJECT TEAM SEES (plain English):
--   820-2-01 (section B): beside the required "Projektgröße" (klein / mittel / groß, unchanged) a new optional text
--     "Begründung der Einstufung" — one or two sentences why the project is small / medium / large (construction cost, number of
--     measures, number of client contacts, complexity). The hint quotes where the guideline scales depth with size / complexity,
--     says plainly that the guideline prints no size classes, and that the classification relaxes no printed requirement.
--   M820-01 (820-1) and M8203-01 (820-3), section B: an OPTIONAL "Projektgröße" with the identical tokens and labels. Same hint,
--     plus: same answer as on 820-2-01; the page pre-fills it only while this sheet has no own answer and every saved answer in the
--     project agrees. Nothing reads it (no gate, no equation, no visibility).
--   `complexity_level` (820-2-01) and the 820-2-01 `project_size` row stay exactly as they are.
--
-- SOURCE (re-read 2026-10-07 on the RENDERED PDF: scoop pdftotext -layout -enc UTF-8 of
--   C:\Users\Ekowai\Desktop\Guidelines\DWA-M-820-{1,2,3}\DWA-M_820-{1,2,3}.pdf, whitespace-normalised match per PDF page; printed page =
--   PDF page - 2 in all three parts, checked on the page footers):
--   [S1] 820-1 Anhang A Risikoanalyse, PDF p. 45 (printed 43): "… sollte zu verschiedenen Phasen eines Projekts und in unterschiedlicher
--        Tiefe durchgeführt werden. Je nach Größe, Struktur und Komplexität eines Projekts, sowohl in technischer, baulicher,
--        wirtschaftlicher oder auch in organisatorischer Hinsicht, ist bereits im Rahmen der Bedarfsplanung die Durchführung einer
--        Risikoanalyse hilfreich."
--   [S2] 820-1 § 5.2 Auftraggeber, PDF p. 25-26 (printed 23-24): "Der Auftraggeber muss in einem der Projektgröße angepassten
--        Projekthandbuch Kompetenzen – z. B. bis zu welcher Höhe welcher Auftraggebervertreter Aufträge erteilen darf – und
--        Verantwortlichkeiten regeln und das für jede beteiligte Person."
--   [S3] 820-1 § 6.2 Bedarfsplanung Konzept, PDF p. 29 (printed 27): "Die Bedarfsplanung für Konzepte … ist auf Basis der Hinweise in
--        6.1 in Abhängigkeit von der Größenordnung und der Komplexität des Konzepts zu erarbeiten."
--   [S4] 820-2 § 4.1 Allgemeines, PDF p. 21 (printed 19): "Abhängig von der Projektgröße und der Projektart sind die Anforderungen an
--        ein wirksames Projektmanagement in den Inhalten sowie im Aufwand unterschiedlich und deshalb mit unterschiedlich vielen
--        Ressourcen zu belegen."
--   [S5] 820-2 § 4.3.5, PDF p. 27 (printed 25): "Inhalte und Umfang des projektspezifischen Projekthandbuchs richten sich nach der
--        Komplexität des jeweiligen Projekts und sind auf das Notwendige beschränkt."
--   [S6] 820-2 § 5.3.4, PDF p. 43 (printed 41): "Je nach Schwierigkeitsgrad und Situation sind unterschiedliche Planungstiefen
--        erforderlich, um Planungsentscheidungen zu treffen."
--   [S7] 820-3 Anhang B.2 Nr. 36, PDF p. 30 (printed 28): "Schriftliche Form oder Präsentation, je nach Projektgröße und
--        Maßnahmenumfang"
--   [S8] 820-3 Anhang B.3 Nr. 38, PDF p. 34 (printed 32): "Der Umfang und die Form der Dokumentation sind auf die auszuführenden
--        Maßnahmen abzustimmen (Verhältnismäßigkeit wahren)"
--   [S9] 820-3 § 1 Anwendungsbereich, PDF p. 9 (printed 7): "Die vollständige Ablaufstruktur für Projekte aller Art ergibt sich aus der
--        eigenverantwortlichen Anwendung und projektspezifischen Anpassung der im Merkblatt vorgelegten Hinweise."
--   NO SIZE CLASSES: searched all three rendered texts for Größenklasse / kleine(re) / große / größere Projekte / Projektgrößen —
--   only the Anhang-A "Beispiel … eines großen Projekts" (820-1 p. 24) and the status-report form note (820-2 p. 27) occur; no
--   part prints a class, a threshold or a definition of klein / mittel / groß. The tokens are the tool's; the engineer declares.
--
-- CARRY-OVER DECISION (brief item 2): the cross-standard allow-list (src/lib/projects/cross-standard-carry.ts CROSS_STANDARD_CARRY)
--   is a TypeScript constant — an entry is a code change, so it is NOT added here (owner item, 50_ PS-2). Without it, the existing
--   page prefill (worksheet page step 2: loadSameSymbolValues → selectPrefillUpstreams → coerceSameSymbolValue) already offers the
--   820-2-01 answer on the copies, because the symbol and the token set are identical (the enum check passes); it shows no
--   "taken from" note and is used only while the sheet has no own answer and all saved answers of the project agree. The own-value
--   rule (A4) does not count it for the copy — irrelevant, the copies are optional. No gate reads `project_size` anywhere.
--
-- WHAT THIS BLOCK DOES (idempotent; NOT EXISTS guards; no existing row is changed, so nothing is archived):
--   1. 820-2-01 new optional text `project_size_begruendung` (section B).
--   2. M820-01 (DWA-M-820-1) new optional enum `project_size` (section B), tokens klein / mittel / gross, labels as on 820-2-01.
--   3. M8203-01 (DWA-M-820-3) the same.
-- STAGED — not applied. Apply (from C:\Users\Ekowai\_wt-g2t, which holds .env.local):
--   node scripts/apply-migration.mjs C:\Users\Ekowai\_wt-m820\scripts\migrations\20261007100000_m820_project_size_declaration.sql
-- Rollback:  C:\Users\Ekowai\_wt-m820\scripts\rollback-20261007100000-m820-project-size-declaration.sql
-- Read-back: C:\Users\Ekowai\_wt-m820\scripts\verification\apply\readback-20261007100000-m820-project-size-declaration.sql
BEGIN;

-- 1. 820-2-01 — reason for the size classification (section B, next to project_size)
INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, description, verification_status, verification_quote, source_anchor, widget, ui_config, lookup, visible_when, enum_values, consumer_worksheets, order_index, active)
SELECT w.id, (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'B'), 'project_size_begruendung', 'Begründung der Einstufung (Projektgröße)', 'Reason for the size classification', 'text', NULL, false, '§4.1',
       'Begründung der gewählten Projektgröße in ein bis zwei Sätzen, z. B. geschätzte Baukosten, Anzahl der Maßnahmen, Anzahl der Ansprechpartner beim Auftraggeber, Komplexität. Die Merkblätter DWA-M 820-1/-2/-3 drucken keine Größenklassen: die Einstufung klein / mittel / groß trifft der Ingenieur selbst und begründet sie hier. Gedruckt ist, dass Tiefe und Aufwand mit Größe und Komplexität skalieren:
– 820-2 § 4.1 (PDF S. 21): „Abhängig von der Projektgröße und der Projektart sind die Anforderungen an ein wirksames Projektmanagement in den Inhalten sowie im Aufwand unterschiedlich und deshalb mit unterschiedlich vielen Ressourcen zu belegen.“
– 820-2 § 4.3.5 (PDF S. 27): „Inhalte und Umfang des projektspezifischen Projekthandbuchs richten sich nach der Komplexität des jeweiligen Projekts und sind auf das Notwendige beschränkt.“
– 820-2 § 5.3.4 (PDF S. 43): „Je nach Schwierigkeitsgrad und Situation sind unterschiedliche Planungstiefen erforderlich, um Planungsentscheidungen zu treffen.“
– 820-1 Anhang A (PDF S. 45): die vertiefte Auseinandersetzung mit den Risikoeinschätzungen „… sollte zu verschiedenen Phasen eines Projekts und in unterschiedlicher Tiefe durchgeführt werden. Je nach Größe, Struktur und Komplexität eines Projekts … ist bereits im Rahmen der Bedarfsplanung die Durchführung einer Risikoanalyse hilfreich.“
– 820-1 § 5.2 (PDF S. 25): „Der Auftraggeber muss in einem der Projektgröße angepassten Projekthandbuch Kompetenzen … und Verantwortlichkeiten regeln …“; § 6.2 (PDF S. 29): Bedarfsplanung für Konzepte „in Abhängigkeit von der Größenordnung und der Komplexität des Konzepts zu erarbeiten“.
– 820-3 Anhang B.2 Nr. 36 (PDF S. 30): „Schriftliche Form oder Präsentation, je nach Projektgröße und Maßnahmenumfang“; Anhang B.3 Nr. 38 (PDF S. 34): „Der Umfang und die Form der Dokumentation sind auf die auszuführenden Maßnahmen abzustimmen (Verhältnismäßigkeit wahren)“.
Die Einstufung lockert keine gedruckte Anforderung: Pflichtfelder, Prüfungen und ihre Schwere (nach dem gedruckten Modalverb) sind für jede Größe gleich. Die Größe kann begründen, dass eine Antwort kürzer ausfällt; sie entbindet von keiner Antwort. Nicht verpflichtend, keine Prüfung.
[EN] Reason for the chosen project size in one or two sentences, e.g. estimated construction cost, number of measures, number of contacts on the client side, complexity. DWA-M 820-1/-2/-3 print no size classes: the engineer declares small / medium / large and gives the reason here. What is printed is that depth and effort scale with size and complexity:
– 820-2 § 4.1 (PDF p. 21): "Depending on project size and project type, the requirements for effective project management differ in content and effort and are therefore to be resourced differently."
– 820-2 § 4.3.5 (PDF p. 27): "Content and scope of the project-specific project handbook follow the complexity of the project and are limited to what is necessary."
– 820-2 § 5.3.4 (PDF p. 43): "Depending on difficulty and situation, different planning depths are required to take planning decisions."
– 820-1 Annex A (PDF p. 45): the in-depth discussion of the risk assessments "should be carried out in different phases of a project and at different depth. Depending on the size, structure and complexity of a project … a risk analysis is already helpful during needs planning."
– 820-1 § 5.2 (PDF p. 25): "The client must set out competences … and responsibilities in a project handbook adapted to the project size …"; § 6.2 (PDF p. 29): needs planning for concepts is to be prepared "according to the scale and complexity of the concept".
– 820-3 Annex B.2 No. 36 (PDF p. 30): "Written form or presentation, depending on project size and scope of works"; Annex B.3 No. 38 (PDF p. 34): "Scope and form of the documentation are to be matched to the works to be carried out (keep proportionality)".
The classification relaxes no printed requirement: required fields, checks and their severity (by the printed modal verb) are the same for every size. Size can justify a shorter answer; it never removes an answer. Optional, no check.',
       'imported_unverified', 'Abhängig von der Projektgröße und der Projektart sind die Anforderungen an ein wirksames Projektmanagement in den Inhalten sowie im Aufwand unterschiedlich und deshalb mit unterschiedlich vielen Ressourcen zu belegen.', 'DWA-M 820-2 §4.1 (PDF S. 21)',
       NULL, NULL, NULL, NULL, NULL, NULL, (SELECT COALESCE(MAX(f3.order_index), 0) + 1 FROM fields f3 WHERE f3.worksheet_template_id = w.id), true
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE s.code = 'DWA-M-820-2' AND w.code = '820-2-01'
   AND NOT EXISTS (SELECT 1 FROM fields f2 WHERE f2.worksheet_template_id = w.id AND f2.symbol = 'project_size_begruendung');

-- 2. + 3. M820-01 (820-1) and M8203-01 (820-3) — optional copy of the size question, identical tokens and labels
INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, description, verification_status, verification_quote, source_anchor, widget, ui_config, lookup, visible_when, enum_values, consumer_worksheets, order_index, active)
SELECT w.id, (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'B'), 'project_size', 'Projektgröße', 'Project size', 'enum', NULL, false, v.clause,
       'Gleiche Antwort wie auf DWA-M 820-2, Blatt 820-2-01 (dort Pflichtfeld, mit Begründung der Einstufung). Übernommen wird sie nur als Vorbelegung: solange dieses Blatt keine eigene Antwort hat und alle im Projekt gespeicherten Antworten übereinstimmen, zeigt die Seite die dort gewählte Größe an; hier überschreibbar. Keine Prüfung liest dieses Feld, nicht verpflichtend.
Die Merkblätter DWA-M 820-1/-2/-3 drucken keine Größenklassen: die Einstufung klein / mittel / groß trifft der Ingenieur selbst (z. B. nach Baukosten, Anzahl der Maßnahmen, Anzahl der Ansprechpartner beim Auftraggeber, Komplexität). Gedruckt ist, dass Tiefe und Aufwand mit Größe und Komplexität skalieren, u. a. ' || v.quote_de || ' Die Einstufung lockert keine gedruckte Anforderung: Pflichtfelder, Prüfungen und ihre Schwere (nach dem gedruckten Modalverb) sind für jede Größe gleich.
[EN] Same answer as on DWA-M 820-2 sheet 820-2-01 (required there, with the reason for the classification). It is carried over only as a pre-fill: while this sheet has no own answer and all answers saved in the project agree, the page shows the size chosen there; it can be overwritten here. No check reads this field; optional.
DWA-M 820-1/-2/-3 print no size classes: the engineer declares small / medium / large (e.g. by construction cost, number of measures, number of client contacts, complexity). What is printed is that depth and effort scale with size and complexity, e.g. ' || v.quote_en || ' The classification relaxes no printed requirement: required fields, checks and their severity (by the printed modal verb) are the same for every size.',
       'imported_unverified', v.vquote, v.anchor,
       NULL, NULL, NULL, NULL,
       '[{"value": "klein", "label_de": "Klein", "label_en": "Small", "order_index": 1}, {"value": "mittel", "label_de": "Mittel", "label_en": "Medium", "order_index": 2}, {"value": "gross", "label_de": "Groß", "label_en": "Large", "order_index": 3}]'::jsonb,
       NULL, (SELECT COALESCE(MAX(f3.order_index), 0) + 1 FROM fields f3 WHERE f3.worksheet_template_id = w.id), true
  FROM (VALUES
    ('DWA-M-820-1', 'M820-01', 'Anhang A; §5.2; §6.2',
     '820-1 Anhang A (PDF S. 45): „Je nach Größe, Struktur und Komplexität eines Projekts … ist bereits im Rahmen der Bedarfsplanung die Durchführung einer Risikoanalyse hilfreich.“ (die Auseinandersetzung mit den Risikoeinschätzungen „… sollte … in unterschiedlicher Tiefe durchgeführt werden“); § 5.2 (PDF S. 25): „Der Auftraggeber muss in einem der Projektgröße angepassten Projekthandbuch Kompetenzen … und Verantwortlichkeiten regeln …“; § 6.2 (PDF S. 29): Bedarfsplanung für Konzepte „in Abhängigkeit von der Größenordnung und der Komplexität des Konzepts zu erarbeiten“; 820-2 § 4.1 (PDF S. 21): „Abhängig von der Projektgröße und der Projektart sind die Anforderungen an ein wirksames Projektmanagement in den Inhalten sowie im Aufwand unterschiedlich …“.',
     '820-1 Annex A (PDF p. 45): "Depending on the size, structure and complexity of a project … a risk analysis is already helpful during needs planning." (the discussion of the risk assessments "should be carried out … at different depth"); § 5.2 (PDF p. 25): "The client must set out competences … and responsibilities in a project handbook adapted to the project size …"; § 6.2 (PDF p. 29): needs planning for concepts "according to the scale and complexity of the concept"; 820-2 § 4.1 (PDF p. 21): "Depending on project size and project type, the requirements for effective project management differ in content and effort …".',
     'Je nach Größe, Struktur und Komplexität eines Projekts, sowohl in technischer, baulicher, wirtschaftlicher oder auch in organisatorischer Hinsicht, ist bereits im Rahmen der Bedarfsplanung die Durchführung einer Risikoanalyse hilfreich.',
     'DWA-M 820-1 Anhang A (PDF S. 45)'),
    ('DWA-M-820-3', 'M8203-01', '§1; Anhang B.2 Nr. 36; Anhang B.3 Nr. 38',
     '820-3 § 1 (PDF S. 9): „Die vollständige Ablaufstruktur für Projekte aller Art ergibt sich aus der eigenverantwortlichen Anwendung und projektspezifischen Anpassung der im Merkblatt vorgelegten Hinweise.“; Anhang B.2 Nr. 36 (PDF S. 30): „Schriftliche Form oder Präsentation, je nach Projektgröße und Maßnahmenumfang“; Anhang B.3 Nr. 38 (PDF S. 34): „Der Umfang und die Form der Dokumentation sind auf die auszuführenden Maßnahmen abzustimmen (Verhältnismäßigkeit wahren)“; 820-2 § 4.1 (PDF S. 21): „Abhängig von der Projektgröße und der Projektart sind die Anforderungen an ein wirksames Projektmanagement in den Inhalten sowie im Aufwand unterschiedlich …“.',
     '820-3 § 1 (PDF p. 9): "The complete process structure for projects of all kinds follows from the responsible application and project-specific adaptation of the guidance in this Merkblatt."; Annex B.2 No. 36 (PDF p. 30): "Written form or presentation, depending on project size and scope of works"; Annex B.3 No. 38 (PDF p. 34): "Scope and form of the documentation are to be matched to the works to be carried out (keep proportionality)"; 820-2 § 4.1 (PDF p. 21): "Depending on project size and project type, the requirements for effective project management differ in content and effort …".',
     'Schriftliche Form oder Präsentation, je nach Projektgröße und Maßnahmenumfang',
     'DWA-M 820-3 Anhang B.2 Nr. 36 (PDF S. 30)')
  ) AS v(std, ws, clause, quote_de, quote_en, vquote, anchor)
  JOIN standards s ON s.code = v.std
  JOIN worksheet_templates w ON w.standard_id = s.id AND w.code = v.ws
 WHERE NOT EXISTS (SELECT 1 FROM fields f2 WHERE f2.worksheet_template_id = w.id AND f2.symbol = 'project_size');

COMMIT;
