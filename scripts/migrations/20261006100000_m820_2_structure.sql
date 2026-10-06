-- 20261006100000_m820_2_structure.sql · DWA-M 820-2 structure block: phase routing, construction-award / Eigenleistung route,
-- REQ-46 acceptance path, empty / wrong-symbol / wrong-sheet gates, fields without a section.
-- Brief: vault 01-Projects/ekowai-wizard/m820-wizard-test/_briefs/structure-2-brief.md (findings S-01, S-02, S-03, S-07, S-08 of
-- 10_Inventory_M820-2.md). Composes with the registers block 20261005200000_m820_2_registers.sql (apply that one FIRST).
--
-- !! CODE PREREQUISITE — deploy the branch code BEFORE applying this block !!
--   The phase guards call contains(included_hoai_phases, '…') on sheets other than 820-2-01. The approval gate on the live
--   build reads json carriers of the gate's OWN sheet only, so on the live build every phase-guarded block gate would wait
--   (pending → approval refused). This branch adds the inherited-carrier read (src/lib/actions/approval-gate.ts
--   loadInheritedJsonCarriers: json fields of the same standard whose consumer_worksheets name the sheet) and the same read in
--   the standard dossier (src/lib/pdf/assemble-standard-report.ts gateCarrier). The form already sees the inherited value
--   (step 6 below gives the reach).
--
-- WHAT THE PROJECT TEAM SEES (plain English):
--   1. Contracted phases (820-2-01 "Beauftragte LPH") now route the phase checks:
--        LPH 0 not ticked → REQ-21, REQ-22 (block), REQ-23 (warn) on 820-2-11 are not required (shown as met);
--        LPH 8 not ticked → REQ-19 (820-2-09), REQ-43, REQ-44 (820-2-20) are not required;
--        LPH 9 not ticked → REQ-51, REQ-52 (820-2-24) are not required.
--      Ticked → the check works exactly as before. Not answered → the check waits for 820-2-01 (no silent pass).
--   2. NEW required question on 820-2-17 "Bauleistungen werden an ausführende Firmen vergeben" (Yes/No). No = the client builds
--      in Eigenleistung: REQ-38, REQ-39 (820-2-17), REQ-40 (warn), REQ-41 (820-2-18) are not required; "Art der
--      Leistungsbeschreibung" (820-2-18) and the five award-summary entries of 820-2-19 are hidden. Yes = everything as before.
--   3. REQ-46 (Testbetrieb) applies only when the chosen acceptance model contains a test operation (testbetrieb / mischform);
--      the printed model "Abnahmeprüfungen ohne Testbetrieb" (abnahmepruefung) no longer blocks. REQ-35 (warn, discharge
--      permit extension) applies only when the project has a time-limited discharge (einleitung_vorhanden).
--   4. Seven warn gates that could never fire correctly now read the field that carries their printed sentence (REQ-06, -13,
--      -15, -45, -50, -55, -59); five of them get a new OPTIONAL Yes/No field; four move to the sheet of their clause.
--   5. 15 fields that floated outside every section now sit in section C of their sheet.
--
-- SOURCES (every quote re-read 2026-10-06 on the RENDERED PDF, scoop pdftotext of
--   C:\Users\Ekowai\Desktop\Guidelines\DWA-M-820-2\DWA-M_820-2.pdf, machine match per page; printed page = PDF page − 2;
--   L### = line of Desktop\Guidelines\DWA-M-820-2\DWA-M_820-2.md):
--   [P0]  § 1, L338, PDF p. 14: "Teil 2 umfasst die Leistungserbringung aller Projektbeteiligten über alle Phasen hinweg, d. h. von der
--         Bedarfsplanung (LPH 0) bis zur Objektbetreuung (LPH 9), inklusive Inbetriebnahme und Übergabe an den Betrieb." — EN "Part 2
--         covers the services of all parties across all phases, i.e. from needs planning (LPH 0) to object support (LPH 9) …"
--         → § 5.2 "Phase „Bedarfsplanung“" (L1028, PDF p. 39) = LPH 0: guard of REQ-21 (§ 5.2.2), REQ-22 (§ 5.2.3), REQ-23 (§ 5.2.4).
--   [P8a] § 4.7.2 heading, L955, PDF p. 36: "Qualitätssicherungsplan bzw. -überwachungsplan (LPH 8) wird nicht geführt" — EN "QA /
--         supervision plan (LPH 8) is not kept" → guard of REQ-19.
--   [P8b] § 5.6.2, L1514, PDF p. 53: "Die Bauüberwachung muss die geschlossenen Verträge, inklusive der Leistungsverzeichnisse, kennen und
--         sicherstellen …" with § 4.1, L534, PDF p. 22: "Die örtliche Bauüberwachung und Bauoberleitung werden vergeben oder durch den
--         Auftraggeber erbracht." — EN "Site supervision must know the contracts …"; "Local site supervision and construction
--         management are awarded or performed by the client." → REQ-43 guarded by the LPH 8 token, whose stored label is
--         "LPH 8 – Objektüberwachung (Bauüberwachung)". RESIDUE (sign-off): § 5.6.2 L1531, PDF p. 54 "Werden Bauüberwachungsleistungen
--         vom Auftraggeber selbst erbracht, sind die erforderlichen, fachlichen und personellen Ressourcen in ausreichendem Umfang
--         bereitzustellen." — a client who supervises himself is not checked by any gate (no field), before or after this block.
--   [P8c] § 5.6.3, L1535, PDF p. 54: "Wird in einem Projekt die Bauüberwachung durch einen Auftragnehmer wahrgenommen …" — EN "If site
--         supervision is performed by a contractor …" → REQ-44 guarded by LPH 8.
--   [P9]  § 5.8.3, L1828 / L1836, PDF p. 64: "Die Zuständigkeit für die LPH 9 ist festgelegt …" / "Es ist festgelegt, wer für die Phase LPH 9
--         verantwortlich ist." and the printed situation L1816 "Dem Auftragnehmer ist die LPH 9 nicht beauftragt worden." — EN "Responsibility
--         for LPH 9 is defined"; "the contractor was not commissioned with LPH 9" → § 5.8 "Phase „Gewährleistung“" (L1784, PDF p. 63)
--         = LPH 9: guard of REQ-51, REQ-52.
--   NOT phase-guarded (the print names no LPH for the phase; mapping is a ruling, see 18_SIGN-OFF): § 5.3 Planung, § 5.4 Genehmigungen
--         (REQ-34/-36/-37), § 5.6.1 / § 5.6.4 (REQ-42/-45), § 5.7 Inbetriebnahme (REQ-47/-48/-49).
--   [V1]  § 5.5 heading, L1384, PDF p. 49: "Phase „Vorbereitung und Durchführen der Vergabe“ (Bauleistungen)"; § 5.5.3, L1442, PDF p. 51:
--         "In der Phase der Ausführungsplanung bzw. der Vorbereitung der Vergabe ist die Art der Vergabeverfahren für die Bauleistungen im
--         konkreten Projekt zu definieren."; § 4.1, L517, PDF p. 21: "Auch der Auftraggeber selbst bringt neben seinen (nicht delegierbaren)
--         Bauherrenaufgaben (bspw. Entscheidungen etc.) oft viele Eigenleistungen selbst ins Projekt ein." — EN "phase: preparation and
--         execution of the award (construction works)"; "the type of award procedure for the construction works is to be defined for the
--         specific project"; "the client himself often contributes many own services (Eigenleistungen)". → driver bauleistungen_vergeben
--         (no existing field says it: vob_applicable = VOB/A applicability, which a private client awarding works is not bound by;
--         contract_type = the type of a contract, not whether works are awarded) guards REQ-38, -39, -40, -41.
--   [T1]  § 5.7.1, L1621, PDF p. 57: "In den Vergabeunterlagen für die ausführenden Firmen muss der Auftraggeber formulieren, ob er sich für
--         den Testbetrieb mit anschließender Abnahme, die Abnahmeprüfungen ohne Testbetrieb oder eine Mischform zwischen beiden entscheidet."
--         — EN "… whether he chooses test operation with subsequent acceptance, acceptance tests WITHOUT test operation, or a mixed form."
--   [T2]  § 5.7.1, L1625, PDF p. 57: "Der Regelfall ist der Testbetrieb mit anschließender Abnahmeprüfung. In Einzelfällen kann es sinnvoll
--         sein, nur die Abnahmeprüfung … durchzuführen." — EN "The normal case is test operation followed by acceptance testing. In single
--         cases it can make sense to carry out only the acceptance test …"
--   [T3]  § 5.7.2, L1641, PDF p. 58: "Der geplante Testbetrieb ist beschrieben, ausgeschrieben und wird bezahlt." — EN "The planned test
--         operation is described, tendered and paid." → REQ-46 body kept, guarded by the stored choice (tokens checked in the live
--         enum: testbetrieb / abnahmepruefung / mischform; "mischform" = a mix that contains a test operation → body applies).
--   [E1]  § 5.4.1, L1313, PDF p. 47: "Also laufen insbesondere die Erlaubnisse für die Einleitungen aus Kläranlagen oder Kanalnetzen
--         regelmäßig wieder ab und müssen rechtzeitig verlängert oder neu beantragt werden." — EN "Permits for discharges from treatment
--         plants or sewer networks in particular expire regularly and must be renewed in time." → REQ-35 guarded by einleitung_vorhanden.
--   [F06] § 4.3.4, L638, PDF p. 26 · [F13] § 4.5.3, L840, PDF p. 33 · [F15] § 4.5.5, L885 / L887, PDF p. 34 · [F45] § 5.6.4, L1571, PDF p. 55 ·
--   [F50] § 5.7.6, L1766 / L1774, PDF p. 62 · [F55] § 7.5, L2136, PDF p. 74 · [F59] § 8.3.2, L2311 / L2313, PDF p. 79 — each quoted
--         verbatim (German + EN) in the gate description and the field description below.
--
-- WHAT THIS BLOCK DOES (idempotent; md5-guarded gate edits and guarded field edits with in-transaction archives):
--   1. 6 new boolean fields: bauleistungen_vergeben (820-2-17, B, REQUIRED, reach -18 -19) [V1]; optional, section C:
--      betrieb_frueh_eingebunden (-05) [F06], kostenhinweise_auftragnehmer (-08) [F13], kostenziele_aenderungsprozess (-08) [F15],
--      aenderungsmanagement_gefuehrt (-21) [F45], inbetriebnahme_organisiert (-22) [F50].
--   2. 14 guarded gates: IF <guard> THEN (<live body>) — REQ-21/-22/-23 (LPH 0), REQ-19/-43/-44 (LPH 8), REQ-51/-52 (LPH 9),
--      REQ-38/-39/-40/-41 (bauleistungen_vergeben == true), REQ-46 (choice testbetrieb / mischform), REQ-35 (einleitung_vorhanden).
--      Tokens exactly as stored in the select_many (long labels with an en dash, S-16).
--   3. 7 warn gates re-pointed (severity kept): REQ-06 (stays -05), REQ-13 (-05 → -08), REQ-15 (-06 → -08), REQ-45 (-09 → -21),
--      REQ-50 (-20 → -22), REQ-55 (-25 → -26, title corrected to its clause), REQ-59 (-25 → -27); clause_reference + description.
--   4. section_id = C for 15 active fields that had none (only WHERE section_id IS NULL):
--      -11 changed_needs_recognised · -15 lph_completed, planning_milestones_met, cost_estimation_phase_done, permitting_complete,
--      planning_summary_date · -19 vergabeverfahren_used, auswahlentscheidung_dokumentiert, zuschlag_erteilt_datum, final_contract_value,
--      vergabesumme_summary_date · -21 change_orders, oeffentlichkeitsarbeit_durchgefuehrt, kommunikations_plan_dokumentiert,
--      changes_record_date. (-10 risk_register got its section from the registers block.)
--   5. visible_when = bauleistungen_vergeben == true on -18 leistungsbeschreibung_type and the five -19 summary fields (none is an
--      equation output; an unanswered driver keeps them visible — a hidden field only hides on a definite No).
--   6. consumer reach: included_hoai_phases + -09 -11 -20 -24; testbetrieb_vs_abnahme_choice + -22 (if missing).
-- SAFETY: no severity change, no new gate, no value / equation / table change. 21 existing gate rows edited (11 block, 10 warn; archived),
--   6 new fields, 17 existing field rows edited (archived: 15 sections, 5 of them + leistungsbeschreibung_type visible_when,
--   included_hoai_phases reach; testbetrieb_vs_abnahme_choice only if its reach lacks 820-2-22). A changed live gate text makes its
--   UPDATE a no-op and archives nothing.
-- STAGED — not applied. Apply (from C:\Users\Ekowai\_wt-g2t, which holds .env.local), AFTER the registers block and AFTER the code deploy:
--   node scripts/apply-migration.mjs C:\Users\Ekowai\_wt-m820\scripts\migrations\20261006100000_m820_2_structure.sql
-- Rollback:  C:\Users\Ekowai\_wt-m820\scripts\rollback-20261006100000-m820-2-structure.sql
-- Read-back: C:\Users\Ekowai\_wt-m820\scripts\verification\apply\readback-20261006100000-m820-2-structure.sql
BEGIN;

