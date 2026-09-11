-- ─────────────────────────────────────────────────────────────────────────────
-- Broken-gate remediation — 8 gates referencing a symbol that is no field anywhere
-- in the standard (corpus scan). Per-gate faithful fix.
--   Apply:    node scripts/apply-migration.mjs scripts/migrations/20260801350000_broken_gates_fix.sql
--   Rollback: node scripts/apply-migration.mjs scripts/rollback-20260801350000-broken-gates.sql
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE v_a222 uuid; v_1200 uuid;
BEGIN
  -- helper worksheet ids
  SELECT wt.id INTO v_a222 FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id WHERE s.code='DWA-A-222' AND wt.code='A222-16';
  SELECT wt.id INTO v_1200 FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id WHERE s.code='DWA-M-1200-3' AND wt.code='M12003-01';

  -- 1) DWA-A-222 · A222-16 · CR-033 — add the two attestation booleans it needs (§4.3.7).
  IF v_a222 IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM fields WHERE worksheet_template_id=v_a222 AND symbol='garantiewerte_dokumentiert') THEN
      INSERT INTO fields (worksheet_template_id, symbol, label_de, data_type, is_required, clause_reference, description, order_index, verification_status, active)
      VALUES (v_a222,'garantiewerte_dokumentiert','Garantiewerte dokumentiert','boolean',false,'§4.3.7','Garantiewerte dokumentiert (§4.3.7).',60,'imported_unverified',true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM fields WHERE worksheet_template_id=v_a222 AND symbol='verifikation_inbetriebnahme') THEN
      INSERT INTO fields (worksheet_template_id, symbol, label_de, data_type, is_required, clause_reference, description, order_index, verification_status, active)
      VALUES (v_a222,'verifikation_inbetriebnahme','Verifikation bei Inbetriebnahme','boolean',false,'§4.3.7','Verifikation der Werte bei Inbetriebnahme (§4.3.7).',61,'imported_unverified',true);
    END IF;
  END IF;

  -- 2) DWA-M-1200-3 · M12003-01 · CR-11/12/13 — add the three attestation booleans.
  IF v_1200 IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM fields WHERE worksheet_template_id=v_1200 AND symbol='alle_hygieneanforderungen_erfuellt') THEN
      INSERT INTO fields (worksheet_template_id, symbol, label_de, data_type, is_required, clause_reference, description, order_index, verification_status, active)
      VALUES (v_1200,'alle_hygieneanforderungen_erfuellt','Alle Hygieneanforderungen erfüllt','boolean',false,'§7.1/§7.3','Alle Hygieneanforderungen der Güteklasse erfüllt (§7).',60,'imported_unverified',true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM fields WHERE worksheet_template_id=v_1200 AND symbol='filter_und_desinfektion_gemaess_gueteklasse') THEN
      INSERT INTO fields (worksheet_template_id, symbol, label_de, data_type, is_required, clause_reference, description, order_index, verification_status, active)
      VALUES (v_1200,'filter_und_desinfektion_gemaess_gueteklasse','Filter und Desinfektion gemäß Güteklasse','boolean',false,'§7.3.2','Filter und Desinfektion gemäß Güteklasse (§7.3.2).',61,'imported_unverified',true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM fields WHERE worksheet_template_id=v_1200 AND symbol='beide_punkte_dokumentiert') THEN
      INSERT INTO fields (worksheet_template_id, symbol, label_de, data_type, is_required, clause_reference, description, order_index, verification_status, active)
      VALUES (v_1200,'beide_punkte_dokumentiert','Abstandsregelungen und Kennzeichnung dokumentiert','boolean',false,'§5.1.3/§5.1.4','Abstandsregelungen/Spritzschutz und Kennzeichnung der Verteilungsinfrastruktur dokumentiert (§5.1.3/§5.1.4).',62,'imported_unverified',true);
    END IF;
  END IF;

  -- 3) DWA-M-187 · M187-10 · REQ-08 — prose "Engineer bestätigt" → canonical attestation.
  UPDATE compliance_requirements SET condition='engineer-verified'
   WHERE code='REQ-08' AND condition='Engineer bestätigt'
     AND worksheet_template_id IN (SELECT wt.id FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id WHERE s.code='DWA-M-187' AND wt.code='M187-10');

  -- 4) DWA-M-760 · non-ASCII field symbol (ü) breaks the parser → rename + fix the gate.
  UPDATE fields SET symbol='c_aox_grosskueche'
   WHERE symbol='c_aox_grossküche'
     AND worksheet_template_id IN (SELECT wt.id FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id WHERE s.code='DWA-M-760');
  UPDATE compliance_requirements SET condition='c_aox_grosskueche <= 1'
   WHERE code='REQ-M760-06' AND condition='c_aox_grossküche <= 1';

  -- 5) DWA-M-363 · C363-06 — `rule_…` symbol (computed rule not implemented) → manual attestation.
  UPDATE compliance_requirements SET condition=''
   WHERE code='C363-06' AND condition='rule_speichervolumen_per_verwertung';

  -- 6) DWA-M-760 · M760-24 · REQ-M760-12 — cost-completeness check whose cost fields do not
  --    exist in M760 and sits on a sampling worksheet (mis-homed) → manual attestation; re-home
  --    to a proper §12 Kostenvergleich worksheet with fields on the sign-off sheet.
  UPDATE compliance_requirements SET condition=''
   WHERE code='REQ-M760-12'
     AND condition LIKE 'invest_kosten IS NOT NULL%';

  RAISE NOTICE 'broken gates remediated (5 fields added, 1 renamed, 1 prose→attestation, 2 cleared to manual)';
END $$;
