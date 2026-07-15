-- ============================================================================
-- Migration: 20260708280000_dwa_a_102_2_es1_invtag_disposition.sql
-- Standard : DWA-A-102-2 / BWK-A 3-2 (Dezember 2020, korrigierte Fassung
--            Stand August 2022)
-- Source   : Desktop/Guidelines/DWA-A-102-2/DWA-A_102-2 (3).pdf
--            (100 S., Titel "Arbeitsblatt DWA-A 102-2/BWK-A 3-2 …
--             Emissionsbezogene Bewertungen und Regelungen"; DB-Version
--             "Dezember 2020 (korrigierte Fassung: Stand August 2022)"
--             → AUTHORITATIVE, richtige Norm/Ausgabe). Jeder Schwellenwert und
--             jedes Modalverb unten wurde RENDER-bestätigt (poppler, Opus 4.8,
--             DEEP-DWA-A-102-2.md; ergänzend pdftotext S. 34–35 §5.2.2.3,
--             S. 48–49 §7.3.2.2, S. 53–55 §7.3.4).
--
-- WRITTEN-NOT-APPLIED. READ-ONLY campaign. Do NOT commit. Do NOT apply to prod.
--
-- Apply    : node scripts/apply-migration.mjs scripts/migrations/20260708280000_dwa_a_102_2_es1_invtag_disposition.sql
--
-- ----------------------------------------------------------------------------
-- SCOPE — DWA-A-102-2, ZWEI Registerklassen:
--   PART A · ES-1  (Ungleichung-als-Produzent, Registerklasse S1/S7) — 8 Instanzen
--   PART B · inverted clause tag (Registerklasse S12)               — 8 Kandidaten
--
-- Diese Migration schreibt KEINE Datenzeilen. Sie ist rein assert/verify +
-- dokumentierend:
--   * PART A wird durch displayOnly:true in equation-profiles.ts neutralisiert
--     (CODE, im selben Commit) — hier nur UUID-/Feld-Asserts, damit Code+Daten
--     im Gleichschritt bleiben, und die Enforcement-Disposition dokumentiert.
--   * PART B ist eine Klassifikation (DECOY vs INTENDED). Für die als INTENDED
--     befundenen Felder erfolgt KEINE Aktion (reverse-Trap-6: der Scan-Flag ist
--     hier ein Falsch-Positiv). KEINE Feld-Löschung, KEIN destruktives Dedupe.
--     Etwaige DECOYs werden nur GEFLAGGT (Vorschlag, nicht ausgeführt).
--
-- WICHTIG — Abstimmung mit der vorherigen A-102-2-Migration 2803d00
--   (20260708240000_dwa_a_102_2_gate_enforcement.sql, WRITTEN-NOT-APPLIED):
--   2803d00 hat für das Symbol `m` bereits (a) Gl.22/23 output_symbol
--   m -> m_min_required retaggt und (b) REQ-24 von A1022-34 nach A1022-36
--   re-homed + Grammatik `m >= m_min_required` -> `m - m_min_required >= 0`.
--   Diese Migration RE-FIXT das NICHT. Für die ES-1-`m`-Instanzen (Gl.22/23)
--   setzt sie nur displayOnly (Code) und dokumentiert die Bindung. Für den
--   inverted-tag-Kandidaten `m_min_required` klassifiziert sie INTENDED (das
--   Feld ist der von 2803d00 aktivierte Produzenten-Output + REQ-24-Operand).
--   Da Prod (2803d00 noch nicht angewendet) `m_min_required` noch als
--   ungeproduziertes, nur von REQ-24 referenziertes Feld zeigt, sind die
--   Asserts unten SO formuliert, dass sie in BEIDEN Zuständen (vor/nach 2803d00)
--   bestehen (Existenz-Asserts, keine output_symbol-Annahme).
--
-- ============================================================================
-- PART A — ES-1 (8 Instanzen). MODALVERB-BEFUND + Disposition je Instanz.
-- ----------------------------------------------------------------------------
--   Der Defekt: output_symbol = die geprüfte Größe selbst → jede Ungleichungs-
--   „Gleichung" ist ein zweiter Produzent ihres eigenen Symbols → der
--   Multi-Producer-Collision-Guard der Engine kann den echten Produzenten-Wert
--   bzw. die Ingenieur-Eingabe BLANKEN (M-205- / A-201- / FLL-GAR-22:2b-Bug).
--   Neutralisierung: displayOnly:true (equation-profiles.ts) — stoppt den
--   Write-back; die Ungleichung rendert als Review-/Bemessungshilfe.
--
--   Enforcement wird HIER NUR AUTHORED, wo (i) die Quelle ein Modalverb
--   durchsetzt UND (ii) noch kein durchsetzendes Gate existiert UND (iii) die
--   Bedingung faithful in evaluate.ts-Grammatik ausdrückbar ist. Ergebnis:
--   0 neue Gates (Begründung je Instanz unten) — identisch zur A-201-Bilanz.
--
--   [A1] Q_M   B.5  (A1022-08, §B.3.2.3.3)   eq 44d37420-9559-4b89-a305-e87cf516e488
--     Formel: `Sum(Q_M_i) <= Q_M`. Plausibilitäts-/Massenbilanz-Check der
--     Teilgebiets-Mischwasserabflüsse. Echter Produzent von Q_M = B.4
--     (`f_S_QM·Q_S_aM+Q_F`, A1022-08). Quelle S. 49/§B.3.2.3.3: getrennte
--     Teilgebietsbetrachtung „wird … empfohlen" (soll, kein muss).
--     → displayOnly. KEIN Gate: Formel enthält `Sum(...)` → in evaluate.ts
--       nicht faithful ausdrückbar (kein SUM) → NR, never-invent.
--
--   [A2..A4] e_0  Gl.15/17/18 (A1022-28, §7.3.2.2)
--     eq a5bd51eb-… (15), 46fb523a-… (17), 008a7bc7-… (18). Alle drei sind
--     `e_0 <= …`-Obergrenzen (algebraische Umstellungen der Frachtbedingung
--     Gl.14 `B_R_e <= B_R_e_zul`). Echter Produzent von e_0 = Gl.13
--     (`V_e_MWUe/V_R_aM·100`). Gl.18 trägt zusätzlich ein malformiertes
--     `… ·100 = 3700/(C_e_CSB−70)` (Doppel-Gleichheit).
--     → displayOnly ×3. KEIN Gate: die echte Emissions-Durchsetzung ist der
--       AFS63-Nachweis (bestehendes REQ-22 `eta_ges>=eta_erf`, DEEP-Audit
--       „enforceable block gates"); ein e_0-Gate hier wäre Feld-gegen-Feld-
--       Division (nicht gegen numerischen RHS ausdrückbar) und ein Nachweis-
--       Duplikat → never-invent / do-not-duplicate-enforcing-gate.
--
--   [A5..A6] Q_Dr  Gl.26/28 (A1022-33, §7.3.4.5)
--     eq 29c268ef-… (26 `Q_Dr >= Q_T_aM+Q_R_krit+Sum(Q_Dr_i)`),
--        0708808f-… (28 `Q_Dr >= (m_Rue+1)*Q_T_aM`). BEIDE sind Minimum-
--     Ungleichungen — KEIN Produzent von Q_Dr existiert (DEEP C9). Quelle
--     §7.3.4.5 druckt Q_Dr als Drossel-Bemessungsminimum, KEIN hartes
--     „muss"-Einzel-Gate (A-102-2 mid-consolidation → konservativ).
--     → displayOnly ×2. KEIN Gate: Gl.26 enthält `Sum(...)` (kein evaluate.ts-
--       Ausdruck); Gl.28 wäre als `Q_Dr - (m_Rue + 1) * Q_T_aM >= 0`
--       grammatikalisch ausdrückbar, aber ohne gedrucktes Modalverb-Mandat
--       wäre das eine erfundene Anforderung → never-invent; FÜR ALVARO
--       geflaggt, falls Drossel-Minimum-Durchsetzung gewünscht (siehe FLAGS).
--
--   [A7..A8] m  Gl.22/23 (A1022-36, §7.3.4.2)
--     eq d2d1bf8b-… (22 `m >= 7 if C_T_aM_CSB <= 600`),
--        70ebb0c4-… (23 `m >= (C_T_aM_CSB-180)/60 if C_T_aM_CSB > 600`).
--     Mindestmischverhältnis (Bemessungshilfe), NICHT Produzent des mittleren m
--     (das ist B.13/Gl.24). Quelle §7.3.4.2 S. 53: „Für jedes Regenüberlaufbecken
--     ist zu überprüfen, ob … ein Mindestmischverhältnis m nach Gl. (22)
--     eingehalten wird." (muss-äquivalent).
--     → displayOnly ×2 (Code). ENFORCEMENT + RETAG BEREITS in 2803d00
--       (Gl.22/23 -> m_min_required; REQ-24 re-homed A1022-36 +
--       `m - m_min_required >= 0`). HIER KEIN Re-Fix (Brief-Vorgabe). Piecewise
--       `if` → ENGINE-blocked (E1) für Auto-Compute; das Gate greift dennoch.
--
-- ============================================================================
-- PART B — inverted clause tag (8 Kandidaten). KLASSIFIKATION (source-verified).
-- ----------------------------------------------------------------------------
--   DB-Scan (read-only, this run): KEINER der Kandidaten wird von irgendeiner
--   Gleichung (formula/input_symbols) ODER von irgendeinem Gate (condition)
--   konsumiert oder produziert — es sind ORPHAN-Felder (außer m_min_required,
--   das REQ-24 konsumiert). Prüfung je Kandidat gegen die zitierte Klausel:
--
--   [B1..B3] B_R_a_AFS63_I / _II / _III  (A1022-10, clause "Gl. 3")
--            vs Input B_R_a_AFS63 (A1022-10, §5.2.3.2)
--     → INTENDED (kein Defekt). Render-confirmed S. 34–35 §5.2.2.3: die drei
--       BELASTUNGSKATEGORIEN I / II / III mit fixen Rechenwerten
--       bR,a,AFS63 = 280 / 530 / 760 kg/(ha·a). `_I/_II/_III` sind die drei
--       KATEGORIE-KOMPONENTEN-Lasten (Gl.3 `B_R_a_AFS63_i = A_b_a_i·b_R_a_AFS63_i`
--       je Kategorie), NICHT ein Duplikat der Aggregat-Größe B_R_a_AFS63
--       (Gl.4 = Σ). Kein Ingenieur würde „fälschlich den falschen füllen" —
--       Komponenten vs Summe sind semantisch verschieden. reverse-Trap-6:
--       Scan-Flag ist Falsch-Positiv. KEINE Aktion.
--
--   [B4] C_e_CSB_ref  (A1022-28, clause "§5, Gl.17/18")
--        vs Input C_e (A1022-28, §7.3.2.2)  [Twin genauer: C_e_CSB, A1022-27]
--     → INTENDED (kein Defekt). Gl.17/18 (§7.3.2.2) verwenden C_e_CSB als
--       KONZENTRATIONS-Referenz in der e_0-Obergrenze (Referenzwerte 107/70).
--       `C_e_CSB_ref` ist ein Referenz-/Anzeige-Companion neben der Eingabe,
--       NICHT ein Zweit-Feld für C_e (mittlere Ablaufkonzentration, andere
--       Größe/Einheit). Suffix `_ref` = berechnete Referenz. KEINE Aktion.
--
--   [B5] m_min_required  (A1022-36, clause "Gl. 22/23")  vs m (A1022-23/33/36)
--     → INTENDED (kein Defekt) — und Kern der 2803d00-Arbeit. m_min_required ist
--       das MINDESTmischverhältnis (Gl.22/23), semantisch verschieden vom
--       MITTLEREN m (B.13/Gl.24). Es wird von REQ-24 konsumiert (Prod:
--       `m >= m_min_required` auf A1022-34; nach 2803d00: `m - m_min_required >= 0`
--       auf A1022-36) und nach 2803d00 von Gl.22/23 produziert. Kein Decoy —
--       ein absichtlich getrenntes Anforderungsfeld. KEINE Aktion (2803d00 tie).
--
--   [B6] Q_Dr_minimum  (A1022-33, clause "Gl. 26")  vs Q_Dr (A1022-33)
--     → INTENDED (kein Defekt). Gl.26/28 sind Q_Dr-MINIMA (siehe PART A A5/A6);
--       `Q_Dr_minimum` ist das dafür vorgesehene Minimum-Referenzfeld, das den
--       gedruckten `Q_Dr >= …`-Wert trägt — semantisch verschieden vom
--       ausgelegten/gewählten Q_Dr. Suffix `_minimum` = berechnete Untergrenze.
--       KEINE Aktion. (Zugehörige Durchsetzung: siehe FLAG-2 unten.)
--
--   [B7] r_krit_calc  (A1022-33, clause "Gl. 25a/b")  vs r_krit (A1022-07/33)
--     → INTENDED (kein Defekt). Gl.25a/b (§7.3.4.5) ist die t_f-abhängige
--       PIECEWISE-Berechnung von r_krit (`15·120/(t_f+120)` bzw. `7,5`).
--       `r_krit_calc` ist der berechnete Companion neben der maßgebenden
--       Eingabe r_krit (A1022-07, typ. 15 l/(s·ha)). Suffix `_calc` = berechnete
--       Alternative/Kontrolle. Kein Decoy. KEINE Aktion.
--
--   [B8] V_R_aM_ref  (A1022-28, clause "§5, Gl.14-16")  vs V_R_aM (A1022-05/28)
--     → INTENDED (kein Defekt). Gl.14–16 (§7.3.2.2) verwenden V_R_aM
--       (Referenzvolumen fiktives Zentralbecken) in der Fracht-/e_0-Bilanz.
--       `V_R_aM_ref` ist der Referenz-Companion neben der Eingabe V_R_aM
--       (A1022-05, aus Gl.2 `h_Na·A_b_a·psi_aM·10`). Suffix `_ref` = Referenz.
--       Kein Decoy. KEINE Aktion.
--
--   FAZIT PART B: 8/8 = INTENDED reference/scenario/companion fields.
--   0 TRUE-DECOY. Der Scan-Flag ist durchweg reverse-Trap-6 (Falsch-Positiv):
--   `_I/_II/_III` = Belastungskategorie-Komponenten; `_ref`/`_calc`/`_minimum` =
--   berechnete Referenz-Companions; `m_min_required` = 2803d00-Anforderungsfeld.
--   KEIN destruktives Dedupe, KEINE Feld-Löschung, KEIN Re-Tag ausgeführt.
--
-- ----------------------------------------------------------------------------
-- FLAGS FÜR ALVARO (Vorschläge — NICHT ausgeführt):
--   [FLAG-1] Die 8 inverted-tag-Felder (B_R_a_AFS63_I/II/III, C_e_CSB_ref,
--     m_min_required, Q_Dr_minimum, r_krit_calc, V_R_aM_ref) sind allesamt als
--     INTENDED befundene ORPHANS: sie haben leere `consumer_worksheets` und
--     werden (außer m_min_required via REQ-24) von keiner Gleichung/Kein Gate
--     konsumiert. Das ist KEIN ES-1/S12-Defekt, aber eine SEPARATE „nicht
--     verdrahtete Referenz-Companion"-Notiz für die SEV-4-Struktur-Runde:
--     falls diese Referenzfelder tatsächlich angezeigt/berechnet werden sollen,
--     müssten sie einen Produzenten (Gl.3 je Kategorie; Gl.25a/b für r_krit_calc;
--     Gl.17/18 für C_e_CSB_ref; Gl.14-16 für V_R_aM_ref; Gl.26 für Q_Dr_minimum)
--     bekommen. KEINE Löschung/Konsolidierung — Companion-Felder behalten.
--   [FLAG-2] Drossel-Minimum Q_Dr (Gl.28) wäre als
--     `Q_Dr - (m_Rue + 1) * Q_T_aM >= 0` grammatikalisch durchsetzbar; die
--     Quelle druckt aber kein hartes „muss"-Gate → hier NICHT authored
--     (never-invent). Falls gewünscht: als block/warn-Gate auf A1022-33
--     ratifizieren (mit Q_Dr_minimum als Referenzträger).
--   [FLAG-3] m-Retag/REQ-24 (Gl.22/23 -> m_min_required) ist die Arbeit von
--     2803d00 (WRITTEN-NOT-APPLIED). Reihenfolge: 2803d00 VOR dieser Migration
--     bzw. dem Code anwenden ist nicht nötig — displayOnly (Code) ist in beiden
--     DB-Zuständen korrekt und kollidiert nicht mit 2803d00.
--
-- P-13: DWA-A-102-2 hat für diese Größen KEINE regulation_tables, die von einem
--   Gate gelesen werden — nicht getriggert. (Tab.4 AFS63-Rechenwerte /
--   Tab.A.1 Flächenkategorien sind separat und hier unangetastet.)
--
-- Rollback: Diese Migration schreibt KEINE Datenzeilen (assert/verify + doc).
--   Kein Rollback nötig. (equation-profiles.ts: die 8 A-102-2-displayOnly-Blöcke
--   per Code-Revert entfernen.)
-- ============================================================================

DO $$
DECLARE
  v_standard_id uuid;
  v_ws08 uuid;  -- A1022-08  Q_M (B.4 producer, B.5 check)
  v_ws10 uuid;  -- A1022-10  B_R_a_AFS63 (+ _I/_II/_III)
  v_ws27 uuid;  -- A1022-27  C_e_CSB
  v_ws28 uuid;  -- A1022-28  e_0 (Gl.13/15/17/18), C_e, C_e_CSB_ref, V_R_aM_ref
  v_ws33 uuid;  -- A1022-33  Q_Dr (Gl.26/28), r_krit_calc, Q_Dr_minimum
  v_ws36 uuid;  -- A1022-36  m (Gl.22/23), m_min_required
  v_missing text;
BEGIN
  -- ---- resolve standard -----------------------------------------------------
  SELECT id INTO v_standard_id FROM standards WHERE code = 'DWA-A-102-2';
  IF v_standard_id IS NULL THEN
    RAISE EXCEPTION 'Standard DWA-A-102-2 not found';
  END IF;

  -- ---- resolve the worksheets involved -------------------------------------
  SELECT id INTO v_ws08 FROM worksheet_templates WHERE standard_id = v_standard_id AND code = 'A1022-08';
  SELECT id INTO v_ws10 FROM worksheet_templates WHERE standard_id = v_standard_id AND code = 'A1022-10';
  SELECT id INTO v_ws27 FROM worksheet_templates WHERE standard_id = v_standard_id AND code = 'A1022-27';
  SELECT id INTO v_ws28 FROM worksheet_templates WHERE standard_id = v_standard_id AND code = 'A1022-28';
  SELECT id INTO v_ws33 FROM worksheet_templates WHERE standard_id = v_standard_id AND code = 'A1022-33';
  SELECT id INTO v_ws36 FROM worksheet_templates WHERE standard_id = v_standard_id AND code = 'A1022-36';
  IF v_ws08 IS NULL OR v_ws10 IS NULL OR v_ws27 IS NULL OR v_ws28 IS NULL
     OR v_ws33 IS NULL OR v_ws36 IS NULL THEN
    RAISE EXCEPTION 'DWA-A-102-2 worksheet(s) missing (A1022-08=%, -10=%, -27=%, -28=%, -33=%, -36=%) — disposition cannot verify',
      v_ws08, v_ws10, v_ws27, v_ws28, v_ws33, v_ws36;
  END IF;

  -- ====== PART A — verify the 8 ES-1 equation rows (displayOnly targets) =====
  -- The neutralisation lives in equation-profiles.ts keyed by these UUIDs; if an
  -- equation id drifted, the profile would be a dead key → fail loud so code +
  -- data stay in lockstep.
  IF (SELECT count(*) FROM equations
        WHERE id IN (
          '44d37420-9559-4b89-a305-e87cf516e488', -- A1  Q_M   B.5
          'a5bd51eb-1d34-4970-b633-68f8935a8ce9', -- A2  e_0   Gl.15
          '46fb523a-2e8f-4f8e-b61b-ff4888a76ea4', -- A3  e_0   Gl.17
          '008a7bc7-43f2-4568-aa55-2f8431001c37', -- A4  e_0   Gl.18
          '29c268ef-33c1-4b28-8269-c06d8465729f', -- A5  Q_Dr  Gl.26
          '0708808f-84f8-4b82-82f0-a8dda7977bee', -- A6  Q_Dr  Gl.28
          'd2d1bf8b-5e93-4ad8-963a-d297c89b2d14', -- A7  m     Gl.22
          '70ebb0c4-2db9-4405-85ef-da863172666c'  -- A8  m     Gl.23
        )) <> 8 THEN
    RAISE EXCEPTION 'DWA-A-102-2 ES-1: expected 8 ES-1 equation rows for the displayOnly profiles, count drifted — reconcile equation-profiles.ts UUIDs before applying.';
  END IF;

  -- ---- assert the ES-1 checked symbols still exist on their home worksheets --
  v_missing := '';
  IF NOT EXISTS (SELECT 1 FROM fields WHERE worksheet_template_id=v_ws28 AND symbol='e_0')  THEN v_missing := v_missing||'A1022-28.e_0 '; END IF;
  IF NOT EXISTS (SELECT 1 FROM fields WHERE worksheet_template_id=v_ws33 AND symbol='Q_Dr') THEN v_missing := v_missing||'A1022-33.Q_Dr '; END IF;
  IF NOT EXISTS (SELECT 1 FROM fields WHERE worksheet_template_id=v_ws36 AND symbol='m')    THEN v_missing := v_missing||'A1022-36.m '; END IF;
  -- Q_M lives on A1022-08 (checked by B.5, produced by B.4).
  IF NOT EXISTS (SELECT 1 FROM equations WHERE worksheet_template_id=v_ws08 AND output_symbol='Q_M' AND equation_number='B.4') THEN v_missing := v_missing||'A1022-08.Q_M(B.4-producer) '; END IF;
  IF v_missing <> '' THEN
    RAISE EXCEPTION 'DWA-A-102-2 ES-1: checked symbol/producer(s) missing — %', v_missing;
  END IF;

  -- ====== PART B — verify the 8 inverted-tag candidate fields still exist ====
  -- Classification is INTENDED for all 8 → NO write. These asserts only confirm
  -- the fields the report classifies are present (so the disposition is honest
  -- against the live schema). NO deletion, NO re-tag, NO dedupe performed.
  v_missing := '';
  IF NOT EXISTS (SELECT 1 FROM fields WHERE worksheet_template_id=v_ws10 AND symbol='B_R_a_AFS63_I')   THEN v_missing := v_missing||'A1022-10.B_R_a_AFS63_I '; END IF;
  IF NOT EXISTS (SELECT 1 FROM fields WHERE worksheet_template_id=v_ws10 AND symbol='B_R_a_AFS63_II')  THEN v_missing := v_missing||'A1022-10.B_R_a_AFS63_II '; END IF;
  IF NOT EXISTS (SELECT 1 FROM fields WHERE worksheet_template_id=v_ws10 AND symbol='B_R_a_AFS63_III') THEN v_missing := v_missing||'A1022-10.B_R_a_AFS63_III '; END IF;
  IF NOT EXISTS (SELECT 1 FROM fields WHERE worksheet_template_id=v_ws28 AND symbol='C_e_CSB_ref')     THEN v_missing := v_missing||'A1022-28.C_e_CSB_ref '; END IF;
  IF NOT EXISTS (SELECT 1 FROM fields WHERE worksheet_template_id=v_ws36 AND symbol='m_min_required')  THEN v_missing := v_missing||'A1022-36.m_min_required '; END IF;
  IF NOT EXISTS (SELECT 1 FROM fields WHERE worksheet_template_id=v_ws33 AND symbol='Q_Dr_minimum')    THEN v_missing := v_missing||'A1022-33.Q_Dr_minimum '; END IF;
  IF NOT EXISTS (SELECT 1 FROM fields WHERE worksheet_template_id=v_ws33 AND symbol='r_krit_calc')     THEN v_missing := v_missing||'A1022-33.r_krit_calc '; END IF;
  IF NOT EXISTS (SELECT 1 FROM fields WHERE worksheet_template_id=v_ws28 AND symbol='V_R_aM_ref')      THEN v_missing := v_missing||'A1022-28.V_R_aM_ref '; END IF;
  IF v_missing <> '' THEN
    RAISE EXCEPTION 'DWA-A-102-2 inverted-tag: classified field(s) missing (schema drift) — %', v_missing;
  END IF;

  RAISE NOTICE 'DWA-A-102-2 ES-1 + inverted-tag disposition verified. PART A: 8 ES-1 equations (Q_M B.5; e_0 Gl.15/17/18; Q_Dr Gl.26/28; m Gl.22/23) neutralised via displayOnly in equation-profiles.ts (code). 0 new gates authored — Q_M/Q_Dr Gl.26 carry Sum() (no evaluate.ts SUM → NR); e_0 enforcement is the existing AFS63 proof REQ-22 (no field-vs-field duplicate); m retag+REQ-24 already handled by 2803d00 (no re-fix). PART B: 8/8 inverted-tag candidates classified INTENDED (reference/scenario/companion) — 0 TRUE-DECOY, reverse-Trap-6; NO field deleted/re-tagged/deduped. FLAGGED for Alvaro: [FLAG-1] the 8 companion fields are unwired orphans (SEV-4 note, keep — do not delete); [FLAG-2] Q_Dr Gl.28 enforceable as `Q_Dr - (m_Rue+1)*Q_T_aM >= 0` but no printed muss → not invented; [FLAG-3] m/REQ-24 tie is 2803d00. No data rows written — assert/verify only.';
END $$;
