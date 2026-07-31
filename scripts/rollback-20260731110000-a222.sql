-- No clean auto-rollback (multiple literals); to revert, restore from the pre-migration snapshot or
-- re-map True->'ja' etc. Documented: forward migration replaced =='ja'->==True, =='nein'->==False,
-- GK==''N''->GK==''gk_N''. (Reverse only if needed; these were dead gates before.)
DO $$ BEGIN RAISE NOTICE 'manual rollback — see migration header'; END $$;
