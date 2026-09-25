-- Step 1 read-back (READ ONLY) — run with: node scripts/verification/prod-query.mjs <this file>
select column_name from information_schema.columns where table_schema='public' and table_name='fields' and column_name in ('widget','ui_config','lookup','visible_when') order by 1;
select count(*) as ws_visible_when from information_schema.columns where table_schema='public' and table_name='worksheet_sections' and column_name='visible_when';
select table_name from information_schema.tables where table_schema='public' and table_name in ('regulation_tables','regulation_table_rows','regulation_tables_legacy_v1') order by 1;
select count(*) as new_shape_has_standard_code from information_schema.columns where table_schema='public' and table_name='regulation_tables' and column_name='standard_code';
select count(*) as legacy_rows, count(distinct standard_id) as legacy_stds from regulation_tables_legacy_v1;
select count(*) as new_tables, (select count(*) from regulation_table_rows) as new_rows from regulation_tables;
select conname from pg_constraint where conrelid='public.regulation_tables_legacy_v1'::regclass order by 1;
select conname from pg_constraint where conname='fields_widget_check';
