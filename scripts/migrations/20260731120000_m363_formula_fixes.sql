-- SOURCE-SETTLED — DWA-M-363 formula parser fixes (German formatting). Each row reproduction-checked
-- this session via real evaluateFormula (broken -> computes/normalized). Fixes: decimal comma->dot,
-- '~='->'=', RHS symbol case -> declared lowercase field names. Only case-EXACT-mapped equations here
-- (short-symbol mappings F->f_methan, k->k_abbau etc. + ln/e^ engine-gap + Gl(7) OR-ambiguity -> sheet AB-1).
--   Gl(2) manual->computed 6 ; Gl(3) manual->computed 3.66 ; Gl(h2s-mg) ERROR->computed 2.8 ;
--   Gl(k-half) comma-normalized (ln still manual = engine gap).
-- Rollback: scripts/rollback-20260731120000-m363.sql
DO $$
DECLARE v int:=0;
BEGIN
  UPDATE equations SET formula='c_ab = 3 * at4' WHERE id IN ('df1f2bc1-0d90-4837-9163-f3a95eda8b82','b969f2eb-4648-49ea-83c2-2e6a32507878') AND formula='C_ab = 3 * AT4';
  UPDATE equations SET formula='g_e = c_ab * 1.868 * (100 - wg) / 100' WHERE id IN ('b6cc4ba5-552d-4a9e-baa0-328537026c35','7b245275-3055-40bc-a089-ecae7dde6ca9') AND formula='G_e = C_ab * 1,868 * (100 - WG) / 100';
  UPDATE equations SET formula='h2s_mg_per_m3 = 1.4 * h2s_ppm' WHERE id IN ('3bacfa98-939a-497c-b9b9-a300460e3704','2df30411-3305-4d78-857d-de9d57e4b838') AND formula='h2s_mg_per_m3 ~= 1,4 * h2s_ppm';
  UPDATE equations SET formula='k_abbau = -ln(0.5) / t_half' WHERE id IN ('7420be92-286d-4635-aac3-d00f4827dbdf','13f32698-4844-449f-b0fc-6f142d32313c') AND formula='k_abbau = -ln(0,5) / t_half';
  GET DIAGNOSTICS v=ROW_COUNT; RAISE NOTICE 'DWA-M-363 formula fixes applied';
END $$;
