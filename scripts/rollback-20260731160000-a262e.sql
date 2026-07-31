DO $$ BEGIN
  UPDATE equations SET formula='Q_S_d_aM = EZ * w_s_d / 86400  (l/s)', output_unit=NULL WHERE id='1c9b9469-362e-4c67-88e4-49257d89cce3';
  UPDATE equations SET formula='Q_T_d_aM = Q_S_d_aM + Q_F_d_aM  (m^3/d)', output_unit=NULL WHERE id='2e702b45-d29b-45ea-90d9-7a43423e942a';
  UPDATE equations SET formula='f_red = 1 - t_Reg / 12   with f_red >= 0.5', output_unit=NULL WHERE id='395eceea-8b47-4a87-bc00-d51190fce646';
  UPDATE equations SET formula='Q_F = q_F * A_E_k  (l/s)', output_unit=NULL WHERE id='4cb4c503-5871-45b3-97f1-752512c9f60e';
  UPDATE equations SET formula='A_F_CSB_red = f_red * A_F_CSB  [m^2]', output_unit=NULL WHERE id='571c0451-aeec-4723-93cf-34d3346bb3ff';
  UPDATE equations SET formula='Q_F = q_F * A_E_k  (l/s)', output_unit=NULL WHERE id='5ab4ad64-320a-4789-bc7e-623dfa9ce1d2';
  UPDATE equations SET formula='Q_R_Tr = q_R_Tr * A_E_k  (l/s)', output_unit=NULL WHERE id='5c1e432e-184c-4ef5-940d-9f2987b20e87';
  UPDATE equations SET formula='Q_F_d_aM = m_T_aM * Q_S_d_aM  (m^3/d)', output_unit=NULL WHERE id='83384e6e-a6c1-4209-9eb9-a4b14b407932';
  UPDATE equations SET formula='k_fA = (d_10)^2 / 100   (m/s, with d_10 in mm)', output_unit=NULL WHERE id='88212dd3-8b60-430e-9937-cf1488027f99';
  UPDATE equations SET formula='Q_Tr_h_max = 24 * Q_S_d_aM / x_Q_max + Q_F + Q_R_Tr  (l/s)', output_unit=NULL WHERE id='be085f8e-4173-4a10-9b6f-01cf6c972bbf';
  UPDATE equations SET formula='U = d_60 / d_10   with U < 5', output_unit=NULL WHERE id='f3a64c47-454a-418e-a4b7-4810cf5e4afe';
END $$;
