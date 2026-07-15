-- scripts/rollback-20260713120000-a138-18-22-d-to-di.sql
-- Rollback of 20260713120000_a138_18_22_d_to_di.sql — restore A138-18 Gl.(22) s_R to the pre-fix
-- (mis-encoded) state: d_i → d. After rollback, the E1-A faithfulness gate re-flags A138-18:22
-- (unresolved `d`) and it must be re-added to EQUATION_GATE_DENYLIST.
-- Idempotent (guarded on the corrected formula).
DO $$
DECLARE
  eqid uuid;
BEGIN
  SELECT e.id INTO eqid FROM equations e
    JOIN worksheet_templates wt ON wt.id = e.worksheet_template_id
    JOIN standards s ON s.id = wt.standard_id
    WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-18' AND e.equation_number = '22';
  IF eqid IS NULL THEN
    RAISE EXCEPTION 'a138-18:22 rollback: equation not found';
  END IF;

  UPDATE equations
    SET formula = 's_R = (s_F / (b_R * h_R)) * (b_R * h_R + az * (pi * d^2/4) * ((1/s_F) - 1))',
        input_symbols = array_replace(input_symbols, 'd_i', 'd')
    WHERE id = eqid
      AND formula = 's_R = (s_F / (b_R * h_R)) * (b_R * h_R + az * (pi * d_i^2/4) * ((1/s_F) - 1))';
END $$;
