-- ROLLBACK for 20260801420000_m363_gl13_symbol_fixes.sql — restore original uppercase-token formulas.
UPDATE equations SET formula = 'G_t = G_e * (1 - e^(-k*t))'
  WHERE id IN ('cfab7241-ba1b-40d9-8947-bf957e4542be','60097156-8b99-4eaa-9a62-f0e08eb13a22');
UPDATE equations SET formula = 'G_td = G_e * k * e^(-k*t)'
  WHERE id IN ('78e61753-6fa8-42bc-97b2-6aa2f4607a83','8502b3d8-9233-443b-86d0-9e8d1555c9e8');
UPDATE equations SET formula = 'G_td = 1.868 * C_ab * f_1_aerob * f_2_ausbeute * f_3 * M_n_abfallmasse * k * e^(-k*t)'
  WHERE id IN ('905fe4b9-4926-4346-b9a0-92d9adde7df2','9c453ddb-2376-42c8-83be-9b2b8f849608');
UPDATE equations SET formula = 'DDOC_m_decomp_T = DDOC_ma_T_minus_1 - (1 - e^(-k))'
  WHERE id IN ('ea86e593-47c6-48e7-8354-cb85ba511843','21202924-1835-4ed6-833b-10521265ce20');
