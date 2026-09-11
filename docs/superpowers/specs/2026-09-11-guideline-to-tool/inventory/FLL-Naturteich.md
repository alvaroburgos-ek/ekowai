# FLL-Naturteich — Inventory (surface-inventory pattern)

## 0. Sources used
- Transcript: `C:\Users\Ekowai\Desktop\Supabase data\Guidelines knowledge markdown\FLL-Guidelines natural pool.md` (English FLL 2017 "Guidelines for the planning, construction and maintenance of private natural swimming pools", tables 1–16 present as flattened text; Table 1 columns partly interleaved). Duplicate: `C:\Users\Ekowai\Desktop\FLL Guidelines PDF\FLL-Naturteich-2017_pdftotext.txt`.
- Prod dump: `scratchpad/std/FLL-Naturteich.json` — 15 worksheets, 130 fields, 6 equations, 33 requirements.

## 1. Table-lookup candidates (category → predetermined values)

| worksheet | selector field | dependent fields filled | guideline table | override allowed? | table in transcript |
|---|---|---|---|---|---|
| FLLNT-03 | `natural_pool_type` (enum type_I…type_V, present) | `regeneration_technique` (allowed set), `regeneration_area_share` minimum (>50 %, >50 %, >30 %, per Tab. 5/6 for IV/V), `filter_flow_type` (III → slow, IV → quick), `p_binding_required` (III), filter operation mode, `swimming_test_p_total`/`swimming_test_orthophosphate` limit (0,03 for I–III, 0,01 for IV–V) | Table 1 §5 (+ Tables 2–6 per type) | Tab. 1 is the definition of the types → no override; "Dimension of the regeneration area compared to the total area" is a minimum | yes — block A |
| FLLNT-04 | `natural_pool_type` | Tab. 8 targets for the swimming area (10 params) | Table 8 §7.1.2 | "Approximate chemical values"; "If the analysis results deviate from the approximate values, the biological processes must be observed and if applicable, an advanced total water analysis must be implemented" → deviation allowed with justification | yes — block B |
| FLLNT-04 | `water_source` (tap/well/rain) | Tab. 7 fill-water targets (10 params) — same for all sources | Table 7 §7.1.1 | as above | yes — block B |
| FLLNT-05 | substrate role: filter type III / filter type IV / plant substrate (no explicit selector; derivable from `natural_pool_type`/`hydrobot_type`) | `filter_grain_size_max` (16 / 32 / 8 mm), `filter_substrate_oversize_pct` (≤15/≤15/–), `filter_substrate_elutriated_pct` (≤2/≤0,5/–), `filter_kf` (≥1e-4/≥1e-3/–), `filter_frost_resistance`, `filter_substrate_elutable_p` (≤5/≤5/–) | Table 9 §7.2.3 | requirements ("must") | yes — block C |
| FLLNT-09 | `hydrobot_type` (submergent/emersed, present) | `hydrobot_water_column` (≥80 cm / 10–50 cm), `hydrobot_substrate_thickness` (10–20 / 10–30 cm), `hydrobot_grain_size_max` (≤8 mm), `hydrobot_feed_rate` (5 m³/(m²·d)) | Table 10 §10.2.1 | "Structural requirements" | yes — block D |
| FLLNT-10 | `filter_flow_type` (slow/quick) × `filter_flow_direction` (vertical_continuous_overflow / vertical_no_overflow / horizontal) | `filter_water_column` (≥10 / – / individual ; ≥0 / – / individual), `filter_layer_thickness` (≥40 / ≥50), `filter_grain_size_max` (≤16 / ≤32), oversize ≤15 %, elutriated ≤2 / ≤0,5 %, `filter_kf` (≥1e-4 / ≥1e-3), `filter_layer_tolerance_pct` (10 %), `filter_feed_rate_slow_qmax` (5 overflow / 8 no-overflow), `filter_feed_rate_quick_qmin` (≥15) | Tables 11, 12 §10.2.2/10.2.3 | horizontal flow → "Individual verification, no further information" | yes — block E |
| FLLNT-10 | grain class (4/6, 4/8, 6/8, 8/12, 8/16, 12/16, 16/22, 16/32, 22/32) — no field; `grain_specific_surface` typed | `grain_specific_surface` m²/m³ (and pore water %) | Table 15 App. 5 | "The values were determined using dolomite gravel ... Size of the grain surface depends on its composition" → informative, override with product data | yes — block F |
| FLLNT-12 | plant group (submerged / half-height marsh / medium-tall marsh / lilies) | `plant_density_submerged_per_m2` 6–10, `plant_density_marsh_small_per_m2` 3–5, `plant_density_marsh_medium_per_m2` 5–7 | §10.4.3 | "approximate value ... applies to pot plants P 0.5 (500 cm³)" | yes — block G |

