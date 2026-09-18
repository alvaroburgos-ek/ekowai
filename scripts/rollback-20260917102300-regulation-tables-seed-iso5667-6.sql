BEGIN;
DELETE FROM regulation_tables WHERE standard_code = 'ISO-5667-6' AND edition = '2015' AND table_code = 'ANNEXA';
DELETE FROM regulation_tables WHERE standard_code = 'ISO-5667-6' AND edition = '2015' AND table_code = 'S13_1';
DELETE FROM regulation_tables WHERE standard_code = 'ISO-5667-6' AND edition = '2015' AND table_code = 'S7_1';
DELETE FROM regulation_tables WHERE standard_code = 'ISO-5667-6' AND edition = '2015' AND table_code = 'S5_1_3';
DELETE FROM regulation_tables WHERE standard_code = 'ISO-5667-6' AND edition = '2015' AND table_code = 'S5_1_4';
DELETE FROM regulation_tables WHERE standard_code = 'ISO-5667-6' AND edition = '2015' AND table_code = 'S10_8';
COMMIT;
