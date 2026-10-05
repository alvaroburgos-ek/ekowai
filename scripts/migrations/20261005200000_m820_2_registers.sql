-- 20261005200000_m820_2_registers.sql · DWA-M 820-2 "+ row" registers for documenting a project as it happens.
-- Owner request 2026-10-05 (verbatim): "when we have more to document as initial steps probably we can add fields or rows?
--   as the steps? or when changes are done? or emails or notification sents? just make sure it fits to our requirments"
--
-- WHAT THE PROJECT TEAM GETS (plain English):
--   820-2-03 Kommunikation und Verträge  · NEW register "Korrespondenz und Mitteilungen" (one row per email, letter, notice,
--            call, meeting) + counters: entries, open follow-ups (follow-up needed AND not done). Not required.
--   820-2-05 Projektorganisation         · NEW register "Projektschritte" (one row per step: planned / in progress / done)
--            + counters: steps, open steps. Not required.
--   820-2-06 Statusberichte              · NEW register "Statusberichte" (one row per issued status report, with traffic
--            lights) + counter: reports. Not required.
--   820-2-21 Bauänderungen / Nachträge   · the existing change_orders register gains two columns, "Auslöser / Verursacher"
--            and "Kostenübernahme" (existing columns and stored rows untouched) + counter of rows missing either + NEW block
--            gate REQ-09-2 (no change rows, or the counter == 0). No change rows = met.
--   820-2-10 Risikomanagement            · risk_register keeps its Tab. A.1 editor (3 assessors, M-Wert / S-Abw.); it gets a
--            DB register config (ui_config.editor = 'risk_register'), section C, and a counter of named risks. No gate.
--            NEW field risk_mitigation_plan = the DWA-M 820-1 Tab. A.2 measure plan (same editor as 820-1 M820-07). Not required.
--
-- SOURCES (re-read 2026-10-05 on the RENDERED PDFs with scoop pdftotext -layout; printed page = PDF page − 2;
--   L### = line of Desktop\Guidelines\DWA-M-820-2\DWA-M_820-2.md; T1-L### = line of ...\DWA-M-820-1\DWA-M_820-1.md):
--   [K1] § 5.3.1, L1124, PDF p. 42: "Die Kommunikation muss regelmäßig, vorbereitet, effektiv und dokumentiert sein." — EN "Communication must be regular, prepared, effective and documented."
--   [K2] § 5.3.1, L1120, PDF p. 42 (printed problem): "Ergebnisse und Entscheidungen werden nicht ausreichend dokumentiert und die Umsetzung anschließend nicht nachverfolgt." — EN "Results and decisions are not documented
--        sufficiently and their implementation is not followed up afterwards."
--   [K3] § 4.1, L545, PDF p. 22: "Aufgabenverfolgung und Plandokumentation, Dokumentenmanagement sind notwendig." — EN "Task tracking and plan documentation, document management are necessary."
--   [K4] § 4.1, L538, PDF p. 22: "Organisations- und Projekthandbuch: Projektablage, Formularwesen sind konsequent zu führen." — EN "Organisation and project handbook: project filing and forms are to be
--        kept consistently."
--   [K5] § 4.1, L539, PDF p. 22: "Reihenfolge der Vorgehensweise beschreiben, d. h. die Prozesse müssen geplant werden." — EN "Describe the order of the procedure, i.e. the processes must be planned."
--   [S1] § 2.1 Statusbericht, L375, PDF p. 15: "Auf der Grundlage der Projektplanung, im Wesentlichen im Hinblick auf Termine, Kosten und Qualitäten, gibt der Statusbericht den aktuellen Stand des Projekts zu festgelegten Zeitpunkten wieder." — EN "On the basis of the project planning, essentially regarding
--        schedule, costs and qualities, the status report shows the current state of the project at fixed points in time."
--   [S2] § 4.3.6, L677, PDF p. 27: "In der Regel werden mindestens vierteljährliche Statusberichte konsequent geführt." — EN "As a rule at least quarterly status reports are kept consistently."
--   [S3] § 4.3.6, L677, PDF p. 27: "Der Verteiler der Berichte muss sorgfältig vom Auftraggeber festgelegt werden und enthält immer auch das Planungsteam." — EN "The distribution list must be fixed carefully by the client and
--        always includes the planning team."
--   [S4] § 4.3.6, L681, PDF p. 27: "Darüber hinaus sind wichtige, bis zum nächsten Bericht geplante Arbeitsschritte, Korrekturmaßnahmen, Maßnahmen der Risikoverfolgung und Arbeitssicherheit enthalten." — EN "In addition, important work steps planned until the next report,
--        corrective measures, risk-tracking measures and occupational safety are included."
--   [S5] § 4.3.6, L681, PDF p. 27: "Hilfreich sind Ampeldarstellungen, wenigstens für Termine und Kosten." — EN "Traffic-light displays are helpful, at least for schedule and costs."
--   [S6] § 4.3.6, L686, PDF p. 27: "Es ist geregelt, wer die Statusberichte für das Projekt erstellt, wer auf die Vollständigkeit achtet und wer diesen freigibt." — EN "It is regulated who prepares the status reports, who checks
--        completeness and who releases them."
--   [S7] § 4.3.6, L690, PDF p. 27: "Bei gelben oder roten Ampeln bzw. anderen Hinweisen auf Zielabweichungen im Projekt greifen die entscheidungsbefugten Personen aktiv ein." — EN "With yellow or red lights … the decision-makers intervene actively."
--   [S8] Anhang A, L2527, PDF p. 86: "Periode: von … bis …" — EN "Period: from … to …"; Anhang A item 9 "Risikoanalyse und
--        Arbeitssicherheit" / 9.1 "Risikoanalyse" (L2548, PDF p. 86).
--   [C1] § 4.3.7, L706, PDF p. 28: "Der Auslöser bzw. Verursacher für die Projektänderung und die Kostenübernahmen werden geklärt und müssen in Textform dokumentiert werden." — EN "The trigger or originator of the project change and the cost bearing
--        are clarified and must be documented in text form."
--   [R1] § 4.8.2, L994, PDF p. 37: "Fundierte Risikoanalysen (Hinweise gibt Merkblatt DWA-M 820-1:2020 in Anhang A) für die verschiedenen Risikogruppen werden durchgeführt." — EN "Sound risk analyses (guidance: DWA-M 820-1:2020 Annex A) are carried
--        out for the various risk groups."
--   [R2] DWA-M 820-1 Anhang A, T1-L1078, PDF p. 45 (820-1): risks are rated "gemeinsam mit den wesentlichen
--        Projektbeteiligten (u. a. Bauherr, Planer, Betrieb)"; Tab. A.1 PDF p. 46–47 (820-1): risk groups, Eintretens-
--        wahrscheinlichkeit / Schaden 0–10 per assessor, M-Wert, S-Abw. (= what the bespoke editor src/lib/eval/risk-register.ts
--        already stores: group, risk, description, ratings{bauherr,planer,betrieb}{probability,impact}).
--   [R3] DWA-M 820-1 Anhang A, T1-L1084, PDF p. 45 (820-1): "Die Risikoanalyse muss in der Praxis um eine Spalte „Präventions- und Korrekturmaßnahmen“ ergänzt werden, in der die projektspezifischen Maßnahmenpläne festgehalten werden (siehe Tabelle A.2)." — EN "In practice the risk analysis must be
--        supplemented by a column 'prevention and corrective measures' holding the project-specific measure plans (Tab. A.2)."
--        The column holds the Tab. A.2 measure plans — encoded here as the separate field risk_mitigation_plan (review M-3),
--        the same field / bespoke MitigationPlanEditor as DWA-M 820-1 M820-07 (not as a column of the Tab. A.1 editor).
--   [R4] DWA-M 820-1 Anhang A, T1-L1214 / T1-L1216, PDF p. 48 (820-1): "Zumindest sollten für diejenigen Risiken, welche einen hohen Schaden und eine hohe Eintrittswahrscheinlichkeit aufweisen, Maßnahmenpläne entwickelt werden." "Diese können ähnlich dem in Tabelle A.2 dargestelltem Muster aufgebaut sein." — EN "At least for
--        the risks with high damage and high probability, measure plans should be developed. These can be structured like the
--        pattern shown in Table A.2." Tab. A.2 (PDF p. 48) prints Risiko, Wert, Risikokategorie/-bereich, Schäden,
--        Gefährdungsbilder, Bemerkung, Maßnahmen T / O / P with the columns Verantwortung, Durchführen, Überwachung.
--        (Transcript T1-L1216 reads "Tabelle A. 2" with a space; the PDF reads "Tabelle A.2" — PDF wins, SR-3.)
--
-- PER COLUMN — "printed requirement" (quote above) or "EKOWAI workflow" (why):
--   korrespondenz (820-2-03): the register itself = printed [K1] (communication documented) + [K3]/[K4] (document management,
--     filing). datum — EKOWAI workflow (a record needs its date; required). richtung gesendet/empfangen — EKOWAI workflow (owner
--     asked for "sent" notifications; required). kanal — EKOWAI workflow (§ 5.3.2 L1142 names "E-Mail-Notizen" and
--     "Gesprächsprotokolle" as documentation carriers, PDF p. 42; the token list is ours). von / an — EKOWAI workflow (who wrote
--     to whom). betreff — EKOWAI workflow (what it was about; required). referenz — printed [K4] (project filing: where the
--     document is). nachverfolgung_noetig / erledigt — printed [K2] (implementation not followed up = the printed problem).
--     faellig_am — EKOWAI workflow (when the follow-up is due).
--   projektschritte (820-2-05): the register = printed [K3] (task tracking) + [K5] (processes planned). datum, verantwortlich,
--     ergebnis — EKOWAI workflow (a tracked task needs when / who / outcome). schritt — printed [K3] (the task itself; required).
--     nachweis_referenz — printed [K4] (filing of the evidence). status geplant / in Arbeit / erledigt — printed [S4]
--     ("bis zum nächsten Bericht geplante Arbeitsschritte"; required).
--   statusberichte (820-2-06): the register = printed [S2] (reports are kept) + [S1] (fixed points in time). nr — EKOWAI
--     workflow (running number; required). datum — printed [S1] ("zu festgelegten Zeitpunkten"; required). periode_von /
--     periode_bis — printed [S8] (Anhang A "Periode: von … bis …"; the brief's single "berichtszeitraum" is split into the two
--     printed dates). ampel_kosten / ampel_termine — printed [S5] (+ [S7] for gelb / rot; grün is the third light of the same
--     display). ampel_qualitaet — EKOWAI workflow as a light; the content is printed [S1] ("Termine, Kosten und Qualitäten").
--     ampel_risiken — EKOWAI workflow as a light; the content is printed [S4] ("Maßnahmen der Risikoverfolgung") and [S8] (9.1).
--     erstellt_von / freigegeben_von — printed [S6]. verteiler — printed [S3]. referenz — printed [K4] (filing of the report).
--   change_orders (820-2-21): ausloeser, kostenuebernahme — printed [C1] ("müssen in Textform dokumentiert werden"; text
--     columns). Kept NOT required at column level on purpose: the engine counts only COMPLETE rows (src/lib/expr/evaluate.ts
--     filterRows), so a required-but-empty column would hide the row from every counter; the counter below sees it instead.
--   risk_register (820-2-10): group / risk / description = the keys the bespoke Tab. A.1 editor stores [R2] (printed groups as
--     datalist, T1 PDF p. 46–47); ratings stay in the editor's own nested object (not a register column; never touched here).
--   risk_mitigation_plan (820-2-10, review M-3): printed [R3]/[R4] — the whole Tab. A.2 structure lives in the bespoke editor
--     (risk, category, value, damages, hazards, remark, measures T/O/P with responsibility / execution / monitoring); json,
--     not required, widget / ui_config NULL exactly like 820-1 M820-07 (live 2026-10-05 dump), section C.
--
-- COUNTERS (derived equations, count_rows over COMPLETE rows; materialised on save by src/lib/eval/materialize-derived.ts):
--   820-2-03-D1 korrespondenz_count = count_rows(korrespondenz)
--   820-2-03-D2 korrespondenz_nachverfolgung_offen = count_rows(korrespondenz, nachverfolgung_noetig == true AND erledigt == false)
--   820-2-05-D1 projektschritte_count = count_rows(projektschritte)
--   820-2-05-D2 projektschritte_offen = count_rows(projektschritte, status != 'erledigt')
--   820-2-06-D3 statusberichte_count = count_rows(statusberichte)
--   820-2-10-D1 risiken_count = count_rows(risk_register)
--   820-2-21-D4 change_orders_ohne_ausloeser_kosten = count_rows(change_orders, ausloeser IS NULL OR kostenuebernahme IS NULL)
-- GATES: only where the print demands it — REQ-09-2 (block, 820-2-21)
--   change_orders IS EMPTY OR change_orders_ohne_ausloeser_kosten == 0, from [C1] "müssen". The IS EMPTY arm exists because
--   saveWorksheet materialises register counters ONLY when the register is in the save batch (src/lib/actions/worksheet.ts,
--   batchRegisterIds): a project that never fills change_orders would otherwise wait forever for the counter. With stored
--   rows and no counter yet (rows saved before this block) the gate is pending and names the counter until the register is
--   saved again — never a silent pass. It is a NEW gate (sign-off item). REQ-09 on 820-2-06 is NOT edited. No other gate: [K1]/[K3] carry no per-row
--   duty, [S2] is "In der Regel" (ruling class S-06/S-09), [R1] stays on risk_register_present (REQ-20).
-- PRODUCER / VISIBILITY GUARDS: no new field is an equation input other than the registers; every counter is widget 'derived'
--   (never hand-entered) and is the output of exactly one equation; no visible_when is added or changed; no consumer reach.
--   risk_register: ui_config.editor keeps the bespoke editor (widgets.tsx resolveBespokeEditor reads cfg.editor), so the
--   stored {rows:[{group,risk,description,ratings,migratedFromSingle}]} shape is written by the same editor as before; the
--   engine reads group/risk/description only and never writes the carrier. Existing stored values are not modified by this
--   block (no project_parameters statement); the read-back R0 counts them before the apply.
-- SAFETY: 3 new json registers + 7 derived fields + 7 equations + 1 new block gate + 2 appended text columns on change_orders
--   + risk_register widget/ui_config/section + 1 new json field risk_mitigation_plan (M-3). No severity, value, existing equation or existing gate change. Idempotent
--   (NOT EXISTS / ON CONFLICT / guarded UPDATEs); the two edited rows are archived in-transaction.
-- STAGED — not applied. Apply (from C:\Users\Ekowai\_wt-g2t, which holds .env.local):
--   node scripts/apply-migration.mjs C:\Users\Ekowai\_wt-m820\scripts\migrations\20261005200000_m820_2_registers.sql
-- Rollback: C:\Users\Ekowai\_wt-m820\scripts\rollback-20261005200000-m820-2-registers.sql
-- Read-back: C:\Users\Ekowai\_wt-m820\scripts\verification\apply\readback-20261005200000-m820-2-registers.sql
BEGIN;

-- 0. in-transaction archive of the two EXISTING field rows this block changes (pre-state only; a re-run archives nothing)
CREATE TABLE IF NOT EXISTS fields_archive_m820_2_registers AS SELECT * FROM fields WHERE false;
INSERT INTO fields_archive_m820_2_registers
SELECT f.* FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-2'
   AND ((w.code = '820-2-21' AND f.symbol = 'change_orders' AND f.widget = 'register' AND jsonb_typeof(f.ui_config->'columns') = 'array'
         AND NOT (f.ui_config->'columns' @> '[{"key":"ausloeser"}]'::jsonb OR f.ui_config->'columns' @> '[{"key":"kostenuebernahme"}]'::jsonb))
     OR (w.code = '820-2-10' AND f.symbol = 'risk_register' AND f.data_type = 'json' AND f.widget IS NULL AND f.ui_config IS NULL))
   AND NOT EXISTS (SELECT 1 FROM fields_archive_m820_2_registers a WHERE a.id = f.id);

-- 1. 820-2-03 — new register korrespondenz (section C) + derived counters (section D) + equations

INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, description, verification_status, verification_quote, source_anchor, widget, ui_config, lookup, visible_when, enum_values, consumer_worksheets, order_index, active)
SELECT w.id, (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'C'), 'korrespondenz', 'Korrespondenz und Mitteilungen', 'Correspondence and notifications', 'json', NULL, false, '§ 5.3.1; § 4.1; § 8.5.1',
       'Register der Projektkorrespondenz (E-Mails, Briefe, Mitteilungen, Telefonate, Besprechungen): je Vorgang eine Zeile. Grundlage § 5.3.1: „Die Kommunikation muss regelmäßig, vorbereitet, effektiv und dokumentiert sein.“ und „Ergebnisse und Entscheidungen werden nicht ausreichend dokumentiert und die Umsetzung anschließend nicht nachverfolgt.“ (Problembeschreibung → Nachverfolgung); § 4.1: „Aufgabenverfolgung und Plandokumentation, Dokumentenmanagement sind notwendig.“. Nicht verpflichtend — ein Projekt darf noch keine Einträge haben.
