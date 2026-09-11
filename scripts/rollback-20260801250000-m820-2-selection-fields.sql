-- no-op rollback (description-only)
DO $$ BEGIN RAISE NOTICE 'No-op: 20260801250000 was description-only.'; END $$;
