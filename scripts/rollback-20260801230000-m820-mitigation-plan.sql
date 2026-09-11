-- Rollback for 20260801230000_m820_mitigation_plan_structured.sql
-- Re-activates the deprecated hand-entry count field and strips the appended note.
DO $$
DECLARE
  v_ws uuid;
BEGIN
  SELECT wt.id INTO v_ws
  FROM worksheet_templates wt
  JOIN standards s ON s.id = wt.standard_id
  WHERE s.code = 'DWA-M-820-1' AND wt.code = 'M820-07';

  IF v_ws IS NULL THEN
    RAISE EXCEPTION 'M820-07 worksheet_template not found';
  END IF;

  UPDATE fields
     SET active = true,
         description = regexp_replace(description, '\s*\[deaktiviert 2026-08-01:[^\]]*\]', '', 'g')
   WHERE worksheet_template_id = v_ws
     AND symbol = 'mitigation_actions_count'
     AND active = false;

  RAISE NOTICE 'M820-07 rollback: mitigation_actions_count re-activated';
END $$;
