-- ============================================================================
-- Migration: 20260708210000_dwa_m_760_gate_enforcement.sql
-- Standard : DWA-M-760 (Merkblatt DWA-M 760 — Fetthaltiges Abwasser)
-- Source   : Desktop/Guidelines/DWA-M-760/DWA-M_760_WD.pdf
--            (footer "April 2025"; pdfinfo title "DWA-M 760 WD — Fetthaltiges
--             Abwasser"; DB version "Weißdruck, April 2025 (1. Auflage)"
--             → AUTHORITATIVE, FINAL edition). Every clause/value below was
--             RENDER-confirmed (pdftoppm 140 dpi p35 + pdftotext -layout);
--             the text layer is clean (not OCR-garbled) — but the sizing clause
--             (§7.2.6.3) and the §7.1 fat-load values were both cross-checked
--             against the rendered page.
--
-- WRITTEN-NOT-APPLIED. READ-ONLY campaign. Do NOT commit. Do NOT apply to prod.
--
-- Apply    : node scripts/apply-migration.mjs scripts/migrations/20260708210000_dwa_m_760_gate_enforcement.sql
-- Rollback :
--   * STEP 1 (SEV-1): DELETE the new gate  ->  DELETE FROM compliance_requirements
--       WHERE code = 'REQ-M760-13'
--         AND worksheet_template_id = (SELECT id FROM worksheet_templates wt
--             JOIN standards s ON s.id = wt.standard_id
--             WHERE s.code='DWA-M-760' AND wt.code='M760-15');
--   * STEP 2 (SEV-2): restore the two F_fett_haus equation rows' formula to
--       'F_fett_haus = c_lipophil_haus * wasserverbrauch_pe_d' and output_unit to NULL
--       (their pre-migration state) on M760-07 (EQ-M760-03) and M760-09 (EQ-M760-03).
--   No rows are deleted by STEP 2 and no fields are inserted (both NS and
--   ns_fettabscheider already exist on M760-15) → fully reversible / idempotent.
--
-- ----------------------------------------------------------------------------
-- FIX-DRAFT items implemented (DEEP-DWA-M-760.md + FIX-QUEUE.md):
--
--  SEV-1  G9 · NO enforcing sizing gate (the headline gap).  [pattern P-6a / P-6b]
--    DWA-M-760 requires the SELECTED grease-separator nominal size (ns_fettabscheider)
--    to be at least the required computed size (NS = q · f_d · f_t · f_r, per DIN EN
--    1825-2). The only related gate is REQ-M760-09 on M760-18 (`ns_fettabscheider IS
--    NOT NULL AND bauform_fa IS NOT NULL`) — PRESENCE-only, does NOT enforce ns ≥ NS.
--    → ADD a BLOCK gate REQ-M760-13 on the sizing worksheet M760-15 (Bemessung
--      Nenngroesse — carries both NS and ns_fettabscheider as fields).
--    ⚠ SUBTRACTION FORM (evaluate.ts L241-247/L364): a bare SYMBOL on a comparison's
--      RHS is coerced to a STRING LITERAL → number-vs-string → silently ALWAYS-FAILS.
--      To compare two FIELDS we MUST use arithmetic so the acompare (numeric) path is
--      taken:   condition = 'ns_fettabscheider - NS >= 0'   (NOT 'ns_fettabscheider >= NS').
--      A missing NS or ns resolves to `pending`, never a false fail (evalArith → null).
--    source_quote = §7.2.6.3 VERBATIM (render-confirmed, PDF p41).
--
--  SEV-2  F1/F4 · F_fett_haus unit factor (mg vs g).  [pattern P-2 / P-3]
--    EQ-M760-03 `F_fett_haus = c_lipophil_haus * wasserverbrauch_pe_d`.
--    Field units (DB, confirmed): c_lipophil_haus = 'mg/l', wasserverbrauch_pe_d =
--    'l/(P·d)'  →  raw product dimension = mg/(P·d). But field F_fett_haus.unit =
--    'g/(P*d)'. Dimensional mismatch of factor 1000 (mg → g). RENDER-CONFIRMED against
--    §7.1 (PDF p35): "2 g bis 6 g Fett ... 18 mg/l bis 55 mg/l" — the load is expressed
--    in GRAMS while the concentration is mg/l, so the mg·l product MUST be divided by
--    1000 to yield grams. (18 mg/l × ~110 l ≈ 2 g; the ÷1000 is independent of which
--    water-use value is chosen.) → correct formula to divide by 1000; set output_unit
--    to 'g/(P·d)'; refresh source_quote/anchor to the render-confirmed §7.1 form.
--    verification_status kept 'needs_engineer_review' (the FORMULA is a DERIVED
--    reconstruction from §7.1 prose (S8) — NOT printed verbatim; only the UNIT factor
--    is VA-corrected here, not the reconstruction itself). Applied to BOTH duplicate
--    rows (M760-07 + M760-09) so the two S3-duplicated copies stay consistent.
--
-- ----------------------------------------------------------------------------
-- LEFT-UNFIXED (deliberate — see final report):
--
--   * SEV-4  S3 ×2 worksheet/equation DUPLICATION — FLAGGED, NOT de-duplicated.
--     EQ-M760-01/EQ-M760-02 exist on BOTH M760-09 and M760-15; EQ-M760-03 on BOTH
--     M760-07 and M760-09. This is a real structural duplication (S3), but de-duping
--     requires deciding the canonical worksheet + rewiring consumers, and a wrong call
--     risks DELETING live worksheet content. Per task guidance (prefer flagging over
--     destructive dedup) this is FLAGGED for Alvaro, NOT executed. The SEV-2 unit fix
--     above is applied to ALL copies so no copy is left inconsistent in the meantime.
--
--   * EQ-M760-01 (NS) / EQ-M760-02 (NS_eff) provenance (P4/P2) — the NS FORMULA and the
--     ns≥NS CONSTRAINT are DIN EN 1825-2 content (encoder-confirmed: "Formel steht in
--     DIN EN 1825-2, nicht in DWA-M 760 selbst"). Correctly flagged (needs_engineer_review,
--     VA-blocked until DIN EN 1825-2:2002 PDF is obtained). NOT re-graded here — the good
--     P4 case (honestly labelled). The NEW SEV-1 gate enforces the ns≥NS relation without
--     restating the EN 1825-2 formula (the gate reads the two fields, not the formula).
--
--   * G8 gate DUPLICATE CODES — REQ-M760-05/06/07/08/09/10/11/12 each appear on TWO
--     worksheets (e.g. REQ-M760-06 = `manual` on M760-05 but `c_aox_grossküche <= 1` on
--     M760-06; REQ-M760-09 = `manual` on M760-09 but presence-check on M760-18). The
--     (worksheet_template_id, code) unique key permits this, but the same code carries
--     divergent meanings. Renaming per-worksheet is a code-identity change beyond the
--     DATA-track gap list → FLAGGED, not applied.
--
--   * G10 `manual`/attestation gates (REQ-M760-03/06/07/09/12 in their `manual` copies)
--     — genuinely non-computable prose ("stoßweise Einleitung … zu vermeiden", §12
--     Kosten). Legitimately manual (P-6e territory); replacing them with real predicates
--     needs source-verified thresholds this migration does not have → LEFT ALONE.
--
--   * SEV-3 source_quote BACKFILL — several CRs have NULL source_quote (REQ-M760-01 §1,
--     REQ-M760-04 §4/Tab.3, REQ-M760-07 §7 on M760-05, REQ-M760-07 §6.4 on M760-06,
--     REQ-M760-09 §9 on M760-18, REQ-M760-10 §10 on M760-10). These would each require
--     rendering + verbatim-lifting their own clause; not all were render-confirmed in
--     this pass. To avoid inventing/mis-attributing a quote, they are LEFT for a
--     targeted SEV-3 backfill pass (VA-only). NO threshold or quote invented here.
--
--   * S9 range-loss — §7.1 carries a RANGE/study-spread of lipophilic concentrations
--     (18–55; 40±50 %; 16–105; 40–100 mg/l; Table 7 Mittelwert 38–86, Median 40–78;
--     "bis 100 mg/l") that a single-`c` default cannot capture. Documentation/default-
--     choice concern, not a factor bug → noted for Alvaro, not encoded.
--
--   * ENGINE-blocked: NONE. Every predicate used here (`a - b >= 0`) is grammar
--     evaluate.ts supports (arithmetic acompare path). Nothing deferred to ENGINE track.
--
-- P-13 note: DWA-M-760 has ~492 regulation_tables rows, but NONE is read by the gate or
--   the equation touched here. The SEV-1 sizing gate keys directly on two produced/entered
--   fields (ns_fettabscheider vs NS) — the guideline's own governing dimension (§7.2.6.3:
--   "minimale Nenngröße richtet sich nach dem maximal zu erwartenden Abwasservolumenstrom").
--   No keyed lookup is re-keyed or coarsened → P-13 not triggered by this migration.
-- ============================================================================

