-- SOURCE-SETTLED (full-treatment batch 1) — two mechanical fixes; all block-mishome/modal findings
-- are RULINGS held for the owner (enforcement-changing), not here.
--
-- (1) ISO-59010 CR-018: warn gate mis-homed on ISO-59010-07 (clause-6 worksheet) but encodes §7.3
--     "value network governance" (printed p.36) which belongs to Clause 7 -> ISO-59010-08. Sibling
--     clauses §7.2 (CR-017) and §7.4 (CR-019) + the governance_element enum already live on -08.
--     Condition is EMPTY (manual bucket) so re-home changes NO enforcement (warn, non-blocking) —
--     a source-settled warn re-home the rule-15 sweep missed (empty condition = no symbol signal).
-- (2) ISO-59014 CR-005: clause_reference '6.1' -> '§6.1' (cosmetic; matches every sibling's § prefix).
-- Rollback: scripts/rollback-20260730110000-batch1.sql
DO $$
DECLARE v int := 0;
BEGIN
  UPDATE compliance_requirements SET worksheet_template_id='fab89a76-65e3-4bcb-b209-7e6795615da2'
   WHERE id='51827f3a-1180-4395-8db1-ffe33bf7060d' AND worksheet_template_id='8d2297dd-b1b3-47fc-8c80-189b15608b4b';
  GET DIAGNOSTICS v=ROW_COUNT; RAISE NOTICE 'ISO-59010 CR-018 re-home: %', v;

  UPDATE compliance_requirements SET clause_reference='§6.1'
   WHERE id='860d6abf-2983-4b5c-9ee4-b08993eb7abd' AND clause_reference='6.1';
  GET DIAGNOSTICS v=ROW_COUNT; RAISE NOTICE 'ISO-59014 CR-005 clause §: %', v;
END $$;