[EN] Register of project correspondence (emails, letters, notifications, calls, meetings), one row per item. Basis § 5.3.1: "Communication must be regular, prepared, effective and documented." and the printed problem "results and decisions are not documented sufficiently and their implementation is not followed up"; § 4.1: "task tracking, plan documentation and document management are necessary". Not required — a project may have no entries yet.',
       'imported_unverified', 'Die Kommunikation muss regelmäßig, vorbereitet, effektiv und dokumentiert sein. — Aufgabenverfolgung und Plandokumentation, Dokumentenmanagement sind notwendig.', 'DWA-M 820-2 §5.3.1 Z.1124/1120 (PDF S. 42) + §4.1 Z.545/538 (PDF S. 22)', 'register', '{"title":"Korrespondenz und Mitteilungen · Correspondence and notifications","subtitle":"§ 5.3.1 · § 4.1 — je E-Mail, Brief, Mitteilung, Anruf oder Besprechung eine Zeile · one row per email, letter, notice, call or meeting","add_label":"+ Korrespondenz · correspondence","placement":"section","note":"Die Kommunikation muss regelmäßig, vorbereitet, effektiv und dokumentiert sein. Aufgabenverfolgung und Plandokumentation, Dokumentenmanagement sind notwendig. [EN] Communication must be regular, prepared, effective and documented; task tracking and document management are necessary. Offene Nachverfolgung = „Nachverfolgung nötig“ angehakt und „erledigt“ nicht angehakt · open follow-up = follow-up ticked and done not ticked.","columns":[{"key":"datum","type":"date","label":"Datum · Date","required":true},{"key":"richtung","type":"enum","label":"Richtung · Direction","required":true,"options":["gesendet","empfangen"],"option_labels":{"gesendet":"gesendet · sent","empfangen":"empfangen · received"}},{"key":"kanal","type":"enum","label":"Kanal · Channel","options":["E-Mail","Brief","Telefon","Besprechung","Portal/Plattform","Sonstiges"],"option_labels":{"E-Mail":"E-Mail · email","Brief":"Brief · letter","Telefon":"Telefon · phone","Besprechung":"Besprechung · meeting","Portal/Plattform":"Portal/Plattform · portal/platform","Sonstiges":"Sonstiges · other"}},{"key":"von","type":"text","label":"Von · From"},{"key":"an","type":"text","label":"An · To"},{"key":"betreff","type":"text","label":"Betreff / Inhalt · Subject","required":true},{"key":"referenz","type":"text","label":"Referenz (Datei, Link, Dok.-Nr.) · Reference (file, link, doc no.)"},{"key":"nachverfolgung_noetig","type":"boolean","label":"Nachverfolgung nötig · Follow-up needed"},{"key":"faellig_am","type":"date","label":"Fällig am · Due"},{"key":"erledigt","type":"boolean","label":"erledigt · done"}],"footer":["korrespondenz_count","korrespondenz_nachverfolgung_offen"]}'::jsonb, NULL, NULL, NULL, NULL, (SELECT COALESCE(MAX(f3.order_index), 0) + 1 FROM fields f3 WHERE f3.worksheet_template_id = w.id), true
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE s.code = 'DWA-M-820-2' AND w.code = '820-2-03'
   AND NOT EXISTS (SELECT 1 FROM fields f2 WHERE f2.worksheet_template_id = w.id AND f2.symbol = 'korrespondenz');

INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, description, verification_status, verification_quote, source_anchor, widget, ui_config, lookup, visible_when, enum_values, consumer_worksheets, order_index, active)
SELECT w.id, (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'D'), 'korrespondenz_count', 'Anzahl Korrespondenz-Einträge', 'Number of correspondence entries', 'number', NULL, false, '§ 5.3.1',
       'Ausgabe der Gleichung 820-2-03-D1 (count_rows(korrespondenz)). Anzahl der vollständigen Zeilen des Korrespondenz-Registers (Datum, Richtung, Betreff ausgefüllt). [EN] Number of complete correspondence rows (date, direction, subject filled).',
       'imported_unverified', 'Die Kommunikation muss regelmäßig, vorbereitet, effektiv und dokumentiert sein.', NULL, 'derived', NULL, NULL, NULL, NULL, NULL, (SELECT COALESCE(MAX(f3.order_index), 0) + 1 FROM fields f3 WHERE f3.worksheet_template_id = w.id), true
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE s.code = 'DWA-M-820-2' AND w.code = '820-2-03'
   AND NOT EXISTS (SELECT 1 FROM fields f2 WHERE f2.worksheet_template_id = w.id AND f2.symbol = 'korrespondenz_count');

INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, description, verification_status, verification_quote)
SELECT w.id, '820-2-03-D1', 'korrespondenz_count = count_rows(korrespondenz)', ARRAY['korrespondenz']::text[], 'korrespondenz_count', NULL, '§ 5.3.1', 'Anzahl der vollständigen Zeilen des Korrespondenz-Registers (Datum, Richtung, Betreff ausgefüllt). [EN] Number of complete correspondence rows (date, direction, subject filled).', 'imported_unverified', 'Die Kommunikation muss regelmäßig, vorbereitet, effektiv und dokumentiert sein.'
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE s.code = 'DWA-M-820-2' AND w.code = '820-2-03'
ON CONFLICT (worksheet_template_id, equation_number) DO NOTHING;

INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, description, verification_status, verification_quote, source_anchor, widget, ui_config, lookup, visible_when, enum_values, consumer_worksheets, order_index, active)
SELECT w.id, (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'D'), 'korrespondenz_nachverfolgung_offen', 'Offene Nachverfolgungen (Korrespondenz)', 'Open follow-ups (correspondence)', 'number', NULL, false, '§ 5.3.1',
       'Ausgabe der Gleichung 820-2-03-D2 (count_rows(korrespondenz, nachverfolgung_noetig == true AND erledigt == false)). Anzahl der Korrespondenz-Zeilen mit „Nachverfolgung nötig“ und nicht „erledigt“ („… die Umsetzung anschließend nicht nachverfolgt“, § 5.3.1). Kein Gate. [EN] Rows with follow-up needed and not done; no gate.',
       'imported_unverified', 'Ergebnisse und Entscheidungen werden nicht ausreichend dokumentiert und die Umsetzung anschließend nicht nachverfolgt.', NULL, 'derived', NULL, NULL, NULL, NULL, NULL, (SELECT COALESCE(MAX(f3.order_index), 0) + 1 FROM fields f3 WHERE f3.worksheet_template_id = w.id), true
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE s.code = 'DWA-M-820-2' AND w.code = '820-2-03'
   AND NOT EXISTS (SELECT 1 FROM fields f2 WHERE f2.worksheet_template_id = w.id AND f2.symbol = 'korrespondenz_nachverfolgung_offen');

INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, description, verification_status, verification_quote)
SELECT w.id, '820-2-03-D2', 'korrespondenz_nachverfolgung_offen = count_rows(korrespondenz, nachverfolgung_noetig == true AND erledigt == false)', ARRAY['korrespondenz']::text[], 'korrespondenz_nachverfolgung_offen', NULL, '§ 5.3.1', 'Anzahl der Korrespondenz-Zeilen mit „Nachverfolgung nötig“ und nicht „erledigt“ („… die Umsetzung anschließend nicht nachverfolgt“, § 5.3.1). Kein Gate. [EN] Rows with follow-up needed and not done; no gate.', 'imported_unverified', 'Ergebnisse und Entscheidungen werden nicht ausreichend dokumentiert und die Umsetzung anschließend nicht nachverfolgt.'
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE s.code = 'DWA-M-820-2' AND w.code = '820-2-03'
ON CONFLICT (worksheet_template_id, equation_number) DO NOTHING;

-- 2. 820-2-05 — new register projektschritte (section C) + derived counters (section D) + equations

INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, description, verification_status, verification_quote, source_anchor, widget, ui_config, lookup, visible_when, enum_values, consumer_worksheets, order_index, active)
SELECT w.id, (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'C'), 'projektschritte', 'Projektschritte (Aufgabenverfolgung)', 'Project steps (task tracking)', 'json', NULL, false, '§ 4.1; § 4.2; § 4.3.6',
       'Register der Projektschritte: je Schritt Datum, Schritt, Verantwortlich, Ergebnis, Nachweis, Status. Grundlage § 4.1: „Aufgabenverfolgung und Plandokumentation, Dokumentenmanagement sind notwendig.“ und „Reihenfolge der Vorgehensweise beschreiben, d. h. die Prozesse müssen geplant werden.“; § 4.3.6: „Darüber hinaus sind wichtige, bis zum nächsten Bericht geplante Arbeitsschritte, Korrekturmaßnahmen, Maßnahmen der Risikoverfolgung und Arbeitssicherheit enthalten.“ (geplante Arbeitsschritte). Nicht verpflichtend.
