-- ─────────────────────────────────────────────────────────────────────────────
-- DWA-M 820-1 · M820-07 · Risiko-Maßnahmenplan standardization (Anhang A · Tab. A.2)
-- ─────────────────────────────────────────────────────────────────────────────
-- `risk_mitigation_plan` (json) is now rendered by a structured editor
-- (MitigationPlanEditor) mirroring Tab. A.2: per risk a plan card (Risiko,
-- Risikokategorie, Wert, Schäden, Gefährdungsbilder, Bemerkung) with a list of
-- Maßnahmen, each classified Technische=T / Organisatorische=O / Personelle=P
-- (verbatim Tab. A.2 legend) and a Verantwortung / Durchführen / Überwachung
-- assignment (§ Kompetenzregelung, S. 43). The measure count is DERIVED in the
-- editor footer — no longer a hand-entered number.
--
-- `mitigation_actions_count` (hand-typed) is deprecated (nothing consumes it;
-- verified: only REQ-05 references risk_mitigation_plan itself). `risk_mitigation_plan`
-- stays active (REQ-05 IS-NOT-NULL). `mitigation_plan_approved` (boolean) and
-- `mitigation_plan_date` (date) are unchanged.
--
-- Apply:    node scripts/apply-migration.mjs scripts/migrations/20260801230000_m820_mitigation_plan_structured.sql
-- Rollback: node scripts/apply-migration.mjs scripts/rollback-20260801230000-m820-mitigation-plan.sql
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_ws uuid;
BEGIN
  SELECT wt.id INTO v_ws
  FROM worksheet_templates wt
  JOIN standards s ON s.id = wt.standard_id
  WHERE s.code = 'DWA-M-820-1' AND wt.code = 'M820-07';

  IF v_ws IS NULL THEN
    RAISE EXCEPTION 'M820-07 worksheet_template not found';
  END IF;

  UPDATE fields
     SET description = 'Strukturierter Risiko-Maßnahmenplan je Risiko (Anhang A, Tab. A.2): '
                    || 'Risiko, Risikokategorie (eine der 11 Tab.-A.1-Gruppen), Wert, Schäden, '
                    || 'Gefährdungsbilder, Bemerkung/Bearbeitungsstand; Liste von Maßnahmen je '
                    || 'Typ Technische (T) / Organisatorische (O) / Personelle (P) mit Verantwortung, '
                    || 'Durchführung und Überwachung. Maßnahmen-Anzahl (nach Typ) wird aus dem Plan '
                    || 'abgeleitet (nicht mehr händisch erfasst).'
   WHERE worksheet_template_id = v_ws
     AND symbol = 'risk_mitigation_plan'
     AND description IS DISTINCT FROM 'Strukturierter Risiko-Maßnahmenplan je Risiko (Anhang A, Tab. A.2): '
                    || 'Risiko, Risikokategorie (eine der 11 Tab.-A.1-Gruppen), Wert, Schäden, '
                    || 'Gefährdungsbilder, Bemerkung/Bearbeitungsstand; Liste von Maßnahmen je '
                    || 'Typ Technische (T) / Organisatorische (O) / Personelle (P) mit Verantwortung, '
                    || 'Durchführung und Überwachung. Maßnahmen-Anzahl (nach Typ) wird aus dem Plan '
                    || 'abgeleitet (nicht mehr händisch erfasst).';

  UPDATE fields
     SET active = false,
         description = COALESCE(description, '')
                    || ' [deaktiviert 2026-08-01: Anzahl Maßnahmen wird aus dem Maßnahmenplan abgeleitet, nicht händisch erfasst.]'
   WHERE worksheet_template_id = v_ws
     AND symbol = 'mitigation_actions_count'
     AND active = true;

  RAISE NOTICE 'M820-07 mitigation plan standardized: description enriched, mitigation_actions_count deactivated';
END $$;
