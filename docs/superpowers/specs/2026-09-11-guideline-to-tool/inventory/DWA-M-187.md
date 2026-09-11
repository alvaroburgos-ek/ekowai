# DWA-M-187 — Surface-inventory pattern inventory

## 0. Sources used
- Transcript: `C:\Users\Ekowai\Desktop\Guidelines\DWA-M-187\DWA-M_187_GD.md` (German, LaTeX; copy in `Desktop\Format data\DWA 187\`).
- Prod dump: `scratchpad/std/DWA-M-187.json` — **25 worksheets, 139 fields** (7 worksheets empty), 4 equations (2 unique, duplicated on M187-09/M187-22), 21 requirements.
- Vault: `encoding-audit-2026-07-01/DEEP-DWA-M-187.md`, `form-guides/DWA-M-187.md`.
- Note: the Merkblatt has **no numbered design equations**; Tabelle 1/2 are definitions/symbols, Tabelle 3 is a qualitative variant comparison, Tabelle 4/5 are Klimakennung criteria. Almost all "values" are per-variant text limits.

## 1. Table-lookup candidates

| worksheet | selector field | dependent fields filled | guideline table/clause | override allowed? (quote) | table in transcript? |
|---|---|---|---|---|---|
| M187-01 → all | `sonderanwendung` (enum, 5 values present) | visibility of M187-05..10 (P), 11..15 (Spurenstoffe), 16..18 (Mikroorganismen), 19..20 (org. Belastung), 21..22 (Klein-RBF); per-application `h_FK`, `q_Dr_RBF` | §1, §5.x | n/a (branch) | text |
| M187-06/05 | `verfahrensvariante_p` (enum a/b/c) | a: `beta_wert` ≥4, `S_PO4P_aM` 0,5, `pufferschicht_carbonatbrechsand` ≈5 cm; b: `Fe_massenanteil` 7, `Fe_gehalt` >35, `p_grund_beladung` <0,2, `feinmassenanteil` ≤5, `fallhoehe_einbau` ≤1,0, `h_FK` ≥1,00; c: `EBCT` ≥15, `v_filter_aufstrom` <5,0, `v_filter_abstrom` <2, `h_FK_SS` 1,25, `anzahl_sorptionsstufen` ≥2 | §5.1.3.1 a/b/c, §5.1.3.2, Tabelle 3 | a: "kann … mit einem Beta-Wert von ≥ 4 angesetzt werden. Diese Dosiermenge ist im laufenden Betrieb … zu optimieren." b: "bei einem Eisenhydroxidmassenanteil von 7 % gute Ergebnisse … Liegen besondere Anforderungen … vor, ist es empfehlenswert, den einzumischenden Eisenhydroxidanteil über die mittlere Jahreszulauffracht rechnerisch zu bestimmen." → override by calculation | Tabelle 3 (qualitative) yes; numeric limits are text — quoted below |
| M187-11 → 12..15 | `verfahrensvariante_spurenstoffe` (enum a–d) | a: `q_Dr_RBF` = 0,01; b: `h_FK` 1 m, `q_Dr_RBF` ≤0,03, GAK layers (Bild 3); c: `q_Dr_RBF` ≤0,03, `beschickungsdauer_segment` ≤24, `trockenzeit_nach_vollbeschickung` 24, `h_FK` ≥1, segment retention = `Q_T_d_aM`; d: none | §5.2.3.1 a–d, Bild 3 | d: "können bisher keine allgemein gültigen Bemessungsvorgaben empfohlen werden" | Bild 3 layer table yes — below |
| M187-16/18 | `sonderanwendung == mikroorganismen` + `uv_eingesetzt` | `q_Dr_RBF` = 0,01, `h_FK` ≥1,0, `UV_dosis` ≥200 | §5.3.3.1, §5.3.3.5 | "sollte … eine Mindestdosis von 200 J/m² nicht unterschritten werden" (sollte) | text |
| M187-19/20 | `sonderanwendung == organische_belastung` | `q_krit` 60, `q_A_max` 4, `V_vorstufe_min` 50, `B_CSB` ≤20, `A_F_pro_AEb` ≥750 (only if no data), `foerderleistung_beschickung` ≥6, `beschickung_pro_ereignis` 20, `austritts_dichte` ≤1, `anzahl_teilfilter` 4·n, `wirkungsgrad_hydraulisch` 100 | §5.4.3, §5.4.4, §5.4.2.2.2 | "Liegen keine Daten vor, muss die Gesamtfilterfläche mindestens 750 m²/ha A_E,b betragen." → data override; "Es wird ein Mindestvolumen von 50 m³ empfohlen." (empfohlen) | text |
| M187-21/22 | `sonderanwendung == klein_rbf` + `carbonatschicht_vorhanden` | `A_F_anteil_Aba` 1,0 %, `h_RR` ≥0,2, `h_RBF` ≥0,6, `h_Draen` ≥0,1, `deckschicht_staerke` 0,05, `CaCO3_massenanteil_filter` ≥20, `CaCO3_massenanteil_carbo` 80, `h_FK_CaCO3` ≥0,10, `h_FK` (0,25 / 0,2 with carbonate layer), `draen_dn` ≥50, `eta_AFS63` ≥95 | §5.5.3.2.2, §5.5.4 | "sind … auch geringere spezifische Filterflächen von A_F < 1,0 % … möglich" with b_krit proof → override via Gl.2 | text |
| M187-23 | Klimakennung KS/KA (no field) | — | Tabelle 4/5 §6 | informative | yes (not quoted, no field target) |

Missing-field gaps: no field for "3 Segmente" count (Variante c Spurenstoffe); `anzahl_teilfilter` exists but no rotation schedule (3 in Betrieb / 1 Pause, wöchentlich); no Klimakennung fields (Tabelle 4/5); no selector for "Daten vorhanden?" that switches `A_F_pro_AEb` 750 vs `B_CSB` ≤20 sizing.

Verbatim (file `DWA-M_187_GD.md`):
```
§5.1.3.1 a): "Basierend auf einer mittleren PO4-Zulaufkonzentration von S_PO4-P,aM = 0,5 mg/l kann die Menge des Fällmittels (Eisen-III-Salz) mit einem Beta-Wert von ≥ 4 angesetzt werden."
§5.1.3.1 c): "Filterkontaktzeiten (EBCT) ≥ 15 min. und maximale Filtergeschwindigkeiten < 5,0 m/h angesetzt werden. Das entspricht einer Mindesthöhe des Filterkörpers von 1,25 m. Im Abstrombetrieb sollten die Filtergeschwindigkeiten auf < 2 m/h reduziert werden." / "Reihenschaltung von mindestens zwei Sorptionsstufen empfohlen"
§5.1.3.2: "bei einem Eisenhydroxidmassenanteil von 7 % gute Ergebnisse … Für das Eisenhydroxid ist ein Eisengehalt von Fe > 35 % und eine P-Grundbeladung von < 0,2 g/kg im Zuschlagstoff einzuhalten."
§5.2.3.1: "Zu a) … Begrenzung der Drosselabflussspende q_Dr,RBF auf 0,01 l/(s·m²)" / "Zu b) … Filterschichtstärke von 1 m … q_Dr,RBF ≤ 0,03 l/(s·m²)" / "Zu c) … q_Dr,RBF ≤ 0,03 … Beschickungsdauer eines Segments sollte 24 h nicht überschreiten … Trockenzeit von 24 h … Aufteilung auf drei Segmente … Retentionsvolumen eines Segments ist auf den mittleren täglichen Trockenwetterzufluss der Kläranlage (Q_T,d,aM) zu dimensionieren … h_FK ≥ 1 m"
Bild 3 (Filteraufbau Spurenstoffe b/c):
 10 cm | Filtersand / Meliorationsschicht GAK-Volumenanteil: 10 % bis 20 % | 20 % CaCO3-Massenanteil dem gesamten Filtersand beimischen
 60 cm | Filtersand                                                    |
 30 cm | Filtersand GAK-Volumenanteil: 30 % bis 40 %                   |
 25 cm | Dränagekies
