-- ROLLBACK for supabase/migrations/20260628120000_a138_rainfall_table_ref.sql
-- Reverses the Piece-2 per-facility rainfall_table_ref field addition:
--   - Deletes the 8 rainfall_table_ref fields by their pre-assigned UUIDs.
-- The forward migration made NO data change, so no data restore is needed.
-- NOT a forward migration: lives in scripts/ so it is never auto-applied.
-- Idempotent + re-runnable.
--
-- CODE rollback (do separately, before deploying the reverted build):
--   - Revert the resolution wiring (read of rainfall_table_ref + table
--     resolution) in src/lib/eval/use-equation-engine.ts,
--     src/lib/eval/evaluate-for-report.ts and src/lib/snapshots/payload.ts
--     back to the direct single-carrier `{ rows }` read. (Harmless to leave,
--     since unset ref → primary table → unchanged behaviour.)
DELETE FROM fields WHERE id IN (
  'd1384013-0000-4000-8000-000000000001',
  'd1384016-0000-4000-8000-000000000001',
  'd1384017-0000-4000-8000-000000000001',
  'd1384018-0000-4000-8000-000000000001',
  'd1384019-0000-4000-8000-000000000001',
  'd1384020-0000-4000-8000-000000000001',
  'd1384021-0000-4000-8000-000000000001',
  'd1384022-0000-4000-8000-000000000001'
);
