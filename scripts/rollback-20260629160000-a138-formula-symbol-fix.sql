-- ROLLBACK for supabase/migrations/20260629160000_a138_formula_symbol_fix.sql
-- Restore the three equations' exact prior formula + input_symbols. No data was changed by the
-- forward migration (definitions only), so nothing else to restore. Idempotent + re-runnable.
--
-- CODE rollback (do separately): remove A138-11:5/6 + A138-13:9 from engine-whitelist.ts + whitelist.ts,
-- and (optionally) the min()/max() evaluator support — though leaving those is harmless.
DO $$
DECLARE
  ws11 uuid;
  ws13 uuid;
BEGIN
  SELECT wt.id INTO ws11 FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id
    WHERE s.code='DWA-A-138-1' AND wt.code='A138-11';
  SELECT wt.id INTO ws13 FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id
    WHERE s.code='DWA-A-138-1' AND wt.code='A138-13';
  IF ws11 IS NULL OR ws13 IS NULL THEN
    RAISE EXCEPTION 'rollback a138 formula fix: worksheet not found (ws11=% ws13=%)', ws11, ws13;
  END IF;

  UPDATE equations SET formula = 'k_i = k * f_K  (= konstant im Einfachen Verfahren)',
                       input_symbols = ARRAY['k (k_f)','f_K']
    WHERE worksheet_template_id = ws11 AND equation_number = '5';

  UPDATE equations SET formula = 'f_K = f_Ort * f_Methode <= 1',
                       input_symbols = ARRAY['f_Ort','f_Methode']
    WHERE worksheet_template_id = ws11 AND equation_number = '6';

  UPDATE equations SET formula = 'q_S_AC = (k_i * A_S_m * 1000 + Q_Dr) / A_C * 10^4 >= 2'
    WHERE worksheet_template_id = ws13 AND equation_number = '9';
END $$;
