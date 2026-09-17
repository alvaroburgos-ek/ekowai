-- Rollback for 20260911100000_guideline_to_tool_schema.sql (Guideline→Tool phase 0).
-- Plan 3 Task 4 fix round 1 (sign-off plan1-D-3-1): the forward migration renames a LEGACY prod table
-- `regulation_tables` (per-cell shape, no `standard_code` column) to `regulation_tables_legacy_v1` before creating
-- the Plan-1 tables. This rollback (1) REFUSES while the NEW regulation_tables still holds rows (roll the seed
-- migrations back first — a DROP would lose seeded data), (2) drops the Plan-1 tables ONLY when they have the Plan-1
-- shape (never the legacy table), (3) renames the legacy table, its constraints and indexes back.
DO $$
DECLARE n bigint;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'regulation_tables' AND column_name = 'standard_code') THEN
    EXECUTE 'SELECT count(*) FROM public.regulation_tables' INTO n;
    IF n > 0 THEN
      RAISE EXCEPTION 'regulation_tables (Plan-1 shape) still holds % rows — roll back the regulation_tables seed migrations first', n;
    END IF;
    DROP TABLE IF EXISTS public.regulation_table_rows;
    DROP TABLE IF EXISTS public.regulation_tables;
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'regulation_tables') THEN
    RAISE EXCEPTION 'regulation_tables exists WITHOUT standard_code (legacy shape) — the forward migration was not applied; nothing to roll back';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'regulation_tables_legacy_v1')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'regulation_tables') THEN
    ALTER TABLE public.regulation_tables_legacy_v1 RENAME TO regulation_tables;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'regulation_tables_legacy_v1_pkey' AND conrelid = 'public.regulation_tables'::regclass) THEN
      ALTER TABLE public.regulation_tables RENAME CONSTRAINT regulation_tables_legacy_v1_pkey TO regulation_tables_pkey;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'regulation_tables_legacy_v1_standard_id_fkey' AND conrelid = 'public.regulation_tables'::regclass) THEN
      ALTER TABLE public.regulation_tables RENAME CONSTRAINT regulation_tables_legacy_v1_standard_id_fkey TO regulation_tables_standard_id_fkey;
    END IF;
    ALTER INDEX IF EXISTS public.regulation_tables_legacy_v1_std_idx RENAME TO regulation_tables_std_idx;
    ALTER INDEX IF EXISTS public.regulation_tables_legacy_v1_table_idx RENAME TO regulation_tables_table_idx;
    RAISE NOTICE 'regulation_tables_legacy_v1 renamed back to regulation_tables (rows untouched)';
  END IF;
END $$;
ALTER TABLE fields
  DROP COLUMN IF EXISTS widget,
  DROP COLUMN IF EXISTS ui_config,
  DROP COLUMN IF EXISTS lookup,
  DROP COLUMN IF EXISTS visible_when;
ALTER TABLE worksheet_sections DROP COLUMN IF EXISTS visible_when;
