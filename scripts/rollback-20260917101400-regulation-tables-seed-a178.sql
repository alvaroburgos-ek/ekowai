BEGIN;
DELETE FROM regulation_tables WHERE standard_code = 'DWA-A-178' AND edition = '2019-06' AND table_code = 'TABELLE1';
DELETE FROM regulation_tables WHERE standard_code = 'DWA-A-178' AND edition = '2019-06' AND table_code = 'TABELLE1_VS';
DELETE FROM regulation_tables WHERE standard_code = 'DWA-A-178' AND edition = '2019-06' AND table_code = 'S6_1_4_5';
DELETE FROM regulation_tables WHERE standard_code = 'DWA-A-178' AND edition = '2019-06' AND table_code = 'S6_LIMITS';
DELETE FROM regulation_tables WHERE standard_code = 'DWA-A-178' AND edition = '2019-06' AND table_code = 'S6_2_RECHENWERTE';
DELETE FROM regulation_tables WHERE standard_code = 'DWA-A-178' AND edition = '2019-06' AND table_code = 'S6_2_ANHALT';
DELETE FROM regulation_tables WHERE standard_code = 'DWA-A-178' AND edition = '2019-06' AND table_code = 'TABELLE2';
COMMIT;
