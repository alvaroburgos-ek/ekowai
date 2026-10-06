-- 20261006230000_m820_3_projektstopp_paths.sql · DWA-M 820-3 · the overall Projektstopp code follows the project path
-- Evidence: vault 01-Projects/ekowai-wizard/m820-wizard-test/40_Fill-Run_M820-3_C2-public_2026-10-06.md finding F-3 (live 2026-10-06,
-- TEST-M820-C2-public 51abeed7-3f90-4b80-9342-11e1d1833565, project_type = gesamtsystem: M8203-24-D1 "not computed", 54 missing
-- pz_62_* … pz_67_* statuses → REQ-31 undecidable) and 21_Fill-Run_M820-3_C1_2026-10-06.md (Einzelprojekt: the code computed only
-- because the observer had typed "nicht_zutreffend" into the 13 routing-hidden § 5 goals; a browser user never sees them).
-- Apply order: 41_APPLY-ORDER-m820-3-projektstopp-paths.md · Sign-off: 42_SIGN-OFF-m820-3-projektstopp-paths.md.
-- Pre-state = prod 2026-10-06 (blocks 15 / 16 / 17 / 19 / follow-up 1 / risk changes / flow 1-3) + the staged REQ-05 and hint blocks
-- (the harness seeds the 2026-10-05 dumps and applies all of them first).
--
-- WHAT THE PROJECT TEAM SEES (plain English):
--   Sheet M8203-24 "Gesamtverifizierung Qualität": the computed Projektstopp code (projektstopp_code) now reads only the phase goals of
--   the path chosen on M8203-01 (project_type): Gesamtsystem → the 13 goals of § 5.2-5.4; Einzelprojekt → the 54 goals of § 6.2-6.7;
--   both → all 67 (as today). Until now it always needed all 67, so a Gesamtsystem project (whose § 6 sheets are hidden) or an
--   Einzelprojekt (whose § 5 sheets are hidden) never got a code, and the warning REQ-31 ("code 1 → review triggered?") waited for good.
--   What counts is unchanged: a goal "Nicht erreicht" or "Teilweise erreicht" → 1; "Erreicht", "Nicht zutreffend", "Phase noch nicht
--   erreicht" → no trigger. The summary sheets M8203-22 (code_a, § 5) and M8203-23 (code_b, § 6) are unchanged: each already computes on
--   its own path (and stays hidden on the other path, block 19).
--
-- SOURCES (re-read 2026-10-06 on the RENDERED PDF: scoop pdftotext -layout of
--   C:\Users\Ekowai\Desktop\Guidelines\DWA-M-820-3\DWA-M_820-3.pdf, pages 10-13; printed page numbers in brackets):
--   [S3] § 3 Grundsätze, PDF p. 12 (printed 10): "Werden Phasenziele nicht oder nur unvollständig erreicht, ist die Prüfung eines
--        Projektstopps erforderlich. Im Rahmen einer Risikoanalyse muss bewertet werden, ob und wie das Projekt fortgeführt werden kann."
--        EN "If phase goals are not or only incompletely achieved, a review of a project stop is required. A risk analysis must assess
--        whether and how the project can be continued."
--   [S21] § 2.1 Definitionen, PDF p. 10 (printed 8): "Phasenziele — Ergebnisse, die nach Abschluss der jeweiligen Leistungsphase zu
--        erreichen sind" · "Anmerkung 1: Die aufeinander aufbauenden Leistungsphasen und deren Phasenziele führen Schritt für Schritt zum
--        Ziel des Gesamtkonzepts sowie zu den Zielen der einzelnen Projekte."
--        EN "Phase goals — results to be achieved after completion of the respective service phase" · "Note 1: The successive service
--        phases and their phase goals lead step by step to the goal of the overall concept and to the goals of the individual projects."
--   [S4] (context for the path split) § 4 Rahmenbedingungen, PDF p. 13 (printed 11): "Die Aufteilung in „Konzept für das Gesamtsystem“
--        und „Projekte“ ist dabei eine elementare Grundlage." EN "The division into 'concept for the overall system' and 'projects' is an
--        elementary basis."
--   → the trigger (a goal "nicht oder nur unvollständig erreicht") and its members (the phase goals of the phases the project runs
--     through) are printed; the 13 / 54 split per path is the tool's routing of block 19 (§ 5 Gesamtsystem / § 6 Projekte). That the
--     overall code reads only the chosen path's goals (and ignores a stored status on the other path's hidden sheets) is a tool
--     representation choice → RULING PS-1 on 42_. The unchanged meaning of each goal's trigger is source-settled [S3].
--
-- MECHANISM (engine, src/lib/eval/formula.ts): a formula with an if(...) call is evaluated with the inputs that exist; a missing input
--   only stops it when the evaluator actually READS it (taken branch only — short-circuit, src/lib/expr/evaluate.ts case 'if'). So
--     if(project_type == 'gesamtsystem', if(<13 goals of M8203-22-D3>, 1, 0),
--        if(project_type == 'einzelprojekt', if(<54 goals of M8203-23-D3>, 1, 0), if(<all 67, the live body>, 1, 0)))
--   computes for each path with only that path's goals answered; an unanswered project_type or an unanswered goal of the taken path
--   still leaves the code "not computed" (never a silent 0). The three bodies are copied byte-for-byte from the live M8203-22-D3,
--   M8203-23-D3 and M8203-24-D1 (the harness proves body(24) = body(22) || ' OR ' || body(23)). project_type is added as the first input
--   and its consumer list gains M8203-24 (block 19 handed it to the 17 path sheets only) so the sheet can read it.
--
-- WHAT THIS BLOCK DOES (idempotent; md5-guarded on the live text; in-transaction archives; the rollback restores byte-equal):
--   1. equations M8203-24-D1: formula (md5 2d497935cfa3c2e9ac44081a90cec57a → 0e7c0e64ba6c08ac022ea68a58e71ed3), input_symbols
--      (67 → 68: project_type first; md5 of the text dfecf762b4e202809a971bb97419e45a → 0491f77109ae615e0cfd34028bbc4348) and the
--      description (path note, DE + [EN]). output_symbol, unit, clause, verification_status unchanged.
--   2. fields M8203-01 project_type: consumer_worksheets + 'M8203-24' (only while it is exactly block 19's 17-sheet list,
--      md5 of the text 2f3cd1303a9a27b1a1b864f531ce3e8c).
--   3. fields M8203-24 projektstopp_code: description (DE + [EN]) — only together with item 1.
-- NOT changed: M8203-22-D3 / M8203-23-D3 (the path codes), the 4 annex sums, every gate (REQ-31 condition unchanged), every visibility
--   rule. Stored codes refresh on the next save / recompute of M8203-24 (41_ step 3).
-- STAGED — not applied. Apply (from C:\Users\Ekowai\_wt-g2t, which holds .env.local), AFTER the hint block 20261006220000:
--   node scripts/apply-migration.mjs C:\Users\Ekowai\_wt-m820\scripts\migrations\20261006230000_m820_3_projektstopp_paths.sql
-- Rollback:  C:\Users\Ekowai\_wt-m820\scripts\rollback-20261006230000-m820-3-projektstopp-paths.sql (BEFORE any rollback of block 19)
-- Read-back: C:\Users\Ekowai\_wt-m820\scripts\verification\apply\readback-20261006230000-m820-3-projektstopp-paths.sql
BEGIN;

