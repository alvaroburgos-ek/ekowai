-- ROLLBACK for 20260728280000_enum_retype_15.sql — restore data_type='enum' (enum_values stay null;
-- they were already empty before the re-type).
DO $$
BEGIN
  UPDATE fields SET data_type='enum' WHERE id IN (
     'f1289ec5-adb3-4e8e-84ed-9f896afbea08','d929eabd-475f-402a-81b6-09eeddb045b2',
     'fb6e1ae3-4432-4df5-a3a6-7f31d97a64ff','cad666d3-03f3-4856-9316-4a4a6730b176',
     '7643060f-6a5e-484b-ae9f-bba7fd9e6c4f','118d561d-2848-49a4-95c4-47714f2e1b83',
     'c2bb7f92-2b1f-4895-bbf0-7d3969ec3666','19cb9a0a-71e3-4e75-b1ac-88862ceb0fb5',
     'b8eeaad3-3437-4f90-9ddf-d9a036deb215','e0d88da3-87b8-4b54-9be1-5736e380b89b',
     '8b1fa526-1b1f-4b7c-b260-62eebf05e344','9ee02f74-41df-4110-a248-234e2e4e288e',
     '83804e04-978c-40db-85c5-eb6f3360de88');
  RAISE NOTICE 'enum re-type rolled back';
END $$;
