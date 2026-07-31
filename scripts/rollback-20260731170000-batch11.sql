DO $$ BEGIN
  UPDATE equations SET formula='V_n = min(BW_a, E_R) * 0,06' WHERE id='9f2b0686-05c4-46ac-90bc-73a7ad19dfe8';
  UPDATE equations SET formula='(R - E) / ((R - E) + P) * 100' WHERE id='bf45c951-daee-447a-b699-81157cdb61e0';
  UPDATE equations SET formula='A / P * 100' WHERE id='c14004cb-6185-4b81-8ae0-427a9d9d791b';
  UPDATE equations SET formula='(I - N) / I * 100' WHERE id='af58d637-011b-4b83-a1d7-c8a1d4b4a129';
END $$;
