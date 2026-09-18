BEGIN;
DELETE FROM regulation_tables WHERE standard_code = 'ISO-46001' AND edition = '2019' AND table_code = 'TABLEA1';
DELETE FROM regulation_tables WHERE standard_code = 'ISO-46001' AND edition = '2019' AND table_code = 'TABLED1';
COMMIT;
