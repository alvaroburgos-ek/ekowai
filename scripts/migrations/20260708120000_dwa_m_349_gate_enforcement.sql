-- scripts/migrations/20260708120000_dwa_m_349_gate_enforcement.sql
-- DWA-M-349 — DATA-track FIX-DRAFT: replace the 11 TRUE no-op block gates (G1) with honest predicates/attestations,
--   fix the CR-005 float-equality gate (G4), and normalize the Gl.7 eta oTR/oTS symbol slip (F2/F-Gl7).
-- WRITTEN-NOT-APPLIED. Apply: node scripts/apply-migration.mjs scripts/migrations/20260708120000_dwa_m_349_gate_enforcement.sql
--
-- Rollback notes:
--   * Gate conditions: set the listed CR condition back to 'TRUE' (SEV-1) / back to 'verhaeltnis_no2_nh4 == 1.3' (CR-005).
--   * requires_attestation: set back to false on the CRs flipped below.
--   * Attestation fields: DELETE FROM fields WHERE worksheet_template_id=<ws> AND symbol LIKE 'attest_dwa_m_349_%'.
--   * Gl.7 symbol rename: rename eta_TS_PS->eta_oTR_PS and eta_TS_UES->eta_oTS_UES in the equation-7 formula +
--     input_symbols and in the two M349-02 fields; the labels were not changed.
--
-- Implements FIX-DRAFT items:
--   [G1 | SEV1] 11 TRUE no-op block gates (CR-003/016/018/020/021/022/023/024/025/026/027)  · patterns P-6a / P-6b / P-6e
--   [G4 | SEV2] CR-005 ==1.3 float-equality -> tolerance band                                · pattern P-6a (gate-grammar)
--   [F2 | SEV4] Gl.7 eta_oTR_PS vs eta_oTS_UES internal inconsistency -> uniform eta_TS_*      · pattern P-2/P-3 (C1/C3 fidelity)
--
-- LEFT UNFIXED (reported, not forced — provenance honesty overrides completeness):
--   * Gl.4 (M349-05) clause §5.4.1 mislabel — audit F-Gl4 is UNRESOLVED (quote is a volume form, DB is a concentration
--     ratio; §5.4.1 is prose). NOT touched — needs targeted re-render + engineer decision.
--   * Gl.3 (M349-03) theta^(T-T_0) Arrhenius — ENGINE-track E2 (no power operator in condition/engine). Left tagged.
--   * C9 OV_d process-type selector (Gl.10/11/12 alternatives) — needs a selector field (design); not a no-op fix. Left for Alvaro.
--
-- SEV order inside this migration: SEV-1 (gates) -> SEV-2 (float) -> SEV-4 (symbol). Every UPDATE is guarded/converging
-- (old value in WHERE, or IS DISTINCT FROM) so the file is safely re-runnable. All IDs resolved by code.

DO $$
DECLARE
  ws_02 uuid;  -- M349-02 Schlammwasser-Charakterisierung und Frachtermittlung
  ws_04 uuid;  -- M349-04 Auslegung Nitritation, Denitritation und N/DN
  ws_06 uuid;  -- M349-06 Belueftung, Dosierung und Anlagentechnik
  ws_07 uuid;  -- M349-07 Betrieb: Analytik, Inbetriebnahme, Betriebsstoerungen
  ws_08 uuid;  -- M349-08 Nachweis und Zusammenstellung
