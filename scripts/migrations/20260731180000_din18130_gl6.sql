-- SOURCE-SETTLED — DIN-18130-1 Gl.(6) k_10: chained equality '... = alpha * k_T' (the alpha alias)
-- makes the parser throw on the 2nd '='. Reduce to the single self-contained printed RHS. Reproduction-
-- checked: before=error, after=computed 10. Rollback: scripts/rollback-20260731180000-din18130.sql
DO $$ BEGIN
  UPDATE equations SET formula='k_10 = (1.359 / (1 + 0.0337*T + 0.00022*T^2)) * k_T'
   WHERE id='21c8ff7a-28c2-46a2-bde3-7f5297d90977' AND formula='k_10 = (1.359 / (1 + 0.0337*T + 0.00022*T^2)) * k_T = alpha * k_T';
END $$;
