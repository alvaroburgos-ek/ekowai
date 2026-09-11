DO $$ DECLARE v14 uuid; BEGIN
  SELECT wt.id INTO v14 FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id WHERE s.code='DWA-A-272E' AND wt.code='A272E-14';
  DELETE FROM fields WHERE worksheet_template_id=v14 AND symbol='variants';
  UPDATE fields SET active=true, description=regexp_replace(description,'\s*\[deaktiviert 2026-08-01:[^\]]*\]','','g') WHERE worksheet_template_id=v14 AND symbol='variants_developed';
END $$;
