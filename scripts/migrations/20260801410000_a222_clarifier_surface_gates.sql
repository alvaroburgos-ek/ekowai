-- DWA-A-222 · §4.4.2 Gl.(22) + §4.4.3 Gl.(27) — clarifier-surface MINIMUM gates
-- ============================================================================
-- STATUS: APPLIED 2026-08-05 (owner ratified; both BLOCK; source-verified §4.4.2/§4.4.3 required minimums; a222-verify 64/64 re-run; effect re-queried) — ADDS TWO NEW BLOCK GATES
-- required (new gate / block-vs-warn severity = reserved judgment per the stop-list).
--
-- DEFECT (execution-proven, harness a222-verify 64/64): the Weißdruck prints the
-- clarifier surface as a REQUIRED MINIMUM, but the encoding stored the inequality in
-- an equation.formula field (which throws — `>=` is not in arithmetic.ts SUPPORTED)
-- and NO compliance_requirement enforces it. Proof: A_NB=0.1 m² vs required ~3.6 m²
-- (Q_bem=5, RV=1) produced ZERO failing gates. The minimum is invisible to enforcement.
--
-- SOURCE (verbatim, DWA-A_222.md):
--   §4.4.2 Gl.(22): "A_NB,theo >= (Q_bem × (1+RV)) / 2,2  (m²)"  — rechnerisch erforderliche Oberfläche
--   §4.4.3 Gl.(27): "A_NB      >= (Q_bem × (1+RV)) / 2,8  (m²)"  — Oberfläche des Nachklärbeckens
--
-- FIX (subtraction form so field-vs-arith routes through acompare — proven both-ways in-harness):
--   A222-14  A_NB_theo - Q_bem*(1+RV)/2.2 >= 0
--   A222-14  A_NB      - Q_bem*(1+RV)/2.8 >= 0
-- Companion cleanup (separate, owner ruling): remove the `>=` from the two equation.formula
-- rows (Gl.22/Gl.27) — either drop them as equations or re-encode RHS as a required-minimum
-- equation the gate reads. NOT in this migration (design reframe = ruling).
--
--   Apply (on owner ratify): node scripts/apply-migration.mjs (or Mgmt-API) with this file.
--   Rollback: scripts/rollback-20260801410000-a222-clarifier-gates.sql
DO $$
DECLARE v_ws uuid;
BEGIN
  SELECT wt.id INTO v_ws FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id
   WHERE s.code='DWA-A-222' AND wt.code='A222-14';
  IF v_ws IS NULL THEN RAISE EXCEPTION 'A222-14 not found'; END IF;

  INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity, clause_reference, source_quote)
  SELECT v_ws, 'CR-A222-22', 'Trichterbecken-Oberfläche ausreichend (Gl.22)',
         'A_NB_theo - Q_bem * (1 + RV) / 2.2 >= 0', 'block', '§4.4.2, Gl. (22)',
         'A_NB,theo >= (Q_bem × (1+RV)) / 2,2 (m²)'
   WHERE NOT EXISTS (SELECT 1 FROM compliance_requirements WHERE worksheet_template_id=v_ws AND code='CR-A222-22');

  INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity, clause_reference, source_quote)
  SELECT v_ws, 'CR-A222-27', 'Horizontal-Nachklärbecken-Oberfläche ausreichend (Gl.27)',
         'A_NB - Q_bem * (1 + RV) / 2.8 >= 0', 'block', '§4.4.3, Gl. (27)',
         'A_NB >= (Q_bem × (1+RV)) / 2,8 (m²)'
   WHERE NOT EXISTS (SELECT 1 FROM compliance_requirements WHERE worksheet_template_id=v_ws AND code='CR-A222-27');

  RAISE NOTICE 'A222-14 clarifier-surface minimum gates added (Gl.22/27)';
END $$;
