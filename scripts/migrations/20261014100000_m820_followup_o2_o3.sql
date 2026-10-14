-- 20261014100000_m820_followup_o2_o3.sql · DWA-M 820-2 / -3 — follow-up items O-2 and O-3 from the UX wave (68_UX-WAVE-RESULTS_2026-10-08)
-- Apply order + behaviour list: vault 01-Projects/ekowai-wizard/m820-wizard-test/69_APPLY-ORDER-m820-followup-O2-O3.md.
-- Pattern: 20261008100000_m820_workflow_audit.sql (md5-guarded updates, in-transaction archives, byte-equal rollback).
--
-- WHAT CHANGES (plain English):
--   O-2 · The Testbetrieb / Abnahmeprüfung / Mischform choice exists only when construction works are awarded to executing firms.
--     The print places the choice „In den Vergabeunterlagen für die ausführenden Firmen“ (§ 5.7.1). A self-built project (Eigenleistung,
--     bauleistungen_vergeben = Nein on 820-2-17) has no tender documents for executing firms, so:
--       1. 820-2-18 testbetrieb_vs_abnahme_choice gets visible_when `bauleistungen_vergeben == true` (the same rule its neighbour
--          leistungsbeschreibung_type already has); the hint quotes § 5.7.1 verbatim and says when the question is hidden.
--       2. 820-2-22 REQ-46 (block, severity unchanged) gets the award guard, the same nested style as REQ-51 / REQ-52 (20261007120000):
--            IF bauleistungen_vergeben == true THEN (IF testbetrieb_vs_abnahme_choice == 'testbetrieb' OR
--                                                       testbetrieb_vs_abnahme_choice == 'mischform' THEN (testbetrieb_planned == true))
--          Self-built: not applicable (also with a leftover choice saved before the award answer changed). Awarded: as today.
--          bauleistungen_vergeben unanswered: the check waits and names the question (as REQ-51 / REQ-52 do).
--       3. 820-2-17 bauleistungen_vergeben reaches 820-2-22 (consumer_worksheets + 820-2-22, needed by the guard); its hint names the
--          two new effects (choice hidden, REQ-46 not applicable).
--     KEPT unchanged (print does not settle it — ruling item in 69_): testbetrieb_planned, testbetrieb_documentation_precondition,
--     REQ-50, the phase driver phase_inbetriebnahme_erreicht and REQ-47.
--   O-3 · NO ROW CHANGES. The reported defect („M8203-23 under Einzelprojekt lists derived outputs gesamt_anhang_b_* of the hidden
--     Gesamtsystem path as missing required“) is not in the source or the encoding: Anhang B is the PROJECT annex („Anhang B
--     Qualitätselemente zur Projektbeurteilung“, 820-3 PDF S. 26 / printed 24), „gesamt“ in gesamt_anhang_b_* means „total of Anhang B“,
--     and the Gesamtsystem annex is Anhang A („Anhang A Gesamtsystem“, PDF S. 24 / printed 22) = M8203-22 gesamt_anhang_a_*. Under
--     Einzelprojekt M8203-23 is on the visible path; its three missing required fields (gesamt_anhang_b_verdict / _fulfilment_pct /
--     _items_total) are manual entries, not derived; the three derived fields (gesamt_anhang_b_items_total_calc, _items_rated,
--     projektstopp_code_b) are not required. Class scan over all 24 820-3 sheets (harness + read-back R3): 0 derived / equation-output
--     fields required; under each path (einzelprojekt / gesamtsystem / both) the other path's sheets show 0 missing required and 0
--     waiting gates. Whether the tool-only summary figures stay required is a ruling (69_ R-O3-1), not encoded here.
--   Counts: 2 field rows updated, 1 gate row updated (severity unchanged), 0 inserted, 0 deleted. Every changed hint DE + [EN].
--
-- SOURCES (re-rendered 2026-10-14, pdftotext -layout -enc UTF-8, per page; printed page = PDF page − 2, checked on the page footers):
--  DWA-M 820-2 (C:\Users\Ekowai\Desktop\Guidelines\DWA-M-820-2\DWA-M_820-2.pdf)
--   § 5.5 heading (PDF S. 49 / printed 47): „5.5 Phase „Vorbereitung und Durchführen der Vergabe“ (Bauleistungen)“
--   § 5.7.1 (PDF S. 56 / printed 54): „Die Abnahme ist eine wichtige Zäsur bei der Abwicklung jeden Bauvertrags, weil sie für beide
--     Vertragsparteien gravierende Folgen hat.“
--   § 5.7.1 (PDF S. 57 / printed 55): „In den Vergabeunterlagen für die ausführenden Firmen muss der Auftraggeber formulieren, ob er sich
--     für den Testbetrieb mit anschließender Abnahme, die Abnahmeprüfungen ohne Testbetrieb oder eine Mischform zwischen beiden
--     entscheidet.“ · „Der Regelfall ist der Testbetrieb mit anschließender Abnahmeprüfung.“
--   § 5.7.2 (PDF S. 58 / printed 56): „Vor der Abnahme findet bereits ein Testbetrieb mit dem Ergebnis eines reibungslosen und
--     störungsfreien Betriebs statt.“ · „Der geplante Testbetrieb ist beschrieben, ausgeschrieben und wird bezahlt. Der Auftraggeber hat
--     die Leistungen des Auftragnehmers sowie der ausführenden Firmen für den Testbetrieb beschrieben.“ (ruling item, not encoded)
--  DWA-M 820-3 (C:\Users\Ekowai\Desktop\Guidelines\DWA-M-820-3\DWA-M_820-3.pdf)
--   § 1 (PDF S. 9 / printed 7): „Die in Anhang A und B angegebenen Qualitätselemente stellen eine Auswahl an Kriterien für die
--     Projektabwicklung dar.“
--   Anhang A heading (PDF S. 24 / printed 22): „Anhang A Gesamtsystem“ · Anhang B heading (PDF S. 26 / printed 24): „Anhang B
--     Qualitätselemente zur Projektbeurteilung“
--
-- Guards: every UPDATE matches the pre-state signature taken from the harness seed (the three 2026-10-05 dumps + every M820 block applied
-- on prod up to 20261008100000); step 0 (read-back R0 on prod) must show fields_pre 2 / gates_pre 1 before the apply. Fields
-- md5(description md5 | visible_when | consumer_worksheets | enum md5 | label_de | label_en | is_required | data_type), active only;
-- gates md5(condition | severity | description md5 | clause_reference). Idempotent (a re-run changes nothing). In-transaction archives
-- compliance_requirements_archive_m820_o23 / fields_archive_m820_o23 + ledger m820_o23_written (md5 of every row as written). No row is
-- inserted, deleted, activated or deactivated; no severity changes.
-- Rollback:  scripts/rollback-20261014100000-m820-followup-o2-o3.sql (byte-equal; a row edited after the apply is left alone).
-- Read-back: scripts/verification/apply/readback-20261014100000-m820-followup-o2-o3.sql.
-- Order: AFTER 20261008100000 (workflow audit, live). Data only — no code prerequisite (the hidden-at-source rule R-15 is live in bd1d1fd).
-- STAGED — not applied. Apply (from C:\Users\Ekowai\_wt-g2t, which holds .env.local):
--   node scripts/apply-migration.mjs C:\Users\Ekowai\_wt-m820-data\scripts\migrations\20261014100000_m820_followup_o2_o3.sql
BEGIN;

