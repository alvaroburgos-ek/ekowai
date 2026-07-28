DO $$
BEGIN
  UPDATE equations
     SET formula = 'Win = WD + R1 + R2 + R3 ; Wout = O1 + O2 + O3 + O4 ; Win = Wout',
         input_symbols = ARRAY['WD','R1','R2','R3','O1','O2','O3','O4']::text[]
   WHERE id = 'bf60d386-4a0c-4270-a506-c923cbf074bd';
  RAISE NOTICE 'ISO-46001 C.1 rolled back';
END $$;
