-- DWA-M-760 · ns >= NS separator-sizing sufficiency gate
-- ============================================================================
-- STATUS: APPLIED 2026-08-05 AS WARN (owner ratified, DOWNGRADED from block — §7.2.6.3 source is descriptive "richtet sich nach", no binding "muss"; sizing delegated to DIN EN 1825-2; mechanics F-4-safe, m760-verify green; effect re-queried) — severity line above set to 'warn'
-- (new gate / block-vs-warn severity = reserved judgment, stop-list).
--
-- DEFECT (execution-proven, harness m760-verify 14/14): the ns>=NS sizing-sufficiency
-- check exists ONLY as a non-enforcing equation (NS_eff on M760-09/15); the live block
-- gate REQ-M760-09 is presence-only (ns IS NOT NULL). Harness proof: ns=4 < NS=7 persisted
-- → REQ-M760-09 does NOT block; the drafted subtraction-form gate DOES block (pending when NS null).
--
-- SOURCE basis (§7.2.6.3, p41, verbatim): "Die minimale Nenngröße richtet sich … nach dem
-- maximal zu erwartenden Abwasservolumenstrom" (per DIN EN 1825-2:2002 §6.1). The NS value
-- itself is DIN EN 1825-2 content (referenced-only, in_library:false) — the gate enforces
-- ns >= NS without expanding the external NS formula.
--
-- Subtraction form (field-vs-field → acompare; missing NS → pending, never false-fail).
--   Apply (on owner ratify): Mgmt-API POST · Rollback: scripts/rollback-20260801430000-m760-ns-gate.sql
DO $$
DECLARE v_ws uuid;
BEGIN
  SELECT wt.id INTO v_ws FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id
   WHERE s.code='DWA-M-760' AND wt.code='M760-15';
  IF v_ws IS NULL THEN RAISE EXCEPTION 'M760-15 not found'; END IF;

  INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity, clause_reference, source_quote)
  SELECT v_ws, 'CR-M760-NS', 'Abscheidernenngröße ausreichend (ns >= NS)',
         'ns_fettabscheider - NS >= 0', 'warn', '§7.2.6.3 (DIN EN 1825-2:2002 §6.1)',
         'Die minimale Nenngröße richtet sich … nach dem maximal zu erwartenden Abwasservolumenstrom.'
   WHERE NOT EXISTS (SELECT 1 FROM compliance_requirements WHERE worksheet_template_id=v_ws AND code='CR-M760-NS');

  RAISE NOTICE 'M760-15 ns>=NS sizing gate added';
END $$;