[EN] Register of project steps: date, step, responsible, result, evidence, status. Basis § 4.1 "task tracking … necessary", "the processes must be planned"; § 4.3.6 status reports contain the "work steps planned until the next report". Not required.',
       'imported_unverified', 'Aufgabenverfolgung und Plandokumentation, Dokumentenmanagement sind notwendig. — Reihenfolge der Vorgehensweise beschreiben, d. h. die Prozesse müssen geplant werden.', 'DWA-M 820-2 §4.1 Z.545/539 (PDF S. 22) + §4.3.6 Z.681 (PDF S. 27)', 'register', '{"title":"Projektschritte · Project steps","subtitle":"§ 4.1 · § 4.3.6 — je Schritt eine Zeile: geplant, in Arbeit, erledigt · one row per step: planned, in progress, done","add_label":"+ Projektschritt · step","placement":"section","note":"Aufgabenverfolgung und Plandokumentation, Dokumentenmanagement sind notwendig. Reihenfolge der Vorgehensweise beschreiben, d. h. die Prozesse müssen geplant werden. [EN] Task tracking is necessary; the order of the procedure is described, i.e. the processes must be planned.","columns":[{"key":"datum","type":"date","label":"Datum · Date"},{"key":"schritt","type":"text","label":"Schritt · Step","required":true},{"key":"verantwortlich","type":"text","label":"Verantwortlich · Responsible"},{"key":"ergebnis","type":"text","label":"Ergebnis · Result"},{"key":"nachweis_referenz","type":"text","label":"Nachweis / Referenz · Evidence / reference"},{"key":"status","type":"enum","label":"Status","required":true,"options":["geplant","in Arbeit","erledigt"],"option_labels":{"geplant":"geplant · planned","in Arbeit":"in Arbeit · in progress","erledigt":"erledigt · done"}}],"footer":["projektschritte_count","projektschritte_offen"]}'::jsonb, NULL, NULL, NULL, NULL, (SELECT COALESCE(MAX(f3.order_index), 0) + 1 FROM fields f3 WHERE f3.worksheet_template_id = w.id), true
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE s.code = 'DWA-M-820-2' AND w.code = '820-2-05'
   AND NOT EXISTS (SELECT 1 FROM fields f2 WHERE f2.worksheet_template_id = w.id AND f2.symbol = 'projektschritte');

INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, description, verification_status, verification_quote, source_anchor, widget, ui_config, lookup, visible_when, enum_values, consumer_worksheets, order_index, active)
SELECT w.id, (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'D'), 'projektschritte_count', 'Anzahl Projektschritte', 'Number of project steps', 'number', NULL, false, '§ 4.1',
       'Ausgabe der Gleichung 820-2-05-D1 (count_rows(projektschritte)). Anzahl der vollständigen Zeilen des Registers Projektschritte (Schritt und Status ausgefüllt). [EN] Number of complete project-step rows.',
       'imported_unverified', 'Aufgabenverfolgung und Plandokumentation, Dokumentenmanagement sind notwendig.', NULL, 'derived', NULL, NULL, NULL, NULL, NULL, (SELECT COALESCE(MAX(f3.order_index), 0) + 1 FROM fields f3 WHERE f3.worksheet_template_id = w.id), true
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE s.code = 'DWA-M-820-2' AND w.code = '820-2-05'
   AND NOT EXISTS (SELECT 1 FROM fields f2 WHERE f2.worksheet_template_id = w.id AND f2.symbol = 'projektschritte_count');

INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, description, verification_status, verification_quote)
SELECT w.id, '820-2-05-D1', 'projektschritte_count = count_rows(projektschritte)', ARRAY['projektschritte']::text[], 'projektschritte_count', NULL, '§ 4.1', 'Anzahl der vollständigen Zeilen des Registers Projektschritte (Schritt und Status ausgefüllt). [EN] Number of complete project-step rows.', 'imported_unverified', 'Aufgabenverfolgung und Plandokumentation, Dokumentenmanagement sind notwendig.'
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE s.code = 'DWA-M-820-2' AND w.code = '820-2-05'
ON CONFLICT (worksheet_template_id, equation_number) DO NOTHING;

INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, description, verification_status, verification_quote, source_anchor, widget, ui_config, lookup, visible_when, enum_values, consumer_worksheets, order_index, active)
SELECT w.id, (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'D'), 'projektschritte_offen', 'Offene Projektschritte (nicht erledigt)', 'Open project steps (not done)', 'number', NULL, false, '§ 4.3.6',
       'Ausgabe der Gleichung 820-2-05-D2 (count_rows(projektschritte, status != ''erledigt'')). Anzahl der Schritte mit Status geplant oder in Arbeit. Kein Gate. [EN] Steps planned or in progress; no gate.',
       'imported_unverified', 'Darüber hinaus sind wichtige, bis zum nächsten Bericht geplante Arbeitsschritte, Korrekturmaßnahmen, Maßnahmen der Risikoverfolgung und Arbeitssicherheit enthalten.', NULL, 'derived', NULL, NULL, NULL, NULL, NULL, (SELECT COALESCE(MAX(f3.order_index), 0) + 1 FROM fields f3 WHERE f3.worksheet_template_id = w.id), true
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE s.code = 'DWA-M-820-2' AND w.code = '820-2-05'
   AND NOT EXISTS (SELECT 1 FROM fields f2 WHERE f2.worksheet_template_id = w.id AND f2.symbol = 'projektschritte_offen');

INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, description, verification_status, verification_quote)
SELECT w.id, '820-2-05-D2', 'projektschritte_offen = count_rows(projektschritte, status != ''erledigt'')', ARRAY['projektschritte']::text[], 'projektschritte_offen', NULL, '§ 4.3.6', 'Anzahl der Schritte mit Status geplant oder in Arbeit. Kein Gate. [EN] Steps planned or in progress; no gate.', 'imported_unverified', 'Darüber hinaus sind wichtige, bis zum nächsten Bericht geplante Arbeitsschritte, Korrekturmaßnahmen, Maßnahmen der Risikoverfolgung und Arbeitssicherheit enthalten.'
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE s.code = 'DWA-M-820-2' AND w.code = '820-2-05'
ON CONFLICT (worksheet_template_id, equation_number) DO NOTHING;

-- 3. 820-2-06 — new register statusberichte (section C) + derived counters (section D) + equations

INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, description, verification_status, verification_quote, source_anchor, widget, ui_config, lookup, visible_when, enum_values, consumer_worksheets, order_index, active)
SELECT w.id, (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'C'), 'statusberichte', 'Statusberichte (Register)', 'Status reports (register)', 'json', NULL, false, '§ 4.3.6; Anhang A; § 2.1',
       'Register der erstellten Statusberichte: Nr., Datum, Berichtszeitraum (Anhang A: „Periode: von … bis …“), Ampeln Kosten / Termine / Qualität / Risiken, erstellt von, freigegeben von, Verteiler, Referenz. Grundlage § 4.3.6: „In der Regel werden mindestens vierteljährliche Statusberichte konsequent geführt.“, „Hilfreich sind Ampeldarstellungen, wenigstens für Termine und Kosten.“, „Es ist geregelt, wer die Statusberichte für das Projekt erstellt, wer auf die Vollständigkeit achtet und wer diesen freigibt.“, „Der Verteiler der Berichte muss sorgfältig vom Auftraggeber festgelegt werden und enthält immer auch das Planungsteam.“; § 2.1: „Auf der Grundlage der Projektplanung, im Wesentlichen im Hinblick auf Termine, Kosten und Qualitäten, gibt der Statusbericht den aktuellen Stand des Projekts zu festgelegten Zeitpunkten wieder.“. Ampel Kosten und Termine sind gedruckt, Qualität (§ 2.1) und Risiken (Anhang A 9.1, „Maßnahmen der Risikoverfolgung“) als Ampel sind EKOWAI-Arbeitsweise. Nicht verpflichtend.
[EN] Register of issued status reports: no., date, reporting period (Annex A "Period: from … to …"), traffic lights for costs / schedule / quality / risks, prepared by, released by, distribution, reference. § 4.3.6: at least quarterly reports as a rule; traffic lights helpful at least for schedule and costs; who prepares, checks and releases is regulated; the client fixes the distribution, which always includes the planning team. Cost and schedule lights are printed; quality and risk lights are EKOWAI workflow. Not required.',
       'imported_unverified', 'In der Regel werden mindestens vierteljährliche Statusberichte konsequent geführt. — Hilfreich sind Ampeldarstellungen, wenigstens für Termine und Kosten.', 'DWA-M 820-2 §4.3.6 Z.677/681/686/690 (PDF S. 27) + §2.1 Z.375 (PDF S. 15) + Anhang A Z.2527 (PDF S. 86)', 'register', '{"title":"Statusberichte · Status reports","subtitle":"§ 4.3.6 · Anhang A — je Statusbericht eine Zeile · one row per status report","add_label":"+ Statusbericht · status report","placement":"section","note":"In der Regel werden mindestens vierteljährliche Statusberichte konsequent geführt. Hilfreich sind Ampeldarstellungen, wenigstens für Termine und Kosten. Bei gelben oder roten Ampeln bzw. anderen Hinweisen auf Zielabweichungen im Projekt greifen die entscheidungsbefugten Personen aktiv ein. [EN] As a rule at least quarterly status reports are kept consistently. Traffic lights are helpful, at least for schedule and costs. With yellow or red lights the decision-makers intervene actively.","columns":[{"key":"nr","type":"number","label":"Nr. · No.","required":true,"min":1,"width":"w-20","aria_label":"laufende Nummer des Statusberichts · report number"},{"key":"datum","type":"date","label":"Datum · Date","required":true},{"key":"periode_von","type":"date","label":"Periode von · Period from"},{"key":"periode_bis","type":"date","label":"Periode bis · Period to"},{"key":"ampel_kosten","type":"enum","label":"Ampel Kosten · Costs light","options":["grün","gelb","rot"],"option_labels":{"grün":"grün · green","gelb":"gelb · yellow","rot":"rot · red"}},{"key":"ampel_termine","type":"enum","label":"Ampel Termine · Schedule light","options":["grün","gelb","rot"],"option_labels":{"grün":"grün · green","gelb":"gelb · yellow","rot":"rot · red"}},{"key":"ampel_qualitaet","type":"enum","label":"Ampel Qualität · Quality light","options":["grün","gelb","rot"],"option_labels":{"grün":"grün · green","gelb":"gelb · yellow","rot":"rot · red"}},{"key":"ampel_risiken","type":"enum","label":"Ampel Risiken · Risks light","options":["grün","gelb","rot"],"option_labels":{"grün":"grün · green","gelb":"gelb · yellow","rot":"rot · red"}},{"key":"erstellt_von","type":"text","label":"Erstellt von · Prepared by"},{"key":"freigegeben_von","type":"text","label":"Freigegeben von · Released by"},{"key":"verteiler","type":"text","label":"Verteiler · Distribution"},{"key":"referenz","type":"text","label":"Referenz (Datei, Version) · Reference (file, version)"}],"footer":["statusberichte_count"]}'::jsonb, NULL, NULL, NULL, NULL, (SELECT COALESCE(MAX(f3.order_index), 0) + 1 FROM fields f3 WHERE f3.worksheet_template_id = w.id), true
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE s.code = 'DWA-M-820-2' AND w.code = '820-2-06'
   AND NOT EXISTS (SELECT 1 FROM fields f2 WHERE f2.worksheet_template_id = w.id AND f2.symbol = 'statusberichte');

INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, description, verification_status, verification_quote, source_anchor, widget, ui_config, lookup, visible_when, enum_values, consumer_worksheets, order_index, active)
SELECT w.id, (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'D'), 'statusberichte_count', 'Anzahl erfasster Statusberichte', 'Number of status reports recorded', 'number', NULL, false, '§ 4.3.6',
       'Ausgabe der Gleichung 820-2-06-D3 (count_rows(statusberichte)). Anzahl der vollständigen Zeilen des Statusbericht-Registers (Nr. und Datum ausgefüllt). Kein Gate — der Turnus „mindestens vierteljährlich“ steht unter „In der Regel“ (Ruling S-06/S-09). [EN] Number of complete status-report rows; no gate (the quarterly cadence is "as a rule", a ruling).',
       'imported_unverified', 'In der Regel werden mindestens vierteljährliche Statusberichte konsequent geführt.', NULL, 'derived', NULL, NULL, NULL, NULL, NULL, (SELECT COALESCE(MAX(f3.order_index), 0) + 1 FROM fields f3 WHERE f3.worksheet_template_id = w.id), true
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE s.code = 'DWA-M-820-2' AND w.code = '820-2-06'
   AND NOT EXISTS (SELECT 1 FROM fields f2 WHERE f2.worksheet_template_id = w.id AND f2.symbol = 'statusberichte_count');

INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, description, verification_status, verification_quote)
SELECT w.id, '820-2-06-D3', 'statusberichte_count = count_rows(statusberichte)', ARRAY['statusberichte']::text[], 'statusberichte_count', NULL, '§ 4.3.6', 'Anzahl der vollständigen Zeilen des Statusbericht-Registers (Nr. und Datum ausgefüllt). Kein Gate — der Turnus „mindestens vierteljährlich“ steht unter „In der Regel“ (Ruling S-06/S-09). [EN] Number of complete status-report rows; no gate (the quarterly cadence is "as a rule", a ruling).', 'imported_unverified', 'In der Regel werden mindestens vierteljährliche Statusberichte konsequent geführt.'
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE s.code = 'DWA-M-820-2' AND w.code = '820-2-06'
ON CONFLICT (worksheet_template_id, equation_number) DO NOTHING;

-- 4. 820-2-21 change_orders — append the two § 4.3.7 columns (existing columns, keys, order and data kept) + footer counter
UPDATE fields f
   SET ui_config = jsonb_set(jsonb_set(f.ui_config, '{columns}', (f.ui_config->'columns') || '[{"key":"ausloeser","type":"text","label":"Auslöser / Verursacher · Trigger / originator"},{"key":"kostenuebernahme","type":"text","label":"Kostenübernahme · Cost borne by"}]'::jsonb),
                   '{footer}', COALESCE(f.ui_config->'footer', '[]'::jsonb) || '["change_orders_ohne_ausloeser_kosten"]'::jsonb)
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-21' AND f.symbol = 'change_orders'
   AND f.widget = 'register' AND jsonb_typeof(f.ui_config->'columns') = 'array'
   AND NOT (f.ui_config->'columns' @> '[{"key":"ausloeser"}]'::jsonb OR f.ui_config->'columns' @> '[{"key":"kostenuebernahme"}]'::jsonb);

INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, description, verification_status, verification_quote, source_anchor, widget, ui_config, lookup, visible_when, enum_values, consumer_worksheets, order_index, active)
SELECT w.id, (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'D'), 'change_orders_ohne_ausloeser_kosten', 'Änderungen ohne Auslöser oder Kostenübernahme (Anzahl)', 'Changes without trigger or cost bearer (count)', 'number', NULL, false, '§ 4.3.7',
       'Ausgabe der Gleichung 820-2-21-D4 (count_rows(change_orders, ausloeser IS NULL OR kostenuebernahme IS NULL)). Anzahl der Bauänderungen / Nachträge, bei denen Auslöser/Verursacher oder Kostenübernahme fehlt (§ 4.3.7: „Der Auslöser bzw. Verursacher für die Projektänderung und die Kostenübernahmen werden geklärt und müssen in Textform dokumentiert werden.“). Gelesen von REQ-09-2. [EN] Number of change rows missing the trigger/originator or the cost bearer; read by REQ-09-2.',
       'imported_unverified', 'Der Auslöser bzw. Verursacher für die Projektänderung und die Kostenübernahmen werden geklärt und müssen in Textform dokumentiert werden.', NULL, 'derived', NULL, NULL, NULL, NULL, NULL, (SELECT COALESCE(MAX(f3.order_index), 0) + 1 FROM fields f3 WHERE f3.worksheet_template_id = w.id), true
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE s.code = 'DWA-M-820-2' AND w.code = '820-2-21'
   AND NOT EXISTS (SELECT 1 FROM fields f2 WHERE f2.worksheet_template_id = w.id AND f2.symbol = 'change_orders_ohne_ausloeser_kosten');

INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, description, verification_status, verification_quote)
SELECT w.id, '820-2-21-D4', 'change_orders_ohne_ausloeser_kosten = count_rows(change_orders, ausloeser IS NULL OR kostenuebernahme IS NULL)', ARRAY['change_orders']::text[], 'change_orders_ohne_ausloeser_kosten', NULL, '§ 4.3.7', 'Anzahl der Bauänderungen / Nachträge, bei denen Auslöser/Verursacher oder Kostenübernahme fehlt (§ 4.3.7: „Der Auslöser bzw. Verursacher für die Projektänderung und die Kostenübernahmen werden geklärt und müssen in Textform dokumentiert werden.“). Gelesen von REQ-09-2. [EN] Number of change rows missing the trigger/originator or the cost bearer; read by REQ-09-2.', 'imported_unverified', 'Der Auslöser bzw. Verursacher für die Projektänderung und die Kostenübernahmen werden geklärt und müssen in Textform dokumentiert werden.'
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE s.code = 'DWA-M-820-2' AND w.code = '820-2-21'
ON CONFLICT (worksheet_template_id, equation_number) DO NOTHING;

INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, title_en, condition, description, clause_reference, severity)
SELECT w.id, 'REQ-09-2', 'Auslöser/Verursacher und Kostenübernahme je Änderung in Textform dokumentiert', 'Trigger/originator and cost bearer documented in text form for every change', 'change_orders IS EMPTY OR change_orders_ohne_ausloeser_kosten == 0',
       '§ 4.3.7 (PDF S. 28): „Der Auslöser bzw. Verursacher für die Projektänderung und die Kostenübernahmen werden geklärt und müssen in Textform dokumentiert werden.“ Jede Zeile der Bauänderungen / Nachträge braucht „Auslöser / Verursacher“ und „Kostenübernahme“. Ohne Änderungen (Register leer oder nie ausgefüllt) ist das Gate erfüllt; sind Zeilen gespeichert, entscheidet der Zähler, der beim Speichern des Registers berechnet wird (fehlt er, wartet das Gate auf das Speichern des Registers). Nur vollständige Zeilen (Änderung + Status) werden gezählt.
[EN] § 4.3.7: "The trigger or originator of the project change and the cost bearing are clarified and must be documented in text form." Every change row needs a trigger/originator and a cost bearer. No changes (register empty or never filled) = met; once rows are stored the counter decides, computed when the register is saved (if it is missing, the gate waits for that save). Only complete rows (change + status) are counted.',
       '§4.3.7', 'block'
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE s.code = 'DWA-M-820-2' AND w.code = '820-2-21'
   AND NOT EXISTS (SELECT 1 FROM compliance_requirements c2 WHERE c2.worksheet_template_id = w.id AND c2.code = 'REQ-09-2');

