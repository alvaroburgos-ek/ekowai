-- ============================================================================
-- Migration: 20260708190000_din_en_16941_2_gate_enforcement.sql
-- Standard : DIN-EN-16941-2 (DIN EN 16941-2:2021-11 — Anlagen für Nicht-
--            Trinkwasser vor Ort, Teil 2: Anlagen zur Nutzung von behandeltem
--            Grauwasser). HEALTH-CRITICAL: all 19 CRs are severity=block.
-- Source   : Desktop/Guidelines/DWA DIN Scribd/DIN-EN-16941-2/DIN-EN-16941-2.pdf
--            (33 pp; header rendered "DIN EN 16941-2:2021-11" / "EN 16941-2:2021 (D)";
--             DB version "EN 16941-2:2021" → AUTHORITATIVE). The text layer is present
--             and clean for the two clauses touched here, and BOTH were additionally
--             RENDER-confirmed (pdftoppm 140 dpi) per playbook Trap-6 (PDF wins):
--               · §6.1  Allgemeines           — printed p18 / PDF p20 (min-rule)
--               · Anhang C (informativ) Farbtest — printed p27 / PDF p29 (pass criterion)
--
-- WRITTEN-NOT-APPLIED. READ-ONLY campaign. Do NOT commit. Do NOT apply to prod.
--
-- Apply    : node scripts/apply-migration.mjs scripts/migrations/20260708190000_din_en_16941_2_gate_enforcement.sql
-- Rollback : both edits are single guarded gate UPDATEs and are self-restoring:
--              · CR-15: restore condition = 'querverbindungstest_ergebnis == bestanden'
--              · CR-12: restore condition = 'Y_G IS NOT NULL AND D_G IS NOT NULL AND bemessungswert_massgebend IS NOT NULL'
--            No fields inserted/deleted; no data destroyed; fully idempotent.
--
-- ----------------------------------------------------------------------------
-- FIX-DRAFT items implemented (DEEP-DIN-EN-16941-2.md + FIX-QUEUE.md):
--
--  SEV-1  G10 · bare-identifier on a SAFETY test — CR-15 cross-connection Farbtest.
--    Live condition `querverbindungstest_ergebnis == bestanden` has an UNQUOTED bare
--    identifier `bestanden` on the RHS of the §9 / Anhang C cross-connection safety
--    test (the gate that guards Trink-/Nicht-Trinkwasser cross-connection).
--    → rewritten to the membership form `querverbindungstest_ergebnis IN {bestanden}`.
--    [pattern P-6d — four-state-aware / IN-set gate; also anti-G10]
--    The field `querverbindungstest_ergebnis` is a data_type='enum' with EXACTLY the
--    two states Anhang C defines — `bestanden` (BESTANDEN / PASS) and `nicht_bestanden`
--    (NICHT BESTANDEN / FAIL) — so the pass-set is {bestanden} and the gate blocks on
--    `nicht_bestanden`. The IN-set is the faithful encoding of the source's binary
--    pass/fail states and removes the bare-identifier parse hazard on a SEV-1 gate.
--    (Note: under evaluate.ts a bare RHS ident is *already* treated as a string literal,
--     so the live gate is not dead today; but a malformed token could silently mis-parse
--     a safety gate — the IN-set makes the pass-state set explicit and audit-legible.)
--    RENDER-confirmed Anhang C (p27/PDF p29):
--      "Ventile für Nicht-Trinkwasser zeigen gefärbtes Wasser: BESTANDEN;
--       Ventile für Trinkwasser mit gefärbtem oder nicht-gefärbtem Wasser: NICHT BESTANDEN;
--       nicht zulässige Querverbindung …" — a strict binary; {bestanden} is the pass set.
--    NO third state invented.
--
--  SEV-1  G9/G5 · presence-only where a computed MIN-rule is prescribed — CR-12 (§6.1).
--    Live condition is the triple presence check
--      `Y_G IS NOT NULL AND D_G IS NOT NULL AND bemessungswert_massgebend IS NOT NULL`
--    but §6.1 mandates that the design value BE the LOWER of yield (Y_G) or demand (D_G).
--    → rewritten to the supported min-rule enforcement
--      `bemessungswert_massgebend - Y_G <= 0 AND bemessungswert_massgebend - D_G <= 0`.
--    [pattern P-6b — computed-threshold gate; enforces §6.1 min-rule]
--    RENDER-confirmed §6.1 (p18/PDF p20):
--      "Für die Gesamtauslegung des Systems muss der niedrigste berechnete Wert für
--       den Ertrag oder den Bedarf verwendet werden."
--    Semantics: (design − yield ≤ 0) AND (design − demand ≤ 0) — the design value may not
--    exceed EITHER yield or demand, i.e. it equals the lower when it sits on the boundary.
--
--    ⚠ WHY THE SUBTRACTION FORM (NOT `<= Y_G AND <= D_G`): evaluate.ts's backward-compat
--    rule (evaluate.ts §"Arithmetic note" + operandToLiteral) makes a BARE-IDENT RHS a
--    STRING LITERAL when NO +,-,*,/ appears — so the naive `bemessungswert_massgebend <= Y_G`
--    would parse as `compare(bemessungswert, '<=', "Y_G")`, coerce "Y_G"→NaN, and ALWAYS FAIL
--    (Y_G is never looked up). Introducing arithmetic (`- Y_G`) forces the `acompare` path,
--    which resolves BOTH sides as symbols. VERIFIED against a standalone port of
--    src/lib/compliance/evaluate.ts: this form gives pass (design ≤ both), fail (design >
--    either), and pending when any of the three operands is missing — never a false fail.
--    Because all three symbols must resolve for the compare to evaluate, the min-rule
--    STRICTLY SUBSUMES the old triple-presence check (presence is implied).
--    ── E2 flag: the exact-equality form `bemessungswert_massgebend == LEAST(Y_G, D_G)`
--       (or `min(...)`) is NOT expressible — evaluate.ts has no function-call / LEAST /
--       min grammar (confirmed: no call node in the parser). The `- <= 0` both form is the
--       faithful enforceable equivalent; the exact `== LEAST(...)` form is flagged as an
--       ENGINE-E2 follow-up for Alvaro (see final report). NO threshold invented.
--
-- ----------------------------------------------------------------------------
-- LEFT-UNFIXED (deliberate — see final report):
--   * The `V_WM_y` / `V_WM_d` split (Gl.1 yield vs Gl.2 demand) is a FAITHFUL
--     disambiguation of the source's reused single symbol `V_WM`/`u_WM` (anti-collision;
--     WM greywater PRODUCED in Gl.1 vs WM water DEMANDED in Gl.2). It is CORRECT and is
--     NOT touched. Both are independent input fields (verified: V_WM_y required on ws-03
--     §6.2.4.2; V_WM_d on ws-03 §6.2.4.3). Symbol map: V_WM_y ← source V_WM (Gl.1),
--     V_WM_d ← source V_WM (Gl.2).
--
--   * CR-07 (`ueberlauf_kapazitaet >= zufluss_kapazitaet`, §5.4.9) — ALREADY ENFORCES.
--     A two-field `aref >= aref` comparison → evaluate.ts acompare path; missing operand
--     → pending, never false pass. Render-confirmed §5.4.9. NOT a no-op → LEFT ALONE.
--
--   * CR-08 (`rueckflusssicherung_typ IN {AA,AB}`, §5.5.2 / EN 1717 Kat. 5 freier Auslauf)
--     — ALREADY ENFORCES (IN-set, backflow protection). Untouched.
--
--   * CR-13 (`abstand_wurzeln_m >= 3`, §7) — ALREADY ENFORCES (numeric ≥3 m from roots).
--     Untouched.
--
--   * CR-17 (`probenahmestelle_im_verteilsystem IS NOT NULL AND bewertung_status IS NOT NULL`,
--     §11) — presence-only (audit G5, mild). The §11 requirement is that a sampling point
--     exist in the distribution system and a Bewertung against the Anhang D EXAMPLE guide
--     values (Tab. D.1–D.4, "informativ") be recorded. The Anhang D values are INFORMATIVE
--     (Beispiel-Richtwerte), so no normative numeric pass/fail threshold exists in this
--     standard's own text to gate on → the honest gate is the presence of a sampling point
--     + a recorded assessment status. NO threshold invented; NOT flipped to a fabricated
--     numeric compare. Left as presence-only, flagged (see report). NOT in the FIX-DRAFT
--     gap list beyond the general G5 note.
--
--   * CR-01/02/03/04/05/06/09/10/11/14/16/18/19 — real enforcing `== true` attestations /
--     boolean-presence gates for genuinely non-computable "muss" requirements (separate
--     collection, bypass, treatment, opaque store, structural/watertight proof, dry-run
--     protection, plant control, no cross-connections, labelling, commissioning record,
--     risk assessment, operating log). All render/text-confirmed against §5–§12; the
--     audit rated the gate layer "a model for a health-critical standard". Untouched.
--
--   * NO field INSERTs — every symbol referenced by the two rewritten gates already
--     exists (querverbindungstest_ergebnis enum on ws-04; Y_G / D_G / bemessungswert_
--     massgebend number fields on ws-03). Nothing to add.
--
--   * ENGINE-track only: exact `== LEAST(Y_G, D_G)` for CR-12 (E2, above); the equations
--     Gl.1/Gl.2 are `n·Σ(products)` → engine-computable once E1 ships (X2). Neither is a
--     DATA-track fix; both deferred to the ENGINE track. Not built here.
--
-- P-13 note: N/A. DIN-EN-16941-2 has NO keyed `regulation_tables` lookup driving any gate.
--   Its only tabular data is Anhang A (typical use volumes) and Anhang D (example water-
--   quality guide values), both marked "(informativ)" in the ToC → they are NOT converted
--   into a normative lookup and drive no gate. No table re-key needed; nothing keyed.
-- ============================================================================

