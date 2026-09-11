BEGIN;
DELETE FROM regulation_tables WHERE standard_code = 'DWA-A-138-1' AND edition = '2024-10' AND table_code = 'TAB9';
DELETE FROM regulation_tables WHERE standard_code = 'DWA-A-138-1' AND edition = '2024-10' AND table_code = 'TAB5';
DELETE FROM regulation_tables WHERE standard_code = 'DWA-A-138-1' AND edition = '2024-10' AND table_code = 'TAB6';
DELETE FROM regulation_tables WHERE standard_code = 'DWA-A-138-1' AND edition = '2024-10' AND table_code = 'TAB13';
COMMIT;