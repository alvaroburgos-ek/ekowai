# DWA-A-262E — Surface-inventory pattern inventory

## 0. Sources used
- Transcript: `C:\Users\Ekowai\Desktop\Guidelines\DWA-A-262E\DWA-A_262E (2).md` (English edition, LaTeX tables; identical copy in `Desktop\Supabase data\Guidelines knowledge markdown\`).
- Prod dump: `scratchpad/std/DWA-A-262E.json` — **33 worksheets, 215 fields**, 18 equations, 71 requirements.
- Vault: `01-Projects/ekowai-wizard/encoding-audit-2026-07-01/DEEP-DWA-A-262E.md`, `form-guides/DWA-A-262E.md` (structure only).

## 1. Table-lookup candidates (category → predetermined values)

| worksheet | selector field | dependent fields filled | guideline table | override allowed? (quote) | table in transcript? |
|---|---|---|---|---|---|
| A262-07 → A262-09 | `pretreatment_selected` (enum, 6 values present) | `B_CSB`, `B_BSB5`, `B_TKN` (A262-09), `C_CSB_nach_VB`, `eta_VB_AFS` (A262-07) | Table 1 §4.1.2 | Normative when no data: "If there is no available data … the wastewater pollutant loads per population equivalent given in Table 1 must be used." → measured data overrides the table (documented via `datenquelle_abwasser`) | yes — see T1 below |
| A262-02 → A262-26 | `wastewater_type == greywater_only` (enum present) | `B_CSB_Grauwasser`, `Q_Grauwasser` (≥ 75 l/(P·d)) | Table 2 §4.1.3 | "Table 2 gives informative specific loads for greywater." → informative, free choice between Median/Average column | yes — T2 below |
| A262-10 (+A262-11..16) | `filter_type` (enum, 9 values present) | `A_Fo_spez`/`A_Fu_spez`, `A_Fo_min`/`A_Fu_min`, `f_A_F_CSB`, `q_F_T`, `q_Beschickung_Fo/Fu`, `h_Beschickung_Fo/Fu`, `f_V_CSB`, `f_A_ANF_CSB`, `L_HF_min`, `l_Rieselr`, `L_Rieselr`, `B_Rieselr`, `B_FGR` | Tables 3–9 (small WWTS), summarised Table 17 §4.4 | Values are limits ("≥", "≤"), engineer enters actual design value, gate compares. No override of the limit itself in text. | yes — T3–T9 + T17 quoted below |
| A262-18 (+A262-19..23) | `filter_type_KomKA` (enum, 5 values) **and** `sewer_system_type` (A262-02) | `A_Fo_spez_KomKA` (Tr vs M column!), `f_A_F_CSB_KomKA_in`, `f_A_F_CSB_Betrieb`, `q_F_T_KomKA_in`, `t_Sicker_min_aM`, `q_Beschickung_Fo_KomKA`, `h_Beschickung_Fo_KomKA`, `f_V_CSB`, `A_AWF_spez`, `q_AWF_aM`, `q_F_T_Betrieb`, `f_A_F01_CSB` | Tables 10–14, summarised Table 18 §4.4 | as above (limits) | yes — T10–T14 + T18 |
| A262-27 | `main_filter_type == hf_coarse_sand_or_gravel_downstream` + material sub-choice (coarse sand vs gravel — **no field**) | `f_A_ANF_CSB` (≤40 sand / ≤200 gravel), `f_A_Fu_CSB` ≤16 | Table 16 §4.3.6.2 | limits | yes — T16 |
| A262-28 / polishing VF | polishing step = VF sand (no selector; `post_treatment` is free text) + `effluent_temperature_C` (<12 / ≥12 °C) | `f_A_F_CSB` ≤20, `f_A_F_CSB_Betrieb` ≤27, `q_F_T` ≤80/≤120, `t_Sicker_min_aM` ≥6/≥3 | Table 15 §4.3.6.1 | Note: "*) when monitoring the filter effluent for redox potential, an increased loading (up to the maximal loading rate) is possible, when oxic conditions are observed." → conditional override | yes — T15 |
| A262-29 | `filter_type` (from A262-10) | `d_10` range, `U` (<5), `fines_fraction` (≤2), `k_fA` target, sieve size | Table 21 §5.4 | "Table 21 summarizes grain size distributions and characteristics of recommended filter media." (recommended); `lava_sand_clay_fraction_pct` <8 % is a per-type exception | yes — T21 (partial) + T20 |
| A262-31 | `system_size_category` → picks Table 17 vs 18 for the cross-check | `A_F_check_pass`, `h_Beschickung_check_pass`, `q_Beschickung_check_pass`, `f_A_check_pass` | Tables 17/18 | n/a (verdict) | yes |

**Missing-field gaps (tables with values by class, no selector in prod):**
- Table 12 / Table 3 / Table 18 distinguish `A_Fo_spez_Tr` vs `A_Fo_spez_M` (separate vs combined sewer) — prod has one `A_Fo_spez` and `A_Fo_spez_VFG_KomKA`; the sewer-dependent split is only in the free-text VR.
- Table 16 distinguishes coarse sand vs gravel for `f_A_ANF_CSB`; no material selector on A262-27.
- Table 18 row "Filter surface area per orifice of distribution network" (≤50/≤1/≤5/≤25) — no prod field.
- Table 10/15 `t_Sicker_min_aM` temperature split (<12 / ≥12 °C) not modelled as a driver.
- Sub-section count rules (min 3 cells for raw-wastewater filter, ≥2 (better 4) for VF sand, ≥2 for lava sand) — no field.

Verbatim (file `DWA-A_262E (2).md`):

```
Table 1: Wastewater specific mass loads per population equivalent in g/(P.d)
Parameter | Raw wastewater 1) | After pretreatment in a multicompartment septic tank, settling pond, or Imhoff tank with retention time ≥2 h at Q_Tr,h,max | After primary treatment with a raw wastewater filter 2) | After pretreatment with an aerated settling pond 3)
BSB5 (BOD5) | 60 | 40 | 10 | 30
CSB (COD)   | 120 | 80 | 25 | 60
TS          | 70 | 25 | 8 | 16
TKN         | 11 | 10 | 4.4 (>12 °C) | 8.5
GesN (TN)   | 11 | 10 | 10 | 10
P_ges (TP)  | 1.8 | 1.6 | 1.6 | 1.6
1) From Standard ATV-DVWK-A 198:2003, except for TN. 2) Calculated from Troesch & Esser 2012 and Morvannou et al. 2015. 3) Calculated from HASSELBACH 2013.