DO $$
DECLARE
  v_standard_id uuid;
  v_ws03 uuid;  -- DIN-EN-16941-2-03 Bemessung: Grauwasserertrag, -bedarf und Speicherkapazitaet (calculation)
  v_ws04 uuid;  -- DIN-EN-16941-2-04 Einbau, Kennzeichnung, Inbetriebnahme und Wasserqualitaetspruefung (verification)
  v_cr12 uuid;
  v_cr15 uuid;
BEGIN
  -- ---- resolve standard -----------------------------------------------------
  SELECT id INTO v_standard_id FROM standards WHERE code = 'DIN-EN-16941-2';
  IF v_standard_id IS NULL THEN
    RAISE EXCEPTION 'Standard DIN-EN-16941-2 not found';
  END IF;

  -- ---- resolve worksheets ---------------------------------------------------
  SELECT id INTO v_ws03 FROM worksheet_templates
    WHERE standard_id = v_standard_id AND code = 'DIN-EN-16941-2-03';
  IF v_ws03 IS NULL THEN
    RAISE EXCEPTION 'DIN-EN-16941-2 worksheet DIN-EN-16941-2-03 not found';
  END IF;

  SELECT id INTO v_ws04 FROM worksheet_templates
    WHERE standard_id = v_standard_id AND code = 'DIN-EN-16941-2-04';
  IF v_ws04 IS NULL THEN
    RAISE EXCEPTION 'DIN-EN-16941-2 worksheet DIN-EN-16941-2-04 not found';
  END IF;

  -- ---- resolve the two gates being rewritten --------------------------------
  SELECT id INTO v_cr12 FROM compliance_requirements WHERE code = 'DIN-EN-16941-2-CR-12';
  IF v_cr12 IS NULL THEN
    RAISE EXCEPTION 'DIN-EN-16941-2 CR-12 not found';
  END IF;

  SELECT id INTO v_cr15 FROM compliance_requirements WHERE code = 'DIN-EN-16941-2-CR-15';
  IF v_cr15 IS NULL THEN
    RAISE EXCEPTION 'DIN-EN-16941-2 CR-15 not found';
  END IF;

  -- ==========================================================================
  -- STEP 1 — CR-15 (SEV-1) cross-connection safety test: bare-id → IN-set.
  --   [FIX-DRAFT G10 · P-6d]  §9 / Anhang C (informativ), Farbtest.
  --   Guarded on the exact live bare-id condition so re-application converges and
  --   never clobbers a differently-fixed gate. severity stays 'block' (safety).
  --   Render-confirmed Anhang C p27/PDF p29: BESTANDEN vs NICHT BESTANDEN (binary).
  -- ==========================================================================
  UPDATE compliance_requirements
    SET condition   = 'querverbindungstest_ergebnis IN {bestanden}',
        source_file = 'DIN-EN-16941-2.pdf',
        source_anchor = '§9; Anhang C (informativ) Farbtest, Bild C.1 (S. 27, gerendert)',
        suggestion  = 'Der Querverbindungstest (Farbtest nach Anhang C oder Drucktest, §9) muss das Ergebnis BESTANDEN liefern (keine unzulässige Verbindung zwischen Trink- und Nicht-Trinkwasserleitungen). Bei NICHT BESTANDEN ist die falsche Querverbindung zu beseitigen und erneut zu prüfen.'
    WHERE id = v_cr15
      AND condition = 'querverbindungstest_ergebnis == bestanden';

  -- ==========================================================================
  -- STEP 2 — CR-12 (SEV-1) §6.1 min-rule: triple IS NOT NULL → (design - Y_G <= 0) AND (design - D_G <= 0).
  --   [FIX-DRAFT G9/G5 · P-6b]  §6.1 Allgemeines.
  --   Guarded on the exact live presence condition so re-application converges.
  --   severity stays 'block'. The min-rule subsumes presence (each operand must be
  --   present for the compare to evaluate; missing → pending, never false fail).
  --   Render-confirmed §6.1 p18/PDF p20: "der niedrigste berechnete Wert für den
  --   Ertrag oder den Bedarf … muss … verwendet werden."
  -- ==========================================================================
  UPDATE compliance_requirements
    SET condition   = 'bemessungswert_massgebend - Y_G <= 0 AND bemessungswert_massgebend - D_G <= 0',
        source_file = 'DIN-EN-16941-2.pdf',
        source_anchor = '§6.1 Allgemeines (S. 18, gerendert)',
        suggestion  = 'Der maßgebende Bemessungswert muss dem niedrigsten der beiden berechneten Werte für Ertrag (Y_G) und Bedarf (D_G) entsprechen (§6.1) — er darf weder Y_G noch D_G überschreiten. Setzen Sie bemessungswert_massgebend = min(Y_G, D_G).'
    WHERE id = v_cr12
      AND condition = 'Y_G IS NOT NULL AND D_G IS NOT NULL AND bemessungswert_massgebend IS NOT NULL';

  -- ---- converge checks ------------------------------------------------------
  IF EXISTS (
    SELECT 1 FROM compliance_requirements
    WHERE code = 'DIN-EN-16941-2-CR-15' AND condition = 'querverbindungstest_ergebnis == bestanden'
  ) THEN
    RAISE WARNING 'DIN-EN-16941-2: CR-15 still has the bare-id condition after UPDATE (already re-fixed differently, or symbol changed) — review.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM compliance_requirements
    WHERE code = 'DIN-EN-16941-2-CR-12'
      AND condition = 'Y_G IS NOT NULL AND D_G IS NOT NULL AND bemessungswert_massgebend IS NOT NULL'
  ) THEN
    RAISE WARNING 'DIN-EN-16941-2: CR-12 still has the presence-only condition after UPDATE (already re-fixed differently, or symbol changed) — review.';
  END IF;

  RAISE NOTICE 'DIN-EN-16941-2 gate enforcement applied: CR-15 bare-id → IN {bestanden} (SEV-1 cross-connection test); CR-12 presence → §6.1 min-rule (bemessungswert_massgebend - Y_G <= 0 AND - D_G <= 0; subtraction form forces the acompare symbol-lookup path). No fields added. V_WM_y/V_WM_d split left intact. CR-07/08/13/17 left as-is. E2 exact-LEAST + E1 compute flagged for ENGINE track.';
END $$;