**Block A — Table 1 (l.1103–1220), reassembled by column:**
```
Feature | Type I | Type II | Type III | Type IV | Type V
technical name | without technology for water purification | with surface water purification | with controlled slow flow through the substrate filter and downstream P-binding unit (hydrobotanical system and/or technical filter) | with controlled quick flow through the substrate filter | controlled flow through the technical unit
Regeneration area | Hydrobotanical system | Hydrobotanical system | Substrate filter (usually mineral, with or without plants), hydrobotanical system, technical unit for phosphor elimination | Substrate filter (usually mineral, with or without plants) | Carrier material, e.g. plastic or mineral medium in a technical unit
Flow | natural circulation | Surface discharge and natural circulation | Surface discharge and slow controlled flow through the regeneration area | Surface discharge and quick controlled flow through the regeneration area | Surface discharge and quick or slow controlled flow through the technical unit
Filter operation during swimming season | no filter | no filter, skimmer operation intermittently | intermittent/permanent | permanent | dependent on system
Dimension of the regeneration area compared to the total area | > 50% | > 50% | > 30% | information on construction based on design refer to Tab. 5 | ... refer to Tab. 6
```
(Table 2 adds for Type I: "> 50% therefrom at least half as submerged hydrobotanical system".)

**Block B — Table 7 / Table 8 (l.1904 / 1938):**
```
Table 7 fill-up water: Ammonium ≤ 0.5 mg/l; Iron ≤ 0.2 mg/l; Ptotal ≤ 0.03 mg/l; Hardness ≥ 1.0 mmol/l (≥ 5.6 dH°); Conductivity ≤ 1000 μS/cm at 20°C; Manganese ≤ 0.05 mg/l; Nitrate ≤ 50.0 mg/l; Orthophosphate (as P) ≤ 0.01 mg/l; pH 6.0 – 9.0; Acid capacity KS 4.3 ≥ 2 mmol/l
Table 8 swimming area: Ammonium ≤ 0.3 mg/l; Ptotal ≤ 0.03 mg/l (type I-III) / ≤ 0.01 mg/l (type IV, V); Hardness ≥ 1.0 mmol/l; Conductivity ≤ 1000 μS/cm at 20°C; Nitrate ≤ 30.0 mg/l; Nitrite ≤ 0.01 mg/l; Orthophosphate (as P) ≤ 0.03 mg/l (type I-III) / ≤ 0.01 mg/l (type IV, V); pH 7.0 – 9.0; Acid capacity KS 4.3 ≥ 2 mmol/l
```

**Block C — Table 9 (l.2028):**
```
Parameter | Filter substrate type III | Filter substrate type IV | Plant substrate
Recommended maximum grain size | 16 mm | 32 mm | 8 mm
Oversized grain percentage | ≤ 15% by weight | ≤ 15% by weight | no requirement
Percentage of elutriated parts (< 0.063 mm) | ≤ 2% by weight | ≤ 0.5% by weight | no requirement
Permeability coefficient | ≥ 10-4 m/s | ≥ 10-3 m/s | no requirement
Frost resistance | is mandatory | is mandatory | no requirement
Elutable phosphorus level | ≤ 5 mg P/kg | ≤ 5 mg P/kg | no requirement
```

**Block D — Table 10 (l.2587):** `Water column height ≥ 80 cm (submergent) | 10 – 50 cm (emersed)`; `Thickness of substrate layer 10 – 20 cm | 10 – 30 cm`; `Grain size range ≤ 8 mm`; `Feed rate Qmax 5 m3/(m2 x day) | 5 m3/(m2 x day)`.

**Block E — Table 11 (slow) / Table 12 (quick) (l.2666 / 2788):**
```
Parameter | vertical, continuous full-surface overflow | vertical, no overflow | horizontal
T11 Water column height | ≥ 10 cm | — | Individual verification, no further information
T11 Thickness of the filter-effective layer | ≥ 40 cm
T11 Grain size (Filters) | ≤ 16 mm ; Oversized grain ≤ 15% by weight ; elutriated ≤ 2% by weight ; Frost resistance is mandatory ; Layer thickness tolerance 10% deviation
T11 Permeability coefficient | ≥ 10-4 m/s | ≥ 10-4 m/s | Individual verification
T11 Feed rate Qmax | 5 m3/(m2 x day) | 8 m3/(m2 x day)
T12 Water column height | ≥ 0 cm | — | Individual verification
T12 Thickness of the filter-effective layer | ≥ 50 cm
T12 Grain size (Filters) | ≤ 32 mm ; Oversized ≤ 15% ; elutriated ≤ 0.5% ; Frost resistance mandatory ; tolerance 10%
T12 Permeability coefficient | ≥ 10-3 m/s | ≥ 10-3 m/s | Individual verification
T12 Feed rate Qmin | ≥ 15 m3/(m2 x day) | ≥ 15 m3/(m2 x day)
```

