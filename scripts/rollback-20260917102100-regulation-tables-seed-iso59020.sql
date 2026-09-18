BEGIN;
DELETE FROM regulation_tables WHERE standard_code = 'ISO-59020' AND edition = '2024' AND table_code = 'TABLE3';
COMMIT;
