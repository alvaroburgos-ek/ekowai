BEGIN;
DELETE FROM regulation_tables WHERE standard_code = 'DWA-M-820-1' AND edition = '2020' AND table_code = 'TABD1';
DELETE FROM regulation_tables WHERE standard_code = 'DWA-M-820-1' AND edition = '2020' AND table_code = 'ANHB23';
DELETE FROM regulation_tables WHERE standard_code = 'DWA-M-820-1' AND edition = '2020' AND table_code = 'S8_10_3_6';
DELETE FROM regulation_tables WHERE standard_code = 'DWA-M-820-1' AND edition = '2020' AND table_code = 'S3_9_VGV';
DELETE FROM regulation_tables WHERE standard_code = 'DWA-M-820-1' AND edition = '2020' AND table_code = 'ANHB11';
DELETE FROM regulation_tables WHERE standard_code = 'DWA-M-820-1' AND edition = '2020' AND table_code = 'E1_4_1_UMSATZ';
COMMIT;
