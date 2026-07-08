-- =====================================================================================
-- Migration: 20260708130000_dwa_a_131_gate_enforcement
-- Standard:  DWA-A 131 "Bemessung von einstufigen Belebungsanlagen" (Juni 2016, Weißdruck korr.8)
-- Track:     DATA (encoding fixes only; NO engine changes)
-- Status:    WRITTEN-NOT-APPLIED. Do NOT apply/commit from here — orchestrator applies + commits.
--
-- Apply command:
--   node scripts/apply-migration.mjs scripts/migrations/20260708130000_dwa_a_131_gate_enforcement.sql
--
-- SUMMARY
-- -------
-- Closes DWA-A-131's SEV-1 gate-enforcement debt (register item G1) plus confirmed
-- severity over-reach (SEV-3). All thresholds/quotes verified against the RENDERED
-- DWA-A-131 PDF (poppler r140). No value crosses from any other guideline.
--
-- FIX-DRAFT ITEMS ADDRESSED (with pattern IDs)
--   1. [SEV-1 · G1] CR-013 no-op min basin depth  (condition='TRUE' -> real numeric predicate)
--        1a. CR-013: TRUE -> `h_ges >= 3`                         (P-6a/P-6b) §6.7, PDF p.46
--        1b. round-basin Randwassertiefe >= 2,5 m: add field h_Rand + trigger nklb_rund;
--            NEW gate CR-021 `(NOT nklb_rund) OR (h_Rand >= 2.5)` (P-6c) §6.7, PDF p.46
--   2. [SEV-1 · G1] CR-016 arithmetic-in-condition -> reads materialized Gl. B.9 output
--        CR-016: `Q_SR >= (Q_RS*TS_RS - Q_K*TS_BB)/TS_BS` -> `Q_SR >= Q_SR_min` (P-6b) §B.4/B.9
--   3. [SEV-1 · G1] CR-017/018/019/020 `TRUE` cross-reference deferrals -> attestation gates
--        (P-6e) — genuinely non-computable procedural sign-offs to other standards:
--        CR-017 (ATV-DVWK-A 198), CR-018 (DWA-A 202), CR-019 (kleine Becken D<8m -> DWA-A 222/226),
--        CR-020 (DWA-M 229-1). Each gets a boolean attest field + condition `attest_… == True`
--        + requires_attestation=true.
--   4. [SEV-3 · severity] block -> warn for confirmed recommendations ("empfohlen"/"sollte"):
--        CR-004 `V_D_V_BB in [0.2,0.6]`  §5.2.4 "…werden zur Bemessung nicht empfohlen"  (P-6a rule)
--        CR-014 `t_T >= 2`               §7.2   "…ist nicht zu empfehlen"                  (P-6a rule)
--        CR-015 `S_KS_AB >= 1.5`         §7.4   "…sollte den Wert von 1,5 mmol/l nicht unterschreiten"
--
-- LEFT UNFIXED (honest gaps — NOT touched by this migration)
--   * CR-006/007/010 (§6.5/§6.1): OR-of-ANDs with `==` and `*`. RE-VERIFIED against
--     src/lib/compliance/evaluate.ts — the parser DOES support parenthesised OR-of-ANDs,
--     `==`, and `*`. These gates ALREADY ENFORCE and their thresholds are PDF-faithful
--     (q_SV<=500/<=650 vs Tab.5 `≤`; q_A<=1.6/<=2.0; Q_RS<=Q_M / <=0.75*Q_M). No-op. LEFT AS-IS.
--   * CR-012 `RV >= 0.5` (§6.4): NR — could NOT confirm a hard `RV≥0,5 muss` in the PDF.
--     §6.3's "0,5" is TS_RS≈0,5–0,7·TS_BS (Saugräumer), a different quantity. Threshold source
--     unconfirmed -> per never-invent rule, LEFT AS-IS + flagged for Alvaro (may be warn/remove).
--   * Equation completeness (F1 Gl.11 missing; F2 §5.2.3 N-sub-relations; F8 6/8 tables absent)
--     and F3/F4/F5/F6/F7 — NOT gate-enforcement; out of this DATA-track migration's scope.
--
-- ROLLBACK NOTES (manual; no down-migration written)
--   * CR-013:  UPDATE …condition='TRUE' WHERE code='CR-013'.
--   * CR-016:  UPDATE …condition='Q_SR >= (Q_RS * TS_RS - Q_K * TS_BB) / TS_BS' WHERE code='CR-016'.
--   * CR-017/018/019/020: set condition='TRUE', requires_attestation=false; DELETE the four
--     attest_dwa_a_131_cr_0xx fields.
--   * CR-004/014/015: set severity='block'.
--   * CR-021: DELETE requirement code='CR-021'; DELETE fields h_Rand, nklb_rund.
--   All UPDATEs are guarded (old value in WHERE) so re-running is a no-op once applied.
-- =====================================================================================