Table 2: Greywater specific mass loads per population equivalent in g/(P.d)
Parameter | Greywater Median (DWA-A 272:2014) | Greywater Average (Sievers et al. 2014)
BSB5 | 18 | 31 ; CSB | 47 | 57 ; TS | 13 | 7 ; TKN | 1 | - ; GesN | 1 | 1 ; P_ges | 0.5 | 0.4

Table 3 (raw wastewater filter, primary treatment): A_Fo,spez,Tr ≥ 1.2 m²/P ; A_Fo,min 4.8 m² ; A_Fo,spez,M ≥ 1.5 m²/P ; f_A,F,CSB ≤ 100 g/(m²·d) ; q_Fo,T ≤ 250 l/(m²·d) ; q_Beschickung,Fo ≥ 10 l/(m²·min) ; h_Beschickung,Fo 20-50 l/m²
Table 4 (VF sand 0-2, small): A_Fo,spez ≥ 4 m²/P ; A_Fo,min 16 m²
Table 5 (two-stage VF, small): A_Fo1,spez ≥ 1 ; A_Fo2,spez ≥ 1 ; A_Fo,min (A_Fo1+A_Fo2) 4+4 m²
Table 6 (VF coarse sand 0-4, small): A_Fo,spez ≥ 1 ; A_Fo,min 4
Table 7 (aerated VF gravel, small): A_Fu,spez ≥ 1 ; A_Fu,min 4
Table 8 (two-layer filter trench): A_Fu,spez ≥ 3 ; A_Fu,min 12 ; l_Rieselr ≥ 6 m/P ; L_Rieselr ≤ 18 m ; B_Rieselr ≥ 0.5 m ; B_FGR ≥ 0.5 m ; h_Beschickung,Fu ≥ 20 l/m²
Table 9 (aerated HF gravel, small): A_Fu,spez ≥ 1 ; A_Fu,min 4 ; f_A,ANF,CSB ≤ 200 ; f_V,CSB ≤ 100 g/(m³·d) ; L_HF,min 2 m
Table 10 (VF sand, municipal): A_Fo,spez ≥ 4* ; f_A,Fo,CSB ≤ 20 ; f_A,F,CSB,Betrieb ≤ 27 ; q_Fo,T ≤ 80 ; t_Sicker,min,aM ≥ 6 h ; q_Beschickung,Fo ≥ 6 ; h_Beschickung,Fo ≥ 10* / ≥ 20   (*tightly-spaced distribution networks, §5.5.2.3)
Table 11 (two-stage VF, municipal): A_Fo1,spez ≥ 1 ; A_Fo2,spez ≥ 1 ; f_A,Fo1,CSB ≤ 80 ; t_Sicker,min,aM ≥ 3 ; q_Beschickung,Fo ≥ 10 ; h_Beschickung,Fo ≥ 20
Table 12 (VF coarse sand, municipal): A_Fo,spez,Tr ≥ 0.8 ; A_Fo,spez,M ≥ 1 ; q_Beschickung,Fo ≥ 6 ; h_Beschickung,Fo ≥ 20
Table 13 (aerated VF gravel, municipal): A_Fu,spez ≥ 1 ; f_V,CSB ≤ 100 ; t_Sicker,min,aM ≤ 4 ; h_Beschickung,Fu ≥ 6
Table 14 (VF lava sand, municipal): A_Fo,spez ≥ 3 ; f_A,F,CSB ≤ 20 ; q_Fo,Betrieb ≤ 240 ; t_Sicker,min,aM ≥ 4 ; q_Beschickung,Fo ≥ 10 ; h_Beschickung,Fo ≥ 20 ; A_AWF,spez ≥ 1 (combined only) ; q_AWF,aM ≤ 500
Table 15 (VF sand polishing): f_A,F,CSB ≤ 20 ; f_A,F,CSB,Betrieb ≤ 27 ; q_Fo,T <12°C ≤ 80 / ≥12°C ≤ 120* ; t_Sicker,min,aM <12°C ≥ 6 / ≥12°C ≥ 3 ; q_Beschickung,Fo ≥ 6 ; h_Beschickung,Fo ≥ 20
Table 16 (HF downstream): f_A,ANF,CSB coarse sand ≤ 40 ; gravel ≤ 200 ; f_A,Fu,CSB ≤ 16
Table 18 extra row: Filter surface area per orifice of distribution network (m²/orifice): raw ≤ 50 | coarse sand ≤ 1 | sand ≤ 5* better ≤ 1 | two-stage ≤ 1 / ≤ 1 | aerated ≤ 1 | lava ≤ 25-<5** | polishing sand ≤ 1
Table 21 (excerpt): Raw wastewater filter | 2 to 8 mm | fG | silt ≤ 2 % | U < 5 | d10 3 | k_fA ≈ 1e-1 ; Vertical filter with sand | 0 to 2 | S | ≤ 2 | < 5 | d10 0.20 to 0.4 | ≈ 1e-4 (calc 4.0e-4 to 1.6e-3) ; Two-stage | 2 to 8 / 0 to 4 | fG / gS | ≤2 | <5 | 3 / 0.25 to 0.4 | ≈1e-1 / ≈1e-3 ; Coarse sand | 0 to 4 | gS | ≤2 | <5 | 0.25 to 0.4 | ≈1e-3 ; Aerated VF gravel | 8 to 16 | mG | ≤2 | <5 | ≥5 (row truncated in transcript)
```

## 2. Repeatable-group candidates (one of N)

| worksheet | the thing | member fields | currently modelled | aggregation + consumers |
|---|---|---|---|---|
| A262-10..16 / A262-18..23 | **Filter stage** (a plant has 1..3 filters: primary raw-wastewater filter, main stage(s), polishing) | `filter_type`, `A_Fo_spez`/`A_Fu_spez`, `A_Fo_min`, area actual, `f_A_F_CSB`, `q_F_T`, `q_Beschickung`, `h_Beschickung`, `t_Sicker_min_aM`, material (`d_10`,`d_60`,`U`,`k_fA`) | **one worksheet per filter type** (13 sibling worksheets, ~60 fields duplicated with `_KA`/`_KomKA`/`_VFS`/`_VFG`/`_VFK`/`_VFKS` suffixes) | sum of areas → `A_Fo_gesamt_KA` / `A_Fo_gesamt_KomKA` (A262-17/24); "Downstream filter areas may not be considered" → sum only main-stage rows |
| A262-12 / A262-20 | two-stage VF stage (1st gravel, 2nd coarse sand) | `A_Fo1_spez`, `A_Fo2_spez`, `f_A_F_CSB_VFKS_1/2` | `_1`/`_2` suffixes | sum → `A_F_VFKS_total` (=A_F1+A_F2) |
| A262-15 | Rieselrohr (infiltration pipe) in filter trench | `L_Rieselr` (each ≤18 m), `B_Rieselr`, `B_FGR` | single scalars | sum L × n ≥ `l_Rieselr`·EZ; count field missing |
| A262-23 | lava-sand main filters (≥2 parallel) + overflow filter | `A_Fo_spez`, `A_AWF_spez`, `q_AWF_aM` | single scalars | "minimum of two parallel vertical filters" — count not modelled |
| A262-10/18/19 | filter sub-sections / cells (≥3 raw filter, ≥2/4 VF sand, 2 lava) | none | not modelled | count → in-operation area → `f_A_F_CSB_Betrieb`, `q_F_T_Betrieb` |
| A262-06 | stormwater overflow structures (ΣQ_Dr,RU, ΣQ_krit) | `Q_Dr_RUB`, `Q_Dr_RU`, `Q_krit` | single scalars, Gl. 8 written with SUM | sum → `Q_M` gate (Gl. 6/8) |
| A262-08 | effluent samples (4-of-5 rule) | `samples_within_limit_count`, `samples_total_count` | two count fields | rolling window of 5 sample rows → `CSB_target_met` |
| A262-32 | inspection/maintenance tasks (Tables 22–24) | `inspektionsintervall`, `wartungsintervall`, `beprobungsintervall` | 3 free-text fields | none; a task list per component from Table 22/23/24 |

## 3. Conditional dependencies

| worksheet | driver | affected | rule + quote | encoded? |
|---|---|---|---|---|
| A262-02 | `system_size_category` | visibility A262-10..17 vs A262-18..24; which summary table (17/18) | "small wastewater treatment systems … up to 50 P" (§1) | REQ-09/REQ-10 attest booleans only |
| A262-02 | `sewer_system_type` | A262-05 (Gl.1–5) vs A262-06 (Gl.6–10); `A_Fo_spez_Tr` vs `_M` (T3, T12, T18); overflow filter (T14) | "Sizing … differs depending on the type of sewer network (separated or combined)" (§4.2.6, §4.3.3.4); "When used in a combined sewer network, an overflow filter is required" (§4.3.3.6) | nothing (worksheets both always visible) |
| A262-02 | `seasonal_operation` | A262-25 visible; f_red applies only to VF sand 0-2 | "For other vertical filters, the possibility of reducing the required area has not yet been investigated." (§4.3.4) | REQ-11 text mentions, condition doesn't check filter_type |
| A262-02 | `wastewater_type == greywater_only` | A262-26; `A_Fo_spez_GW` = 50 % of conventional | "The specific area of a filter for greywater treatment can be dimensioned with 50 % of the specific surface required for a conventional filter" (§4.3.5) | REQ-12 (w_s_d ≥ 75) only; 50 % not an equation |
| A262-02 | `enhanced_effluent` | A262-28 visible | §4.5 | nothing |
| A262-07 | `pretreatment_selected` | Table 1 column for B_CSB/B_BSB5/B_TKN; V min (300 l/P & 3,000 l septic; 1.2 m³/P aerated pond; ≥2 h & 75 l/P sedimentation) | "The required size of the multicompartment septic tank must be at least 300 l/P and a minimum volume of 3,000 l." (§4.2.2); "volume of the aerated settling pond … must be at least 1.2 m³/P" (§4.2.7) | REQ-30 (≥2 h) only; volume floors not per type |
| A262-10 | `filter_type` | which of Tables 3–16 applies; area reference (upper surface vs bottom of basin); which of A262-11..16/19..23 is visible | "For determination of the required filter area, the bottom of the filter basin is used." (§4.3.1.5) vs "upper surface" (§4.3.1.2) | REQ-33..36 guarded `IF filter_type == raw_wastewater_filter`; others unguarded |
| A262-08/28 | `nitrification_required` + `effluent_temperature_C` | S_NH4 ≤ 10 only claimable at ≥12 °C; T15 limits switch at 12 °C | "nitrification (S_NH4 ≤ 10 mg/l) at filter effluent water temperatures ≥ 12 °C" (§1) | REQ-20/20b |
| A262-25 | `t_Reg` | `f_red` floor 0.5 | "for t_Reg/12 > 0.5 f_red must be set at a value of 0.5" (§4.3.4) | REQ-11 + REQ-11b; Gl.11 lacks the clamp |
| A262-25 | `tkn_influent_high` / `nitrification_required` | A_F_TKN_red branch (Gl.13/14) | "If enhanced nitrification is required … the reduced area is determined by the larger area requirement." | Gl.13/14 present but identical RHS (flagged in prod as OCR suspicion) |
| A262-29 | `lining_type` | geomembrane fields vs mineral-seal fields vs bentonite vs subsoil k_f | "≥ 1.5 mm … For liner installation without welds in small wastewater treatment systems, the thickness of the polyethylene-based liner can be ≥ 1 mm." (§5.3) | REQ-17/18a/18c guarded; 1.0 mm exception (needs `system_size_category`+`geomembrane_no_welds`+`geomembrane_is_polyethylene`) not encoded |
| A262-29 | `subsoil_permeability_class` | `mineral_seal_layer_count` (2 vs ≥1) | "If the local soil is well-permeable, two layers of 30 cm each must be installed. For local soils with low permeability, only one layer ≥ 30 cm may be sufficient." | nothing |
| A262-29 | `filter_type == vf_lava_sand_0_4` | fines limit 8 % instead of 2 % | "A lava sand 0 mm to 4 mm with a clay fraction of less than 8 % is used." (§5.4.2.6) | separate field, REQ-15 still fires ≤2 % unguarded |
| A262-27 | material (sand/gravel) | `f_A_ANF_CSB` ≤40 vs ≤200 | Table 16 | REQ-91 fixed ≤200 (A262-16) |

## 4. Derived values + inheritance

| Gl. | output ← inputs | consumed by | notes |
|---|---|---|---|
| 2 | `Q_S_d_aM` ← EZ, w_s_d | A262-06,07,11–16,19–23 | **EZ and w_s_d re-typed** in A262-05 (duplicate fields `EZ`, `w_s_d` without CONS) — inherit from A262-01/04 |
| 1 | `Q_Tr_h_max` ← Q_S_d_aM, x_Q_max, Q_F, Q_R_Tr | A262-07,09 | ok |
| 3/4 | `Q_F`, `Q_R_Tr` ← q_F, q_R_Tr, A_E_k | A262-06,07 | Gl.7 duplicates Gl.3 in A262-06 (same output `Q_F`) |
| 5 | `Q_F + Q_R_Tr` ← m, Q_S_d_aM | — | output symbol is an expression; not addressable |
| 6/8 | `Q_M` ← f_S_QM, Q_S_d_aM, Q_F / ΣQ_Dr_RU, ΣQ_krit | A262-07,09 | two equations same output; choice depends on RÜB vs RÜ (no selector) |
| 9/10 | `Q_T_d_aM` ← Q_S_d_aM + m_T_aM·Q_S_d_aM | A262-07,09,27,28 | `Q_T_KA` (A262-17), `Q_T` (A262-09) = re-typed duplicates |
| 11/12 | `f_red`, `A_F_CSB_red` ← t_Reg, A_F_CSB | A262-17,24 | clamp ≥0.5 missing |
| 13/14 | `A_F_TKN_red` ← B_d_TKN, B_A_TKN_zul | A262-17,24 | identical RHS, needs source check |
| 15 | `A_ANF` ← h_zu, Q_T_d_aM, L_HF, k_fB, h_ab | — | k_fB "one order of magnitude lower than k_fA" → could derive from A262-29 `k_fA` |
| 16 | `eta_DN` ← RV, eta_VF | A262-33 | ok |
| 17/18 | `k_fA` ← d_10 ; `U` ← d_60/d_10 | A262-31 | ok |
| **missing** | `A_Fo_min_X = EZ · A_Fo_spez_X` (desc says so in A262-11), `A_F_CSB = B_CSB/f_A_F_CSB` (A262-21 desc), `V_F = A_Fu·h_F` (A262-22), `Q_GW_taeglich = EW·Q_Grauwasser` (A262-26), `A_F_VFKS_total = A_F1+A_F2`, `B_CSB_KomKA = EZ·B_CSB/1000`, `aufenthaltszeit = V/Q_Tr_h_max` | — | described in `desc` but **no equation rows** |

Re-typed duplicates: `EZ` (A262-01, A262-05, `EW` A262-09, `EW_bemessung_KA`, `EW_bemessung_KomKA`, `EW_Grauwasser`); `w_s_d` (A262-04, A262-05, `Q_T` A262-09); `filter_type` (A262-10) vs `filtertyp_gewaehlt_KA` (A262-17) vs `filter_type_KomKA` (A262-18) vs `filtertyp_KomKA` (A262-24) vs `main_filter_type` (A262-30) — five enum fields with **three different value vocabularies**; `pretreatment_selected` vs `vorbehandlung_typ` vs `primary_treatment`; `abwasser_typ` (text) vs `wastewater_type` (enum); `Q_M` vs `Q_M_KomKA`; `A_Fo_spez` vs the seven `A_Fo_spez_*` copies.

## 5. Summary
Counts: **8 table-lookup candidates** (Tables 1–18, 21) / **8 repeatable groups** / **14 conditionals** / **18 equations (+7 described but unregistered)**.

Top 5 UX wins:
1. Replace the 13 per-filter-type worksheets with one repeatable "Filterstufe" row where `filter_type` × `system_size_category` × `sewer_system_type` fills all limit columns from Tables 3–16 and auto-computes `A_min = EZ·A_spez` — removes ~60 duplicated fields and the four inconsistent filter-type enums.
2. `pretreatment_selected` → auto-fill `B_CSB/B_BSB5/B_TKN` from Table 1 (with `datenquelle_abwasser` override) and the per-type volume floors (300 l/P + 3,000 l; 1.2 m³/P; ≥2 h + 75 l/P).
3. Inherit `EZ`, `w_s_d`, `Q_S_d_aM`, `Q_T_d_aM` everywhere instead of the ~9 re-typed copies; register the seven described-but-missing equations.
4. Sewer-type gating: show A262-05 or A262-06 (not both), pick `A_Fo_spez_Tr` vs `_M`, and require the overflow filter row (T14) only for combined sewers.
5. `lining_type` / `subsoil_permeability_class` conditional block on A262-29 (geomembrane 1.5 vs 1.0 mm exception, 1 vs 2 clay layers, bentonite ≥60 cm).

Data-quality gaps: `filter_type` enum vocabularies differ across A262-10/17/18/24/30; `vorbehandlung_typ` and `abwasser_typ` are free-text twins of enums; Gl.13/14 identical RHS ("Verdacht auf OCR-Fehler"); Gl.11 lacks the 0.5 clamp; `B_Rieselr` ≥0.5 (Tab. 8) vs ≥1 (Tab. 17) conflict in the source itself; `f_A_F_CSB` unit `g/(m²·d)` but `A_Fo_spez` unit mixes `m²/P` and `m²/EW`; `Q_S_d_aM` units "l/s; m3/d" ambiguous; REQ-15 (fines ≤2 %) fires for lava sand where source allows <8 %; Table 21 aerated-gravel row truncated in transcript; Table 19 combinations exist only as images.
