DO $$ BEGIN
  UPDATE equations SET formula='a_f = Max(0.5 + 50 / (t_f + 100); 0.885)' WHERE id='6e412ae9-f9e5-462b-9cfb-8b5bdc854d3b';
  UPDATE equations SET formula='V_s = Max(H1 / (e_0 + 6) - H2; V_S_min)' WHERE id='a928532e-5aee-425a-afd1-e0044656039e';
END $$;
