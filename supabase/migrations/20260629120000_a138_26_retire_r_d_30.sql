-- supabase/migrations/20260629120000_a138_26_retire_r_d_30.sql
-- Rainfall 2D grid (Model A) — Task 7.
-- Retire A138-26 `r_D_30` from a REQUIRED typed input to an OPTIONAL fallback.
--
-- Gl.10 (Überflutungsnachweis, §5.3.4) now derives r_D(30) by ITERATING the shared
-- 2D KOSTRA grid's T_n=30 column (Task 5) — so r_D_30 no longer has to be typed.
-- The field stays ACTIVE on purpose: it is the documented legacy/back-compat
-- fallback (used only when the inherited carrier has no native T_n=30 column —
-- i.e. un-migrated 1D projects). Setting is_required=false removes the
-- required-but-empty blocker (no project has ever filled it — see below) and
-- lets the grid-derived value satisfy the flood path on native grids.
--
-- DATA SAFETY: this changes ONLY the field DEFINITION (is_required). It does NOT
-- touch project_parameters — no stored r_D_30 value is read, written, or deleted.
-- Read-only prod check 2026-06-29: 0 projects have a typed r_D_30 value, so nothing
-- to migrate or break; the field is is_required=true/active=true today.
--
-- Idempotent. WRITTEN-NOT-APPLIED — ships at the 2D-grid cutover.
-- Rollback: scripts/rollback-20260629120000-a138-26-retire-r-d-30.sql.
DO $$
DECLARE
  ws uuid;
  fid uuid;
BEGIN
  SELECT wt.id INTO ws FROM worksheet_templates wt
    JOIN standards s ON s.id = wt.standard_id
    WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-26';
  IF ws IS NULL THEN
    RAISE EXCEPTION 'retire r_D_30: worksheet A138-26 not found';
  END IF;

  SELECT id INTO fid FROM fields
    WHERE worksheet_template_id = ws AND symbol = 'r_D_30';
  IF fid IS NULL THEN
    RAISE EXCEPTION 'retire r_D_30: field r_D_30 not found on A138-26';
  END IF;

  -- Only the required flag changes. Field stays active (legacy fallback input).
  UPDATE fields SET is_required = false WHERE id = fid;
END $$;