CREATE TABLE IF NOT EXISTS compliance_requirements_archive_m820_o23 AS SELECT * FROM compliance_requirements WHERE false;
CREATE TABLE IF NOT EXISTS fields_archive_m820_o23 AS SELECT * FROM fields WHERE false;
CREATE TABLE IF NOT EXISTS m820_o23_written (tbl text NOT NULL, id uuid NOT NULL, md5 text NOT NULL, PRIMARY KEY (tbl, id));

-- ── O-2 · Testbetrieb / Abnahme choice only with awarded construction works ──
-- DWA-M-820-2 820-2-18 testbetrieb_vs_abnahme_choice: visible_when, description
INSERT INTO fields_archive_m820_o23 SELECT f.* FROM fields f, worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-18' AND f.symbol = 'testbetrieb_vs_abnahme_choice' AND f.active
   AND md5(concat_ws('|', md5(coalesce(f.description,'')), coalesce(f.visible_when,''), coalesce(array_to_string(f.consumer_worksheets, ','),''), coalesce(md5(f.enum_values::text),''), f.label_de, coalesce(f.label_en,''), f.is_required::text, f.data_type)) = '15772f8168764ee2882c10b61c59f26e'
   AND NOT EXISTS (SELECT 1 FROM fields_archive_m820_o23 a WHERE a.id = f.id);
