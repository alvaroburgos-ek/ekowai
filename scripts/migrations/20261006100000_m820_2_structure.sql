-- 20261006100000_m820_2_structure.sql · DWA-M 820-2 structure block: phase routing, construction-award / Eigenleistung route,
-- REQ-46 acceptance path, empty / wrong-symbol / wrong-sheet gates, fields without a section.
-- Brief: vault 01-Projects/ekowai-wizard/m820-wizard-test/_briefs/structure-2-brief.md (findings S-01, S-02, S-03, S-07, S-08 of
-- 10_Inventory_M820-2.md). Composes with the registers block 20261005200000_m820_2_registers.sql (apply that one FIRST).
--
-- REVIEW ROUND 1 (controller rulings C-1 / I-1 / I-2, 2026-10-06): the phase checks are routed by WHO PERFORMS the phase, not by
--   "phase contracted to the engineer" — § 5.8.3 prints the uncontracted LPH 9 as the problem, § 4.1 lets the client supervise
--   himself, § 1 covers "aller Projektbeteiligten". The contains(included_hoai_phases, …) guards of round 0 are gone; nothing in this
--   block reads included_hoai_phases any more, so the approval-gate / dossier code change of round 0 is reverted (data only).
--
-- WHAT THE PROJECT TEAM SEES (plain English):
--   1. Three NEW required questions on 820-2-01 "who performs the phase": LPH 0 (Bedarfsplanung), LPH 8 (Bauüberwachung), LPH 9
--      (Objektbetreuung / Gewährleistung) — Auftragnehmer / Auftraggeber selbst / Dritter, and for LPH 8 and LPH 9 also "entfällt —
--      keine Bauausführung" (concept work only). LPH 0 has no "entfällt" (§ 1: every concept and project needs needs planning).
--        LPH 8: REQ-19 (820-2-09) and REQ-43 (820-2-20) apply whoever supervises, the client included; REQ-44 only for an external
--               supervisor (Auftragnehmer / Dritter); "entfällt" → not required and their inputs hidden.
--        LPH 9: REQ-51, REQ-52 and NEW REQ-52-2 (820-2-24, the responsible party must be named) apply whoever is responsible;
--               "entfällt" → not required and the warranty inputs hidden.
--        LPH 0: documents who performs the needs planning; REQ-21/-22/-23 are NOT touched (they apply in every project).
--      Not answered → every routed check waits for the answer on 820-2-01 (no silent pass).
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
--   [P1]  § 1, L336 / L338, PDF p. 14: "Der Anwendungsbereich des vorliegenden Merkblatts umfasst alle Phasen der Konzepterstellung und
--         Projektabwicklung bis hin zur Inbetriebnahme und Übergabe." · "Er erstreckt sich auch auf die zugehörigen Bedarfsplanungen, da
--         sowohl die Konzepte als auch alle Projekte einer umfangreichen Vorbereitung durch den Auftraggeber bedürfen." · "Teil 2 umfasst die
--         Leistungserbringung aller Projektbeteiligten über alle Phasen hinweg, d. h. von der Bedarfsplanung (LPH 0) bis zur Objektbetreuung
--         (LPH 9) …" — EN "The scope covers all phases of concept work and project execution up to commissioning and handover." · "It also
--         extends to the related needs planning, since concepts as well as all projects need extensive preparation by the client." ·
--         "Part 2 covers the services of ALL parties across all phases …" → the drivers ask who performs the phase; "entfaellt" only for
--         a project without construction (concept work) and only for LPH 8 / LPH 9; LPH 0 never "entfaellt".
--   [P8a] § 4.7.2 heading, L955, PDF p. 36: "Qualitätssicherungsplan bzw. -überwachungsplan (LPH 8) wird nicht geführt" and L967 "Für alle
--         wichtigen Gewerke ist festgelegt, wo und wie die einzelnen Qualitätsaspekte kontrolliert und dokumentiert werden." → REQ-19
--         applies whenever LPH 8 is performed (verantwortung_lph8 != 'entfaellt').
--   [P8b] § 4.1, L534, PDF p. 22: "Die örtliche Bauüberwachung und Bauoberleitung werden vergeben oder durch den Auftraggeber erbracht." ·
--         § 5.6.2, L1514, PDF p. 53: "Die Bauüberwachung muss die geschlossenen Verträge, inklusive der Leistungsverzeichnisse, kennen und
--         sicherstellen …" · § 5.6.2, L1531, PDF p. 54: "Werden Bauüberwachungsleistungen vom Auftraggeber selbst erbracht, sind die
--         erforderlichen, fachlichen und personellen Ressourcen in ausreichendem Umfang bereitzustellen." — EN "Site supervision is awarded
--         or performed by the client."; "If the client performs site supervision himself, the required technical and staff resources are to
--         be provided." → REQ-43 applies for every performer, the client included.
--   [P8c] § 5.6.3, L1535, PDF p. 54: "Wird in einem Projekt die Bauüberwachung durch einen Auftragnehmer wahrgenommen …"; L1545 "Der
--         Auftraggeber muss eindeutig festlegen, welche Kompetenzen einer externen Bauüberwachung zugebilligt werden sollen." — EN "If site
--         supervision is performed by a contractor …"; "competences granted to an EXTERNAL site supervision" → REQ-44 only for
--         verantwortung_lph8 = auftragnehmer / dritter.
--   [P9]  § 5.8.3, L1816 / L1836 / L1844, PDF p. 64: problem "Dem Auftragnehmer ist die LPH 9 nicht beauftragt worden."; remedy "Es ist
--         festgelegt, wer für die Phase LPH 9 verantwortlich ist." and "Es besteht auch die Möglichkeit, über einen Rahmenvertrag für mehrere
--         Anlagen die Leistungen der LPH 9 auszuschreiben und zu beauftragen." — EN "The contractor was not commissioned with LPH 9." (the
--         PROBLEM, so an uncommissioned LPH 9 must not switch the checks off); "It is laid down who is responsible for phase LPH 9." →
--         REQ-51, REQ-52 apply whenever LPH 9 takes place; NEW gate REQ-52-2 = the remedy (a responsible party is named).
--   NOT phase-guarded (the print names no LPH for the phase; mapping is a ruling, see 18_SIGN-OFF): § 5.2 Bedarfsplanung (REQ-21/-22/-23
--         stay as they are — every project has it, [P1]), § 5.3 Planung, § 5.4 Genehmigungen (REQ-34/-36/-37), § 5.6.1 / § 5.6.4
--         (REQ-42/-45), § 5.7 Inbetriebnahme (REQ-47/-48/-49).
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
-- WHAT THIS BLOCK DOES (idempotent; md5-guarded gate edits and guarded field edits with in-transaction archives):
--   1. 10 new fields: verantwortung_lph0 / _lph8 / _lph9 (820-2-01, B, REQUIRED enums; reach -11 / -09 -20 / -24) [P1][P8b][P9];
--      verantwortlich_lph9_name (820-2-24, B, text, gate-required through REQ-52-2, hidden when LPH 9 entfaellt) [P9];
--      bauleistungen_vergeben (820-2-17, B, REQUIRED boolean, reach -18 -19) [V1]; optional booleans, section C:
--      betrieb_frueh_eingebunden (-05) [F06], kostenhinweise_auftragnehmer (-08) [F13], kostenziele_aenderungsprozess (-08) [F15],
--      aenderungsmanagement_gefuehrt (-21) [F45], inbetriebnahme_organisiert (-22) [F50].
--   2. 11 guarded gates: IF <guard> THEN (<live body>) — REQ-19, REQ-43 (verantwortung_lph8 != 'entfaellt'), REQ-44
--      (verantwortung_lph8 = auftragnehmer / dritter), REQ-51, REQ-52 (verantwortung_lph9 != 'entfaellt'), REQ-38/-39/-40/-41
--      (bauleistungen_vergeben == true), REQ-46 (choice testbetrieb / mischform), REQ-35 (einleitung_vorhanden).
--   3. 7 warn gates re-pointed (severity kept): REQ-06 (stays -05), REQ-13 (-05 → -08), REQ-15 (-06 → -08), REQ-45 (-09 → -21),
--      REQ-50 (-20 → -22), REQ-55 (-25 → -26, title corrected to its clause), REQ-59 (-25 → -27); clause_reference + description.
--   4. section_id = C for 15 active fields that had none (only WHERE section_id IS NULL):
--      -11 changed_needs_recognised · -15 lph_completed, planning_milestones_met, cost_estimation_phase_done, permitting_complete,
--      planning_summary_date · -19 vergabeverfahren_used, auswahlentscheidung_dokumentiert, zuschlag_erteilt_datum, final_contract_value,
--      vergabesumme_summary_date · -21 change_orders, oeffentlichkeitsarbeit_durchgefuehrt, kommunikations_plan_dokumentiert,
--      changes_record_date. (-10 risk_register got its section from the registers block.)
--   5. visible_when (an unanswered driver keeps the field visible — a field only hides on a definite answer; none is an equation
--      output): bauleistungen_vergeben == true on -18 leistungsbeschreibung_type and the five -19 summary fields;
--      verantwortung_lph8 != 'entfaellt' on -09 qs_plan_lph8_present, -20 quality_supervision_active; verantwortung_lph8 =
--      auftragnehmer / dritter on -20 bauueberwachung_competencies; verantwortung_lph9 != 'entfaellt' on -24 warranty_start_date,
--      warranty_end_date, defect_tracking_active.
--   6. consumer reach: testbetrieb_vs_abnahme_choice + -22 (if missing). (The new drivers carry their reach from the INSERT.)
--   7. NEW block gate REQ-52-2 (820-2-24): IF verantwortung_lph9 != 'entfaellt' THEN (verantwortlich_lph9_name IS NOT NULL) [P9] —
--      sign-off item (new gate).
-- SAFETY: no severity change, no value / equation / table change; ONE new gate (REQ-52-2, sign-off). 18 existing gate rows edited
--   (9 block, 9 warn; archived), 10 new fields, 22 existing field rows edited (archived: 15 sections, 12 visible_when of which 5
--   overlap; testbetrieb_vs_abnahme_choice only if its reach lacks 820-2-22). A changed live gate text makes its UPDATE a no-op.
-- STAGED — not applied. NO code prerequisite (data only; the cross-sheet drivers are scalars the live approval gate already
--   resolves project-wide). Apply (from C:\Users\Ekowai\_wt-g2t, which holds .env.local), AFTER the registers block:
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
   AND ((cr.code = 'REQ-19' AND w.code = '820-2-09' AND md5(cr.condition) = 'c387849e3a2530250c45899da8fe1a2a')
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
     OR (w.code = '820-2-18' AND f.symbol = 'leistungsbeschreibung_type' AND (f.visible_when IS NULL OR position('bauleistungen_vergeben == true' IN f.visible_when) = 0))
     OR (w.code = '820-2-19' AND f.symbol = 'vergabeverfahren_used' AND (f.visible_when IS NULL OR position('bauleistungen_vergeben == true' IN f.visible_when) = 0))
     OR (w.code = '820-2-19' AND f.symbol = 'auswahlentscheidung_dokumentiert' AND (f.visible_when IS NULL OR position('bauleistungen_vergeben == true' IN f.visible_when) = 0))
     OR (w.code = '820-2-19' AND f.symbol = 'zuschlag_erteilt_datum' AND (f.visible_when IS NULL OR position('bauleistungen_vergeben == true' IN f.visible_when) = 0))
     OR (w.code = '820-2-19' AND f.symbol = 'final_contract_value' AND (f.visible_when IS NULL OR position('bauleistungen_vergeben == true' IN f.visible_when) = 0))
     OR (w.code = '820-2-19' AND f.symbol = 'vergabesumme_summary_date' AND (f.visible_when IS NULL OR position('bauleistungen_vergeben == true' IN f.visible_when) = 0))
     OR (w.code = '820-2-09' AND f.symbol = 'qs_plan_lph8_present' AND (f.visible_when IS NULL OR position('verantwortung_lph8 != ''entfaellt''' IN f.visible_when) = 0))
     OR (w.code = '820-2-20' AND f.symbol = 'quality_supervision_active' AND (f.visible_when IS NULL OR position('verantwortung_lph8 != ''entfaellt''' IN f.visible_when) = 0))
     OR (w.code = '820-2-20' AND f.symbol = 'bauueberwachung_competencies' AND (f.visible_when IS NULL OR position('verantwortung_lph8 == ''auftragnehmer'' OR verantwortung_lph8 == ''dritter''' IN f.visible_when) = 0))
     OR (w.code = '820-2-24' AND f.symbol = 'warranty_start_date' AND (f.visible_when IS NULL OR position('verantwortung_lph9 != ''entfaellt''' IN f.visible_when) = 0))
     OR (w.code = '820-2-24' AND f.symbol = 'warranty_end_date' AND (f.visible_when IS NULL OR position('verantwortung_lph9 != ''entfaellt''' IN f.visible_when) = 0))
     OR (w.code = '820-2-24' AND f.symbol = 'defect_tracking_active' AND (f.visible_when IS NULL OR position('verantwortung_lph9 != ''entfaellt''' IN f.visible_when) = 0))
     OR (w.code = '820-2-18' AND f.symbol = 'testbetrieb_vs_abnahme_choice' AND NOT (COALESCE(f.consumer_worksheets, '{}'::text[]) @> ARRAY['820-2-22']::text[])))
   AND NOT EXISTS (SELECT 1 FROM fields_archive_m820_2_structure a WHERE a.id = f.id);

