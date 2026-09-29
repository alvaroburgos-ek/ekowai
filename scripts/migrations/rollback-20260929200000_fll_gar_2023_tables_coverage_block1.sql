-- ROLLBACK for 20260929200000_fll_gar_2023_tables_coverage_block1.sql
-- Removes exactly the twelve tables that block 1 introduced (rows cascade). Pre-existing FLL-GAR tables are untouched.
-- Run: node scripts/apply-migration.mjs scripts/migrations/rollback-20260929200000_fll_gar_2023_tables_coverage_block1.sql
BEGIN;
DELETE FROM regulation_tables
 WHERE standard_code = 'FLL-GAR-2023' AND edition = '2023-12'
   AND table_code IN ('TAB2','TAB9','TAB10','TAB11','TAB14','TAB15','TAB17','TAB19','TAB20','TAB21','TAB23','TAB29');
COMMIT;