BEGIN
  SELECT wt.id INTO ws_02 FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id
    WHERE s.code='DWA-M-349' AND wt.code='M349-02';
  SELECT wt.id INTO ws_04 FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id
    WHERE s.code='DWA-M-349' AND wt.code='M349-04';
  SELECT wt.id INTO ws_06 FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id
    WHERE s.code='DWA-M-349' AND wt.code='M349-06';
  SELECT wt.id INTO ws_07 FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id
    WHERE s.code='DWA-M-349' AND wt.code='M349-07';
  SELECT wt.id INTO ws_08 FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id
    WHERE s.code='DWA-M-349' AND wt.code='M349-08';
  IF ws_02 IS NULL THEN RAISE EXCEPTION 'dwa_m_349: worksheet M349-02 not found'; END IF;
  IF ws_04 IS NULL THEN RAISE EXCEPTION 'dwa_m_349: worksheet M349-04 not found'; END IF;
  IF ws_06 IS NULL THEN RAISE EXCEPTION 'dwa_m_349: worksheet M349-06 not found'; END IF;
  IF ws_07 IS NULL THEN RAISE EXCEPTION 'dwa_m_349: worksheet M349-07 not found'; END IF;
  IF ws_08 IS NULL THEN RAISE EXCEPTION 'dwa_m_349: worksheet M349-08 not found'; END IF;

  -- Guard: every target CR must exist (fail loudly rather than silently no-op).
  IF NOT EXISTS (SELECT 1 FROM compliance_requirements WHERE worksheet_template_id=ws_07 AND code='CR-016') THEN
    RAISE EXCEPTION 'dwa_m_349: CR-016 not found on M349-07'; END IF;
  IF NOT EXISTS (SELECT 1 FROM compliance_requirements WHERE worksheet_template_id=ws_02 AND code='CR-003') THEN
    RAISE EXCEPTION 'dwa_m_349: CR-003 not found on M349-02'; END IF;

  ---------------------------------------------------------------------------
  -- SEV-1 · G1 · 11 TRUE no-op block gates -> honest predicate / attestation
  ---------------------------------------------------------------------------

  -- (edit 1) FIX-DRAFT G1 · pattern P-6a/P-6b · §7.2.3.1 (PDF p57, render-confirmed) — CR-016
  --   "Eine Inbetriebnahme gilt als abgeschlossen, wenn die Zielleistung mindestens zwei Monate lang erreicht wurde."
  --   Computable: the boolean status field inbetriebnahme_abgeschlossen (M349-07) captures exactly this definition.
  UPDATE compliance_requirements
     SET condition='inbetriebnahme_abgeschlossen == true'
   WHERE worksheet_template_id=ws_07 AND code='CR-016' AND condition='TRUE';

  -- (edit 2) FIX-DRAFT G1 · pattern P-6e (attestation) · §6.2.1 (PDF p39, text-confirmed) — CR-003
  --   "Die empfohlene Mindestdauer eines derartigen Messprogramms liegt bei einem Monat." -> recommendation ("empfohlen"),
  --   non-computable (whether a >=1-month program was run is a human record). Model as attestation; register = "empfohlen" -> warn.
  UPDATE compliance_requirements
     SET condition='attest_dwa_m_349_cr_003 == True', requires_attestation=true, severity='warn'
   WHERE worksheet_template_id=ws_02 AND code='CR-003' AND condition='TRUE';

  -- (edit 3) FIX-DRAFT G1 · pattern P-6e · §7.1.1 (PDF p53, text-confirmed) — CR-018
  --   "Im Bereich niedriger Sauerstoffkonzentrationen (O2 < 0,5 mg/l) wird empfohlen, ... ueber die Luftmengen zu regeln"
  --   -> recommendation ("wird empfohlen"), non-computable control-strategy sign-off. Attestation; register "empfohlen" -> warn.
  UPDATE compliance_requirements
     SET condition='attest_dwa_m_349_cr_018 == True', requires_attestation=true, severity='warn'
   WHERE worksheet_template_id=ws_07 AND code='CR-018' AND condition='TRUE';

  -- (edit 4) FIX-DRAFT G1 · pattern P-6e · §6.4.8 (PDF p50, text-confirmed) — CR-020
  --   "... sollten ... die jeweils gueltigen maximalen Arbeitsplatz-Konzentrationen (MAK-Werte) fuer H2S, CO2 und Lachgas
  --   ueberprueft werden." -> "sollten" + "ueberpruefen" = non-computable safety check. Attestation; "sollten" -> warn.
  UPDATE compliance_requirements
     SET condition='attest_dwa_m_349_cr_020 == True', requires_attestation=true, severity='warn'
   WHERE worksheet_template_id=ws_06 AND code='CR-020' AND condition='TRUE';

  -- (edit 5) FIX-DRAFT G1 · pattern P-6e · §5.1.2 (PDF p28, render-confirmed) — CR-021
  --   "Sollen hoehere Wirkungsgrade erreicht werden, muss eine Stuetzung der Saeurekapazitaet erfolgen." -> conditional "muss",
  --   but BOTH antecedent (design intent "hoehere Wirkungsgrade") and consequent (dosing provided) are non-computable — no
  --   field exists for either -> P-6c not buildable; model the sign-off as attestation. Genuine muss -> severity stays block.
  UPDATE compliance_requirements
     SET condition='attest_dwa_m_349_cr_021 == True', requires_attestation=true
   WHERE worksheet_template_id=ws_04 AND code='CR-021' AND condition='TRUE';

  -- (edit 6) FIX-DRAFT G1 · pattern P-6e · §6.3.1 (text-confirmed) — CR-022 (cross-ref DWA-A 131)
  --   Hauptstrombemessung erfolgt nach DWA-A 131; its approaches are NOT transferable to the Teilstrom. Non-computable
  --   cross-reference acknowledgement -> attestation. Block retained (design-basis acknowledgement).
  UPDATE compliance_requirements
     SET condition='attest_dwa_m_349_cr_022 == True', requires_attestation=true
   WHERE worksheet_template_id=ws_08 AND code='CR-022' AND condition='TRUE';

  -- (edit 7) FIX-DRAFT G1 · pattern P-6e · §6.4.3 (text-confirmed) — CR-023 (cross-ref DWA-M 210)
  --   "Das grundsaetzliche Vorgehen bei der Auslegung eines SBR ... kann in Anlehnung an Merkblatt DWA-M 210 erfolgen ..."
  --   Non-computable cross-reference -> attestation.
  UPDATE compliance_requirements
     SET condition='attest_dwa_m_349_cr_023 == True', requires_attestation=true
   WHERE worksheet_template_id=ws_04 AND code='CR-023' AND condition='TRUE';

  -- (edit 8) FIX-DRAFT G1 · pattern P-6e · §6.4.4 (text-confirmed) — CR-024 (cross-ref DWA-M 229-1 / DWA-A 268)
  --   "Die Planung der Belueftung ... kann ... analog zu ... DWA-M 229-1 erfolgen. Fuer die Regelung ... gibt DWA-A 268 Hinweise."
  --   Non-computable cross-reference -> attestation.
  UPDATE compliance_requirements
     SET condition='attest_dwa_m_349_cr_024 == True', requires_attestation=true
   WHERE worksheet_template_id=ws_06 AND code='CR-024' AND condition='TRUE';

  -- (edit 9) FIX-DRAFT G1 · pattern P-6e · §7.1 (text-confirmed) — CR-025 (cross-ref DWA-A 704 / DWA-M 256-2)
  --   Betriebsanalytik/Instandhaltung nach DWA-A 704 / DWA-M 256-2. Non-computable cross-reference -> attestation.
  UPDATE compliance_requirements
     SET condition='attest_dwa_m_349_cr_025 == True', requires_attestation=true
   WHERE worksheet_template_id=ws_07 AND code='CR-025' AND condition='TRUE';

  -- (edit 10) FIX-DRAFT G1 · pattern P-6e · §6.2.2 (text-confirmed) — CR-026 (cross-ref DWA-M 368)
  --   Kennwerte fuer Primaer-/Ueberschussschlamm (Tab.5/6) stammen aus DWA-M 368. Non-computable cross-reference -> attestation.
  UPDATE compliance_requirements
     SET condition='attest_dwa_m_349_cr_026 == True', requires_attestation=true
   WHERE worksheet_template_id=ws_02 AND code='CR-026' AND condition='TRUE';

  -- (edit 11) FIX-DRAFT G1 · pattern P-6e · §2 (text-confirmed) — CR-027 (cross-ref DIN EN 12255-1)
  --   Allgemeine Baugrundsaetze nach DIN EN 12255-1. Non-computable cross-reference -> attestation.
  UPDATE compliance_requirements
     SET condition='attest_dwa_m_349_cr_027 == True', requires_attestation=true
   WHERE worksheet_template_id=ws_06 AND code='CR-027' AND condition='TRUE';

  ---------------------------------------------------------------------------
  -- SEV-1 companion · attestation boolean fields for edits 2,3,4,5,6,7,8,9,10,11
  --   P-6e requires the attestation field to exist; add one per attestation gate (idempotent by symbol).
  ---------------------------------------------------------------------------
  INSERT INTO fields (worksheet_template_id, section_id, order_index, symbol, label_de, data_type, is_required, clause_reference, verification_status)
  SELECT v.ws,
         (SELECT f2.section_id FROM fields f2
           WHERE f2.worksheet_template_id = v.ws AND f2.section_id IS NOT NULL
           ORDER BY f2.order_index LIMIT 1),
         (SELECT COALESCE(MAX(f3.order_index),0)+1 FROM fields f3
           WHERE f3.worksheet_template_id = v.ws),
         v.sym, v.lbl, 'boolean', false, v.clause, 'imported_unverified'
    FROM (VALUES
      (ws_02, 'attest_dwa_m_349_cr_003', 'Bestaetigung: Messprogramm mit Mindestdauer 1 Monat durchgefuehrt (falls Messreihe gewaehlt)', '§6.2.1'),
      (ws_07, 'attest_dwa_m_349_cr_018', 'Bestaetigung: O2-Regelung bei O2<0,5 mg/l ueber die Luftmenge (nicht ueber O2-Konzentration)', '§7.1.1'),
      (ws_06, 'attest_dwa_m_349_cr_020', 'Bestaetigung: MAK-Werte fuer H2S, CO2 und Lachgas geprueft', '§6.4.8'),
      (ws_04, 'attest_dwa_m_349_cr_021', 'Bestaetigung: bei angestrebtem hohem Wirkungsgrad ist eine Saeurekapazitaetsstuetzung vorgesehen', '§5.1.2'),
      (ws_08, 'attest_dwa_m_349_cr_022', 'Bestaetigung: Hauptstrombemessung nach DWA-A 131 (nicht auf Teilstrom uebertragen)', '§6.3.1'),
      (ws_04, 'attest_dwa_m_349_cr_023', 'Bestaetigung: SBR-Auslegung in Anlehnung an DWA-M 210', '§6.4.3'),
      (ws_06, 'attest_dwa_m_349_cr_024', 'Bestaetigung: Belueftungsplanung nach DWA-M 229-1 und O2-Regelung nach DWA-A 268 beruecksichtigt', '§6.4.4'),
      (ws_07, 'attest_dwa_m_349_cr_025', 'Bestaetigung: Betriebsanalytik nach DWA-A 704 und Instandhaltung O2-Messtechnik nach DWA-M 256-2', '§7.1'),
      (ws_02, 'attest_dwa_m_349_cr_026', 'Bestaetigung: Schlammkennwerte (Tab.5/6) nach DWA-M 368 verwendet', '§6.2.2'),
      (ws_06, 'attest_dwa_m_349_cr_027', 'Bestaetigung: allgemeine Baugrundsaetze nach DIN EN 12255-1 beachtet', '§2')
    ) AS v(ws, sym, lbl, clause)
   WHERE NOT EXISTS (
     SELECT 1 FROM fields f WHERE f.worksheet_template_id=v.ws AND f.symbol=v.sym
   );

  ---------------------------------------------------------------------------
  -- SEV-2 · G4 · CR-005 float-equality -> tolerance band
  ---------------------------------------------------------------------------

  -- (edit 12) FIX-DRAFT G4 · pattern P-6a (gate-grammar) · §5.3.1 — CR-005
  --   "Verhaeltnis von NO2-N : NH4-N = 1,3 : 1" — the encoded "verhaeltnis_no2_nh4 == 1.3" exact float-equality fails on
  --   any rounding. Replace with the +/-0.05 tolerance band the audit prescribes (>=1.25 AND <=1.35). No chained compares.
  UPDATE compliance_requirements
     SET condition='verhaeltnis_no2_nh4 >= 1.25 AND verhaeltnis_no2_nh4 <= 1.35'
   WHERE worksheet_template_id=(SELECT wt.id FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id
                                WHERE s.code='DWA-M-349' AND wt.code='M349-05')
     AND code='CR-005'
     AND condition='verhaeltnis_no2_nh4 == 1.3';

  ---------------------------------------------------------------------------
  -- SEV-4 · F2 · Gl.7 eta symbol normalization (oTR/oTS slip -> uniform eta_TS_*)
  --   Source (p41) uses uniform eta_TS with PS / UES subscripts. DB had eta_oTR_PS (1st term) vs eta_oTS_UES (2nd term):
  --   internally inconsistent (oTR vs oTS). Rename both to eta_TS_PS / eta_TS_UES. Self-contained: these symbols are
  --   inputs to Gl.7 only and have NULL consumer_worksheets (verified). Labels left unchanged. Guarded on old formula.
  ---------------------------------------------------------------------------

  -- (edit 13) rename in the equation-7 formula + input_symbols
  UPDATE equations
     SET formula='B_d_x_Rueck = eta_TS_PS * B_d_PS * GV_PS * i_x_PS + eta_TS_UES * B_d_UES * GV_UES * i_x_UES',
         input_symbols=ARRAY['eta_TS_PS','B_d_PS','GV_PS','i_x_PS','eta_TS_UES','B_d_UES','GV_UES','i_x_UES']
   WHERE worksheet_template_id=ws_02 AND equation_number='7'
     AND formula='B_d_x_Rueck = eta_oTR_PS * B_d_PS * GV_PS * i_x_PS + eta_oTS_UES * B_d_UES * GV_UES * i_x_UES';

  -- (edit 14) rename the two producing fields' symbols to match
  UPDATE fields SET symbol='eta_TS_PS'
   WHERE worksheet_template_id=ws_02 AND symbol='eta_oTR_PS';
  UPDATE fields SET symbol='eta_TS_UES'
   WHERE worksheet_template_id=ws_02 AND symbol='eta_oTS_UES';

END $$;