-- 0. in-transaction archives of every EXISTING row this block changes (pre-state only; a re-run archives nothing)
CREATE TABLE IF NOT EXISTS compliance_requirements_archive_m820_2_structure AS SELECT * FROM compliance_requirements WHERE false;
CREATE TABLE IF NOT EXISTS fields_archive_m820_2_structure AS SELECT * FROM fields WHERE false;

INSERT INTO compliance_requirements_archive_m820_2_structure
SELECT cr.* FROM compliance_requirements cr
  JOIN worksheet_templates w ON w.id = cr.worksheet_template_id
  JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-2'
   AND ((cr.code = 'REQ-21' AND w.code = '820-2-11' AND md5(cr.condition) = '2ba2c857cc940f0b3a22a84ca471e3b8')
     OR (cr.code = 'REQ-22' AND w.code = '820-2-11' AND md5(cr.condition) = '83f45f4cb407540bac4a7e18a975e6df')
     OR (cr.code = 'REQ-23' AND w.code = '820-2-11' AND md5(cr.condition) = 'b1731a08be3aa3689fedc52d29271e5a')
     OR (cr.code = 'REQ-19' AND w.code = '820-2-09' AND md5(cr.condition) = 'c387849e3a2530250c45899da8fe1a2a')
     OR (cr.code = 'REQ-43' AND w.code = '820-2-20' AND md5(cr.condition) = '0dc27b122a711062b3a39cee51c21d1d')
     OR (cr.code = 'REQ-44' AND w.code = '820-2-20' AND md5(cr.condition) = '50e840f5c37437c90f7bd827c855cfe7')
     OR (cr.code = 'REQ-51' AND w.code = '820-2-24' AND md5(cr.condition) = '113c7ddde973cd282d3bc727d2ddc50e')
     OR (cr.code = 'REQ-52' AND w.code = '820-2-24' AND md5(cr.condition) = '91f722c371adecf920ba417dc4f87002')
     OR (cr.code = 'REQ-38' AND w.code = '820-2-17' AND md5(cr.condition) = '83d8cdd4a19cfa2586d02bb3b72166cb')
     OR (cr.code = 'REQ-39' AND w.code = '820-2-17' AND md5(cr.condition) = '6bbf8408017e86eb5af299489d9ba2b7')
     OR (cr.code = 'REQ-40' AND w.code = '820-2-18' AND md5(cr.condition) = 'd4417634fb104153b4002059561b172d')
     OR (cr.code = 'REQ-41' AND w.code = '820-2-18' AND md5(cr.condition) = '520e7f742a64fcc77e86c3a1c2e2d80c')
     OR (cr.code = 'REQ-46' AND w.code = '820-2-22' AND md5(cr.condition) = 'eab8c4028cb5e1e3e6076dc369e50b08')
     OR (cr.code = 'REQ-35' AND w.code = '820-2-16' AND md5(cr.condition) = '2bb9d50c92d791a9b0ae64d9702941aa')
     OR (cr.code = 'REQ-06' AND w.code = '820-2-05' AND md5(cr.condition) = '41aa28121b9a19bd7e94c254e75a21a7')
     OR (cr.code = 'REQ-13' AND w.code = '820-2-05' AND md5(cr.condition) = 'd41d8cd98f00b204e9800998ecf8427e')
     OR (cr.code = 'REQ-15' AND w.code = '820-2-06' AND md5(cr.condition) = '28203d1792af65496d587eb4aa0937b5')
     OR (cr.code = 'REQ-45' AND w.code = '820-2-09' AND md5(cr.condition) = 'cb3b7e90c891c4ccc4a3cd2b5fba88b3')
     OR (cr.code = 'REQ-50' AND w.code = '820-2-20' AND md5(cr.condition) = 'd41d8cd98f00b204e9800998ecf8427e')
     OR (cr.code = 'REQ-55' AND w.code = '820-2-25' AND md5(cr.condition) = 'd41d8cd98f00b204e9800998ecf8427e')
     OR (cr.code = 'REQ-59' AND w.code = '820-2-25' AND md5(cr.condition) = 'd41d8cd98f00b204e9800998ecf8427e'))
   AND NOT EXISTS (SELECT 1 FROM compliance_requirements_archive_m820_2_structure a WHERE a.id = cr.id);

