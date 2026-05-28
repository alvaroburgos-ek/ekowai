# Multi-Standard Deep Audit Fixes — 2026-05-28

**Status:** Applied via Supabase MCP. DB-only changes, no app code in this commit's diff.

Deep field-level audit of the 12 standards not previously covered by today's PR #4-#8 cycle. For each standard: read markdown, query DB, fix empty/thin worksheets, add missing equation-input scalars, normalise units.

## Scope

| Standard | Topic | Pass3c |
|---|---|---|
| DWA-A-102-2 | Niederschlagswasser-Bewirtschaftung (Behandlung) | yes |
| DWA-A-178 | Retentionsbodenfilteranlagen | yes |
| DWA-A-262E | Pflanzenkläranlagen | yes |
| DWA-M-102-4 | Wasserhaushaltsnachweis | yes |
| DWA-M-179-1 | Vorbehandlung Niederschlagswasser (Sed-/Filtertypen) | yes |
| DWA-M-816 | Investitionsrechnung | yes |
| DWA-M-820-1 | QM Vergabe | yes |
| DWA-M-820-2 | QM Planung & Vergabe | yes |
| DWA-M-820-3 | QM Bau & Betrieb | yes |
| FLL-GAR-2023 | Gewässerabdichtungsrichtlinien | yes |
| FLL-Naturteich | Naturteiche / Schwimmteiche | yes |
| FLL-TP-RHIZOM-2023 | Rhizomfestigkeit-Prüfprotokoll | yes |

## Fix-set per standard

### Unit normalisation (cross-cutting)

Single UPDATE replaced caret-notation `m^2`, `m^3`, `kg/(m^2*a)`, `1/m^2`, `l/(s*m^2)`, `m^3/ha`, `m^3/a`, `g/(m^2*d)`, `m^2/P`, `l/m^2`, `l/(m^2*min)`, `l/(m^2*d)`, `l/(m^2*a)`, `g/(m^3*d)` with unicode superscript + middle-dot separator. Affected DWA-A-178 (13), DWA-A-262E (20), DWA-M-102-4 (8). Final: 0 caret-units remaining across the 12 standards.

### DWA-A-178 (RBF)

- A178-03 Umsetzbarkeit und Datenquellen (empty → 7 fields): feasibility, data completeness, KOSTRA/soil/Belastungs source, site assessment date
- A178-08 Zusammenfassung der Eingangsdaten (empty → 7): A_E_b_a, h_N_a_m, b_R_a, e_0, Belastungskategorie summary
- A178-18 Iteration und Optimierung (empty → 7): iteration count, A_F/V_RBF/b_F iterated, convergence
- A178-02 Systemtyp und Einzugsgebiet (1 → 6): catchment type + size, planning phase, receiving water
- A178-19 Konformitätszusammenfassung (1 → 8): nachweis b_F, nachweis Einleitfracht, q_F_max, filter thickness, sign-off

### DWA-A-102-2 (NW-Behandlung)

Single-field calc WS augmented with input scalars referencing upstream worksheets (cross-WS reference pattern):

- A1022-13 Q_R,krit: + A_b_a, f_D, r_krit (Gl. B.1)
- A1022-14 Q_Bem,Tr: + Q_F, Q_R,krit (Gl. B.2)
- A1022-20 q_T,aM: + A_b_a, Q_T,aM (Gl. B.9)
- A1022-21 a_f: + t_f (Gl. B.10)
- A1022-23 m: + Q_R,e, Q_R,Tr, Q_T,aM (Gl. B.13)
- A1022-25 C_b,CSB: + a_a, a_c,CSB, a_h (Gl. B.14)
- A1022-26 b_R,a,AFS63 + a_R,AFS63: + b_R,a,AFS63 scalar + p_I/II/III (Gl. B.22)

Thin WS augmented: A1022-11 (+ b_R,a,AFS63), A1022-12 (+ B_R,a,AFS63, eta_ges), A1022-19 (+ Q_M, Q_R,Tr, Q_T,aM, A_b,a), A1022-27 (+ C_b,CSB, m, a_R,AFS63), A1022-28 (+ C_e,CSB, C_R,CSB, V_R,aM), A1022-33 (+ Q_T,aM, Q_R,e, Q_R,Tr, Q_R,krit), A1022-36 (+ C_T,aM,CSB).

