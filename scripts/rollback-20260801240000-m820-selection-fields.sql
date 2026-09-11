-- Rollback for 20260801240000_m820_selection_fields.sql
-- The migration only enriched descriptions (documentation, no behavioural change).
-- There is no prior-description snapshot to restore automatically; this rollback is
-- a no-op placeholder recording that the change is descriptive and safe to leave.
-- To revert a specific description, restore it from a DB backup.
DO $$ BEGIN RAISE NOTICE 'No-op: 20260801240000 was description-only (no field deactivations).'; END $$;
