-- Read-back after applying 20261005180000_plant_catalog.sql + 20261005181000_plant_catalog_guideline_seed.sql
-- Expected: table present with RLS on + 1 SELECT policy; 36 guideline rows (33 aggressive true / 3 false); 0 reference_book rows until the Kircher block is applied.
-- Run: node scripts/verification/prod-query.mjs scripts/verification/apply/readback-plant-catalog.sql
select relrowsecurity as rls_on from pg_class where relname = 'plant_catalog';
select policyname, cmd, roles from pg_policies where tablename = 'plant_catalog';
select source_kind, licence_status, aggressive_rhizome, count(*) from plant_catalog group by 1, 2, 3 order by 1, 2, 3;
select scientific_name, common_name_de, plant_group, source_ref from plant_catalog where source_kind = 'guideline' order by scientific_name;
select scientific_name, source_ref from plant_catalog where source_ref like '%;%';