§5.3.3.1: "q_Dr,RBF = 0,01 l/(s·m²) begrenzt ist. Das Drosselorgan kann ungeregelt ausgeführt werden"
§5.3.3.5: "Mindestdosis von 200 J/m² nicht unterschritten werden"
§5.4.3: "Die Bemessung sollte für q_krit = 60 l/(s·ha) erfolgen … maximale Oberflächenbeschickung von q_A,max = 4 m/h … Mindestvolumen von 50 m³ empfohlen" / "CSB-Fracht ≤ 20 g CSB/(m²·d) bezogen auf die Gesamtfilterfläche … Liegen keine Daten vor, muss die Gesamtfilterfläche mindestens 750 m²/ha A_E,b betragen." / "vier (oder ein Vielfaches von vier) gleich große Teilfilterbecken … drei gleichzeitig in Betrieb und eins hat Betriebspause. Nach einer Woche Betrieb wird gewechselt" / "Förderleistung von mindestens 6 l/(m²·min) … Pro Beschickungsereignis sollten 20 l/m² … gefördert werden"
§5.4.4: "beschickte Filterfläche sollte ≤ 1 m²/Austrittsöffnung betragen"
§5.4.2.2.2: "Bei häufiger auftretenden CSB-Konzentrationen von > 3.000 mg/l" (Stoffstromtrennung; prod vq)
§5.5.4: "A_F = 1,0 % der angeschlossenen befestigten Fläche A_b,a. Dies entspricht A_F = 100 m²/ha" / "b_krit = 7 kg/(m²·a) gemäß Arbeitsblatt DWA-A 178:2019 auch geringere spezifische Filterflächen von A_F < 1,0 % … möglich"
§5.5.3.2.2: "Einbautiefe von lediglich h_RBF ≥ 0,6 m möglich" / "Carbonatschicht mit einer Schichtstärke h_FK,CaCO3 ≥ 0,10 m" / "Dränage muss mindestens in DN 50 ungedrosselt" / "5 cm starken Schicht aus … Material (2 mm bis 8 mm)" / "starke Wurzelbildner wie Gehölze oder Schilf" nicht geeignet
Tabelle 3 (P-Varianten, qualitative): Zugabe Sorptions-/Fällmittel: a) kontinuierlich | b) einmalig | c) periodisch ; Wiederverwendung Phosphor: a) nicht möglich | b) nicht möglich | c) möglich ; Erfahrungen: a) halbtechnisch | b) langjährige großtechnische | c) halbtechnisch
```

## 2. Repeatable-group candidates

| worksheet | the thing | member fields | currently modelled | aggregation + consumers |
|---|---|---|---|---|
| M187-14 | **Filtersegment** (Spurenstoffe c: ≥3 hydraulisch entkoppelte Segmente, each with retention volume, Beschickungstag) | segment volume (= Q_T_d_aM·1 d), `beschickungsdauer_segment`, `trockenzeit_nach_vollbeschickung` | scalars, no count | count ≥3; Σ segment areas = A_F |
| M187-20 | **Teilfilterbecken** (4·n, 3 active + 1 resting, weekly rotation) | `anzahl_teilfilter`, area per Teilfilter, in-operation area | count field only | in-operation area = 3/4 of total → `B_CSB` check on "jeweils beschickte Filterfläche"; `foerderleistung_beschickung` per active area |
| M187-09 | **Sorptionsstufe in Reihe** (≥2) | `anzahl_sorptionsstufen`, per-stage EBCT, h_FK_SS, v_filter | count + single scalars | Σ EBCT; min per stage |
| M187-13/06 | **Filterschicht** (Bild 3: 10/60/30/25 cm with GAK % / CaCO3 %) | `GAK_volumenanteil_oben`, `GAK_volumenanteil_unten`, `CaCO3_massenanteil_GAK`, thicknesses (no fields) | 3 scalars | Σ thickness = h_FK (1 m + 25 cm drainage) |
| M187-21/22 | **Klein-RBF Einzelelement** (modular, several per catchment / Verbundsystem) | `A_b_a` per element, `A_F` (≥1 m² je Einzelelement), `h_RR`, `h_RBF`, `h_Draen` | single element | Σ A_F, Σ A_b_a; per-element A_F ≥1,0 m² |
| M187-16 | **Indikatororganismus** measurement (E. coli, Enterokokken, Coliphagen; KBE/MPN/PBE) | `KBE`, `MPN`, `PBE`, `logstufen_rueckhalt` | 3 unit-specific scalars | per organism log-removal; frachtbezogen (§5.3.4) |
| M187-19 | **Betriebsfläche / Lagerfläche** streams (Verkehrsfläche vs Sickerwasser) | `CSB_konzentration`, `sickerwasser_in_rbf` | scalars | max CSB per stream → separation rule |

## 3. Conditional dependencies

| worksheet | driver | affected | rule + quote | encoded? |
|---|---|---|---|---|
| M187-01 | `sonderanwendung` | which of 5 branches (M187-05..22) is visible; `h_FK` min (1,00 / 1 / 1,0 / 0,25) and `q_Dr_RBF` (0,01 / ≤0,03) | prod desc "Variantenabhängig (P-Rückhalt b: >= 1,00 m; Spurenstoffe c: >= 1 m; Mikroorganismen: >= 1,0 m; Klein-RBF: >= 0,25 m bzw. 0,2 m mit Carbonatschicht)" | REQ-01 only; REQ-02 (h_FK ≥1.0), REQ-03 (q ≤0.03), REQ-04 (q == 0.01) fire **unconditionally and contradict each other** |
| M187-05/06 | `verfahrensvariante_p` | a-fields vs b-fields vs c-fields | §5.1.3.1 a/b/c | REQ-02-2 (beta ≥4) unguarded |
| M187-11 | `verfahrensvariante_spurenstoffe` | a: q=0,01; b/c: q ≤0,03 + h_FK ≥1 + Bild 3; c: segments; d: nothing | §5.2.3.1 | REQ-03 unguarded |
| M187-14 | variante c | segment retention = `Q_T_d_aM` (l/s → m³/d) | "Retentionsvolumen eines Segments ist auf den mittleren täglichen Trockenwetterzufluss … zu dimensionieren" | nothing (no equation) |
| M187-18 | `uv_eingesetzt == ja` | `UV_dosis` ≥200 visible/required | §5.3.3.5 | REQ-04 mentions "optional" but no IF |
| M187-20 | data availability | `B_CSB` ≤20 (with data) vs `A_F_pro_AEb` ≥750 (no data) | "Liegen keine Daten vor, muss …" | REQ-05 requires **both** simultaneously |
| M187-19 | `CSB_konzentration > 3000` | Stoffstromtrennung; `sickerwasser_in_rbf` must be false | "Das Sickerwasser ist … zu hoch belastet und darf daher nicht in die RBFA eingeleitet werden." | `CSB_grenze_trennung` typed as a field (constant) |
| M187-21 | `carbonatschicht_vorhanden == ja` | `h_FK` min 0,2 instead of 0,25; `h_FK_CaCO3` ≥0,10, `CaCO3_massenanteil_carbo` visible | "Alternativ zur Melioration … Carbonatschicht … h_FK,CaCO3 ≥ 0,10 m" | REQ-06 text mentions, condition doesn't branch |
| M187-22 | `A_F_anteil_Aba < 1,0` | Gl.2 proof required (b_R_a, b_krit) | §5.5.4 quote above | Gl.2 present; REQ-06 forces `== 1.0` (blocks the allowed override) |
| M187-21 | `filtervegetation IN {gehoelze, schilf}` | not permitted | "Nicht geeignet sind … Gehölze oder Schilf." | nothing |
| M187-21 | `dauerhafter_teileinstau` | must be false | "Ein dauerhafter Teileinstau … ist nicht zulässig." | nothing |
| M187-08/20 | `betriebsmodus` | must be vollstrom for org. Belastung | "muss der RBF auf eine Vollstrombehandlung mit 100 % hydraulischem Wirkungsgrad ausgelegt werden" | `wirkungsgrad_hydraulisch == 100` typed |

## 4. Derived values + inheritance

| Gl. | output ← inputs | consumed by | notes |
|---|---|---|---|
| 1 (M187-09, M187-22 duplicate) | `A_F` ← 0.01 · A_b_a · 10000 | M187-22 | ok; also on M187-09 (wrong worksheet — P-Variante c) |
| 2 (dup) | `ok_boolean` ← b_R_a/(A_F/A_b_a) ≤ b_krit | — | unit check: b_R_a [kg/(ha·a)] / (A_F[m²]/A_b_a[ha]) = kg/(m²·a) ✓; boolean as equation |
| missing | `h_FK_SS = EBCT · v_filter / 60` (1,25 m derivation) | — | described ("Das entspricht einer Mindesthöhe … 1,25 m") |
| missing | `V_segment = Q_T_d_aM · 86,4` [m³ from l/s] | — | §5.2.3.1 c |
| missing | `A_F,min = 750 · A_E_b` ; `B_CSB = Fracht/A_F` ; `A_F,active = 3/4 · A_F` | — | §5.4.3 |
| missing | `h_FK = Σ Bild-3 layers` (10+60+30 = 1,00 m) | — | Bild 3 |
| inherit from DWA-A-178 | `b_krit` (7), `b_R_a`, `A_F`, `h_RR`, `q_Dr_RBF`, `h_FK`, `AFS63`, `A_E_b` | — | all re-typed here; M-187 says "Bezogen auf die Bemessung des RBF keine Änderungen zu Arbeitsblatt DWA-A 178:2019" |

Re-typed duplicates inside M-187: `h_FK` (M187-05, -08), `q_Dr_RBF` (-06, -12), `verfahrensvariante_p` (-05, -06), `verfahrensvariante_spurenstoffe` (-06, -11), `beta_wert`/`S_PO4P_aM`/`Fe_*`/`p_grund_beladung`/`feinmassenanteil`/`fallhoehe_einbau`/`v_filter_*`/`h_FK_SS`/`EBCT` (-05 vs -07/-08/-09), `S_PO4P_*` (-05, -10), `KBE/MPN/PBE/logstufen` (-07, -16), `uv_eingesetzt`/`UV_dosis` (-07, -18), GAK trio (-06, -13), `Q_T_d_aM`/segment fields (-06, -14), `DT50` (-06, -15), org-load block (-08 vs -19/-20), Klein-RBF block (-09 vs -21/-22), `h_Draen` vs `h_Draen_klein_rbf`, `attest_m187_04_req_07` vs `attest_m187_05_req_07`. **~55 of 139 fields are copies**; worksheets M187-07/08/09 carry fields of the wrong variant (M187-07 "Variante a" holds UV/KBE/MPN; M187-08 "Variante b" holds org-load fields; M187-09 "Variante c" holds Klein-RBF fields).

## 5. Summary
Counts: **7 table-lookup candidates** (all text-limit lookups; 1 layer table Bild 3) / **7 repeatable groups** / **12 conditionals** / **2 unique equations (+5 described, unregistered)**.

Top 5 UX wins:
1. Make `sonderanwendung` (+ `verfahrensvariante_p` / `verfahrensvariante_spurenstoffe`) the branch switch that shows only the matching worksheets and fills the per-variant `h_FK` / `q_Dr_RBF` limits — today three contradictory REQs (h_FK ≥1.0, q ≤0.03, q == 0.01) fire for every project.
2. Inherit the DWA-A-178 base design (`A_F`, `b_krit`, `b_R_a`, `h_RR`, `q_Dr_RBF`, `h_FK`, `A_E_b`) by reference instead of re-typing them; M-187 explicitly leaves RBF sizing unchanged.
3. De-duplicate ~55 copied fields and move misplaced blocks (UV/KBE off M187-07, org-load off M187-08, Klein-RBF off M187-09) so each variant worksheet holds only its own inputs.
4. Bild-3 layer stack as a repeatable "Filterschicht" table (thickness, GAK-%, CaCO3-%) that sums to `h_FK`, plus a Teilfilterbecken/Segment row group with count-derived in-operation area.
5. Klein-RBF: `carbonatschicht_vorhanden` toggles h_FK 0,25→0,2 and reveals carbonate fields; allow `A_F_anteil_Aba < 1,0` when Gl.2 passes instead of REQ-06 forcing `== 1.0`.

Data-quality gaps: REQ-02/03/04/05/06 unguarded and mutually exclusive; REQ-05 demands both `B_CSB ≤20` and `A_F_pro_AEb ≥750` (source: either/or); `CSB_grenze_trennung`, `wirkungsgrad_hydraulisch`, `beschickung_pro_ereignis`, `deckschicht_staerke`, `Fe_massenanteil` are constants modelled as inputs with `==` validations; `q_Dr_RBF` unit printed "l/(s·m²)²" in transcript Tabelle 2 (OCR); `h_FK` Klein-RBF: transcript §5.5.3.2.2 says verbatim "Die erforderliche Höhe des Filterkörpers beträgt im konsolidierten Zustand h_FK ≥ 0,25 m." — the "0,2 m mit Carbonatschicht" reduction in the prod desc was NOT found in the transcript (needs source check); 7 empty worksheets (M187-02/03/17/23/24/25) and Klimakennung Tabelle 4/5 have no fields; duplicate REQ codes (REQ-05/-05-2, REQ-06/-06-2, REQ-07 ×2, REQ-03/-04 ×2).
