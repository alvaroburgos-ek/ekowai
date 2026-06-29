-- supabase/migrations/20260629160000_a138_formula_symbol_fix.sql
-- A138-11 f_K/k_i + A138-13:9 q_S_AC — correct the stored equation FORMULAS + INPUT_SYMBOLS so
-- the (now-whitelisted) formula engine can resolve+evaluate them. The engine is case-sensitive and
-- resolves an equation's input_symbols against field symbols, then evaluates the formula string —
-- so BOTH must use the real field symbols. No new fields; no project_parameters touched.
--
--   A138-11 Gl.5 k_i : `k * f_K (+ note)` / inputs {"k (k_f)",f_K}  →  `k_f * f_K` / {k_f,f_K}
--                      (k→k_f to match A138-05's field; drop the unparseable parenthetical note)
--   A138-11 Gl.6 f_K : `f_Ort * f_Methode <= 1` / {f_Ort,f_Methode}  →  `min(f_ort*f_methode,1)` / {f_ort,f_methode}
--                      (case fix to match A138-08/A138-03 fields; implement the standard's ≤1 cap via min())
--   A138-13 Gl.9 q_S_AC : strip the trailing `>= 2` (value only; the ≥2 adequacy threshold stays in
--                      compliance A138-REQ-15). input_symbols already correct ({k_i,A_S_m,Q_Dr,A_C}).
--
-- Read-only prod check 2026-06-29: 0 projects have a typed f_K/k_i (all derived). PLT-HS-01 has a
-- STALE derived q_S_AC=4836.43 (a prior mis-eval) — it is A138-13-OWNED + derived, so the engine
-- OVERWRITES it on recompute (NOT a shadow trap; same as the A138-10 Q_zu=45 artifact). NOTE: once the
-- real q_S_AC computes (tiny, with k_i≈7.98e-8), REQ-15 (q_S_AC≥2, block) will correctly FLIP from a
-- false pass to FAIL for inadequate designs — intended behavior.
-- Idempotent. WRITTEN-NOT-APPLIED. Rollback: scripts/rollback-20260629160000-a138-formula-symbol-fix.sql.
DO $$
DECLARE
  ws11 uuid;
  ws13 uuid;
BEGIN
  SELECT wt.id INTO ws11 FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id
    WHERE s.code='DWA-A-138-1' AND wt.code='A138-11';
  SELECT wt.id INTO ws13 FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id
    WHERE s.code='DWA-A-138-1' AND wt.code='A138-13';
  IF ws11 IS NULL OR ws13 IS NULL THEN
    RAISE EXCEPTION 'a138 formula fix: worksheet not found (ws11=% ws13=%)', ws11, ws13;
  END IF;

  UPDATE equations SET formula = 'k_i = k_f * f_K', input_symbols = ARRAY['k_f','f_K']
    WHERE worksheet_template_id = ws11 AND equation_number = '5';

  UPDATE equations SET formula = 'f_K = min(f_ort * f_methode, 1)', input_symbols = ARRAY['f_ort','f_methode']
    WHERE worksheet_template_id = ws11 AND equation_number = '6';

  UPDATE equations SET formula = 'q_S_AC = (k_i * A_S_m * 1000 + Q_Dr) / A_C * 10^4'
    WHERE worksheet_template_id = ws13 AND equation_number = '9';
END $$;