DO $$
DECLARE
  v_std          uuid;
  v_ws02         uuid;   -- A131-02 (Belastungsdaten)          — CR-017
  v_ws03         uuid;   -- A131-03 (Erf. Schlammalter)         — CR-018
  v_ws06         uuid;   -- A131-06 (Nachklärung)               — CR-013/016/019/020/021
  v_sec02_first  uuid;   -- first section of A131-02
  v_sec03_first  uuid;   -- first section of A131-03
  v_sec06_first  uuid;   -- first section of A131-06
  v_sec06_depth  uuid;   -- A131-06 section G "Beckentiefe" (home of h_ges/h_1..h_4)
  v_oi06         int;
  v_cnt          int;
BEGIN
  -- ---- resolve standard + worksheets ------------------------------------------------
  SELECT id INTO v_std FROM standards WHERE code = 'DWA-A-131';
  IF v_std IS NULL THEN RAISE EXCEPTION 'standard DWA-A-131 not found'; END IF;

  SELECT id INTO v_ws02 FROM worksheet_templates WHERE standard_id = v_std AND code = 'A131-02';
  SELECT id INTO v_ws03 FROM worksheet_templates WHERE standard_id = v_std AND code = 'A131-03';
  SELECT id INTO v_ws06 FROM worksheet_templates WHERE standard_id = v_std AND code = 'A131-06';
  IF v_ws02 IS NULL THEN RAISE EXCEPTION 'worksheet A131-02 not found'; END IF;
  IF v_ws03 IS NULL THEN RAISE EXCEPTION 'worksheet A131-03 not found'; END IF;
  IF v_ws06 IS NULL THEN RAISE EXCEPTION 'worksheet A131-06 not found'; END IF;

  -- first section per worksheet (per 138 field-INSERT pattern)
  SELECT id INTO v_sec02_first FROM worksheet_sections
    WHERE worksheet_template_id = v_ws02 ORDER BY order_index ASC LIMIT 1;
  SELECT id INTO v_sec03_first FROM worksheet_sections
    WHERE worksheet_template_id = v_ws03 ORDER BY order_index ASC LIMIT 1;
  SELECT id INTO v_sec06_first FROM worksheet_sections
    WHERE worksheet_template_id = v_ws06 ORDER BY order_index ASC LIMIT 1;
  -- depth section (G "Beckentiefe") — natural owner for h_Rand / nklb_rund; fall back to first
  SELECT id INTO v_sec06_depth FROM worksheet_sections
    WHERE worksheet_template_id = v_ws06 AND code = 'G' LIMIT 1;
  IF v_sec06_depth IS NULL THEN v_sec06_depth := v_sec06_first; END IF;

  IF v_sec02_first IS NULL OR v_sec03_first IS NULL OR v_sec06_first IS NULL THEN
    RAISE EXCEPTION 'could not resolve first section for one of A131-02/03/06';
  END IF;

  SELECT COALESCE(MAX(order_index), 0) INTO v_oi06 FROM fields WHERE worksheet_template_id = v_ws06;

  -- ================================================================================
  -- FIX 1a — CR-013: TRUE no-op -> real min-depth predicate (P-6a/P-6b)
  --   §6.7, PDF p.46 (rendered): "Die errechnete Beckentiefe h_ges … muss dort
  --   mindestens 3 m betragen." h_ges = Gesamttiefe bei 2/3 Radius/Fließweg (symbol table p.—).
  --   Existing field h_ges (Gl. h_ges = h_1+h_23+h_4) supplies the value.
  -- ================================================================================
  UPDATE compliance_requirements
     SET condition = 'h_ges >= 3'
   WHERE worksheet_template_id = v_ws06
     AND code = 'CR-013'
     AND condition IS DISTINCT FROM 'h_ges >= 3';

  -- ================================================================================
  -- FIX 1b — round-basin Randwassertiefe >= 2,5 m (P-6c conditional)
  --   §6.7, PDF p.46: "Bei runden Nachklärbecken darf die Randwassertiefe 2,5 m
  --   nicht unterschreiten." No basin-shape field exists -> add trigger nklb_rund
  --   (governing dimension = "runde Nachklärbecken", per P-13) + measured h_Rand.
  --   Gate CR-021: (NOT nklb_rund) OR (h_Rand >= 2.5).
  -- ================================================================================
  -- trigger field: basin is round?
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en,
                      data_type, unit, is_required, clause_reference, verification_status,
                      order_index, source_quote, active)
  SELECT v_ws06, v_sec06_depth, 'nklb_rund',
         'Rundes Nachklärbecken', 'Circular settling tank',
         'boolean', '-', false, '§6.7', 'verified_against_standard',
         v_oi06 + 1,
         'Bei runden Nachklärbecken darf die Randwassertiefe 2,5 m nicht unterschreiten. (§6.7, DWA-A 131, Juni 2016)',
         true
  WHERE NOT EXISTS (
    SELECT 1 FROM fields WHERE worksheet_template_id = v_ws06 AND symbol = 'nklb_rund');

  -- measured Randwassertiefe (edge water depth)
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en,
                      data_type, unit, is_required, clause_reference, verification_status,
                      order_index, source_quote, active)
  SELECT v_ws06, v_sec06_depth, 'h_Rand',
         'Randwassertiefe (Rundbecken)', 'Edge water depth (circular tank)',
         'number', 'm', false, '§6.7', 'verified_against_standard',
         v_oi06 + 2,
         'Bei runden Nachklärbecken darf die Randwassertiefe 2,5 m nicht unterschreiten. (§6.7, DWA-A 131, Juni 2016)',
         true
  WHERE NOT EXISTS (
    SELECT 1 FROM fields WHERE worksheet_template_id = v_ws06 AND symbol = 'h_Rand');

  -- gate CR-021 (P-6c). Insert only if absent; converge condition/severity if present.
  IF NOT EXISTS (SELECT 1 FROM compliance_requirements
                  WHERE worksheet_template_id = v_ws06 AND code = 'CR-021') THEN
    INSERT INTO compliance_requirements
      (worksheet_template_id, code, title_de, title_en, condition, severity,
       clause_reference, requires_attestation, description, source_quote, audit_status)
    VALUES
      (v_ws06, 'CR-021',
       'Mindest-Randwassertiefe Rundbecken', 'Minimum edge water depth (circular tank)',
       '(NOT nklb_rund) OR (h_Rand >= 2.5)', 'block',
       '§6.7', false,
       'Bei runden Nachklaerbecken muss die Randwassertiefe mindestens 2,5 m betragen.',
       'Bei runden Nachklärbecken darf die Randwassertiefe 2,5 m nicht unterschreiten. (§6.7, DWA-A 131, Juni 2016)',
       'match');
  ELSE
    UPDATE compliance_requirements
       SET condition = '(NOT nklb_rund) OR (h_Rand >= 2.5)', severity = 'block'
     WHERE worksheet_template_id = v_ws06 AND code = 'CR-021'
       AND (condition IS DISTINCT FROM '(NOT nklb_rund) OR (h_Rand >= 2.5)' OR severity IS DISTINCT FROM 'block');
  END IF;

  -- ================================================================================
  -- FIX 2 — CR-016: arithmetic-in-condition -> reads materialized Gl. B.9 output (P-6b)
  --   §B.4/B.9, PDF Anhang B: Q_SR >= (Q_RS·TS_RS - Q_K·TS_BB)/TS_BS  == Gl. B.9.
  --   Equation B.9 already produces Q_SR_min with this exact RHS -> gate reads the field.
  -- ================================================================================
  UPDATE compliance_requirements
     SET condition = 'Q_SR >= Q_SR_min'
   WHERE worksheet_template_id = v_ws06
     AND code = 'CR-016'
     AND condition IS DISTINCT FROM 'Q_SR >= Q_SR_min';

  -- ================================================================================
  -- FIX 3 — CR-017/018/019/020: `TRUE` cross-reference deferrals -> attestation (P-6e)
  --   Genuinely non-computable procedural sign-offs to other standards. Each gets a
  --   boolean attest field + condition `attest_dwa_a_131_cr_0xx == True` + requires_attestation.
  -- ================================================================================

  -- CR-017 (A131-02) — Belastungsermittlung nach ATV-DVWK-A 198 (§4.1)
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en,
                      data_type, unit, is_required, clause_reference, verification_status,
                      order_index, source_quote, active)
  SELECT v_ws02, v_sec02_first, 'attest_dwa_a_131_cr_017',
         'Bestätigung: Belastungsdaten nach ATV-DVWK-A 198 ermittelt',
         'Attestation: loading data determined per ATV-DVWK-A 198',
         'boolean', '-', true, '§4.1', 'verified_against_standard',
         (SELECT COALESCE(MAX(order_index),0)+1 FROM fields WHERE worksheet_template_id = v_ws02),
         'Die Vorgehensweise zur Ermittlung der maßgebenden Frachten und Konzentrationen ist im Arbeitsblatt ATV-DVWK-A 198 dargestellt. (§4.1, DWA-A 131, Juni 2016)',
         true
  WHERE NOT EXISTS (SELECT 1 FROM fields WHERE worksheet_template_id = v_ws02 AND symbol = 'attest_dwa_a_131_cr_017');

  UPDATE compliance_requirements
     SET condition = 'attest_dwa_a_131_cr_017 == True', requires_attestation = true
   WHERE worksheet_template_id = v_ws02 AND code = 'CR-017'
     AND (condition IS DISTINCT FROM 'attest_dwa_a_131_cr_017 == True' OR requires_attestation IS DISTINCT FROM true);

  -- CR-018 (A131-03) — Phosphorelimination nach DWA-A 202 (§5.3.1)
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en,
                      data_type, unit, is_required, clause_reference, verification_status,
                      order_index, source_quote, active)
  SELECT v_ws03, v_sec03_first, 'attest_dwa_a_131_cr_018',
         'Bestätigung: P-Elimination ergänzend nach DWA-A 202 ausgelegt',
         'Attestation: P-elimination designed per DWA-A 202',
         'boolean', '-', true, '§5.3.1', 'verified_against_standard',
         (SELECT COALESCE(MAX(order_index),0)+1 FROM fields WHERE worksheet_template_id = v_ws03),
         'Phosphorelimination kann alleine durch Simultanfällung … erfolgen (siehe auch Arbeitsblatt DWA-A 202). (§5.3.1, DWA-A 131, Juni 2016)',
         true
  WHERE NOT EXISTS (SELECT 1 FROM fields WHERE worksheet_template_id = v_ws03 AND symbol = 'attest_dwa_a_131_cr_018');

  UPDATE compliance_requirements
     SET condition = 'attest_dwa_a_131_cr_018 == True', requires_attestation = true
   WHERE worksheet_template_id = v_ws03 AND code = 'CR-018'
     AND (condition IS DISTINCT FROM 'attest_dwa_a_131_cr_018 == True' OR requires_attestation IS DISTINCT FROM true);

  -- CR-019 (A131-06) — kleine Becken D<8 m -> DWA-A 222/226 (§6.7)
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en,
                      data_type, unit, is_required, clause_reference, verification_status,
                      order_index, source_quote, active)
  SELECT v_ws06, v_sec06_first, 'attest_dwa_a_131_cr_019',
         'Bestätigung: Geometrie kleiner Becken (D<8 m) nach DWA-A 222/DWA-A 226 geprüft',
         'Attestation: small-tank geometry (D<8 m) checked per DWA-A 222/226',
         'boolean', '-', true, '§6.7', 'verified_against_standard',
         (SELECT COALESCE(MAX(order_index),0)+1 FROM fields WHERE worksheet_template_id = v_ws06),
         'Zusätzlich muss für Becken mit D<8 m eine Überprüfung der Geometrie gemäß Arbeitsblatt DWA-A 222 oder Arbeitsblatt DWA-A 226 erfolgen. (§6.7, DWA-A 131, Juni 2016)',
         true
  WHERE NOT EXISTS (SELECT 1 FROM fields WHERE worksheet_template_id = v_ws06 AND symbol = 'attest_dwa_a_131_cr_019');

  UPDATE compliance_requirements
     SET condition = 'attest_dwa_a_131_cr_019 == True', requires_attestation = true
   WHERE worksheet_template_id = v_ws06 AND code = 'CR-019'
     AND (condition IS DISTINCT FROM 'attest_dwa_a_131_cr_019 == True' OR requires_attestation IS DISTINCT FROM true);

  -- CR-020 (A131-06) — Belüftungsauslegung nach DWA-M 229-1 (§7.3)
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en,
                      data_type, unit, is_required, clause_reference, verification_status,
                      order_index, source_quote, active)
  SELECT v_ws06, v_sec06_first, 'attest_dwa_a_131_cr_020',
         'Bestätigung: Belüftung nach DWA-M 229-1 ausgelegt',
         'Attestation: aeration designed per DWA-M 229-1',
         'boolean', '-', true, '§7.3', 'verified_against_standard',
         (SELECT COALESCE(MAX(order_index),0)+1 FROM fields WHERE worksheet_template_id = v_ws06),
         'Die weitere Auslegung der Belüftung erfolgt unter Verwendung der im Merkblatt DWA-M 229-1 zusammengestellten Empfehlungen … (§7.3, DWA-A 131, Juni 2016)',
         true
  WHERE NOT EXISTS (SELECT 1 FROM fields WHERE worksheet_template_id = v_ws06 AND symbol = 'attest_dwa_a_131_cr_020');

  UPDATE compliance_requirements
     SET condition = 'attest_dwa_a_131_cr_020 == True', requires_attestation = true
   WHERE worksheet_template_id = v_ws06 AND code = 'CR-020'
     AND (condition IS DISTINCT FROM 'attest_dwa_a_131_cr_020 == True' OR requires_attestation IS DISTINCT FROM true);

  -- ================================================================================
  -- FIX 4 — severity block -> warn for confirmed recommendations (P-6a rule)
  -- ================================================================================
  -- CR-004 §5.2.4 PDF p.36: "Denitrifikationsvolumina kleiner als V_D/V_BB = 0,2 und
  --   größer als V_D/V_BB = 0,6 werden zur Bemessung nicht empfohlen." -> WARN.
  UPDATE compliance_requirements
     SET severity = 'warn'
   WHERE worksheet_template_id = v_ws03 AND code = 'CR-004' AND severity IS DISTINCT FROM 'warn';

  -- CR-014 §7.2 PDF p.49: "Eine Taktdauer von weniger als 2 Stunden ist nicht zu empfehlen." -> WARN.
  SELECT id INTO v_cnt FROM worksheet_templates WHERE standard_id = v_std AND code = 'A131-07';
  UPDATE compliance_requirements
     SET severity = 'warn'
   WHERE code = 'CR-014' AND severity IS DISTINCT FROM 'warn'
     AND worksheet_template_id = (SELECT id FROM worksheet_templates WHERE standard_id = v_std AND code = 'A131-07');

  -- CR-015 §7.4 PDF p.52: "Die Säurekapazität sollte den Wert von S_KS,AB = 1,5 mmol/l
  --   nicht unterschreiten …" -> sollte = WARN.
  UPDATE compliance_requirements
     SET severity = 'warn'
   WHERE code = 'CR-015' AND severity IS DISTINCT FROM 'warn'
     AND worksheet_template_id = (SELECT id FROM worksheet_templates WHERE standard_id = v_std AND code = 'A131-08');

  -- ---- guard: SEV-1 no-op must be gone -----------------------------------------------
  SELECT COUNT(*) INTO v_cnt
    FROM compliance_requirements cr
    JOIN worksheet_templates wt ON wt.id = cr.worksheet_template_id
   WHERE wt.standard_id = v_std
     AND cr.severity = 'block'
     AND cr.condition = 'TRUE';
  IF v_cnt <> 0 THEN
    RAISE EXCEPTION 'DWA-A-131 still has % block gate(s) with condition=TRUE after migration', v_cnt;
  END IF;

  RAISE NOTICE 'DWA-A-131 gate-enforcement migration applied: CR-013/016 rewritten, CR-017-020 -> attestation, CR-021 added, CR-004/014/015 -> warn.';
END $$;
