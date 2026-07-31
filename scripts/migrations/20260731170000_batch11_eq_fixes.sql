-- SOURCE-SETTLED (batch 11, reproduction-checked broken->computes each).
-- DIN-1989-1 Eq4: decimal comma 0,06->0.06 (min() arg-comma kept). DIN-14021 EQ-01/02/03: short RHS
-- symbols -> declared input_symbols (R->R_energy, A->A_mass_recycled, I->I_resource_initial, etc.).
-- Rollback: scripts/rollback-20260731170000-batch11.sql
DO $$ BEGIN
  UPDATE equations SET formula='V_n = min(BW_a, E_R) * 0.06' WHERE id='9f2b0686-05c4-46ac-90bc-73a7ad19dfe8' AND formula='V_n = min(BW_a, E_R) * 0,06';
  UPDATE equations SET formula='(R_energy - E_energy) / ((R_energy - E_energy) + P_energy) * 100' WHERE id='bf45c951-daee-447a-b699-81157cdb61e0' AND formula='(R - E) / ((R - E) + P) * 100';
  UPDATE equations SET formula='A_mass_recycled / P_mass_product * 100' WHERE id='c14004cb-6185-4b81-8ae0-427a9d9d791b' AND formula='A / P * 100';
  UPDATE equations SET formula='(I_resource_initial - N_resource_new) / I_resource_initial * 100' WHERE id='af58d637-011b-4b83-a1d7-c8a1d4b4a129' AND formula='(I - N) / I * 100';
END $$;
