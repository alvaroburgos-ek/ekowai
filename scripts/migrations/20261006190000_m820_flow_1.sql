-- 20261006190000_m820_flow_1.sql · M820 flow block 1 — structure-settled order fixes (DWA-M 820-1 / -2 / -3)
-- Requirements: vault 01-Projects/ekowai-wizard/m820-wizard-test/33_FLOW-AUDIT-m820-sheet-order_2026-10-06.md § 6 "Block 1",
-- items 1–6 (item 7 = REQ-05 → M820-07 is the separate block 20261006180000, not touched here).
-- Apply order: 34_APPLY-ORDER-m820-flow-1.md. Sign-off sheet: 35_SIGN-OFF-m820-flow-1.md.
-- Owner principle (2026-10-06): sheets in work order; every gate on the sheet where its last input is entered, or later; values flow
-- forward (consumer_worksheets point to the same sheet or later ones).
--
-- WHAT THE PROJECT TEAM SEES (plain English):
--   1. DWA-M 820-1 "Schwellenwert-Status bestimmt" (REQ-07, block) moves from M820-04 "Bedarfsplanung Konzept" to M820-09
--      "Schwellenwertbestimmung". On M820-04 it read the EU threshold and the threshold status, which are only entered later on
--      M820-09 — so M820-04 could not be approved until the user jumped ahead and filled M820-09 (a waiting block gate refuses the
--      approval). On M820-09 it reads all five inputs (three come from M820-01, two are entered there). Condition, severity, title and
--      clause unchanged. The threshold status is no longer passed back to M820-04 (nothing there reads it any more).
--   2. Three sign-off checks (attestations, empty condition, warn) move to the sheet where their subject is entered:
--      REQ-04 "Beteiligte dokumentiert" M820-01 → M820-03 "Beteiligten-Matrix" (§ 5);
--      REQ-24 "Loseausnahme korrekt angewendet" M820-04 → M820-09 "Schwellenwertbestimmung" (Anh. B.2.4, lots + § 3 Abs. 9 VgV);
--      REQ-14 "Zuschlagskriterien definiert" M820-10 → M820-14 "Zuschlagskriterien" (Anh. E.2).
--   3. DWA-M 820-3: the twelve "items rated" counts of the Anhang-A / Anhang-B checklists now reach the summary sheet that adds
--      them up: qe52 … qe55 (M8203-07 … -10, Anhang A) → M8203-22 (equation M8203-22-D2); qe62 … qe67 (M8203-11 … -18, Anhang B)
--      → M8203-23 (equation M8203-23-D2). Until now the two sums could not compute ("missing inputs").
--   4. DWA-M 820-3: "Bild 1 step 4 — single-project life cycle" (M8203-03) was passed on to the literal text "M8203-11..M8203-18",
--      which is no sheet code, so it reached none of them; it now names M8203-11, -12, … -18 one by one (plus -23 / -24 as before).
--   5. "all" / "ALL" is not a sheet code either (the form matches exact codes only), so these values reached no sheet:
--      820-2 project name (full / short) and project number → every later sheet 820-2-02 … -28; 820-2 worksheet_status → no
--      longer passed on (it is the status of the registration sheet itself); 820-3 registration data (LPH, client, contract,
--      contractor, location, number, title, date) → every later sheet M8203-02 … -24; the four 820-3 definition acknowledgements
--      → M8203-24 "Gesamtverifizierung Qualität".
--   6. DWA-M 820-3 "Projektstopp-Prüfung ausgelöst" moves from M8203-02 (application notes, asked before any phase goal exists) to
--      M8203-24, section F "Results Summary", directly under the computed project-stop code that triggers it; its only reader, REQ-31
--      on M8203-24, now reads it as a local field. The field keeps its id, so every saved project value moves with it.
--   No value, condition, severity, equation or table changes. Approval: only item 1 changes it — M820-04 is no longer held by REQ-07,
--   and M820-09 gets REQ-07 (blocks while inputs are missing or inconsistent; off for a private client without funding who answers
--   "No" — block 15 guard).
--
-- SOURCE CHECK (re-read 2026-10-06 on the RENDERED PDF: scoop pdftotext -layout of
--   C:\Users\Ekowai\Desktop\Guidelines\DWA-M-820-1\DWA-M_820-1.pdf and ...\DWA-M-820-3\DWA-M_820-3.pdf, whitespace-normalised match
--   per PDF page):
--   [S1] 820-1 § 8.5 "Auftragswertermittlung und EU-Schwellenwerte", PDF p. 35: "Für jeden zu vergebenden Auftrag hat der
--        Auftraggeber nach Festlegung des Leistungsumfangs eine Schätzung des Netto-Gesamtwerts der Planungsleistungen eines Projekts
--        nach pflichtgemäßem Ermessen durchzuführen. Dazu sind die Regelungen der VgV zu beachten (siehe dazu insbesondere Anhang B,
--        B.2.4 zu diesem Merkblatt)." EN "For every contract to be awarded the client, after fixing the scope of services, has to
--        estimate the net total value of the planning services of a project ... The VgV rules apply (see in particular Annex B, B.2.4)."
--        § 8.6, PDF p. 36: "Erreicht oder übersteigt der geschätzte Netto-Gesamtwert den EU-Schwellenwert ist ein VgV-F-Verfahren
--        durchzuführen." EN "If the estimated net total value reaches or exceeds the EU threshold, a VgV-F procedure is to be held."
--        → the threshold determination is § 8.5 = M820-09; § 6.2 (M820-04, needs planning) does not deal with it.
--   [S2] 820-1 § 5 "Beteiligte", PDF p. 25: "Bei jeder Planung gibt es einen Auftraggeber und oftmals mehrere Auftragnehmer. ...
--        Behörden stellen weitere wesentliche Beteiligte dar. In einer späteren Phase ergänzen ausführende Firmen das Team. Bild 5
--        veranschaulicht das komplexe Geflecht der Beteiligten." EN "Every planning has a client and often several contractors. ...
--        Authorities are further essential parties. In a later phase executing firms join the team." → REQ-04 (§ 5) = M820-03.
--   [S3] 820-1 Anh. B.2.4 "VgV", PDF p. 53: "Die Aufteilung in Lose regelt § 3 Abs. 9 VgV: „Der […] Auftraggeber kann bei der Vergabe
--        einzelner Lose von Absatz 7 Satz 3 sowie Absatz 8 abweichen, wenn der geschätzte Nettowert des betreffenden Loses bei Liefer-
--        und Dienstleistungen unter 80 000 Euro ... liegt und die Summe der Nettowerte dieser Lose 20 Prozent des Gesamtwertes aller
--        Lose nicht übersteigt.“" EN "Lots are governed by § 3 (9) VgV: the client may deviate for single lots if the estimated net
--        value of the lot is below 80,000 euros for services ... and the sum of these lots does not exceed 20 % of all lots."
--        → part of the contract-value / threshold work of § 8.5 ("siehe ... B.2.4") = M820-09, where the lots are entered.
--   [S4] 820-1 § 8.10.3.3 "Zuschlagskriterien (siehe auch 8.7 und Anhang E)", PDF p. 42: "Der Auftraggeber ist verpflichtet,
--        spätestens bei der Aufforderung zur Angebotsabgabe, besser bereits bei der Bekanntmachung, die Zuschlagskriterien und deren
--        Gewichtung anzugeben (§ 127 GWB)." Anh. E.2 "Angebotsphase: Zuschlagskriterien", PDF p. 65. → REQ-14 (E.2) = M820-14.
--   [S5] 820-3 § 3 "Grundsätze", PDF p. 12: "Werden Phasenziele nicht oder nur unvollständig erreicht, ist die Prüfung eines
--        Projektstopps erforderlich. Im Rahmen einer Risikoanalyse muss bewertet werden, ob und wie das Projekt fortgeführt werden
--        kann." EN "If phase goals are not or only partly achieved, a project stop must be examined. A risk analysis must assess
--        whether and how the project can continue." § 2.1 "Phasenziele", PDF p. 10: "Ergebnisse, die nach Abschluss der jeweiligen
--        Leistungsphase zu erreichen sind" (results to be achieved after completion of the work phase). → the trigger exists only
--        once phase goals are rated (M8203-04 … -18); its code is computed on M8203-24 (M8203-24-D1) = the home of the answer.
--   Items 3 / 4 / 5 are delivery structure only (an equation input or a display value must name the exact sheet code); no printed
--   value is involved. Code evidence: src/lib/db/queries/worksheet.ts loadInheritedFields (`code = ANY(consumer_worksheets)`),
--   loadRegisterSources (`cw.includes(code)`), src/lib/compliance/visibility.ts inheritedFieldsFor (`includes(code)`) — no reader
--   expands "all" / "ALL" or a ".." range (searched 2026-10-06).
--
-- LIVE PRE-STATE (read-only prod check 2026-10-06, scripts/verification/prod-query.mjs): REQ-07 M820-04 condition md5
--   4d24b0248a3353ee098e079f2a7749b0 (block 15); REQ-04 M820-01 / REQ-24 M820-04 / REQ-14 M820-10 condition '' with description md5
--   6c931c4fc0603ba6dc5ebc2cc06a13b0 / 9030ce6a7aa94d9cf4997f9fd07864b8 / 0670f04abccbabbabb57b8bbce871c2e; the 30 consumer arrays
--   exactly as in the plan list below; projektstopp_review_triggered on M8203-02 section C, consumer {M8203-24}, 0 saved values.
--
-- WHAT THIS BLOCK DOES (idempotent; every write guarded on the live value; in-transaction archive of each pre-state row):
--   A. 4 gate rows: worksheet_template_id → new sheet + one "moved" note on the description (code, title, severity, condition, clause
--      unchanged). Guard: old sheet + condition md5 (+ description md5 for the three attestations).
--   B. 30 field rows: consumer_worksheets old → new, only while it is still exactly the old array (plan list, repeated per statement).
--   C. 1 field row (projektstopp_review_triggered): worksheet_template_id M8203-02 → M8203-24, section → M8203-24 "F", order_index 2,
--      consumer_worksheets {M8203-24} → NULL (now its own sheet), description + one "moved" note. project_parameters untouched: values
--      are keyed by field_id and follow the row (source_worksheet_instance_id keeps the -02 instance where the value was entered).
--   Nothing is deactivated or re-activated (every guard requires active = true; the rollback never touches `active`).
-- STAGED — not applied. Apply (from C:\Users\Ekowai\_wt-g2t, which holds .env.local):
--   node scripts/apply-migration.mjs C:\Users\Ekowai\_wt-m820\scripts\migrations\20261006190000_m820_flow_1.sql
-- Rollback:  C:\Users\Ekowai\_wt-m820\scripts\rollback-20261006190000-m820-flow-1.sql
-- Read-back: C:\Users\Ekowai\_wt-m820\scripts\verification\apply\readback-20261006190000-m820-flow-1.sql
BEGIN;