### DWA-A-262E (Pflanzenkläranlagen)

- A262-30 Behandlungskombinations-Auswahl (1 → 6): primary/main/post treatment, rationale, selection date
- A262-31 Bemessungsparameter-Verifikation (1 → 6): A_F, h_Beschickung, q_Beschickung, f_A checks
- A262-33 Konformitäts-Zusammenfassung (1 → 6): CSB/NH4-N target, doc complete, sign-off
- A262-05 (Gl. 2 Q_S,d,aM): + EZ, w_s,d (population + specific wastewater)

### DWA-M-102-4 (Wasserhaushalt)

- M104-33 Abweichungsanalyse (1 → 7): a/g/v deviation %, root cause, corrective measures
- M104-04 Niederschlagsdaten (2 → 7): P, P_korr, source, station, period
- M104-05 Verdunstung (2 → 6): ET_p, ET_a, method, source
- M104-09 Landnutzung (3 → 6): classification status, methodology, reference date
- M104-12/-13/-14 Flächen-Parameter (2-3 → 5-7 each): roof type, street type, vegetation k_f/WK_max/WP
- M104-20 Aufteilungswerte Vegetation (2 → 7): ET_a,korr, f_L, f_W, GWN_i, R_D_i
- M104-27 Niederschlagswassernutzung (2 → 7): h_Br, h_Bw, h_Sp, v_A, e_A
- M104-31 Wasserbilanz bebaut (3 → 7): a/g/v built totals, water balance check

### DWA-M-179-1 (NW-Vorbehandlung)

- M179-07 Eingangsdaten-Zusammenfassung (empty → 5): A_b,a, ψ_s, Belastungskategorie summary
- M179-13 Berechnungs-Zusammenfassung (empty → 7): eta_hyd, r_krit, Q_krit, A_sed, A_F summary
- M179-15 Bemessungs-Zusammenfassung (empty → 6): treatment method, A_F/A_sed/V_S final
- M179-08 η_hyd (1 → 3): + eta_BV, eta_ges target
- M179-09 r_krit (1 → 3): + eta_hyd ref, r_krit target
- M179-10 Q_krit (1 → 4): + A_b,a, ψ_s, r_krit refs
- M179-17 Konformitäts (1 → 6): eta_ges achieved + target met + sign-off

### DWA-M-816 (Investitionsrechnung)

- M816-03 Datenquelle und Methodenwahl (empty → 5): data source, investment method, cost index
- M816-07 Betriebskostendaten (empty → 6): personnel/energy/material/maintenance/total annual costs
- M816-10 Eingabedaten-Zusammenfassung (empty → 6): investment, n, q, p, summary date
- M816-16 Zahlungsprozesse mit Inflation (empty → 6): c_k, p, n, Z(t), BW, q_DUR
- M816-26 Zahlungsprofil-Vergleich (empty → 6): variant A/B names, BW values + difference, preferred variant
- M816-13/-14 Linear/Quadratisch (1 → 4-5 each): + c_0, c_1, Z(t), BW
- M816-18 Koeffizienten-Zusammenfassung (1 → 4): coefficient set, polynomial order
- M816-19 Durationsberechnung (1 → 4): duration method, years, date
- M816-25 PBW (1 → 4): PBW total, components, date
- M816-29/-30 Bewertung + Compliance (1 → 5-6 each): supplementary calc, sensitivity, risk + sign-off

### DWA-M-820-1 (QM Vergabe)

- M820-02 Umfangsdefinition (empty → 4): Leistungsumfang, Auftragswert, Projektart
- M820-15 Dokumentationsstruktur (empty → 4): Bewerbungsbedingungen, Eignungskriterien, Leistungsbeschreibung
- M820-22 Versicherung + Haftung (empty → 4): Versicherungssumme, Berufshaftpflicht, Verschuldensgrenzen, Gewährleistung
- M820-06/-07 Risikoanalyse + Maßnahmen (1 → 4 each): risk count, mitigation actions
- M820-11 Qualitätsanforderungen (1 → 4): Kriterien + Mindesteignung
- M820-16 Bewertungskommission (1 → 5): constituted, size, chair, date
- M820-19/-20/-21 Angebotsbewertung / Verhandlung / Vertrag (1 → 5-6 each)
- M820-24 Dokumentationsabschluss (1 → 5): archived, signed, location, date

