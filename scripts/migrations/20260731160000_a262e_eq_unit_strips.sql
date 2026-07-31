-- SOURCE-SETTLED — DWA-A-262E: strip inline unit/floor annotations from 11 equations (broke parse
-- as hard error / manual) + set output_unit. Reproduction-checked: each broken->computed via real
-- evaluateFormula this session. (Gl.15 A_ANF excluded — stays manual, div-by-zero w/ test inputs only.)
-- Rollback: scripts/rollback-20260731160000-a262e.sql
DO $$ BEGIN
  UPDATE equations SET formula='Q_S_d_aM = EZ * w_s_d / 86400', output_unit='l/s' WHERE id='1c9b9469-362e-4c67-88e4-49257d89cce3' AND formula='Q_S_d_aM = EZ * w_s_d / 86400  (l/s)';
  UPDATE equations SET formula='Q_T_d_aM = Q_S_d_aM + Q_F_d_aM', output_unit='m^3/d' WHERE id='2e702b45-d29b-45ea-90d9-7a43423e942a' AND formula='Q_T_d_aM = Q_S_d_aM + Q_F_d_aM  (m^3/d)';
  UPDATE equations SET formula='f_red = 1 - t_Reg / 12', output_unit=NULL WHERE id='395eceea-8b47-4a87-bc00-d51190fce646' AND formula='f_red = 1 - t_Reg / 12   with f_red >= 0.5';
  UPDATE equations SET formula='Q_F = q_F * A_E_k', output_unit='l/s' WHERE id='4cb4c503-5871-45b3-97f1-752512c9f60e' AND formula='Q_F = q_F * A_E_k  (l/s)';
  UPDATE equations SET formula='A_F_CSB_red = f_red * A_F_CSB', output_unit='m^2' WHERE id='571c0451-aeec-4723-93cf-34d3346bb3ff' AND formula='A_F_CSB_red = f_red * A_F_CSB  [m^2]';
  UPDATE equations SET formula='Q_F = q_F * A_E_k', output_unit='l/s' WHERE id='5ab4ad64-320a-4789-bc7e-623dfa9ce1d2' AND formula='Q_F = q_F * A_E_k  (l/s)';
  UPDATE equations SET formula='Q_R_Tr = q_R_Tr * A_E_k', output_unit='l/s' WHERE id='5c1e432e-184c-4ef5-940d-9f2987b20e87' AND formula='Q_R_Tr = q_R_Tr * A_E_k  (l/s)';
  UPDATE equations SET formula='Q_F_d_aM = m_T_aM * Q_S_d_aM', output_unit='m^3/d' WHERE id='83384e6e-a6c1-4209-9eb9-a4b14b407932' AND formula='Q_F_d_aM = m_T_aM * Q_S_d_aM  (m^3/d)';
  UPDATE equations SET formula='k_fA = (d_10)^2 / 100', output_unit='m/s' WHERE id='88212dd3-8b60-430e-9937-cf1488027f99' AND formula='k_fA = (d_10)^2 / 100   (m/s, with d_10 in mm)';
  UPDATE equations SET formula='Q_Tr_h_max = 24 * Q_S_d_aM / x_Q_max + Q_F + Q_R_Tr', output_unit='l/s' WHERE id='be085f8e-4173-4a10-9b6f-01cf6c972bbf' AND formula='Q_Tr_h_max = 24 * Q_S_d_aM / x_Q_max + Q_F + Q_R_Tr  (l/s)';
  UPDATE equations SET formula='U = d_60 / d_10', output_unit=NULL WHERE id='f3a64c47-454a-418e-a4b7-4810cf5e4afe' AND formula='U = d_60 / d_10   with U < 5';
END $$;
