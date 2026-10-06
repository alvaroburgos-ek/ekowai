-- 20261006180000_m820_1_req05_home.sql · DWA-M 820-1 REQ-05 "Risikoanalyse erstellt" moves from M820-04 to M820-07
-- Owner decision 2026-10-06 ("option 1"). Apply order: vault 01-Projects/ekowai-wizard/m820-wizard-test/32_APPLY-ORDER-m820-1-req05-home.md.
-- Pattern = the REQ-20 / REQ-21 re-home of scripts/migrations/20261006160000_m820_followup_1.sql (item 1).
--
-- WHAT THE PROJECT TEAM SEES (plain English):
--   The check "risk analysis produced" (REQ-05: risk_register IS NOT NULL AND risk_mitigation_plan IS NOT NULL, warn) sat on
--   M820-04 "Bedarfsplanung Konzept". Neither value reaches M820-04: risk_register (M820-06 "Risikoanalyse") is passed on to
--   M820-07 and M820-25 only, and risk_mitigation_plan is a field ON M820-07 "Risiko-Maßnahmenplan" (passed on to M820-25). So on
--   M820-04 the panel showed "FEHLEND: RISK_REGISTER, RISK_MITIGATION_PLAN" for good, even with both saved (live prod, TEST project
--   edeb73dd…). On M820-07 the check reads both: saved analysis + saved plan → met; plan missing → waiting (warning).
--   Code, title, severity (warn — a warn gate never refuses an approval), condition and clause ("§4.7, Anh. A") are unchanged.
--
-- SOURCE CHECK (re-read 2026-10-06 on the RENDERED PDF: scoop pdftotext -layout of
--   C:\Users\Ekowai\Desktop\Guidelines\DWA-M-820-1\DWA-M_820-1.pdf, whitespace-normalised match per PDF page; L### = .md line):
--   [S1] § 4.7 Umgang mit Risiken, L591, PDF p. 24 (printed 22): "Risiken sollten im Rahmen der Planung systematisch erfasst werden
--        und sind hinsichtlich ihrer Auswirkungen auf das Konzept oder die Projekte zu bewerten. Die Ergebnisse der Risikobewertung
--        und der daraus resultierenden Maßnahmen sind in die Planungen einzubeziehen."
--        EN "Risks should be recorded systematically during planning and are to be assessed for their effect on the concept or the
--        projects. The results of the risk assessment and of the resulting measures are to be included in the planning."
--   [S2] § 4.7, L593, PDF p. 24: "Die Risikoanalyse ist über alle Projektphasen fortzuschreiben."
--        EN "The risk analysis is to be updated (carried forward) over all project phases."
--   [S3] Anhang A, L1078, PDF p. 45 (printed 43): "Je nach Größe, Struktur und Komplexität eines Projekts, sowohl in technischer,
--        baulicher, wirtschaftlicher oder auch in organisatorischer Hinsicht, ist bereits im Rahmen der Bedarfsplanung die
--        Durchführung einer Risikoanalyse hilfreich."
--        EN "Depending on the size, structure and complexity of a project (technical, constructional, economic or organisational),
--        carrying out a risk analysis is helpful already within the needs planning."
--   [S4] Anhang A, L1084, PDF p. 45: "Die Risikoanalyse muss in der Praxis um eine Spalte „Präventions- und Korrekturmaßnahmen“
--        ergänzt werden, in der die projektspezifischen Maßnahmenpläne festgehalten werden (siehe Tabelle A.2)."
--        EN "In practice the risk analysis must be supplemented by a column 'prevention and corrective measures' in which the
--        project-specific measure plans are recorded (see Table A.2)."
--   Verdict: the print does NOT make the risk analysis part of the "Bedarfsplanung Konzept" (§ 6.2 / § 6 never mention risk).
--   § 4.7 is a principle over the whole planning and all project phases [S1][S2]; Anhang A calls an analysis already in the needs
--   planning "hilfreich" (helpful), conditional on size / structure / complexity [S3] — a recommendation, not a home. The gate checks
--   the analysis AND the measure plan (Tab. A.2 [S4]) together; the tool's sheet for that plan is M820-07, which also receives
--   risk_register. The home is a tool structure choice → owner decision 2026-10-06 (option 1).
--
-- WHAT THIS BLOCK DOES (idempotent; md5-guarded; in-transaction archive of the pre-state row):
--   REQ-05 on M820-04 (condition md5 6dd012ea1d023fd20fc913b50b417c6c) → worksheet_template_id = M820-07; description + one "moved"
--   note. Code, title, severity, condition, clause unchanged. FIELDS / EQUATIONS / SECTIONS / consumer_worksheets: none changed.
-- STAGED — not applied. Apply (from C:\Users\Ekowai\_wt-g2t, which holds .env.local):
--   node scripts/apply-migration.mjs C:\Users\Ekowai\_wt-m820\scripts\migrations\20261006180000_m820_1_req05_home.sql
-- Rollback:  C:\Users\Ekowai\_wt-m820\scripts\rollback-20261006180000-m820-1-req05-home.sql
-- Read-back: C:\Users\Ekowai\_wt-m820\scripts\verification\apply\readback-20261006180000-m820-1-req05-home.sql
BEGIN;

-- 0. in-transaction archive of the gate row (pre-state only; a re-run archives nothing)
CREATE TABLE IF NOT EXISTS compliance_requirements_archive_m820_1_req05_home AS SELECT * FROM compliance_requirements WHERE false;

INSERT INTO compliance_requirements_archive_m820_1_req05_home
SELECT cr.* FROM compliance_requirements cr
  JOIN worksheet_templates w ON w.id = cr.worksheet_template_id
  JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-1' AND w.code = 'M820-04'
   AND cr.code = 'REQ-05' AND md5(cr.condition) = '6dd012ea1d023fd20fc913b50b417c6c'
   AND NOT EXISTS (SELECT 1 FROM compliance_requirements_archive_m820_1_req05_home a WHERE a.id = cr.id);

-- 1. REQ-05 M820-04 → M820-07 [S1]–[S4] (SET order: description, then the sheet; md5 guard on the live condition)
UPDATE compliance_requirements cr
   SET description = COALESCE(cr.description, '') || E'\n' || '[REQ-05 home, 2026-10-06] Blatt / sheet M820-07 „Risiko-Maßnahmenplan“ (vorher / was M820-04 „Bedarfsplanung Konzept“). Die Prüfung liest risk_register (M820-06, weitergereicht an M820-07 / -25) und risk_mitigation_plan (Feld auf M820-07); auf M820-04 kam keiner der beiden Werte an — die Prüfung wartete dauerhaft. § 4.7 (PDF S. 24): „Die Risikoanalyse ist über alle Projektphasen fortzuschreiben.“ Anhang A (PDF S. 45): Maßnahmenpläne nach Tabelle A.2. [EN] The check reads risk_register (M820-06, passed on to M820-07 / -25) and risk_mitigation_plan (a field on M820-07); neither reached M820-04, so the check waited for good. § 4.7: "The risk analysis is to be updated over all project phases."',
       worksheet_template_id = wt.id
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id, worksheet_templates wt
 WHERE cr.code = 'REQ-05' AND w.id = cr.worksheet_template_id AND w.code = 'M820-04' AND s.code = 'DWA-M-820-1'
   AND wt.standard_id = s.id AND wt.code = 'M820-07'
   AND md5(cr.condition) = '6dd012ea1d023fd20fc913b50b417c6c';

COMMIT;
