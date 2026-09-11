DO $$
DECLARE v_a222 uuid; v_1200 uuid;
BEGIN
  SELECT wt.id INTO v_a222 FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id WHERE s.code='DWA-A-222' AND wt.code='A222-16';
  SELECT wt.id INTO v_1200 FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id WHERE s.code='DWA-M-1200-3' AND wt.code='M12003-01';

  DELETE FROM fields WHERE worksheet_template_id=v_a222 AND symbol IN ('garantiewerte_dokumentiert','verifikation_inbetriebnahme');
  DELETE FROM fields WHERE worksheet_template_id=v_1200 AND symbol IN ('alle_hygieneanforderungen_erfuellt','filter_und_desinfektion_gemaess_gueteklasse','beide_punkte_dokumentiert');

  UPDATE compliance_requirements SET condition='Engineer bestätigt' WHERE code='REQ-08'
    AND worksheet_template_id IN (SELECT wt.id FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id WHERE s.code='DWA-M-187' AND wt.code='M187-10');

  UPDATE fields SET symbol='c_aox_grossküche'
    WHERE symbol='c_aox_grosskueche' AND worksheet_template_id IN (SELECT wt.id FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id WHERE s.code='DWA-M-760');
  UPDATE compliance_requirements SET condition='c_aox_grossküche <= 1' WHERE code='REQ-M760-06' AND condition='c_aox_grosskueche <= 1';

  UPDATE compliance_requirements SET condition='rule_speichervolumen_per_verwertung' WHERE code='C363-06' AND coalesce(trim(condition),'')='';
  UPDATE compliance_requirements SET condition='invest_kosten IS NOT NULL AND betriebskosten_a IS NOT NULL AND entsorgungskosten_a IS NOT NULL AND energieverbrauch IS NOT NULL' WHERE code='REQ-M760-12' AND coalesce(trim(condition),'')='';

  RAISE NOTICE 'broken gates rollback complete';
END $$;
