DO $$ BEGIN
  UPDATE equations SET formula='C_ab = 3 * AT4' WHERE id IN ('df1f2bc1-0d90-4837-9163-f3a95eda8b82','b969f2eb-4648-49ea-83c2-2e6a32507878');
  UPDATE equations SET formula='G_e = C_ab * 1,868 * (100 - WG) / 100' WHERE id IN ('b6cc4ba5-552d-4a9e-baa0-328537026c35','7b245275-3055-40bc-a089-ecae7dde6ca9');
  UPDATE equations SET formula='h2s_mg_per_m3 ~= 1,4 * h2s_ppm' WHERE id IN ('3bacfa98-939a-497c-b9b9-a300460e3704','2df30411-3305-4d78-857d-de9d57e4b838');
  UPDATE equations SET formula='k_abbau = -ln(0,5) / t_half' WHERE id IN ('7420be92-286d-4635-aac3-d00f4827dbdf','13f32698-4844-449f-b0fc-6f142d32313c');
END $$;