-- 1. new fields (one required driver on 820-2-17, five optional booleans that carry the printed sentence a warn gate checks)
-- 820-2-01 verantwortung_lph0 (required, section B)
INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, description, verification_status, verification_quote, source_anchor, widget, ui_config, lookup, visible_when, enum_values, consumer_worksheets, order_index, active)
SELECT w.id, (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'B'), 'verantwortung_lph0', 'Verantwortung LPH 0 – Bedarfsplanung: wer erbringt die Phase?', 'Responsibility LPH 0 – needs planning: who performs the phase?', 'enum', NULL, true, '§1; §5.2',
       'Wer erbringt die Bedarfsplanung (LPH 0)? § 1 (PDF S. 14): „Teil 2 umfasst die Leistungserbringung aller Projektbeteiligten über alle Phasen hinweg, d. h. von der Bedarfsplanung (LPH 0) bis zur Objektbetreuung (LPH 9), inklusive Inbetriebnahme und Übergabe an den Betrieb.“ und „Er erstreckt sich auch auf die zugehörigen Bedarfsplanungen, da sowohl die Konzepte als auch alle Projekte einer umfangreichen Vorbereitung durch den Auftraggeber bedürfen.“ Deshalb gibt es hier KEIN „entfällt“: jedes Konzept und jedes Projekt braucht eine Bedarfsplanung. Die Prüfungen von 820-2-11 (REQ-21, REQ-22, REQ-23) gelten unabhängig davon, wer die Phase erbringt.
