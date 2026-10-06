-- 20261006170000_m820_1_risk_changes.sql · DWA-M 820-1 M820-06 "Risikoanalyse": "+ row" register of risk-analysis changes
-- (owner decision 2026-10-06, M820 follow-up item 5: "keep the current assessment in the Tab. A.1 editor and document every change").
-- Brief: vault 01-Projects/ekowai-wizard/m820-wizard-test/_briefs/followup-1-brief.md (item 5, coordinator addition). Apply order:
-- 27_APPLY-ORDER-m820-1-risk-changes.md. Sign-off: 28_SIGN-OFF-m820-1-risk-changes.md. Pattern = block 16's `korrespondenz`
-- (scripts/migrations/20261005200000_m820_2_registers.sql): widget 'register', ui_config columns, derived counter via count_rows.
--
-- WHAT THE PROJECT TEAM SEES (plain English):
--   On M820-06, next to the Tab. A.1 risk editor (section B), a new optional table "Änderungen der Risikoanalyse": one row per change
--   (date, risk ID / name as used in the analysis, kind of change: new / rating changed / measure changed / dropped, old and new
--   rating, reason, source document / version). The Tab. A.1 editor keeps the CURRENT assessment; this table is its change history.
--   A counter "Anzahl dokumentierter Änderungen" (section F) counts the complete rows. No check (gate) reads it.
--
-- SOURCE (re-read 2026-10-06 on the RENDERED PDF: scoop pdftotext -layout of C:\Users\Ekowai\Desktop\Guidelines\DWA-M-820-1\DWA-M_820-1.pdf,
--   whitespace-normalised match per PDF page; L### = .md transcript line):
--   [R1] § 4.7 Umgang mit Risiken, L593, PDF p. 24 (printed 22): "Die Risikoanalyse ist über alle Projektphasen fortzuschreiben."
--        EN "The risk analysis is to be updated (carried forward) over all project phases." — a printed update duty.
--   [R2] § 4.7, L591, PDF p. 24: "Risiken sollten im Rahmen der Planung systematisch erfasst werden und sind hinsichtlich ihrer
--        Auswirkungen auf das Konzept oder die Projekte zu bewerten. Die Ergebnisse der Risikobewertung und der daraus resultierenden
--        Maßnahmen sind in die Planungen einzubeziehen. Das Eintreten unvermeidbarer Risiken muss durch geeignete Instrumentarien
--        unverzüglich erkannt werden." EN "Risks should be recorded systematically during planning and are to be assessed for their
--        effect on the concept or the projects. The results of the risk assessment and the resulting measures are to be included in
--        the planning. The occurrence of unavoidable risks must be recognised without delay by suitable instruments."
--   The Merkblatt prints the duty to update, not a change log: the register FORM (one row per change, these columns) is an
--   owner-requested documentation aid for [R1]; the field description says so. No gate: a check on it would be a new-gate ruling
--   (28_ RC-2).
--
-- WHAT THIS BLOCK DOES (idempotent; NOT EXISTS / ON CONFLICT; no existing row is changed, so nothing is archived):
--   1. M820-06 new optional json field `risiko_aenderungen` (section B, widget 'register', placement 'section', 7 columns:
--      datum date* · risiko_id text* · aenderung enum* {neu, bewertung_geaendert, massnahme_geaendert, entfallen} · bewertung_alt text ·
--      bewertung_neu text · begruendung text* · quelle text; * = required for a row to count).
--   2. M820-06 new derived number `risiko_aenderungen_count` (section F) + equation M820-06-D1
--      `risiko_aenderungen_count = count_rows(risiko_aenderungen)` (complete rows only; a never-saved register = not computed,
--      a saved empty one = 0 — code fix 8e77075).
-- EXISTING: risk_register (Tab. A.1 editor, bespoke by symbol while widget IS NULL), risk_count_identified, risk_high_priority_count,
--   risk_analysis_method, risk_analysis_date, REQ-05 (M820-04, warn) — all untouched.
-- STAGED — not applied. Apply (from C:\Users\Ekowai\_wt-g2t, which holds .env.local):
--   node scripts/apply-migration.mjs C:\Users\Ekowai\_wt-m820\scripts\migrations\20261006170000_m820_1_risk_changes.sql
-- Rollback:  C:\Users\Ekowai\_wt-m820\scripts\rollback-20261006170000-m820-1-risk-changes.sql
-- Read-back: C:\Users\Ekowai\_wt-m820\scripts\verification\apply\readback-20261006170000-m820-1-risk-changes.sql
BEGIN;

-- 1. M820-06 — new register risiko_aenderungen (section B, next to the Tab. A.1 risk analysis)
INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, description, verification_status, verification_quote, source_anchor, widget, ui_config, lookup, visible_when, enum_values, consumer_worksheets, order_index, active)
SELECT w.id, (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'B'), 'risiko_aenderungen', 'Änderungen der Risikoanalyse (Fortschreibung)', 'Changes to the risk analysis (update log)', 'json', NULL, false, '§ 4.7; Anhang A',
       'Änderungsprotokoll der Risikoanalyse: je Änderung eine Zeile (Datum, Risiko-ID/-Name wie in der Risikoanalyse, Art der Änderung, Bewertung alt/neu, Begründung, Quelle/Version). Die aktuelle Bewertung steht in der Risikoanalyse (Tab. A.1) oben; diese Tabelle dokumentiert, wie sie sich über die Projektphasen geändert hat. Grundlage § 4.7 (PDF S. 24): „Die Risikoanalyse ist über alle Projektphasen fortzuschreiben.“ Die Form der Dokumentation (Zeilen, Spalten) ist eine vom Auftraggeber des Werkzeugs gewünschte Dokumentationshilfe — das Merkblatt druckt die Pflicht zur Fortschreibung, kein Änderungsprotokoll. Nicht verpflichtend, keine Prüfung.
