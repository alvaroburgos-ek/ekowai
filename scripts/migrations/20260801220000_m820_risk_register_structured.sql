-- ─────────────────────────────────────────────────────────────────────────────
-- DWA-M 820-1 · M820-06 · Risikoanalyse standardization (Anhang A · Tab. A.1/A.2)
-- ─────────────────────────────────────────────────────────────────────────────
-- The `risk_register` (json) field is now rendered by a structured, repeatable
-- editor (RiskRegisterEditor) that mirrors Tab. A.1: per-row Risikogruppe (one
-- of the 11 printed groups), Eintretenswahrscheinlichkeit (0–10), Schaden (0–10),
-- computed Risiko = P × S, and Präventions-/Korrekturmaßnahmen (Tab. A.2). The
-- register's aggregate figures (count of identified risks, max/mean score) are
-- DERIVED in the editor summary — they are no longer hand-entered numbers.
--
-- Consequently the two standalone hand-entry count fields are deprecated:
--   * risk_count_identified   (was: number, hand-typed)
--   * risk_high_priority_count (was: number, hand-typed)
-- Nothing consumes them (verified: only REQ-05 references risk_register itself),
-- so deactivating them removes double-entry without breaking any gate/equation.
--
-- NEVER-INVENT NOTE (SR-2): `risk_high_priority_count` had NO printed definition.
-- Tab. A.1 prints only three EXAMPLE score points (0 = Kein Risiko, 25 = Mittleres
-- Risiko, 100 = Sehr großes Risiko) — these are example values, NOT band
-- boundaries. There is no printed "high-priority" threshold, so a derived
-- high-priority count cannot be authored here. If the owner wants a persisted
-- high-priority count, the score cutoff is a project ruling → sign-off sheet.
--
-- Author-only migration. Apply:
--   node scripts/apply-migration.mjs scripts/migrations/20260801220000_m820_risk_register_structured.sql
-- Rollback:
--   node scripts/apply-migration.mjs scripts/rollback-20260801220000-m820-risk-register.sql
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_ws uuid;
BEGIN
  SELECT wt.id INTO v_ws
  FROM worksheet_templates wt
  JOIN standards s ON s.id = wt.standard_id
  WHERE s.code = 'DWA-M-820-1' AND wt.code = 'M820-06';

  IF v_ws IS NULL THEN
    RAISE EXCEPTION 'M820-06 worksheet_template not found';
  END IF;

  -- 1. Enrich the risk_register field description with the structured schema so
  --    reports/exports document what each entry carries (verbatim Tab. A.1/A.2 + S. 43).
  UPDATE fields
     SET description = 'Strukturiertes, mehrparteiliges Risikoregister je Zeile ein Risiko (Anhang A, S. 43 + Tab. A.1/A.2): '
                    || 'Risikogruppe (eine von 11 gedruckten Gruppen), Beschreibung, '
                    || 'Bewertung durch Bauherr/Planer/Betrieb je Eintretenswahrscheinlichkeit 0–10 und Schaden 0–10 (Anker 0/5/10); '
                    || 'daraus abgeleitet je Dimension M-Wert (Mittelwert) und S-Abweichung (Stichproben-Standardabw., n−1), '
                    || 'Risiko = Eintretenswahrscheinlichkeit × Schaden je Beteiligtem, M-Wert/S-Abw über die Produkte; '
                    || 'Maßnahmen (Tab. A.2) inkl. Konsequenzen und Kompetenzregelung. '
                    || 'Anzahl/Max/Mittel/Divergenz werden aus dem Register abgeleitet (nicht mehr händisch erfasst).'
   WHERE worksheet_template_id = v_ws
     AND symbol = 'risk_register'
     AND description IS DISTINCT FROM 'Strukturiertes, mehrparteiliges Risikoregister je Zeile ein Risiko (Anhang A, S. 43 + Tab. A.1/A.2): '
                    || 'Risikogruppe (eine von 11 gedruckten Gruppen), Beschreibung, '
                    || 'Bewertung durch Bauherr/Planer/Betrieb je Eintretenswahrscheinlichkeit 0–10 und Schaden 0–10 (Anker 0/5/10); '
                    || 'daraus abgeleitet je Dimension M-Wert (Mittelwert) und S-Abweichung (Stichproben-Standardabw., n−1), '
                    || 'Risiko = Eintretenswahrscheinlichkeit × Schaden je Beteiligtem, M-Wert/S-Abw über die Produkte; '
                    || 'Maßnahmen (Tab. A.2) inkl. Konsequenzen und Kompetenzregelung. '
                    || 'Anzahl/Max/Mittel/Divergenz werden aus dem Register abgeleitet (nicht mehr händisch erfasst).';

  -- 2. Deprecate the two hand-entered count fields (derived now).
  UPDATE fields
     SET active = false,
         description = COALESCE(description, '')
                    || ' [deaktiviert 2026-08-01: Anzahl wird aus dem Risikoregister abgeleitet, nicht händisch erfasst.]'
   WHERE worksheet_template_id = v_ws
     AND symbol = 'risk_count_identified'
     AND active = true;

  UPDATE fields
     SET active = false,
         description = COALESCE(description, '')
                    || ' [deaktiviert 2026-08-01: kein gedruckter Schwellenwert für "hochpriorisiert" in Tab. A.1 (SR-2); '
                    || 'falls persistiert gewünscht, Score-Grenze durch Owner ratifizieren.]'
   WHERE worksheet_template_id = v_ws
     AND symbol = 'risk_high_priority_count'
     AND active = true;

  RAISE NOTICE 'M820-06 risk register standardized: register description enriched, 2 hand-count fields deactivated';
END $$;
