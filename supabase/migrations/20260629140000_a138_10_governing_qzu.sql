-- supabase/migrations/20260629140000_a138_10_governing_qzu.sql
-- A138-10 auto Q_zu (governing-D derived) — Task 3.
-- Make A138-10's r_D(n) + D derive from the basin's governing-duration iteration
-- instead of being free-typed. Same-symbol consolidation (the A138-07 pattern):
--   (1) A138-13 (basin) becomes the PRODUCER of `r_D_n` (governing intensity) and
--       `D_min` (governing duration), consumed by A138-10. The Gl.8 engine
--       materializes them (materializeBasinGoverning on save → source_type='derived').
--   (2) A138-10's local free-typed `r_D_n` + `D_min` are DEACTIVATED. A138-10 then
--       picks up the basin's values via the same-symbol SEEDING path (loadSameSymbolValues
--       → initialValues), identical to the A138-07 precedent — NOT via mergeInheritedFields
--       (own-symbol-wins drops the inherited row even when the own field is inactive).
--       Gl.3 (unchanged) then auto-computes Q_zu.
--       CAVEAT: the seeding path is step-2 — a project's OWN persisted A138-10 r_D_n/D_min
--       param row (step-1) still WINS. So clean projects (no local value, e.g. PLT-HS-01)
--       derive correctly; a project that already TYPED a value keeps showing it (shadowed,
--       not superseded) until that param row is cleared. This migration does NOT delete
--       any param row.
--
-- Read-only prod check 2026-06-29: A138-13 has NO existing r_D_n/D_min (no collision)
-- + a section to attach to; A138-10 r_D_n=20569b22.../D_min=e8f2de04...; the only typed
-- values are r_D_n=200/D_min=15 on the throwaway "Wohngebiet Köln-Lindenthal" project.
-- Per the step-1-wins caveat above, those local rows would SHADOW the derived value on
-- that project (it keeps showing 200/15) — harmless (throwaway); PLT-HS-01 has no local
-- A138-10 value so it derives correctly. NO project_parameters row is deleted by this
-- migration (a separate DELETE of those 2 rows would be needed for true supersession).
-- Idempotent (ON CONFLICT(id)). WRITTEN-NOT-APPLIED. Rollback:
-- scripts/rollback-20260629140000-a138-10-governing-qzu.sql.
DO $$
DECLARE
  ws13 uuid;
  ws10 uuid;
  sec13 uuid;
BEGIN
  SELECT wt.id INTO ws13 FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id
    WHERE s.code='DWA-A-138-1' AND wt.code='A138-13';
  SELECT wt.id INTO ws10 FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id
    WHERE s.code='DWA-A-138-1' AND wt.code='A138-10';
  IF ws13 IS NULL OR ws10 IS NULL THEN
    RAISE EXCEPTION 'A138-10 governing Q_zu: worksheet not found (ws13=% ws10=%)', ws13, ws10;
  END IF;

  SELECT section_id INTO sec13 FROM fields
    WHERE worksheet_template_id=ws13 AND section_id IS NOT NULL ORDER BY order_index LIMIT 1;
  IF sec13 IS NULL THEN
    RAISE EXCEPTION 'A138-10 governing Q_zu: no section on A138-13';
  END IF;

  -- (1) Producer fields on A138-13 carrying the basin's governing values, under the
  --     SAME symbols A138-10's Gl.3 + D display consume. Derived (engine-materialized),
  --     not required, consumed by A138-10.
  INSERT INTO fields (id, worksheet_template_id, section_id, symbol, label_de, label_en,
                      data_type, unit, is_required, consumer_worksheets, order_index, active)
  VALUES
    ('d1381310-0000-4000-8000-000000000001', ws13, sec13, 'r_D_n',
      'Maßgebende Regenspende r_D(n) (Iteration)', 'Governing rainfall intensity r_D(n)',
      'number', 'l/(s·ha)', false, ARRAY['A138-10'], 40, true),
    ('d1381310-0000-4000-8000-000000000002', ws13, sec13, 'D_min',
      'Maßgebende Dauerstufe D (Iteration)', 'Governing duration D',
      'number', 'min', false, ARRAY['A138-10'], 41, true)
  ON CONFLICT (id) DO UPDATE
    SET consumer_worksheets=EXCLUDED.consumer_worksheets, active=true, is_required=false,
        label_de=EXCLUDED.label_de, label_en=EXCLUDED.label_en, unit=EXCLUDED.unit;

  -- (2) Deactivate A138-10's local free-typed duplicates (now inherited from A138-13).
  --     Mirrors the A138-07 area-consolidation deactivation of A138-10's duplicate fields.
  UPDATE fields SET active=false, is_required=false, consumer_worksheets=NULL
    WHERE worksheet_template_id=ws10 AND symbol IN ('r_D_n','D_min');
END $$;