-- 0. in-transaction archives (pre-state only; a re-run archives nothing)
CREATE TABLE IF NOT EXISTS compliance_requirements_archive_m820_flow_1 AS SELECT * FROM compliance_requirements WHERE false;
CREATE TABLE IF NOT EXISTS fields_archive_m820_flow_1 AS SELECT * FROM fields WHERE false;

INSERT INTO compliance_requirements_archive_m820_flow_1
SELECT cr.* FROM compliance_requirements cr
  JOIN worksheet_templates w ON w.id = cr.worksheet_template_id
  JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-1'
   AND ((cr.code = 'REQ-07' AND w.code = 'M820-04' AND md5(cr.condition) = '4d24b0248a3353ee098e079f2a7749b0')
     OR (cr.code = 'REQ-04' AND w.code = 'M820-01' AND cr.condition = '' AND md5(COALESCE(cr.description, '')) = '6c931c4fc0603ba6dc5ebc2cc06a13b0')
     OR (cr.code = 'REQ-24' AND w.code = 'M820-04' AND cr.condition = '' AND md5(COALESCE(cr.description, '')) = '9030ce6a7aa94d9cf4997f9fd07864b8')
     OR (cr.code = 'REQ-14' AND w.code = 'M820-10' AND cr.condition = '' AND md5(COALESCE(cr.description, '')) = '0670f04abccbabbabb57b8bbce871c2e'))
   AND NOT EXISTS (SELECT 1 FROM compliance_requirements_archive_m820_flow_1 a WHERE a.id = cr.id);

