-- SOURCE-SETTLED FIX — ISO-59020 A.1/A.2: formula LHS begins with '%' which the engine's
-- rhs() LHS-strip cannot match, so the '%' reaches the tokenizer and hard-ERRORS. The rows'
-- own declared output_symbol is pct_REUI_X / pct_RECI_X; setting the LHS to that (RHS +
-- input_symbols already correct) makes them compute. Gl.13/C.1 symbol-mismatch class.
-- EXECUTION PROOF (real evaluateFormula, this session):
--   A.1 error("Unerwartetes Zeichen %") -> computed 30 ;  A.2 error -> computed 25.
-- These are 2 of the 3 MANDATORY resource-inflow core indicators (Table 3, printed p.17);
-- WS ISO-59020-05 (Resource Inflow) is unblocked by this. A.3 already uses a letter-prefixed
-- LHS and works. No multi-producer collision (13 distinct outputs). Guarded on the % form.
DO $$
DECLARE v_n int;
BEGIN
  UPDATE equations SET formula = 'pct_REUI_X = (mREUI(X) / mTI(X)) * 100'
   WHERE id = '62e2cbfd-f530-4450-a9b7-1982fa1f955b' AND formula LIKE '\%REUI%';
  GET DIAGNOSTICS v_n = ROW_COUNT; RAISE NOTICE 'A.1: % row(s)', v_n;
  UPDATE equations SET formula = 'pct_RECI_X = (mRECI(X) / mTI(X)) * 100'
   WHERE id = '3d0e7b99-83ba-447d-9101-df3ab06c11c2' AND formula LIKE '\%RECI%';
  GET DIAGNOSTICS v_n = ROW_COUNT; RAISE NOTICE 'A.2: % row(s)', v_n;
END $$;