**Block F — Table 15 (l.4110):**
```
Grain size | Pore water [%] | Surface [m2/m3]
4/6 43 1400 ; 4/8 43 1200 ; 6/8 43 1000 ; 8/12 44 700 ; 8/16 44 600 ; 12/16 47 500 ; 16/22 48 350 ; 16/32 47 300 ; 22/32 47 250
```

**Block G — §10.4.3 (l.3049):** "submerged plants 6 – 10 plants; half-height to tall marsh and aquatic plants 3 – 5 plants; medium height to tall marsh and aquatic plants 5 – 7 plants; lilies and lily pads depending on type. The aforementioned number of plants applies to pot plants P 0.5 (500 cm3)."

**Class tables without selector in prod:** Table 13 "Information regarding operation" (maintenance per type — `inspection_frequency` is free text); Table 14 (grain size → sample quantity → jar size for eluate tests — no field); Tables 2–6 per-type feature matrices (only Type I read; others at l.1308–1660).

## 2. Repeatable-group candidates (one of N)

| worksheet | the thing | member fields | currently modelled | aggregation + consumers |
|---|---|---|---|---|
| FLLNT-06 | **Teilfläche / zone** (swimming, regeneration, supplementary; a pool can have several regeneration zones with different techniques) | area m², zone type, depth, technique | 3 fixed scalars `swimming_area_m2`, `regeneration_area_m2`, `supplementary_area_m2` + `total_pool_area_m2` | Σ → `total_pool_area_m2`; regeneration share = Σreg/Σtotal → REQ-07; consumers FLLNT-07, -09, -10, -11, -15 |
| FLLNT-09 / -10 | **Filter / hydrobotanical unit** (Type III commonly has substrate filter + hydrobotanical + P-binding unit) | `hydrobot_type` or `filter_flow_type`+`filter_flow_direction`, `F_filter`, `h_filter`, grain class, feed rate, layer thickness, kf | one hydrobotanical set + one filter set (each single) | Σ(`filter_colonized_surface_actual`) over units → EQ-01 50×-rule; Σ(F×Qmax) → circulation |
| FLLNT-06 | **Unterwasser-Teilfläche** (ground + each submerged wall) | `pool_ground_area_m2`, `pool_submerged_wall_area_m2` | 2 scalars | Σ → `pool_underwater_surface` (EQ-PUWS) |
| FLLNT-04 | **Wasserprobe** (fill water at start, swimming area repeatedly; Tab. 8 note "Temporary fluctuations ... can occur") | date, location (fill/swim), 10 params | 21 scalars (one fill set, one swim set) | latest per location vs Tab. 7/8 → REQ-09/10 |
| FLLNT-11 | **Überlauf-/Ablaufeinrichtung** (§10.3.1 "number, type and arrangement of the water discharge/extraction devices") | type (rigid/flexible), edge length, tolerance | `overflow_type` text, `overflow_edge_length` single | Σ(edge length) ≥ 0,01 × swimming area (EQ-04) |
| FLLNT-12 | **Pflanzenart-Position** (§10.4.1 plant list) | species, group (submerged/marsh/lily), area m², density, count | `plant_species_list` json + 3 density scalars | Σ(area × density) → plant count per group |
| FLLNT-08 | **Anlagenteil / equipment element** (§8.3) | element, spec | `equipment_elements_list` json | none |
| FLLNT-13 | **Mangel** (§11.2) | description, status | `defects_noted` text | REQ-26 |

## 3. Conditional dependencies

