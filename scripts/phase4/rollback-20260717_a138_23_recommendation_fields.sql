-- scripts/phase4/rollback-20260717_a138_23_recommendation_fields.sql
-- Rollback of 20260717_a138_23_recommendation_fields.sql
-- Removes the two Phase-4 recommendation fields from A138-23 (DWA-A-138-1).
--
-- FK delete order (B2 defect #13 / A4):
--   project_parameters.field_id → fields.id is ON DELETE NO ACTION.
--   Therefore: DELETE project_parameters rows FIRST, then DELETE fields rows.
--
-- Idempotent: safe to re-run if the fields don't exist (DELETEs on non-
-- existent rows are no-ops; the NOT EXISTS guard on project_parameters
-- prevents errors if no param rows were written).
DO $$
DECLARE
  ws23  uuid;
  fld1  uuid;
  fld2  uuid;
BEGIN
  -- -------------------------------------------------------------------------
  -- Resolve worksheet_template_id for A138-23 / DWA-A-138-1
  -- -------------------------------------------------------------------------
  SELECT wt.id INTO ws23
    FROM worksheet_templates wt
    JOIN standards s ON s.id = wt.standard_id
    WHERE wt.code = 'A138-23'
      AND s.code  = 'DWA-A-138-1';

  -- If the worksheet no longer exists the fields are already gone — nothing to do.
  IF ws23 IS NULL THEN
    RAISE NOTICE 'rollback-20260717: worksheet A138-23 not found — nothing to roll back';
    RETURN;
  END IF;

  -- -------------------------------------------------------------------------
  -- Resolve field IDs (may be NULL if the forward migration was never applied
  -- or was already rolled back — that is fine; the DELETEs below become no-ops).
  -- -------------------------------------------------------------------------
  SELECT f.id INTO fld1
    FROM fields f
    WHERE f.worksheet_template_id = ws23
      AND f.symbol = 'recommended_phase_4_gate';

  SELECT f.id INTO fld2
    FROM fields f
    WHERE f.worksheet_template_id = ws23
      AND f.symbol = 'phase_4_recommendation_reasons';

  -- -------------------------------------------------------------------------
  -- Step 1: delete project_parameters rows referencing these fields FIRST
  --         (FK is NO ACTION — must clear before deleting the parent fields).
  -- -------------------------------------------------------------------------
  IF fld1 IS NOT NULL THEN
    DELETE FROM project_parameters WHERE field_id = fld1;
  END IF;

  IF fld2 IS NOT NULL THEN
    DELETE FROM project_parameters WHERE field_id = fld2;
  END IF;

  -- -------------------------------------------------------------------------
  -- Step 2: delete the fields themselves.
  -- -------------------------------------------------------------------------
  DELETE FROM fields
    WHERE worksheet_template_id = ws23
      AND symbol IN ('recommended_phase_4_gate', 'phase_4_recommendation_reasons');

END $$;
