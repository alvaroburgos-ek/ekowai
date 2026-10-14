-- ============================================================================
-- DWA-M 1200-3 (draft 07/2025) · Ratification BP-3 remainder · §5.6.5
-- New attestation field + block gate on M12003-08: groundwater impact of
-- frost-protection irrigation considered in the RMP.
-- Source (rendered PDF p. 45 l. 3–4, checked on the page image 2026-10-14):
--   "Auswirkungen auf den Grundwasserkörper müssen bei der Anwendung
--    berücksichtigt werden. Das ist durch den RMP zu betrachten."
-- "müssen" / "ist … zu" = mandatory → severity block.
-- Scope: the field shows only when anwendungsbereich (M12003-01, inherited by
-- M12003-08 since pack dwa-m-1200-3-bp3-cr15-pack.sql) = frostschutzberegnung;
-- for every other use the gate passes (and is not_applicable while hidden).
-- Guards: NOT EXISTS → re-running is a no-op.
-- Rollback: rollback-dwa-m-1200-3-bp3-groundwater-rmp-pack.sql
-- ============================================================================

INSERT INTO fields (worksheet_template_id, symbol, label_de, label_en, data_type, is_required,
                    order_index, active, description, clause_reference, visible_when,
                    verification_status, verification_quote, verification_note, verified_at)
SELECT wt.id, 'grundwasser_auswirkung_rmp_betrachtet',
  'Auswirkungen auf den Grundwasserkörper im RMP betrachtet',
  'Impact on the groundwater body considered in the RMP',
  'boolean', false, 0, true,
  'Frostschutzberegnung: Auswirkungen auf den Grundwasserkörper müssen bei der Anwendung berücksichtigt und im Risikomanagementplan (RMP) betrachtet werden.',
  '§5.6.5',
  'anwendungsbereich == ''frostschutzberegnung''',
  'verified_against_standard',
  'Auswirkungen auf den Grundwasserkörper müssen bei der Anwendung berücksichtigt werden. Das ist durch den RMP zu betrachten. — printed p. 45 l. 3–4',
  'BP-3 2026-10-14, DWA-M 1200-3 Gelbdruck 07/2025, rendered PDF p. 45 (printed = physical), §5.6.5',
  now()
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-M-1200-3' AND wt.code = 'M12003-08'
  AND NOT EXISTS (SELECT 1 FROM fields f WHERE f.worksheet_template_id = wt.id
                  AND f.symbol = 'grundwasser_auswirkung_rmp_betrachtet');

INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, title_en, condition,
                                     clause_reference, severity, description, suggestion,
                                     source_quote, audit_notes, requires_attestation)
SELECT wt.id, 'CR-15-GW',
  'Frostschutzberegnung: Grundwasserauswirkung im RMP betrachtet',
  'Frost-protection irrigation: groundwater impact considered in the RMP',
  'anwendungsbereich != ''frostschutzberegnung'' OR grundwasser_auswirkung_rmp_betrachtet == True',
  '5.6.5 Frostschutzberegnung', 'block',
  'Bei Frostschutzberegnung müssen die Auswirkungen auf den Grundwasserkörper berücksichtigt und durch den RMP betrachtet werden.',
  'Auswirkungen auf den Grundwasserkörper im RMP betrachten und hier bestätigen (DWA-M 1200-3, 5.6.5).',
  'Auswirkungen auf den Grundwasserkörper müssen bei der Anwendung berücksichtigt werden. Das ist durch den RMP zu betrachten.',
  '2026-10-14 BP-3 remainder: new gate from p. 45 l. 3–4 (study-book cross-check, Ratification BP-3).',
  false
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-M-1200-3' AND wt.code = 'M12003-08'
  AND NOT EXISTS (SELECT 1 FROM compliance_requirements c WHERE c.worksheet_template_id = wt.id
                  AND c.code = 'CR-15-GW');
