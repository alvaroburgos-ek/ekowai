-- Guideline→Tool phase 0 (spec docs/superpowers/specs/2026-09-11-guideline-to-tool-generic-fields-design.md §5).
-- Additive only. widget IS NULL keeps today's data_type-inferred rendering.
ALTER TABLE fields
  ADD COLUMN IF NOT EXISTS widget text,
  ADD COLUMN IF NOT EXISTS ui_config jsonb,
  ADD COLUMN IF NOT EXISTS lookup jsonb,
  ADD COLUMN IF NOT EXISTS visible_when text;
ALTER TABLE fields DROP CONSTRAINT IF EXISTS fields_widget_check;
ALTER TABLE fields ADD CONSTRAINT fields_widget_check CHECK (widget IS NULL OR widget IN
  ('select_one','select_many','lookup_fill','register','grid','reference','derived','attestation','scalar'));
ALTER TABLE worksheet_sections ADD COLUMN IF NOT EXISTS visible_when text;

CREATE TABLE IF NOT EXISTS regulation_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_code text NOT NULL,
  edition text NOT NULL,
  table_code text NOT NULL,
  title_de text NOT NULL,
  clause_reference text,
  page_ref text,
  key_columns text[] NOT NULL,
  value_columns jsonb NOT NULL,
  override_policy text NOT NULL CHECK (override_policy IN ('locked','anhaltswert','kann','messwert')),
  override_quote text,
  verification_status text NOT NULL DEFAULT 'imported_unverified',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (standard_code, edition, table_code)
);
CREATE TABLE IF NOT EXISTS regulation_table_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid NOT NULL REFERENCES regulation_tables(id) ON DELETE CASCADE,
  row_key text NOT NULL,
  keys jsonb NOT NULL,
  group_label text,
  label_de text NOT NULL,
  order_index int NOT NULL DEFAULT 0,
  row_values jsonb NOT NULL,
  verbatim_quote text NOT NULL,
  UNIQUE (table_id, row_key)
);
ALTER TABLE regulation_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulation_table_rows ENABLE ROW LEVEL SECURITY;
-- Reference data: readable by every authenticated user, writable only via the service role / migrations.
DROP POLICY IF EXISTS regulation_tables_read ON regulation_tables;
CREATE POLICY regulation_tables_read ON regulation_tables FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS regulation_table_rows_read ON regulation_table_rows;
CREATE POLICY regulation_table_rows_read ON regulation_table_rows FOR SELECT TO authenticated USING (true);
COMMENT ON COLUMN regulation_table_rows.verbatim_quote IS 'SR-1: the printed row, quoted verbatim from the standard transcript';
