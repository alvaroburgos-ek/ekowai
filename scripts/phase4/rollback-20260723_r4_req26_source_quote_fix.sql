-- =============================================================================
-- ROLLBACK 20260723_r4_req26_source_quote_fix
-- Restores REQ-26 (A138-26) source_quote to the pre-migration prod value
-- (the mispasted Gl.(10) Dauerstufe note), captured live from prod
-- vadsmshzebefjreqcicl on 2026-07-23 before apply. severity/condition/
-- audit_status NOT touched.
-- =============================================================================
UPDATE compliance_requirements cr
SET source_quote = 'Die Ermittlung der massgeblichen Dauerstufe des Bemessungsregens D erfolgt iterativ fuer unterschiedliche Dauerstufen D und jeweils zugehoeriger Regenspende r_D(30); Anmerkung: ergibt die Berechnung nach Gl. (10) ein negatives Ergebnis fuer V_Rueck, so wird V_Rueck = 0 gesetzt.'
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id AND s.code = 'DWA-A-138-1'
WHERE cr.worksheet_template_id = wt.id
  AND wt.code = 'A138-26'
  AND cr.code = 'A138-REQ-26';
