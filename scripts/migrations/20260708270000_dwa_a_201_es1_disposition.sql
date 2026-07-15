-- ============================================================================
-- Migration: 20260708270000_dwa_a_201_es1_disposition.sql
-- Standard : DWA-A-201 (Grundsätze für Bemessung, Bau und Betrieb von
--            Abwasserteichanlagen)
-- Source   : Desktop/Guidelines/DWA-A-201/dwa_a_201 (1).pdf
--            (Titel "DWA-A 201 · Abwasserteichanlagen · August 2005, korrigiert
--             Dezember 2011"; DB-Version "August 2005 (corrected December 2011)"
--             → AUTHORITATIVE, richtige Norm/Ausgabe). Jeder Schwellenwert und
--             jedes Modalverb unten wurde RENDER-bestätigt (poppler pdftoppm
--             150 dpi S. 10 §5.1–5.3 + S. 11 §5.4–5.5, ergänzt durch
--             pdftotext -layout).
--
-- WRITTEN-NOT-APPLIED. READ-ONLY campaign. Do NOT commit. Do NOT apply to prod.
--
-- Apply    : node scripts/apply-migration.mjs scripts/migrations/20260708270000_dwa_a_201_es1_disposition.sql
--
-- ----------------------------------------------------------------------------
-- SCOPE — DWA-A-201 ES-1 ONLY (Ungleichung-als-Produzent, Registerklasse S1/S7).
--
--   Der Defekt (DEEP-DWA-A-201.md F-threshold-as-eq): Bemessungs-Schwellenwerte
--   aus Prosa (§5.1–5.5) sind als Produzenten-Gleichungen encodiert, deren
--   output_symbol das GEPRÜFTE Eingabe-/Bemessungsfeld selbst ist. Damit ist
--   jede Gleichung ein zweiter Produzent ihres eigenen Symbols → der
--   Multi-Producer-Collision-Guard der Engine kann den vom Ingenieur
--   eingegebenen Wert BLANKEN (identisch zum M-205- und FLL-GAR-22:2b-Bug).
--
--   12 ES-1-Instanzen (je GENAU EINMAL — KEIN S3 ×2 in A-201, DB-Scan
--   F-01…F-21 bestätigt):
--     F-01 V_erf_grobstoff ≥ Q_M·t_R,M   (A201-08, §5.1) — Feld-RHS
--     F-03 V_EW_absetz ≥ 0,5             (A201-09, §5.2)
--     F-04 V_schlammraum_absetz ≥ 0,15   (A201-09, §5.2)
--     F-06 t_R_absetz ≥ 1                (A201-09, §5.2)
--     F-07 A_EW_unbelueftet ≥ 10         (A201-10, §5.3)
--     F-08 A_EW_unbelueftet ≥ 8          (A201-10, §5.3) [C9-Alternative zu F-07]
--     F-10 A_EW_nitrifikation ≥ 15       (A201-10, §5.3) [deskriptiv]
--     F-11 B_R_BSB ≤ 25                  (A201-11, §5.4)
--     F-12 t_R_belueftet ≥ 5             (A201-11, §5.4)
--     F-13 OV_C_BSB ≥ 1,5                (A201-11, §5.4)
--     F-15 t_R_nachklaer ≥ 1             (A201-12, §5.5)
--     F-16 A_min_nachklaer ≥ 20          (A201-12, §5.5)
--   (F-18/19/20 sealing_required/no_sealing/polishing_sealing_ok sind
--    BENIGNE boolean-Check-Outputs mit output_symbol ≠ Eingabefeld → NICHT
--    ES-1, NICHT angefasst. F-02/05/09 sind `=`-Zuweisungen (Konstanten
--    t_R_M=0,5 / schlammrate=0,3 / A_EW_Mi=5), keine Ungleichungen → nicht ES-1.
--    F-21 B_A=B_R·h ist eine echte Formel → nicht ES-1.)
--
--   NEUTRALISIERUNG (Produzenten-Rolle):
--   (a) ALLE 12 ES-1-Gleichungen → displayOnly:true in
--       src/lib/eval/equation-profiles.ts (CODE-Änderung, in diesem Commit
--       enthalten — stoppt den Collision-Blank). KEINE equations-Zeile wird
--       hier gelöscht oder umgeschrieben.
--   (b) Enforcement: Die durchsetzbaren "muss"/"gilt"/"zu bemessen"-Grenzwerte
--       werden BEREITS von vorhandenen Gates abgedeckt (siehe unten). Es werden
--       hier KEINE Gates dupliziert (ein Duplikat-Gate wäre gratuitous und
--       würde mit CR-006 kollidieren). Diese Migration FLAGGT nur die
--       pre-existing Gate-Defekte für Alvaro (keine destruktive Änderung).
--
-- ----------------------------------------------------------------------------
-- MODALVERB-BEFUND (verbatim aus gerendertem PDF) — Dispositionsentscheidung je Instanz:
--
--   F-01 V_erf_grobstoff ≥ Q_M·t_R,M  §5.1 S.10
--     "Für die Bemessung der Grobstoffentnahme gilt: V_erf ≥ Q_M · t_R,M ;
--      t_R,M = 0,5 h."
--     → "gilt" = normative Bemessungsregel. ENFORCEMENT EXISTIERT: CR-004
--       (`V_erf_grobstoff >= Q_M * t_R_M and t_R_M == 0.5`, block). Grammar-OK:
--       die RHS `Q_M * t_R_M` ist ARITHMETISCH → acompare-Pfad (evaluate.ts
--       L247), NICHT die Symbol-RHS-Always-Fail-Falle. Subtraktionsform NICHT
--       nötig, weil bereits Arithmetik vorhanden. → displayOnly, kein neues Gate.
--   F-03 V_EW_absetz ≥ 0,5  §5.2 S.10
--     "Absetzteiche werden auf V_EW ≥ 0,5 m³/E bemessen."
--     → "werden … bemessen" = normativer Bemessungswert. ENFORCEMENT: CR-005.
--   F-04 V_schlammraum_absetz ≥ 0,15  §5.2 S.10
--     "… ≥ 0,15 m³/E … gewählt werden."  → Bemessungswert. ENFORCEMENT: CR-005.
--   F-06 t_R_absetz ≥ 1  §5.2 S.10
--     "Es muss eine Durchflusszeit von mindestens einem Tag bei Trockenwetter
--      eingehalten werden."  → muss ≥ 1 d. ENFORCEMENT: CR-005.
--   F-07 A_EW_unbelueftet ≥ 10  §5.3 S.10
--     "Unbelüftete Abwasserteiche sind mit A_EW ≥ 10 m²/E zu bemessen."
--     → "sind … zu bemessen" = normativer Regelwert (block). ENFORCEMENT-Absicht
--       in CR-006 vorhanden, aber CR-006 DEFEKT → geflaggt (siehe FLAGS unten).
--   F-08 A_EW_unbelueftet ≥ 8  §5.3 S.10
--     "Dieser Wert kann auf 8 m²/E vermindert werden, wenn nach Abschnitt 5.2
--      bemessene Absetzteiche vorgeschaltet sind."
--     → bedingte Alternative ("kann … wenn"). C9-Selektor-Partner zu F-07.
--       ENFORCEMENT-Absicht in CR-006 (defekt, geflaggt).
--   F-10 A_EW_nitrifikation ≥ 15  §5.3 S.10
--     "Bei Bemessungswerten A_EW ≥ 15 m²/E ist im Sommer eine teilweise
--      Nitrifikation festzustellen."
--     → DESKRIPTIVE Beobachtung ("ist … festzustellen"), KEIN Mindestwert
--       → displayOnly ONLY, KEIN Gate (never-invent).
--   F-11 B_R_BSB ≤ 25  §5.4 S.11
--     "Für die Bemessung von belüfteten Abwasserteichen muss eine
--      BSB5-Raumbelastung von B_R,BSB ≤ 25 g/(m³·d) angesetzt werden."
--     → muss ≤ 25 (Last-Grenzwert, block). ENFORCEMENT: CR-007 (Platzierung geflaggt).
--   F-12 t_R_belueftet ≥ 5  §5.4 S.11
--     "Es muss eine Durchflusszeit von fünf Tagen bei Trockenwetter eingehalten
--      werden."  → muss ≥ 5 d (block). ENFORCEMENT: CR-007 (Platzierung geflaggt).
--   F-13 OV_C_BSB ≥ 1,5  §5.4 S.11
--     "Als Sauerstoffverbrauch muss OV_C,BSB ≥ 1,5 kg/kg … angesetzt werden."
--     → muss ≥ 1,5 (block). ENFORCEMENT: CR-007 (Platzierung geflaggt).
--   F-15 t_R_nachklaer ≥ 1  §5.5 S.11
--     "Das erforderliche gesamte Teichvolumen errechnet sich aus der
--      erforderlichen Mindestdurchflusszeit t_R = 1 d …"
--     → normative Mindest-Durchflusszeit (block). ENFORCEMENT: CR-008.
--   F-16 A_min_nachklaer ≥ 20  §5.5 S.11
--     "Bewährt haben sich Teiche mit einer Mindesttiefe von 1,2 m und einer
--      Mindestfläche von 20 m²."
--     → "Mindestfläche" = normativer Mindestwert (block); Verb "Bewährt haben
--       sich" ist weicher (Erfahrungswert) → für Alvaro. ENFORCEMENT: CR-008
--       (`A_min_nachklaer>=20 and h_nachklaer>=1.2` — Mindesttiefe 1,2 m
--       mitabgedeckt, schließt die DEEP-Audit-Lücke "1,2 m dropped").
--
-- ----------------------------------------------------------------------------
-- GRAMMAR-CHECK (gegen src/lib/compliance/evaluate.ts, verifiziert):
--   * CR-004 F-01: `V_erf_grobstoff >= Q_M * t_R_M` — RHS enthält `*` →
--     acompare-Pfad (numerisch), KEINE Symbol-RHS-Always-Fail-Falle. Korrekt.
--     (Die im Brief geforderte Subtraktionsform `a - (expr) >= 0` ist NUR bei
--      BARE-Symbol-RHS nötig; hier ist die RHS ein arithmetischer Ausdruck,
--      der den acompare-Pfad ohnehin erzwingt.)
--   * CR-005/007/008: numerisch-literale RHS (`>= 0.5`, `<= 25`, `>= 20`, …)
--     → legacy compare-Pfad mit Zahl-RHS, korrekt. Fehlender Wert → pending,
--     nie false-fail.
--
-- P-13: DWA-A-201 hat KEINE regulation_tables, die von diesen Gates gelesen
--   werden. Jedes Gate keyt direkt auf sein eigenes Bemessungsfeld (die
--   maßgebende Größe der jeweiligen §5.x-Klausel). Nicht getriggert.
--
-- ----------------------------------------------------------------------------
-- FLAGS FÜR ALVARO (pre-existing Gate-Defekte — NICHT von dieser Kampagne
--   eingeführt, NICHT hier repariert; Rewriting bereits-durchsetzender Gates
--   ist außerhalb des ES-1-Scopes und laut Standing-Insight gratuitous):
--
--   [FLAG-1] CR-006 (A201-08, §5.3) ist GRAMMATISCH DEFEKT + FALSCH PLATZIERT:
--     condition = "IF absetz_vorstufe == true THEN A_EW_unbelueftet >= 8
--                  AND IF absetz_vorstufe == false THEN A_EW_unbelueftet >= 10"
--     (a) evaluate.ts parst `IF guard THEN body` als EINE Guard-Node; das zweite
--         `IF` wird als AND-Atom in den body gezogen → wenn absetz_vorstufe=false
--         ist die äußere Guard false → Node passt VAKUÖS → A_EW ≥ 10 wird bei
--         false NIE durchgesetzt. Kanonische Form (P-6c): zwei getrennte Gates
--         oder `(NOT absetz_vorstufe) OR (A_EW_unbelueftet >= 10)` +
--         `(NOT (NOT absetz_vorstufe)) OR (A_EW_unbelueftet >= 8)`.
--     (b) A_EW_unbelueftet lebt auf A201-10, das Gate liegt aber auf A201-08 →
--         Cross-Worksheet-Symbol resolvet im worksheet-lokalen Lookup u. U. gar
--         nicht → Gate evaluiert `pending` statt zu enforcen.
--     → Empfehlung: nach A201-10 re-homen + in zwei P-6c-Gates auftrennen.
--
--   [FLAG-2] CR-007 (A201-08, §5.4) FALSCH PLATZIERT: prüft B_R_BSB,
--     t_R_belueftet, OV_C_BSB, P_R — alle auf A201-11 beheimatet, Gate liegt
--     aber auf A201-08 → Cross-Worksheet-Resolve-Risiko (pending statt enforce).
--     Grammar selbst OK (`P_R >= 1 AND P_R <= 3` ist die korrekte Auflösung des
--     nicht-parsebaren F-14 `P_R between 1 and 3`). → nach A201-11 re-homen.
--
--   [FLAG-3] F-14 `P_R between 1 and 3` (A201-11, EQ, §5.4) verwendet die
--     nicht-parsebare `between`-Syntax (DEEP-Audit synparse). Als GATE ist die
--     Regel bereits korrekt in CR-007 (`P_R >= 1 AND P_R <= 3`) formuliert; nur
--     die Gleichungs-Zeile trägt die tote Syntax. F-14 ist KEIN ES-1-Item
--     (Range-Konstante, kein produzierendes ≥/≤ auf ein Prüf-Feld) → hier nur
--     notiert, nicht angefasst.
--
-- ----------------------------------------------------------------------------
-- LEFT-UNFIXED (bewusst — siehe Bericht):
--   * displayOnly für die 12 ES-1-Gleichungen ist CODE (equation-profiles.ts),
--     NICHT SQL — im selben Commit, aber nicht in dieser Datei.
--   * KEINE neuen Gates: Enforcement existiert bereits (CR-004/005/007/008);
--     F-10 ist deskriptiv (kein Gate); die einzige echte Enforcement-Lücke
--     (F-07/08 via defektem CR-006) wird via FLAG-1 an Alvaro übergeben, statt
--     ein Konkurrenz-Gate zu bauen.
--   * DEEP-Audit S9 "F-16 dropped 1,2 m depth" ist bereits durch CR-008
--     (`h_nachklaer>=1.2`) abgedeckt — kein separater Fix nötig.
--
-- ----------------------------------------------------------------------------
-- Rollback:
--   Diese Migration schreibt KEINE Datenzeilen (weder INSERT noch UPDATE) —
--   sie ist rein assert/verify + dokumentierend. Kein Rollback erforderlich.
--   (equation-profiles.ts: displayOnly-Blöcke wieder entfernen — Code-Revert.)
-- ============================================================================

