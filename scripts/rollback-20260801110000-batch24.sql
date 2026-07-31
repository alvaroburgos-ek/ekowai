DO $$ BEGIN
  UPDATE equations SET formula='Q_flush_avg = 33 l/(E*d)', output_unit=NULL
   WHERE id='995ac439-647a-46e2-a23f-9383caa592ed';
END $$;