-- 0. in-transaction archives (pre-state only; a re-run archives nothing)
CREATE TABLE IF NOT EXISTS equations_archive_m820_3_projektstopp_paths AS SELECT * FROM equations WHERE false;
CREATE TABLE IF NOT EXISTS fields_archive_m820_3_projektstopp_paths AS SELECT * FROM fields WHERE false;

INSERT INTO equations_archive_m820_3_projektstopp_paths
SELECT e.* FROM equations e
  JOIN worksheet_templates w ON w.id = e.worksheet_template_id
  JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-3' AND w.code = 'M8203-24' AND e.equation_number = 'M8203-24-D1'
   AND md5(e.formula) = '2d497935cfa3c2e9ac44081a90cec57a' AND md5(e.input_symbols::text) = 'dfecf762b4e202809a971bb97419e45a'
   AND NOT EXISTS (SELECT 1 FROM equations_archive_m820_3_projektstopp_paths a WHERE a.id = e.id);

INSERT INTO fields_archive_m820_3_projektstopp_paths
SELECT f.* FROM fields f
  JOIN worksheet_templates w ON w.id = f.worksheet_template_id
  JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-3' AND w.code = 'M8203-01' AND f.symbol = 'project_type'
   AND md5(f.consumer_worksheets::text) = '2f3cd1303a9a27b1a1b864f531ce3e8c'
   AND NOT EXISTS (SELECT 1 FROM fields_archive_m820_3_projektstopp_paths a WHERE a.id = f.id);

