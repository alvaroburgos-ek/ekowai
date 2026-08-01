DO $$ BEGIN
  UPDATE equations SET formula='a_F = 0.000001969*P - 0.005116*ln(Sp) - 0.0001051*h_D + 0.01753*exp(4.576/k_f) ; g_F = 0.2468883*ln(P) - 0.0003938*ET_p + 0.0017083*Sp - 0.0015998*h_D - 0.6703502*exp(0.1122885/k_f) ; v_F = 0.2111 - 0.2544*ln(P) + 0.2073*ln(ET_p) + 0.0006249*Sp + 0.123*ln(h_D) - 0.000002806*k_f' WHERE id='b1e3ec56-7e1c-4398-94f5-a3a5b204ead1';
  -- (other 4 originals restorable from ready-to-use-errors.tsv history; formula-only revert)
END $$;
