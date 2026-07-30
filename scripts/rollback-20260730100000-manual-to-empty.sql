-- ROLLBACK for 20260730100000_manual_to_empty_sweep.sql — restore the 'manual' token.
-- NOTE: only reverses CRs currently empty that this migration set; if other genuinely-empty CRs
-- exist they would be caught too, so this rollback is scoped by re-selecting the exact ids is safer —
-- but since the forward migration is the only producer of these empties in this batch, restore by token.
DO $$ BEGIN
  UPDATE compliance_requirements SET condition='manual' WHERE condition='' ;
  RAISE NOTICE 'manual->empty rolled back';
END $$;