INSERT INTO fields_archive_m820_3_projektstopp_paths
SELECT f.* FROM fields f
  JOIN worksheet_templates w ON w.id = f.worksheet_template_id
  JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-3' AND w.code = 'M8203-24' AND f.symbol = 'projektstopp_code'
   AND EXISTS (SELECT 1 FROM equations e WHERE e.worksheet_template_id = w.id AND e.equation_number = 'M8203-24-D1'
                AND md5(e.formula) = '2d497935cfa3c2e9ac44081a90cec57a')
   AND NOT EXISTS (SELECT 1 FROM fields_archive_m820_3_projektstopp_paths a WHERE a.id = f.id);

-- 3. projektstopp_code hint (before item 1 — it is keyed to the live formula still being the old one) [S3]
--    Items 3 and 1 run only while project_type can reach M8203-24 (block 19's 17-sheet list, or already extended) — never a formula
--    that reads a symbol the sheet cannot see.
UPDATE fields f
   SET description = 'Berechnet: 1, wenn eines der Phasenziele des gewählten Projektwegs (project_type, Blatt M8203-01) „Nicht erreicht“ oder „Teilweise erreicht“ hat, sonst 0. Gesamtsystem: die 13 Phasenziele § 5.2–5.4; Einzelprojekt: die 54 Phasenziele § 6.2–6.7; Beides: alle 67. Der Wert entsteht, sobald der Projektweg gewählt ist und jedes Phasenziel dieses Wegs einen Status hat (nicht zutreffende Ziele: „Nicht zutreffend“); die ausgeblendeten Blätter des anderen Wegs zählen nicht. „Phase noch nicht erreicht“ löst nichts aus. § 3 (gedruckt S. 10): „Werden Phasenziele nicht oder nur unvollständig erreicht, ist die Prüfung eines Projektstopps erforderlich.“
[EN] Computed: 1 if any phase goal of the chosen project path (project_type, sheet M8203-01) is "not met" or "partially met", otherwise 0. Gesamtsystem: the 13 phase goals of § 5.2–5.4; Einzelprojekt: the 54 phase goals of § 6.2–6.7; both: all 67. The value appears once the path is chosen and every phase goal of that path has a status (goals that do not apply: "not applicable"); the hidden sheets of the other path do not count. "Phase not reached yet" triggers nothing. § 3 (printed p. 10): "If phase goals are not or only incompletely achieved, a review of a project stop is required."'
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND s.code = 'DWA-M-820-3' AND w.code = 'M8203-24' AND f.symbol = 'projektstopp_code'
   AND EXISTS (SELECT 1 FROM equations e WHERE e.worksheet_template_id = w.id AND e.equation_number = 'M8203-24-D1'
                AND md5(e.formula) = '2d497935cfa3c2e9ac44081a90cec57a' AND md5(e.input_symbols::text) = 'dfecf762b4e202809a971bb97419e45a')
   AND EXISTS (SELECT 1 FROM fields pt JOIN worksheet_templates pw ON pw.id = pt.worksheet_template_id
                WHERE pw.standard_id = s.id AND pw.code = 'M8203-01' AND pt.symbol = 'project_type'
                  AND (md5(pt.consumer_worksheets::text) = '2f3cd1303a9a27b1a1b864f531ce3e8c' OR 'M8203-24' = ANY (pt.consumer_worksheets)));

-- 1. M8203-24-D1 path-aware [S3][S21][S4] (md5 guard on the live formula + input list)
UPDATE equations e
   SET formula = 'projektstopp_code = if(project_type == ''gesamtsystem'', if(pz_52_1_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_52_2_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_52_3_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_52_4_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_52_5_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_53_1_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_53_2_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_53_3_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_53_4_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_53_5_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_54_1_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_54_2_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_54_3_status IN {''nicht_erreicht'', ''teilweise_erreicht''}, 1, 0), if(project_type == ''einzelprojekt'', if(pz_62_1_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_62_2_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_62_3_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_62_4_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_62_5_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_63_1_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_63_2_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_63_3_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_63_4_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_63_5_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_63_6_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_63_7_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_63_8_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_64_1_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_64_2_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_64_3_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_64_4_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_64_5_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_64_6_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_64_7_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_64_8_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_64_9_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_64_10_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_64_11_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_64_12_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_65_1_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_65_2_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_65_3_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_65_4_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_65_5_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_65_6_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_65_7_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_65_8_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_65_9_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_65_10_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_65_11_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_65_12_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_66_1_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_66_2_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_66_3_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_66_4_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_66_5_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_66_6_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_66_7_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_66_8_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_66_9_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_66_10_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_66_11_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_67_1_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_67_2_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_67_3_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_67_4_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_67_5_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_67_6_status IN {''nicht_erreicht'', ''teilweise_erreicht''}, 1, 0), if(pz_52_1_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_52_2_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_52_3_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_52_4_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_52_5_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_53_1_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_53_2_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_53_3_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_53_4_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_53_5_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_54_1_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_54_2_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_54_3_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_62_1_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_62_2_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_62_3_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_62_4_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_62_5_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_63_1_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_63_2_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_63_3_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_63_4_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_63_5_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_63_6_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_63_7_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_63_8_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_64_1_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_64_2_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_64_3_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_64_4_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_64_5_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_64_6_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_64_7_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_64_8_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_64_9_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_64_10_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_64_11_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_64_12_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_65_1_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_65_2_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_65_3_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_65_4_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_65_5_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_65_6_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_65_7_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_65_8_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_65_9_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_65_10_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_65_11_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_65_12_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_66_1_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_66_2_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_66_3_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_66_4_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_66_5_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_66_6_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_66_7_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_66_8_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_66_9_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_66_10_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_66_11_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_67_1_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_67_2_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_67_3_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_67_4_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_67_5_status IN {''nicht_erreicht'', ''teilweise_erreicht''} OR pz_67_6_status IN {''nicht_erreicht'', ''teilweise_erreicht''}, 1, 0)))',
       input_symbols = ARRAY['project_type', 'pz_52_1_status', 'pz_52_2_status', 'pz_52_3_status', 'pz_52_4_status', 'pz_52_5_status', 'pz_53_1_status', 'pz_53_2_status', 'pz_53_3_status', 'pz_53_4_status', 'pz_53_5_status', 'pz_54_1_status', 'pz_54_2_status', 'pz_54_3_status', 'pz_62_1_status', 'pz_62_2_status', 'pz_62_3_status', 'pz_62_4_status', 'pz_62_5_status', 'pz_63_1_status', 'pz_63_2_status', 'pz_63_3_status', 'pz_63_4_status', 'pz_63_5_status', 'pz_63_6_status', 'pz_63_7_status', 'pz_63_8_status', 'pz_64_1_status', 'pz_64_2_status', 'pz_64_3_status', 'pz_64_4_status', 'pz_64_5_status', 'pz_64_6_status', 'pz_64_7_status', 'pz_64_8_status', 'pz_64_9_status', 'pz_64_10_status', 'pz_64_11_status', 'pz_64_12_status', 'pz_65_1_status', 'pz_65_2_status', 'pz_65_3_status', 'pz_65_4_status', 'pz_65_5_status', 'pz_65_6_status', 'pz_65_7_status', 'pz_65_8_status', 'pz_65_9_status', 'pz_65_10_status', 'pz_65_11_status', 'pz_65_12_status', 'pz_66_1_status', 'pz_66_2_status', 'pz_66_3_status', 'pz_66_4_status', 'pz_66_5_status', 'pz_66_6_status', 'pz_66_7_status', 'pz_66_8_status', 'pz_66_9_status', 'pz_66_10_status', 'pz_66_11_status', 'pz_67_1_status', 'pz_67_2_status', 'pz_67_3_status', 'pz_67_4_status', 'pz_67_5_status', 'pz_67_6_status']::text[],
       description = '1, wenn eines der Phasenziele des gewählten Projektwegs „Nicht erreicht“ oder „Teilweise erreicht“ hat, sonst 0. Der Weg kommt aus project_type (Blatt M8203-01): Gesamtsystem → die 13 Phasenziele § 5.2–5.4 (wie projektstopp_code_a, M8203-22-D3); Einzelprojekt → die 54 Phasenziele § 6.2–6.7 (wie projektstopp_code_b, M8203-23-D3); Beides → alle 67. Die Blätter des anderen Wegs sind ausgeblendet; ihre Phasenziele werden nicht gelesen. § 3 (gedruckt S. 10): „Werden Phasenziele nicht oder nur unvollständig erreicht, ist die Prüfung eines Projektstopps erforderlich.“
[EN] 1 if any phase goal of the chosen project path is "not met" or "partially met", otherwise 0. The path comes from project_type (sheet M8203-01): Gesamtsystem → the 13 phase goals of § 5.2–5.4 (as projektstopp_code_a, M8203-22-D3); Einzelprojekt → the 54 phase goals of § 6.2–6.7 (as projektstopp_code_b, M8203-23-D3); both → all 67. The other path''s sheets are hidden; their phase goals are not read. § 3 (printed p. 10): "If phase goals are not or only incompletely achieved, a review of a project stop is required."'
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE e.worksheet_template_id = w.id AND s.code = 'DWA-M-820-3' AND w.code = 'M8203-24' AND e.equation_number = 'M8203-24-D1'
   AND md5(e.formula) = '2d497935cfa3c2e9ac44081a90cec57a' AND md5(e.input_symbols::text) = 'dfecf762b4e202809a971bb97419e45a'
   AND EXISTS (SELECT 1 FROM fields pt JOIN worksheet_templates pw ON pw.id = pt.worksheet_template_id
                WHERE pw.standard_id = s.id AND pw.code = 'M8203-01' AND pt.symbol = 'project_type'
                  AND (md5(pt.consumer_worksheets::text) = '2f3cd1303a9a27b1a1b864f531ce3e8c' OR 'M8203-24' = ANY (pt.consumer_worksheets)));

-- 2. project_type reaches M8203-24 (only while it is block 19's exact 17-sheet list)
UPDATE fields f
   SET consumer_worksheets = f.consumer_worksheets || ARRAY['M8203-24']::text[]
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND s.code = 'DWA-M-820-3' AND w.code = 'M8203-01' AND f.symbol = 'project_type'
   AND md5(f.consumer_worksheets::text) = '2f3cd1303a9a27b1a1b864f531ce3e8c';

COMMIT;