INSERT INTO fields_archive_m820_2_structure
SELECT f.* FROM fields f
  JOIN worksheet_templates w ON w.id = f.worksheet_template_id
  JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-2'
   AND (((w.code, f.symbol) IN (('820-2-11','changed_needs_recognised'),('820-2-15','lph_completed'),('820-2-15','planning_milestones_met'),('820-2-15','cost_estimation_phase_done'),('820-2-15','permitting_complete'),('820-2-15','planning_summary_date'),('820-2-19','vergabeverfahren_used'),('820-2-19','auswahlentscheidung_dokumentiert'),('820-2-19','zuschlag_erteilt_datum'),('820-2-19','final_contract_value'),('820-2-19','vergabesumme_summary_date'),('820-2-21','change_orders'),('820-2-21','oeffentlichkeitsarbeit_durchgefuehrt'),('820-2-21','kommunikations_plan_dokumentiert'),('820-2-21','changes_record_date')) AND f.section_id IS NULL)
     OR ((w.code, f.symbol) IN (('820-2-18','leistungsbeschreibung_type'),('820-2-19','vergabeverfahren_used'),('820-2-19','auswahlentscheidung_dokumentiert'),('820-2-19','zuschlag_erteilt_datum'),('820-2-19','final_contract_value'),('820-2-19','vergabesumme_summary_date')) AND (f.visible_when IS NULL OR position('bauleistungen_vergeben == true' IN f.visible_when) = 0))
     OR (w.code = '820-2-01' AND f.symbol = 'included_hoai_phases' AND NOT (COALESCE(f.consumer_worksheets, '{}'::text[]) @> ARRAY['820-2-09','820-2-11','820-2-20','820-2-24']::text[]))
     OR (w.code = '820-2-18' AND f.symbol = 'testbetrieb_vs_abnahme_choice' AND NOT (COALESCE(f.consumer_worksheets, '{}'::text[]) @> ARRAY['820-2-22']::text[])))
   AND NOT EXISTS (SELECT 1 FROM fields_archive_m820_2_structure a WHERE a.id = f.id);