[EN] Who performs needs planning (LPH 0)? § 1: "Part 2 covers the services of all parties across all phases, from needs planning (LPH 0) to object support (LPH 9) …" and "It also extends to the related needs planning, since concepts as well as all projects need extensive preparation by the client." Hence NO "does not occur" option: every concept and every project needs needs planning. The 820-2-11 checks apply whoever performs the phase.',
       'imported_unverified', 'Teil 2 umfasst die Leistungserbringung aller Projektbeteiligten über alle Phasen hinweg, d. h. von der Bedarfsplanung (LPH 0) bis zur Objektbetreuung (LPH 9), inklusive Inbetriebnahme und Übergabe an den Betrieb. — Er erstreckt sich auch auf die zugehörigen Bedarfsplanungen, da sowohl die Konzepte als auch alle Projekte einer umfangreichen Vorbereitung durch den Auftraggeber bedürfen.', 'DWA-M 820-2 §1 Z.336/338 (PDF S. 14)', NULL, NULL, NULL, NULL, '[{"value":"auftragnehmer","label_de":"Auftragnehmer (das in diesem Projekt beauftragte Büro)","label_en":"Contractor (the firm commissioned in this project)","order_index":1,"regulation_reference":"§1"},{"value":"auftraggeber","label_de":"Auftraggeber selbst (Eigenleistung)","label_en":"Client himself (own performance)","order_index":2,"regulation_reference":"§1"},{"value":"dritter","label_de":"Dritter (weiterer Beauftragter)","label_en":"Third party (another commissioned party)","order_index":3,"regulation_reference":"§1"}]'::jsonb, ARRAY['820-2-11']::text[], (SELECT COALESCE(MAX(f3.order_index), 0) + 1 FROM fields f3 WHERE f3.worksheet_template_id = w.id), true
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE s.code = 'DWA-M-820-2' AND w.code = '820-2-01'
   AND NOT EXISTS (SELECT 1 FROM fields f2 WHERE f2.worksheet_template_id = w.id AND f2.symbol = 'verantwortung_lph0');

