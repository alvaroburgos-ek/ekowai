-- Add deviations JSONB column to calculation_snapshots.
--
-- Stores the project's active documented deviations frozen at approval time,
-- so a stamped record can reproduce exactly which deviations applied when the
-- engineer approved a worksheet.
--
-- Shape (nullable — only populated on `approve` trigger snapshots):
--   Array<{
--     id:              uuid,
--     requirementId:   uuid,
--     requirementCode: text,
--     justification:   text,
--     basisCitations:  jsonb,   -- [{ id?, docId, page?, note? }]
--     authorityRef:    text | null
--   }>
--
-- Nullable so existing rows remain valid without a backfill; the reader in
-- snapshots.ts already handles null as "no deviations recorded".
-- Idempotent — safe to re-apply.

ALTER TABLE calculation_snapshots
  ADD COLUMN IF NOT EXISTS deviations jsonb;
