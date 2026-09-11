-- Rollback for 20260911100000_guideline_to_tool_schema.sql (Guideline→Tool phase 0).
DROP TABLE IF EXISTS regulation_table_rows;
DROP TABLE IF EXISTS regulation_tables;
ALTER TABLE fields
  DROP COLUMN IF EXISTS widget,
  DROP COLUMN IF EXISTS ui_config,
  DROP COLUMN IF EXISTS lookup,
  DROP COLUMN IF EXISTS visible_when;
ALTER TABLE worksheet_sections DROP COLUMN IF EXISTS visible_when;
