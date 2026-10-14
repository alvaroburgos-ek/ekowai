-- ============================================================================
-- ROLLBACK for dwa-m-1200-3-bp3-cr15-pack.sql — restores CR-15 to `== 'D'`
-- (audit note line kept as history) and removes M12003-08 from the
-- M12003-01 `anwendungsbereich` consumers.
-- ============================================================================

UPDATE compliance_requirements cr SET
  condition = 'anwendungsbereich != ''frostschutzberegnung'' OR (gueteklasse == ''D'' AND schulung_durchgefuehrt == True)'
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE cr.worksheet_template_id = wt.id AND s.code = 'DWA-M-1200-3'
  AND wt.code = 'M12003-08' AND cr.code = 'CR-15';

UPDATE fields f SET
  consumer_worksheets = array_remove(f.consumer_worksheets, 'M12003-08')
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE f.worksheet_template_id = wt.id AND s.code = 'DWA-M-1200-3'
  AND wt.code = 'M12003-01' AND f.symbol = 'anwendungsbereich';
