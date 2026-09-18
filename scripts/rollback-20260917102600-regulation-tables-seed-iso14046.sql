BEGIN;
DELETE FROM regulation_tables WHERE standard_code = 'ISO-14046' AND edition = '2014' AND table_code = 'S5_2_4_2_DQ';
DELETE FROM regulation_tables WHERE standard_code = 'ISO-14046' AND edition = '2014' AND table_code = 'S6_2_TP';
COMMIT;