INSERT INTO fields_archive_m820_flow_1
SELECT f.* FROM fields f
  JOIN worksheet_templates w ON w.id = f.worksheet_template_id
  JOIN standards s ON s.id = w.standard_id
  JOIN (VALUES
    ('DWA-M-820-1', 'M820-09', 'threshold_status', ARRAY['M820-10','M820-11','M820-12','M820-17','M820-04','M820-23']::text[], ARRAY['M820-10','M820-11','M820-12','M820-17','M820-23']::text[]),
    ('DWA-M-820-3', 'M8203-07', 'qe52_items_rated', NULL::text[], ARRAY['M8203-22']::text[]),
    ('DWA-M-820-3', 'M8203-08', 'qe53_items_rated', NULL::text[], ARRAY['M8203-22']::text[]),
    ('DWA-M-820-3', 'M8203-09', 'qe54_items_rated', NULL::text[], ARRAY['M8203-22']::text[]),
    ('DWA-M-820-3', 'M8203-10', 'qe55_items_rated', NULL::text[], ARRAY['M8203-22']::text[]),
    ('DWA-M-820-3', 'M8203-11', 'qe62_items_rated', NULL::text[], ARRAY['M8203-23']::text[]),
    ('DWA-M-820-3', 'M8203-12', 'qe63a_items_rated', NULL::text[], ARRAY['M8203-23']::text[]),
    ('DWA-M-820-3', 'M8203-13', 'qe63b_items_rated', NULL::text[], ARRAY['M8203-23']::text[]),
    ('DWA-M-820-3', 'M8203-14', 'qe64a_items_rated', NULL::text[], ARRAY['M8203-23']::text[]),
    ('DWA-M-820-3', 'M8203-15', 'qe64b_items_rated', NULL::text[], ARRAY['M8203-23']::text[]),
    ('DWA-M-820-3', 'M8203-16', 'qe65_items_rated', NULL::text[], ARRAY['M8203-23']::text[]),
    ('DWA-M-820-3', 'M8203-17', 'qe66_items_rated', NULL::text[], ARRAY['M8203-23']::text[]),
    ('DWA-M-820-3', 'M8203-18', 'qe67_items_rated', NULL::text[], ARRAY['M8203-23']::text[]),
    ('DWA-M-820-3', 'M8203-03', 'bild1_step_4_einzelprojekt_lifecycle', ARRAY['M8203-11..M8203-18','M8203-23','M8203-24']::text[], ARRAY['M8203-11','M8203-12','M8203-13','M8203-14','M8203-15','M8203-16','M8203-17','M8203-18','M8203-23','M8203-24']::text[]),
    ('DWA-M-820-2', '820-2-01', 'project_name_full', ARRAY['all']::text[], ARRAY['820-2-02','820-2-03','820-2-04','820-2-05','820-2-06','820-2-07','820-2-08','820-2-09','820-2-10','820-2-11','820-2-12','820-2-13','820-2-14','820-2-15','820-2-16','820-2-17','820-2-18','820-2-19','820-2-20','820-2-21','820-2-22','820-2-23','820-2-24','820-2-25','820-2-26','820-2-27','820-2-28']::text[]),
    ('DWA-M-820-2', '820-2-01', 'project_name_short', ARRAY['all']::text[], ARRAY['820-2-02','820-2-03','820-2-04','820-2-05','820-2-06','820-2-07','820-2-08','820-2-09','820-2-10','820-2-11','820-2-12','820-2-13','820-2-14','820-2-15','820-2-16','820-2-17','820-2-18','820-2-19','820-2-20','820-2-21','820-2-22','820-2-23','820-2-24','820-2-25','820-2-26','820-2-27','820-2-28']::text[]),
    ('DWA-M-820-2', '820-2-01', 'project_number', ARRAY['all']::text[], ARRAY['820-2-02','820-2-03','820-2-04','820-2-05','820-2-06','820-2-07','820-2-08','820-2-09','820-2-10','820-2-11','820-2-12','820-2-13','820-2-14','820-2-15','820-2-16','820-2-17','820-2-18','820-2-19','820-2-20','820-2-21','820-2-22','820-2-23','820-2-24','820-2-25','820-2-26','820-2-27','820-2-28']::text[]),
    ('DWA-M-820-2', '820-2-01', 'worksheet_status', ARRAY['all']::text[], NULL::text[]),
    ('DWA-M-820-3', 'M8203-01', 'applicable_lph', ARRAY['ALL']::text[], ARRAY['M8203-02','M8203-03','M8203-04','M8203-05','M8203-06','M8203-07','M8203-08','M8203-09','M8203-10','M8203-11','M8203-12','M8203-13','M8203-14','M8203-15','M8203-16','M8203-17','M8203-18','M8203-19','M8203-20','M8203-21','M8203-22','M8203-23','M8203-24']::text[]),
    ('DWA-M-820-3', 'M8203-01', 'client_auftraggeber', ARRAY['ALL']::text[], ARRAY['M8203-02','M8203-03','M8203-04','M8203-05','M8203-06','M8203-07','M8203-08','M8203-09','M8203-10','M8203-11','M8203-12','M8203-13','M8203-14','M8203-15','M8203-16','M8203-17','M8203-18','M8203-19','M8203-20','M8203-21','M8203-22','M8203-23','M8203-24']::text[]),
    ('DWA-M-820-3', 'M8203-01', 'contract_reference', ARRAY['ALL']::text[], ARRAY['M8203-02','M8203-03','M8203-04','M8203-05','M8203-06','M8203-07','M8203-08','M8203-09','M8203-10','M8203-11','M8203-12','M8203-13','M8203-14','M8203-15','M8203-16','M8203-17','M8203-18','M8203-19','M8203-20','M8203-21','M8203-22','M8203-23','M8203-24']::text[]),
    ('DWA-M-820-3', 'M8203-01', 'contractor_auftragnehmer', ARRAY['ALL']::text[], ARRAY['M8203-02','M8203-03','M8203-04','M8203-05','M8203-06','M8203-07','M8203-08','M8203-09','M8203-10','M8203-11','M8203-12','M8203-13','M8203-14','M8203-15','M8203-16','M8203-17','M8203-18','M8203-19','M8203-20','M8203-21','M8203-22','M8203-23','M8203-24']::text[]),
    ('DWA-M-820-3', 'M8203-01', 'project_location', ARRAY['ALL']::text[], ARRAY['M8203-02','M8203-03','M8203-04','M8203-05','M8203-06','M8203-07','M8203-08','M8203-09','M8203-10','M8203-11','M8203-12','M8203-13','M8203-14','M8203-15','M8203-16','M8203-17','M8203-18','M8203-19','M8203-20','M8203-21','M8203-22','M8203-23','M8203-24']::text[]),
    ('DWA-M-820-3', 'M8203-01', 'project_number', ARRAY['ALL']::text[], ARRAY['M8203-02','M8203-03','M8203-04','M8203-05','M8203-06','M8203-07','M8203-08','M8203-09','M8203-10','M8203-11','M8203-12','M8203-13','M8203-14','M8203-15','M8203-16','M8203-17','M8203-18','M8203-19','M8203-20','M8203-21','M8203-22','M8203-23','M8203-24']::text[]),
    ('DWA-M-820-3', 'M8203-01', 'project_title', ARRAY['ALL']::text[], ARRAY['M8203-02','M8203-03','M8203-04','M8203-05','M8203-06','M8203-07','M8203-08','M8203-09','M8203-10','M8203-11','M8203-12','M8203-13','M8203-14','M8203-15','M8203-16','M8203-17','M8203-18','M8203-19','M8203-20','M8203-21','M8203-22','M8203-23','M8203-24']::text[]),
    ('DWA-M-820-3', 'M8203-01', 'registration_date', ARRAY['ALL']::text[], ARRAY['M8203-02','M8203-03','M8203-04','M8203-05','M8203-06','M8203-07','M8203-08','M8203-09','M8203-10','M8203-11','M8203-12','M8203-13','M8203-14','M8203-15','M8203-16','M8203-17','M8203-18','M8203-19','M8203-20','M8203-21','M8203-22','M8203-23','M8203-24']::text[]),
    ('DWA-M-820-3', 'M8203-03', 'phase_definition_acknowledged', ARRAY['ALL']::text[], ARRAY['M8203-24']::text[]),
    ('DWA-M-820-3', 'M8203-03', 'phasenziele_definition_acknowledged', ARRAY['ALL']::text[], ARRAY['M8203-24']::text[]),
    ('DWA-M-820-3', 'M8203-03', 'projektziele_definition_acknowledged', ARRAY['ALL']::text[], ARRAY['M8203-24']::text[]),
    ('DWA-M-820-3', 'M8203-03', 'qe_definition_acknowledged', ARRAY['ALL']::text[], ARRAY['M8203-24']::text[])
  ) AS t(std, ws, symbol, old_cw, new_cw) ON t.std = s.code AND t.ws = w.code AND t.symbol = f.symbol
 WHERE f.active AND f.consumer_worksheets IS NOT DISTINCT FROM t.old_cw
   AND NOT EXISTS (SELECT 1 FROM fields_archive_m820_flow_1 a WHERE a.id = f.id);