-- 820-2-01 verantwortung_lph8 (required, section B)
INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, description, verification_status, verification_quote, source_anchor, widget, ui_config, lookup, visible_when, enum_values, consumer_worksheets, order_index, active)
SELECT w.id, (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'B'), 'verantwortung_lph8', 'Verantwortung LPH 8 – Objektüberwachung (Bauüberwachung): wer erbringt die Phase?', 'Responsibility LPH 8 – site supervision: who performs the phase?', 'enum', NULL, true, '§1; §4.1; §5.6',
       'Wer erbringt die Bauüberwachung (LPH 8)? § 4.1 (PDF S. 22): „Die örtliche Bauüberwachung und Bauoberleitung werden vergeben oder durch den Auftraggeber erbracht.“ § 1 (PDF S. 14): „Teil 2 umfasst die Leistungserbringung aller Projektbeteiligten über alle Phasen hinweg, d. h. von der Bedarfsplanung (LPH 0) bis zur Objektbetreuung (LPH 9), inklusive Inbetriebnahme und Übergabe an den Betrieb.“ Auftragnehmer / Auftraggeber selbst / Dritter: REQ-19 (820-2-09) und REQ-43 (820-2-20) gelten in jedem Fall, auch wenn der Auftraggeber selbst überwacht (§ 5.6.2, PDF S. 54: „Werden Bauüberwachungsleistungen vom Auftraggeber selbst erbracht, sind die erforderlichen, fachlichen und personellen Ressourcen in ausreichendem Umfang bereitzustellen.“); REQ-44 nur bei einer Bauüberwachung durch einen Auftragnehmer oder Dritten (§ 5.6.3: „Wird in einem Projekt die Bauüberwachung durch einen Auftragnehmer wahrgenommen …“). „Entfällt“ nur, wenn das Projekt keine Bauausführung hat (§ 1: „Der Anwendungsbereich des vorliegenden Merkblatts umfasst alle Phasen der Konzepterstellung und Projektabwicklung bis hin zur Inbetriebnahme und Übergabe.“ — reine Konzepterstellung); dann sind die LPH-8-Prüfungen nicht erforderlich und ihre Eingaben ausgeblendet.
