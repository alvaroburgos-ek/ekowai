-- Read-back after applying 20260929200000_fll_gar_2023_tables_coverage_block1.sql
-- Expected: 12 tables, row counts TAB2 5 · TAB9 3 · TAB10 3 · TAB11 6 · TAB14 2 · TAB15 11 · TAB17 6 · TAB19 14 · TAB20 13 · TAB21 47 · TAB23 3 · TAB29 30 (= 143 rows)
-- Run: node scripts/verification/prod-query.mjs scripts/verification/apply/readback-fll-gar-tables-block1.sql
select t.table_code, t.page_ref, t.verification_status, count(r.id) as rows
  from regulation_tables t left join regulation_table_rows r on r.table_id = t.id
 where t.standard_code = 'FLL-GAR-2023' and t.edition = '2023-12'
   and t.table_code in ('TAB2','TAB9','TAB10','TAB11','TAB14','TAB15','TAB17','TAB19','TAB20','TAB21','TAB23','TAB29')
 group by t.id order by t.table_code;
select count(*) as fll_gar_tables_total from regulation_tables where standard_code = 'FLL-GAR-2023';
