-- ROLLBACK for 20260728270000_m1024_surface_enums.sql — restore empty enums + prior clause_reference
DO $$
BEGIN
  UPDATE fields SET enum_values = '[]'::jsonb, clause_reference = '§5.2, Tab.4'
   WHERE id IN ('969669c5-d2f2-4133-8771-06c677133981','00974f75-41f1-4424-9cd5-9d4db836f3aa','0b34749f-3474-4e6d-976e-056e435ea9ab');
  RAISE NOTICE 'DWA-M-102-4 surface enums rolled back';
END $$;