DO $$
DECLARE
  v_standard_id uuid;
  v_ws08 uuid;  -- A201-08 Grobstoffentnahme (F-01) + fehlplatzierte CR-006/007
  v_ws09 uuid;  -- A201-09 Absetzteiche (F-03/04/06)
  v_ws10 uuid;  -- A201-10 Unbelüftete Teiche (F-07/08/10)
  v_ws11 uuid;  -- A201-11 Belüftete Teiche (F-11/12/13)
  v_ws12 uuid;  -- A201-12 Nachklärteiche (F-15/16)
  v_missing text;
BEGIN
  -- ---- resolve standard -----------------------------------------------------
  SELECT id INTO v_standard_id FROM standards WHERE code = 'DWA-A-201';
  IF v_standard_id IS NULL THEN
    RAISE EXCEPTION 'Standard DWA-A-201 not found';
  END IF;

  -- ---- resolve the ES-1 worksheets -----------------------------------------
  SELECT id INTO v_ws08 FROM worksheet_templates WHERE standard_id = v_standard_id AND code = 'A201-08';
  SELECT id INTO v_ws09 FROM worksheet_templates WHERE standard_id = v_standard_id AND code = 'A201-09';
  SELECT id INTO v_ws10 FROM worksheet_templates WHERE standard_id = v_standard_id AND code = 'A201-10';
  SELECT id INTO v_ws11 FROM worksheet_templates WHERE standard_id = v_standard_id AND code = 'A201-11';
  SELECT id INTO v_ws12 FROM worksheet_templates WHERE standard_id = v_standard_id AND code = 'A201-12';
  IF v_ws08 IS NULL OR v_ws09 IS NULL OR v_ws10 IS NULL OR v_ws11 IS NULL OR v_ws12 IS NULL THEN
    RAISE EXCEPTION 'DWA-A-201 worksheet(s) missing (A201-08=%, -09=%, -10=%, -11=%, -12=%) — ES-1 disposition cannot verify',
      v_ws08, v_ws09, v_ws10, v_ws11, v_ws12;
  END IF;

  -- ---- assert every checked ES-1 field exists on its home worksheet --------
  -- Fail loud on schema drift (task rule). displayOnly (code) keys on the
  -- equation UUIDs; these field asserts guard that the collision targets are
  -- still where the audit found them, so the disposition stays valid.
  v_missing := '';
  IF NOT EXISTS (SELECT 1 FROM fields WHERE worksheet_template_id=v_ws08 AND symbol='V_erf_grobstoff') THEN v_missing := v_missing||'A201-08.V_erf_grobstoff '; END IF;
  IF NOT EXISTS (SELECT 1 FROM fields WHERE worksheet_template_id=v_ws09 AND symbol='V_EW_absetz')          THEN v_missing := v_missing||'A201-09.V_EW_absetz '; END IF;
  IF NOT EXISTS (SELECT 1 FROM fields WHERE worksheet_template_id=v_ws09 AND symbol='V_schlammraum_absetz') THEN v_missing := v_missing||'A201-09.V_schlammraum_absetz '; END IF;
  IF NOT EXISTS (SELECT 1 FROM fields WHERE worksheet_template_id=v_ws09 AND symbol='t_R_absetz')           THEN v_missing := v_missing||'A201-09.t_R_absetz '; END IF;
  IF NOT EXISTS (SELECT 1 FROM fields WHERE worksheet_template_id=v_ws10 AND symbol='A_EW_unbelueftet')     THEN v_missing := v_missing||'A201-10.A_EW_unbelueftet '; END IF;
  IF NOT EXISTS (SELECT 1 FROM fields WHERE worksheet_template_id=v_ws10 AND symbol='A_EW_nitrifikation')   THEN v_missing := v_missing||'A201-10.A_EW_nitrifikation '; END IF;
  IF NOT EXISTS (SELECT 1 FROM fields WHERE worksheet_template_id=v_ws11 AND symbol='B_R_BSB')              THEN v_missing := v_missing||'A201-11.B_R_BSB '; END IF;
  IF NOT EXISTS (SELECT 1 FROM fields WHERE worksheet_template_id=v_ws11 AND symbol='t_R_belueftet')        THEN v_missing := v_missing||'A201-11.t_R_belueftet '; END IF;
  IF NOT EXISTS (SELECT 1 FROM fields WHERE worksheet_template_id=v_ws11 AND symbol='OV_C_BSB')             THEN v_missing := v_missing||'A201-11.OV_C_BSB '; END IF;
  IF NOT EXISTS (SELECT 1 FROM fields WHERE worksheet_template_id=v_ws12 AND symbol='t_R_nachklaer')        THEN v_missing := v_missing||'A201-12.t_R_nachklaer '; END IF;
  IF NOT EXISTS (SELECT 1 FROM fields WHERE worksheet_template_id=v_ws12 AND symbol='A_min_nachklaer')      THEN v_missing := v_missing||'A201-12.A_min_nachklaer '; END IF;
  IF v_missing <> '' THEN
    RAISE EXCEPTION 'DWA-A-201 ES-1: checked field(s) missing — %', v_missing;
  END IF;

  -- ---- verify the 12 ES-1 equation rows still exist (displayOnly targets) ---
  -- The neutralisation lives in equation-profiles.ts keyed by these UUIDs; if
  -- an equation id drifted the profile would be a dead key → fail loud here so
  -- code + data stay in lockstep.
  IF (SELECT count(*) FROM equations
        WHERE id IN (
          '48ef9e99-ffc6-4b51-a911-88fb8e40101d', -- F-01
          '792d1332-5ed4-4b16-a106-8132a1fa7bf7', -- F-03
          'e3c30a7d-c11e-4076-8f09-a0d4a590946e', -- F-04
          'ba340cbf-9420-410d-bfc9-d4380dde9a6e', -- F-06
          '2c9d5018-004f-4f67-b40b-dcc8898d3171', -- F-07
          '3f986494-9fae-4171-b602-ab106a8cd659', -- F-08
          'a69cfcaf-18a2-482e-a359-63848ffa00b9', -- F-10
          '2aa30964-75b6-4990-995e-58d16598fc2c', -- F-11
          'c34e9132-0c2f-404a-bc06-c2673770c761', -- F-12
          '74018e72-ea91-4a1e-bef9-2cb4f3782f8d', -- F-13
          '05bc3636-53d6-4518-aa00-2f40fce08d5a', -- F-15
          '4219cb5e-8ced-41b0-8eef-783e0d3fcfc5'  -- F-16
        )) <> 12 THEN
    RAISE EXCEPTION 'DWA-A-201 ES-1: expected 12 ES-1 equation rows for the displayOnly profiles, count drifted — reconcile equation-profiles.ts UUIDs before applying.';
  END IF;

  RAISE NOTICE 'DWA-A-201 ES-1 disposition verified: 12 ES-1 equations neutralised via displayOnly in equation-profiles.ts (code). NO new gates authored — enforcement already exists (CR-004 F-01 arith-RHS/acompare; CR-005 F-03/04/06; CR-007 F-11/12/13; CR-008 F-15/16 incl. h>=1.2 depth). F-10 descriptive → displayOnly only. FLAGGED for Alvaro: [FLAG-1] CR-006 broken double-IF-THEN + misplaced on A201-08 (A_EW_unbelueftet lives on A201-10) → re-home + split to P-6c; [FLAG-2] CR-007 misplaced on A201-08 (fields on A201-11) → re-home; [FLAG-3] F-14 equation `P_R between 1 and 3` dead syntax (gate CR-007 already correct). No data rows written — assert/verify only.';
END $$;
