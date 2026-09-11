-- Rollback for 20260801220000_m820_risk_register_structured.sql
-- Re-activates the two deprecated hand-entry count fields and strips the
-- appended deactivation notes. (The register description enrichment is left in
-- place — it is descriptive only and harmless; re-run the forward migration to
-- restore it if a prior description must be recovered from backup.)
DO $$
DECLARE
  v_ws uuid;
BEGIN
  SELECT wt.id INTO v_ws
  FROM worksheet_templates wt
  JOIN standards s ON s.id = wt.standard_id
  WHERE s.code = 'DWA-M-820-1' AND wt.code = 'M820-06';

  IF v_ws IS NULL THEN
    RAISE EXCEPTION 'M820-06 worksheet_template not found';
  END IF;

  UPDATE fields
     SET active = true,
         description = regexp_replace(description, '\s*\[deaktiviert 2026-08-01:[^\]]*\]', '', 'g')
   WHERE worksheet_template_id = v_ws
     AND symbol IN ('risk_count_identified', 'risk_high_priority_count')
     AND active = false;

  RAISE NOTICE 'M820-06 rollback: 2 hand-count fields re-activated';
END $$;
