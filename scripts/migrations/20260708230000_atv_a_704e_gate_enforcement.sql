-- ============================================================================
-- Migration: 20260708230000_atv_a_704e_gate_enforcement.sql
-- Standard : ATV-A-704E / DWA-A 704E — Operating Methods for Wastewater Analysis
-- Source   : Desktop/Ciruclar economy, sustanability and water test/ATV A 704E/
--            ATV-A-704E-Operating-Methods-for-Wastewater-Analysis.pdf
--            (rendered page headers "DWA-A 704E"; footer "April 2007"; DB version
--             "April 2007" → AUTHORITATIVE, FINAL/English edition of DWA-A 704).
--            ⚠ The PDF is FULLY SCANNED / image-only (0-char text layer) → EVERY
--            clause/value below was verified by RENDER (pdftoppm 130–400 dpi),
--            NOT by pdftotext (reverse-Trap-6: the rendered PDF wins; no OCR-repair).
--            Leaf ≠ printed page: leaf 20 = printed p.35, leaf 21 = printed p.36,
--            leaf 15 = printed p.25, leaf 30 = printed pp.54–55.
--
-- WRITTEN-NOT-APPLIED. READ-ONLY campaign. Do NOT commit. Do NOT apply to prod.
--
-- Apply    : node scripts/apply-migration.mjs scripts/migrations/20260708230000_atv_a_704e_gate_enforcement.sql
-- Rollback :
--   * STEP 1 (SEV-1): DELETE the new gate + field:
--       DELETE FROM compliance_requirements
--         WHERE code = 'CR-031'
--           AND worksheet_template_id = (SELECT wt.id FROM worksheet_templates wt
--               JOIN standards s ON s.id = wt.standard_id
--               WHERE s.code='ATV-A-704E' AND wt.code='ATV-A-704E-11');
--       DELETE FROM fields
--         WHERE symbol = 'ph_meter_check_done'
--           AND worksheet_template_id = (SELECT wt.id FROM worksheet_templates wt
--               JOIN standards s ON s.id = wt.standard_id
--               WHERE s.code='ATV-A-704E' AND wt.code='ATV-A-704E-11');
--   * STEP 2 (SEV-3): set source_quote = NULL back on equations EQ-03, EQ-04 and on
--       compliance_requirements CR-025, CR-026 (their pre-migration state).
--   * STEP 3 (SEV-4): restore CR-013.condition = 'training_courses_attended eq true'.
--   * STEP 4 (SEV-2): restore CR-019/022/023 to 'deviation_* <= qa_quality_target_pct'
--       (the `deviation_* - qa_quality_target_pct <= 0' → `<=` bare-ident form).
--   No other rows touched → fully reversible / idempotent (guarded UPDATEs, ON CONFLICT INSERTs).
--
-- ----------------------------------------------------------------------------
-- FIX-DRAFT items implemented (DEEP-ATV-A-704E.md + FIX-QUEUE.md + PATTERN-LIBRARY.md):
--
--  SEV-1  G9 · pH-meter monitoring gate OMISSION.   [pattern P-6e]
--    ── ⚠ REVERSE-TRAP-6 CORRECTION OF THE FIX-DRAFT ──
--    The DEEP audit (F-omission-pH) recalled, from the encoder's Import-Workbook,
--    a pH-meter tolerance of "< 0.2 pH, 1× per month" on "IQC-Card 2 Sheet 1".
--    RENDER-VERIFICATION REFUTES THE NUMERIC FIGURE:
--      • IQC-Card 9 "Testing Equipment Monitoring" (printed p.54, leaf 30) carries a
--        TWO-column table "Testing equipment | Monitoring". The pH-meter row reads,
--        verbatim (render-confirmed at 400 dpi):  "pH-meter | monthly".  There is NO
--        tolerance column and NO "< 0.2 pH" figure anywhere in IQC-Card 9. The only
--        numeric equipment tolerances printed are the piston-pipette table (≤2 %/≤1 %,
--        CR-025) and the thermoblock ±3 °C (CR-026) — NOT a pH figure.
--      • IQC-Card 2 Sheet 1 "Recommendations (example 1)" (printed p.25, leaf 15) is the
--        analyte × QA-measure table (IQC-Cards 3–7: ≤10 %/≤20 % random-error/deviation
--        targets). It contains NO pH-meter row and NO "< 0.2 pH" tolerance.
--    → Per task rule ("render-confirm the ±0.2/<0.2 figure verbatim before encoding;
--      if not unambiguous leave flagged NR; NEVER invent the tolerance value"), the
--      numeric `ph_meter_abweichung <= 0.2` gate is NOT written (the value is NOT in
--      this standard's source). The numeric-tolerance omission is recorded as NR /
--      for-Alvaro below.
--    → What IS render-confirmed is the pH-meter monitoring FREQUENCY (monthly). This is
--      a procedural "must be monitored monthly" requirement — NOT computable from any
--      field — so it is enforced as an ATTESTATION gate (P-6e, the legitimate use), the
--      same shape ATV-A-704E already uses for the annual photometer check (CR-027) and
--      the IQC-Card 9 frequency mandate (CR-024). This closes the GATE-OMISSION honestly
--      (the pH-meter monitoring requirement is now represented at all) without inventing
--      a number.
--    → New field ph_meter_check_done (boolean) mirrors the existing photometer_check_done
--      field on the SAME worksheet/section (WS-11, IQC-Card 9 equipment monitoring).
--    → severity = 'block': IQC-Card 9's frequency table is a "must" ("If the manufacturer
--      or legislator defines frequencies, they must be taken into account" — render-
--      confirmed, printed p.54); matches the block severity of the sibling equipment CRs.
--
--  SEV-3  P1 · source_quote BACKFILL (VA only, render-confirmed).   [pattern P-2 / P-3]
--    All 6 equations + several CRs ship source_quote = NULL in prod (the encoder OCR'd
--    the quotes into its IW artifact but they never reached the DB — the A1022-P0 pattern).
--    Backfilled ONLY where I own-rendered the verbatim printed text:
--      • EQ-03 calculated_value — IQC-Card 5 Sheet 1 (printed p.35, leaf 20). VA.
--      • EQ-04 NSS            — IQC-Card 5 Sheet 3 (printed p.36, leaf 21). VA.
--      • CR-025 pipette tolerance — IQC-Card 9 pipette table (printed p.54/leaf 30). VA.
--      • CR-026 thermoblock ±3 °C — IQC-Card 9 heating-device text (printed p.55/leaf 30). VA.
--    verification_status of EQ-03/EQ-04 is upgraded to 'verified_against_standard' (both
--    are BOXED/printed formulas, own-rendered verbatim). CRs carry no verification_status
--    column; their backfilled quotes are render-confirmed verbatim.
--    NOT backfilled (deliberately — see LEFT-UNFIXED): EQ-01/02/05/06 (procedure-only
--    %-deviation/mean statistics — NOT boxed in source, only procedure-confirmed → no
--    verbatim quote exists to lift → left imported_unverified) and CR-019/022/023
--    (IQC-Card references without a boxed verbatim mandate). No quote invented.
--
--  SEV-2  G3/symbol-RHS trap · CR-019 / CR-022 / CR-023 field-vs-field compares.  [P-6b]
--    ── ⚠ SYMBOL-RHS ALWAYS-FAILS TRAP (evaluate.ts L241-247/L364) ──
--    CR-019 'deviation_single_pct       <= qa_quality_target_pct'
--    CR-022 'deviation_equivalency_pct  <= qa_quality_target_pct'
--    CR-023 'deviation_parallel_pct     <= qa_quality_target_pct'
--    qa_quality_target_pct IS a numeric FIELD (confirmed: data_type=number, WS-08). But
--    the condition is `ident <= ident` with NO arithmetic operator → the parser takes the
--    LEGACY compare path (L244 isSimpleOperand) and coerces the bare-ident RHS to the
--    STRING LITERAL 'qa_quality_target_pct' (L364 operandToLiteral aref→string). In
--    compare(): toNumber('qa_quality_target_pct') = null → the numeric branch is skipped;
--    `<=` is neither `==` nor `!=` → returns FALSE. ⇒ these three BLOCK gates ALWAYS FAIL
--    (a false block — the mirror of a no-op, equally broken: a compliant lab can never pass).
--    → FIX to the ARITHMETIC SUBTRACTION FORM so the numeric acompare path is taken:
--        'deviation_single_pct      - qa_quality_target_pct <= 0'
--        'deviation_equivalency_pct - qa_quality_target_pct <= 0'
--        'deviation_parallel_pct    - qa_quality_target_pct <= 0'
--      A missing deviation or target now resolves to `pending` (evalArith→null), never a
--      false fail. Grammar-only rewrite; severity stays 'block'; the ≤-quality-target
--      semantics are IQC-Card 3/6/7 (already the CRs' clause_reference) — NOT a new threshold.
--
--  SEV-4  G10/E6 · CR-013 grammar: `eq` → `==`.   [pattern P-6a grammar hygiene]
--    CR-013.condition = 'training_courses_attended eq true' uses the non-DSL operator
--    `eq` (evaluate.ts tokenizes `==`, never `eq` → the whole condition fails to parse →
--    reported `manual`, i.e. the warn never actually evaluates). Rewritten to the boolean
--    truthy/`==` form the engine supports. It stays severity='warn' (source §4.3.3 is a
--    "should"/"necessary" recommendation, not a "must") — grammar-only fix, no severity change.
--
-- ----------------------------------------------------------------------------
-- LEFT-UNFIXED (deliberate — see final report):
--
--   * SEV-1 numeric pH tolerance "< 0.2 pH"  →  NR / FOR ALVARO. The figure is NOT in
--     ATV-A-704E's rendered source (verified IQC-Card 9 p.54 + IQC-Card 2 Sheet 1 p.25).
--     It appears to be an Import-Workbook artefact (possibly imported from a different
--     standard or the encoder's own recommendation). Do NOT encode `<= 0.2` from memory
--     (reverse-Trap-6). If a genuine pH-meter accuracy tolerance is required, it must be
--     sourced from the manufacturer's instruction manual (which IQC-Card 9 defers to:
--     "The device must be checked … according to the instructions manual") or a pH-metrology
--     standard — NOT fabricated here.
--
--   * CR-028 / CR-029 / CR-030  = literal 'manual' (IQC-Card 11 deviation record; DIN
--     38402-11 / EN ISO 5667 sampling cross-refs; DIN 38404/5/6/9 reference-method
--     cross-refs). Genuinely non-computable prose / VC cross-references owned by other
--     standards (P-6e / VC territory). Left 'manual' — correct as-is.
--
--   * CR-025 / CR-026 already ENFORCE correctly (parenthesised OR of numeric-LITERAL-RHS
--     compares / `<= 3` numeric literal) → NOT touched (task rule: do not "fix" gates that
--     already enforce). Only their source_quote is backfilled (VA, STEP 2).
--     [NOTE: CR-019/022/023 do NOT enforce — they hit the symbol-RHS trap — and are FIXED
--      in STEP 4 above, not left unfixed.]
--
--   * source_quote backfill for EQ-01/02/05/06 + CR-019/022/023 — the %-deviation/mean
--     statistics are procedure-confirmed (trivial + IW-corroborated) but NOT printed as
--     boxed formulas → no verbatim text to lift without fabrication → LEFT as-is
--     (imported_unverified). VA-only discipline.
--
--   * ENGINE-blocked: NONE. The only new predicate is an attestation `== True`
--     (grammar evaluate.ts fully supports); the CR-013 fix is a boolean truthy/`==`
--     rewrite. Nothing deferred to the ENGINE track (E1–E6).
--
-- P-13 note: ATV-A-704E has NO regulation_tables / keyed-lookup content touched here.
--   The new gate keys on a single produced/entered boolean on the pH-meter's OWN
--   monitoring row (IQC-Card 9's governing dimension = the equipment item). No lookup is
--   re-keyed or coarsened → P-13 not triggered.
-- ============================================================================

DO $$
DECLARE
  v_standard_id uuid;
  v_ws11 uuid;   -- ATV-A-704E-11 "Testing Equipment Monitoring" (IQC-Card 9; owns equipment fields)
  v_ws03 uuid;   -- ATV-A-704E-03 (carries CR-013 training warn)
  v_ws09 uuid;   -- ATV-A-704E-09 (carries EQ-03 / EQ-04)
  v_sec_equipment uuid;  -- WS-11 section that carries heating_device_deviation / photometer_check_done
  v_next_order int;
  v_has_photometer boolean;   -- sibling field the new pH field mirrors
  v_eq_updated int := 0;
  v_cr_updated int := 0;
BEGIN
  -- ---- resolve standard -----------------------------------------------------
  SELECT id INTO v_standard_id FROM standards WHERE code = 'ATV-A-704E';
  IF v_standard_id IS NULL THEN
    RAISE EXCEPTION 'Standard ATV-A-704E not found';
  END IF;

  -- ---- resolve worksheets ---------------------------------------------------
  SELECT id INTO v_ws11 FROM worksheet_templates
    WHERE standard_id = v_standard_id AND code = 'ATV-A-704E-11';
  IF v_ws11 IS NULL THEN
    RAISE EXCEPTION 'ATV-A-704E worksheet ATV-A-704E-11 (Testing Equipment Monitoring) not found';
  END IF;

  SELECT id INTO v_ws03 FROM worksheet_templates
    WHERE standard_id = v_standard_id AND code = 'ATV-A-704E-03';
  IF v_ws03 IS NULL THEN
    RAISE EXCEPTION 'ATV-A-704E worksheet ATV-A-704E-03 not found';
  END IF;

  SELECT id INTO v_ws09 FROM worksheet_templates
    WHERE standard_id = v_standard_id AND code = 'ATV-A-704E-09';
  IF v_ws09 IS NULL THEN
    RAISE EXCEPTION 'ATV-A-704E worksheet ATV-A-704E-09 not found';
  END IF;

  -- ==========================================================================
  -- STEP 1 — SEV-1 (G9): pH-meter monthly-monitoring gate + field on WS-11.
  --   [P-6e attestation — the render-confirmed requirement is a procedural
  --    "monitor monthly", which is NOT computable → attestation, NOT a fabricated
  --    numeric tolerance. See header REVERSE-TRAP-6 note.]
  -- ==========================================================================

  -- Resolve the equipment-monitoring section on WS-11 (the one that already carries
  -- the sibling photometer_check_done / heating_device_deviation fields). Fall back
  -- to the worksheet's FIRST section if the sibling can't be located, per task rule.
  SELECT f.section_id INTO v_sec_equipment
    FROM fields f
    WHERE f.worksheet_template_id = v_ws11
      AND f.symbol = 'photometer_check_done'
    LIMIT 1;

  IF v_sec_equipment IS NULL THEN
    SELECT id INTO v_sec_equipment FROM worksheet_sections
      WHERE worksheet_template_id = v_ws11
      ORDER BY order_index ASC
      LIMIT 1;
  END IF;

  IF v_sec_equipment IS NULL THEN
    RAISE EXCEPTION 'ATV-A-704E WS-11 has no section to attach ph_meter_check_done to';
  END IF;

  -- order_index = MAX+1 over the worksheet (all existing WS-11 fields are 0 → this = 1).
  SELECT COALESCE(MAX(order_index), -1) + 1 INTO v_next_order
    FROM fields WHERE worksheet_template_id = v_ws11;

  -- Idempotent field INSERT (guarded on (worksheet_template_id, symbol)).
  -- Mirrors the existing boolean photometer_check_done field exactly in shape.
  IF NOT EXISTS (
    SELECT 1 FROM fields
     WHERE worksheet_template_id = v_ws11 AND symbol = 'ph_meter_check_done'
  ) THEN
    INSERT INTO fields
      (worksheet_template_id, section_id, symbol, label_de, label_en, data_type,
       is_required, clause_reference, description, order_index, active,
       verification_status, source_file, source_anchor, source_quote)
    VALUES (
      v_ws11,
      v_sec_equipment,
      'ph_meter_check_done',
      'pH-Meter monatlich überwacht',
      'pH-meter monitored monthly',
      'boolean',
      false,
      'Annex A, IQC-Card 9 — Testing Equipment Monitoring (monitoring frequency table)',
      'The pH-meter shall be monitored per IQC-Card 9 (recommended monitoring frequency: monthly). Manufacturer/legislator frequency takes precedence if defined.',
      v_next_order,
      true,
      'imported_unverified',
      'ATV-A-704E-Operating-Methods-for-Wastewater-Analysis.pdf',
      'Annex A, IQC-Card 9 (printed p.54, leaf 30, rendered)',
      'Recommendations for control- and monitoring frequencies can be taken from the table. If the manufacturer or legislator defines frequencies, they must be taken into account. [Testing equipment | Monitoring] ... pH-meter | monthly'
    );
  END IF;

  -- Idempotent gate INSERT (guarded on (worksheet_template_id, code)).
  -- ATTESTATION form (== True) — the render-confirmed requirement is procedural
  -- (monitor monthly), not computable → P-6e. requires_attestation = true so it is
  -- visibly a sign-off, matching CR-024/CR-027's shape. NOT a numeric <=0.2 gate.
  INSERT INTO compliance_requirements
    (worksheet_template_id, code, title_de, title_en, condition, severity,
     requires_attestation, clause_reference, source_file, source_anchor, source_quote,
     description, suggestion)
  VALUES (
    v_ws11,
    'CR-031',
    'pH-Meter-Überwachung (monatlich) — IQC-Card 9',
    'pH-meter monitoring (monthly) — IQC-Card 9',
    'ph_meter_check_done == True',
    'block',
    true,
    'Annex A, IQC-Card 9 — Testing Equipment Monitoring',
    'ATV-A-704E-Operating-Methods-for-Wastewater-Analysis.pdf',
    'Annex A, IQC-Card 9 (printed p.54, leaf 30, rendered)',
    'Recommendations for control- and monitoring frequencies can be taken from the table. If the manufacturer or legislator defines frequencies, they must be taken into account. [Testing equipment | Monitoring] ... pH-meter | monthly. The check is carried out in a defined frequency and is documented on Sheet 1 of this card for all devices and reagents.',
    'Confirm the pH-meter has been monitored at the required frequency (monthly per IQC-Card 9, or the manufacturer/legislator frequency if stricter) and document it on Sheet 1 of IQC-Card 9. NOTE: ATV-A-704E prints NO numeric pH-meter accuracy tolerance (no "< 0.2 pH" figure) — any such acceptance limit must come from the pH-meter''s instruction manual, not from this standard.'
  )
  ON CONFLICT (worksheet_template_id, code) DO NOTHING;

  -- ==========================================================================
  -- STEP 2 — SEV-3 (P1): VA source_quote backfill (render-confirmed only). [P-2/P-3]
  -- ==========================================================================

  -- EQ-03 calculated_value — IQC-Card 5 Sheet 1 (printed p.35, leaf 20). Own-rendered.
  UPDATE equations
    SET source_quote = 'IQC-Card 5 — Plausibility Check by Dilution and Standard Addition, Sheet 1 — Dilution. Formulas for calculation: DILUTION FACTOR = TOTAL VOLUME / SAMPLE VOLUME. CALCULATED VALUE = DILUTION FACTOR · MEASURED VALUE DILUTED SAMPLE.',
        source_file = 'ATV-A-704E-Operating-Methods-for-Wastewater-Analysis.pdf',
        source_anchor = 'Annex A, IQC-Card 5 Sheet 1 (printed p.35, leaf 20, rendered)',
        verification_status = 'verified_against_standard'
    WHERE worksheet_template_id = v_ws09
      AND output_symbol = 'calculated_value'
      AND source_quote IS NULL;
  GET DIAGNOSTICS v_eq_updated = ROW_COUNT;

  -- EQ-04 NSS — IQC-Card 5 Sheet 3 (printed p.36, leaf 21). Own-rendered.
  UPDATE equations
    SET source_quote = 'IQC-Card 5 — Plausibility Check, Sheet 3 — standard addition (general procedure). Calculation: NOMINAL VALUE SPIKED SAMPLE (NSS, column 8): NSS = (volume sample · measured value original sample + volume standard · concentration standard) / (volume sample + volume standard).',
        source_file = 'ATV-A-704E-Operating-Methods-for-Wastewater-Analysis.pdf',
        source_anchor = 'Annex A, IQC-Card 5 Sheet 3 (printed p.36, leaf 21, rendered)',
        verification_status = 'verified_against_standard'
    WHERE worksheet_template_id = v_ws09
      AND output_symbol = 'NSS'
      AND source_quote IS NULL;
  GET DIAGNOSTICS v_eq_updated = v_eq_updated + ROW_COUNT;

  -- CR-025 pipette tolerance — IQC-Card 9 piston-pipette monitoring (printed p.54, leaf 30). VA.
  UPDATE compliance_requirements
    SET source_quote = 'IQC-Card 9 — Testing Equipment Monitoring, Monitoring of piston stroke pipettes. Interpretation and documentation of the measuring results: the mean value must lie within a defined tolerance range (see table). Tested volume [ml] / Deviation [%] / Tolerance range [g]: 0.100 / ≤ 2 / 0.098–0.102; 0.200 / ≤ 2 / 0.196–0.204; 0.500 / ≤ 2 / 0.490–0.510; 1.000 / ≤ 1 / 0.990–1.010; 2.000 / ≤ 1 / 1.980–2.020. If the results lie outside the tolerance range, the pipette may no longer be used for testing equipment and must be sent to the manufacturer for testing, if necessary.',
        source_file = 'ATV-A-704E-Operating-Methods-for-Wastewater-Analysis.pdf',
        source_anchor = 'Annex A, IQC-Card 9 pipette table (printed p.54, leaf 30, rendered)'
    WHERE worksheet_template_id = (SELECT id FROM worksheet_templates
                                    WHERE standard_id = v_standard_id AND code = 'ATV-A-704E-08')
      AND code = 'CR-025'
      AND source_quote IS NULL;
  GET DIAGNOSTICS v_cr_updated = ROW_COUNT;

  -- CR-026 thermoblock ±3 °C — IQC-Card 9 heating-device monitoring (printed p.55, leaf 30). VA.
  UPDATE compliance_requirements
    SET source_quote = 'IQC-Card 9 — Testing Equipment Monitoring, Monitoring of heating device/thermoblock: Within the scope of testing equipment monitoring, the function of thermoblocks must be checked annually. Check of the required temperatures of 100 °C and/or 148 °C (± 3 °C). Alternatively, also other/further frequently used temperatures can be tested. ... The temperature is measured at the earliest 10 min after the control lamp extinguishes.',
        source_file = 'ATV-A-704E-Operating-Methods-for-Wastewater-Analysis.pdf',
        source_anchor = 'Annex A, IQC-Card 9 heating-device text (printed p.55, leaf 30, rendered)'
    WHERE worksheet_template_id = (SELECT id FROM worksheet_templates
                                    WHERE standard_id = v_standard_id AND code = 'ATV-A-704E-08')
      AND code = 'CR-026'
      AND source_quote IS NULL;
  GET DIAGNOSTICS v_cr_updated = v_cr_updated + ROW_COUNT;

  -- ==========================================================================
  -- STEP 3 — SEV-4 (G10/E6): CR-013 grammar `eq` → `==` (parse-fix; stays 'warn'). [P-6a]
  --   Guarded by the OLD condition so re-application converges. Boolean truthy/`==`
  --   form is fully supported by evaluate.ts (KEYWORDS has no `eq`).
  -- ==========================================================================
  UPDATE compliance_requirements
    SET condition = 'training_courses_attended == true'
    WHERE worksheet_template_id = v_ws03
      AND code = 'CR-013'
      AND condition = 'training_courses_attended eq true';

  -- ==========================================================================
  -- STEP 4 — SEV-2 (symbol-RHS trap): CR-019/022/023 field-vs-field compares.  [P-6b]
  --   Rewrite `deviation_* <= qa_quality_target_pct` (bare-ident RHS → string → always
  --   FALSE) to the arithmetic subtraction form `deviation_* - qa_quality_target_pct <= 0`
  --   so the numeric acompare path is engaged. See header ⚠ SYMBOL-RHS note. Each guarded
  --   by its OLD condition → idempotent/converging. CRs live on WS-08.
  -- ==========================================================================
  UPDATE compliance_requirements
    SET condition = 'deviation_single_pct - qa_quality_target_pct <= 0'
    WHERE code = 'CR-019'
      AND condition = 'deviation_single_pct <= qa_quality_target_pct'
      AND worksheet_template_id = (SELECT id FROM worksheet_templates
                                    WHERE standard_id = v_standard_id AND code = 'ATV-A-704E-08');

  UPDATE compliance_requirements
    SET condition = 'deviation_equivalency_pct - qa_quality_target_pct <= 0'
    WHERE code = 'CR-022'
      AND condition = 'deviation_equivalency_pct <= qa_quality_target_pct'
      AND worksheet_template_id = (SELECT id FROM worksheet_templates
                                    WHERE standard_id = v_standard_id AND code = 'ATV-A-704E-08');

  UPDATE compliance_requirements
    SET condition = 'deviation_parallel_pct - qa_quality_target_pct <= 0'
    WHERE code = 'CR-023'
      AND condition = 'deviation_parallel_pct <= qa_quality_target_pct'
      AND worksheet_template_id = (SELECT id FROM worksheet_templates
                                    WHERE standard_id = v_standard_id AND code = 'ATV-A-704E-08');

  -- ---- converge / sanity checks ---------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM compliance_requirements
    WHERE worksheet_template_id = v_ws11 AND code = 'CR-031'
      AND condition = 'ph_meter_check_done == True' AND severity = 'block'
  ) THEN
    RAISE WARNING 'ATV-A-704E: pH-meter gate CR-031 not present in expected form after INSERT — review.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM compliance_requirements
    WHERE worksheet_template_id = v_ws03 AND code = 'CR-013'
      AND condition LIKE '% eq %'
  ) THEN
    RAISE WARNING 'ATV-A-704E: CR-013 still uses the `eq` operator after UPDATE — review.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM compliance_requirements cr
    JOIN worksheet_templates wt ON wt.id = cr.worksheet_template_id
    WHERE wt.standard_id = v_standard_id
      AND cr.code IN ('CR-019','CR-022','CR-023')
      AND cr.condition LIKE '%<= qa_quality_target_pct'
  ) THEN
    RAISE WARNING 'ATV-A-704E: CR-019/022/023 still in the symbol-RHS `<= qa_quality_target_pct` form after UPDATE — review.';
  END IF;

  RAISE NOTICE 'ATV-A-704E applied: SEV-1 pH-meter monthly-monitoring attestation gate CR-031 + field ph_meter_check_done ensured on WS-11 (NO numeric <0.2 gate — figure not in source, flagged NR); SEV-2 CR-019/022/023 symbol-RHS trap fixed (subtraction form); SEV-3 % equations + % CRs source_quote backfilled (VA render-confirmed); SEV-4 CR-013 eq->== fixed.', v_eq_updated, v_cr_updated;
END $$;
