DO $$
DECLARE v_std uuid;
BEGIN
  SELECT id INTO v_std FROM standards WHERE code='ISO-14050';
  UPDATE fields SET enum_values = replace(enum_values::text, 'under study"', 'under study 3.12 Terms relating to economy and finance"')::jsonb
   WHERE symbol='term__3_11' AND worksheet_template_id IN (SELECT id FROM worksheet_templates WHERE standard_id=v_std);
  UPDATE compliance_requirements SET source_quote=NULL, source_file=NULL, audited_at=NULL, audited_by=NULL
   WHERE audited_by='ISO-14050 wave8 quote backfill · claude-fable-5 · PDF-verbatim';
  RAISE NOTICE 'ISO-14050 wave8 rolled back';
END $$;
