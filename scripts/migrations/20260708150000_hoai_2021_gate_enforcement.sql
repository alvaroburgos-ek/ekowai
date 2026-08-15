-- ============================================================================
-- Migration: 20260708150000_hoai_2021_gate_enforcement.sql
-- Standard : HOAI-2021 (Honorarordnung für Architekten und Ingenieure, 2021)
-- Source   : Desktop/Guidelines/DWA DIN Scribd/bayika_hoai_2021.pdf
--            (Bayerische Ingenieurekammer-Bau, "HOAI 2021 - Textausgabe mit
--             Amtlicher Begründung", 135 pp; pdfinfo title = HOAI 2021 → AUTHORITATIVE)
--
-- WRITTEN-NOT-APPLIED. READ-ONLY campaign. Do NOT commit. Do NOT apply to prod.
--
-- Apply    : node scripts/apply-migration.mjs scripts/migrations/20260708150000_hoai_2021_gate_enforcement.sql
-- Rollback : the four gate UPDATEs restore `condition='TRUE'` on CR-02/21/22/23;
--            the three field INSERTs (attest_hoai_faelligkeit / attest_hoai_bauleitplanung
--            _baugb / attest_hoai_mehrere_objekte) are DELETE-able by symbol under the
--            HOAI-2021 worksheets. No data is destroyed by this migration (idempotent).
--
-- ----------------------------------------------------------------------------
-- FIX-DRAFT items implemented (DEEP-HOAI-2021.md + FIX-QUEUE.md):
--
--  SEV-1  G1 · F-noop-gates — 4 `TRUE` no-op BLOCK gates replaced with honest predicates:
--    CR-02 (§2a; §7)  → P-6a  s_satz within the Honorarspanne [0..1]  (Basissatz..oberer Satz)
--                              — enforces a valid rate is picked from the span WITHOUT forcing
--                                either Tafel bound (faithful to §2a Abs.1 / EuGH C-377/17).
--    CR-21 (§15)      → P-6e  attestation: Fälligkeit (§650g Abs.4 BGB) / Abschlagszahlungen
--                              (§632a BGB) — pure BGB cross-reference, nothing computable in HOAI.
--    CR-22 (§17)      → P-6c + P-6e  conditional attestation, required ONLY for Bauleitplanung
--                              (leistungsbild ∈ {flaechennutzungsplan,bebauungsplan}) — BauGB content.
--    CR-23 (§11)      → P-6e  attestation: mehrere Objekte getrennt berechnet / Wiederholungs-
--                              minderung §11 Abs.3 (50/60/90 %) applied — process rule, per-object
--                              structure not modeled → non-computable at gate level.
--
--  SEV-3  P2 · provenance backfill — the 4 touched CRs get a verbatim §-sentence source_quote
--         (VA — render-confirmed against the rendered HOAI PDF, this run).
--
--  P-13 fee-table key CHECK (LIVE): CR-02 reads the Honorarspanne the Honorartafel provides.
--    Verified against the rendered Honorartafel (p10/p11): the 914 `regulation_tables` rows are
--    keyed on Bezugsgröße (anrechenbare Kosten / Fläche / Verrechnungseinheiten) × Honorarzone (I–V),
--    von/bis = Basissatz/oberer Satz. This is the guideline's OWN governing dimension
--    (§2a Abs.1: "gegliedert nach den einzelnen Honorarzonen und den zugrunde liegenden Ansätzen
--    für Flächen, anrechenbare Kosten oder Verrechnungseinheiten"). Key is CORRECT — no re-key.
--
-- ----------------------------------------------------------------------------
-- LEFT-UNFIXED (deliberate — see final report):
--   * CR-08…CR-14 (F-phase-sum-arith / G3): the 9-term (6-term for Tragwerk) arithmetic
--     `(p_x_lph1+…) == 100` gates ALREADY ENFORCE — evaluate.ts engages the arithmetic
--     acompare path on `+` and parses parenthesised sums. NOT a TRUE no-op → LEFT ALONE.
--     (The audit flagged these "may not parse"; verified against evaluate.ts they DO parse.)
--   * CR-01/03/04/05/06/07/15/16/17/18/19/20: real enforcing predicates already → untouched.
--   * F-derived-formulas (S8): the 6 equations are faithful prose-derived implementations of the
--     HOAI fee chain (§13 interpolation VA at p9). Equation-layer provenance is out of scope for
--     this gate-enforcement migration (no arithmetic F-defect to fix; quotes are §-refs by nature).
--   * No ENGINE-blocked items: every predicate here uses grammar evaluate.ts supports
--     (comparison, AND/OR, NOT, IN{…}, IS NOT NULL, ==True). Nothing deferred to the ENGINE track.
-- ============================================================================

DO $$
DECLARE
  v_standard_id uuid;
  v_ws02 uuid;  -- HOAI-2021-02 Honorargrundlagen (data_collection)
  v_ws03 uuid;  -- HOAI-2021-03 Honorarermittlung (calculation)
  v_ws07 uuid;  -- HOAI-2021-07 Prüfung & Zusammenfassung (verification)

  v_cr02 uuid; v_cr21 uuid; v_cr22 uuid; v_cr23 uuid;

  v_sec_ws02 uuid;  -- target section for CR-22 field (WS-02)
  v_sec_ws07 uuid;  -- target section for CR-21/23 fields (WS-07)
  v_oi int;
BEGIN
  -- ---- resolve standard -----------------------------------------------------
  SELECT id INTO v_standard_id FROM standards WHERE code = 'HOAI-2021';
  IF v_standard_id IS NULL THEN
    RAISE EXCEPTION 'Standard HOAI-2021 not found';
  END IF;

  -- ---- resolve worksheets ---------------------------------------------------
  SELECT id INTO v_ws02 FROM worksheet_templates
    WHERE standard_id = v_standard_id AND code = 'HOAI-2021-02';
  SELECT id INTO v_ws03 FROM worksheet_templates
    WHERE standard_id = v_standard_id AND code = 'HOAI-2021-03';
  SELECT id INTO v_ws07 FROM worksheet_templates
    WHERE standard_id = v_standard_id AND code = 'HOAI-2021-07';
  IF v_ws02 IS NULL OR v_ws03 IS NULL OR v_ws07 IS NULL THEN
    RAISE EXCEPTION 'HOAI-2021 worksheet(s) missing: 02=% 03=% 07=%', v_ws02, v_ws03, v_ws07;
  END IF;

  -- ---- resolve the four TRUE no-op gates ------------------------------------
  SELECT id INTO v_cr02 FROM compliance_requirements WHERE code = 'HOAI-CR-02';
  SELECT id INTO v_cr21 FROM compliance_requirements WHERE code = 'HOAI-CR-21';
  SELECT id INTO v_cr22 FROM compliance_requirements WHERE code = 'HOAI-CR-22';
  SELECT id INTO v_cr23 FROM compliance_requirements WHERE code = 'HOAI-CR-23';
  IF v_cr02 IS NULL OR v_cr21 IS NULL OR v_cr22 IS NULL OR v_cr23 IS NULL THEN
    RAISE EXCEPTION 'HOAI-2021 CR(s) missing: 02=% 21=% 22=% 23=%', v_cr02, v_cr21, v_cr22, v_cr23;
  END IF;

  -- ==========================================================================
  -- STEP 1 — attestation fields for the non-computable "muss"/process gates.
  --   Idempotent INSERTs (guarded by NOT EXISTS on symbol within worksheet).
  --   section_id = first non-null section of the worksheet (lowest order_index);
  --   order_index = MAX+1 in that worksheet; active=true; verification_status=imported_unverified.
  -- ==========================================================================

  -- CR-21 field — Fälligkeit/Abschlagszahlungen attestation (WS-07, §15)  [P-6e]
  SELECT id INTO v_sec_ws07 FROM worksheet_sections
    WHERE worksheet_template_id = v_ws07 AND id IS NOT NULL
    ORDER BY order_index LIMIT 1;
  IF NOT EXISTS (
    SELECT 1 FROM fields
    WHERE worksheet_template_id = v_ws07 AND symbol = 'attest_hoai_faelligkeit'
  ) THEN
    SELECT COALESCE(MAX(order_index), 0) + 1 INTO v_oi FROM fields WHERE worksheet_template_id = v_ws07;
    INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en,
                        data_type, is_required, clause_reference, description,
                        order_index, verification_status, active)
    VALUES (
      v_ws07, v_sec_ws07, 'attest_hoai_faelligkeit',
      'Bestätigung Fälligkeit/Abschlagszahlungen (§15)',
      'Confirmation of fee maturity / interim payments (§15)',
      'boolean', false, '§15',
      'Bestätigung: Für die Fälligkeit gilt § 650g Abs. 4 BGB, für Abschlagszahlungen § 632a BGB entsprechend (§15). Kein in der HOAI selbst berechenbarer Wert → Attestierung.',
      v_oi, 'imported_unverified', true
    );
  END IF;

  -- CR-23 field — mehrere Objekte / Wiederholungsminderung attestation (WS-07, §11)  [P-6e]
  IF NOT EXISTS (
    SELECT 1 FROM fields
    WHERE worksheet_template_id = v_ws07 AND symbol = 'attest_hoai_mehrere_objekte'
  ) THEN
    SELECT COALESCE(MAX(order_index), 0) + 1 INTO v_oi FROM fields WHERE worksheet_template_id = v_ws07;
    INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en,
                        data_type, is_required, clause_reference, description,
                        order_index, verification_status, active)
    VALUES (
      v_ws07, v_sec_ws07, 'attest_hoai_mehrere_objekte',
      'Bestätigung getrennte Berechnung / Wiederholungsminderung mehrerer Objekte (§11)',
      'Confirmation of separate calculation / repetition reduction for multiple objects (§11)',
      'boolean', false, '§11',
      'Bestätigung: Umfasst der Auftrag mehrere Objekte, sind die Honorare vorbehaltlich §11 Abs.2–4 getrennt berechnet (§11 Abs.1); bei Wiederholungen sind die Prozentsätze der LPH 1–6 gemäß §11 Abs.3 gemindert (1.–4. Wdh. 50%, 5.–7. Wdh. 60%, ab 8. Wdh. 90%). Per-Objekt-Struktur wird im Blatt nicht modelliert → Attestierung.',
      v_oi, 'imported_unverified', true
    );
  END IF;

  -- CR-22 field — Bauleitplanung/BauGB conformity attestation (WS-02, §17)  [P-6c + P-6e]
  SELECT id INTO v_sec_ws02 FROM worksheet_sections
    WHERE worksheet_template_id = v_ws02 AND id IS NOT NULL
    ORDER BY order_index LIMIT 1;
  IF NOT EXISTS (
    SELECT 1 FROM fields
    WHERE worksheet_template_id = v_ws02 AND symbol = 'attest_hoai_bauleitplanung_baugb'
  ) THEN
    SELECT COALESCE(MAX(order_index), 0) + 1 INTO v_oi FROM fields WHERE worksheet_template_id = v_ws02;
    INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en,
                        data_type, is_required, clause_reference, description,
                        order_index, verification_status, active)
    VALUES (
      v_ws02, v_sec_ws02, 'attest_hoai_bauleitplanung_baugb',
      'Bestätigung Bauleitplanung nach § 1 Abs. 2 BauGB (§17)',
      'Confirmation of land-use planning per § 1 (2) BauGB (§17)',
      'boolean', false, '§17',
      'Bestätigung (nur bei Bauleitplanung, d.h. leistungsbild Flächennutzungs-/Bebauungsplan): Die Leistungen umfassen die Vorbereitung der Aufstellung von Flächennutzungs- und Bebauungsplänen im Sinne des § 1 Abs. 2 BauGB, die erforderlichen Ausarbeitungen/Planfassungen und die Mitwirkung beim Verfahren (§17 Abs.1). Inhaltliche Vorgaben werden vom BauGB getragen → Attestierung.',
      v_oi, 'imported_unverified', true
    );
  END IF;

  -- ==========================================================================
  -- STEP 2 — replace the four `TRUE` no-op BLOCK gates with honest predicates.
  --   Guarded (WHERE condition='TRUE') so re-application converges and never
  --   clobbers an already-fixed gate. source_quote backfilled (VA, render-confirmed).
  -- ==========================================================================

  -- CR-02 (§2a; §7) — Honorarspanne: s_satz ∈ [Basissatz(0) .. oberer Satz(1)]  [P-6a]
  -- FIX-DRAFT: G1 no-op → real check. Enforces that a rate within the Tafel span is chosen
  -- without forcing either bound (faithful to §2a Abs.1 Orientierungswerte / EuGH C-377/17).
  -- HOAI clause: §2a Abs.1 (Honorarspannen vom Basishonorarsatz bis zum oberen Honorarsatz),
  --              §7 Abs.1 (Honorar nach Textform-Vereinbarung, sonst Basishonorarsatz). PDF p6/p10.
  UPDATE compliance_requirements
    SET condition = 's_satz >= 0 AND s_satz <= 1',
        source_quote = 'Die Honorartafeln dieser Verordnung weisen Orientierungswerte aus … Die Honorartafeln enthalten für jeden Leistungsbereich Honorarspannen vom Basishonorarsatz bis zum oberen Honorarsatz, gegliedert nach den einzelnen Honorarzonen … (§2a Abs.1). Basishonorarsatz ist der jeweils untere in den Honorartafeln … enthaltene Honorarsatz (§2a Abs.2). Das Honorar richtet sich nach der Vereinbarung, die die Vertragsparteien in Textform treffen … sonst gilt … der jeweilige Basishonorarsatz (§7 Abs.1).',
        source_file = 'bayika_hoai_2021.pdf',
        source_anchor = '§2a Abs.1/2; §7 Abs.1 (S. 6/10)',
        suggestion = 'Wählen Sie den Honorarsatz (s_satz) innerhalb der Honorarspanne 0 (Basishonorarsatz) bis 1 (oberer Satz). Kein Tafelwert darf als zwingende Ober-/Untergrenze erzwungen werden (§2a, EuGH C-377/17).'
    WHERE id = v_cr02 AND condition = 'TRUE';

  -- CR-21 (§15) — Fälligkeit/Abschlagszahlungen attestation  [P-6e]
  -- FIX-DRAFT: G1 no-op → attestation (BGB cross-ref, non-computable). HOAI clause §15 (p10).
  UPDATE compliance_requirements
    SET condition = 'attest_hoai_faelligkeit == True',
        requires_attestation = true,
        source_quote = 'Für die Fälligkeit der Honorare für die von dieser Verordnung erfassten Leistungen gilt § 650g Absatz 4 des Bürgerlichen Gesetzbuchs entsprechend. Für das Recht, Abschlagszahlungen zu verlangen, gilt § 632a des Bürgerlichen Gesetzbuchs entsprechend. (§15)',
        source_file = 'bayika_hoai_2021.pdf',
        source_anchor = '§15 (S. 10)',
        suggestion = 'Bestätigen Sie, dass die Fälligkeit (§650g Abs.4 BGB) und ggf. Abschlagszahlungen (§632a BGB) berücksichtigt sind.'
    WHERE id = v_cr21 AND condition = 'TRUE';

  -- CR-22 (§17) — Bauleitplanung/BauGB conformity, conditional on leistungsbild  [P-6c + P-6e]
  -- FIX-DRAFT: G1 no-op → conditional attestation. Canonical implication form
  --   (NOT antecedent) OR consequent : if the leistungsbild is a Bauleitplanung type, the
  --   §1 Abs.2 BauGB scope must be attested; otherwise vacuously passes. HOAI clause §17 Abs.1 (p10).
  UPDATE compliance_requirements
    SET condition = '(NOT (leistungsbild IN {flaechennutzungsplan, bebauungsplan})) OR (attest_hoai_bauleitplanung_baugb == True)',
        requires_attestation = true,
        source_quote = 'Leistungen der Bauleitplanung umfassen die Vorbereitung der Aufstellung von Flächennutzungs- und Bebauungsplänen im Sinne des § 1 Absatz 2 des Baugesetzbuches in der jeweils geltenden Fassung, die erforderlichen Ausarbeitungen und Planfassungen sowie die Mitwirkung beim Verfahren. (§17 Abs.1)',
        source_file = 'bayika_hoai_2021.pdf',
        source_anchor = '§17 Abs.1 (S. 10)',
        suggestion = 'Bei Bauleitplanung (Flächennutzungs-/Bebauungsplan): bestätigen Sie die Konformität mit § 1 Abs. 2 BauGB. Andere Leistungsbilder sind nicht betroffen.'
    WHERE id = v_cr22 AND condition = 'TRUE';

  -- CR-23 (§11) — mehrere Objekte getrennt / Wiederholungsminderung attestation  [P-6e]
  -- FIX-DRAFT: G1 no-op → attestation (per-object structure not modeled). HOAI clause §11 (p8).
  UPDATE compliance_requirements
    SET condition = 'attest_hoai_mehrere_objekte == True',
        requires_attestation = true,
        source_quote = 'Umfasst ein Auftrag mehrere Objekte, so sind die Honorare vorbehaltlich der folgenden Absätze für jedes Objekt getrennt zu berechnen (§11 Abs.1). … so sind die Prozentsätze der Leistungsphasen 1 bis 6 für die erste bis vierte Wiederholung um 50 Prozent, für die fünfte bis siebte Wiederholung um 60 Prozent und ab der achten Wiederholung um 90 Prozent zu mindern (§11 Abs.3).',
        source_file = 'bayika_hoai_2021.pdf',
        source_anchor = '§11 Abs.1/3 (S. 8)',
        suggestion = 'Bestätigen Sie bei Mehrobjektaufträgen die getrennte Berechnung (§11 Abs.1) bzw. die Wiederholungsminderung (§11 Abs.3).'
    WHERE id = v_cr23 AND condition = 'TRUE';

  -- ---- converge check -------------------------------------------------------
  IF EXISTS (
    SELECT 1 FROM compliance_requirements
    WHERE code IN ('HOAI-CR-02','HOAI-CR-21','HOAI-CR-22','HOAI-CR-23')
      AND condition = 'TRUE'
  ) THEN
    RAISE WARNING 'HOAI-2021: one or more of CR-02/21/22/23 still has condition=TRUE after UPDATE (already re-fixed differently, or a symbol changed) — review.';
  END IF;

  RAISE NOTICE 'HOAI-2021 gate enforcement applied: CR-02/21/22/23 rewritten; 3 attestation fields ensured.';
END $$;
