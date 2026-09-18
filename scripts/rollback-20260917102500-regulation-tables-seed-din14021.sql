BEGIN;
DELETE FROM regulation_tables WHERE standard_code = 'DIN-14021' AND edition = '2016' AND table_code = 'CLAIMMAP';
DELETE FROM regulation_tables WHERE standard_code = 'DIN-14021' AND edition = '2016' AND table_code = 'S6_5_3';
DELETE FROM regulation_tables WHERE standard_code = 'DIN-14021' AND edition = '2016' AND table_code = 'S5_3_5_10';
COMMIT;
