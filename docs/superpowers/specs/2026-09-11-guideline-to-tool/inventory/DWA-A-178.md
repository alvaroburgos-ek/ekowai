# DWA-A-178 — Surface-inventory pattern inventory

## 0. Sources used
- Transcript: `C:\Users\Ekowai\Desktop\Guidelines\DWA-A-178\DWA-A_178.md` (German, LaTeX; copies in `Desktop\Supabase data\Guidelines knowledge markdown\` and `Desktop\Blumen Forscheln\`).
- Prod dump: `scratchpad/std/DWA-A-178.json` — **19 worksheets, 118 fields**, 13 equations, 28 requirements.
- Vault: `reasoning-maps/DWA-A-178/` (cr-a178-req-01..24, bild-a178-01-planungsprozess), `encoding-audit-2026-07-01/DEEP-DWA-A-178.md`.

## 1. Table-lookup candidates

| worksheet | selector field | dependent fields filled | guideline table | override allowed? (quote) | table in transcript? |
|---|---|---|---|---|---|
| A178-13 / A178-15 | Vorstufe type (RKB q_A ≤10 m/h or RÜB-DB vs other) — **no enum field**; `becken_typ` + `rrl_vorhanden` select which η apply | `eta_VS` (0 / 0,2), `eta_F` (0,95), `eta_RR` (0,50), `eta_RRL` (0,60) | Tabelle 1 §6.2.2.3 | "Rechenwerte … zur Anwendung in Gl. (5) bis Gl. (7)"; footnote "Bei vorhandenen RKB (q_A ≤ 10 m/h) oder RÜB-DB kann für AFS63 η_VS = 0,2 angesetzt werden." ("kann" → engineer choice between 0 and 0,2) | yes — below |
| A178-06 | `system_type` (misch/trenn/strasse) — all three share the same Rechenwert | `b_R_a` (530) | §6.2.2.1 text | "Als Rechenwert kann b_R,a = 530 kg/(ha·a) angesetzt werden" (prod vq); measured potentials override (`belastungs_data_source`) | text value, no table |
| A178-07 | `system_type` | `h_FK_required` (0,75 / 0,50) | §6.1.4.5 | "Mischsystem h_FK ≥ 0,75 m, Trennsystem und Straßenentwässerung h_FK ≥ 0,50 m" — fixed minima | yes (text) |
| A178-07 | `system_type` | `q_Dr_RBF` (0,05), `b_krit` (7), `v_spez_grobstoff` (0,5 Trenn), `e_0` cap (55 Misch), `n_RBF` ≥10 (Misch), `t_RR_E_n1` ≤48 (Misch) | §6.1.4.10, §6.2.2.1, §6.2.1 | "kann eine konstante Abflussspende … q_Dr,RBF = 0,05 l/(s·m²) … angesetzt werden. Für die nachfolgende Nachweisrechnung muss die Kennlinie des geplanten Drosselorgans angesetzt werden." → default for Vorbemessung, real curve for Nachweis | text |
| A178-02/10 | `system_type == strasse` AND no specific goals (no field) | `A_F` = 100 m²/ha·A_E,b,a, `h_RR` ≥0,5, Nachweis waived | §6.2.2.2 | "Wurden … keine spezifischen Behandlungsziele formuliert, kann die Bemessung … stark vereinfacht … erfolgen" | text |
| A178-01 | `wasserschutzgebiet` | Leichtflüssigkeitsfang required (Straße in WSG) | §6.2.1.3 | "Innerhalb von Wasserschutzgebieten ist … ein zusätzlicher Auffangraum für Leichtflüssigkeiten gemäß RiStWag vorzusehen." | text |
| A178-18 (operation) | Befund (Tabelle 2 indicator) → Hinweis | — (no fields) | Tabelle 2 §8 | informative ("einfache Indikatoren") | yes |

Missing-field gaps: no "Vorstufentyp" enum (RÜB / RKB / RÜB-DB / Stauraumkanal-unten / Grobstoffrückhalt) to drive η_VS and the "Stauraumkanäle mit unten liegender Entlastung" exclusion; no "spezifische Reinigungsziele formuliert?" boolean for the Straße simplification; no Tabelle-2 indicator picker.

Verbatim (file `DWA-A_178.md`):
```
Tabelle 1: Rechenwerte der mittleren Frachtrückhaltegrade der einzelnen Komponenten der Retentionsbodenfilteranlage, bezogen auf AFS63, zur Anwendung in Gl. (5) bis Gl. (7)
Parameter | η_VS | η_F | η_RR | η_RRL
AFS63     | 0 1) | 0,95 | 0,50 | 0,60
Anmerkung 1) Bei vorhandenen RKB (q_A ≤ 10 m/h) oder RÜB-DB kann für AFS63 η_VS = 0,2 angesetzt werden.

