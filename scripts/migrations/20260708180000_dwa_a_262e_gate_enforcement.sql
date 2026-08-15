-- ============================================================================
-- Migration: 20260708180000_dwa_a_262e_gate_enforcement.sql
-- Standard : DWA-A-262E (DWA-A 262E, November 2017 — Principles for
--            Dimensioning, Construction and Operation of Wastewater Treatment
--            Plants with Planted and Unplanted Filters …)
-- Source   : Desktop/Guidelines/DWA-A-262E/DWA-A_262E (2).pdf, 76 pp.
--            DB version "November 2017" == cover "DWA-A 262, November 2017" → AUTHORITATIVE.
--            SAFETY thresholds below were verified by RENDER (pdftoppm 300 dpi),
--            NOT by text extraction — the pdftotext layer DROPS the "-8" superscript
--            in the liner k_f clause ("kf-value of ≤ 10 m/s" in text; the rendered
--            page 47 shows "≤ 10⁻⁸ m/s"). Reverse-Trap-6: the rendered PDF wins.
--
-- WRITTEN-NOT-APPLIED. READ-ONLY campaign. Do NOT commit. Do NOT apply to prod.
--
-- Apply    : node scripts/apply-migration.mjs scripts/migrations/20260708180000_dwa_a_262e_gate_enforcement.sql
-- Rollback : each UPDATE below is a pure condition-string rewrite of an existing gate
--            (no fields inserted, no rows deleted, no verification_status touched). To
--            revert, restore the original `condition` strings listed inline per gate
--            (the exact prior IF…THEN / lowercase-if…then text is quoted in each block).
--            No data is destroyed; the migration is idempotent and converging.
--
-- ----------------------------------------------------------------------------
-- FIX-DRAFT items implemented (DEEP-DWA-A-262E.md "F-IF-THEN-gates" / FIX-QUEUE [G2|SEV1|E3]):
--
--   SEV-1 — safety-critical literal IF…THEN gates → P-6c `(NOT antecedent) OR consequent`
--           (canonical conditional; engine-independent; evaluate.ts supports NOT / OR /
--            parens / ==, <=, >=, < / IN {…} / scientific-notation numbers).
--     * REQ-17  (A262-29) subsoil-LINER permeability   [§5.3 Lining, PDF p47 rendered]
--         was: IF lining_type IN {mineral_seal_clay, unsealed_subsoil} THEN k_f_subsoil_m_s <= 1e-8
--         now: (NOT lining_type IN {mineral_seal_clay, unsealed_subsoil}) OR (k_f_subsoil_m_s <= 1e-8)
--         RENDER-CONFIRMED threshold (p47): "A k_f-value of ≤ 10⁻⁸ m/s must be
--         demonstrated." → 1e-8 m/s. (evaluate.ts tokenizes 1e-8 as a number: regex
--         /^\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/ — verified.) severity=block preserved (muss).
--     * REQ-20  (A262-08) NITRIFICATION ammonium limit  [§1 Scope, PDF p12→13 rendered]
--         was: IF nitrification_required == True THEN effluent_S_NH4_mg_l <= 10
--         now: (NOT nitrification_required) OR (effluent_S_NH4_mg_l <= 10)
--         RENDER-CONFIRMED (p12/p13; corroborated §4.5 p… "SNH4 ≤ 10 mg/l (≥ 12 °C)"):
--         "suitable for further nitrification (SNH4 ≤ 10 mg/l) at filter effluent water
--         temperatures of at least 12°C." → 10 mg/l. severity=block preserved.
--     * REQ-20b (A262-08) NITRIFICATION temperature      [§1 Scope, PDF p12→13 rendered]
--         was: IF nitrification_required == True THEN effluent_temperature_C >= 12
--         now: (NOT nitrification_required) OR (effluent_temperature_C >= 12)
--         RENDER-CONFIRMED (same clause): "… at filter effluent water temperatures of at
--         least 12°C." → 12 °C. severity=block preserved.
--
--   SEV-1/2 — other literal IF…THEN gates (block-severity construction/loading), same P-6c rewrite:
--     * REQ-18a (A262-29) geomembrane thickness          [§5.3 Lining, PDF p47 rendered]
--         was: IF lining_type == geomembrane THEN geomembrane_thickness_mm >= 1.5
--         now: (NOT lining_type == geomembrane) OR (geomembrane_thickness_mm >= 1.5)
--         RENDER-CONFIRMED (p47 bullet 1): "plastic water-resistant geomembrane … thickness
--         of ≥ 1.5 mm". → 1.5 mm. severity=block preserved.
--     * REQ-18c (A262-29) geotextile robustness class     [§5.3 Lining, PDF p47 rendered]
--         was: IF lining_type == geomembrane THEN geotextile_robustness_class IN {GRK4, GRK5}
--         now: (NOT lining_type == geomembrane) OR (geotextile_robustness_class IN {GRK4, GRK5})
--         RENDER-CONFIRMED (p47): "The geotextile should have a robustness class of GRK4 or
--         GRK5." (sollte → severity=warn preserved as-is.)
--     * REQ-33 (A262-10) raw-WW-filter COD load           [§4.2.6 Tab.3, PDF p25 rendered]
--         was: IF filter_type == raw_wastewater_filter THEN f_A_F_CSB <= 100
--         now: (NOT filter_type == raw_wastewater_filter) OR (f_A_F_CSB <= 100)
--         RENDER-CONFIRMED Table 3 (p25): fA,Fo,CSB … ≤ 100 g/(m²·d). severity=block preserved.
--     * REQ-34 (A262-10) raw-WW-filter dry-weather hydr.  [§4.2.6 Tab.3, PDF p25 rendered]
--         was: IF filter_type == raw_wastewater_filter THEN q_F_T <= 250
--         now: (NOT filter_type == raw_wastewater_filter) OR (q_F_T <= 250)
--         RENDER-CONFIRMED Table 3 (p25): qFo,T … ≤ 250 l/(m²·d). severity=block preserved.
--     * REQ-35 (A262-10) raw-WW-filter dosing rate        [§4.2.6 Tab.3, PDF p25 rendered]
--         was: IF filter_type == raw_wastewater_filter THEN q_Beschickung_Fo >= 10
--         now: (NOT filter_type == raw_wastewater_filter) OR (q_Beschickung_Fo >= 10)
--         RENDER-CONFIRMED Table 3 (p25): qBeschickung,Fo … ≥ 10 l/(m²·min). severity=block preserved.
--     * REQ-36 (A262-10) raw-WW-filter dose depth band    [§4.2.6 Tab.3, PDF p25 rendered]
--         was: IF filter_type == raw_wastewater_filter THEN h_Beschickung_Fo >= 20 AND h_Beschickung_Fo <= 50
--         now: (NOT filter_type == raw_wastewater_filter) OR (h_Beschickung_Fo >= 20 AND h_Beschickung_Fo <= 50)
--         RENDER-CONFIRMED Table 3 (p25): hBeschickung,Fo … 20 – 50 l/m². severity=block preserved.
--
--   SEV-3 — lowercase `if … then …` gate (same non-supported literal form → P-6c):
--     * REQ-12 (A262-25) greywater specific production    [§4.1.3, PDF p23 rendered]
--         was: if wastewater_type == greywater_only then w_s_d >= 75
--         now: (NOT wastewater_type == greywater_only) OR (w_s_d >= 75)
--         RENDER-CONFIRMED (p23 §4.1.3): "According to Standard DWA-A 272:2014, greywater
--         production can be set at ≥ 75 l/(P·d)." → 75 l/(P·d). severity=block preserved.
--
-- ----------------------------------------------------------------------------
-- LEFT-UNFIXED (deliberate — see final report):
--   * All ~48 non-IF/THEN gates ALREADY ENFORCE under evaluate.ts and are UNTOUCHED:
--     simple comparators (f_A_ANF_CSB<=200, A_Fu_min>=4, l_Rieselr>=6, U<5, f_red>=0.5,
--     RV<=2, q_AWF_aM<=500, B_d_TKN<=B_A_TKN_zul, effluent_BOD5_mg_l<=40, effluent_COD_mg_l<=150,
--     aufenthaltszeit>=2, fines_fraction<=2, …), IN{…} membership (system_size_category,
--     wastewater_significantly_different), != string (pretreatment_selected != none,
--     climate_zone != "permafrost"), == boolean/attestation (REQ-09/10/21). Not no-ops.
--   * REQ-03 `x_Q_max == 8` — LEFT ALONE. evaluate.ts tokenizes `==` and compares numerically
--     (both sides finite → ln === rn); a hard block on the fixed 8 h peak assumption (§4.1.2)
--     is rigid but FAITHFUL to the standard. Not rewritten.
--   * NULL source_quote backfill (audit P0 / A1022-P0): out of scope for this GATE migration
--     — REQ-03 and REQ-12 have source_quote=NULL. REQ-12's rendered §4.1.3 quote IS captured in
--     source_anchor/comment here, but the systemic empty-source_quote batch backfill (equations +
--     the two gate rows) is a separate DATA item, FLAGGED, not built in this file.
--   * Equation-layer S7/C2 (Gl.5 expr-output, Gl.6 `=`+`>=` tail, Gl.8 pure chained inequality)
--     and the SUM() aggregate (Gl.6/8: SUM(Q_Dr_RUB) etc.) are ENGINE-blocked (E2/E1/E3 —
--     arithmetic.ts rejects function calls; chained `>=…>=` not parseable) → TAGGED, NOT touched.
--   * C9 multi-producer (Q_F by Gl.3&7; Q_M by Gl.6&8; A_F_TKN_red by Gl.13&14 faithful piecewise)
--     is a single-source/route-all concern, not a gate rewrite → out of scope here.
--   * No fields inserted: every antecedent/consequent symbol used by the 10 rewrites already
--     exists (verified: nitrification_required, effluent_S_NH4_mg_l, effluent_temperature_C,
--     filter_type, f_A_F_CSB, q_F_T, q_Beschickung_Fo, h_Beschickung_Fo, wastewater_type, w_s_d,
--     lining_type, k_f_subsoil_m_s, geomembrane_thickness_mm, geotextile_robustness_class).
--
-- P-13 note: NONE of the 10 rewritten gates read a regulation_tables keyed lookup. DWA-A-262E
--   has ~241 regulation_tables rows, but every threshold here is an inline scalar from the
--   guideline's own §-clauses / Table 3 (raw-WW-filter, keyed on filter_type — the guideline's
--   own governing dimension: filter_type == raw_wastewater_filter is exactly the Table 3 row
--   selector). No coarser re-key, no counter-example. No P-13 concern in this migration.
--   (Fidelity aside, NOT changed: DB symbols f_A_F_CSB / q_F_T carry Table 3's "Fo" subscript
--    variants fA,Fo,CSB / qFo,T — a pre-existing symbol-naming choice; the gates reference the
--    existing fields, so symbols are preserved verbatim. Flagged for Alvaro, not re-keyed.)
-- ============================================================================

