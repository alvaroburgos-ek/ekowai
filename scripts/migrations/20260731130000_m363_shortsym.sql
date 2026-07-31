-- SOURCE-SETTLED — DWA-M-363 short-symbol formula fixes (reproduction-checked, broken->computes).
-- Prefix-elimination symbol map (C->c_konstante, T->t_deponie, F->f_methan) + comma->dot + prose strip.
-- Gl(1)->computed 5.5, Gl(5-f3)->computed 0.308, Gl(6)->computed 5.33. (Gl4a/4b/5 map correctly but
-- stay manual via e^ engine gap -> sheet, not here.) Rollback: scripts/rollback-20260731130000-m363b.sql
DO $$ BEGIN
  UPDATE equations SET formula='c_ab = 3.75 * at4 - c_konstante' WHERE id IN ('b0b59b76-b242-4fe0-aea0-bc6a6a841012','61157c49-b54e-4b92-9e2f-1f9294b1dcc5') AND formula='C_ab = 3,75 * AT4 - C   (mit C = 7,5 kg/Mg TM)';
  UPDATE equations SET formula='f_3 = 0.014 * t_deponie + 0.28' WHERE id IN ('6b8fdbae-9a32-4e45-af1e-a14a221bcdbf','165ae837-b05d-44d6-8872-714929bc0ddb') AND formula='f_3 = 0,014 * T + 0,28';
  UPDATE equations SET formula='ch4_erz_t = ddoc_m_decomp_t * f_methan * 16 / 12' WHERE id IN ('298b8045-f829-4743-8226-8dc3da219136','6e9fca7d-186d-4746-879b-c58579189926') AND formula='CH4_erz_T = DDOC_m_decomp_T * F * 16 / 12';
END $$;