INSERT INTO fields_archive_m820_flow_1
SELECT f.* FROM fields f
  JOIN worksheet_templates w ON w.id = f.worksheet_template_id
  JOIN standards s ON s.id = w.standard_id
  JOIN worksheet_sections sc ON sc.id = f.section_id AND sc.worksheet_template_id = w.id
 WHERE s.code = 'DWA-M-820-3' AND w.code = 'M8203-02' AND sc.code = 'C' AND f.symbol = 'projektstopp_review_triggered' AND f.active
   AND f.consumer_worksheets IS NOT DISTINCT FROM ARRAY['M8203-24']::text[]
   AND NOT EXISTS (SELECT 1 FROM fields_archive_m820_flow_1 a WHERE a.id = f.id);

-- A1. REQ-07 M820-04 → M820-09 [S1] (SET order: description, then the sheet; md5 guard on the live condition)
UPDATE compliance_requirements cr
   SET description = COALESCE(cr.description, '') || E'\n' || '[Flow 1, 2026-10-06] Blatt / sheet M820-09 „Schwellenwertbestimmung“ (vorher / was M820-04 „Bedarfsplanung Konzept“). Die Prüfung liest eu_threshold_value und threshold_status (beide auf M820-09 eingegeben) sowie estimated_engineering_fee, client_organization_type und vergaberecht_freiwillig_angewendet (M820-01, an M820-09 weitergereicht). Auf M820-04 wartete die Block-Prüfung auf die später einzugebenden Werte und hielt die Freigabe von M820-04 an. § 8.5 (PDF S. 35): Schätzung des Netto-Gesamtwerts; § 8.6 (PDF S. 36): „Erreicht oder übersteigt der geschätzte Netto-Gesamtwert den EU-Schwellenwert ist ein VgV-F-Verfahren durchzuführen.“ [EN] The check reads the EU threshold and the threshold status (both entered on M820-09) and three values from M820-01 passed on to M820-09. On M820-04 the block check waited for values entered later and held up the approval of M820-04.',
       worksheet_template_id = wt.id
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id, worksheet_templates wt
 WHERE cr.code = 'REQ-07' AND w.id = cr.worksheet_template_id AND w.code = 'M820-04' AND s.code = 'DWA-M-820-1'
   AND wt.standard_id = s.id AND wt.code = 'M820-09'
   AND md5(cr.condition) = '4d24b0248a3353ee098e079f2a7749b0';

