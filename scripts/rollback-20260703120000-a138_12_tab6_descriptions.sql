-- ROLLBACK for scripts/migrations/20260703120000_a138_12_tab6_descriptions.sql
-- Restores the prior (stale, BK-framed) description + clause_reference text
-- verbatim. Data-only; idempotent + re-runnable.
DO $$
DECLARE
  ws12 uuid;
BEGIN
  SELECT wt.id INTO ws12 FROM worksheet_templates wt
    JOIN standards s ON s.id = wt.standard_id
    WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-12';
  IF ws12 IS NULL THEN
    RAISE EXCEPTION 'rollback a138_12_tab6_descriptions: A138-12 not found';
  END IF;

  UPDATE fields SET
    description = 'Computed limit per Tab. 6: BK II/BBZ ≥20 cm → ≤30; BK II/BBZ ≥30 cm → ≤50; BK II BL/BK III/BBZ ≥20 → ≤15; BK III/BBZ ≥30 → ≤30.',
    clause_reference = 'Tab. 6'
    WHERE worksheet_template_id = ws12 AND symbol = 'ac_as_ratio_limit';

  UPDATE fields SET
    description = 'PASS if A_C/A_S,m within Tab. 6 limit for governing BK + BBZ thickness.',
    clause_reference = 'Tab. 6'
    WHERE worksheet_template_id = ws12 AND symbol = 'ac_as_ratio_check';

END $$;
