-- supabase/migrations/20260713120000_a138_18_22_d_to_di.sql
-- DWA-A-138-1 · A138-18 Gl.(22) s_R (thin-wall Rigole Speicherkoeffizient) — correct the stored
-- FORMULA + INPUT_SYMBOLS: bare `d` → `d_i`. The E1-A encode-time faithfulness gate flagged this
-- equation: `d` resolves to NO active field (the Versickerrohr diameters are d_a / d_i).
--
-- SOURCE-VERIFIED (DWA-A-138-1 §6.4.2, WD p.58, line 1836): the thin-wall Gl.(22) preamble defines
-- the diameter verbatim as "(d = d_i ≈ d_a)" — "Werden dünnwandige Kunststoffrohre eingesetzt, kann …
-- auf die Berücksichtigung der Wandstärke verzichtet werden (d = d_i ≈ d_a)". Gl.(21) uses d_i AND d_a
-- in separate terms; the thin-wall Gl.(22) collapses to the inner diameter d_i. No new fields; no
-- project_parameters touched.
--
--   A138-18 Gl.22 s_R : `... (pi * d^2/4) ...` / {s_F,b_R,h_R,az,d}
--                     → `... (pi * d_i^2/4) ...` / {s_F,b_R,h_R,az,d_i}
--
-- FULL CIRCLE: the machine faithfulness gate CAUGHT this (unresolved `d`) → source verified (d=d_i) →
-- this migration FIXES it → the gate then RE-VERIFIES the corrected formula (A138-18:22 leaves the gate
-- deny-set). This is the first defect the machine gate ever found.
--
-- Idempotent (guarded on the exact old formula). Rollback:
--   scripts/rollback-20260713120000-a138-18-22-d-to-di.sql
-- Apply (prod = Supabase project vadsmshzebefjreqcicl), via the Management API endpoint the MCP uses:
--   POST https://api.supabase.com/v1/projects/vadsmshzebefjreqcicl/database/query   (body = this file)
DO $$
DECLARE
  eqid uuid;
BEGIN
  SELECT e.id INTO eqid FROM equations e
    JOIN worksheet_templates wt ON wt.id = e.worksheet_template_id
    JOIN standards s ON s.id = wt.standard_id
    WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-18' AND e.equation_number = '22';
  IF eqid IS NULL THEN
    RAISE EXCEPTION 'a138-18:22 d->d_i: equation not found';
  END IF;

  UPDATE equations
    SET formula = 's_R = (s_F / (b_R * h_R)) * (b_R * h_R + az * (pi * d_i^2/4) * ((1/s_F) - 1))',
        input_symbols = array_replace(input_symbols, 'd', 'd_i')
    WHERE id = eqid
      AND formula = 's_R = (s_F / (b_R * h_R)) * (b_R * h_R + az * (pi * d^2/4) * ((1/s_F) - 1))';
END $$;
