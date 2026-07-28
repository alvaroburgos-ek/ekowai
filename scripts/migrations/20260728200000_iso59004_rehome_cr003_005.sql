-- SOURCE-SETTLED FIX — ISO-59004 (ISO/FDIS 59004:2024) CR-003/004/005: dead-reference re-home (class c)
--
-- Same phantom-field-gate topology fixed on ISO-14015 wave 14, recurring here as predicted (the
-- dp-iso59004-phantom-field-gates map node already flagged it). Each CR references exactly one
-- operand field, and that field lives on ISO-59004-03 (Circular Economy Vision), but the CRs are
-- attached to ISO-59004-01 (Registration & Scope). Engine lookup is worksheet-LOCAL -> operand never
-- in ws-01's value map -> the gates never resolve to a real pass. clause_reference on all three is
-- §4 (the Vision worksheet's clause), corroborating the true home.
--
--   CR-003 ce_vision_statement       (IS NOT NULL) -> ISO-59004-03   [absent->fail(red), present->pass]
--   CR-004 systems_thinking_applied  (== true)     -> ISO-59004-03   [absent->pending, present->pass]
--   CR-005 principles_integrated     (== true)     -> ISO-59004-03   [absent->pending, present->pass]
--
-- ZERO-INTERPRETATION: operand field home is a fact of the declared structure (prod query, this
-- session: all three fields home on ISO-59004-03). Exactly one correct destination per CR.
-- ENFORCEMENT UNCHANGED: all three severity='warn' (guidance standard). warn never blocks. Per the
-- ISO-14015 wave-14 settled split, a mis-homed WARN gate re-home is source-settled (a mis-homed
-- BLOCK gate would be a ruling); none here are block.
--
-- REPRODUCTION (real evaluateCondition, this session, probe deleted after):
--   ce_vision_statement IS NOT NULL: absent -> {fail}; present -> {pass}
--   systems_thinking_applied == true: absent -> {pending}; present -> {pass}
--   -> broken (never a legitimate pass on ws-01) BEFORE, working gate on ws-03 AFTER.
--
-- SCOPE: exactly these 3 rows, guarded to their current (broken) home ws-01. CR-015 (block on a
-- §5.3.4 'should') is a modal ruling -> sheet, not here. The 24 condition='manual' CRs (dead-pending,
-- corpus class) -> sheet + validator rule, not here.
--
-- Standard id 98737198-0988-49c6-80cb-bb077ff29fb1.
-- Rollback: scripts/rollback-20260728200000-iso59004-rehome.sql
DO $$
DECLARE v_n int := 0;
  ws01 uuid := 'd8783583-55f5-4224-ab4e-fa6aace611e7';
  ws03 uuid := 'f5db7641-ae89-4694-b9c7-dca8cf542191';
BEGIN
  UPDATE compliance_requirements SET worksheet_template_id = ws03
   WHERE id IN ('102122d1-acd6-43f1-b9d6-eab15744b171',   -- CR-003
                '3a33395b-79f1-4a45-be55-1e7b1c0c3194',   -- CR-004
                'f4938924-939d-450c-ae0a-84b9e222b132')   -- CR-005
     AND worksheet_template_id = ws01;   -- guard: only the known broken home
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 3 THEN
    RAISE EXCEPTION 'Expected 3 re-homes, got % — aborting (prod not in the known broken state)', v_n;
  END IF;
  RAISE NOTICE 'ISO-59004 re-home CR-003/004/005 -> ws03: % rows', v_n;
END $$;
