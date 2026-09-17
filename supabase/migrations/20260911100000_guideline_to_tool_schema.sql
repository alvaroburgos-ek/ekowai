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

-- Plan 3 Task 4 fix round 1 (sign-off plan1-D-3-1, 2026-09-17): prod ALREADY holds a LEGACY table named
-- regulation_tables in the per-cell shape (standard_id / table_id / table_name / row_number / parameter_label /
-- parameter_symbol / variant_dimension / variant_value / value_text / value_numeric / unit / comparison / …;
-- 5,382 rows over 35 standards / 410 table_ids; constraints regulation_tables_pkey + regulation_tables_standard_id_fkey;
-- indexes regulation_tables_std_idx + regulation_tables_table_idx; RLS on with 0 policies; 0 views, 0 child FKs,
-- 0 triggers, 0 app readers — only one-off scripts wrote it). The CREATE TABLE IF NOT EXISTS below would be a no-op on
-- it and every Plan-3 seed INSERT (standard_code, edition, table_code …) would fail. Rename it out of the way FIRST:
-- data untouched, constraints and indexes renamed so the new table's default names cannot collide, idempotent
-- (the guard is the ABSENCE of the Plan-1 column standard_code = legacy shape). Rollback renames it back
-- (rollback-20260911100000_guideline_to_tool_schema.sql) and refuses while the new table still holds rows.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'regulation_tables')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'regulation_tables' AND column_name = 'standard_code') THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'regulation_tables_legacy_v1') THEN
      RAISE EXCEPTION 'regulation_tables (legacy shape) AND regulation_tables_legacy_v1 both exist — resolve by hand before applying 20260911100000';
    END IF;
    ALTER TABLE public.regulation_tables RENAME TO regulation_tables_legacy_v1;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'regulation_tables_pkey' AND conrelid = 'public.regulation_tables_legacy_v1'::regclass) THEN
      ALTER TABLE public.regulation_tables_legacy_v1 RENAME CONSTRAINT regulation_tables_pkey TO regulation_tables_legacy_v1_pkey;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'regulation_tables_standard_id_fkey' AND conrelid = 'public.regulation_tables_legacy_v1'::regclass) THEN
      ALTER TABLE public.regulation_tables_legacy_v1 RENAME CONSTRAINT regulation_tables_standard_id_fkey TO regulation_tables_legacy_v1_standard_id_fkey;
    END IF;
    ALTER INDEX IF EXISTS public.regulation_tables_std_idx RENAME TO regulation_tables_legacy_v1_std_idx;
    ALTER INDEX IF EXISTS public.regulation_tables_table_idx RENAME TO regulation_tables_legacy_v1_table_idx;
    RAISE NOTICE 'legacy regulation_tables renamed to regulation_tables_legacy_v1 (rows untouched; pkey/fkey/indexes renamed)';
  END IF;
END $$;

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
