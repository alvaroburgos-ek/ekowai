-- ─────────────────────────────────────────────────────────────────────────────
-- DWA-M 820-2 · 820-2-10 (Risikomanagement) · add the detailed risk register
-- ─────────────────────────────────────────────────────────────────────────────
-- §4.8 explicitly directs the user to the risk analysis of DWA-M 820-1 Anhang A
-- ("Fundierte Risikoanalysen (Hinweise gibt Merkblatt DWA-M 820-1:2020 in Anhang
-- A) für die verschiedenen Risikogruppen"). 820-2-10 only had two boolean
-- attestations (risk_register_present, risk_distribution_fair — both feed BLOCK
-- gates REQ-20/REQ-03 and are KEPT). This adds a `risk_register` json field so the
-- same structured catalogue+assessment editor renders here (no code change — the
-- RiskRegisterEditor dispatches on the `risk_register` symbol). Cross-reference to
-- DWA-M 820-1 is explicit in clause_reference (content-boundary compliant).
--   Apply:    node scripts/apply-migration.mjs scripts/migrations/20260801290000_m820_2_10_risk_register.sql
--   Rollback: node scripts/apply-migration.mjs scripts/rollback-20260801290000-m820-2-10-risk-register.sql
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE v_ws uuid;
BEGIN
  SELECT wt.id INTO v_ws FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
  WHERE s.code = 'DWA-M-820-2' AND wt.code = '820-2-10';
  IF v_ws IS NULL THEN RAISE EXCEPTION '820-2-10 not found'; END IF;

  IF NOT EXISTS (SELECT 1 FROM fields WHERE worksheet_template_id = v_ws AND symbol = 'risk_register') THEN
    INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type,
                        is_required, clause_reference, description, order_index, verification_status, active)
    VALUES (v_ws, NULL, 'risk_register', 'Risikoregister', 'Risk register', 'json', false,
            '§4.8 (Risikoanalyse nach DWA-M 820-1, Anhang A)',
            'Strukturiertes Risikoregister nach der Methodik DWA-M 820-1 Anhang A (Tab. A.1), auf die §4.8 ausdrücklich verweist: Risikogruppen-Katalog + Bewertung durch Bauherr/Planer/Betrieb (Eintretenswahrscheinlichkeit × Schaden). Referenz auf DWA-M 820-1.',
            5, 'imported_unverified', true);
  END IF;

  RAISE NOTICE '820-2-10 risk_register added (references DWA-M 820-1 Anhang A)';
END $$;