[EN] Change log of the risk analysis: one row per change (date, risk ID / name as used in the analysis, kind of change, old / new rating, reason, source / version). The current assessment stays in the risk analysis (Tab. A.1) above; this table documents how it changed over the project phases. Basis § 4.7: "The risk analysis is to be updated over all project phases." The form of the record (rows, columns) is an owner-requested documentation aid — the Merkblatt prints the duty to update, not a change log. Optional, no check.',
       'imported_unverified', 'Die Risikoanalyse ist über alle Projektphasen fortzuschreiben.', 'DWA-M 820-1 §4.7 Z.593 (PDF S. 24)', 'register',
       '{"title":"Änderungen der Risikoanalyse · Changes to the risk analysis","subtitle":"§ 4.7 · Anhang A — je Änderung eine Zeile · one row per change","add_label":"+ Änderung · change","placement":"section","note":"Die Risikoanalyse ist über alle Projektphasen fortzuschreiben (§ 4.7). Die aktuelle Bewertung steht in der Risikoanalyse (Tab. A.1); hier wird jede Änderung dokumentiert. [EN] The risk analysis is to be updated over all project phases (§ 4.7). The current assessment stays in the risk analysis (Tab. A.1); every change is documented here.","columns":[{"key":"datum","type":"date","label":"Datum · Date","required":true},{"key":"risiko_id","type":"text","label":"Risiko (ID / Name wie in der Risikoanalyse) · Risk (ID / name as in the analysis)","required":true},{"key":"aenderung","type":"enum","label":"Art der Änderung · Kind of change","required":true,"options":["neu","bewertung_geaendert","massnahme_geaendert","entfallen"],"option_labels":{"neu":"neu aufgenommen · new","bewertung_geaendert":"Bewertung geändert · rating changed","massnahme_geaendert":"Maßnahme geändert · measure changed","entfallen":"entfallen · dropped"}},{"key":"bewertung_alt","type":"text","label":"Bewertung alt · Rating before"},{"key":"bewertung_neu","type":"text","label":"Bewertung neu · Rating after"},{"key":"begruendung","type":"text","label":"Begründung · Reason","required":true},{"key":"quelle","type":"text","label":"Quelle / Version (z. B. „C1 v1.5 → v1.6“) · Source / version"}],"footer":["risiko_aenderungen_count"]}'::jsonb,
       NULL, NULL, NULL, NULL, (SELECT COALESCE(MAX(f3.order_index), 0) + 1 FROM fields f3 WHERE f3.worksheet_template_id = w.id), true
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE s.code = 'DWA-M-820-1' AND w.code = 'M820-06'
   AND NOT EXISTS (SELECT 1 FROM fields f2 WHERE f2.worksheet_template_id = w.id AND f2.symbol = 'risiko_aenderungen');

-- 2. M820-06 — derived counter (section F) + equation
INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, description, verification_status, verification_quote, source_anchor, widget, ui_config, lookup, visible_when, enum_values, consumer_worksheets, order_index, active)
SELECT w.id, (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'F'), 'risiko_aenderungen_count', 'Anzahl dokumentierter Änderungen der Risikoanalyse', 'Number of documented changes to the risk analysis', 'number', NULL, false, '§ 4.7',
       'Ausgabe der Gleichung M820-06-D1 (count_rows(risiko_aenderungen)). Anzahl der vollständigen Zeilen (Datum, Risiko, Art der Änderung, Begründung ausgefüllt). Kein Gate. [EN] Number of complete change rows (date, risk, kind of change, reason filled); no gate.',
       'imported_unverified', 'Die Risikoanalyse ist über alle Projektphasen fortzuschreiben.', NULL, 'derived', NULL, NULL, NULL, NULL, NULL, (SELECT COALESCE(MAX(f3.order_index), 0) + 1 FROM fields f3 WHERE f3.worksheet_template_id = w.id), true
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE s.code = 'DWA-M-820-1' AND w.code = 'M820-06'
   AND NOT EXISTS (SELECT 1 FROM fields f2 WHERE f2.worksheet_template_id = w.id AND f2.symbol = 'risiko_aenderungen_count');

INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, description, verification_status, verification_quote)
SELECT w.id, 'M820-06-D1', 'risiko_aenderungen_count = count_rows(risiko_aenderungen)', ARRAY['risiko_aenderungen']::text[], 'risiko_aenderungen_count', NULL, '§ 4.7', 'Anzahl der vollständigen Zeilen des Änderungsprotokolls der Risikoanalyse (Datum, Risiko, Art der Änderung, Begründung ausgefüllt). Kein Gate. [EN] Number of complete rows of the risk-analysis change log; no gate.', 'imported_unverified', 'Die Risikoanalyse ist über alle Projektphasen fortzuschreiben.'
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE s.code = 'DWA-M-820-1' AND w.code = 'M820-06'
ON CONFLICT (worksheet_template_id, equation_number) DO NOTHING;

COMMIT;
