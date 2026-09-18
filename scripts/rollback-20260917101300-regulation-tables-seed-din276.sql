BEGIN;
DELETE FROM regulation_tables WHERE standard_code = 'DIN-276' AND edition = '2018-12' AND table_code = 'TABLE1';
DELETE FROM regulation_tables WHERE standard_code = 'DIN-276' AND edition = '2018-12' AND table_code = 'TABLE2';
DELETE FROM regulation_tables WHERE standard_code = 'DIN-276' AND edition = '2018-12' AND table_code = 'TABLE3';
DELETE FROM regulation_tables WHERE standard_code = 'DIN-276' AND edition = '2018-12' AND table_code = 'TABLE4';
COMMIT;
