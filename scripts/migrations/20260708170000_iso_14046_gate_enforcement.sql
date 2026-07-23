-- =====================================================================================
-- Migration: ISO-14046 (Water footprint) DATA-track gate-enforcement FIX-DRAFT
-- File:      20260708170000_iso_14046_gate_enforcement.sql
-- Status:    WRITTEN-NOT-APPLIED  (do NOT apply to prod as part of authoring; review-gated)
-- Standard:  ISO-14046 "Environmental management - Water footprint - Principles,
--            requirements and guidelines (ISO 14046:2014)"; encoded edition = the
--            Colombian NTC-ISO 14046 identical-by-translation adoption (SPANISH source).
--            PDF: Desktop\Guidelines\DWA DIN Scribd\ISO-14046\ISO-14046.pdf (48 sheets).
--
-- APPLY:     node scripts/apply-migration.mjs scripts/migrations/20260708170000_iso_14046_gate_enforcement.sql
-- ROLLBACK:  restore the four CR conditions + REQ-21 severity to their pre-migration
--            values and DELETE the added attestation field, e.g.:
--              UPDATE compliance_requirements SET condition='TRUE'
--                WHERE code='REQ-21' AND worksheet_template_id=<ISO-14046-01 id>;
--              UPDATE compliance_requirements SET condition=
--                'allocation_procedure IS NOT NULL AND allocation_balance_preserved IS NOT NULL AND allocation_sensitivity_done IS NOT NULL'
--                WHERE code='REQ-11' AND worksheet_template_id=<ISO-14046-03 id>;
--              UPDATE compliance_requirements SET condition=
--                'weighting_applied IS NOT NULL AND comparative_assertion_public IS NOT NULL'
--                WHERE code='REQ-15' AND worksheet_template_id=<ISO-14046-04 id>;
--              UPDATE compliance_requirements SET condition=
--                'report_type  ==  internal OR third_party_report  ==  true'
--                WHERE code='REQ-18' AND worksheet_template_id=<ISO-14046-06 id>;
--              DELETE FROM fields WHERE symbol='attest_iso_14046_iso14044_conformance'
--                AND worksheet_template_id=<ISO-14046-01 id>;
--
-- =====================================================================================
-- FIX-DRAFT items implemented (see vault DEEP-ISO-14046.md "FIX-DRAFT"):
--   [3] REQ-21  G1-req21  (P-6e attestation) — replace `TRUE` no-op (the ISO 14044
--                          conformance umbrella) with a real attestation predicate over a
--                          NEW boolean field. §1/§5.3.1/§5.4.1/§6.1/§7.1 conformance to
--                          ISO 14044 is non-computable process conformance → attestation.
--   [4] REQ-11  G9-alloc  (P-6c) — allocation mass-balance was encoded as 3x presence
--                          (IS NOT NULL). No numeric allocated/pre-allocated total fields
--                          exist, so a real `==` balance is IMPOSSIBLE; enforce the honest
--                          available predicate: when an allocation procedure is chosen, the
--                          balance-preserved confirmation must be true.
--   [4] REQ-15  G9-wt     (P-6c) — "weighted results shall not be the basis of a public
--                          comparative assertion" was encoded as 2x presence; rewrite to the
--                          real implication (NOT weighting) OR (not public comparative).
--   [4] REQ-18  G10-bareid — bare identifier `internal` → quoted `'internal'`; trim the
--                          `  ==  ` double-space. (Enforces identically under evaluate.ts —
--                          bare RHS ident is already a string literal — but the quoted form
--                          is the correct, unambiguous authoring shape.)
--
-- LEFT UNFIXED (deliberate — flagged for Alvaro / engine):
--   * EQ-01  category_indicator_result = SUM(lci_result * characterization_factor)
--            — ENGINE-blocked (E2, SUM aggregate NOT supported by evaluate.ts). Left tagged
--            (verification_status stays verified_via_cross_reference, VC, correctly cited to
--            ISO 14044:2006 §3.37). NOT touched by this migration.
--   * REQ-21 SEVERITY stays 'warn' (prod value). The source ("debe cumplir con la Norma
--            ISO 14044", §5.4.1) reads as a shall → block-candidate, but flipping warn→block
--            is a policy change, not a data-honesty fix — FLAGGED for Alvaro, not applied.
--   * REQ-11 numeric mass-balance (allocated_total == preallocated_total): NO such numeric
--            fields exist in the ISO-14046 encoding → cannot be enforced. Honest boolean
--            confirmation used instead; flagged.
--   * All remaining REQ-* gates already enforce with real predicates over existing fields
--            (REQ-01 IN-set, REQ-08 offset ban, REQ-13/REQ-20 correct implications, etc.)
--            and are LEFT ALONE. Only the double-space whitespace on REQ-02/08/09/18 is a
--            cosmetic authoring artifact; REQ-18's is trimmed here as it is edited anyway.
--
-- P-13 (keyed table lookup on governing dimension): N/A — ISO-14046 has no keyed
--   regulation_tables driving any gate; none touched.
--
-- Grammar verified against src/lib/compliance/evaluate.ts (2026-07-08): supports
--   ( ) grouping, AND/OR/NOT, == != >= <= > <, IS [NOT] NULL, IN {..}, bool ==True.
--   NO chained compares (uses AND). NO SUM aggregate (E2). All conditions below conform.
-- =====================================================================================

DO $$
DECLARE
  v_standard_id  uuid;
  v_ws01_id      uuid;   -- ISO-14046-01 Registration & General Requirements
  v_ws03_id      uuid;   -- ISO-14046-03 Water Footprint Inventory Analysis
  v_ws04_id      uuid;   -- ISO-14046-04 Water Footprint Impact Assessment
  v_ws06_id      uuid;   -- ISO-14046-06 Reporting
  v_ws01_sec1    uuid;   -- first section of ISO-14046-01 (order_index=1)
  v_next_oi      integer;
  v_touched      integer;
BEGIN
  ----------------------------------------------------------------------------------
  -- Resolve standard + worksheet IDs (RAISE on any miss)
  ----------------------------------------------------------------------------------
  SELECT id INTO v_standard_id FROM standards WHERE code = 'ISO-14046';
  IF v_standard_id IS NULL THEN
    RAISE EXCEPTION 'Standard ISO-14046 not found';
  END IF;

  SELECT id INTO v_ws01_id FROM worksheet_templates
    WHERE standard_id = v_standard_id AND code = 'ISO-14046-01';
  SELECT id INTO v_ws03_id FROM worksheet_templates
    WHERE standard_id = v_standard_id AND code = 'ISO-14046-03';
  SELECT id INTO v_ws04_id FROM worksheet_templates
    WHERE standard_id = v_standard_id AND code = 'ISO-14046-04';
  SELECT id INTO v_ws06_id FROM worksheet_templates
    WHERE standard_id = v_standard_id AND code = 'ISO-14046-06';

  IF v_ws01_id IS NULL OR v_ws03_id IS NULL OR v_ws04_id IS NULL OR v_ws06_id IS NULL THEN
    RAISE EXCEPTION 'One or more ISO-14046 worksheets missing (01=% 03=% 04=% 06=%)',
      v_ws01_id, v_ws03_id, v_ws04_id, v_ws06_id;
  END IF;

  -- First section of ISO-14046-01 (lowest order_index) — home for the attestation field
  SELECT id INTO v_ws01_sec1 FROM worksheet_sections
    WHERE worksheet_template_id = v_ws01_id
    ORDER BY order_index ASC, id ASC
    LIMIT 1;
  IF v_ws01_sec1 IS NULL THEN
    RAISE EXCEPTION 'ISO-14046-01 has no worksheet_sections';
  END IF;

  ----------------------------------------------------------------------------------
  -- FIX [3] REQ-21 (G1-req21, P-6e attestation) — ISO 14044 conformance umbrella
  --   ISO-14046 §1 / §5.3.1 / §5.4.1 / §6.1 / §7.1 (PDF sheets 9, 20, 24, 28, 43).
  --   "La evaluación del impacto de la huella de agua debe cumplir con la Norma ISO
  --   14044." (§5.4.1). Process conformance across inventory/LCIA/reporting/review is
  --   non-computable → add a boolean attestation field + gate it == True (P-6e).
  --
  --   Step 1: idempotently add the attestation boolean field on ISO-14046-01.
  ----------------------------------------------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM fields
    WHERE worksheet_template_id = v_ws01_id
      AND symbol = 'attest_iso_14046_iso14044_conformance'
  ) THEN
    -- order_index = MAX(existing)+1 for this worksheet (all currently 0 → 1)
    SELECT COALESCE(MAX(f.order_index), 0) + 1 INTO v_next_oi
      FROM fields f WHERE f.worksheet_template_id = v_ws01_id;

    INSERT INTO fields (
      worksheet_template_id, section_id, symbol, label_de, label_en,
      data_type, is_required, order_index, clause_reference,
      description, verification_status, active, source_anchor, source_quote
    ) VALUES (
      v_ws01_id, v_ws01_sec1, 'attest_iso_14046_iso14044_conformance',
      'Bestätigung: Konformität mit ISO 14044:2006',
      'Attestation: conformance with ISO 14044:2006',
      'boolean', false, v_next_oi, '§2, §5.3.1, §5.4.1, §6.1, §7.1',
      'Attestation that the water footprint assessment conforms to ISO 14044:2006 '
        || 'across inventory calculation (§5.3.1), impact assessment (§5.4.1), '
        || 'weighting, reporting (§6.1) and critical review for public comparative '
        || 'assertions (§7.1). Non-computable process conformance (P-6e).',
      'imported_unverified', true,
      '§5.4.1 (NTC-ISO 14046, PDF sheet 28)',
      -- verbatim Spanish, render-confirmed (PDF sheet 28) + umbrella intro (sheet 9)
      'La evaluación del impacto de la huella de agua debe cumplir con la Norma ISO 14044. '
        || '(§5.4.1). "La evaluación de la huella de agua realizada de conformidad con esta '
        || 'Norma Internacional: - se basa en el análisis del ciclo de vida (de acuerdo con la '
        || 'Norma ISO 14044) …" (§1, Introducción). "Los cálculos del inventario deben seguir '
        || 'los procedimientos descritos en la Norma ISO 14044" (§5.3.1).'
    );
  END IF;

  --   Step 2: replace the TRUE no-op with the attestation predicate (converging UPDATE).
  UPDATE compliance_requirements
    SET condition = 'attest_iso_14046_iso14044_conformance == True',
        requires_attestation = true
    WHERE worksheet_template_id = v_ws01_id
      AND code = 'REQ-21';
  GET DIAGNOSTICS v_touched = ROW_COUNT;
  IF v_touched = 0 THEN
    RAISE EXCEPTION 'ISO-14046 REQ-21 not found on ISO-14046-01';
  END IF;
  -- NOTE: severity intentionally NOT changed (stays 'warn'; block-flip flagged for Alvaro).

  ----------------------------------------------------------------------------------
  -- FIX [4] REQ-11 (G9-alloc, P-6c) — allocation balance
  --   §5.3.3.1 (PDF sheet 20): "La suma de las entradas y salidas asignadas de un
  --   proceso unitario deben ser iguales a las entradas y salidas del proceso unitario
  --   antes de la asignación." No numeric total fields exist → the exact `==` balance is
  --   NOT encodable; enforce the honest available predicate: IF an allocation procedure
  --   is chosen THEN the balance-preserved confirmation must be true. Guarded form so a
  --   study with no allocation is not blocked.  (P-6c: (NOT antecedent) OR consequent.)
  ----------------------------------------------------------------------------------
  UPDATE compliance_requirements
    SET condition = '(NOT (allocation_procedure IS NOT NULL)) OR (allocation_balance_preserved == true)'
    WHERE worksheet_template_id = v_ws03_id
      AND code = 'REQ-11';
  GET DIAGNOSTICS v_touched = ROW_COUNT;
  IF v_touched = 0 THEN
    RAISE EXCEPTION 'ISO-14046 REQ-11 not found on ISO-14046-03';
  END IF;

  ----------------------------------------------------------------------------------
  -- FIX [4] REQ-15 (G9-wt, P-6c) — weighting not basis of public comparative assertion
  --   §5.4.7 (PDF sheet 24): "Si se aplica la ponderación, los resultados no deben
  --   utilizarse como base de una aseveración comparativa prevista para su divulgación
  --   al público." Rewrite presence pair → real implication:
  --   (NOT weighting_applied) OR (comparative_assertion_public == false).
  ----------------------------------------------------------------------------------
  UPDATE compliance_requirements
    SET condition = '(NOT (weighting_applied == true)) OR (comparative_assertion_public == false)'
    WHERE worksheet_template_id = v_ws04_id
      AND code = 'REQ-15';
  GET DIAGNOSTICS v_touched = ROW_COUNT;
  IF v_touched = 0 THEN
    RAISE EXCEPTION 'ISO-14046 REQ-15 not found on ISO-14046-04';
  END IF;

  ----------------------------------------------------------------------------------
  -- FIX [4] REQ-18 (G10-bareid) — quote the string literal + trim double-space
  --   §6.2 (PDF sheet 28-29). report_type enum values = {internal, third_party};
  --   `internal` must be a string literal. evaluate.ts already treats a bare RHS ident
  --   as a string literal, so this enforces identically — but the quoted form is the
  --   correct unambiguous authoring shape. Also collapse the `  ==  ` double-spaces.
  ----------------------------------------------------------------------------------
  UPDATE compliance_requirements
    SET condition = 'report_type == ''internal'' OR third_party_report == true'
    WHERE worksheet_template_id = v_ws06_id
      AND code = 'REQ-18';
  GET DIAGNOSTICS v_touched = ROW_COUNT;
  IF v_touched = 0 THEN
    RAISE EXCEPTION 'ISO-14046 REQ-18 not found on ISO-14046-06';
  END IF;

  RAISE NOTICE 'ISO-14046 gate-enforcement FIX-DRAFT applied: REQ-21 (attestation), REQ-11, REQ-15, REQ-18.';
END $$;