-- A2. REQ-04 M820-01 → M820-03 [S2] (attestation, empty condition; guard: condition '' + description md5)
UPDATE compliance_requirements cr
   SET description = COALESCE(cr.description, '') || E'\n' || '[Flow 1, 2026-10-06] Blatt / sheet M820-03 „Beteiligten-Matrix“ (vorher / was M820-01 „Projektregistrierung“): die Bestätigung steht dort, wo die Beteiligten erfasst werden (stakeholder_list). § 5 (PDF S. 25): „Bei jeder Planung gibt es einen Auftraggeber und oftmals mehrere Auftragnehmer.“ [EN] The sign-off sits where the parties are entered.',
       worksheet_template_id = wt.id
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id, worksheet_templates wt
 WHERE cr.code = 'REQ-04' AND w.id = cr.worksheet_template_id AND w.code = 'M820-01' AND s.code = 'DWA-M-820-1'
   AND wt.standard_id = s.id AND wt.code = 'M820-03'
   AND cr.condition = '' AND md5(COALESCE(cr.description, '')) = '6c931c4fc0603ba6dc5ebc2cc06a13b0';

-- A3. REQ-24 M820-04 → M820-09 [S3]
UPDATE compliance_requirements cr
   SET description = COALESCE(cr.description, '') || E'\n' || '[Flow 1, 2026-10-06] Blatt / sheet M820-09 „Schwellenwertbestimmung“ (vorher / was M820-04 „Bedarfsplanung Konzept“): die Bestätigung steht dort, wo die Lose und die Loseausnahme erfasst werden (lose, loseausnahme_code). Anh. B.2.4 (PDF S. 53): „Die Aufteilung in Lose regelt § 3 Abs. 9 VgV“. [EN] The sign-off sits where the lots and the lot exception are entered.',
       worksheet_template_id = wt.id
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id, worksheet_templates wt
 WHERE cr.code = 'REQ-24' AND w.id = cr.worksheet_template_id AND w.code = 'M820-04' AND s.code = 'DWA-M-820-1'
   AND wt.standard_id = s.id AND wt.code = 'M820-09'
   AND cr.condition = '' AND md5(COALESCE(cr.description, '')) = '9030ce6a7aa94d9cf4997f9fd07864b8';

