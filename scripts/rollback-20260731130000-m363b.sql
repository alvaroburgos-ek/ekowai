DO $$ BEGIN
  UPDATE equations SET formula='C_ab = 3,75 * AT4 - C   (mit C = 7,5 kg/Mg TM)' WHERE id IN ('b0b59b76-b242-4fe0-aea0-bc6a6a841012','61157c49-b54e-4b92-9e2f-1f9294b1dcc5');
  UPDATE equations SET formula='f_3 = 0,014 * T + 0,28' WHERE id IN ('6b8fdbae-9a32-4e45-af1e-a14a221bcdbf','165ae837-b05d-44d6-8872-714929bc0ddb');
  UPDATE equations SET formula='CH4_erz_T = DDOC_m_decomp_T * F * 16 / 12' WHERE id IN ('298b8045-f829-4743-8226-8dc3da219136','6e9fca7d-186d-4746-879b-c58579189926');
END $$;
