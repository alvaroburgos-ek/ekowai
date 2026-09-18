BEGIN;
DELETE FROM regulation_tables WHERE standard_code = 'DIN-1989-2' AND edition = '2004' AND table_code = 'TAB1';
DELETE FROM regulation_tables WHERE standard_code = 'DIN-1989-2' AND edition = '2004' AND table_code = 'TAB2';
DELETE FROM regulation_tables WHERE standard_code = 'DIN-1989-2' AND edition = '2004' AND table_code = 'TAB3';
DELETE FROM regulation_tables WHERE standard_code = 'DIN-1989-2' AND edition = '2004' AND table_code = 'TAB4';
DELETE FROM regulation_tables WHERE standard_code = 'DIN-1989-2' AND edition = '2004' AND table_code = 'TAB5';
COMMIT;