### DWA-M-820-2 (QM Planung & Vergabe)

- 820-2-15 Planungsphasen-Zusammenfassung (empty → 5): HOAI phases, milestones, cost estimation, permitting
- 820-2-19 Vergabephasen-Zusammenfassung (empty → 5): procurement method, selection decision, award date, value
- 820-2-21 Bauänderungen + Öffentlichkeitsarbeit (empty → 5): change orders, PR plan

### DWA-M-820-3 (QM Bau & Betrieb)

Already structurally complete (0 empty, 0 single, 248 fields). No fixes required.

### FLL-GAR-2023 (Gewässerabdichtungen)

- FLL-GAR-22 Schutzlagen (6 → 17): added 11 hydrostatic equation inputs for Gl. 2a/2b/2c: d_D, γ_D′, d_Di, d_F, β, γ_Di′, γ_F′, γ_A, Δh_W, γ_w, z_a
- FLL-GAR-27 Inbetriebnahme (5 → 10): added Q_NOT eq inputs: A, C, r_5,100, r_5,5

### FLL-Naturteich

- FLLNT-10 Filter (15 → 18): + pool_underwater_surface, F_filter, h_filter (Gl. EQ-01/02/03)
- FLLNT-11 Wasserführung (9 → 11): + swimming_area_m², pool_underwater_surface (Gl. EQ-04/05)

### FLL-TP-RHIZOM-2023 (Rhizomfestigkeit)

- FLLTP-RHZ-10 Vorbereitung Kontrollgefäße (empty → 5): VTS-Einbaumethode, Schichtdicke, Standrohr
- FLLTP-RHZ-21 Konformitäts-Gesamtbescheinigung (empty → 6): final conformity, Gültigkeit, Prüfnummer, Signatur
- FLLTP-RHZ-03 Geltungsbereichsprüfung (1 → 5): Anwendungsbereich, Validierung, Prüfer
- FLLTP-RHZ-11 Bepflanzung (1 → 5): Datum, Methode, Anfangszustand, Anzahl
- FLLTP-RHZ-14/-15/-16 Wuchsleistung 12/18/24 Monate (1 → 5 each): Kontroll-Mittelwert, relative Dichte, ausreichend?, Datum

## Final state

| Standard | WS | Before | After | Δ | Empty | Single | Caret |
|---|---:|---:|---:|---:|---:|---:|---:|
| DWA-A-102-2 | 36 | 115 | **151** | +36 | 0 | 0 | 0 |
| DWA-A-178 | 19 | 82 | **115** | +33 | 0 | 0 | 0 |
| DWA-A-262E | 33 | 196 | **213** | +17 | 0 | 0 | 0 |
| DWA-M-102-4 | 35 | 186 | **222** | +36 | 0 | 0 | 0 |
| DWA-M-179-1 | 17 | 61 | **91** | +30 | 0 | 0 | 0 |
| DWA-M-816 | 30 | 68 | **122** | +54 | 0 | 0 | 0 |
| DWA-M-820-1 | 25 | 82 | **125** | +43 | 0 | 0 | 0 |
| DWA-M-820-2 | 28 | 97 | **112** | +15 | 0 | 0 | 0 |
| DWA-M-820-3 | 24 | 248 | **248** | 0 | 0 | 0 | 0 |
| FLL-GAR-2023 | 29 | 142 | **158** | +16 | 0 | 0 | 0 |
| FLL-Naturteich | 15 | 113 | **118** | +5 | 0 | 0 | 0 |
| FLL-TP-RHIZOM-2023 | 21 | 104 | **135** | +31 | 0 | 0 | 0 |
| **Σ** | **312** | **1494** | **1810** | **+316** | **0** | **0** | **0** |

All new fields `verification_status='imported_unverified'`, idempotent via `ON CONFLICT (worksheet_template_id, symbol) DO NOTHING`.

## Methodology

1. Single-query inventory of empty + single + thin WS + caret units across the 12 standards
2. Single-query gap analysis of equation input_symbols missing as fields
3. One `UPDATE` for unit normalisation
4. Per-standard DO blocks adding the prioritised gap-fill fields
5. Final verification query confirming 0 empty / 0 single / 0 caret across all 12 standards

Combined with PR #4-#8 work today, the entire 14-standard library is now structurally complete and ready for engineer field-verification.
