-- 20261006200000_m820_flow_2.sql · M820 flow block 2 — order and home rulings (DWA-M 820-1 / -2 / -3)
-- Requirements: vault 01-Projects/ekowai-wizard/m820-wizard-test/_briefs/flow-2-3-brief.md "Block 2" (owner ruling 2026-10-06:
-- "block 2: 1–3 yes, 4 later"); evidence 33_FLOW-AUDIT-m820-sheet-order_2026-10-06.md 1-a1, 3-a1, 2-a2 / 2-d4.
-- Apply order: 36_APPLY-ORDER-m820-flow-2.md. Sign-off sheet: 38_SIGN-OFF-m820-flow-2-3.md. Item 4 (820-2 § 6 consolidation) is deferred
-- and not touched.
-- Owner principle (2026-10-06): sheets in the order of the work; each gate on the sheet where its last input is entered, or later;
-- values flow forward; nothing asked twice without carry-over.
--
-- WHAT THE PROJECT TEAM SEES (plain English):
--   1. DWA-M 820-1: sheet M820-16 "Bewertungskommission" now comes directly after M820-10 "Verfahrenswahl" (phase 3), before the
--      quality, exclusion, eligibility and award-criteria sheets M820-11 … -15 (they move one place down). § 8.4 says the commission
--      should already take part in preparing the procurement and in setting the eligibility and award criteria. The sheet keeps its
--      code, fields, gate REQ-09 and equations; its inputs come from M820-03 and M820-10 (both still earlier), its members register
--      goes on to M820-18 / -19 (both still later). Nothing becomes backward.
--   2. DWA-M 820-3: the § 6.3 phase-goal block (8 status questions + "Projektstopp-Prüfung mit Risikoanalyse durchgeführt") and its
--      three checks REQ-10 / REQ-10-2 / REQ-10-3 move from M8203-12 "QE 6.3 (Teil 1)" to M8203-13 "QE 6.3 (Teil 2): Entwurfsplanung,
--      Genehmigungsplanung"; the § 6.4 block (12 status questions + its Projektstopp question) and REQ-11 / -11-2 / -11-3 move from
--      M8203-14 "QE 6.4 (Teil 1)" to M8203-15 "QE 6.4 (Teil 2): Vorbereiten + Mitwirkung Vergabe". Phase goals are rated once the
--      phase is finished, so they now sit on the sheet that closes the phase. The questions go into section B "Input Parameters" of the
--      new sheet, which carries the same visibility rule (project type einzelprojekt / both) as before. Saved answers keep their field
--      id and move with the question. The status values are still passed on to the summaries M8203-23 / -24; they are no longer
--      passed to M8203-13 / -15 (they are now that sheet's own questions).
--   3. DWA-M 820-2: sheet 820-2-16 "Genehmigungen und Erlaubnisse" (§ 5.4) now comes before the planning summary 820-2-15, and both
--      sit in phase 3. The summary asks "Genehmigungen vollständig" (§ 5.4.1) and dates "§ 5.3, § 5.4"; it now follows the permits
--      sheet. Chosen over moving `permitting_complete`: two order rows change, no field, value, gate or consumer changes (see 38).
--   No value, condition, severity, equation, table or consumer target outside item 2 changes. Approval: item 2 moves two block
--   gates (REQ-10, REQ-10-2; REQ-11, REQ-11-2) one sheet later — M8203-12 / -14 no longer carry them, M8203-13 / -15 do.
--
-- SOURCE CHECK (re-read 2026-10-06 on the RENDERED PDF: scoop pdftotext -layout of C:\Users\Ekowai\Desktop\Guidelines\DWA-M-820-1\
--   DWA-M_820-1.pdf, ...\DWA-M-820-2\DWA-M_820-2.pdf, ...\DWA-M-820-3\DWA-M_820-3.pdf, whitespace-normalised match per PDF page):
--   [S1] 820-1 § 8.4 "Bewertungskommission", PDF p. 35: "Die Bewertungskommission sollte bereits bei der Vorbereitung des
--        Vergabeverfahrens und bei der Festlegung von Eignungs- und Zuschlagskriterien und deren Gewichtung eingebunden werden."
--        EN "The evaluation commission should already be involved in preparing the procurement procedure and in setting the
--        eligibility and award criteria and their weighting." → M820-16 before M820-11 … -15 (eligibility M820-13, award M820-14).
--        After M820-10, because REQ-09 reads procurement_procedure (M820-10).
--   [S2] 820-3 § 2.1 "Phasenziele", PDF p. 10: "Ergebnisse, die nach Abschluss der jeweiligen Leistungsphase zu erreichen sind"
--        (results to be achieved after completion of the respective work phase).
--        § 6.3 "Planung", PDF p. 16: "Die Phase „Planung“ enthält die Projektschritte von der Grundlagenermittlung bis zur Einreichung
--        der Genehmigungsunterlagen, einschließlich Rückfragen der Genehmigungsbehörden und die Erteilung der Genehmigungen,
--        Bewilligungen und Erlaubnisse." → the phase ends with the permit planning = M8203-13.
--        § 6.4 "Ausführungsvorbereitung", PDF p. 17: "Die Ausführungsvorbereitung beginnt mit der Ausführungsplanung, beinhaltet die
--        Vorbereitung der Vergabe, und endet mit der Auftragserteilung an die ausführenden Unternehmen." → ends with the award = M8203-15.
--   [S3] 820-2 table of contents, PDF p. 9: "5.3 Phase „Planung“ … 40", "5.4 Phase „Genehmigungen und Erlaubnisse“ … 45",
--        "5.4.1 Allgemeines … 45"; § 5.4.1, PDF p. 47: "Die Benutzung eines Gewässers bedarf der Erlaubnis." → the permit sheet
--        (§ 5.4) is printed after § 5.3 and before the summary that confirms "Genehmigungen vollständig" (§ 5.4.1).
--   Item order / home only; no printed value is involved.
--   Code evidence (2026-10-06): the sidebar groups sheets by worksheet_templates.phase and sorts by order_index
--   (worksheet-list-sidebar.tsx byPhase; page.tsx / standards.ts / library.ts ORDER BY order_index, standards.ts phase first);
--   nothing reads order_index or phase for gate, inheritance or equation logic.
--
-- LIVE PRE-STATE (read-only prod check 2026-10-06, scripts/verification/prod-query.mjs): M820-11 … -15 phase 3 order 11 … 15,
--   M820-16 phase 4 order 16; 820-2-15 phase 3 order 15, 820-2-16 phase 4 order 16; M8203-12 section B = exactly the 9 pz_63
--   fields, M8203-14 section B = exactly the 13 pz_64 fields; pz_63_*_status consumer {M8203-13,M8203-23,M8203-24}, pz_64_*_status
--   {M8203-15,M8203-23,M8203-24}, both projektstopp fields NULL; section B of M8203-13 / -15 exists (same visible_when) with 0 fields;
--   gate conditions md5 REQ-10 179cbd016843c9a978922a1f8938031b, REQ-10-2 de928cafb161348fce101a8a0f0e27f7, REQ-10-3
--   90526a541774bb75a5e4ff117cb83866, REQ-11 c90bc125c86d72d2981080223b487aa9, REQ-11-2 98b5acb5860fd369d7212a0faba82a04,
--   REQ-11-3 2b5c3fd599db7e1d751010aad78e4a36; 43 saved pz_63 / pz_64 values in 1 project; all affected instances draft.
--
-- WHAT THIS BLOCK DOES (idempotent; each family all-or-nothing on the live values; in-transaction archive of each pre-state row):
--   A. worksheet_templates: phase / order_index of 6 (820-1) + 2 (820-2) rows, per standard only when every row of that standard is
--      still exactly at its old (phase, order_index).
--   B. fields: the 9 + 13 phase-goal fields → new sheet + its section B (order_index kept), status consumers drop the new home sheet.
--   C. compliance_requirements: the 3 + 3 gates → new sheet + one "moved" note on the description (code, title, severity, condition,
--      clause unchanged).
--   B + C run per family (§ 6.3 / § 6.4) only when all 9 + 3 / 13 + 3 rows are at the old state and the target section B is empty.
--   project_parameters untouched: values are keyed by field_id and follow the row. Nothing is deactivated or re-activated.
-- STAGED — not applied. Apply (from C:\Users\Ekowai\_wt-g2t, which holds .env.local):
--   node scripts/apply-migration.mjs C:\Users\Ekowai\_wt-m820\scripts\migrations\20261006200000_m820_flow_2.sql
-- Rollback:  C:\Users\Ekowai\_wt-m820\scripts\rollback-20261006200000-m820-flow-2.sql
-- Read-back: C:\Users\Ekowai\_wt-m820\scripts\verification\apply\readback-20261006200000-m820-flow-2.sql
BEGIN;

-- 0. in-transaction archives (pre-state only; a re-run archives nothing)
CREATE TABLE IF NOT EXISTS worksheet_templates_archive_m820_flow_2 AS SELECT * FROM worksheet_templates WHERE false;
CREATE TABLE IF NOT EXISTS fields_archive_m820_flow_2 AS SELECT * FROM fields WHERE false;
CREATE TABLE IF NOT EXISTS compliance_requirements_archive_m820_flow_2 AS SELECT * FROM compliance_requirements WHERE false;

-- plan: sheet order (std, code, old phase, old order, new phase, new order)
CREATE TEMP TABLE m820f2_tpl ON COMMIT DROP AS SELECT * FROM (VALUES
  ('DWA-M-820-1', 'M820-16', 4, 16, 3, 11),
  ('DWA-M-820-1', 'M820-11', 3, 11, 3, 12),
  ('DWA-M-820-1', 'M820-12', 3, 12, 3, 13),
  ('DWA-M-820-1', 'M820-13', 3, 13, 3, 14),
  ('DWA-M-820-1', 'M820-14', 3, 14, 3, 15),
  ('DWA-M-820-1', 'M820-15', 3, 15, 3, 16),
  ('DWA-M-820-2', '820-2-16', 4, 16, 3, 15),
  ('DWA-M-820-2', '820-2-15', 3, 15, 3, 16)
) AS t(std, code, old_phase, old_order, new_phase, new_order);

-- plan: phase-goal fields (family, symbol, old consumer, new consumer); family 63: M8203-12 → -13, family 64: M8203-14 → -15
CREATE TEMP TABLE m820f2_fam ON COMMIT DROP AS SELECT * FROM (VALUES ('63', 'M8203-12', 'M8203-13', 9, 3), ('64', 'M8203-14', 'M8203-15', 13, 3))
  AS t(fam, old_ws, new_ws, n_fields, n_gates);
CREATE TEMP TABLE m820f2_fld ON COMMIT DROP AS
SELECT '63'::text AS fam, 'pz_63_' || i || '_status' AS symbol, ARRAY['M8203-13','M8203-23','M8203-24']::text[] AS old_cw, ARRAY['M8203-23','M8203-24']::text[] AS new_cw FROM generate_series(1, 8) i
UNION ALL SELECT '63', 'pz_63_projektstopp_risikoanalyse', NULL::text[], NULL::text[]
UNION ALL SELECT '64', 'pz_64_' || i || '_status', ARRAY['M8203-15','M8203-23','M8203-24']::text[], ARRAY['M8203-23','M8203-24']::text[] FROM generate_series(1, 12) i
UNION ALL SELECT '64', 'pz_64_projektstopp_risikoanalyse', NULL::text[], NULL::text[];
CREATE TEMP TABLE m820f2_gate ON COMMIT DROP AS SELECT * FROM (VALUES
  ('63', 'REQ-10',   'block', '179cbd016843c9a978922a1f8938031b'),
  ('63', 'REQ-10-2', 'block', 'de928cafb161348fce101a8a0f0e27f7'),
  ('63', 'REQ-10-3', 'warn',  '90526a541774bb75a5e4ff117cb83866'),
  ('64', 'REQ-11',   'block', 'c90bc125c86d72d2981080223b487aa9'),
  ('64', 'REQ-11-2', 'block', '98b5acb5860fd369d7212a0faba82a04'),
  ('64', 'REQ-11-3', 'warn',  '2b5c3fd599db7e1d751010aad78e4a36')
) AS t(fam, code, severity, cond_md5);

-- live matches at the OLD state
CREATE TEMP TABLE m820f2_tpl_old ON COMMIT DROP AS
SELECT w.id, t.std, t.code, t.new_phase, t.new_order FROM m820f2_tpl t
  JOIN standards s ON s.code = t.std JOIN worksheet_templates w ON w.standard_id = s.id AND w.code = t.code
 WHERE w.phase IS NOT DISTINCT FROM t.old_phase AND w.order_index = t.old_order;
CREATE TEMP TABLE m820f2_std_ok ON COMMIT DROP AS
SELECT t.std FROM m820f2_tpl t GROUP BY t.std
HAVING count(*) = (SELECT count(*) FROM m820f2_tpl_old o WHERE o.std = t.std);

CREATE TEMP TABLE m820f2_fld_old ON COMMIT DROP AS
SELECT f.id, p.fam, p.new_cw FROM m820f2_fld p JOIN m820f2_fam fm ON fm.fam = p.fam
  JOIN standards s ON s.code = 'DWA-M-820-3' JOIN worksheet_templates w ON w.standard_id = s.id AND w.code = fm.old_ws
  JOIN fields f ON f.worksheet_template_id = w.id AND f.symbol = p.symbol AND f.active
  JOIN worksheet_sections sc ON sc.id = f.section_id AND sc.worksheet_template_id = w.id AND sc.code = 'B'
 WHERE f.consumer_worksheets IS NOT DISTINCT FROM p.old_cw;
CREATE TEMP TABLE m820f2_gate_old ON COMMIT DROP AS
SELECT cr.id, g.fam FROM m820f2_gate g JOIN m820f2_fam fm ON fm.fam = g.fam
  JOIN standards s ON s.code = 'DWA-M-820-3' JOIN worksheet_templates w ON w.standard_id = s.id AND w.code = fm.old_ws
  JOIN compliance_requirements cr ON cr.worksheet_template_id = w.id AND cr.code = g.code
 WHERE cr.severity = g.severity AND md5(cr.condition) = g.cond_md5;
CREATE TEMP TABLE m820f2_fam_ok ON COMMIT DROP AS
SELECT fm.fam, fm.new_ws, wt.id AS new_wt, sct.id AS new_sec FROM m820f2_fam fm
  JOIN standards s ON s.code = 'DWA-M-820-3' JOIN worksheet_templates wt ON wt.standard_id = s.id AND wt.code = fm.new_ws
  JOIN worksheet_sections sct ON sct.worksheet_template_id = wt.id AND sct.code = 'B'
 WHERE (SELECT count(*) FROM m820f2_fld_old o WHERE o.fam = fm.fam) = fm.n_fields
   AND (SELECT count(*) FROM m820f2_gate_old o WHERE o.fam = fm.fam) = fm.n_gates
   AND NOT EXISTS (SELECT 1 FROM fields f2 WHERE f2.section_id = sct.id AND f2.active)
   AND NOT EXISTS (SELECT 1 FROM compliance_requirements c2 JOIN m820f2_gate g2 ON g2.code = c2.code AND g2.fam = fm.fam WHERE c2.worksheet_template_id = wt.id);

INSERT INTO worksheet_templates_archive_m820_flow_2
SELECT w.* FROM worksheet_templates w JOIN m820f2_tpl_old o ON o.id = w.id JOIN m820f2_std_ok k ON k.std = o.std
 WHERE NOT EXISTS (SELECT 1 FROM worksheet_templates_archive_m820_flow_2 a WHERE a.id = w.id);
INSERT INTO fields_archive_m820_flow_2
SELECT f.* FROM fields f JOIN m820f2_fld_old o ON o.id = f.id JOIN m820f2_fam_ok k ON k.fam = o.fam
 WHERE NOT EXISTS (SELECT 1 FROM fields_archive_m820_flow_2 a WHERE a.id = f.id);
INSERT INTO compliance_requirements_archive_m820_flow_2
SELECT cr.* FROM compliance_requirements cr JOIN m820f2_gate_old o ON o.id = cr.id JOIN m820f2_fam_ok k ON k.fam = o.fam
 WHERE NOT EXISTS (SELECT 1 FROM compliance_requirements_archive_m820_flow_2 a WHERE a.id = cr.id);

-- A. sheet order [S1] [S3]
UPDATE worksheet_templates w
   SET phase = o.new_phase, order_index = o.new_order
  FROM m820f2_tpl_old o JOIN m820f2_std_ok k ON k.std = o.std
 WHERE w.id = o.id;

-- B. phase-goal fields → the sheet that closes the phase, its section B [S2]
UPDATE fields f
   SET worksheet_template_id = k.new_wt, section_id = k.new_sec, consumer_worksheets = o.new_cw
  FROM m820f2_fld_old o JOIN m820f2_fam_ok k ON k.fam = o.fam
 WHERE f.id = o.id;

-- C. the three gates of each family follow their inputs [S2]
UPDATE compliance_requirements cr
   SET description = COALESCE(cr.description, '') || E'\n' || '[Flow 2, 2026-10-06] Blatt / sheet ' || k.new_ws
         || CASE k.fam WHEN '63' THEN ' „QE 6.3 (Teil 2): Entwurfsplanung, Genehmigungsplanung“ (vorher / was M8203-12). § 6.3 (PDF S. 16): „Die Phase „Planung“ enthält die Projektschritte von der Grundlagenermittlung bis zur Einreichung der Genehmigungsunterlagen, einschließlich Rückfragen der Genehmigungsbehörden und die Erteilung der Genehmigungen, Bewilligungen und Erlaubnisse.“'
                       ELSE ' „QE 6.4 (Teil 2): Vorbereiten + Mitwirkung Vergabe“ (vorher / was M8203-14). § 6.4 (PDF S. 17): „Die Ausführungsvorbereitung beginnt mit der Ausführungsplanung, beinhaltet die Vorbereitung der Vergabe, und endet mit der Auftragserteilung an die ausführenden Unternehmen.“' END
         || ' § 2.1 (PDF S. 10): Phasenziele = „Ergebnisse, die nach Abschluss der jeweiligen Leistungsphase zu erreichen sind“. Die Phasenziele und diese Prüfung stehen jetzt auf dem Blatt, das die Phase abschließt. [EN] Phase goals are results to be achieved after completion of the phase; the goals and this check now sit on the sheet that closes the phase.',
       worksheet_template_id = k.new_wt
  FROM m820f2_gate_old o JOIN m820f2_fam_ok k ON k.fam = o.fam
 WHERE cr.id = o.id;

COMMIT;