[EN] Who performs site supervision (LPH 8)? § 4.1: "Local site supervision and construction management are awarded or performed by the client."; § 1: "Part 2 covers the services of all parties across all phases …". Contractor / client himself / third party: REQ-19 and REQ-43 apply in every case, also when the client supervises himself (§ 5.6.2: the required technical and staff resources must then be provided); REQ-44 only for supervision by a contractor or third party (§ 5.6.3). "Does not occur" only when the project has no construction (§ 1: the scope covers "all phases of concept work and project execution" — concept work only); then the LPH 8 checks are not required and their inputs are hidden.',
       'imported_unverified', 'Die örtliche Bauüberwachung und Bauoberleitung werden vergeben oder durch den Auftraggeber erbracht. — Der Anwendungsbereich des vorliegenden Merkblatts umfasst alle Phasen der Konzepterstellung und Projektabwicklung bis hin zur Inbetriebnahme und Übergabe.', 'DWA-M 820-2 §4.1 Z.534 (PDF S. 22) + §1 Z.336/338 (PDF S. 14) + §5.6.2 Z.1531, §5.6.3 Z.1535 (PDF S. 54)', NULL, NULL, NULL, NULL, '[{"value":"auftragnehmer","label_de":"Auftragnehmer (das in diesem Projekt beauftragte Büro)","label_en":"Contractor (the firm commissioned in this project)","order_index":1,"regulation_reference":"§4.1"},{"value":"auftraggeber","label_de":"Auftraggeber selbst (Eigenleistung)","label_en":"Client himself (own performance)","order_index":2,"regulation_reference":"§4.1"},{"value":"dritter","label_de":"Dritter (weiterer Beauftragter)","label_en":"Third party (another commissioned party)","order_index":3,"regulation_reference":"§4.1"},{"value":"entfaellt","label_de":"Entfällt — keine Bauausführung in diesem Projekt (z. B. reine Konzepterstellung)","label_en":"Does not occur — no construction in this project (e.g. concept work only)","order_index":4,"regulation_reference":"§1"}]'::jsonb, ARRAY['820-2-09','820-2-20']::text[], (SELECT COALESCE(MAX(f3.order_index), 0) + 1 FROM fields f3 WHERE f3.worksheet_template_id = w.id), true
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE s.code = 'DWA-M-820-2' AND w.code = '820-2-01'
   AND NOT EXISTS (SELECT 1 FROM fields f2 WHERE f2.worksheet_template_id = w.id AND f2.symbol = 'verantwortung_lph8');

