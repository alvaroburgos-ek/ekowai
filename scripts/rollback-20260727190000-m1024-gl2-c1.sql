-- ROLLBACK: restores the recorded (broken) originals for Gl.2 + C.1.
DO $$
BEGIN
  UPDATE equations SET input_symbols = ARRAY['R','R_D','R_B']::text[]
   WHERE id = '4430a74a-150d-43ad-880c-27c168aa02b3' AND input_symbols = ARRAY['R_D','R_B']::text[];
  UPDATE equations SET formula = 'ET_a,korr = ET_a * f_L * f_W'
   WHERE id = '46d1fd5d-b497-4f0c-ba7b-43d10d3dd204' AND formula = 'ET_a_korr = ET_a * f_L * f_W';
  RAISE NOTICE 'Gl.2/C.1 rolled back';
END $$;
