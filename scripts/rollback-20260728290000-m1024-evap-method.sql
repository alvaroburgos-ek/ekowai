-- ROLLBACK for 20260728290000_m1024_evap_method_enum.sql
DO $$ BEGIN
  UPDATE fields SET enum_values='[]'::jsonb, clause_reference='§4.2'
   WHERE id='ef0a6f17-0da2-46ee-9070-5de5e7703c8f';
END $$;