-- 1. new fields (one required driver on 820-2-17, five optional booleans that carry the printed sentence a warn gate checks)
-- 820-2-17 bauleistungen_vergeben (required, section B)
INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, description, verification_status, verification_quote, source_anchor, widget, ui_config, lookup, visible_when, enum_values, consumer_worksheets, order_index, active)
SELECT w.id, (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'B'), 'bauleistungen_vergeben', 'Bauleistungen werden an ausführende Firmen vergeben (Ausschreibung / Vergabe durch den Auftraggeber)', 'Construction works are awarded to executing firms (tender / award by the client)', 'boolean', NULL, true, '§5.5; §4.1',
       'Werden die Bauleistungen an ausführende Firmen vergeben? § 5.5 trägt die Überschrift „Phase „Vorbereitung und Durchführen der Vergabe“ (Bauleistungen)“ (PDF S. 49); § 5.5.3: „In der Phase der Ausführungsplanung bzw. der Vorbereitung der Vergabe ist die Art der Vergabeverfahren für die Bauleistungen im konkreten Projekt zu definieren.“ (PDF S. 51); § 4.1: „Auch der Auftraggeber selbst bringt neben seinen (nicht delegierbaren) Bauherrenaufgaben (bspw. Entscheidungen etc.) oft viele Eigenleistungen selbst ins Projekt ein.“ (PDF S. 21). Ja (auch wenn nur einzelne Lose vergeben werden) = die Vergabeprüfungen REQ-38, REQ-39, REQ-40, REQ-41 gelten. Nein (der Auftraggeber erbringt die Bauleistungen in Eigenleistung) = diese Prüfungen sind nicht erforderlich — Entscheidung hier dokumentiert (in der Prüfliste erscheinen sie als erfüllt); „Art der Leistungsbeschreibung“ (820-2-18) und die fünf Angaben der Vergabe-Zusammenfassung (820-2-19) werden ausgeblendet. Pflichtangabe: ohne Antwort warten die vier Prüfungen auf diese Eingabe.
[EN] Are the construction works awarded to executing firms? § 5.5 is headed "Phase "preparation and execution of the award" (construction works)"; § 5.5.3: "In the execution-planning or award-preparation phase the type of award procedure for the construction works is to be defined for the specific project."; § 4.1: "The client himself often contributes many own services (Eigenleistungen) to the project besides his (non-delegable) client tasks." Yes (also when only some lots are awarded) = the award checks REQ-38, REQ-39, REQ-40, REQ-41 apply. No (the client performs the construction works in Eigenleistung) = these checks are not required — decision documented here (they appear as met in the gate list); "type of specification" (820-2-18) and the five award-summary entries (820-2-19) are hidden. Required: without an answer the four checks wait for this input.',
       'imported_unverified', 'Phase „Vorbereitung und Durchführen der Vergabe“ (Bauleistungen) — In der Phase der Ausführungsplanung bzw. der Vorbereitung der Vergabe ist die Art der Vergabeverfahren für die Bauleistungen im konkreten Projekt zu definieren. — Auch der Auftraggeber selbst bringt neben seinen (nicht delegierbaren) Bauherrenaufgaben (bspw. Entscheidungen etc.) oft viele Eigenleistungen selbst ins Projekt ein.', 'DWA-M 820-2 §5.5 Z.1384 (PDF S. 49) + §5.5.3 Z.1442 (PDF S. 51) + §4.1 Z.517 (PDF S. 21)', NULL, NULL, NULL, NULL, NULL, ARRAY['820-2-18','820-2-19']::text[], (SELECT COALESCE(MAX(f3.order_index), 0) + 1 FROM fields f3 WHERE f3.worksheet_template_id = w.id), true
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE s.code = 'DWA-M-820-2' AND w.code = '820-2-17'
   AND NOT EXISTS (SELECT 1 FROM fields f2 WHERE f2.worksheet_template_id = w.id AND f2.symbol = 'bauleistungen_vergeben');

-- 820-2-05 betrieb_frueh_eingebunden (optional, section C)
INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, description, verification_status, verification_quote, source_anchor, widget, ui_config, lookup, visible_when, enum_values, consumer_worksheets, order_index, active)
SELECT w.id, (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'C'), 'betrieb_frueh_eingebunden', 'Betrieb bereits in Konzeption und Bedarfsplanung aktiv eingebunden', 'Operator actively involved already in concept and needs planning', 'boolean', NULL, false, '§4.3.4',
       '§ 4.3.4 (PDF S. 26): „Bereits in der Phase der Konzeption und Bedarfsplanung wird der Betrieb aktiv eingebunden.“ Gelesen von REQ-06 (Warnung). Nicht verpflichtend.
[EN] § 4.3.4: "The operator is actively involved already in the concept and needs-planning phase." Read by REQ-06 (warning). Not required.',
       'imported_unverified', 'Bereits in der Phase der Konzeption und Bedarfsplanung wird der Betrieb aktiv eingebunden.', 'DWA-M 820-2 §4.3.4 Z.638 (PDF S. 26)', NULL, NULL, NULL, NULL, NULL, NULL, (SELECT COALESCE(MAX(f3.order_index), 0) + 1 FROM fields f3 WHERE f3.worksheet_template_id = w.id), true
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE s.code = 'DWA-M-820-2' AND w.code = '820-2-05'
   AND NOT EXISTS (SELECT 1 FROM fields f2 WHERE f2.worksheet_template_id = w.id AND f2.symbol = 'betrieb_frueh_eingebunden');

-- 820-2-08 kostenhinweise_auftragnehmer (optional, section C)
INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, description, verification_status, verification_quote, source_anchor, widget, ui_config, lookup, visible_when, enum_values, consumer_worksheets, order_index, active)
SELECT w.id, (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'C'), 'kostenhinweise_auftragnehmer', 'Auftragnehmer hat auf Kosteninhalte (Abgrenzung DIN 276), erzielbare Genauigkeit und Risiken hingewiesen', 'Contractor advised on cost content (DIN 276 delimitation), achievable accuracy and risks', 'boolean', NULL, false, '§4.5.3',
       '§ 4.5.3 (PDF S. 33): „Der Auftragnehmer weist den Auftraggeber auf die Inhalte der zu ermittelnden Kosten (Abgrenzung zu den Kostengruppen nach DIN 276) sowie die erzielbare Genauigkeit und mögliche Risiken hin.“ Gelesen von REQ-13 (Warnung). Nicht verpflichtend.
