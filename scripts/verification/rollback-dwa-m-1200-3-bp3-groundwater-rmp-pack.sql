-- ROLLBACK for dwa-m-1200-3-bp3-groundwater-rmp-pack.sql — removes the gate,
-- then deactivates the field (kept, so any entered values stay readable).
DELETE FROM compliance_requirements c USING worksheet_templates wt, standards s
WHERE c.worksheet_template_id = wt.id AND s.id = wt.standard_id
  AND s.code = 'DWA-M-1200-3' AND wt.code = 'M12003-08' AND c.code = 'CR-15-GW';

UPDATE fields f SET active = false
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE f.worksheet_template_id = wt.id AND s.code = 'DWA-M-1200-3'
  AND wt.code = 'M12003-08' AND f.symbol = 'grundwasser_auswirkung_rmp_betrachtet';
