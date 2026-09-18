BEGIN;
DELETE FROM regulation_tables WHERE standard_code = 'DWA-M-820-2' AND edition = '2023' AND table_code = 'ANHANGA';
DELETE FROM regulation_tables WHERE standard_code = 'DWA-M-820-2' AND edition = '2023' AND table_code = 'ANHANGB';
COMMIT;