[EN] § 4.5.3: "The contractor advises the client on the content of the costs to be determined (delimitation to the DIN 276 cost groups), the achievable accuracy and possible risks." Read by REQ-13 (warning). Not required.',
       'imported_unverified', 'Der Auftragnehmer weist den Auftraggeber auf die Inhalte der zu ermittelnden Kosten (Abgrenzung zu den Kostengruppen nach DIN 276) sowie die erzielbare Genauigkeit und mögliche Risiken hin.', 'DWA-M 820-2 §4.5.3 Z.840 (PDF S. 33)', NULL, NULL, NULL, NULL, NULL, NULL, (SELECT COALESCE(MAX(f3.order_index), 0) + 1 FROM fields f3 WHERE f3.worksheet_template_id = w.id), true
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE s.code = 'DWA-M-820-2' AND w.code = '820-2-08'
   AND NOT EXISTS (SELECT 1 FROM fields f2 WHERE f2.worksheet_template_id = w.id AND f2.symbol = 'kostenhinweise_auftragnehmer');

-- 820-2-08 kostenziele_aenderungsprozess (optional, section C)
INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, description, verification_status, verification_quote, source_anchor, widget, ui_config, lookup, visible_when, enum_values, consumer_worksheets, order_index, active)
SELECT w.id, (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'C'), 'kostenziele_aenderungsprozess', 'Prozessablauf für Änderungen der Projektinhalte festgelegt (Kostenziele danach neu beschlossen)', 'Process for changes of project content defined (cost targets re-resolved after it)', 'boolean', NULL, false, '§4.5.5',
       '§ 4.5.5 (PDF S. 34): „Es ist ein Prozessablauf festgelegt, wie mit Änderungen der Projektinhalte umgegangen werden muss.“ „Nach diesem Prozess sind die Kostenziele neu zu erarbeiten, festzulegen und zu beschließen.“ Gelesen von REQ-15 (Warnung). Nicht verpflichtend.
[EN] § 4.5.5: "A process is laid down for how changes of the project content must be handled." "Following this process the cost targets are to be re-worked, fixed and resolved." Read by REQ-15 (warning). Not required.',
       'imported_unverified', 'Es ist ein Prozessablauf festgelegt, wie mit Änderungen der Projektinhalte umgegangen werden muss. — Nach diesem Prozess sind die Kostenziele neu zu erarbeiten, festzulegen und zu beschließen.', 'DWA-M 820-2 §4.5.5 Z.885/887 (PDF S. 34)', NULL, NULL, NULL, NULL, NULL, NULL, (SELECT COALESCE(MAX(f3.order_index), 0) + 1 FROM fields f3 WHERE f3.worksheet_template_id = w.id), true
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE s.code = 'DWA-M-820-2' AND w.code = '820-2-08'
   AND NOT EXISTS (SELECT 1 FROM fields f2 WHERE f2.worksheet_template_id = w.id AND f2.symbol = 'kostenziele_aenderungsprozess');

-- 820-2-21 aenderungsmanagement_gefuehrt (optional, section C)
INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, description, verification_status, verification_quote, source_anchor, widget, ui_config, lookup, visible_when, enum_values, consumer_worksheets, order_index, active)
SELECT w.id, (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'C'), 'aenderungsmanagement_gefuehrt', 'Änderungsmanagement bei erforderlichen Bauänderungen konsequent geführt', 'Change management carried out consistently for necessary construction changes', 'boolean', NULL, false, '§5.6.4',
       '§ 5.6.4 (PDF S. 55): „Werden Änderungen aus besonderen Gründen erforderlich, ist das Änderungsmanagement konsequent zu führen.“ Gelesen von REQ-45 (Warnung), nur wenn das Register Bauänderungen / Nachträge Zeilen hat. Nicht verpflichtend.
[EN] § 5.6.4: "If changes become necessary for special reasons, change management is to be carried out consistently." Read by REQ-45 (warning), only when the construction-change register has rows. Not required.',
       'imported_unverified', 'Werden Änderungen aus besonderen Gründen erforderlich, ist das Änderungsmanagement konsequent zu führen.', 'DWA-M 820-2 §5.6.4 Z.1571 (PDF S. 55)', NULL, NULL, NULL, NULL, NULL, NULL, (SELECT COALESCE(MAX(f3.order_index), 0) + 1 FROM fields f3 WHERE f3.worksheet_template_id = w.id), true
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE s.code = 'DWA-M-820-2' AND w.code = '820-2-21'
   AND NOT EXISTS (SELECT 1 FROM fields f2 WHERE f2.worksheet_template_id = w.id AND f2.symbol = 'aenderungsmanagement_gefuehrt');

-- 820-2-22 inbetriebnahme_organisiert (optional, section C)
INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, description, verification_status, verification_quote, source_anchor, widget, ui_config, lookup, visible_when, enum_values, consumer_worksheets, order_index, active)
SELECT w.id, (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'C'), 'inbetriebnahme_organisiert', 'Testbetrieb / Inbetriebnahme geplant, organisiert und vorbereitet; Verantwortung und Personal geklärt', 'Test operation / commissioning planned, organised and prepared; responsibility and staff clarified', 'boolean', NULL, false, '§5.7.6',
       '§ 5.7.6 (PDF S. 62): „Die Inbetriebnahme oder der Testbetrieb werden sorgfältig geplant, organisiert und vorbereitet.“ „Es ist geklärt, wer den Testbetrieb oder die Inbetriebnahme verantwortet und wer, welches Personal, in welchem Zeitraum beistellt.“ Gelesen von REQ-50 (Warnung). Nicht verpflichtend.
[EN] § 5.7.6: "Commissioning or test operation are carefully planned, organised and prepared." "It is clarified who is responsible for the test operation or commissioning and who provides which staff for which period." Read by REQ-50 (warning). Not required.',
       'imported_unverified', 'Die Inbetriebnahme oder der Testbetrieb werden sorgfältig geplant, organisiert und vorbereitet. — Es ist geklärt, wer den Testbetrieb oder die Inbetriebnahme verantwortet und wer, welches Personal, in welchem Zeitraum beistellt.', 'DWA-M 820-2 §5.7.6 Z.1766/1774 (PDF S. 62)', NULL, NULL, NULL, NULL, NULL, NULL, (SELECT COALESCE(MAX(f3.order_index), 0) + 1 FROM fields f3 WHERE f3.worksheet_template_id = w.id), true
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE s.code = 'DWA-M-820-2' AND w.code = '820-2-22'
   AND NOT EXISTS (SELECT 1 FROM fields f2 WHERE f2.worksheet_template_id = w.id AND f2.symbol = 'inbetriebnahme_organisiert');