UPDATE fields f
   SET visible_when = $m$bauleistungen_vergeben == true$m$,
       description = $m$Festlegung in den Vergabeunterlagen für die ausführenden Firmen: Testbetrieb mit anschließender Abnahme, Abnahmeprüfungen ohne Testbetrieb oder Mischform. § 5.7.1 (S. 55): „In den Vergabeunterlagen für die ausführenden Firmen muss der Auftraggeber formulieren, ob er sich für den Testbetrieb mit anschließender Abnahme, die Abnahmeprüfungen ohne Testbetrieb oder eine Mischform zwischen beiden entscheidet.“ „Der Regelfall ist der Testbetrieb mit anschließender Abnahmeprüfung.“ (Bild 3 / Bild 4). Nur sichtbar, wenn Bauleistungen an ausführende Firmen vergeben werden (bauleistungen_vergeben = Ja, 820-2-17): ohne Vergabe (Eigenleistung) gibt es keine Vergabeunterlagen, in denen diese Festlegung zu treffen ist; die Prüfung REQ-46 (820-2-22) gilt dann nicht.
[EN] Choice stated in the tender documents for the executing firms: test operation followed by acceptance, acceptance tests without test operation, or a mixed form. § 5.7.1 (p. 55): "in the tender documents for the executing firms the client must state whether he decides on test operation followed by acceptance, acceptance tests without test operation, or a mixed form of both." "The normal case is test operation followed by an acceptance test." (Bild 3 / Bild 4). Shown only when construction works are awarded to executing firms (bauleistungen_vergeben = yes, 820-2-17): without an award (the client's own delivery) there are no tender documents in which to state this choice; check REQ-46 (820-2-22) then does not apply.$m$
  FROM worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-18' AND f.symbol = 'testbetrieb_vs_abnahme_choice' AND f.active
   AND md5(concat_ws('|', md5(coalesce(f.description,'')), coalesce(f.visible_when,''), coalesce(array_to_string(f.consumer_worksheets, ','),''), coalesce(md5(f.enum_values::text),''), f.label_de, coalesce(f.label_en,''), f.is_required::text, f.data_type)) = '15772f8168764ee2882c10b61c59f26e';
-- DWA-M-820-2 820-2-17 bauleistungen_vergeben: consumer_worksheets (+ 820-2-22), description
INSERT INTO fields_archive_m820_o23 SELECT f.* FROM fields f, worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-17' AND f.symbol = 'bauleistungen_vergeben' AND f.active
   AND md5(concat_ws('|', md5(coalesce(f.description,'')), coalesce(f.visible_when,''), coalesce(array_to_string(f.consumer_worksheets, ','),''), coalesce(md5(f.enum_values::text),''), f.label_de, coalesce(f.label_en,''), f.is_required::text, f.data_type)) = 'e7c21572715e51bec1f2967d972829ab'
   AND NOT EXISTS (SELECT 1 FROM fields_archive_m820_o23 a WHERE a.id = f.id);
UPDATE fields f
   SET consumer_worksheets = ARRAY['820-2-18', '820-2-19', '820-2-22', '820-2-24']::text[],
       description = $m$Werden Bauleistungen an ausführende Firmen vergeben (auch nur einzelne Lose)? Ja: die Vergabeprüfungen REQ-38 bis REQ-41 gelten (§5.5 "Vorbereitung und Durchführen der Vergabe"). Nein (Eigenleistung des Auftraggebers, §4.1): sie entfallen; Leistungsbeschreibungsart und die Festlegung Testbetrieb / Abnahmeprüfung / Mischform (820-2-18), Vergabe-Zusammenfassung (820-2-19) und der Gewährleistungsteil von 820-2-24 (Gewährleistungsdaten, Gewährleistungskalender, Mängelverfolgung) werden ausgeblendet; die Testbetriebsprüfung REQ-46 (820-2-22) und die Gewährleistungsprüfungen REQ-51 und REQ-52 (820-2-24) gelten nicht – ohne vergebene Bauleistungen gibt es keine Vergabeunterlagen für ausführende Firmen (§ 5.7.1, S. 55: die Festlegung erfolgt „In den Vergabeunterlagen für die ausführenden Firmen“) und keine Gewährleistung ausführender Firmen. Ohne Antwort warten diese Prüfungen.
[EN] Are construction works awarded to executing firms (even only some lots)? Yes: award checks REQ-38 to REQ-41 apply (§5.5). No (client's own delivery, §4.1): they do not apply; specification type and the choice test operation / acceptance test / mixed form (820-2-18), award summary (820-2-19) and the warranty part of 820-2-24 (warranty dates, warranty calendar, defect tracking) are hidden; the test-operation check REQ-46 (820-2-22) and the warranty checks REQ-51 and REQ-52 (820-2-24) do not apply – without awarded construction works there are no tender documents for executing firms (§ 5.7.1, p. 55: the choice is stated "in the tender documents for the executing firms") and no warranty of executing firms. Unanswered, these checks wait.$m$
  FROM worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-17' AND f.symbol = 'bauleistungen_vergeben' AND f.active
   AND md5(concat_ws('|', md5(coalesce(f.description,'')), coalesce(f.visible_when,''), coalesce(array_to_string(f.consumer_worksheets, ','),''), coalesce(md5(f.enum_values::text),''), f.label_de, coalesce(f.label_en,''), f.is_required::text, f.data_type)) = 'e7c21572715e51bec1f2967d972829ab';
-- DWA-M-820-2 820-2-22 REQ-46 (block, stays block): condition (+ bauleistungen_vergeben guard), description, clause_reference
INSERT INTO compliance_requirements_archive_m820_o23 SELECT cr.* FROM compliance_requirements cr, worksheet_templates w, standards s
 WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-22' AND cr.code = 'REQ-46'
   AND md5(concat_ws('|', coalesce(cr.condition,''), cr.severity, md5(coalesce(cr.description,'')), coalesce(cr.clause_reference,''))) = '38e3610a38be4c2c2185315e51106408'
   AND NOT EXISTS (SELECT 1 FROM compliance_requirements_archive_m820_o23 a WHERE a.id = cr.id);
UPDATE compliance_requirements cr
   SET condition = $m$IF bauleistungen_vergeben == true THEN (IF testbetrieb_vs_abnahme_choice == 'testbetrieb' OR testbetrieb_vs_abnahme_choice == 'mischform' THEN (testbetrieb_planned == true))$m$,
       clause_reference = $m$§5.7.1, §5.7.2, Bild 3$m$,
       description = $m$Blockiert, bis testbetrieb_planned bestätigt ist – nur wenn Bauleistungen an ausführende Firmen vergeben werden (bauleistungen_vergeben = Ja, 820-2-17) und die Festlegung testbetrieb_vs_abnahme_choice (820-2-18) „Testbetrieb“ oder „Mischform“ ist. § 5.7.1 (S. 55): „In den Vergabeunterlagen für die ausführenden Firmen muss der Auftraggeber formulieren, ob er sich für den Testbetrieb mit anschließender Abnahme, die Abnahmeprüfungen ohne Testbetrieb oder eine Mischform zwischen beiden entscheidet.“ § 5.7.2 (S. 56, Zielsetzung; Bild 3 in § 5.7.1, S. 54): „Vor der Abnahme findet bereits ein Testbetrieb mit dem Ergebnis eines reibungslosen und störungsfreien Betriebs statt.“ Ohne vergebene Bauleistungen (Eigenleistung) gilt die Prüfung nicht, auch wenn früher eine Festlegung gespeichert wurde; ohne Antwort auf bauleistungen_vergeben wartet sie.
[EN] Blocks until testbetrieb_planned is confirmed – only when construction works are awarded to executing firms (bauleistungen_vergeben = yes, 820-2-17) and the choice testbetrieb_vs_abnahme_choice (820-2-18) is "test operation" or "mixed form". § 5.7.1 (p. 55): "in the tender documents for the executing firms the client must state whether he decides on test operation followed by acceptance, acceptance tests without test operation, or a mixed form of both." § 5.7.2 (p. 56, target state; Bild 3 in § 5.7.1, p. 54): "a test operation already takes place before acceptance, with the result of smooth and trouble-free operation." Without awarded construction works (the client's own delivery) the check does not apply, even if a choice was saved earlier; without an answer to bauleistungen_vergeben it waits.$m$
  FROM worksheet_templates w, standards s
 WHERE cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-22' AND cr.code = 'REQ-46'
   AND md5(concat_ws('|', coalesce(cr.condition,''), cr.severity, md5(coalesce(cr.description,'')), coalesce(cr.clause_reference,''))) = '38e3610a38be4c2c2185315e51106408';

-- ── O-3 · no row changes (see header; class scan = read-back R3) ──

-- ── ledger: md5 of every archived row as this block left it (the rollback restores only rows still in that state) ──
INSERT INTO m820_o23_written (tbl, id, md5) SELECT 'compliance_requirements', x.id, md5(row_to_json(x)::text) FROM compliance_requirements x WHERE x.id IN (SELECT id FROM compliance_requirements_archive_m820_o23) ON CONFLICT DO NOTHING;
INSERT INTO m820_o23_written (tbl, id, md5) SELECT 'fields', x.id, md5(row_to_json(x)::text) FROM fields x WHERE x.id IN (SELECT id FROM fields_archive_m820_o23) ON CONFLICT DO NOTHING;

COMMIT;
