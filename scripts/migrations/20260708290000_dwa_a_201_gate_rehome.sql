-- ============================================================================
-- Migration: DWA-A-201 gate RE-HOME (CR-006 / CR-007) — DATA-track
-- File:      20260708290000_dwa_a_201_gate_rehome.sql
-- Standard:  DWA-A 201 · Abwasserteichanlagen · August 2005, korrigiert Dez. 2011
-- Status:    WRITTEN-NOT-APPLIED. Do NOT auto-apply. Read-only DB used to author.
--
-- Apply:     node scripts/apply-migration.mjs scripts/migrations/20260708290000_dwa_a_201_gate_rehome.sql
--            (⚠ ensure the apply helper targets PROD, not local — see DATA-FIX-CAMPAIGN
--             "APPLY-PATH TRAP"; .env.local DATABASE_URL points at LOCAL in this env.)
-- Rollback:  see "-- ROLLBACK" block at the foot of this file (commented; run manually).
--
-- ----------------------------------------------------------------------------
-- SCOPE — the two A-201 ES-1-pass gate defects CR-006 and CR-007 (G-class).
-- HARD CONSTRAINT (Alvaro): this is a DATA re-home. A gate may only be re-homed
-- where doing so makes it worksheet-LOCAL (every field it reads lives on the
-- target worksheet — evaluate.ts resolves symbols worksheet-locally). If a gate
-- STILL needs a field on a DIFFERENT worksheet after re-home, that is a genuine
-- cross-worksheet evaluation requiring NEW engine behavior → STOP + REPORT, do
-- NOT build it here.
--
-- ----------------------------------------------------------------------------
-- CR-007  →  FIXED (clean re-home A201-08 → A201-11). Worksheet-LOCAL. ✅
--   Currently on A201-08 ("Bemessung Grobstoffentnahme"), but all four fields it
--   reads live on A201-11 ("Bemessung belueftete Teiche"):
--     B_R_BSB        (A201-11)
--     t_R_belueftet  (A201-11)
--     OV_C_BSB       (A201-11)
--     P_R            (A201-11)
--   evaluate.ts resolves symbols worksheet-locally → on A201-08 none of the four
--   resolve → the gate is PENDING/dead there. FIX = move worksheet_template_id
--   A201-08 → A201-11. After the move ALL four operands are local → worksheet-LOCAL.
--   Condition is UNCHANGED and already correct grammar (numeric-literal RHS,
--   no field-vs-field, no subtraction form needed; `P_R = 1-3` already encoded
--   `P_R >= 1 AND P_R <= 3`):
--       B_R_BSB <= 25 AND t_R_belueftet >= 5 AND OV_C_BSB >= 1.5 AND P_R >= 1 AND P_R <= 3
--   Grammar verified vs src/lib/compliance/evaluate.ts: five `aref OP numeric`
--   comparisons ANDed — each is the legacy `compare` path (simple operand RHS),
--   AND is left-assoc; nothing coerced to a string literal. No rewrite → we do
--   NOT touch an already-correct condition (only its home is wrong).
--   Severity: all §5.4 thresholds are "muss" (BSB5-Raumbelastung "muss …
--   angesetzt werden"; "Es muss eine Durchflusszeit von fünf Tagen …";
--   Sauerstoffverbrauch "muss OV_C,BSB ≥ 1,5 …") → severity stays 'block'
--   (matches source; NO block↔warn change). Render-confirmed §5.4, PDF p.11.
--
-- ----------------------------------------------------------------------------
-- CR-006  →  NOT FIXED — CROSS-WORKSHEET STOP CASE. Left UNTOUCHED, reported.  ⛔
--   CR-006 (currently A201-08) enforces the §5.3 unaerated-pond area minimum:
--     base    A_EW ≥ 10 m²/E              ("Unbelüftete Abwasserteiche sind mit
--                                          A_EW ≥ 10 m²/E zu bemessen." — muss)
--     relaxed A_EW ≥  8 m²/E, only when a settling-pond Vorstufe is vorgeschaltet
--                                         ("Dieser Wert kann auf 8 m²/E vermindert
--                                          werden, wenn nach Abschnitt 5.2 bemessene
--                                          Absetzteiche vorgeschaltet sind.")
--   Its condition parses as one guard that passes vacuously when
--   absetz_vorstufe=false, so A_EW ≥ 10 is NEVER enforced (F-07/F-08 gap):
--       IF absetz_vorstufe == true THEN A_EW_unbelueftet >= 8
--       AND IF absetz_vorstufe == false THEN A_EW_unbelueftet >= 10
--   (evaluate.ts: `AND` binds tighter than the top; the second IF's guard
--   false-arm passes vacuously, and either arm's threshold is skipped whenever
--   its guard is false → the base 10-rule is never actually asserted.)
--
--   The audit-proposed fix was: re-home to A201-10 (where A_EW_unbelueftet lives)
--   and split into two P-6c gates, e.g.
--       base    (absetz_vorstufe)     OR (A_EW_unbelueftet >= 10)
--       relaxed (NOT absetz_vorstufe) OR (A_EW_unbelueftet >= 8)
--
--   ⛔ BUT the re-home does NOT make it worksheet-local. Read-only DB confirms:
--       A_EW_unbelueftet   lives on A201-10 ("Bemessung unbelueftete Teiche")
--       absetz_vorstufe    lives on A201-02 ("Verfahrensauswahl")  ← DIFFERENT sheet
--   There is NO copy of absetz_vorstufe on A201-10 (verified: A201-10 carries
--   A_EW_unbelueftet/_mit_absetz/_ohne_absetz/… but no absetz_vorstufe trigger).
--   The gate INHERENTLY compares a trigger produced on A201-02 against an area
--   value on A201-10:
--       * re-home to A201-10 → absetz_vorstufe (A201-02) is foreign;
--       * re-home to A201-02 → A_EW_unbelueftet (A201-10) is foreign.
--   NEITHER home is worksheet-local → this is a GENUINE cross-worksheet gate
--   evaluation. Per the HARD CONSTRAINT it requires NEW engine behavior
--   (cross-worksheet symbol resolution) and is OUT OF SCOPE for this DATA track.
--   CR-006 is LEFT EXACTLY AS-IS (broken) and REPORTED for Alvaro / the ENGINE
--   track. This migration does NOT modify, re-home, split, or delete CR-006.
--   (A defensive assert below fails loud if the topology ever changes such that
--    absetz_vorstufe appears on A201-10 — i.e. if CR-006 becomes DATA-fixable.)
--
-- Patterns: P-8 (worksheet-local single source — the whole basis of the re-home).
-- No new fields/sections/rows are inserted → no section_id/order_index needed.
-- ============================================================================

DO $$
DECLARE
  v_standard_id   uuid;
  v_wt_08         uuid;   -- A201-08 (current, WRONG home of CR-007 and CR-006)
  v_wt_10         uuid;   -- A201-10 (home of A_EW_unbelueftet) — CR-006 topology check
  v_wt_11         uuid;   -- A201-11 (home of the 4 aerated-pond fields) — CR-007 target
  v_cr007_id      uuid;

  -- field-home guard counts (fail loud → also the cross-worksheet guard)
  n_on_11         int;    -- how many of the 4 CR-007 fields are on A201-11
  n_aew_on_10     int;    -- A_EW_unbelueftet present on A201-10 (expected 1)
  n_absetz_on_10  int;    -- absetz_vorstufe present on A201-10 (expected 0 = STOP holds)

  -- CR-007 condition is already correct — asserted, not rewritten.
  v_cr007_cond    constant text :=
    'B_R_BSB <= 25 AND t_R_belueftet >= 5 AND OV_C_BSB >= 1.5 AND P_R >= 1 AND P_R <= 3';
  v_cr007_quote   constant text :=
    'Für die Bemessung von belüfteten Abwasserteichen muss eine BSB5-Raumbelastung von '
    || 'B_R,BSB ≤ 25 g/(m³·d) angesetzt werden. Es muss eine Durchflusszeit von fünf Tagen '
    || 'bei Trockenwetter eingehalten werden. Als Sauerstoffverbrauch muss OV_C,BSB ≥ 1,5 '
    || 'kg/kg … und … eine Leistungsdichte P_R = 1 – 3 W/m³ angesetzt werden.';
  v_src_file      constant text := 'dwa_a_201 (1).pdf';
BEGIN
  ----------------------------------------------------------------------------
  -- Resolve the standard + the three worksheets.
  ----------------------------------------------------------------------------
  SELECT id INTO v_standard_id FROM standards WHERE code = 'DWA-A-201';
  IF v_standard_id IS NULL THEN
    RAISE EXCEPTION 'Standard DWA-A-201 not found';
  END IF;

  SELECT id INTO v_wt_08 FROM worksheet_templates
   WHERE standard_id = v_standard_id AND code = 'A201-08';
  SELECT id INTO v_wt_10 FROM worksheet_templates
   WHERE standard_id = v_standard_id AND code = 'A201-10';
  SELECT id INTO v_wt_11 FROM worksheet_templates
   WHERE standard_id = v_standard_id AND code = 'A201-11';
  IF v_wt_10 IS NULL THEN RAISE EXCEPTION 'Worksheet A201-10 (DWA-A-201) not found'; END IF;
  IF v_wt_11 IS NULL THEN RAISE EXCEPTION 'Worksheet A201-11 (DWA-A-201) not found'; END IF;
  -- v_wt_08 may already be gone-empty on a re-run; only required to FIND CR-007.

  ----------------------------------------------------------------------------
  -- FIELD-EXISTENCE ASSERTS (fail loud). These are BOTH the target-home
  -- guarantee for CR-007 AND the cross-worksheet guard for CR-006.
  ----------------------------------------------------------------------------

  -- CR-007: every referenced field MUST be on the target worksheet A201-11.
  SELECT count(*) INTO n_on_11 FROM fields f
   WHERE f.worksheet_template_id = v_wt_11
     AND f.symbol IN ('B_R_BSB','t_R_belueftet','OV_C_BSB','P_R');
  IF n_on_11 <> 4 THEN
    RAISE EXCEPTION 'CR-007 re-home BLOCKED: expected all 4 fields '
      '(B_R_BSB,t_R_belueftet,OV_C_BSB,P_R) on A201-11, found % on A201-11. '
      'Re-home would leave a field foreign (cross-worksheet) — refusing.', n_on_11;
  END IF;

  -- CR-006 STOP guard: A_EW_unbelueftet on A201-10 …
  SELECT count(*) INTO n_aew_on_10 FROM fields f
   WHERE f.worksheet_template_id = v_wt_10 AND f.symbol = 'A_EW_unbelueftet';
  IF n_aew_on_10 <> 1 THEN
    RAISE EXCEPTION 'CR-006 topology assert failed: A_EW_unbelueftet expected on '
      'A201-10 (found % rows). Aborting — topology differs from the analysis.', n_aew_on_10;
  END IF;

  -- … and absetz_vorstufe MUST be ABSENT from A201-10 (it lives on A201-02).
  -- If it is present here, CR-006 would become worksheet-local on A201-10 →
  -- the STOP no longer holds → fail loud so a human re-evaluates (do NOT silently
  -- proceed on a changed topology).
  SELECT count(*) INTO n_absetz_on_10 FROM fields f
   WHERE f.worksheet_template_id = v_wt_10 AND f.symbol = 'absetz_vorstufe';
  IF n_absetz_on_10 <> 0 THEN
    RAISE EXCEPTION 'CR-006 STOP assumption VIOLATED: absetz_vorstufe now present on '
      'A201-10 (% rows). CR-006 may be DATA-fixable (worksheet-local) — re-evaluate; '
      'this migration intentionally does NOT touch CR-006.', n_absetz_on_10;
  END IF;

  ----------------------------------------------------------------------------
  -- Resolve CR-007 (currently on A201-08; may already be on A201-11 on re-run).
  ----------------------------------------------------------------------------
  v_cr007_id := NULL;
  IF v_wt_08 IS NOT NULL THEN
    SELECT id INTO v_cr007_id FROM compliance_requirements
     WHERE worksheet_template_id = v_wt_08 AND code = 'CR-007';
  END IF;
  IF v_cr007_id IS NULL THEN
    SELECT id INTO v_cr007_id FROM compliance_requirements
     WHERE worksheet_template_id = v_wt_11 AND code = 'CR-007';
  END IF;
  IF v_cr007_id IS NULL THEN
    RAISE EXCEPTION 'CR-007 (DWA-A-201) not found on A201-08 or A201-11';
  END IF;

  --==========================================================================
  -- CR-007 — clean re-home A201-08 → A201-11 (idempotent). P-8. §5.4 (PDF p.11).
  -- Condition + severity are already correct → NOT rewritten (do-not-rewrite
  -- already-enforcing gates). Only the home moves; provenance backfilled honest.
  --==========================================================================
  UPDATE compliance_requirements
     SET worksheet_template_id = v_wt_11
   WHERE id = v_cr007_id
     AND worksheet_template_id IS DISTINCT FROM v_wt_11;

  -- Provenance/anchor backfill (VA — render-confirmed §5.4, PDF p.11). Converging.
  UPDATE compliance_requirements
     SET clause_reference = '§5.4',
         source_file      = v_src_file,
         source_anchor    = '§5.4 „Belüftete Abwasserteiche" (PDF p.11)',
         source_quote     = v_cr007_quote,
         audit_notes      =
           'CR-007 re-home 2026-07-08: von A201-08 (Grobstoffentnahme, ohne die '
           || 'belüfteten-Teich-Felder) nach A201-11 (Bemessung belueftete Teiche) '
           || 'verschoben — alle vier Felder (B_R_BSB, t_R_belueftet, OV_C_BSB, P_R) '
           || 'liegen auf A201-11, evaluate.ts löst Symbole blattlokal auf. Bedingung '
           || 'und severity (block, „muss", §5.4) unverändert; nur der Blatt-Bezug '
           || 'war falsch. Render-confirmed §5.4 PDF p.11.'
   WHERE id = v_cr007_id
     AND source_quote IS DISTINCT FROM v_cr007_quote;

  -- Defensive: CR-007 condition/severity must be the render-confirmed form. We do
  -- NOT rewrite; we assert (fail loud) so an unexpected drift is caught, not masked.
  IF EXISTS (
    SELECT 1 FROM compliance_requirements
     WHERE id = v_cr007_id
       AND (condition IS DISTINCT FROM v_cr007_cond OR severity IS DISTINCT FROM 'block')
  ) THEN
    RAISE EXCEPTION 'CR-007 condition/severity drifted from the render-confirmed form '
      '(expected condition="%%", severity=block). Refusing to mask — inspect manually.',
      v_cr007_cond;
  END IF;

  ----------------------------------------------------------------------------
  -- CR-006 is DELIBERATELY NOT TOUCHED (cross-worksheet STOP case, see header).
  ----------------------------------------------------------------------------

  RAISE NOTICE 'DWA-A-201 gate re-home applied: CR-007 re-homed A201-08 -> A201-11 '
    '(worksheet-local; condition/severity unchanged; provenance backfilled §5.4 p.11). '
    'CR-006 LEFT UNTOUCHED = cross-worksheet STOP (absetz_vorstufe@A201-02 vs '
    'A_EW_unbelueftet@A201-10) — reported for ENGINE track.';
END $$;

-- ============================================================================
-- ROLLBACK (run manually if needed — restores the pre-migration state):
--
-- DO $$
-- DECLARE
--   v_standard_id uuid; v_wt_08 uuid; v_wt_11 uuid; v_cr007_id uuid;
-- BEGIN
--   SELECT id INTO v_standard_id FROM standards WHERE code = 'DWA-A-201';
--   SELECT id INTO v_wt_08 FROM worksheet_templates WHERE standard_id=v_standard_id AND code='A201-08';
--   SELECT id INTO v_wt_11 FROM worksheet_templates WHERE standard_id=v_standard_id AND code='A201-11';
--   SELECT id INTO v_cr007_id FROM compliance_requirements
--    WHERE worksheet_template_id IN (v_wt_08, v_wt_11) AND code='CR-007';
--   -- move CR-007 back to A201-08, null the provenance backfill.
--   UPDATE compliance_requirements
--      SET worksheet_template_id = v_wt_08,
--          clause_reference = '5.4',
--          source_file = NULL, source_anchor = NULL, audit_notes = NULL,
--          source_quote = 'Für die Bemessung von belüfteten Abwasserteichen muss eine BSB5-Raumbelastung von B_R,BSB <= 25 g/(m3·d) angesetzt werden. Es muss eine Durchflusszeit von fünf Tagen bei Trockenwetter eingehalten werden. Als Sauerstoffverbrauch muss OV_C,BSB >= 1,5 kg/kg und ... eine Leistungsdichte P_R = 1-3 W/m3 angesetzt werden.'
--    WHERE id = v_cr007_id;
--   -- CR-006 was never modified → nothing to roll back.
-- END $$;
-- ============================================================================
