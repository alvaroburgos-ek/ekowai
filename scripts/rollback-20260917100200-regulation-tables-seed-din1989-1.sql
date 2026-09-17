BEGIN;
DELETE FROM regulation_tables WHERE standard_code = 'DIN-1989-1' AND edition = '2002' AND table_code = 'TAB3';
DELETE FROM regulation_tables WHERE standard_code = 'DIN-1989-1' AND edition = '2002' AND table_code = 'TAB4_PERSON';
DELETE FROM regulation_tables WHERE standard_code = 'DIN-1989-1' AND edition = '2002' AND table_code = 'TAB4_WASCHMASCHINE';
DELETE FROM regulation_tables WHERE standard_code = 'DIN-1989-1' AND edition = '2002' AND table_code = 'TAB4_FLAECHE';
DELETE FROM regulation_tables WHERE standard_code = 'DIN-1989-1' AND edition = '2002' AND table_code = 'TAB1';
DELETE FROM regulation_tables WHERE standard_code = 'DIN-1989-1' AND edition = '2002' AND table_code = 'TAB2';
DELETE FROM regulation_tables WHERE standard_code = 'DIN-1989-1' AND edition = '2002' AND table_code = 'TAB5';
COMMIT;
