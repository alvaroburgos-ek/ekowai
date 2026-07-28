-- SOURCE-SETTLED FIX — ISO-46001 Eq C.1: the row merged THREE printed statements into one
-- formula ('Win = WD+R1+R2+R3 ; Wout = O1+O2+O3+O4 ; Win = Wout') using ';' + multiple '=',
-- a construct the engine cannot evaluate. Its output_symbol is Win, and printed Formula C.2
-- (p.34) gives Win = Wout with WD+R1+R2+R3 = O1+O2+O3+O4, so Win = WD+R1+R2+R3 is the input
-- side — structurally determined. Wout has its own evaluable row (C.2b).
-- EXECUTION PROOF (real evaluateFormula, this session):
--   BEFORE: manual_required (blocked on irrelevant O1-O4; Win never computes)
--   AFTER:  computed 135 (WD=100,R1=10,R2=20,R3=5).
-- (Static audit predicted 'error' on ';'; the real engine returns manual_required — the
-- in-session probe is authoritative. Either way Win was uncomputable before.)
DO $$
DECLARE v_n int;
BEGIN
  UPDATE equations
     SET formula = 'Win = WD + R1 + R2 + R3', input_symbols = ARRAY['WD','R1','R2','R3']::text[]
   WHERE id = 'bf60d386-4a0c-4270-a506-c923cbf074bd'
     AND formula = 'Win = WD + R1 + R2 + R3 ; Wout = O1 + O2 + O3 + O4 ; Win = Wout';
  GET DIAGNOSTICS v_n = ROW_COUNT; RAISE NOTICE 'C.1: % row(s)', v_n;
END $$;
