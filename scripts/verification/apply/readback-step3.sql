-- Step 3 read-back (READ ONLY): Plan-1 A138 seed + the 9 selection-config files
select t.standard_code, t.table_code, count(r.id) as rows from regulation_tables t left join regulation_table_rows r on r.table_id = t.id group by 1, 2 order by 1, 2;
select f.widget, count(*) as fields from fields f where f.widget is not null group by 1 order by 1;
select s.code as standard, count(*) as widget_fields from fields f join worksheet_templates w on w.id = f.worksheet_template_id join standards s on s.id = w.standard_id where f.widget is not null group by 1 order by 1;
