-- ROLLBACK for 20261005180000_plant_catalog.sql — drops the reference table (seeds included). STAGED — not applied.
DROP POLICY IF EXISTS plant_catalog_read_authenticated ON plant_catalog;
DROP TABLE IF EXISTS plant_catalog;
