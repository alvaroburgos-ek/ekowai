-- DWA-M 816 · M816-02 alternatives + M816-05 component_costs registers.
-- alternatives: §3.2/§5.x.3 (alternative_count [REQ-04] + partial_replication_flag [M816-19] KEPT;
--   single alternative_id subsumed → deprecated). component_costs: §6.4 Komponentenansatz
--   (ahk_per_component + component_count subsumed → deprecated; nothing consumes them).
--   Apply:    node scripts/apply-migration.mjs scripts/migrations/20260801340000_m816_registers.sql
--   Rollback: node scripts/apply-migration.mjs scripts/rollback-20260801340000-m816-registers.sql
DO $$
DECLARE v2 uuid; v5 uuid;
BEGIN
  SELECT wt.id INTO v2 FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id WHERE s.code='DWA-M-816' AND wt.code='M816-02';
  SELECT wt.id INTO v5 FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id WHERE s.code='DWA-M-816' AND wt.code='M816-05';
  IF v2 IS NULL OR v5 IS NULL THEN RAISE EXCEPTION 'M816 worksheets not found'; END IF;

  IF NOT EXISTS (SELECT 1 FROM fields WHERE worksheet_template_id=v2 AND symbol='alternatives') THEN
    INSERT INTO fields (worksheet_template_id, symbol, label_de, label_en, data_type, is_required, clause_reference, description, order_index, verification_status, active)
    VALUES (v2, 'alternatives', 'Investitionsalternativen', 'Investment alternatives', 'json', false, '§3.2, §5.x.3',
            'Register der zu vergleichenden Investitionsalternativen (§3.2): Kennung + Bezeichnung. Mind. 2 (REQ-04).', 5, 'imported_unverified', true);
  END IF;
  UPDATE fields SET active=false, description=COALESCE(description,'')||' [deaktiviert 2026-08-01: in Alternativen-Register überführt.]'
    WHERE worksheet_template_id=v2 AND symbol='alternative_id' AND active=true;

  IF NOT EXISTS (SELECT 1 FROM fields WHERE worksheet_template_id=v5 AND symbol='component_costs') THEN
    INSERT INTO fields (worksheet_template_id, symbol, label_de, label_en, data_type, is_required, clause_reference, description, order_index, verification_status, active)
    VALUES (v5, 'component_costs', 'Investitionskosten je Komponente', 'Investment costs per component', 'json', false, '§6.4',
            'Register der Komponenten (§6.4 Komponentenansatz): Komponente + AHK (€) + Nutzungsdauer (a). Gesamt-AHK und Anzahl abgeleitet.', 5, 'imported_unverified', true);
  END IF;
  UPDATE fields SET active=false, description=COALESCE(description,'')||' [deaktiviert 2026-08-01: in Komponenten-Register (AHK je Komponente) überführt.]'
    WHERE worksheet_template_id=v5 AND symbol IN ('ahk_per_component','component_count') AND active=true;

  RAISE NOTICE 'M816 alternatives + component_costs registers added';
END $$;