-- 820-2-01 verantwortung_lph9 (required, section B)
INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, description, verification_status, verification_quote, source_anchor, widget, ui_config, lookup, visible_when, enum_values, consumer_worksheets, order_index, active)
SELECT w.id, (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'B'), 'verantwortung_lph9', 'Verantwortung LPH 9 – Objektbetreuung (Gewährleistung): wer erbringt die Phase?', 'Responsibility LPH 9 – object support (warranty): who performs the phase?', 'enum', NULL, true, '§1; §5.8.3',
       'Wer ist für die Objektbetreuung / Gewährleistungsphase (LPH 9) verantwortlich? § 5.8.3 (PDF S. 64): „Es ist festgelegt, wer für die Phase LPH 9 verantwortlich ist.“ und „Es besteht auch die Möglichkeit, über einen Rahmenvertrag für mehrere Anlagen die Leistungen der LPH 9 auszuschreiben und zu beauftragen.“ Das gedruckte Problem ist gerade „Dem Auftragnehmer ist die LPH 9 nicht beauftragt worden.“ — deshalb gelten REQ-51, REQ-52 und REQ-52-2 (820-2-24) für jeden Verantwortlichen, auch für den Auftraggeber selbst. „Entfällt“ nur ohne Bauausführung (§ 1: „Der Anwendungsbereich des vorliegenden Merkblatts umfasst alle Phasen der Konzepterstellung und Projektabwicklung bis hin zur Inbetriebnahme und Übergabe.“); dann sind die Gewährleistungs-Prüfungen nicht erforderlich und die Gewährleistungsangaben ausgeblendet.
[EN] Who is responsible for object support / the warranty phase (LPH 9)? § 5.8.3: "It is laid down who is responsible for phase LPH 9." and "LPH 9 services can also be tendered and commissioned through a framework contract for several plants." The printed problem is exactly "The contractor was not commissioned with LPH 9." — so REQ-51, REQ-52 and REQ-52-2 apply to whoever is responsible, the client included. "Does not occur" only without construction (§ 1, concept work only); then the warranty checks are not required and the warranty entries hidden.',
       'imported_unverified', 'Es ist festgelegt, wer für die Phase LPH 9 verantwortlich ist. — Es besteht auch die Möglichkeit, über einen Rahmenvertrag für mehrere Anlagen die Leistungen der LPH 9 auszuschreiben und zu beauftragen.', 'DWA-M 820-2 §5.8.3 Z.1816/1836/1844 (PDF S. 64) + §1 Z.336 (PDF S. 14)', NULL, NULL, NULL, NULL, '[{"value":"auftragnehmer","label_de":"Auftragnehmer (das in diesem Projekt beauftragte Büro)","label_en":"Contractor (the firm commissioned in this project)","order_index":1,"regulation_reference":"§5.8.3"},{"value":"auftraggeber","label_de":"Auftraggeber selbst (Eigenleistung)","label_en":"Client himself (own performance)","order_index":2,"regulation_reference":"§5.8.3"},{"value":"dritter","label_de":"Dritter (weiterer Beauftragter)","label_en":"Third party (another commissioned party)","order_index":3,"regulation_reference":"§5.8.3"},{"value":"entfaellt","label_de":"Entfällt — keine Bauausführung in diesem Projekt (z. B. reine Konzepterstellung)","label_en":"Does not occur — no construction in this project (e.g. concept work only)","order_index":4,"regulation_reference":"§1"}]'::jsonb, ARRAY['820-2-24']::text[], (SELECT COALESCE(MAX(f3.order_index), 0) + 1 FROM fields f3 WHERE f3.worksheet_template_id = w.id), true
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE s.code = 'DWA-M-820-2' AND w.code = '820-2-01'
   AND NOT EXISTS (SELECT 1 FROM fields f2 WHERE f2.worksheet_template_id = w.id AND f2.symbol = 'verantwortung_lph9');

-- 820-2-24 verantwortlich_lph9_name (optional, section B)
INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, description, verification_status, verification_quote, source_anchor, widget, ui_config, lookup, visible_when, enum_values, consumer_worksheets, order_index, active)
SELECT w.id, (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'B'), 'verantwortlich_lph9_name', 'Für die Phase LPH 9 verantwortliche Stelle (Name / Funktion)', 'Party responsible for phase LPH 9 (name / role)', 'text', NULL, false, '§5.8.3',
       '§ 5.8.3 (PDF S. 64): „Es ist festgelegt, wer für die Phase LPH 9 verantwortlich ist.“ Gelesen von REQ-52-2 (Pflicht über das Gate, solange die Phase stattfindet). Ausgeblendet, wenn die Phase LPH 9 entfällt (820-2-01).
