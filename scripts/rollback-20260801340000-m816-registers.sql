DO $$
DECLARE v2 uuid; v5 uuid;
BEGIN
  SELECT wt.id INTO v2 FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id WHERE s.code='DWA-M-816' AND wt.code='M816-02';
  SELECT wt.id INTO v5 FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id WHERE s.code='DWA-M-816' AND wt.code='M816-05';
  DELETE FROM fields WHERE worksheet_template_id=v2 AND symbol='alternatives';
  DELETE FROM fields WHERE worksheet_template_id=v5 AND symbol='component_costs';
  UPDATE fields SET active=true, description=regexp_replace(description,'\s*\[deaktiviert 2026-08-01:[^\]]*\]','','g')
    WHERE (worksheet_template_id=v2 AND symbol='alternative_id') OR (worksheet_template_id=v5 AND symbol IN ('ahk_per_component','component_count'));
  RAISE NOTICE 'M816 registers rollback complete';
END $$;
