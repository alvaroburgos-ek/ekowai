-- =====================================================================================
-- Migration: 20260708140000_vdi_3477_gate_enforcement
-- Standard:  VDI 3477 "Biologische Abgasreinigung — Biofilter" (März 2016; PDF VDI-3477-2016-03.pdf, 102 pp)
-- Track:     DATA (encoding fixes only; NO engine changes)
-- Status:    WRITTEN-NOT-APPLIED. Do NOT apply/commit from here — orchestrator applies + commits.
--
-- Apply command:
--   node scripts/apply-migration.mjs scripts/migrations/20260708140000_vdi_3477_gate_enforcement.sql
--
-- SUMMARY
-- -------
-- Closes VDI-3477's SEV-1 gate-enforcement debt (register item G1: three block gates with
-- condition='TRUE' → always pass, enforce nothing) plus one SEV-2/E6 gate-hygiene defect
-- (CR-04 German decimal comma → parse-fail). All thresholds + quotes verified against the
-- RENDERED VDI-3477 PDF (poppler r130/r140). No value crosses in from any other guideline.
--
-- ENGINE GRAMMAR RE-VERIFIED against src/lib/compliance/evaluate.ts (do not trust audit
-- assumptions): the parser supports `>= <= > < == !=`, `AND`/`OR`/`NOT`, parenthesised
-- groups, `IN {…}`, `IS [NOT] NULL/EMPTY`, `+ - * /`. Every predicate below uses only that
-- grammar. NOTE on enforcement scope: the runtime form + PDF report evaluate gates
-- worksheet-LOCALLY; the ENGINEER-APPROVE gate (checkApprovalGate / makeGateLookup in
-- src/lib/actions/approval-gate.ts) additionally resolves any symbol that is NOT a local
-- field from a project-wide CONFLICT-FREE fallback. That is why CR-17 on VDI-3477-04 may
-- honestly read the humidifier design fields that live on VDI-3477-05 — it enforces at the
-- approval transition (the real block), and reads `pending` in the live form until the
-- humidifier worksheet is filled. This is the same cross-worksheet pattern already relied
-- on elsewhere in the campaign.
--
-- FIX-DRAFT ITEMS ADDRESSED (with pattern IDs)
--   1. [SEV-1 · G1] CR-17 (VDI-3477-04) `TRUE` no-op → real humidifier design envelope (P-6a)
--        §6.2.2.1 (PDF p.35, rendered): rel. Feuchte > 95 % (already CR-05), Wasser-Luft-Zahl
--        1–10 ℓ/m³, Verweilzeit > 1 s, Strömungsgeschwindigkeit < 3 m/s (VDI 3679 Blatt 1).
--        The Wasser-Luft-Zahl / Verweilzeit / Geschwindigkeit envelope is VDI-3477's OWN
--        numeric text and is exactly what CR-17's description covers. Fields exist on
--        VDI-3477-05 (wasser_luft_zahl, befeuchter_verweilzeit, befeuchter_stroemungsgeschw).
--        condition: TRUE → `wasser_luft_zahl >= 1 AND wasser_luft_zahl <= 10
--                            AND befeuchter_verweilzeit > 1 AND befeuchter_stroemungsgeschw < 3`
--   2. [SEV-1 · G1] CR-15 (VDI-3477-08) `TRUE` no-op → attestation (P-6e)
--        Anhang B / §8: odour measurement per DIN EN 13725 + VDI 3884/3882. Purely
--        procedural referral to an external method; VDI-3477 states NO own numeric threshold
--        to gate on → genuine non-computable sign-off. New boolean attest field +
--        `attest_vdi3477_geruchsmessung == True`, requires_attestation=true.
--   3. [SEV-1 · G1] CR-16 (VDI-3477-08) `TRUE` no-op → attestation (P-6e)
--        §8/§9.5: Roh-/Reingasmessungen per VDI 3951 principles + TA Luft. Procedural referral,
--        no VDI-3477-own numeric threshold → attestation. New boolean attest field +
--        `attest_vdi3477_emissionsmessung == True`, requires_attestation=true.
--   4. [SEV-2 · E6/G4] CR-04 (VDI-3477-07) German decimal comma → dot (gate-hygiene)
--        `pH_filtermaterial >= 5,5 AND pH_filtermaterial <= 7,5` (commas → evaluate.ts number
--        lexer rejects → parse-fail → non-enforcing) → `>= 5.5 AND <= 7.5`. §8.4, PDF text
--        "In einer Schwankungsbreite von 5,5 bis 7,5 ist der pH-Wert tolerabel." Severity
--        stays 'warn' (source: "sollte … tolerabel" — a recommendation; unchanged).
--
-- LEFT UNFIXED (honest gaps — NOT touched by this migration)
--   * Gl.6 incompressibility criterion `p_e/p_0 <= 0,95` (§5.1.6.1, PDF p.25) IS an encoded
--     equation (eq. 6, output incompr_crit) with NO enforcing gate. It was a candidate home
--     for CR-17, but CR-17's own description + source_quote are about the HUMIDIFIER design,
--     not incompressibility — re-pointing CR-17 to Gl.6 would misrepresent the requirement.
--     A dedicated incompressibility gate is a NEW requirement (not a TRUE no-op to fix here);
--     LEFT for Alvaro (could add `incompr_crit == true` once the eq materializes that boolean).
--   * CR-15/16 attestation vs numeric: neither §8 nor Anhang B carries a VDI-3477-OWN pass/fail
--     number (the numbers — 123 µg/m³ n-Butanol reference, 250 ouE/m³ example — are DIN EN 13725
--     definitions / worked examples, not VDI-3477 acceptance limits). Per NEVER-INVENT, no
--     numeric gate fabricated; attestation is the honest form.
--   * F-Gl2-quote (equations.source_quote on eq. 2 holds eq. 1's q-based text): a provenance
--     defect on an EQUATION, not a gate-enforcement item. Out of this migration's gate scope;
--     flagged for the provenance-backfill pass (repair the QUOTE, never the faithful formula).
--   * CR-02/12/13/18 presence-only (`… IS NOT NULL`): weaker than value checks but NOT no-ops;
--     they enforce presence and VDI-3477 gives no stronger own threshold. LEFT AS-IS.
--   * CR-01/03/05/06/07/08/09/10/11/14/19 RE-VERIFIED against evaluate.ts: all already enforce
--     under the real grammar (== true / numeric ranges / AND). NOT touched (gratuitous).
--
-- ROLLBACK NOTES (manual; no down-migration written)
--   * CR-17: UPDATE …condition='TRUE' WHERE code='VDI-3477-CR-17'.
--   * CR-15: UPDATE …condition='TRUE', requires_attestation=false WHERE code='VDI-3477-CR-15';
--            DELETE fields WHERE symbol='attest_vdi3477_geruchsmessung'.
--   * CR-16: UPDATE …condition='TRUE', requires_attestation=false WHERE code='VDI-3477-CR-16';
--            DELETE fields WHERE symbol='attest_vdi3477_emissionsmessung'.
--   * CR-04: UPDATE …condition='pH_filtermaterial >= 5,5 AND pH_filtermaterial <= 7,5'
--            WHERE code='VDI-3477-CR-04'.
--   All UPDATEs are guarded (IS DISTINCT FROM) and field INSERTs are NOT EXISTS-guarded, so a
--   re-run is a no-op once applied.
--
-- P-13 NOTE: no keyed table/lookup (regulation_tables) is touched — VDI-3477 has 0 such rows;
--   CR-02's Tab.2 remains a presence gate. No governing-dimension re-key performed. N/A here.
-- =====================================================================================

DO $$
DECLARE
  v_std        uuid;
  v_ws04       uuid;   -- VDI-3477-04 (Auslegung/Dimensionierung)      — CR-17
  v_ws05       uuid;   -- VDI-3477-05 (Abgaskonditionierung)           — humidifier fields (read cross-ws)
  v_ws07       uuid;   -- VDI-3477-07 (Betrieb)                        — CR-04
  v_ws08       uuid;   -- VDI-3477-08 (Messung/Wirkungsgrad)           — CR-15/16
  v_sec08      uuid;   -- first section of VDI-3477-08 (attest fields land here)
  v_cnt        int;
BEGIN
  -- ---- resolve standard + worksheets ------------------------------------------------
  SELECT id INTO v_std FROM standards WHERE code = 'VDI-3477';
  IF v_std IS NULL THEN RAISE EXCEPTION 'standard VDI-3477 not found'; END IF;

  SELECT id INTO v_ws04 FROM worksheet_templates WHERE standard_id = v_std AND code = 'VDI-3477-04';
  SELECT id INTO v_ws05 FROM worksheet_templates WHERE standard_id = v_std AND code = 'VDI-3477-05';
  SELECT id INTO v_ws07 FROM worksheet_templates WHERE standard_id = v_std AND code = 'VDI-3477-07';
  SELECT id INTO v_ws08 FROM worksheet_templates WHERE standard_id = v_std AND code = 'VDI-3477-08';
  IF v_ws04 IS NULL THEN RAISE EXCEPTION 'worksheet VDI-3477-04 not found'; END IF;
  IF v_ws05 IS NULL THEN RAISE EXCEPTION 'worksheet VDI-3477-05 not found'; END IF;
  IF v_ws07 IS NULL THEN RAISE EXCEPTION 'worksheet VDI-3477-07 not found'; END IF;
  IF v_ws08 IS NULL THEN RAISE EXCEPTION 'worksheet VDI-3477-08 not found'; END IF;

  -- first section of VDI-3477-08 via an existing field (per work-order field-INSERT rule)
  SELECT section_id INTO v_sec08
    FROM fields
   WHERE worksheet_template_id = v_ws08 AND section_id IS NOT NULL
   ORDER BY order_index ASC LIMIT 1;
  IF v_sec08 IS NULL THEN RAISE EXCEPTION 'could not resolve first section for VDI-3477-08'; END IF;

  -- pre-flight: the three CRs we intend to fix must exist (fail loud if the encoding drifted)
  SELECT COUNT(*) INTO v_cnt FROM compliance_requirements
    WHERE code IN ('VDI-3477-CR-15','VDI-3477-CR-16','VDI-3477-CR-17','VDI-3477-CR-04');
  IF v_cnt <> 4 THEN
    RAISE EXCEPTION 'expected CR-04/15/16/17 (4 rows) present, found %', v_cnt;
  END IF;

  -- ================================================================================
  -- FIX 1 — CR-17 (VDI-3477-04): TRUE no-op → humidifier design envelope (P-6a)
  --   §6.2.2.1 "Befeuchtung des Abgases" (PDF p.35, rendered r130):
  --   "Die Wasser-Luft-Zahl beträgt dabei 1 ℓ Wasser/m³ Abgas bis 10 ℓ Wasser/m³ Abgas,
  --    und die Verweilzeit soll bei > 1 s, die Strömungsgeschwindigkeit bei < 3 m/s liegen
  --    (VDI 3679 Blatt 1)."  rel. Feuchte > 95 % is already enforced by CR-05.
  --   Fields wasser_luft_zahl / befeuchter_verweilzeit / befeuchter_stroemungsgeschw live on
  --   VDI-3477-05; readable cross-worksheet at the approval gate (see header enforcement note).
  -- ================================================================================
  UPDATE compliance_requirements
     SET condition = 'wasser_luft_zahl >= 1 AND wasser_luft_zahl <= 10 AND befeuchter_verweilzeit > 1 AND befeuchter_stroemungsgeschw < 3'
   WHERE worksheet_template_id = v_ws04
     AND code = 'VDI-3477-CR-17'
     AND condition IS DISTINCT FROM 'wasser_luft_zahl >= 1 AND wasser_luft_zahl <= 10 AND befeuchter_verweilzeit > 1 AND befeuchter_stroemungsgeschw < 3';

  -- ================================================================================
  -- FIX 2 — CR-15 (VDI-3477-08): TRUE no-op → attestation (P-6e)
  --   Anhang B / §8: Geruchsmessung nach DIN EN 13725 + VDI 3884/3882. No VDI-3477-own
  --   numeric acceptance limit → genuine procedural sign-off.
  -- ================================================================================
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en,
                      data_type, unit, is_required, clause_reference, verification_status,
                      order_index, source_quote, active)
  SELECT v_ws08, v_sec08, 'attest_vdi3477_geruchsmessung',
         'Bestätigung: Geruchsmessung nach DIN EN 13725 durchgeführt',
         'Attestation: odour measurement performed per DIN EN 13725',
         'boolean', '-', true, 'AnhangB; DIN EN 13725', 'verified_against_standard',
         (SELECT COALESCE(MAX(order_index),0)+1 FROM fields WHERE worksheet_template_id = v_ws08),
         'Geruchsintensive Stoffe können mithilfe olfaktometrischer Methoden beurteilt werden. Dies geschieht nach DIN EN 13725 in Verbindung mit VDI 3884 Blatt 1. (Anhang B / §8, VDI 3477, März 2016)',
         true
  WHERE NOT EXISTS (
    SELECT 1 FROM fields WHERE worksheet_template_id = v_ws08 AND symbol = 'attest_vdi3477_geruchsmessung');

  UPDATE compliance_requirements
     SET condition = 'attest_vdi3477_geruchsmessung == True', requires_attestation = true
   WHERE worksheet_template_id = v_ws08 AND code = 'VDI-3477-CR-15'
     AND (condition IS DISTINCT FROM 'attest_vdi3477_geruchsmessung == True'
          OR requires_attestation IS DISTINCT FROM true);

  -- ================================================================================
  -- FIX 3 — CR-16 (VDI-3477-08): TRUE no-op → attestation (P-6e)
  --   §8/§9.5: Roh-/Reingasmessungen nach den Grundsätzen VDI 3951 + TA Luft. Procedural
  --   referral to external measurement principles; no VDI-3477-own numeric limit → sign-off.
  -- ================================================================================
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en,
                      data_type, unit, is_required, clause_reference, verification_status,
                      order_index, source_quote, active)
  SELECT v_ws08, v_sec08, 'attest_vdi3477_emissionsmessung',
         'Bestätigung: Roh-/Reingasmessungen nach VDI 3951 und TA Luft durchgeführt',
         'Attestation: raw/clean gas emission measurements per VDI 3951 and TA Luft',
         'boolean', '-', true, '§8; §9.5; VDI 3951; TA Luft', 'verified_against_standard',
         (SELECT COALESCE(MAX(order_index),0)+1 FROM fields WHERE worksheet_template_id = v_ws08),
         'Dazu sind die Grundsätze zur Durchführung von Emissionsmessungen gemäß der Richtlinie VDI 3951 zu beachten. Diese Grundsätze gelten sinngemäß auch für Rohgasmessungen. (§8/§9.5, VDI 3477, März 2016)',
         true
  WHERE NOT EXISTS (
    SELECT 1 FROM fields WHERE worksheet_template_id = v_ws08 AND symbol = 'attest_vdi3477_emissionsmessung');

  UPDATE compliance_requirements
     SET condition = 'attest_vdi3477_emissionsmessung == True', requires_attestation = true
   WHERE worksheet_template_id = v_ws08 AND code = 'VDI-3477-CR-16'
     AND (condition IS DISTINCT FROM 'attest_vdi3477_emissionsmessung == True'
          OR requires_attestation IS DISTINCT FROM true);

  -- ================================================================================
  -- FIX 4 — CR-04 (VDI-3477-07): German decimal comma → dot (E6/G4 gate-hygiene)
  --   §8.4, PDF text: "In einer Schwankungsbreite von 5,5 bis 7,5 ist der pH-Wert tolerabel."
  --   evaluate.ts number lexer only accepts `.` → `5,5`/`7,5` fail to parse → gate non-enforcing.
  --   Normalize to 5.5 / 7.5. Severity stays 'warn' (recommendation "tolerabel", not a muss).
  -- ================================================================================
  UPDATE compliance_requirements
     SET condition = 'pH_filtermaterial >= 5.5 AND pH_filtermaterial <= 7.5'
   WHERE worksheet_template_id = v_ws07
     AND code = 'VDI-3477-CR-04'
     AND condition IS DISTINCT FROM 'pH_filtermaterial >= 5.5 AND pH_filtermaterial <= 7.5';

  -- ---- guard: no block gate may still be a TRUE no-op --------------------------------
  SELECT COUNT(*) INTO v_cnt
    FROM compliance_requirements cr
    JOIN worksheet_templates wt ON wt.id = cr.worksheet_template_id
   WHERE wt.standard_id = v_std
     AND cr.severity = 'block'
     AND upper(btrim(cr.condition)) = 'TRUE';
  IF v_cnt <> 0 THEN
    RAISE EXCEPTION 'VDI-3477 still has % block gate(s) with condition=TRUE after migration', v_cnt;
  END IF;

  -- ---- guard: CR-04 must no longer carry a decimal comma -----------------------------
  SELECT COUNT(*) INTO v_cnt
    FROM compliance_requirements
   WHERE code = 'VDI-3477-CR-04' AND condition LIKE '%,%';
  IF v_cnt <> 0 THEN
    RAISE EXCEPTION 'VDI-3477-CR-04 still contains a decimal comma after migration';
  END IF;

  RAISE NOTICE 'VDI-3477 gate-enforcement migration applied: CR-17 humidifier envelope, CR-15/16 -> attestation, CR-04 decimal-comma normalized.';
END $$;
