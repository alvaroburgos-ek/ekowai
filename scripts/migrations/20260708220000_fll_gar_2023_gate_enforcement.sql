-- ============================================================================
-- Migration: 20260708220000_fll_gar_2023_gate_enforcement.sql
-- Standard : FLL-GAR-2023 (FLL Gewässerabdichtungsrichtlinien — Richtlinien
--            für Planung, Bau und Instandhaltung von Gewässerabdichtungen)
--            NOTE: this is the FLL WATER-BODY SEALING guideline. It is NOT a
--            green-roof / Gründach standard and it contains NO regeneration-
--            area / retention ratio (">50% / ≥30%") requirement — that framing
--            belongs to a different guideline and was render-checked to be
--            ABSENT here (pdftotext scan of all 140 pp: zero hits for
--            "Regenerationsfläche"/"Retentionsfläche"/">50%"/"≥30%").
--            NO such threshold was invented. The real SEV-1 for THIS standard
--            (per DEEP-FLL-GAR-2023.md) is the ~10 per-sealing-type material-
--            requirement gates encoded as literal IF…THEN.
--
-- Source   : Downloads/fll_gewaesserabdichtungsrichtlinien_2023__2.pdf
--            (140 pp; header/footer "FLL … Gewässerabdichtungsrichtlinien";
--             DB version "Dezember 2023 (2. Ausgabe; Erstauflage 2005)"
--             → AUTHORITATIVE, FINAL edition). Every threshold touched below was
--             RENDER-confirmed (pdftoppm 130-240 dpi p30/p50 + pdftotext -layout):
--               · Tab.6 concrete  (PDF p50, §5.3.1): w/z ≤0,60 (≤40cm) · Z ≥280 kg/m³
--                 · w/z ≤0,70 (>40cm)  — matches REQ-14 unchanged.
--               · Tab.3 mineral   (PDF p39-41, §5.1.1): Kornanteil<0,002mm ≥15 M-% ·
--                 org.Subst.VGL ≤5 · Kalk VCA ≤15 · kf ≤1×10⁻⁹ m/s · DPr ≥97% (muss)
--                 — matches REQ-12 unchanged.
--               · Alkalisilikat   (PDF p106, §7.2): "Dicke … mind. 25 cm" ·
--                 "Feinkornanteil <0,063 mm … mind. 20 Masse-%" (both "soll" → warn)
--                 — matches REQ-22 unchanged.
--               · Ice/Eisdruck    (PDF p30, §4.4): "Ist eine Eisbildung nicht
--                 auszuschließen, ist der Randbereich … " — engineer-judged /
--                 documented (no numeric threshold) → REQ-06 correctly attestation.
--            THRESHOLDS ARE PRESERVED VERBATIM. This migration changes ONLY the
--            gate GRAMMAR (enforcement), retypes one equation, and backfills
--            provenance — it does NOT alter any confirmed numeric value.
--
-- WRITTEN-NOT-APPLIED. READ-ONLY campaign. Do NOT commit. Do NOT apply to prod.
--
-- Apply    : node scripts/apply-migration.mjs scripts/migrations/20260708220000_fll_gar_2023_gate_enforcement.sql
--
-- Rollback : (all changes converge/idempotent; to revert)
--   * SEV-1 gate rewrites: restore each REQ's condition to its literal IF…THEN
--     form (listed inline in STEP 1). No rows are inserted/deleted by STEP 1.
--   * REQ-06 grammar fix: restore condition to
--       'if eisbildung_moeglich == true: documented ice-pressure protection'.
--   * Prose→attestation (REQ-08/09/11/24): restore their original prose
--     conditions (listed inline in STEP 3). DELETE the attestation fields
--     inserted by STEP 4:  DELETE FROM fields WHERE symbol IN
--       ('attest_fll_gar_04_req_06','attest_fll_gar_07_req_08',
--        'attest_fll_gar_07_req_09','attest_fll_gar_22_req_11',
--        'attest_fll_gar_22_req_24')
--       AND worksheet_template_id IN (SELECT wt.id FROM worksheet_templates wt
--         JOIN standards s ON s.id=wt.standard_id WHERE s.code='FLL-GAR-2023').
--   * Gl.2b retype: restore equation 2b output_symbol to 'g_prime'
--     (see STEP 5 inline for the exact pre-migration formula).
--   * Provenance backfills (STEP 6): set the touched source_file/source_anchor
--     back to NULL (they were NULL pre-migration).
--
-- ----------------------------------------------------------------------------
-- FIX-DRAFT items implemented (DEEP-FLL-GAR-2023.md §FIX-DRAFT + FIX-QUEUE.md):
--
--  SEV-1  G2 · per-sealing-type IF…THEN gates → canonical (NOT trigger) OR body.
--         [pattern P-6c]  REQ-05/12/13/14/15/16/17/18/20/22.
--         The audit headline: the standard's CORE mandatory content ("which
--         sealing type needs what") is encoded as literal `IF abdichtungs_art
--         == X THEN <reqs>`. evaluate.ts DOES parse an IF…THEN guard, so these
--         are not dead in THIS engine — BUT PATTERN-LIBRARY §O4 makes the literal
--         IF…THEN form DEPRECATED (→ G2: enforces only where the engine happens
--         to parse it; found dead in other standards) and mandates the canonical
--         boolean implication `(NOT antecedent) OR consequent`, which enforces
--         under ANY engine (NOT/OR/paren only). Rewrite each to that form.
--         ⚠ SYMBOL-RHS TRAP (evaluate.ts L241-247/L364): a bare SYMBOL on a
--           comparison RHS is coerced to a STRING literal. The antecedents are
--           enum-equality vs a bare value (`abdichtungs_art == mineralisch_…`),
--           which is the CORRECT string-literal use (the enum stores that exact
--           string — enum_values render-confirmed to match every antecedent).
--           Every consequent compares a field to a NUMERIC literal (`>= 15`,
--           `<= 0.000000001`, `>= 280`, `>= 1.2`, `> 0.940`) or a QUOTED string
--           (`bentonit_type == "Na"`) → numeric/quoted RHS, no trap. NO field-vs-
--           field comparison exists in these gates, so the subtraction form is
--           not needed here. Thresholds are UNCHANGED from the confirmed source.
--
--  SEV-2  G10 · prose gates → real predicates / attestation. [pattern P-6e]
--         REQ-06 (`if … :` → won't tokenize, the ':' is an illegal char →
--           `manual`, non-enforcing) → attestation `attest_fll_gar_04_req_06
--           == True` (ice-pressure protection is engineer-judged, §4.4, no
--           numeric threshold → P-6e legitimate; requires_attestation already
--           true; severity stays warn = "soll").
--         REQ-09 ("Engineer-judged selection traceable to §4.7") → attestation
--           (genuinely non-computable judgement; requires_attestation already true).
--         REQ-11 ("If required and abdichtung not inherently resistant: separate
--           Wurzelschutzbahn") → attestation (conditional engineer judgement;
--           requires_attestation already true).
--         REQ-24 ("Engineer-judged adequacy of protective layers") → attestation
--           (non-computable; requires_attestation already true).
--         REQ-08 ("Slope per Tab.1 row for chosen abdichtungs_art") → attestation.
--           Tab.1 (PDF p42, §4.5) IS a real material→max-slope lookup (row per
--           abdichtungs_art: e.g. ≤33% GTD/Bitumenbahn, ≤50% Ortbeton/Asphaltbeton,
--           ≤66% KE-Bahnen, ≤20% Gussasphalt). The faithful numeric gate would be
--           `boeschungsneigung_pct <= tab1_max[abdichtungs_art]`, but NEITHER a
--           `boeschungsneigung_pct` field NOR a Tab.1 lookup exists in the DB, so
--           building it would require inventing a field + a keyed lookup. To avoid
--           inventing, REQ-08 is made an attestation for now and the numeric Tab.1
--           gate is FLAGGED for Alvaro (see LEFT-UNFIXED / P-13 note).
--
--  SEV-3  P1 · provenance backfill (source_file/source_anchor). [pattern P-2/P-3]
--         Set source_file='fll_gewaesserabdichtungsrichtlinien_2023__2.pdf' and a
--         precise source_anchor on the gates whose source_quote is already present
--         but whose source_file/anchor are NULL (REQ-06/12). NO quote is invented;
--         only rows that ALREADY carry a verbatim source_quote get the file/anchor
--         attached. Rows with NULL source_quote are left for a targeted VA backfill
--         (see LEFT-UNFIXED) — nothing fabricated.
--
--  SEV-2  S5/S7 · Gl.2b retype (anti-uplift constraint mis-encoded as a producer).
--         [pattern P-4]  Equations 2a and 2b BOTH declare output_symbol='g_prime'
--         (multi-producer collision, S5). 2a `g_prime = γ'_D·d_D` is the ACTUAL
--         producer (the cover-layer surface weight); 2b `g' ≥ [Δu·γ_A − …]/cos β`
--         is a CHECK/constraint (Anhang 2, informativ), not a producer. Retype 2b's
--         output_symbol to the check sentinel '(condition)' so g_prime has ONE
--         producer (2a). The formula (with cos β) is UNCHANGED and remains
--         imported_unverified — see ENGINE note (cos is not evaluable).
--
-- ----------------------------------------------------------------------------
-- LEFT-UNFIXED (deliberate — see final report):
--
--   * ENGINE-blocked (X1): Gl.2b's cos(β) is trig — arithmetic.ts/evaluate.ts
--     cannot evaluate trig. The 2b constraint is therefore NOT turned into an
--     enforcing compliance gate here (it would silently never evaluate). It stays
--     an informative-annex check row (retyped to '(condition)'), and building an
--     enforcing uplift gate is deferred to the ENGINE track (trig support). The
--     annex is "(informativ)" anyway (S10) → advisory, not a "muss".
--
--   * REQ-08 numeric Tab.1 slope gate — FLAGGED for Alvaro. Needs (a) a
--     `boeschungsneigung_pct` input field on FLL-GAR-07, and (b) a Tab.1
--     material→max-slope lookup (§4.5, p42) keyed on abdichtungs_art. Both are
--     absent; not inventing them. Interim: attestation (STEP 3/4).
--
--   * source_quote NULL backfill for REQ-01/08/10/29/30 (and REQ-05/07/08 where
--     the quote is NULL) — each needs its own clause rendered + verbatim-lifted;
--     not all were render-confirmed in this pass. To avoid mis-attribution, these
--     are LEFT for a targeted VA-only SEV-3 backfill. NO quote invented.
--
--   * S10 informative-annex flag (all 4 equations from Anhang 1&2 "(informativ)")
--     — a documentation/tagging concern; no schema column for "informative" beyond
--     verification_status (already imported_unverified). Noted, not encoded.
--
--   * P4 adopted-method provenance (Q_NOT ← DIN 1986-100; uplift ← BAW-Merkblatt)
--     — correctly restated in FLL-GAR's own annexes; a cross-reference tagging
--     nicety, not a defect. Left as-is.
--
--   * The 4 pre-existing attestation gates whose fields DON'T EXIST in the DB
--     (REQ-19/21/25/26 reference attest_fll_gar_10_req_19 / …_req_21 /
--     attest_fll_gar_22_req_25 / attest_fll_gar_25_req_26 but no such fields
--     exist → they currently resolve `pending`, i.e. also non-enforcing). This is
--     a real pre-existing gap but NOT in the FIX-DRAFT gap list; FLAGGED for Alvaro,
--     not fixed here (out of the drafted scope; would need 4 more field inserts).
--
-- ----------------------------------------------------------------------------
-- P-13 note: FLL-GAR-2023 has ~406 regulation_tables rows. NONE is read by any
--   gate rewritten here — the rewritten gates key on `abdichtungs_art` (the
--   guideline's OWN governing dimension: the chosen sealing-system type, per the
--   §5/§6/§7 per-material chapter structure and the FLL-GAR-10…21 worksheet
--   split) and on directly-entered material fields. No keyed lookup is re-keyed
--   or coarsened. The ONE place a real keyed lookup WOULD apply — Tab.1 slope by
--   abdichtungs_art (§4.5, p42) — is render-confirmed to be keyed on abdichtungs_art
--   (each material has its own max slope, e.g. Gussasphalt ≤20% vs KE-Bahn ≤66%,
--   so the material IS the faithful key), but it is NOT materialised as a
--   regulation_tables lookup today → REQ-08 left as attestation + flagged, no
--   coarser key silently substituted.
-- ============================================================================