[EN] § 5.8.3: "It is laid down who is responsible for phase LPH 9." Read by REQ-52-2 (required through the gate while the phase takes place). Hidden when phase LPH 9 does not occur (820-2-01).',
       'imported_unverified', 'Es ist festgelegt, wer für die Phase LPH 9 verantwortlich ist.', 'DWA-M 820-2 §5.8.3 Z.1836 (PDF S. 64)', NULL, NULL, NULL, 'verantwortung_lph9 != ''entfaellt''', NULL, NULL, (SELECT COALESCE(MAX(f3.order_index), 0) + 1 FROM fields f3 WHERE f3.worksheet_template_id = w.id), true
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE s.code = 'DWA-M-820-2' AND w.code = '820-2-24'
   AND NOT EXISTS (SELECT 1 FROM fields f2 WHERE f2.worksheet_template_id = w.id AND f2.symbol = 'verantwortlich_lph9_name');

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
-- REQ-19 (820-2-09) [P8a]
UPDATE compliance_requirements cr
   SET condition = 'IF verantwortung_lph8 != ''entfaellt'' THEN (qs_plan_lph8_present == true)'
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE cr.code = 'REQ-19' AND w.id = cr.worksheet_template_id AND w.code = '820-2-09' AND s.code = 'DWA-M-820-2'
   AND md5(cr.condition) = 'c387849e3a2530250c45899da8fe1a2a';

-- REQ-43 (820-2-20) [P8b]
UPDATE compliance_requirements cr
   SET condition = 'IF verantwortung_lph8 != ''entfaellt'' THEN (quality_supervision_active == true)'
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE cr.code = 'REQ-43' AND w.id = cr.worksheet_template_id AND w.code = '820-2-20' AND s.code = 'DWA-M-820-2'
   AND md5(cr.condition) = '0dc27b122a711062b3a39cee51c21d1d';

-- REQ-44 (820-2-20) [P8c]
UPDATE compliance_requirements cr
   SET condition = 'IF verantwortung_lph8 == ''auftragnehmer'' OR verantwortung_lph8 == ''dritter'' THEN (bauueberwachung_competencies == true)'
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE cr.code = 'REQ-44' AND w.id = cr.worksheet_template_id AND w.code = '820-2-20' AND s.code = 'DWA-M-820-2'
   AND md5(cr.condition) = '50e840f5c37437c90f7bd827c855cfe7';

-- REQ-51 (820-2-24) [P9]
UPDATE compliance_requirements cr
   SET condition = 'IF verantwortung_lph9 != ''entfaellt'' THEN (warranty_start_date IS NOT NULL AND warranty_end_date IS NOT NULL)'
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE cr.code = 'REQ-51' AND w.id = cr.worksheet_template_id AND w.code = '820-2-24' AND s.code = 'DWA-M-820-2'
   AND md5(cr.condition) = '113c7ddde973cd282d3bc727d2ddc50e';

-- REQ-52 (820-2-24) [P9]
UPDATE compliance_requirements cr
   SET condition = 'IF verantwortung_lph9 != ''entfaellt'' THEN (defect_tracking_active == true)'
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

-- 5. visible_when (plain rule where none exists, composed (<existing>) AND (<new>) otherwise — the 2026-10-05 dump has none;
--    producer guard: none is an equation output). S-02: award-only entries hidden on bauleistungen_vergeben = false. S-01: LPH 8 /
--    LPH 9 inputs hidden when the phase does not occur (entfaellt); bauueberwachung_competencies only for an external supervisor.
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
UPDATE fields f
   SET visible_when = 'verantwortung_lph8 != ''entfaellt'''
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND s.code = 'DWA-M-820-2' AND f.visible_when IS NULL
   AND (w.code, f.symbol) IN (('820-2-09','qs_plan_lph8_present'),('820-2-20','quality_supervision_active'));