§6.2.2.1: "maximal zulässige AFS63-Filterflächenbelastung von b_krit = 7 kg/(m²·a)"
Gl. (9): 4 kg/(m²·a) ≤ b_F ≤ b_krit = 7 kg/(m²·a)
§6.2.2.2 Straße: A_F = 100 m²/ha angeschlossener befestigter Fläche (A_E,b,a); h_RR ≥ 0,5 m
§6.2.1.1: e_0 ≤ 55 % ; n ≥ 10 Entlastungen pro Jahr
§6.2.1.2: spezifisches Sammelvolumen mindestens 0,5 m³/ha A_E,b,a
§6.2.2.3 c): Einstaudauer … für n=1 ≤ 48 h ; Beschickungshäufigkeit ≥ 10 /a
§6.1.4.5: Mischsystem h_FK ≥ 0,75 m ; Trennsystem und Straßenentwässerung h_FK ≥ 0,50 m
§6.1.4.6: U = d_60/d_10 < 5 ; Feinanteil (<0,063 mm) ≤ 3 Massen-% ; Überkornanteil ≤ 15 Massen-% ; Calciumcarbonatgehalt ≥ 20 Massen-%
§6.1.4.7: Pflanzdichte 4 bis 8 Pflanzen je Quadratmeter
§6.1.4.9: Kunststoffdichtungsbahnen … Stärke von mindestens 2 mm (prod vq)
§6.2.2.1 Schritt 4: Porenvolumen … pauschal mit 15 % des Filterkörpervolumens
Tabelle 2 (excerpt): Schilf | üppiger Wuchs auf der gesamten Filterfläche | hohe, gleichmäßige Filterbelastung ; lückenhafter Schilfbewuchs, dünne Halme | geringe Filterbelastung ; Bodenfilteroberfläche | zulaufnahe Erosionsspuren | schlechte Energieumwandlung im Zulaufbauwerk ; Ablaufbauwerk | Dränablauf klar, farb- und geruchlos | funktionstüchtiger Filter …
```

## 2. Repeatable-group candidates

| worksheet | the thing | member fields | currently modelled | aggregation + consumers |
|---|---|---|---|---|
| A178-04 / A178-09 | **Teilfläche i** im Einzugsgebiet (Gl. 2/3: Σ(A_E,b,a,i · b_R,a [· e_0])) | `A_E_b_a_i`, per-area `b_R_a` (can differ per surface type), per-area `e_0` (Misch) | single scalar `A_E_b_a_i` + separate total `A_E_b_a` (re-typed) | Σ A_E,b,a,i → `A_E_b_a`; Σ(A_i·b_R,a·e_0) → `B_RBF_zu` (A178-09) → `A_F` (A178-10), Gl.10 |
| A178-04 | catchment sub-areas with ψ_m (`a178_A_E_k`, `a178_A_E_b`, `a178_psi_m`) | those 3 + `a178_belastungskategorie` | single scalars (SEC=C legacy) | A_E,b = Σ A_E,k·ψ_m; feeds `A_E_b_a` |
| A178-14 | **Frachtaustrag component** (Vorstufe, Filterablauf, FÜ, RRL) | `B_VS`, `B_Dr_RBF`, `B_FU`, `B_RRL` | 4 scalars | Σ → `B_RBFA_ab` (Gl. 11) → A178-16 |
| A178-13 | **Ablaufpfad** of the long-term simulation (Drossel RBF, FÜ, Drossel RRL) each with volume + η | `VQ_Dr_RBF`/`eta_F`, `VQ_FU`/`eta_RR`, `VQ_Dr_RRL`/`eta_RRL` | 6 scalars; 3 equations (Gl. 5/6/7) selected by `becken_typ`+`rrl_vorhanden` | Σ(VQ_k·η_k) → `b_F` — one equation over rows would replace Gl. 5/6/7 |
| A178-18 | **Iterationsschritt** (A_F, h_RR/V_RBF, resulting b_F) | `A_F_iterated`, `V_RBF_iterated`, `b_F_iterated`, `iteration_count` | single "last" values + count | max/last → `convergence_achieved`; history not kept |
| A178-05 | precipitation series / simulation runs (≥10 a) | `langzeitsimulation_dauer`, `kostra_data_source` | scalars | none |
| A178-08 | summary copies | `A_E_b_a_summary`, `h_N_a_m_summary`, `b_R_a_summary`, `e_0_summary` | **re-typed duplicates** of A178-04/05/06/07 | should be inherited, not rows |

## 3. Conditional dependencies

| worksheet | driver | affected | rule + quote | encoded? |
|---|---|---|---|---|
| A178-02 | `system_type` | Gl. 2 (Trenn/Straße) vs Gl. 3 (Misch, ×e_0); `e_0` visible only for Misch | "Filterzulauffracht im Trennsystem: B_RBF,zu = Σ(A_E,b,a,i · b_R,a) (2)" / "… Mischsystem … · e_0 (3)" | both equations always present, no selector |
| A178-02 | `system_type == misch` | REQ-09 (e_0 ≤55, n ≥10), REQ-21 (t_RR,E,n=1 ≤48), h_FK ≥0,75 | §6.2.1.1, §6.2.2.3 c, §6.1.4.5 | REQ-09/12/21 guarded IF |
| A178-02 | `system_type IN {trenn, strasse}` | REQ-10 (v_spez ≥0,5), h_FK ≥0,50 | §6.2.1.2 | guarded |
| A178-02 + `h_N_a_m` | `system_type == trenn AND h_N_a_m > 1000` | `A_F ≥ 100·A_E_b_a` | "Im Trennsystem ist bei einer mittleren Jahresniederschlagshöhe von > 1.000 mm/a eine Filterfläche von A_F = 100 m² je Hektar befestigter, angeschlossener Fläche …" | REQ-18 guarded |
| A178-02 + WSG | `system_type == strasse` AND `wasserschutzgebiet != zone_none` | Leichtflüssigkeitsfang; else "wie Trennsystem" | §6.2.1.3 | REQ-11 = attest boolean only |
| A178-02 | `system_type == strasse` AND no specific goals | simplified sizing; A178-12..16 (Nachweis) not required | "kann auf das Nachweisverfahren verzichtet werden" (§6.2.2.3) | REQ-16 partially (h_RR ≥0,5); no "goals formulated" driver |
| A178-07 | `becken_typ` | Gl. 5 (fang) vs Gl. 6 (durchlauf); `VQ_FU`/`eta_RR` relevant only for Durchlauf | "Fangfilterbecken (Gl. 5) versus Durchlauffilterbecken (Gl. 6/7)" | three equations same output, not switched |
| A178-07 | `rrl_vorhanden` | Gl. 7; `V_RRL`, `VQ_Dr_RRL`, `eta_RRL`, `B_RRL` visible | "Wenn es die Höhenverhältnisse zulassen, kann … eine Regenrückhaltelamelle … angeordnet werden. Diese ist … mit einer eigenen Drosseleinrichtung auszustatten" | nothing |
| A178-13 | Vorstufe type (RKB q_A ≤10 / RÜB-DB) | `eta_VS` 0 vs 0,2; `C_RBF_zu` = `C_RBFA_zu` if η_VS=0 else abgemindert | Tabelle 1 fn 1); "Wird die Wirksamkeit der Vorstufe für AFS63 mit Null angenommen, entspricht … C_RBF,zu der nach Gl. (8) ermittelten …" | nothing (both typed) |
| A178-05 | `fremdwasser_relevant` | Sanierung / alternierende Beschickung / Bauabbruch | "Wird ein Fremdwasserzufluss festgestellt, sind Sanierungsvorschläge zu erarbeiten" (§5.2.2) | REQ-05 warn, empty condition |
| A178-06 | `feststoffeintrag_alarm` (>1.000 kg/(ha·a)) | Sonderprüfung | §5.2.4 | REQ-07 |
| A178-11 | `h_RR` | 0,3..2,0; Straße ≥0,5 | §6.1.4.3 | REQ-15/16 |
| A178-16 | `nachweis_b_F`/`nachweis_einleitfracht == fail` | A178-18 iteration required | §6.2.2.4 | REQ-24 on `convergence_achieved` |
| A178-16 | `b_krit` vs `b_F` | REQ-19 uses literal 7, ignores `b_krit` field | Gl. 9 | literal |

## 4. Derived values + inheritance

| Gl. | output ← inputs | consumed by | notes |
|---|---|---|---|
| 2/3 | `B_RBF_zu` ← Σ A_E_b_a_i · b_R_a [· e_0] | A178-10 (Gl.1) | SUM written in formula but only one `A_E_b_a_i` field exists |
| 1 | `A_F` ← B_RBF_zu, b_krit, eta_B_soll | A178-11,13,16 | ok; `a178_A_RBF_min`, `a178_A_RBF_spez` (1 % rule) legacy, no equation |
| 4 | `Q_Dr_RBF` ← q_Dr_RBF · A_F | — | ok |
| — | `V_RBF` ← Retentionsraum + 0,15·V_FK | — | "Porenvolumen … 15 %" described, **no equation**; `V_RBF_iterated` re-typed |
| 8 | `C_RBFA_zu` ← B_RBFA_zu·1000 / VQ_RBFA_zu | A178-13 | `B_RBFA_zu` (A178-09) vs `B_RBF_zu`: distinct quantities, ok |
| — | `C_RBF_zu` ← C_RBFA_zu · (1 − η_VS) | A178-15 | described, **no equation** (typed) |
| 5/6/7 | `b_F` ← VQ_Dr_RBF, eta_F, VQ_FU, eta_RR, VQ_Dr_RRL, eta_RRL, C_RBFA_zu, eta_VS, A_F | A178-16 | three variants, selector = `becken_typ`+`rrl_vorhanden`; `eta_F` is both input here and output of Gl.13 (circular unless Tabelle-1 value used) |
| 9 | `b_F_im_bereich` ← b_F, b_krit | A178-19 | boolean gate as "equation" |
| 10 | `emission_eingehalten` ← B_RBFA_ab, A_E_b_a, b_R_e_zul | A178-19 | boolean gate |
| 11 | `B_RBFA_ab` ← B_VS + B_Dr_RBF + B_FU + B_RRL | A178-16 | components themselves not derived (B_Dr_RBF = VQ_Dr_RBF·C_RBF_zu·(1−η_F)/1000 etc. absent) |
| 12 | `eta_RBF_hyd` ← VQ_Dr_RBF / VQ_RBF_zu | A178-19 | ok |
| 13 | `eta_F` ← C_RBF_zu, VQ_Dr_RBF, B_RBF_ab, VQ_RBF_zu | A178-13 | evaluation formula; conflicts with Tabelle-1 Rechenwert 0,95 as input to Gl.5–7 |

Re-typed duplicates: `A_E_b_a` (A178-04) vs `A_E_b_a_summary` (A178-08) vs `a178_A_E_b`; `h_N_a_m` vs `h_N_a_m_summary`; `b_R_a` vs `b_R_a_default` vs `b_R_a_summary`; `e_0` vs `e_0_summary`; `system_type` vs `einzugsgebiet_typ` (identical enums); `B_RBF_zu` vs `a178_B_F_AFS`; `A_F` vs `A_F_iterated` vs `a178_A_RBF_min`; `b_F` vs `b_F_iterated`; `V_RBF` vs `V_RBF_iterated`; `q_Dr_RBF` vs `a178_q_F_max`; `b_krit` typed although fixed at 7; `nachweis_b_F` (enum) vs `b_F_im_bereich` (bool) vs `nachweis_b_F_compliant` (bool).

## 5. Summary
Counts: **7 table-lookup candidates** (1 real table + 6 text-value lookups) / **7 repeatable groups** / **14 conditionals** / **13 equations (+3 described, unregistered)**.

Top 5 UX wins:
1. Repeatable **Teilflächen** rows (A_E,b,a,i · b_R,a · e_0) with live Σ → `A_E_b_a` and `B_RBF_zu` — replaces the single `A_E_b_a_i` scalar and four re-typed summary copies.
2. `system_type` as master switch: shows Gl.2 or Gl.3, hides `e_0`/`t_RR_E_n1`/`n_RBF` outside Misch, fills `h_FK_required` (0,75/0,50), `v_spez_grobstoff`, and auto-applies the Straße simplification (A_F = 100 m²/ha, Nachweis waived).
3. Vorstufentyp selector filling `eta_VS` (0 / 0,2 per Tabelle 1 footnote) and deriving `C_RBF_zu = C_RBFA_zu·(1−η_VS)` instead of typing both.
4. `becken_typ` + `rrl_vorhanden` pick one b_F formula and reveal only the relevant VQ/η/B_RRL rows (Tabelle-1 defaults 0,95/0,50/0,60 pre-filled, editable with audit).
5. Register `V_RBF = V_RR + 0,15·V_FK` and the per-path load equations so A178-14 components and A178-18 iteration values are computed, not re-typed.

Data-quality gaps: `eta_F` circular (input to Gl.5–7, output of Gl.13); REQ-19 hard-codes 7 instead of `b_krit`; three enum/bool triplets for the same verdict; `einzugsgebiet_typ` duplicates `system_type`; `a178_*` legacy fields (SEC=C) without clause quotes; 6 requirements (REQ-01/03/04/05/06/08/28) have empty conditions; Tabelle 2 has no field target; transcript OCR "GI. (5)".