-- 2. gate guards (bodies byte-identical inside the guard; SET condition first, cr.code first; md5 guard on the live text)
-- REQ-21 (820-2-11) [P0]
UPDATE compliance_requirements cr
   SET condition = 'IF contains(included_hoai_phases, ''LPH 0 – Bedarfsplanung'') THEN (framework_conditions_clarified == true)'
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE cr.code = 'REQ-21' AND w.id = cr.worksheet_template_id AND w.code = '820-2-11' AND s.code = 'DWA-M-820-2'
   AND md5(cr.condition) = '2ba2c857cc940f0b3a22a84ca471e3b8';

-- REQ-22 (820-2-11) [P0]
UPDATE compliance_requirements cr
   SET condition = 'IF contains(included_hoai_phases, ''LPH 0 – Bedarfsplanung'') THEN (forward_planning_done == true)'
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE cr.code = 'REQ-22' AND w.id = cr.worksheet_template_id AND w.code = '820-2-11' AND s.code = 'DWA-M-820-2'
   AND md5(cr.condition) = '83f45f4cb407540bac4a7e18a975e6df';

-- REQ-23 (820-2-11) [P0]
UPDATE compliance_requirements cr
   SET condition = 'IF contains(included_hoai_phases, ''LPH 0 – Bedarfsplanung'') THEN (changed_needs_recognised == true)'
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE cr.code = 'REQ-23' AND w.id = cr.worksheet_template_id AND w.code = '820-2-11' AND s.code = 'DWA-M-820-2'
   AND md5(cr.condition) = 'b1731a08be3aa3689fedc52d29271e5a';

-- REQ-19 (820-2-09) [P8a]
UPDATE compliance_requirements cr
   SET condition = 'IF contains(included_hoai_phases, ''LPH 8 – Objektüberwachung (Bauüberwachung)'') THEN (qs_plan_lph8_present == true)'
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE cr.code = 'REQ-19' AND w.id = cr.worksheet_template_id AND w.code = '820-2-09' AND s.code = 'DWA-M-820-2'
   AND md5(cr.condition) = 'c387849e3a2530250c45899da8fe1a2a';

-- REQ-43 (820-2-20) [P8b]
UPDATE compliance_requirements cr
   SET condition = 'IF contains(included_hoai_phases, ''LPH 8 – Objektüberwachung (Bauüberwachung)'') THEN (quality_supervision_active == true)'
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE cr.code = 'REQ-43' AND w.id = cr.worksheet_template_id AND w.code = '820-2-20' AND s.code = 'DWA-M-820-2'
   AND md5(cr.condition) = '0dc27b122a711062b3a39cee51c21d1d';

-- REQ-44 (820-2-20) [P8c]
UPDATE compliance_requirements cr
   SET condition = 'IF contains(included_hoai_phases, ''LPH 8 – Objektüberwachung (Bauüberwachung)'') THEN (bauueberwachung_competencies == true)'
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE cr.code = 'REQ-44' AND w.id = cr.worksheet_template_id AND w.code = '820-2-20' AND s.code = 'DWA-M-820-2'
   AND md5(cr.condition) = '50e840f5c37437c90f7bd827c855cfe7';

-- REQ-51 (820-2-24) [P9]
UPDATE compliance_requirements cr
   SET condition = 'IF contains(included_hoai_phases, ''LPH 9 – Objektbetreuung'') THEN (warranty_start_date IS NOT NULL AND warranty_end_date IS NOT NULL)'
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE cr.code = 'REQ-51' AND w.id = cr.worksheet_template_id AND w.code = '820-2-24' AND s.code = 'DWA-M-820-2'
   AND md5(cr.condition) = '113c7ddde973cd282d3bc727d2ddc50e';

-- REQ-52 (820-2-24) [P9]
UPDATE compliance_requirements cr
   SET condition = 'IF contains(included_hoai_phases, ''LPH 9 – Objektbetreuung'') THEN (defect_tracking_active == true)'
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE cr.code = 'REQ-52' AND w.id = cr.worksheet_template_id AND w.code = '820-2-24' AND s.code = 'DWA-M-820-2'
   AND md5(cr.condition) = '91f722c371adecf920ba417dc4f87002';

-- REQ-38 (820-2-17) [V1]
UPDATE compliance_requirements cr
   SET condition = 'IF bauleistungen_vergeben == true THEN (nebenangebote_conditions == true)'
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE cr.code = 'REQ-38' AND w.id = cr.worksheet_template_id AND w.code = '820-2-17' AND s.code = 'DWA-M-820-2'
   AND md5(cr.condition) = '83d8cdd4a19cfa2586d02bb3b72166cb';

-- REQ-39 (820-2-17) [V1]
UPDATE compliance_requirements cr
   SET condition = 'IF bauleistungen_vergeben == true THEN (eignungskriterien_set == true)'
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE cr.code = 'REQ-39' AND w.id = cr.worksheet_template_id AND w.code = '820-2-17' AND s.code = 'DWA-M-820-2'
   AND md5(cr.condition) = '6bbf8408017e86eb5af299489d9ba2b7';

-- REQ-40 (820-2-18) [V1]
UPDATE compliance_requirements cr
   SET condition = 'IF bauleistungen_vergeben == true THEN (leistungsbeschreibung_type IS NOT NULL)'
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE cr.code = 'REQ-40' AND w.id = cr.worksheet_template_id AND w.code = '820-2-18' AND s.code = 'DWA-M-820-2'
   AND md5(cr.condition) = 'd4417634fb104153b4002059561b172d';

-- REQ-41 (820-2-18) [V1]
UPDATE compliance_requirements cr
   SET condition = 'IF bauleistungen_vergeben == true THEN (rahmenterminplan_attached == true)'
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE cr.code = 'REQ-41' AND w.id = cr.worksheet_template_id AND w.code = '820-2-18' AND s.code = 'DWA-M-820-2'
   AND md5(cr.condition) = '520e7f742a64fcc77e86c3a1c2e2d80c';

-- REQ-46 (820-2-22) [T1]
UPDATE compliance_requirements cr
   SET condition = 'IF testbetrieb_vs_abnahme_choice == ''testbetrieb'' OR testbetrieb_vs_abnahme_choice == ''mischform'' THEN (testbetrieb_planned == true)'
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE cr.code = 'REQ-46' AND w.id = cr.worksheet_template_id AND w.code = '820-2-22' AND s.code = 'DWA-M-820-2'
   AND md5(cr.condition) = 'eab8c4028cb5e1e3e6076dc369e50b08';

-- REQ-35 (820-2-16) [E1]
UPDATE compliance_requirements cr
   SET condition = 'IF einleitung_vorhanden == true THEN (discharge_permit_extension IN {"applied","granted","not_required"})'
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE cr.code = 'REQ-35' AND w.id = cr.worksheet_template_id AND w.code = '820-2-16' AND s.code = 'DWA-M-820-2'
   AND md5(cr.condition) = '2bb9d50c92d791a9b0ae64d9702941aa';