| worksheet | driver | affected | rule + quote | encoded? |
|---|---|---|---|---|
| FLLNT-03 | `natural_pool_type` | `regeneration_area_share` min (I/II > 50 %, III > 30 %; IV/V per design) | Table 1 | REQ-07 ✓ (I/II/III) |
| FLLNT-03/-10 | `natural_pool_type` = type_III | `filter_flow_type` = slow, `p_binding_required` = true | Table 1 "downstream P-binding unit" | REQ-08 (via flow type) ✓ |
| FLLNT-03/-10 | `natural_pool_type` = type_IV | `filter_flow_type` = quick | Table 1 | nothing |
| FLLNT-03 | `natural_pool_type` ∈ {I, II} | FLLNT-10 (substrate filter) N/A; Type I "no filter" | Table 1 | nothing |
| FLLNT-04 | `natural_pool_type` | `swimming_test_p_total`/`swimming_test_orthophosphate` limit 0,03 vs 0,01 | Table 8 | REQ-10 text; VR string only |
| FLLNT-05 | pool type / substrate role | Tab. 9 column | Table 9 | VR strings "≤ 2 % slow / ≤ 0.5 % quick" |
| FLLNT-09 | `hydrobot_type` | column of Tab. 10 | Table 10 | REQ-19 ✓ |
| FLLNT-10 | `filter_flow_type` × `filter_flow_direction` | Tab. 11 vs Tab. 12 column; horizontal → individual verification (fields optional) | Tables 11/12 | REQ-20/21 ✓ for vertical; horizontal not handled |
| FLLNT-11 | `rigid_overflow_used` = true | `splash_water_tank_volume` mandatory ≥ 150 l/m² | "A water reservoir is mandatory when using rigid overflow weirs" ; "at least 150 l per square metre ... inundated water surface" | REQ-33 ✓ |
| FLLNT-11 | `overflow_edge_length` ≤ 1 m | `overflow_horizontal_tolerance_mm` ±1 instead of ±2 | "not deviate horizontally by more than +/- 2 mm or for overflow edges up to 1 m, by more than +/- 1 mm" | VR text only |
| FLLNT-11 | `physical_chemical_used` | `regeneration_technique` ≠ physical_chemical only | §10.2.5 | REQ-24 ✓ |
| FLLNT-02/-07 | `groundwater_level` present / `subsoil_type` | drainage required (§9.1) | "drainage if groundwater or stratum water present" | REQ-14 attest only |
| FLLNT-01 | `pool_use_type` | scope | §1 | REQ-01 ✓ |
| FLLNT-12 | plant group | density range | §10.4.3 | VR strings |

## 4. Derived values (equations) + inheritance
- EQ-PUWS `pool_underwater_surface` ← `pool_ground_area_m2` + `pool_submerged_wall_area_m2` → consumers FLLNT-10, -11.
- EQ-02 `filter_colonized_surface_actual` ← `grain_specific_surface` × `F_filter` × `h_filter`; EQ-03 `filter_volume_required` ← `pool_underwater_surface` × 50 / `grain_specific_surface`; EQ-01 `filter_50x_rule_met` ← actual ≥ 50 × underwater surface → REQ-22.
- EQ-04 `overflow_edge_length` ← 0,01 × `swimming_area_m2` (guide value; output is also an input field in FLLNT-11 → re-typed duplicate; `swimming_area_m2` itself re-declared in FLLNT-11 instead of inherited from FLLNT-06).
- EQ-05 `splash_water_tank_volume` ≥ 150 × `pool_underwater_surface` — **transcript says "per square metre ... inundated water surface"**, i.e. the water surface, not the colonizable underwater surface (ground + walls); check semantics.
- Missing: `total_pool_area_m2` (VR says "computed" but no equation); regeneration share = reg/total (typed as `regeneration_area_share`); `grain_specific_surface` lookup from Tab. 15; plant counts.
- Cross-standard: `sealing_type` (FLLNT-07) ↔ FLL-GAR-2023 `abdichtungs_art` (different enums); `subsoil_type` ↔ FLL-GAR `baugrund_typ` (text); `excavation_depth`/`pool_depth_max` ↔ FLL-GAR `gewaesser_tiefe_m`/`wassertiefe_max`.
- Stray fields with no clause: `type_III`, `submergent`, `emersed`, `vertical_continuous_overflow`, `vertical_no_overflow` (enum values leaked as fields).

## 5. Summary
Counts: 8 table-lookups / 8 repeatable groups / 14 conditionals / 6 equations.

Top 5 UX wins:
1. `natural_pool_type` as the master selector: fills regeneration share minimum, filter flow type, P-binding flag, Tab. 8 P-limits and hides the filter/hydrobotanical worksheets that do not apply (Type I/II).
2. Filter/hydrobotanical units as repeatable rows: each row picks technique + flow direction, receives its Tab. 10/11/12 column as read-only limits, computes colonized surface from a Tab. 15 grain-class pick, and the 50×-rule aggregates across rows.
3. Zones as repeatable areas (swimming / regeneration / supplementary; ground / walls) with totals, share and underwater surface computed — removes 4 typed totals.
4. Water analyses as dated rows per location with Tab. 7/8 targets shown inline (P-limit switched by type).
5. Plant plan rows (species, group, area) with §10.4.3 density ranges and plant counts computed.

Data-quality gaps: 5 orphan fields without clause (`type_III`, `submergent`, `emersed`, `vertical_*`); `swimming_area_m2` declared twice (FLLNT-06, -11); `overflow_edge_length` and `splash_water_tank_volume` are both inputs and equation outputs; EQ-05 uses underwater surface where the text says inundated water surface; `total_pool_area_m2` "computed" without equation; `regeneration_area_share` typed instead of derived; REQ-10 condition truncated in dump; Table 13 (operation per type) and Table 14 not in prod; hydrobot feed-rate unit "m³/(m²·d)" vs transcript "m3/(m2 x day)" fine; units OK otherwise.
