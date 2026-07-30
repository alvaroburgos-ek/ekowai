-- USER-AUTHORIZED SWEEP — condition='manual' -> '' (empty) so the gate reaches the engine's intended
-- manual-review bucket instead of dead-pending.
--
-- CLASS (rule 14 `14.dead-manual-condition`): the literal token 'manual' parses as a truthy lookup of a
-- nonexistent symbol → {kind:'pending', missingSymbols:['manual']} FOREVER (broken "fehlend: manual").
-- evaluate.ts returns {kind:'manual'} (neither pass nor fail = the intended manual-review state) ONLY
-- for an EMPTY/unparseable condition (lines 524-528). So clearing the token to '' realises the encoder's
-- manifest intent. EXECUTED PROOF (this session): ec('manual',...) -> pending; ec('',...) -> {kind:'manual'}.
--
-- Strict improvement in all 70 cases (a broken missing-symbol error becomes a legitimate manual-review
-- item); non-blocking before and after (all warn; pending and manual both non-blocking). 70 CRs across
-- 21 standards. Single uniform transform, guarded + count-checked (aborts unless exactly 70).
-- Rollback: scripts/rollback-20260730100000-manual-to-empty.sql
DO $$
DECLARE v int := 0;
BEGIN
  UPDATE compliance_requirements SET condition = '' WHERE condition = 'manual';
  GET DIAGNOSTICS v = ROW_COUNT;
  IF v <> 70 THEN RAISE EXCEPTION 'Expected 70 manual CRs, updated % — prod not in expected state, aborting', v; END IF;
  RAISE NOTICE 'manual->empty sweep: % CRs now reach the manual-review bucket', v;
END $$;
