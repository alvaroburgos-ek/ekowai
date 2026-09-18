BEGIN;
DELETE FROM regulation_tables WHERE standard_code = 'DIN-18130-1' AND edition = '1998-05' AND table_code = 'TAB1';
DELETE FROM regulation_tables WHERE standard_code = 'DIN-18130-1' AND edition = '1998-05' AND table_code = 'TAB2';
DELETE FROM regulation_tables WHERE standard_code = 'DIN-18130-1' AND edition = '1998-05' AND table_code = 'TAB3';
DELETE FROM regulation_tables WHERE standard_code = 'DIN-18130-1' AND edition = '1998-05' AND table_code = 'TAB4';
DELETE FROM regulation_tables WHERE standard_code = 'DIN-18130-1' AND edition = '1998-05' AND table_code = 'TAB5';
DELETE FROM regulation_tables WHERE standard_code = 'DIN-18130-1' AND edition = '1998-05' AND table_code = 'S5_8';
DELETE FROM regulation_tables WHERE standard_code = 'DIN-18130-1' AND edition = '1998-05' AND table_code = 'S5_8_KORN';
COMMIT;