DO $$
DECLARE
  v_standard_id uuid;
  v_ws15  uuid;  -- M760-15 Bemessung Nenngroesse (sizing worksheet; owns NS + ns_fettabscheider)
  v_ws07  uuid;  -- M760-07 Reinigungs- und Desinfektionsmittel (carries EQ-M760-03 copy)
  v_ws09  uuid;  -- M760-09 Abwasseranfall und Beschaffenheit (carries EQ-M760-03 copy)
  v_has_ns   boolean;
  v_has_nseff boolean;  -- selected-size field ns_fettabscheider present on M760-15
  v_eq_updated int := 0;
BEGIN
  -- ---- resolve standard -----------------------------------------------------
  SELECT id INTO v_standard_id FROM standards WHERE code = 'DWA-M-760';
  IF v_standard_id IS NULL THEN
    RAISE EXCEPTION 'Standard DWA-M-760 not found';
  END IF;

  -- ---- resolve worksheets ---------------------------------------------------
  SELECT id INTO v_ws15 FROM worksheet_templates
    WHERE standard_id = v_standard_id AND code = 'M760-15';
  IF v_ws15 IS NULL THEN
    RAISE EXCEPTION 'DWA-M-760 sizing worksheet M760-15 not found';
  END IF;

  SELECT id INTO v_ws07 FROM worksheet_templates
    WHERE standard_id = v_standard_id AND code = 'M760-07';
  IF v_ws07 IS NULL THEN
    RAISE EXCEPTION 'DWA-M-760 worksheet M760-07 not found';
  END IF;

  SELECT id INTO v_ws09 FROM worksheet_templates
    WHERE standard_id = v_standard_id AND code = 'M760-09';
  IF v_ws09 IS NULL THEN
    RAISE EXCEPTION 'DWA-M-760 worksheet M760-09 not found';
  END IF;

  -- ==========================================================================
  -- STEP 1 — SEV-1 (G9): enforcing sizing gate on M760-15.  [P-6a / P-6b]
  --   Confirm BOTH symbols exist as fields on M760-15 before writing the gate
  --   (task rule). They do (verified read-only) — assert here so a schema drift
  --   fails loudly instead of writing a gate that references a missing symbol.
  -- ==========================================================================
  SELECT EXISTS (SELECT 1 FROM fields
                 WHERE worksheet_template_id = v_ws15 AND symbol = 'NS')
    INTO v_has_ns;
  SELECT EXISTS (SELECT 1 FROM fields
                 WHERE worksheet_template_id = v_ws15 AND symbol = 'ns_fettabscheider')
    INTO v_has_nseff;

  IF NOT v_has_ns OR NOT v_has_nseff THEN
    RAISE EXCEPTION
      'DWA-M-760 M760-15 is missing a sizing symbol (NS present=%, ns_fettabscheider present=%) — cannot write ns>=NS gate',
      v_has_ns, v_has_nseff;
  END IF;

  -- Idempotent INSERT: guarded by (worksheet_template_id, code) — the table's own
  -- unique key. Re-application is a no-op (ON CONFLICT DO NOTHING on that key).
  -- SUBTRACTION FORM 'ns_fettabscheider - NS >= 0' — see header ⚠ note (symbol-RHS trap).
  INSERT INTO compliance_requirements
    (worksheet_template_id, code, title_de, title_en, condition, severity,
     requires_attestation, clause_reference, source_file, source_anchor, source_quote,
     description, suggestion)
  VALUES (
    v_ws15,
    'REQ-M760-13',
    'Gewählte Nenngröße ≥ berechnete Nenngröße (ns ≥ NS)',
    'Selected nominal size ≥ required nominal size (ns ≥ NS)',
    'ns_fettabscheider - NS >= 0',  -- subtraction form → numeric acompare (NOT symbol-RHS)
    'block',
    false,
    '§7.2.6.3; DIN EN 1825-2:2002 Unterabschnitt 6.1',
    'DWA-M_760_WD.pdf',
    '§7.2.6.3 Abwasservorbehandlung (S. 41, gerendert)',
    'Gemäß DIN EN 1825-2:2002 Unterabschnitt 6.1, kann einem erhöhten Fettanfall im Abwasser durch die Wahl einer höheren Abscheidernenngröße oder eine häufigere Entleerung als ansonsten üblich Rechnung getragen werden. Die minimale Nenngröße richtet sich dabei nach dem maximal zu erwartenden Abwasservolumenstrom.',
    'Die gewählte Nenngröße (ns_fettabscheider) muss mindestens der nach DIN EN 1825-2 berechneten erforderlichen Nenngröße NS entsprechen. Die minimale Nenngröße richtet sich nach dem maximal zu erwartenden Abwasservolumenstrom (§7.2.6.3).',
    'Wählen Sie eine Standard-Nenngröße, die nicht kleiner als die berechnete NS ist. Bei erhöhtem Fettanfall ist eine höhere Nenngröße oder häufigere Entleerung vorzusehen (DIN EN 1825-2:2002, 6.1).'
  )
  ON CONFLICT (worksheet_template_id, code) DO NOTHING;

  -- ==========================================================================
  -- STEP 2 — SEV-2 (F1/F4): correct the F_fett_haus unit factor (mg → g, ÷1000).
  --   Applied to BOTH duplicated EQ-M760-03 rows (M760-07 + M760-09) so the S3
  --   copies stay consistent. Guarded by the OLD formula so re-application
  --   converges and never double-divides. verification_status left at
  --   needs_engineer_review (the reconstruction itself is not VA — only the unit).
  -- ==========================================================================
  UPDATE equations
    SET formula = 'F_fett_haus = c_lipophil_haus * wasserverbrauch_pe_d / 1000',
        output_unit = 'g/(P·d)',
        source_anchor = '§7.1 Fette im häuslichen Abwasser (S. 33/PDF 35, gerendert)',
        source_quote = 'Verbatim §7.1: Pro Einwohner und Tag wird ... insgesamt eine Menge von ca. 2 g bis 6 g Fett ins Abwasser eingetragen, was einer Konzentration an lipophilen Stoffen von 18 mg/l bis 55 mg/l entspricht (KOPPE & STOZEK 1998, SEDD 2020). [Einheiten-Hinweis: c_lipophil_haus in mg/l × wasserverbrauch in l/(P·d) = mg/(P·d); zur Angabe in g/(P·d) durch 1000 dividiert. Formel ist eine abgeleitete Rekonstruktion aus dem §7.1-Prosatext (S8), nicht wörtlich abgedruckt.]'
    WHERE output_symbol = 'F_fett_haus'
      AND worksheet_template_id IN (v_ws07, v_ws09)
      AND formula = 'F_fett_haus = c_lipophil_haus * wasserverbrauch_pe_d';
  GET DIAGNOSTICS v_eq_updated = ROW_COUNT;

  -- Keep the field's declared output unit consistent with the corrected equation.
  -- (F_fett_haus field already reads 'g/(P*d)'; normalise the middle-dot spelling to
  --  match the equation output_unit 'g/(P·d)'. Guarded so it only touches the two copies.)
  UPDATE fields
    SET unit = 'g/(P·d)'
    WHERE symbol = 'F_fett_haus'
      AND worksheet_template_id IN (v_ws07, v_ws09)
      AND unit IN ('g/(P*d)', 'g/(P·d)');

  -- ---- converge / sanity checks ---------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM compliance_requirements
    WHERE worksheet_template_id = v_ws15 AND code = 'REQ-M760-13'
      AND condition = 'ns_fettabscheider - NS >= 0' AND severity = 'block'
  ) THEN
    RAISE WARNING 'DWA-M-760: sizing gate REQ-M760-13 not present in expected form after INSERT — review.';
  END IF;

  RAISE NOTICE 'DWA-M-760 applied: SEV-1 sizing gate REQ-M760-13 ensured on M760-15 (subtraction form); SEV-2 F_fett_haus /1000 applied to % equation copy/copies. S3 dedup + G8 dup-codes FLAGGED (not applied); NS/NS_eff provenance left VA-blocked (DIN EN 1825-2).', v_eq_updated;
END $$;
