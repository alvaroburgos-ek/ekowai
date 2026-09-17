BEGIN;
DELETE FROM regulation_tables WHERE standard_code = 'DWA-M-1200-1' AND edition = '2025-07' AND table_code = 'TAB8';
DELETE FROM regulation_tables WHERE standard_code = 'DWA-M-1200-1' AND edition = '2025-07' AND table_code = 'TAB8_NOTE_F';
DELETE FROM regulation_tables WHERE standard_code = 'DWA-M-1200-1' AND edition = '2025-07' AND table_code = 'TAB7_CLASS';
DELETE FROM regulation_tables WHERE standard_code = 'DWA-M-1200-1' AND edition = '2025-07' AND table_code = 'TAB23';
DELETE FROM regulation_tables WHERE standard_code = 'DWA-M-1200-1' AND edition = '2025-07' AND table_code = 'TAB27';
DELETE FROM regulation_tables WHERE standard_code = 'DWA-M-1200-1' AND edition = '2025-07' AND table_code = 'TAB19';
DELETE FROM regulation_tables WHERE standard_code = 'DWA-M-1200-1' AND edition = '2025-07' AND table_code = 'TAB18';
COMMIT;
