-- ============================================================================
-- Migration: 20260708160000_din_1989_2_gate_enforcement.sql
-- Standard : DIN-1989-2 (DIN 1989-2:2004-08 — Regenwassernutzungsanlagen,
--            Teil 2: Filter)
-- Source   : Desktop/Guidelines/DWA DIN Scribd/DIN-1989-2/DIN-1989-2.pdf
--            (header, rendered: "DIN 1989-2:2004-08"; DB version "2004 (DIN 1989-2)"
--             → AUTHORITATIVE). NOTE: the PDF text layer is heavily OCR-garbled
--             (e.g. "Vs¡=Qx25"); every clause/threshold below was verified by RENDER
--             (pdftoppm 140 dpi), NOT by text extraction (playbook Trap-6 avoided).
--
-- WRITTEN-NOT-APPLIED. READ-ONLY campaign. Do NOT commit. Do NOT apply to prod.
--
-- Apply    : node scripts/apply-migration.mjs scripts/migrations/20260708160000_din_1989_2_gate_enforcement.sql
-- Rollback : the single gate UPDATE restores `condition='TRUE'` on CR-16;
--            the one field INSERT (attest_din1989_1_uebernahme) is DELETE-able by
--            symbol under DIN-1989-2-01. No data is destroyed (idempotent).
--
-- ----------------------------------------------------------------------------
-- FIX-DRAFT items implemented (DEEP-DIN-1989-2.md + FIX-QUEUE.md):
--
--  SEV-1  G1 · F-noop — CR-16 `condition='TRUE'` BLOCK no-op (the headline gap)
--    replaced with an honest predicate.  [pattern P-6e — attestation]
--    Rendered §3 (p4): "Für die Anwendung dieser Norm gelten die in DIN 1989-1
--    angegebenen und die folgenden Begriffe." §3 is a DEFINITIONS cross-reference to
--    DIN 1989-1 — it carries NO computable per-project threshold in DIN-1989-2's own
--    text. The operative "muss" the CR-16 description gestures at is the hand-off of
--    the filter's Trennwirkung/-leistung into the DIN 1989-1 Systemplanung — a
--    documentation transfer that is genuinely NON-COMPUTABLE from DIN-1989-2 fields.
--    → legitimate P-6e attestation (NOT over-used; nothing here is computable). A new
--      ws-01 boolean attestation field carries it; condition == True; requires_attestation=true.
--    NO threshold invented.
--
-- ----------------------------------------------------------------------------
-- LEFT-UNFIXED (deliberate — see final report):
--   * CR-03 (`V_Rueck_A >= Q * 25`) and CR-04 (`V_Rueck_B >= Q * 2`)  [audit G3/E5]
--     ALREADY ENFORCE. Verified against src/lib/compliance/evaluate.ts: a
--     `aref OP (aref aop number)` condition takes the arithmetic `acompare` path
--     (left `V_Rueck_A` is aref; right `Q * 25` is `abin` → not a simple operand →
--     numeric acompare). A missing V_Rueck/Q resolves to `pending`, never a false pass.
--     These are the retention-volume gates (§5.3.2 Gl.1 / §5.3.3 Gl.2, render-confirmed
--     p8/p9) and they enforce the correct `≥`. NOT TRUE no-ops → LEFT ALONE.
--     (The audit flagged "may not parse under evaluate.ts"; verified they DO parse.)
--
--   * CR-08 (`filtertrennwirkung_nachgewiesen == true`, §5.5) — the real "muss" is
--     "Wirkungsgrad von mindestens 0,7" for filters < DN 200 (render-confirmed p10:
--     "Hinsichtlich der Abtrennung von Fremdstoffen müssen diese Filter einen
--     Wirkungsgrad von mindestens 0,7 erreichen (siehe 6.5.3)."). CR-08 currently
--     ENFORCES as a boolean attestation → it is NOT a no-op. A stronger computed form
--     is available and would read the computed efficiencies (eta_Rueck_AB for Typ A/B,
--     eta_C for Typ C), keyed on filtertyp and gated on DN<200 applicability, e.g.:
--       (DN >= 200)
--       OR ((filtertyp IN {typ_a, typ_b}) AND eta_Rueck_AB >= 0.7)
--       OR ((filtertyp == typ_c) AND eta_C >= 0.7)
--     This is grammar evaluate.ts supports (parens, OR/AND, IN{}, >=). But CR-08 is
--     NOT in the FIX-DRAFT gap list, the audit rated the gate layer "strong", and it
--     already enforces → NOT rewritten here (semantics change without a draft mandate).
--     FLAGGED for Alvaro as an optional strengthening (see final report). NOT applied.
--
--   * CR-01/02/05/06/07/09/10/11/12/13/14/15/17 — real enforcing predicates already
--     (IS NOT NULL / ==true / <=20 kg / <=60 cm etc., all render-confirmed). Untouched.
--
--   * F-eq-vs-req (equations Gl.4/6): `V_Pruef = Q_Zu,max × 90/180` encode the source's
--     `≥` minimum as `=`. As PRODUCER equations they correctly compute the minimum test
--     volume; the pass/fail (actual ≥ minimum) would need a NEW gate that is not in this
--     standard's field set (no `V_Pruef_actual` field exists). Equation-layer + new-field
--     work is out of scope for this gate-enforcement migration → FLAGGED, not built.
--
--   * No ENGINE-blocked items: every predicate used here (== True) is grammar
--     evaluate.ts supports. Nothing deferred to the ENGINE track.
--
-- P-13 note: DIN-1989-2 has NO keyed regulation_tables lookup driving any gate in this
--   migration (0 regulation_tables rows read by CR-16/03/04/08). The retention gates key
--   directly on the produced volume vs Q×const (per-type constants 25 s / 2 s, §5.3.2/5.3.3,
--   render-confirmed) — the guideline's own governing dimension (Filtertyp). No re-key needed.
-- ============================================================================

DO $$
DECLARE
  v_standard_id uuid;
  v_ws01 uuid;  -- DIN-1989-2-01 Registrierung, Anwendungsbereich und Begriffe (registration)
  v_cr16 uuid;
  v_sec_ws01 uuid;  -- target section for the CR-16 attestation field
  v_oi int;
BEGIN
  -- ---- resolve standard -----------------------------------------------------
  SELECT id INTO v_standard_id FROM standards WHERE code = 'DIN-1989-2';
  IF v_standard_id IS NULL THEN
    RAISE EXCEPTION 'Standard DIN-1989-2 not found';
  END IF;

  -- ---- resolve worksheet ----------------------------------------------------
  SELECT id INTO v_ws01 FROM worksheet_templates
    WHERE standard_id = v_standard_id AND code = 'DIN-1989-2-01';
  IF v_ws01 IS NULL THEN
    RAISE EXCEPTION 'DIN-1989-2 worksheet DIN-1989-2-01 not found';
  END IF;

  -- ---- resolve the TRUE no-op gate ------------------------------------------
  SELECT id INTO v_cr16 FROM compliance_requirements WHERE code = 'DIN-1989-2-CR-16';
  IF v_cr16 IS NULL THEN
    RAISE EXCEPTION 'DIN-1989-2 CR-16 not found';
  END IF;

  -- ==========================================================================
  -- STEP 1 — attestation field for the non-computable DIN 1989-1 hand-off "muss".
  --   Idempotent INSERT (guarded by NOT EXISTS on symbol within the worksheet).
  --   section_id = first non-null section of the worksheet (lowest order_index);
  --   order_index = MAX+1 in that worksheet; active=true; verification_status=imported_unverified.
  -- ==========================================================================
  SELECT id INTO v_sec_ws01 FROM worksheet_sections
    WHERE worksheet_template_id = v_ws01 AND id IS NOT NULL
    ORDER BY order_index LIMIT 1;

  IF NOT EXISTS (
    SELECT 1 FROM fields
    WHERE worksheet_template_id = v_ws01 AND symbol = 'attest_din1989_1_uebernahme'
  ) THEN
    SELECT COALESCE(MAX(order_index), 0) + 1 INTO v_oi FROM fields WHERE worksheet_template_id = v_ws01;
    INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en,
                        data_type, is_required, clause_reference, description,
                        source_file, source_anchor, source_quote,
                        order_index, verification_status, active)
    VALUES (
      v_ws01, v_sec_ws01, 'attest_din1989_1_uebernahme',
      'Bestätigung: Begriffe DIN 1989-1 zugrunde gelegt und Filterleistung in die Systemplanung übernommen (§3)',
      'Confirmation: DIN 1989-1 definitions applied and filter performance carried into the DIN 1989-1 system planning (§3)',
      'boolean', true, '§3; §1',
      'Bestätigung: Für die Anwendung dieser Norm gelten die in DIN 1989-1 angegebenen Begriffe (§3); die nach dieser Norm ermittelte Filtertrennwirkung/-leistung ist in die Systemplanung der Regenwassernutzungsanlage nach DIN 1989-1 zu übernehmen. Reiner Verweis auf DIN 1989-1 / Dokumentations-Übergabe — in DIN 1989-2 selbst nicht berechenbar → Attestierung.',
      'DIN-1989-2.pdf',
      '§3 Begriffe (S. 4, gerendert)',
      'Für die Anwendung dieser Norm gelten die in DIN 1989-1 angegebenen und die folgenden Begriffe.',
      v_oi, 'imported_unverified', true
    );
  END IF;

  -- ==========================================================================
  -- STEP 2 — replace the CR-16 `TRUE` no-op BLOCK gate with an honest predicate.
  --   Guarded (WHERE condition='TRUE') so re-application converges and never
  --   clobbers an already-fixed gate. requires_attestation=true makes the sign-off
  --   nature explicit (P-6e discipline). source_quote already VA on this row
  --   (§3 verbatim) — refresh the anchor to mark it render-confirmed.
  -- ==========================================================================

  -- CR-16 (§3; §1) — DIN 1989-1 definitions/hand-off attestation  [FIX-DRAFT G1 → P-6e]
  -- DIN-1989-2 clause: §3 Begriffe (PDF p4, rendered). §3 is a definitions cross-reference
  -- to DIN 1989-1 with no computable threshold → attestation is the honest, non-invented fix.
  UPDATE compliance_requirements
    SET condition = 'attest_din1989_1_uebernahme == True',
        requires_attestation = true,
        source_file = 'DIN-1989-2.pdf',
        source_anchor = '§3 Begriffe (S. 4, gerendert)',
        suggestion = 'Bestätigen Sie, dass die Begriffe nach DIN 1989-1 zugrunde gelegt und die ermittelte Filtertrennwirkung/-leistung in die Systemplanung nach DIN 1989-1 übernommen wurde. In DIN 1989-2 selbst ist hierfür kein berechenbarer Wert vorhanden.'
    WHERE id = v_cr16 AND condition = 'TRUE';

  -- ---- converge check -------------------------------------------------------
  IF EXISTS (
    SELECT 1 FROM compliance_requirements
    WHERE code = 'DIN-1989-2-CR-16' AND condition = 'TRUE'
  ) THEN
    RAISE WARNING 'DIN-1989-2: CR-16 still has condition=TRUE after UPDATE (already re-fixed differently, or a symbol changed) — review.';
  END IF;

  RAISE NOTICE 'DIN-1989-2 gate enforcement applied: CR-16 rewritten (P-6e); 1 attestation field ensured. CR-03/04 left enforcing; CR-08 strengthening flagged (not applied).';
END $$;
