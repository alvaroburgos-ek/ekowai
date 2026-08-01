-- READY-TO-USE: DWA-M-102-4 A.8/A.9/B.2/B.4/B.5 — ";"-joined multi-statement regression rows (each crams
-- a_F/a_A + g_F/g_A + v_F/v_A into one row). Reduce each to its OWN output_symbol's statement (a_F resp.
-- a_A, the first statement); fix subscript-comma symbols f_S,F/f_S,M -> declared f_S_F/f_S_M. With ln/exp
-- now engine-supported these COMPUTE. Coefficients are the verbatim printed Anhang A/B regressions
-- (batch-27 audit confirmed faithful). Same class as the already-repaired A.6/A.7/A.10/B.3. Rollback: -m1024.
DO $$
DECLARE v int := 0;
BEGIN
  UPDATE equations SET formula='a_F = 0.000001969*P - 0.005116*ln(Sp) - 0.0001051*h_D + 0.01753*exp(4.576/k_f)'
   WHERE id='b1e3ec56-7e1c-4398-94f5-a3a5b204ead1';
  UPDATE equations SET formula='a_F = 0.145704 - 0.059177*ln(f_Fu) - 0.007354*Sp - 0.050531*ln(WK_max - WP)'
   WHERE id='482cdb97-72b3-4abf-9de8-79dacb710962';
  UPDATE equations SET formula='a_A = 0.004264 + 0.001121*ln(P) - 0.002757*ln(f_S_F)'
   WHERE id='c8475112-e49b-4317-bb76-45449d2510a5';
  UPDATE equations SET formula='a_A = -0.03867 + 0.007684*ln(P) + 0.000003201*f_S_M + 0.0002564*k_f - 0.0001187*f_S_M*k_f + 0.004161*ln(k_f / f_S_M)'
   WHERE id='4a647c2c-cfd5-4056-abfc-d2853f91f41e';
  UPDATE equations SET formula='a_A = 0.8112 + 0.0003473*P - 0.00001845*ET_p - 0.04793*f_S_M + 0.0007481*q_Dr - 0.4389*ln(k_f + 1)'
   WHERE id='43a05b73-be06-4ba2-89e4-c59bbd73659a';
  GET DIAGNOSTICS v=ROW_COUNT; RAISE NOTICE 'M102-4 regressions (last): %', v;
END $$;
