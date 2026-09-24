BEGIN;
DELETE FROM regulation_tables WHERE standard_code = 'ISO-59004' AND edition = 'FDIS 2024' AND table_code = 'S5_2';
COMMIT;