-- 3. S-07 fills: empty / wrong-symbol / wrong-sheet warn gates read the field that carries their printed sentence (severity kept)
-- REQ-06 820-2-05 [F06]
UPDATE compliance_requirements cr
   SET condition = 'betrieb_frueh_eingebunden == true',
       clause_reference = '§4.3.4',
       description = '§ 4.3.4 (PDF S. 26): „Bereits in der Phase der Konzeption und Bedarfsplanung wird der Betrieb aktiv eingebunden.“ Liest das Feld „Betrieb bereits in Konzeption und Bedarfsplanung aktiv eingebunden“ (vorher las das Gate das Feld von REQ-05).
[EN] § 4.3.4: "The operator is actively involved already in the concept and needs-planning phase." Reads the field "operator actively involved already in concept and needs planning" (before, the gate read REQ-05''s field).'
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id, worksheet_templates wt
 WHERE cr.code = 'REQ-06' AND w.id = cr.worksheet_template_id AND w.code = '820-2-05' AND s.code = 'DWA-M-820-2'
   AND wt.standard_id = s.id AND wt.code = '820-2-05'
   AND md5(cr.condition) = '41aa28121b9a19bd7e94c254e75a21a7';

-- REQ-13 820-2-05 → 820-2-08 [F13]
UPDATE compliance_requirements cr
   SET condition = 'kostenhinweise_auftragnehmer == true',
       clause_reference = '§4.5.3',
       description = '§ 4.5.3 (PDF S. 33): „Der Auftragnehmer weist den Auftraggeber auf die Inhalte der zu ermittelnden Kosten (Abgrenzung zu den Kostengruppen nach DIN 276) sowie die erzielbare Genauigkeit und mögliche Risiken hin.“ Vorher leere Bedingung auf 820-2-05; jetzt auf 820-2-08 (Kostenmanagement).
[EN] § 4.5.3: "The contractor advises the client on the content of the costs to be determined (delimitation to the DIN 276 cost groups), the achievable accuracy and possible risks." Was an empty condition on 820-2-05; now on 820-2-08 (cost management).',
       worksheet_template_id = wt.id
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id, worksheet_templates wt
 WHERE cr.code = 'REQ-13' AND w.id = cr.worksheet_template_id AND w.code = '820-2-05' AND s.code = 'DWA-M-820-2'
   AND wt.standard_id = s.id AND wt.code = '820-2-08'
   AND md5(cr.condition) = 'd41d8cd98f00b204e9800998ecf8427e';

-- REQ-15 820-2-06 → 820-2-08 [F15]
UPDATE compliance_requirements cr
   SET condition = 'kostenziele_aenderungsprozess == true',
       clause_reference = '§4.5.5',
       description = '§ 4.5.5 (PDF S. 34): „Es ist ein Prozessablauf festgelegt, wie mit Änderungen der Projektinhalte umgegangen werden muss.“ „Nach diesem Prozess sind die Kostenziele neu zu erarbeiten, festzulegen und zu beschließen.“ Vorher las das Gate change_log_present (halb REQ-09) auf 820-2-06; jetzt eigenes Feld auf 820-2-08.
[EN] § 4.5.5: "A process is laid down for how changes of the project content must be handled." "Following this process the cost targets are to be re-worked, fixed and resolved." Before, the gate read change_log_present (half of REQ-09) on 820-2-06; now its own field on 820-2-08.',
       worksheet_template_id = wt.id
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id, worksheet_templates wt
 WHERE cr.code = 'REQ-15' AND w.id = cr.worksheet_template_id AND w.code = '820-2-06' AND s.code = 'DWA-M-820-2'
   AND wt.standard_id = s.id AND wt.code = '820-2-08'
   AND md5(cr.condition) = '28203d1792af65496d587eb4aa0937b5';

-- REQ-45 820-2-09 → 820-2-21 [F45]
UPDATE compliance_requirements cr
   SET condition = 'change_orders IS EMPTY OR aenderungsmanagement_gefuehrt == true',
       clause_reference = '§5.6.4',
       description = '§ 5.6.4 (PDF S. 55): „Werden Änderungen aus besonderen Gründen erforderlich, ist das Änderungsmanagement konsequent zu führen.“ Ohne Bauänderungen (Register leer) erfüllt; mit Bauänderungen liest das Gate „Änderungsmanagement konsequent geführt“. Vorher las es den Freigabeprozess von REQ-17 auf 820-2-09.
[EN] § 5.6.4: "If changes become necessary for special reasons, change management is to be carried out consistently." No construction changes (register empty) = met; with changes the gate reads "change management carried out consistently". Before, it read REQ-17''s approval procedure on 820-2-09.',
       worksheet_template_id = wt.id
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id, worksheet_templates wt
 WHERE cr.code = 'REQ-45' AND w.id = cr.worksheet_template_id AND w.code = '820-2-09' AND s.code = 'DWA-M-820-2'
   AND wt.standard_id = s.id AND wt.code = '820-2-21'
   AND md5(cr.condition) = 'cb3b7e90c891c4ccc4a3cd2b5fba88b3';

-- REQ-50 820-2-20 → 820-2-22 [F50]
UPDATE compliance_requirements cr
   SET condition = 'inbetriebnahme_organisiert == true',
       clause_reference = '§5.7.6',
       description = '§ 5.7.6 (PDF S. 62): „Die Inbetriebnahme oder der Testbetrieb werden sorgfältig geplant, organisiert und vorbereitet.“ „Es ist geklärt, wer den Testbetrieb oder die Inbetriebnahme verantwortet und wer, welches Personal, in welchem Zeitraum beistellt.“ Vorher leere Bedingung auf 820-2-20 (Klausel „5.6.4“); jetzt auf 820-2-22.
[EN] § 5.7.6: "Commissioning or test operation are carefully planned, organised and prepared." "It is clarified who is responsible for the test operation or commissioning and who provides which staff for which period." Was an empty condition on 820-2-20 (clause "5.6.4"); now on 820-2-22.',
       worksheet_template_id = wt.id
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id, worksheet_templates wt
 WHERE cr.code = 'REQ-50' AND w.id = cr.worksheet_template_id AND w.code = '820-2-20' AND s.code = 'DWA-M-820-2'
   AND wt.standard_id = s.id AND wt.code = '820-2-22'
   AND md5(cr.condition) = 'd41d8cd98f00b204e9800998ecf8427e';

