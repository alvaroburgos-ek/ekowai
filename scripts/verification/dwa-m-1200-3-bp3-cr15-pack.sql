-- ============================================================================
-- DWA-M 1200-3 (draft 07/2025) · Ratification BP-3 · CR-15 Frostschutzberegnung
-- Source: "Das Bewässerungswasser muss mindestens der Güteklasse D entsprechen."
--         (DWA-M 1200-3 Gelbdruck, printed p. 44 l. 38; training p. 45 l. 5)
-- Defect: prod encoded "mindestens D" as `gueteklasse == 'D'` → frost-protection
--         irrigation with class A–C-2 water FAILED the gate (evaluator-proven
--         2026-10-14), and `anwendungsbereich` was not inherited by M12003-08, so
--         the "not frost protection" branch could never resolve on that sheet.
-- Fix 1: class set = every M12003-01 `gueteklasse` enum value (A, B-1, B-2, C-1,
--         C-2, D — D is the minimum, so all six satisfy "mindestens D").
-- Fix 2: M12003-08 added to M12003-01 `anwendungsbereich`.consumer_worksheets
--         (only CR-15 reads it on M12003-08 — checked read-only 2026-10-14).
-- Guards: each UPDATE matches only the exact pre-fix state → re-running is a no-op.
-- Rollback: rollback-dwa-m-1200-3-bp3-cr15-pack.sql
-- ============================================================================

UPDATE compliance_requirements cr SET
  condition = 'anwendungsbereich != ''frostschutzberegnung'' OR (gueteklasse IN {''A'',''B-1'',''B-2'',''C-1'',''C-2'',''D''} AND schulung_durchgefuehrt == True)',
  audit_notes = coalesce(cr.audit_notes || E'\n', '') || '2026-10-14 BP-3: "mindestens der Güteklasse D" (p. 44 l. 38) = classes A–D, was == ''D'' (study-book cross-check, Ratification BP-3).'
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE cr.worksheet_template_id = wt.id AND s.code = 'DWA-M-1200-3'
  AND wt.code = 'M12003-08' AND cr.code = 'CR-15'
  AND cr.condition = 'anwendungsbereich != ''frostschutzberegnung'' OR (gueteklasse == ''D'' AND schulung_durchgefuehrt == True)';

UPDATE fields f SET
  consumer_worksheets = array_append(f.consumer_worksheets, 'M12003-08')
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE f.worksheet_template_id = wt.id AND s.code = 'DWA-M-1200-3'
  AND wt.code = 'M12003-01' AND f.symbol = 'anwendungsbereich'
  AND NOT ('M12003-08' = ANY (f.consumer_worksheets));