-- A4. REQ-14 M820-10 → M820-14 [S4]
UPDATE compliance_requirements cr
   SET description = COALESCE(cr.description, '') || E'\n' || '[Flow 1, 2026-10-06] Blatt / sheet M820-14 „Zuschlagskriterien“ (vorher / was M820-10 „Verfahrenswahl“): die Bestätigung steht dort, wo die Zuschlagskriterien festgelegt werden. § 8.10.3.3 (PDF S. 42): „Der Auftraggeber ist verpflichtet, spätestens bei der Aufforderung zur Angebotsabgabe, besser bereits bei der Bekanntmachung, die Zuschlagskriterien und deren Gewichtung anzugeben (§ 127 GWB).“ [EN] The sign-off sits where the award criteria are set.',
       worksheet_template_id = wt.id
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id, worksheet_templates wt
 WHERE cr.code = 'REQ-14' AND w.id = cr.worksheet_template_id AND w.code = 'M820-10' AND s.code = 'DWA-M-820-1'
   AND wt.standard_id = s.id AND wt.code = 'M820-14'
   AND cr.condition = '' AND md5(COALESCE(cr.description, '')) = '0670f04abccbabbabb57b8bbce871c2e';

-- B. consumer_worksheets old → new (items 1 / 3 / 4 / 5), only while the live array is still exactly the old one
UPDATE fields f
   SET consumer_worksheets = t.new_cw
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id,
       (VALUES
    ('DWA-M-820-1', 'M820-09', 'threshold_status', ARRAY['M820-10','M820-11','M820-12','M820-17','M820-04','M820-23']::text[], ARRAY['M820-10','M820-11','M820-12','M820-17','M820-23']::text[]),
    ('DWA-M-820-3', 'M8203-07', 'qe52_items_rated', NULL::text[], ARRAY['M8203-22']::text[]),
    ('DWA-M-820-3', 'M8203-08', 'qe53_items_rated', NULL::text[], ARRAY['M8203-22']::text[]),
    ('DWA-M-820-3', 'M8203-09', 'qe54_items_rated', NULL::text[], ARRAY['M8203-22']::text[]),
    ('DWA-M-820-3', 'M8203-10', 'qe55_items_rated', NULL::text[], ARRAY['M8203-22']::text[]),
    ('DWA-M-820-3', 'M8203-11', 'qe62_items_rated', NULL::text[], ARRAY['M8203-23']::text[]),
    ('DWA-M-820-3', 'M8203-12', 'qe63a_items_rated', NULL::text[], ARRAY['M8203-23']::text[]),
    ('DWA-M-820-3', 'M8203-13', 'qe63b_items_rated', NULL::text[], ARRAY['M8203-23']::text[]),
    ('DWA-M-820-3', 'M8203-14', 'qe64a_items_rated', NULL::text[], ARRAY['M8203-23']::text[]),
    ('DWA-M-820-3', 'M8203-15', 'qe64b_items_rated', NULL::text[], ARRAY['M8203-23']::text[]),
    ('DWA-M-820-3', 'M8203-16', 'qe65_items_rated', NULL::text[], ARRAY['M8203-23']::text[]),
    ('DWA-M-820-3', 'M8203-17', 'qe66_items_rated', NULL::text[], ARRAY['M8203-23']::text[]),
    ('DWA-M-820-3', 'M8203-18', 'qe67_items_rated', NULL::text[], ARRAY['M8203-23']::text[]),
    ('DWA-M-820-3', 'M8203-03', 'bild1_step_4_einzelprojekt_lifecycle', ARRAY['M8203-11..M8203-18','M8203-23','M8203-24']::text[], ARRAY['M8203-11','M8203-12','M8203-13','M8203-14','M8203-15','M8203-16','M8203-17','M8203-18','M8203-23','M8203-24']::text[]),
    ('DWA-M-820-2', '820-2-01', 'project_name_full', ARRAY['all']::text[], ARRAY['820-2-02','820-2-03','820-2-04','820-2-05','820-2-06','820-2-07','820-2-08','820-2-09','820-2-10','820-2-11','820-2-12','820-2-13','820-2-14','820-2-15','820-2-16','820-2-17','820-2-18','820-2-19','820-2-20','820-2-21','820-2-22','820-2-23','820-2-24','820-2-25','820-2-26','820-2-27','820-2-28']::text[]),
    ('DWA-M-820-2', '820-2-01', 'project_name_short', ARRAY['all']::text[], ARRAY['820-2-02','820-2-03','820-2-04','820-2-05','820-2-06','820-2-07','820-2-08','820-2-09','820-2-10','820-2-11','820-2-12','820-2-13','820-2-14','820-2-15','820-2-16','820-2-17','820-2-18','820-2-19','820-2-20','820-2-21','820-2-22','820-2-23','820-2-24','820-2-25','820-2-26','820-2-27','820-2-28']::text[]),
    ('DWA-M-820-2', '820-2-01', 'project_number', ARRAY['all']::text[], ARRAY['820-2-02','820-2-03','820-2-04','820-2-05','820-2-06','820-2-07','820-2-08','820-2-09','820-2-10','820-2-11','820-2-12','820-2-13','820-2-14','820-2-15','820-2-16','820-2-17','820-2-18','820-2-19','820-2-20','820-2-21','820-2-22','820-2-23','820-2-24','820-2-25','820-2-26','820-2-27','820-2-28']::text[]),
    ('DWA-M-820-2', '820-2-01', 'worksheet_status', ARRAY['all']::text[], NULL::text[]),
    ('DWA-M-820-3', 'M8203-01', 'applicable_lph', ARRAY['ALL']::text[], ARRAY['M8203-02','M8203-03','M8203-04','M8203-05','M8203-06','M8203-07','M8203-08','M8203-09','M8203-10','M8203-11','M8203-12','M8203-13','M8203-14','M8203-15','M8203-16','M8203-17','M8203-18','M8203-19','M8203-20','M8203-21','M8203-22','M8203-23','M8203-24']::text[]),
    ('DWA-M-820-3', 'M8203-01', 'client_auftraggeber', ARRAY['ALL']::text[], ARRAY['M8203-02','M8203-03','M8203-04','M8203-05','M8203-06','M8203-07','M8203-08','M8203-09','M8203-10','M8203-11','M8203-12','M8203-13','M8203-14','M8203-15','M8203-16','M8203-17','M8203-18','M8203-19','M8203-20','M8203-21','M8203-22','M8203-23','M8203-24']::text[]),
    ('DWA-M-820-3', 'M8203-01', 'contract_reference', ARRAY['ALL']::text[], ARRAY['M8203-02','M8203-03','M8203-04','M8203-05','M8203-06','M8203-07','M8203-08','M8203-09','M8203-10','M8203-11','M8203-12','M8203-13','M8203-14','M8203-15','M8203-16','M8203-17','M8203-18','M8203-19','M8203-20','M8203-21','M8203-22','M8203-23','M8203-24']::text[]),
    ('DWA-M-820-3', 'M8203-01', 'contractor_auftragnehmer', ARRAY['ALL']::text[], ARRAY['M8203-02','M8203-03','M8203-04','M8203-05','M8203-06','M8203-07','M8203-08','M8203-09','M8203-10','M8203-11','M8203-12','M8203-13','M8203-14','M8203-15','M8203-16','M8203-17','M8203-18','M8203-19','M8203-20','M8203-21','M8203-22','M8203-23','M8203-24']::text[]),
    ('DWA-M-820-3', 'M8203-01', 'project_location', ARRAY['ALL']::text[], ARRAY['M8203-02','M8203-03','M8203-04','M8203-05','M8203-06','M8203-07','M8203-08','M8203-09','M8203-10','M8203-11','M8203-12','M8203-13','M8203-14','M8203-15','M8203-16','M8203-17','M8203-18','M8203-19','M8203-20','M8203-21','M8203-22','M8203-23','M8203-24']::text[]),
    ('DWA-M-820-3', 'M8203-01', 'project_number', ARRAY['ALL']::text[], ARRAY['M8203-02','M8203-03','M8203-04','M8203-05','M8203-06','M8203-07','M8203-08','M8203-09','M8203-10','M8203-11','M8203-12','M8203-13','M8203-14','M8203-15','M8203-16','M8203-17','M8203-18','M8203-19','M8203-20','M8203-21','M8203-22','M8203-23','M8203-24']::text[]),
    ('DWA-M-820-3', 'M8203-01', 'project_title', ARRAY['ALL']::text[], ARRAY['M8203-02','M8203-03','M8203-04','M8203-05','M8203-06','M8203-07','M8203-08','M8203-09','M8203-10','M8203-11','M8203-12','M8203-13','M8203-14','M8203-15','M8203-16','M8203-17','M8203-18','M8203-19','M8203-20','M8203-21','M8203-22','M8203-23','M8203-24']::text[]),
    ('DWA-M-820-3', 'M8203-01', 'registration_date', ARRAY['ALL']::text[], ARRAY['M8203-02','M8203-03','M8203-04','M8203-05','M8203-06','M8203-07','M8203-08','M8203-09','M8203-10','M8203-11','M8203-12','M8203-13','M8203-14','M8203-15','M8203-16','M8203-17','M8203-18','M8203-19','M8203-20','M8203-21','M8203-22','M8203-23','M8203-24']::text[]),
    ('DWA-M-820-3', 'M8203-03', 'phase_definition_acknowledged', ARRAY['ALL']::text[], ARRAY['M8203-24']::text[]),
    ('DWA-M-820-3', 'M8203-03', 'phasenziele_definition_acknowledged', ARRAY['ALL']::text[], ARRAY['M8203-24']::text[]),
    ('DWA-M-820-3', 'M8203-03', 'projektziele_definition_acknowledged', ARRAY['ALL']::text[], ARRAY['M8203-24']::text[]),
    ('DWA-M-820-3', 'M8203-03', 'qe_definition_acknowledged', ARRAY['ALL']::text[], ARRAY['M8203-24']::text[])
       ) AS t(std, ws, symbol, old_cw, new_cw)
 WHERE w.id = f.worksheet_template_id AND t.std = s.code AND t.ws = w.code AND t.symbol = f.symbol
   AND f.active AND f.consumer_worksheets IS NOT DISTINCT FROM t.old_cw;

