-- SOURCE-SETTLED FIX — DWA-M-102-4 Gl.(2) + Gl.(C.1), class (a), surfaced by the
-- EXECUTED workflow metric (wf_ee3c4d81-9f6) and proven broken->computes in-session:
--   Gl.2  inputs [R,R_D,R_B] -> [R_D,R_B]   (self-ref output; printed RHS = R_D + R_B)
--         probe: manual_required "Fehlende Eingaben: R"  ->  computed 300
--   C.1   formula LHS 'ET_a,korr' -> 'ET_a_korr' (the row's OWN output_symbol spelling)
--         probe: error 'Unerwartetes Zeichen "=" an Position 10'  ->  computed 715
-- No fn( calls in either formula (M104-D-comma FN_LIKE trap N/A, checked).
-- Both outputs are SINGLE-WRITER (collision census wf_ee3c4d81-9f6), so the fixes LAND at
-- worksheet level — unlike Gl.3, whose R_D collision with Gl.5 is a ruling (sheet).
-- Gl.1/5/6 self-refs are DELIBERATELY untouched: they are collision parties; fixing them
-- changes nothing until the writer-retirement ruling. Rollback restores originals.
DO $$
DECLARE v_n int;
BEGIN
  UPDATE equations SET input_symbols = ARRAY['R_D','R_B']::text[]
   WHERE id = '4430a74a-150d-43ad-880c-27c168aa02b3'
     AND input_symbols = ARRAY['R','R_D','R_B']::text[];
  GET DIAGNOSTICS v_n = ROW_COUNT; RAISE NOTICE 'Gl.2: % row(s)', v_n;
  UPDATE equations SET formula = 'ET_a_korr = ET_a * f_L * f_W'
   WHERE id = '46d1fd5d-b497-4f0c-ba7b-43d10d3dd204'
     AND formula = 'ET_a,korr = ET_a * f_L * f_W';
  GET DIAGNOSTICS v_n = ROW_COUNT; RAISE NOTICE 'C.1: % row(s)', v_n;
END $$;