DO $$
DECLARE
  v_standard_id uuid;
  v_ws04 uuid;  -- FLL-GAR-04 Nutzungsfestlegung (REQ-05/06/07)
  v_ws07 uuid;  -- FLL-GAR-07 Profilierung/Böschungsneigung (REQ-08/09)
  v_ws10 uuid;  -- FLL-GAR-10 (carries REQ-12..22, the per-material gates)
  v_ws22 uuid;  -- FLL-GAR-22 Schutzlagen/Randausbildung (REQ-11/23/24)
  v_sec04_input uuid := '021bec28-48e7-4318-810d-29250b0f5779'; -- FLL-GAR-04 Input Parameters
  v_sec07_input uuid := 'f26e2af9-2da6-4625-a096-65309da22730'; -- FLL-GAR-07 Input Parameters
  v_sec22_input uuid := 'b0816936-c02a-4346-9d51-c54b71ce7d4e'; -- FLL-GAR-22 Input Parameters
  v_has_art boolean;
  v_has_eis boolean;
  v_next_order int;
BEGIN
  -- ---- resolve standard -----------------------------------------------------
  SELECT id INTO v_standard_id FROM standards WHERE code = 'FLL-GAR-2023';
  IF v_standard_id IS NULL THEN
    RAISE EXCEPTION 'Standard FLL-GAR-2023 not found';
  END IF;

  -- ---- resolve worksheets ---------------------------------------------------
  SELECT id INTO v_ws04 FROM worksheet_templates WHERE standard_id=v_standard_id AND code='FLL-GAR-04';
  IF v_ws04 IS NULL THEN RAISE EXCEPTION 'FLL-GAR-2023 worksheet FLL-GAR-04 not found'; END IF;
  SELECT id INTO v_ws07 FROM worksheet_templates WHERE standard_id=v_standard_id AND code='FLL-GAR-07';
  IF v_ws07 IS NULL THEN RAISE EXCEPTION 'FLL-GAR-2023 worksheet FLL-GAR-07 not found'; END IF;
  SELECT id INTO v_ws10 FROM worksheet_templates WHERE standard_id=v_standard_id AND code='FLL-GAR-10';
  IF v_ws10 IS NULL THEN RAISE EXCEPTION 'FLL-GAR-2023 worksheet FLL-GAR-10 not found'; END IF;
  SELECT id INTO v_ws22 FROM worksheet_templates WHERE standard_id=v_standard_id AND code='FLL-GAR-22';
  IF v_ws22 IS NULL THEN RAISE EXCEPTION 'FLL-GAR-2023 worksheet FLL-GAR-22 not found'; END IF;

  -- Assert the governing trigger fields exist (a gate referencing a missing
  -- symbol would silently never trigger). abdichtungs_art drives every SEV-1
  -- rewrite; eisbildung_moeglich is no longer referenced after REQ-06's fix but
  -- is checked for completeness.
  SELECT EXISTS(SELECT 1 FROM fields WHERE symbol='abdichtungs_art'
                AND worksheet_template_id IN (SELECT id FROM worksheet_templates WHERE standard_id=v_standard_id))
    INTO v_has_art;
  SELECT EXISTS(SELECT 1 FROM fields WHERE symbol='eisbildung_moeglich'
                AND worksheet_template_id IN (SELECT id FROM worksheet_templates WHERE standard_id=v_standard_id))
    INTO v_has_eis;
  IF NOT v_has_art THEN
    RAISE EXCEPTION 'FLL-GAR-2023: trigger field abdichtungs_art not found — cannot rewrite per-material gates';
  END IF;

  -- ==========================================================================
  -- STEP 1 — SEV-1 (G2 → P-6c): rewrite each literal IF…THEN per-material gate
  --   to the canonical (NOT (abdichtungs_art == X)) OR (body). Each UPDATE is
  --   guarded by (code, worksheet_template_id, condition = <old literal>) so it
  --   is idempotent and converges (re-run after rewrite = no-op; matches 0 rows).
  --   Thresholds inside each body are IDENTICAL to the confirmed source values.
  -- ==========================================================================

  -- REQ-05 (FLL-GAR-04, §6.1.1/Tab.18): sheet-type sealings → classify Einwirkungsklassen.
  --   trigger uses IN {…} → wrap the whole membership under NOT.
  UPDATE compliance_requirements
    SET condition = '(NOT (abdichtungs_art IN {bahn_bitumen,bahn_kunststoff_elastomer,fluessigkunststoff,bahn_pe})) OR (wassereinwirkungsklasse IS NOT NULL AND rissklasse IS NOT NULL AND standortklasse IS NOT NULL)'
    WHERE worksheet_template_id=v_ws04 AND code='REQ-05'
      AND condition='IF abdichtungs_art IN {bahn_bitumen,bahn_kunststoff_elastomer,fluessigkunststoff,bahn_pe} THEN wassereinwirkungsklasse IS NOT NULL AND rissklasse IS NOT NULL AND standortklasse IS NOT NULL';

  -- REQ-12 (FLL-GAR-10, §5.1.1/Tab.3): mineral without additives. Thresholds Tab.3 (PDF p39-41): VA-confirmed.
  UPDATE compliance_requirements
    SET condition = '(NOT (abdichtungs_art == mineralisch_ohne_zusatzstoffe)) OR (kornanteil_unter_2micron >= 15 AND organische_substanz_VGL <= 5 AND kalkgehalt_VCA <= 15 AND kf_abdichtung <= 0.000000001 AND verdichtungsgrad_Dpr >= 97)'
    WHERE worksheet_template_id=v_ws10 AND code='REQ-12'
      AND condition='IF abdichtungs_art == mineralisch_ohne_zusatzstoffe THEN kornanteil_unter_2micron >= 15 AND organische_substanz_VGL <= 5 AND kalkgehalt_VCA <= 15 AND kf_abdichtung <= 0.000000001 AND verdichtungsgrad_Dpr >= 97';

  -- REQ-13 (FLL-GAR-10, §5.2.1/Tab.5): mineral with additives.
  UPDATE compliance_requirements
    SET condition = '(NOT (abdichtungs_art == mineralisch_mit_zusatzstoffen)) OR (mz_durchlaessigkeit_kf <= 0.000000001 AND mz_dichtungswirkung_nachgewiesen == true)'
    WHERE worksheet_template_id=v_ws10 AND code='REQ-13'
      AND condition='IF abdichtungs_art == mineralisch_mit_zusatzstoffen THEN mz_durchlaessigkeit_kf <= 0.000000001 AND mz_dichtungswirkung_nachgewiesen == true';

  -- REQ-14 (FLL-GAR-10, §5.3.1/Tab.6): concrete (WU). Tab.6 (PDF p50): w/z≤0,60(≤40) · Z≥280 · w/z≤0,70(>40): VA-confirmed.
  UPDATE compliance_requirements
    SET condition = '(NOT (abdichtungs_art == mineralisch_hydraulisch)) OR ((bauteildicke_cm <= 40 AND wasserzementwert <= 0.60 AND zementgehalt_kg_m3 >= 280) OR (bauteildicke_cm > 40 AND wasserzementwert <= 0.70))'
    WHERE worksheet_template_id=v_ws10 AND code='REQ-14'
      AND condition='IF abdichtungs_art == mineralisch_hydraulisch THEN ((bauteildicke_cm <= 40 AND wasserzementwert <= 0.60 AND zementgehalt_kg_m3 >= 280) OR (bauteildicke_cm > 40 AND wasserzementwert <= 0.70))';

  -- REQ-15 (FLL-GAR-10, §5.4.1/Tab.12): asphalt Hohlraumgehalt ≤3 Vol-%.
  UPDATE compliance_requirements
    SET condition = '(NOT (abdichtungs_art == mineralisch_bitumen)) OR (hohlraumgehalt_asphaltbeton_vol_pct <= 3)'
    WHERE worksheet_template_id=v_ws10 AND code='REQ-15'
      AND condition='IF abdichtungs_art == mineralisch_bitumen THEN hohlraumgehalt_asphaltbeton_vol_pct <= 3';

  -- REQ-16 (FLL-GAR-10, §5.5.1/Tab.13): GTD/GCL. Na/Ca bentonite branches + overlap.
  UPDATE compliance_requirements
    SET condition = '(NOT (abdichtungs_art == verbundwerkstoff_gtd)) OR (((bentonit_type == "Na" AND bentonit_flaecheneinheit_g_m2 >= 3600 AND quellvermoegen_ml >= 24) OR (bentonit_type == "Ca" AND bentonit_flaecheneinheit_g_m2 >= 8000 AND quellvermoegen_ml >= 8)) AND gtd_ueberlappung_laengs_cm >= 30 AND gtd_ueberlappung_quer_cm >= 50)'
    WHERE worksheet_template_id=v_ws10 AND code='REQ-16'
      AND condition='IF abdichtungs_art == verbundwerkstoff_gtd THEN ((bentonit_type == "Na" AND bentonit_flaecheneinheit_g_m2 >= 3600 AND quellvermoegen_ml >= 24) OR (bentonit_type == "Ca" AND bentonit_flaecheneinheit_g_m2 >= 8000 AND quellvermoegen_ml >= 8)) AND gtd_ueberlappung_laengs_cm >= 30 AND gtd_ueberlappung_quer_cm >= 50';

  -- REQ-17 (FLL-GAR-10, §6.1.1.2/Tab.19): Bitumenbahnen ≥2 Lagen (warn).
  UPDATE compliance_requirements
    SET condition = '(NOT (abdichtungs_art == bahn_bitumen)) OR (anzahl_lagen >= 2)'
    WHERE worksheet_template_id=v_ws10 AND code='REQ-17'
      AND condition='IF abdichtungs_art == bahn_bitumen THEN anzahl_lagen >= 2';

  -- REQ-18 (FLL-GAR-10, §6.2.1.2): KE-Bahnen Mindestdicke ≥1,2 mm.
  UPDATE compliance_requirements
    SET condition = '(NOT (abdichtungs_art == bahn_kunststoff_elastomer)) OR (bahnendicke_mm >= 1.2)'
    WHERE worksheet_template_id=v_ws10 AND code='REQ-18'
      AND condition='IF abdichtungs_art == bahn_kunststoff_elastomer THEN bahnendicke_mm >= 1.2';

  -- REQ-20 (FLL-GAR-10, §6.4.1/Tab.24): PE-Bahnen (PEHD) Dichte/MFR/Ruß.
  UPDATE compliance_requirements
    SET condition = '(NOT (abdichtungs_art == bahn_pe)) OR (peeh_dichte_g_cm3 > 0.940 AND peeh_mfr >= 1.0 AND peeh_mfr <= 3.0 AND peeh_russgehalt_pct >= 2 AND peeh_russgehalt_pct <= 3)'
    WHERE worksheet_template_id=v_ws10 AND code='REQ-20'
      AND condition='IF abdichtungs_art == bahn_pe THEN peeh_dichte_g_cm3 > 0.940 AND peeh_mfr >= 1.0 AND peeh_mfr <= 3.0 AND peeh_russgehalt_pct >= 2 AND peeh_russgehalt_pct <= 3';

  -- REQ-22 (FLL-GAR-10, §7.2): Alkalisilikate — Dicke ≥25 cm + Feinkorn ≥20% (warn "soll").
  --   Alkalisilikat (PDF p106): "mind. 25 cm" + "mind. 20 Masse-%": VA-confirmed.
  UPDATE compliance_requirements
    SET condition = '(NOT (abdichtungs_art == alkalisilikat)) OR (schichtdicke_abdichtung_cm >= 25 AND feinkornanteil_063_pct >= 20)'
    WHERE worksheet_template_id=v_ws10 AND code='REQ-22'
      AND condition='IF abdichtungs_art == alkalisilikat THEN schichtdicke_abdichtung_cm >= 25 AND feinkornanteil_063_pct >= 20';

  -- ==========================================================================
  -- STEP 2 — SEV-2 (G10): REQ-06 grammar fix (lowercase `if … :` won't tokenize
  --   → `manual`, non-enforcing) → attestation. Ice-pressure protection is
  --   engineer-judged (§4.4, PDF p30 — "Ist eine Eisbildung nicht auszuschließen …";
  --   no numeric threshold) → P-6e legitimate. requires_attestation already true;
  --   severity stays warn ("soll"-level). Field inserted in STEP 4.
  -- ==========================================================================
  UPDATE compliance_requirements
    SET condition = 'attest_fll_gar_04_req_06 == True'
    WHERE worksheet_template_id=v_ws04 AND code='REQ-06'
      AND condition='if eisbildung_moeglich == true: documented ice-pressure protection';

  -- ==========================================================================
  -- STEP 3 — SEV-2 (G10): prose gates → attestation predicates (P-6e).
  --   REQ-08/09 on FLL-GAR-07; REQ-11/24 on FLL-GAR-22. All already carry
  --   requires_attestation=true; each is genuine engineer judgement (or, for
  --   REQ-08, a Tab.1 lookup that isn't materialised — see LEFT-UNFIXED). Fields
  --   inserted in STEP 4. Guarded by the exact prose so re-runs converge.
  -- ==========================================================================
  UPDATE compliance_requirements
    SET condition = 'attest_fll_gar_07_req_08 == True'
    WHERE worksheet_template_id=v_ws07 AND code='REQ-08'
      AND condition='Slope per Tab.1 row for chosen abdichtungs_art';

  UPDATE compliance_requirements
    SET condition = 'attest_fll_gar_07_req_09 == True'
    WHERE worksheet_template_id=v_ws07 AND code='REQ-09'
      AND condition='Engineer-judged selection traceable to Sec.4.7 criteria';

  UPDATE compliance_requirements
    SET condition = 'attest_fll_gar_22_req_11 == True'
    WHERE worksheet_template_id=v_ws22 AND code='REQ-11'
      AND condition='If required and abdichtung not inherently resistant: separate Wurzelschutzbahn';

  UPDATE compliance_requirements
    SET condition = 'attest_fll_gar_22_req_24 == True'
    WHERE worksheet_template_id=v_ws22 AND code='REQ-24'
      AND condition='Engineer-judged adequacy of protective layers';

  -- ==========================================================================
  -- STEP 4 — attestation fields backing STEP 2/3 (idempotent; NOT EXISTS-guarded).
  --   section_id = the worksheet's "Input Parameters" section; order_index = MAX+1
  --   within that section; active default true; verification_status imported_unverified.
  -- ==========================================================================

  -- attest_fll_gar_04_req_06 (FLL-GAR-04)
  IF NOT EXISTS (SELECT 1 FROM fields WHERE section_id=v_sec04_input AND symbol='attest_fll_gar_04_req_06') THEN
    SELECT COALESCE(MAX(order_index),0)+1 INTO v_next_order FROM fields WHERE section_id=v_sec04_input;
    INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type,
                        is_required, clause_reference, description, order_index, verification_status,
                        active, source_file, source_anchor, source_quote)
    VALUES (v_ws04, v_sec04_input, 'attest_fll_gar_04_req_06',
            'Eisdruck-Schutz dokumentiert (Bestätigung)', 'Ice-pressure protection documented (attestation)',
            'boolean', false, 'Sec.4.4',
            'Bestätigung: Ist eine Eisbildung nicht auszuschließen, wurde der Randbereich gegen Eisdruck geschützt und dies dokumentiert (§4.4).',
            v_next_order, 'imported_unverified', true,
            'fll_gewaesserabdichtungsrichtlinien_2023__2.pdf', '§4.4 Bauliche Erfordernisse (S. 30, gerendert)',
            'Ist eine Eisbildung nicht auszuschließen, ist der Randbereich, insbesondere die Abdichtung, gegen Eisdruck zu schützen.');
  END IF;

  -- attest_fll_gar_07_req_08 (FLL-GAR-07)
  IF NOT EXISTS (SELECT 1 FROM fields WHERE section_id=v_sec07_input AND symbol='attest_fll_gar_07_req_08') THEN
    SELECT COALESCE(MAX(order_index),0)+1 INTO v_next_order FROM fields WHERE section_id=v_sec07_input;
    INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type,
                        is_required, clause_reference, description, order_index, verification_status,
                        active, source_file, source_anchor, source_quote)
    VALUES (v_ws07, v_sec07_input, 'attest_fll_gar_07_req_08',
            'Böschungsneigung material-konform nach Tab.1 (Bestätigung)',
            'Slope conforms to Tab.1 for chosen sealing type (attestation)',
            'boolean', false, 'Sec.4.5; Tab.1',
            'Bestätigung: Die Böschungsneigung liegt innerhalb des für die gewählte Abdichtungsart nach Tab.1 zulässigen Höchstwerts (§4.5). Interim-Attestierung — die numerische Tab.1-Prüfung ist noch nicht als Lookup hinterlegt.',
            v_next_order, 'needs_engineer_review', true,
            'fll_gewaesserabdichtungsrichtlinien_2023__2.pdf', '§4.5 Profilierung und Neigung, Tab.1 (S. 42, gerendert)',
            NULL);
  END IF;

  -- attest_fll_gar_07_req_09 (FLL-GAR-07)
  IF NOT EXISTS (SELECT 1 FROM fields WHERE section_id=v_sec07_input AND symbol='attest_fll_gar_07_req_09') THEN
    SELECT COALESCE(MAX(order_index),0)+1 INTO v_next_order FROM fields WHERE section_id=v_sec07_input;
    INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type,
                        is_required, clause_reference, description, order_index, verification_status,
                        active, source_file, source_anchor, source_quote)
    VALUES (v_ws07, v_sec07_input, 'attest_fll_gar_07_req_09',
            'Abdichtungssystem nutzungsadäquat gewählt (Bestätigung)',
            'Sealing system selected appropriately for use (attestation)',
            'boolean', false, 'Sec.4.7',
            'Bestätigung: Die Auswahl des Abdichtungssystems ist nachvollziehbar auf die Kriterien nach §4.7 zurückzuführen.',
            v_next_order, 'imported_unverified', true,
            'fll_gewaesserabdichtungsrichtlinien_2023__2.pdf', '§4.7 Auswahl des Abdichtungssystems (gerendert)',
            NULL);
  END IF;

  -- attest_fll_gar_22_req_11 (FLL-GAR-22)
  IF NOT EXISTS (SELECT 1 FROM fields WHERE section_id=v_sec22_input AND symbol='attest_fll_gar_22_req_11') THEN
    SELECT COALESCE(MAX(order_index),0)+1 INTO v_next_order FROM fields WHERE section_id=v_sec22_input;
    INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type,
                        is_required, clause_reference, description, order_index, verification_status,
                        active, source_file, source_anchor, source_quote)
    VALUES (v_ws22, v_sec22_input, 'attest_fll_gar_22_req_11',
            'Wurzel-/Rhizomfestigkeit adressiert (Bestätigung)',
            'Root/rhizome resistance addressed (attestation)',
            'boolean', false, 'Sec.4.7',
            'Bestätigung: Sofern erforderlich und die Abdichtung nicht inhärent wurzel-/rhizomfest ist, wurde eine separate Wurzelschutzbahn vorgesehen (§4.7).',
            v_next_order, 'imported_unverified', true,
            'fll_gewaesserabdichtungsrichtlinien_2023__2.pdf', '§4.7 / Anhang (Wurzel-/Rhizomfestigkeit) (gerendert)',
            NULL);
  END IF;

  -- attest_fll_gar_22_req_24 (FLL-GAR-22)
  IF NOT EXISTS (SELECT 1 FROM fields WHERE section_id=v_sec22_input AND symbol='attest_fll_gar_22_req_24') THEN
    SELECT COALESCE(MAX(order_index),0)+1 INTO v_next_order FROM fields WHERE section_id=v_sec22_input;
    INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type,
                        is_required, clause_reference, description, order_index, verification_status,
                        active, source_file, source_anchor, source_quote)
    VALUES (v_ws22, v_sec22_input, 'attest_fll_gar_22_req_24',
            'Schutzlagen/-schichten adäquat dimensioniert (Bestätigung)',
            'Protective layers adequately dimensioned (attestation)',
            'boolean', false, 'Sec.8',
            'Bestätigung: Die Angemessenheit der Schutzlagen/-schichten wurde ingenieurmäßig beurteilt und dokumentiert (§8).',
            v_next_order, 'imported_unverified', true,
            'fll_gewaesserabdichtungsrichtlinien_2023__2.pdf', '§8 Schutzlagen und Schutzschichten (gerendert)',
            NULL);
  END IF;

  -- ==========================================================================
  -- STEP 5 — SEV-2 (S5/S7, P-4): Gl.2b retype. 2a is the g_prime PRODUCER;
  --   2b is the anti-uplift CHECK (Anhang 2, informativ). Retype 2b's
  --   output_symbol to the check sentinel '(condition)' so g_prime has ONE
  --   producer (2a). Formula (incl. cos β) UNCHANGED — cos is ENGINE-blocked
  --   (X1) so 2b is not turned into an enforcing gate here.
  --   Guarded by the current output_symbol + formula so it converges.
  -- ==========================================================================
  UPDATE equations
    SET output_symbol = '(condition)'
    WHERE worksheet_template_id=v_ws22
      AND equation_number='2b'
      AND output_symbol='g_prime'
      AND formula='g_prime >= (Delta_u * gamma_A - (gamma_F_prime * d_F + gamma_Di_prime * d_Di)) / cos(beta)';

  -- ==========================================================================
  -- STEP 6 — SEV-3 (P1, P-2/P-3): provenance backfill — attach source_file +
  --   source_anchor to gates that ALREADY carry a verbatim source_quote but have
  --   NULL source_file/anchor. NO quote invented. Only REQ-06 (§4.4) and REQ-12
  --   (§5.1.1 Tab.3) were render-confirmed this pass; others left for VA backfill.
  -- ==========================================================================
  UPDATE compliance_requirements
    SET source_file = 'fll_gewaesserabdichtungsrichtlinien_2023__2.pdf',
        source_anchor = COALESCE(source_anchor, '§4.4 Bauliche Erfordernisse (S. 30, gerendert)')
    WHERE worksheet_template_id=v_ws04 AND code='REQ-06'
      AND source_quote IS NOT NULL AND source_file IS NULL;

  UPDATE compliance_requirements
    SET source_file = 'fll_gewaesserabdichtungsrichtlinien_2023__2.pdf',
        source_anchor = COALESCE(source_anchor, '§5.1.1 Tab.3 Anforderungen mineralische Abdichtung (S. 39-41, gerendert)')
    WHERE worksheet_template_id=v_ws10 AND code='REQ-12'
      AND source_quote IS NOT NULL AND source_file IS NULL;

  -- ---- final notice ---------------------------------------------------------
  RAISE NOTICE 'FLL-GAR-2023 applied: SEV-1 rewrote 10 per-material IF…THEN gates → (NOT trigger) OR body (P-6c); SEV-2 REQ-06/08/09/11/24 → attestation (+5 fields); Gl.2b retyped to (condition); SEV-3 provenance backfilled on REQ-06/12. NO regeneration/retention ratio exists in this standard — none invented. cos(β)/Tab.1-slope/NULL-quote backfill left for ENGINE/Alvaro.';
END $$;