-- 5. 820-2-10 risk_register — register config that keeps the bespoke Tab. A.1 editor (ui_config.editor), section C, counter
UPDATE fields f
   SET widget = 'register', ui_config = '{"title":"Risikoanalyse (DWA-M 820-1 Anhang A, Tab. A.1) · Risk analysis","subtitle":"§ 4.8.2 → DWA-M 820-1 Anhang A — je Risiko eine Zeile; Bewertung durch Bauherr / Planer / Betrieb · one row per risk; rated by client / planner / operator","editor":"risk_register","placement":"section","note":"Fundierte Risikoanalysen (Hinweise gibt Merkblatt DWA-M 820-1:2020 in Anhang A) für die verschiedenen Risikogruppen werden durchgeführt. [EN] Sound risk analyses (guidance: DWA-M 820-1:2020 Annex A) are carried out for the various risk groups. Eingabe über den Tab.-A.1-Editor (drei Bewertende, M-Wert / S-Abw.); die Spalten unten sind die gespeicherten Schlüssel, die der Zähler liest · input through the Tab. A.1 editor; the columns below are the stored keys the counter reads.","columns":[{"key":"group","type":"text","label":"Risikogruppe · Risk group","datalist":["Rahmenbedingungen des Projekts","Projektumfeld","Umwelt, Ökologie","Rechtliche Aspekte","Projektvorgaben","Beteiligte und Betroffene","Betrieb","Projektorganisation","Projektablauf","Technik","Sicherheit"]},{"key":"risk","type":"text","label":"Risiko · Risk","required":true},{"key":"description","type":"text","label":"Beschreibung · Description"}],"footer":["risiken_count"]}'::jsonb, section_id = (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'C')
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-10' AND f.symbol = 'risk_register'
   AND f.data_type = 'json' AND f.widget IS NULL AND f.ui_config IS NULL;

INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, description, verification_status, verification_quote, source_anchor, widget, ui_config, lookup, visible_when, enum_values, consumer_worksheets, order_index, active)
SELECT w.id, (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'D'), 'risiken_count', 'Anzahl erfasster Risiken', 'Number of risks recorded', 'number', NULL, false, '§ 4.8.2',
       'Ausgabe der Gleichung 820-2-10-D1 (count_rows(risk_register)). Anzahl der Zeilen der Risikoanalyse mit benanntem Risiko (Tab.-A.1-Editor). Kein Gate — REQ-20 liest weiterhin risk_register_present. [EN] Number of risk rows with a named risk; no gate (REQ-20 still reads risk_register_present).',
       'imported_unverified', 'Fundierte Risikoanalysen (Hinweise gibt Merkblatt DWA-M 820-1:2020 in Anhang A) für die verschiedenen Risikogruppen werden durchgeführt.', NULL, 'derived', NULL, NULL, NULL, NULL, NULL, (SELECT COALESCE(MAX(f3.order_index), 0) + 1 FROM fields f3 WHERE f3.worksheet_template_id = w.id), true
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE s.code = 'DWA-M-820-2' AND w.code = '820-2-10'
   AND NOT EXISTS (SELECT 1 FROM fields f2 WHERE f2.worksheet_template_id = w.id AND f2.symbol = 'risiken_count');

INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, description, verification_status, verification_quote)
SELECT w.id, '820-2-10-D1', 'risiken_count = count_rows(risk_register)', ARRAY['risk_register']::text[], 'risiken_count', NULL, '§ 4.8.2', 'Anzahl der Zeilen der Risikoanalyse mit benanntem Risiko (Tab.-A.1-Editor). Kein Gate — REQ-20 liest weiterhin risk_register_present. [EN] Number of risk rows with a named risk; no gate (REQ-20 still reads risk_register_present).', 'imported_unverified', 'Fundierte Risikoanalysen (Hinweise gibt Merkblatt DWA-M 820-1:2020 in Anhang A) für die verschiedenen Risikogruppen werden durchgeführt.'
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE s.code = 'DWA-M-820-2' AND w.code = '820-2-10'
ON CONFLICT (worksheet_template_id, equation_number) DO NOTHING;

-- 7. 820-2-10 risk_mitigation_plan (review M-3) — the 820-1 Tab. A.2 measure plan ([R3]/[R4]); widget / ui_config NULL like
--    820-1 M820-07, so the bespoke MitigationPlanEditor renders it (widgets.tsx BESPOKE_BY_SYMBOL); not required, section C
INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, description, verification_status, verification_quote, source_anchor, widget, ui_config, lookup, visible_when, enum_values, consumer_worksheets, order_index, active)
SELECT w.id, (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'C'), 'risk_mitigation_plan', 'Risiko-Maßnahmenplan', 'Risk Mitigation Plan', 'json', NULL, false, 'DWA-M 820-1 Anh. A, Tab. A.2 (über § 4.8.2)',
       'Strukturierter Risiko-Maßnahmenplan je Risiko nach DWA-M 820-1 Anhang A, Tab. A.2 (auf die § 4.8.2 verweist: „Fundierte Risikoanalysen (Hinweise gibt Merkblatt DWA-M 820-1:2020 in Anhang A) für die verschiedenen Risikogruppen werden durchgeführt.“): Risiko, Risikokategorie, Wert, Schäden, Gefährdungsbilder, Bemerkung; Maßnahmen je Typ Technische (T) / Organisatorische (O) / Personelle (P) mit Verantwortung, Durchführung und Überwachung — derselbe Editor wie DWA-M 820-1 M820-07. DWA-M 820-1 Anhang A: „Zumindest sollten für diejenigen Risiken, welche einen hohen Schaden und eine hohe Eintrittswahrscheinlichkeit aufweisen, Maßnahmenpläne entwickelt werden.“ „Diese können ähnlich dem in Tabelle A.2 dargestelltem Muster aufgebaut sein.“ Nicht verpflichtend.
[EN] Structured risk measure plan per risk following DWA-M 820-1 Annex A, Table A.2 (referenced by § 4.8.2): risk, category, value, damages, hazard scenarios, remark; measures by type technical / organisational / personnel with responsibility, execution and monitoring — the same editor as DWA-M 820-1 M820-07. Annex A: "At least for risks with high damage and high probability, measure plans should be developed. These can be structured like the pattern in Table A.2." Not required.',
       'imported_unverified', 'Zumindest sollten für diejenigen Risiken, welche einen hohen Schaden und eine hohe Eintrittswahrscheinlichkeit aufweisen, Maßnahmenpläne entwickelt werden. — Diese können ähnlich dem in Tabelle A.2 dargestelltem Muster aufgebaut sein.', 'DWA-M 820-1 Anhang A Z.1214/1216 + Tab. A.2 (PDF S. 48)', NULL, NULL, NULL, NULL, NULL, NULL, (SELECT COALESCE(MAX(f3.order_index), 0) + 1 FROM fields f3 WHERE f3.worksheet_template_id = w.id), true
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE s.code = 'DWA-M-820-2' AND w.code = '820-2-10'
   AND NOT EXISTS (SELECT 1 FROM fields f2 WHERE f2.worksheet_template_id = w.id AND f2.symbol = 'risk_mitigation_plan');

COMMIT;