-- C. projektstopp_review_triggered M8203-02 (section C) → M8203-24 (section F, after projektstopp_code) [S5]
UPDATE fields f
   SET description = COALESCE(f.description, '') || E'\n' || '[Flow 1, 2026-10-06] Blatt / sheet M8203-24 „Gesamtverifizierung Qualität“, Abschnitt F (vorher / was M8203-02 „Anwendungsbereich und Grundsätze“): der Auslöser projektstopp_code wird auf M8203-24 berechnet, REQ-31 liest beide dort. § 3 (PDF S. 12): „Werden Phasenziele nicht oder nur unvollständig erreicht, ist die Prüfung eines Projektstopps erforderlich.“ [EN] The trigger is computed on M8203-24 and REQ-31 reads both there.',
       worksheet_template_id = wt.id,
       section_id = sct.id,
       order_index = 2,
       consumer_worksheets = NULL
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id, worksheet_sections sc,
       worksheet_templates wt JOIN worksheet_sections sct ON sct.worksheet_template_id = wt.id AND sct.code = 'F'
 WHERE f.symbol = 'projektstopp_review_triggered' AND f.active
   AND w.id = f.worksheet_template_id AND w.code = 'M8203-02' AND s.code = 'DWA-M-820-3'
   AND sc.id = f.section_id AND sc.worksheet_template_id = w.id AND sc.code = 'C'
   AND wt.standard_id = s.id AND wt.code = 'M8203-24'
   AND f.consumer_worksheets IS NOT DISTINCT FROM ARRAY['M8203-24']::text[];

COMMIT;