UPDATE fields f
   SET visible_when = '(' || f.visible_when || ') AND (verantwortung_lph8 != ''entfaellt'')'
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND s.code = 'DWA-M-820-2' AND f.visible_when IS NOT NULL
   AND position('verantwortung_lph8 != ''entfaellt''' IN f.visible_when) = 0
   AND (w.code, f.symbol) IN (('820-2-09','qs_plan_lph8_present'),('820-2-20','quality_supervision_active'));
UPDATE fields f
   SET visible_when = 'verantwortung_lph8 == ''auftragnehmer'' OR verantwortung_lph8 == ''dritter'''
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND s.code = 'DWA-M-820-2' AND f.visible_when IS NULL
   AND (w.code, f.symbol) IN (('820-2-20','bauueberwachung_competencies'));
UPDATE fields f
   SET visible_when = '(' || f.visible_when || ') AND (verantwortung_lph8 == ''auftragnehmer'' OR verantwortung_lph8 == ''dritter'')'
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND s.code = 'DWA-M-820-2' AND f.visible_when IS NOT NULL
   AND position('verantwortung_lph8 == ''auftragnehmer'' OR verantwortung_lph8 == ''dritter''' IN f.visible_when) = 0
   AND (w.code, f.symbol) IN (('820-2-20','bauueberwachung_competencies'));
UPDATE fields f
   SET visible_when = 'verantwortung_lph9 != ''entfaellt'''
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND s.code = 'DWA-M-820-2' AND f.visible_when IS NULL
   AND (w.code, f.symbol) IN (('820-2-24','warranty_start_date'),('820-2-24','warranty_end_date'),('820-2-24','defect_tracking_active'));
UPDATE fields f
   SET visible_when = '(' || f.visible_when || ') AND (verantwortung_lph9 != ''entfaellt'')'
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND s.code = 'DWA-M-820-2' AND f.visible_when IS NOT NULL
   AND position('verantwortung_lph9 != ''entfaellt''' IN f.visible_when) = 0
   AND (w.code, f.symbol) IN (('820-2-24','warranty_start_date'),('820-2-24','warranty_end_date'),('820-2-24','defect_tracking_active'));

-- 6. consumer reach (append only the missing codes, existing order kept): the guarded sheets see the driver in their form
UPDATE fields f
   SET consumer_worksheets = COALESCE(f.consumer_worksheets, '{}'::text[])
       || ARRAY(SELECT u.c FROM unnest(ARRAY['820-2-22']::text[]) WITH ORDINALITY AS u(c, o)
                 WHERE NOT (u.c = ANY (COALESCE(f.consumer_worksheets, '{}'::text[]))) ORDER BY u.o)
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND s.code = 'DWA-M-820-2' AND w.code = '820-2-18' AND f.symbol = 'testbetrieb_vs_abnahme_choice'
   AND NOT (COALESCE(f.consumer_worksheets, '{}'::text[]) @> ARRAY['820-2-22']::text[]);

-- 7. NEW gate (sign-off: new-gate ruling)
INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, title_en, condition, description, clause_reference, severity)
SELECT w.id, 'REQ-52-2', 'Verantwortliche Stelle für die Phase LPH 9 festgelegt', 'Party responsible for phase LPH 9 laid down', 'IF verantwortung_lph9 != ''entfaellt'' THEN (verantwortlich_lph9_name IS NOT NULL)',
       '§ 5.8.3 (PDF S. 64): „Es ist festgelegt, wer für die Phase LPH 9 verantwortlich ist.“ (Problem L1816: „Es fühlt sich niemand für die Begleitung der Gewährleistungsfrist zuständig. Dem Auftragnehmer ist die LPH 9 nicht beauftragt worden.“) Gilt, sobald die Phase LPH 9 stattfindet (820-2-01 „Verantwortung LPH 9“ ≠ entfällt); verlangt den Namen der verantwortlichen Stelle (820-2-24).
[EN] § 5.8.3: "It is laid down who is responsible for phase LPH 9." (Printed problem: "Nobody feels responsible for following the warranty period. The contractor was not commissioned with LPH 9.") Applies whenever phase LPH 9 takes place (820-2-01 "responsibility LPH 9" ≠ does not occur); requires the name of the responsible party (820-2-24).',
       '§5.8.3', 'block'
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE s.code = 'DWA-M-820-2' AND w.code = '820-2-24'
   AND NOT EXISTS (SELECT 1 FROM compliance_requirements c2 WHERE c2.worksheet_template_id = w.id AND c2.code = 'REQ-52-2');

COMMIT;