DO $$
DECLARE
  v_standard_id uuid;
  -- gate ids
  v_req17  uuid;  -- A262-29 subsoil liner k_f (SEV-1)
  v_req20  uuid;  -- A262-08 nitrification S_NH4 (SEV-1)
  v_req20b uuid;  -- A262-08 nitrification temperature (SEV-1)
  v_req18a uuid;  -- A262-29 geomembrane thickness
  v_req18c uuid;  -- A262-29 geotextile robustness class
  v_req33  uuid;  -- A262-10 raw-WW-filter COD load
  v_req34  uuid;  -- A262-10 raw-WW-filter dry-weather hydraulic
  v_req35  uuid;  -- A262-10 raw-WW-filter dosing rate
  v_req36  uuid;  -- A262-10 raw-WW-filter dose depth band
  v_req12  uuid;  -- A262-25 greywater specific production (lowercase if…then)
  v_remaining int;
BEGIN
  -- ---- resolve standard -----------------------------------------------------
  SELECT id INTO v_standard_id FROM standards WHERE code = 'DWA-A-262E';
  IF v_standard_id IS NULL THEN
    RAISE EXCEPTION 'Standard DWA-A-262E not found';
  END IF;

  -- ---- resolve gates (scoped to this standard via the worksheet join) -------
  SELECT cr.id INTO v_req17 FROM compliance_requirements cr
    JOIN worksheet_templates wt ON wt.id = cr.worksheet_template_id
    WHERE wt.standard_id = v_standard_id AND cr.code = 'REQ-17';
  SELECT cr.id INTO v_req20 FROM compliance_requirements cr
    JOIN worksheet_templates wt ON wt.id = cr.worksheet_template_id
    WHERE wt.standard_id = v_standard_id AND cr.code = 'REQ-20';
  SELECT cr.id INTO v_req20b FROM compliance_requirements cr
    JOIN worksheet_templates wt ON wt.id = cr.worksheet_template_id
    WHERE wt.standard_id = v_standard_id AND cr.code = 'REQ-20b';
  SELECT cr.id INTO v_req18a FROM compliance_requirements cr
    JOIN worksheet_templates wt ON wt.id = cr.worksheet_template_id
    WHERE wt.standard_id = v_standard_id AND cr.code = 'REQ-18a';
  SELECT cr.id INTO v_req18c FROM compliance_requirements cr
    JOIN worksheet_templates wt ON wt.id = cr.worksheet_template_id
    WHERE wt.standard_id = v_standard_id AND cr.code = 'REQ-18c';
  SELECT cr.id INTO v_req33 FROM compliance_requirements cr
    JOIN worksheet_templates wt ON wt.id = cr.worksheet_template_id
    WHERE wt.standard_id = v_standard_id AND cr.code = 'REQ-33';
  SELECT cr.id INTO v_req34 FROM compliance_requirements cr
    JOIN worksheet_templates wt ON wt.id = cr.worksheet_template_id
    WHERE wt.standard_id = v_standard_id AND cr.code = 'REQ-34';
  SELECT cr.id INTO v_req35 FROM compliance_requirements cr
    JOIN worksheet_templates wt ON wt.id = cr.worksheet_template_id
    WHERE wt.standard_id = v_standard_id AND cr.code = 'REQ-35';
  SELECT cr.id INTO v_req36 FROM compliance_requirements cr
    JOIN worksheet_templates wt ON wt.id = cr.worksheet_template_id
    WHERE wt.standard_id = v_standard_id AND cr.code = 'REQ-36';
  SELECT cr.id INTO v_req12 FROM compliance_requirements cr
    JOIN worksheet_templates wt ON wt.id = cr.worksheet_template_id
    WHERE wt.standard_id = v_standard_id AND cr.code = 'REQ-12';

  IF v_req17  IS NULL THEN RAISE EXCEPTION 'DWA-A-262E REQ-17 not found';  END IF;
  IF v_req20  IS NULL THEN RAISE EXCEPTION 'DWA-A-262E REQ-20 not found';  END IF;
  IF v_req20b IS NULL THEN RAISE EXCEPTION 'DWA-A-262E REQ-20b not found'; END IF;
  IF v_req18a IS NULL THEN RAISE EXCEPTION 'DWA-A-262E REQ-18a not found'; END IF;
  IF v_req18c IS NULL THEN RAISE EXCEPTION 'DWA-A-262E REQ-18c not found'; END IF;
  IF v_req33  IS NULL THEN RAISE EXCEPTION 'DWA-A-262E REQ-33 not found';  END IF;
  IF v_req34  IS NULL THEN RAISE EXCEPTION 'DWA-A-262E REQ-34 not found';  END IF;
  IF v_req35  IS NULL THEN RAISE EXCEPTION 'DWA-A-262E REQ-35 not found';  END IF;
  IF v_req36  IS NULL THEN RAISE EXCEPTION 'DWA-A-262E REQ-36 not found';  END IF;
  IF v_req12  IS NULL THEN RAISE EXCEPTION 'DWA-A-262E REQ-12 not found';  END IF;

  -- ==========================================================================
  -- SEV-1 — safety-critical conditional gates (P-6c)
  -- Each UPDATE is guarded on the OLD literal condition so re-application converges
  -- and never clobbers a differently-authored fix. source_anchor refreshed to mark
  -- the safety threshold render-confirmed.
  -- ==========================================================================

  -- REQ-17 — subsoil LINER permeability. §5.3 (PDF p47, rendered): k_f ≤ 10⁻⁸ m/s.  [G2 → P-6c, SEV-1]
  --   OLD: IF lining_type IN {mineral_seal_clay, unsealed_subsoil} THEN k_f_subsoil_m_s <= 1e-8
  UPDATE compliance_requirements
    SET condition = '(NOT lining_type IN {mineral_seal_clay, unsealed_subsoil}) OR (k_f_subsoil_m_s <= 1e-8)',
        source_anchor = '§5.3 Lining (PDF p47, gerendert; k_f ≤ 10⁻⁸ m/s)'
    WHERE id = v_req17
      AND condition = 'IF lining_type IN {mineral_seal_clay, unsealed_subsoil} THEN k_f_subsoil_m_s <= 1e-8';

  -- REQ-20 — NITRIFICATION ammonium limit. §1 Scope (PDF p12/13, rendered): S_NH4 ≤ 10 mg/l.  [G2 → P-6c, SEV-1]
  --   OLD: IF nitrification_required == True THEN effluent_S_NH4_mg_l <= 10
  UPDATE compliance_requirements
    SET condition = '(NOT nitrification_required) OR (effluent_S_NH4_mg_l <= 10)',
        source_anchor = '§1 Scope (PDF p12/13, gerendert; SNH4 ≤ 10 mg/l bei ≥ 12 °C)'
    WHERE id = v_req20
      AND condition = 'IF nitrification_required == True THEN effluent_S_NH4_mg_l <= 10';

  -- REQ-20b — NITRIFICATION temperature. §1 Scope (PDF p12/13, rendered): ≥ 12 °C.  [G2 → P-6c, SEV-1]
  --   OLD: IF nitrification_required == True THEN effluent_temperature_C >= 12
  UPDATE compliance_requirements
    SET condition = '(NOT nitrification_required) OR (effluent_temperature_C >= 12)',
        source_anchor = '§1 Scope (PDF p12/13, gerendert; Filterablauf ≥ 12 °C)'
    WHERE id = v_req20b
      AND condition = 'IF nitrification_required == True THEN effluent_temperature_C >= 12';

  -- ==========================================================================
  -- SEV-1/2 — remaining block-severity construction/loading conditional gates (P-6c)
  -- ==========================================================================

  -- REQ-18a — geomembrane thickness. §5.3 (PDF p47, rendered): ≥ 1.5 mm.  [G2 → P-6c]
  --   OLD: IF lining_type == geomembrane THEN geomembrane_thickness_mm >= 1.5
  UPDATE compliance_requirements
    SET condition = '(NOT lining_type == geomembrane) OR (geomembrane_thickness_mm >= 1.5)',
        source_anchor = '§5.3 Lining (PDF p47, gerendert; Geomembran ≥ 1,5 mm)'
    WHERE id = v_req18a
      AND condition = 'IF lining_type == geomembrane THEN geomembrane_thickness_mm >= 1.5';

  -- REQ-18c — geotextile robustness class. §5.3 (PDF p47, rendered): GRK4 or GRK5 (sollte → warn).  [G2 → P-6c]
  --   OLD: IF lining_type == geomembrane THEN geotextile_robustness_class IN {GRK4, GRK5}
  UPDATE compliance_requirements
    SET condition = '(NOT lining_type == geomembrane) OR (geotextile_robustness_class IN {GRK4, GRK5})',
        source_anchor = '§5.3 Lining (PDF p47, gerendert; Geotextil GRK4/GRK5)'
    WHERE id = v_req18c
      AND condition = 'IF lining_type == geomembrane THEN geotextile_robustness_class IN {GRK4, GRK5}';

  -- REQ-33 — raw-WW-filter COD areal load. §4.2.6 Table 3 (PDF p25, rendered): fA,Fo,CSB ≤ 100.  [G2 → P-6c]
  --   OLD: IF filter_type == raw_wastewater_filter THEN f_A_F_CSB <= 100
  UPDATE compliance_requirements
    SET condition = '(NOT filter_type == raw_wastewater_filter) OR (f_A_F_CSB <= 100)',
        source_anchor = '§4.2.6 Table 3 (PDF p25, gerendert; fA,Fo,CSB ≤ 100 g/(m²·d))'
    WHERE id = v_req33
      AND condition = 'IF filter_type == raw_wastewater_filter THEN f_A_F_CSB <= 100';

  -- REQ-34 — raw-WW-filter dry-weather hydraulic load. §4.2.6 Table 3 (PDF p25, rendered): qFo,T ≤ 250.  [G2 → P-6c]
  --   OLD: IF filter_type == raw_wastewater_filter THEN q_F_T <= 250
  UPDATE compliance_requirements
    SET condition = '(NOT filter_type == raw_wastewater_filter) OR (q_F_T <= 250)',
        source_anchor = '§4.2.6 Table 3 (PDF p25, gerendert; qFo,T ≤ 250 l/(m²·d))'
    WHERE id = v_req34
      AND condition = 'IF filter_type == raw_wastewater_filter THEN q_F_T <= 250';

  -- REQ-35 — raw-WW-filter dosing rate. §4.2.6 Table 3 (PDF p25, rendered): qBeschickung,Fo ≥ 10.  [G2 → P-6c]
  --   OLD: IF filter_type == raw_wastewater_filter THEN q_Beschickung_Fo >= 10
  UPDATE compliance_requirements
    SET condition = '(NOT filter_type == raw_wastewater_filter) OR (q_Beschickung_Fo >= 10)',
        source_anchor = '§4.2.6 Table 3 (PDF p25, gerendert; qBeschickung,Fo ≥ 10 l/(m²·min))'
    WHERE id = v_req35
      AND condition = 'IF filter_type == raw_wastewater_filter THEN q_Beschickung_Fo >= 10';

  -- REQ-36 — raw-WW-filter dose depth band. §4.2.6 Table 3 (PDF p25, rendered): hBeschickung,Fo 20–50.  [G2 → P-6c]
  --   OLD: IF filter_type == raw_wastewater_filter THEN h_Beschickung_Fo >= 20 AND h_Beschickung_Fo <= 50
  UPDATE compliance_requirements
    SET condition = '(NOT filter_type == raw_wastewater_filter) OR (h_Beschickung_Fo >= 20 AND h_Beschickung_Fo <= 50)',
        source_anchor = '§4.2.6 Table 3 (PDF p25, gerendert; hBeschickung,Fo 20–50 l/m²)'
    WHERE id = v_req36
      AND condition = 'IF filter_type == raw_wastewater_filter THEN h_Beschickung_Fo >= 20 AND h_Beschickung_Fo <= 50';

  -- ==========================================================================
  -- SEV-3 — lowercase `if … then …` gate (same non-supported literal → P-6c)
  -- ==========================================================================

  -- REQ-12 — greywater specific production. §4.1.3 (PDF p23, rendered): ≥ 75 l/(P·d).  [G2 → P-6c]
  --   OLD (lowercase): if wastewater_type == greywater_only then w_s_d >= 75
  UPDATE compliance_requirements
    SET condition = '(NOT wastewater_type == greywater_only) OR (w_s_d >= 75)',
        source_anchor = '§4.1.3 Greywater Treatment Plants (PDF p23, gerendert; w_s_d ≥ 75 l/(P·d))'
    WHERE id = v_req12
      AND condition = 'if wastewater_type == greywater_only then w_s_d >= 75';

  -- ==========================================================================
  -- Converge check — no literal IF…THEN / lowercase if…then remains on the 10 gates.
  -- ==========================================================================
  SELECT count(*) INTO v_remaining
  FROM compliance_requirements cr
  JOIN worksheet_templates wt ON wt.id = cr.worksheet_template_id
  WHERE wt.standard_id = v_standard_id
    AND cr.code IN ('REQ-17','REQ-20','REQ-20b','REQ-18a','REQ-18c',
                    'REQ-33','REQ-34','REQ-35','REQ-36','REQ-12')
    AND (cr.condition ILIKE '%IF %THEN%' OR cr.condition ILIKE 'if %then%');

  IF v_remaining > 0 THEN
    RAISE WARNING 'DWA-A-262E: % of the 10 conditional gates still carry a literal IF/THEN condition after UPDATE (condition text drifted from the guarded OLD form, or already re-fixed) — review.', v_remaining;
  ELSE
    RAISE NOTICE 'DWA-A-262E gate enforcement applied: 10 literal IF/THEN gates rewritten to P-6c (NOT a) OR b. SEV-1 REQ-17 (k_f ≤ 1e-8), REQ-20 (SNH4 ≤ 10), REQ-20b (T ≥ 12) render-confirmed p47/p12-13. ~48 already-enforcing gates left untouched. NULL source_quote backfill + Gl.5/6/8 + SUM ENGINE items left tagged (out of scope).';
  END IF;
END $$;
