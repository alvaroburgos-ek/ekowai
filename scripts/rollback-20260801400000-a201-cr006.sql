-- ROLLBACK for 20260801400000_a201_cr006_paren_fix.sql
-- Restores DWA-A-201 CR-006 to its prior (unparenthesised, F-07-unreachable) condition.
-- Only for reverting the enforcement fix; note the prior state left ≥10 UNENFORCED.
DO $$
DECLARE v_cr uuid;
BEGIN
  SELECT cr.id INTO v_cr
    FROM compliance_requirements cr
    JOIN worksheet_templates wt ON wt.id = cr.worksheet_template_id
    JOIN standards s ON s.id = wt.standard_id
   WHERE s.code = 'DWA-A-201' AND cr.code = 'CR-006';
  IF v_cr IS NULL THEN RAISE EXCEPTION 'DWA-A-201 CR-006 not found'; END IF;

  UPDATE compliance_requirements
     SET condition = 'IF absetz_vorstufe == true THEN A_EW_unbelueftet >= 8 AND IF absetz_vorstufe == false THEN A_EW_unbelueftet >= 10'
   WHERE id = v_cr;

  RAISE NOTICE 'DWA-A-201 CR-006 rolled back to unparenthesised condition';
END $$;