-- REQ-55 820-2-25 → 820-2-26 [F55]
UPDATE compliance_requirements cr
   SET condition = 'liability_clarified == true',
       clause_reference = '§7.5',
       description = '§ 7.5 (PDF S. 74): „Die Haftungsfragen, die sich insbesondere mit neuartigen, innovativen Lösungsansätzen ergeben, die nicht die anerkannten Regeln der Technik erfüllen, sind vertraglich fair verteilt.“ Liest das vorhandene Feld „Haftungsfragen geklärt“ (820-2-26). Vorher leere Bedingung auf 820-2-25.
[EN] § 7.5: "Liability questions arising in particular from novel, innovative approaches that do not meet the generally accepted rules of technology are fairly distributed by contract." Reads the existing field "liability questions clarified" (820-2-26). Was an empty condition on 820-2-25.',
       title_de = 'Haftungsfragen bei innovativen Lösungen vertraglich fair verteilt',
       title_en = 'Liability for innovative solutions fairly distributed by contract',
       worksheet_template_id = wt.id
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id, worksheet_templates wt
 WHERE cr.code = 'REQ-55' AND w.id = cr.worksheet_template_id AND w.code = '820-2-25' AND s.code = 'DWA-M-820-2'
   AND wt.standard_id = s.id AND wt.code = '820-2-26'
   AND md5(cr.condition) = 'd41d8cd98f00b204e9800998ecf8427e';

-- REQ-59 820-2-25 → 820-2-27 [F59]
UPDATE compliance_requirements cr
   SET condition = 'IF bim_methode_angewendet == true THEN (bim_basics_established == true)',
       clause_reference = '§8.3.2',
       description = '§ 8.3.2 (PDF S. 79): „Es wird geklärt, ob das Projekt für die Anwendung der BIM-Methodik geeignet ist und ob die Beteiligten sowohl beim Auftraggeber als auch bei den Auftragnehmern die nötigen Kompetenzen und Qualifikationen aufweisen.“ „Das erforderliche Know-how und die Ressourcen werden geschaffen, um die Methode anwenden zu können.“ Nur wenn das Projekt mit der BIM-Methode abgewickelt wird: BIM-Grundlagen vorhanden. Vorher leere Bedingung auf 820-2-25.
[EN] § 8.3.2: "It is clarified whether the project suits the BIM method and whether the parties on the client and contractor side have the necessary competences and qualifications." "The required know-how and resources are created to be able to apply the method." Only when the project runs with BIM: BIM basics established. Was an empty condition on 820-2-25.',
       worksheet_template_id = wt.id
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id, worksheet_templates wt
 WHERE cr.code = 'REQ-59' AND w.id = cr.worksheet_template_id AND w.code = '820-2-25' AND s.code = 'DWA-M-820-2'
   AND wt.standard_id = s.id AND wt.code = '820-2-27'
   AND md5(cr.condition) = 'd41d8cd98f00b204e9800998ecf8427e';

-- 4. S-08: active fields without a section get section C ("Worksheet-Specific Content") of their sheet (only where still NULL)
UPDATE fields f
   SET section_id = (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'C')
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND s.code = 'DWA-M-820-2' AND f.section_id IS NULL
   AND (w.code, f.symbol) IN (('820-2-11','changed_needs_recognised'),('820-2-15','lph_completed'),('820-2-15','planning_milestones_met'),('820-2-15','cost_estimation_phase_done'),('820-2-15','permitting_complete'),('820-2-15','planning_summary_date'),('820-2-19','vergabeverfahren_used'),('820-2-19','auswahlentscheidung_dokumentiert'),('820-2-19','zuschlag_erteilt_datum'),('820-2-19','final_contract_value'),('820-2-19','vergabesumme_summary_date'),('820-2-21','change_orders'),('820-2-21','oeffentlichkeitsarbeit_durchgefuehrt'),('820-2-21','kommunikations_plan_dokumentiert'),('820-2-21','changes_record_date'));

-- 5. S-02: entries that only exist with a construction award are hidden when bauleistungen_vergeben = false (plain rule where none
--    exists, composed (<existing>) AND (<new>) otherwise — the 2026-10-05 dump has none). Producer guard: none is an equation output.
UPDATE fields f
   SET visible_when = 'bauleistungen_vergeben == true'
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND s.code = 'DWA-M-820-2' AND f.visible_when IS NULL
   AND (w.code, f.symbol) IN (('820-2-18','leistungsbeschreibung_type'),('820-2-19','vergabeverfahren_used'),('820-2-19','auswahlentscheidung_dokumentiert'),('820-2-19','zuschlag_erteilt_datum'),('820-2-19','final_contract_value'),('820-2-19','vergabesumme_summary_date'));
UPDATE fields f
   SET visible_when = '(' || f.visible_when || ') AND (bauleistungen_vergeben == true)'
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND s.code = 'DWA-M-820-2' AND f.visible_when IS NOT NULL
   AND position('bauleistungen_vergeben == true' IN f.visible_when) = 0
   AND (w.code, f.symbol) IN (('820-2-18','leistungsbeschreibung_type'),('820-2-19','vergabeverfahren_used'),('820-2-19','auswahlentscheidung_dokumentiert'),('820-2-19','zuschlag_erteilt_datum'),('820-2-19','final_contract_value'),('820-2-19','vergabesumme_summary_date'));

-- 6. consumer reach (append only the missing codes, existing order kept): the guarded sheets see the driver in their form
UPDATE fields f
   SET consumer_worksheets = COALESCE(f.consumer_worksheets, '{}'::text[])
       || ARRAY(SELECT u.c FROM unnest(ARRAY['820-2-09','820-2-11','820-2-20','820-2-24']::text[]) WITH ORDINALITY AS u(c, o)
                 WHERE NOT (u.c = ANY (COALESCE(f.consumer_worksheets, '{}'::text[]))) ORDER BY u.o)
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-01' AND f.symbol = 'included_hoai_phases'
   AND NOT (COALESCE(f.consumer_worksheets, '{}'::text[]) @> ARRAY['820-2-09','820-2-11','820-2-20','820-2-24']::text[]);

UPDATE fields f
   SET consumer_worksheets = COALESCE(f.consumer_worksheets, '{}'::text[])
       || ARRAY(SELECT u.c FROM unnest(ARRAY['820-2-22']::text[]) WITH ORDINALITY AS u(c, o)
                 WHERE NOT (u.c = ANY (COALESCE(f.consumer_worksheets, '{}'::text[]))) ORDER BY u.o)
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-18' AND f.symbol = 'testbetrieb_vs_abnahme_choice'
   AND NOT (COALESCE(f.consumer_worksheets, '{}'::text[]) @> ARRAY['820-2-22']::text[]);

COMMIT;
