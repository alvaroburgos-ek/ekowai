-- ROLLBACK for 20260727180000_m1024_gl3_gl4_fix.sql — restores the recorded originals.
-- Restores a state the engine cannot evaluate (that is what rollback means; it does not curate).
DO $$
BEGIN
  UPDATE equations
     SET formula = 'R_D = R_D,o + R_D,z',
         input_symbols = ARRAY['R_D','R_D_o','R_D_z']::text[]
   WHERE id = 'e59eb085-4e3e-4071-99ce-46e1ca5262a8'
     AND formula = 'R_D = R_D_o + R_D_z';
  UPDATE equations
     SET input_symbols = ARRAY['R_B','GWN']::text[]
   WHERE id = '3de1904c-874a-4076-aa63-ec3fe2725862'
     AND input_symbols = ARRAY['GWN']::text[];
  RAISE NOTICE 'Gl.3/Gl.4 rolled back to original (broken) state';
END $$;
