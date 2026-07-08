-- supabase/migrations/20260628120000_a138_rainfall_table_ref.sql
-- Piece 2 (rainfall multi-table) — Task 6.
-- Adds the per-facility `rainfall_table_ref` atomic field to every DWA-A-138-1
-- storage-sizing facility worksheet. The field holds the ID of the rainfall
-- table (the A138-04 `r_D_n_table` carrier may hold MULTIPLE source-tagged
-- tables) that this facility uses. It selects the TABLE only — never an
-- r_D(n) VALUE (the value stays engine-derived: iteration / fixed-D).
--
-- data_type = 'text': the table id is a free string written by the per-facility
-- table-selector component, whose options are the project's tables (dynamic per
-- project) — so an `enum` with fixed template-level enum_values does NOT fit.
--
-- Resolution is back-compatible: when this field is unset/stale the engine
-- resolves the PRIMARY (first) table (see resolveSelectedTable), which for a
-- legacy single-table carrier is the one wrapped table. So adding the field
-- changes NO behaviour until a facility explicitly references a non-primary
-- table.
--
-- NO carrier data migration here. The legacy `{ rows }` carrier is tolerated at
-- read time by normalizeRainfallCarrier and is rewritten to the canonical
-- `{ tables: [...] }` shape by real code when A138-04 is next saved through the
-- multi-table editor (Task 7). This mirrors the A138-07 precedent: hand-rolled
-- value SQL into prod is (correctly) classifier-blocked; canonical values are
-- materialized by the application save path, not by data UPDATEs in a migration.
--
-- Idempotent (ON CONFLICT (id)). WRITTEN, NOT APPLIED — ships at the Piece-2
-- cutover. Rollback: scripts/rollback-20260628120000-a138-rainfall-table-ref.sql.
DO $$
DECLARE
  std uuid;
  rec record;
  ws uuid;
  sec uuid;
BEGIN
  SELECT id INTO std FROM standards WHERE code = 'DWA-A-138-1';
  IF std IS NULL THEN
    RAISE EXCEPTION 'rainfall_table_ref: standard DWA-A-138-1 not found';
  END IF;

  -- One stable, pre-assigned UUID per storage-sizing facility worksheet.
  -- A138-13 = Becken/Speichervolumen (Gl. 8, the facility iterating today);
  -- A138-16 = Flächenversickerung (fixed D, still references a table);
  -- A138-17..22 = Mulde / Rigole / MRE / MRS / Schacht / Becken sizing.
  FOR rec IN
    SELECT * FROM (VALUES
      ('A138-13', 'd1384013-0000-4000-8000-000000000001'),
      ('A138-16', 'd1384016-0000-4000-8000-000000000001'),
      ('A138-17', 'd1384017-0000-4000-8000-000000000001'),
      ('A138-18', 'd1384018-0000-4000-8000-000000000001'),
      ('A138-19', 'd1384019-0000-4000-8000-000000000001'),
      ('A138-20', 'd1384020-0000-4000-8000-000000000001'),
      ('A138-21', 'd1384021-0000-4000-8000-000000000001'),
      ('A138-22', 'd1384022-0000-4000-8000-000000000001')
    ) AS t(code, field_id)
  LOOP
    SELECT wt.id INTO ws FROM worksheet_templates wt
      WHERE wt.standard_id = std AND wt.code = rec.code;
    IF ws IS NULL THEN
      RAISE EXCEPTION 'rainfall_table_ref: worksheet % not found', rec.code;
    END IF;

    -- Attach to an existing section on the worksheet (any valid one).
    SELECT section_id INTO sec FROM fields
      WHERE worksheet_template_id = ws AND section_id IS NOT NULL
      ORDER BY order_index LIMIT 1;
    IF sec IS NULL THEN
      RAISE EXCEPTION 'rainfall_table_ref: no section found for %', rec.code;
    END IF;

    INSERT INTO fields (
      id, worksheet_template_id, section_id, symbol,
      label_de, label_en, data_type, unit, is_required,
      consumer_worksheets, order_index, active
    )
    VALUES (
      rec.field_id::uuid, ws, sec, 'rainfall_table_ref',
      'Verwendete Niederschlagstabelle (Quelle)', 'Rainfall table used (source)',
      'text', NULL, false,
      NULL, 8, true
    )
    ON CONFLICT (id) DO UPDATE
      SET active = true,
          data_type = EXCLUDED.data_type,
          label_de = EXCLUDED.label_de,
          label_en = EXCLUDED.label_en;
  END LOOP;
END $$;
