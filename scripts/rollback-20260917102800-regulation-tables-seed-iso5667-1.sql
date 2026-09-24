BEGIN;
DELETE FROM regulation_tables WHERE standard_code = 'ISO-5667-1' AND edition = '1980' AND table_code = 'S16_4_K';
DELETE FROM regulation_tables WHERE standard_code = 'ISO-5667-1' AND edition = '1980' AND table_code = 'S21';
DELETE FROM regulation_tables WHERE standard_code = 'ISO-5667-1' AND edition = '1980' AND table_code = 'S8_6';
DELETE FROM regulation_tables WHERE standard_code = 'ISO-5667-1' AND edition = '1980' AND table_code = 'S12_1_2';
COMMIT;
