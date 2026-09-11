# DWA-M-277E — Surface-inventory pattern inventory

## 0. Sources used
- Transcript: `C:\Users\Ekowai\Desktop\Guidelines\DWA-M-277E\DWA-M_277E (1).md` (English edition, LaTeX; copy in `Desktop\Format data\DWA 277\`).
- Prod dump: `scratchpad/std/DWA-M-277E.json` — **24 worksheets, 198 fields**, 22 equation rows (5 real: Eq. 1–4 + Q_WB + buffer; rest are worked examples/duplicates), 88 requirements (≈40 are `-2` duplicates).
- Vault: `encoding-audit-2026-07-01/DEEP-DWA-M-277E.md`, `form-guides/DWA-M-277E.md`, `_site_audit/DWA-M-277E/_gate_disposition.md`.

## 1. Table-lookup candidates

| worksheet | selector field | dependent fields filled | guideline table | override allowed? (quote) | table in transcript? |
|---|---|---|---|---|---|
| M277E-06/07 → 17 | `source_set` (json multi-select: shower, bathtub, hand_washbasin, washing_machine, kitchen_sink, dishwasher) | `Q_GW_P_shower` (10-50), `_bathtub` (0-30), `_hand_washbasin` (10-15), `_washing_machine` (10-15), `_kitchen_sink` (5-10), `_dishwasher` (5-10); `greywater_type` (A1/A2/B1/B2 derived from set); `Q_GW_P_total` (A1 20-85, A2 40-100, B1 50-115, B2 60-130); `COD`, `SS`, `pH` ranges per source | Table 2 §5 | "The load values listed below serve as orientation values." / §9.1 "determination of demand and supply not only based on data from the literature" → ranges, engineer picks value; site data override | yes — T2 below |
| M277E-06 | `greywater_type` (enum) | `total_coliforms_untreated`, `faecal_coliforms_untreated` (order-of-magnitude ranges) | Table 3 §5 | orientation ("wide range … clearly evidenced") | yes — T3 |
| M277E-08 | (none; DWA-A-272 / Sievers columns) | `COD`, `BOD5`, `TN`, `TP`, `TS`, `TOS` design values | Table 1 §5 | "data from Sievers et al. (2014) are recommended as design values." → default column = Sievers mean/85-percentile, other columns selectable | yes — T1 |
| M277E-15/16 | `use_category` / consumer type (Toilets, Personal hygiene, Washing machine, Cleaning/Irrigation, Cooking/Drinking, Kitchen/Dishwasher) — **no consumer enum**; `Q_SW_P` is one scalar | `Q_SW_P` per application (33/44/15/7/5/7 l/(P·d)); `Q_SW_A` (60 l/m² over season) | Table 5 §9.2 (BDEW 2015) | "Table 5 provides assistance in determining the service water demand." (assistance) | yes — T5 |
| M277E-14 → 10/23/24 | `quality_category` (C1/C2) × `use_category` | limits: `turbidity_NTU` <2, `BOD5` <5, `o2_saturation_pct` >50, `pH_value` 6.5–9.5, `total_coliforms_treated` <10,000, `e_coli` <1,000, `p_aeruginosa` <100, `sampling_location`; allowed `treatment_method` set (C1: FB/SF/FLB/Stabilisation; C2: + MBR, + UV/UF/RO); allowed uses (+/−) | Table 4 §6.3 | Laundry: "strongly recommended to apply … C2"; UV footnote "*UV Transmission > 60 % is recommended." | yes — T4 |
| M277E-11 | `use_category IN {irrigation_*}` → DIN 19650 suitability class (external) | `DIN_19650_class_documented` | DIN 19650 Table 4 (external) | "each of which must be verified depending on the intended use" | not in transcript (external standard) |
| M277E-01/05 | `storage_capacity_m3` (≤50 / >50) | `MBO_notification_only` / `MBO_authorisation_required` | §4.2 MBO 2002 §61 | "storage capacity up to 50 m³ usually requires a mere notification" | text |

Missing-field gaps: no per-consumer rows for Table 5 (toilet vs washing machine vs irrigation) — `Q_SW_P` is a single scalar although Eq. (1) sums over i; no "quality of greywater per source" beyond volumes (Table 2 COD/SS/pH per source unused); Table 4 treatment-method allowlist per category not encoded (`treatment_method` enum is flat).

Verbatim (file `DWA-M_277E (1).md`):
```
Table 2: Quality of separated greywater flows from different sources of origin (DWA 2008; KEYSERS 2007; fbr 2005)
Parameter            | Shower | Bathtub          | Hand washbasin | Washing machine | Kitchen sink | Dish washer
Water volume (l/P·d) | 10-50  | 0-30 (200 l/week)| 10-15          | 10-15           | 5-10         | 5-10
Organic load         | very low (3 cols)                           | moderate        | moderate high | moderate high
COD                  | 80-200 (3 cols)                             | 500-800         | 400-800 (2 cols)
Load (g/d)           | 0.8-10                                      | 5-12            | 2-8
SS (mg/l)            | 7-120                                       | 80-280          | 130-1,300
pH-Value (-)         | 5-8.6                                       | 9.3-10          | 6.3-7.4
Hydraulic loading (l/min) | 6-25 | 20-50 | 3-15 | 20-30 | 10-20 | 10-30
Greywater type: A1: 20 l/(P·d) - 85 l/(P·d) ; A2: 40 - 100 ; B1: 50 - 115 ; B2: 60 - 130
§5: Type A1 bathtubs+showers ; A2 + hand washbasins ; B1 A2 + washing machines ; B2 + and/or kitchen. "approx. 75 l/P·d is generated as greywater in private households"

Table 3: Microbiological contamination of untreated greywater (fbr 2005; KEYSERS 2007)
Parameter               | Type A    | Type B1   | Type B2
Total coliforms (1/ml)  | 10^1-10^5 | 10^2-10^6 | 10^5-10^8
Faecal coliforms (1/ml) | 10^1-10^5 | 10^2-10^6 | 10^2-10^6

Table 1: Greywater quality — Sievers et al. 2014 column (mean | 85 percentile): Water volume 68 | 80 l/(P·d); TS 103 | 137.5 mg/l, 7 | 11 g/(P·d); COD 838 | 1,038 mg/l, 57 | 83 g/(P·d); BOD5 456 | 650 mg/l, 31 | 42 g/(P·d); TN 15 | 17.5 mg/l, 1 | 1.4 g/(P·d); TP 6 | 6.5 mg/l, 0.4 | 0.5 g/(P·d). (fbr 2005 from-to: COD 400-700 mg/l; TN 10-17; TP 3-8. DWA 2008 from/to/median: COD 93/1,360/627 mg/l; BOD5 13/413/240; TN 1/23/13.3; TP 1/29/6.7; TOS 28/45/44 g/(P·d))

Table 4: Quality requirements for treated greywater and the treatment processes
Use category | C1 (Treatment/Stabilisation, Type A) | C2 (Treatment and hygienisation, Type A + Type B)
Turbidity | - | < 2 NTU ; BOD5 | - | < 5 mg/l ; O2 Saturation | > 50 % | > 50 % ; pH | 6.5-9.5 | 6.5-9.5
Total coliforms | No requirement | < 10,000 / 100 ml ; E. coli | No requirement | < 1,000 / 100 ml ; P. aeroginosa | No requirement | < 100 / 100 ml ; sampling | - | Reservoir/Consumer
Toilet flushing (private) | + | + ; Irrigation (private) lawn, ornamental plants | - | + ; Irrigation crop plants | - | + ; Laundry (private)* | - | + ; Toilet flushing (public) | - | +
Exemplary processes | FB, SF, FLB, Stabilisation | FB, SF, FLB, MBR + UV, UF, RO
Note: *UV Transmission > 60 % is recommended.

Table 5: Daily water consumption in household according to application (BDEW 2015), litres per capita and day
Toilets 33 | Personal hygiene 44 | Washing machine 15 | Cleaning/Irrigation 7 | Cooking/Drinking 5 | Kitchen/Dishwasher 7
Example §9.2: Q_SW = 25 P · 33 l/(P·d) toilet + 60 l/m² · 150 m² / 180 d kitchen garden = 875 l/d ; "Minimum service water quality: C2 due to the irrigation of the kitchen garden."
Eq. (1) Q_SW = Σ(Q_SW-P,i · P_i) + Σ(Q_SW-A,j · A_j) ; Eq. (2) Q_GW = Σ(Q_GW-P,i · P_i) ; Eq. (3) Q_GWT = Q_GW when Q_SW > Q_GW ; Eq. (4) Q_GWT = Q_SW when Q_GW > Q_SW ; Q_WB = Q_GW − Q_SW = 0 (l/d)
```

## 2. Repeatable-group candidates

| worksheet | the thing | member fields | currently modelled | aggregation + consumers |
|---|---|---|---|---|
| M277E-06/07/17 | **Grauwasserquelle i** (per source: type, persons P_i, Q_GW-P,i from Table 2) | `source_set` (json), `Q_GW_P_<source>` ×6, `P`/`max_inhabitants` | json set + 6 fixed scalars + one global P | Σ(Q_GW_P,i·P_i) → `Q_GW` (Eq. 2) → `Q_GWT`, `Q_WB`; set → `greywater_type` |
| M277E-15/16 | **Brauchwasser-Verbraucher i** (application: toilet, washing machine, irrigation …; P_i or A_j; Q_SW-P/Q_SW-A from Table 5) | `Q_SW_P`, `Q_SW_A`, `A`, `irrigation_season_length`, `use_category` | single scalars (one application only) | Σ(Q_SW-P,i·P_i)+Σ(Q_SW-A,j·A_j) → `Q_SW` (Eq. 1); max quality → `quality_category` ("Decisive for system dimensioning is the highest quality standard") |
| M277E-10..13 | **Nutzungsart** (a project may serve toilet + laundry + irrigation) | `use_category`, `laundry_cleaning_application`, `application_type_commercial`, per-use attestations | 4 sibling worksheets, single `use_category` enum | max(C1/C2) → `quality_category`; each use adds its own gate (DIN 19650, C2 for laundry) |
| M277E-09/03 | **Mikrobiologischer Parameter** (Annex B: total coliforms, faecal coliforms, streptococci, colony counts, Salmonella, Giardia, Cryptosporidium × source) | 8 scalar fields duplicated on -03 and -09 | scalars | per-parameter range by source (Annex B), no aggregation |
| M277E-24/10 | **Ablaufprobe** (treated-water sample at reservoir/consumer with turbidity, BOD5, O2, pH, coliforms, E. coli, P. aeruginosa) | 7 quality fields (×2 copies) + `sampling_location` | single values | each vs Table 4 C2 limits; repeated sampling over time |
| M277E-21 | **Speicher** (pre-storage, post-storage, buffer) | `pre_storage_volume_l`, `post_storage_volume_l`, `V_buffer`, `storage_capacity_m3` | 4 scalars | Σ → `storage_capacity_m3` (MBO 50 m³ threshold); `V_buffer ≥ Q_GWT·1 d` |
| M277E-21 | **Pumpe** (single/multi) | `pump_configuration`, `booster_pump_capacity`, `pump_station_capacity` | scalars | n/a |
| M277E-18 | **Bilanzperiode** (base period vs irrigation season) | `Q_WB_base`, `Q_WB_irrig`, `V_*_annual` | 2 fixed period scalars + 5 annual | Σ over periods → `V_treated_annual`, `V_surplus_annual`, `V_topup_annual`, `drinking_water_savings_rate` (no equations) |

## 3. Conditional dependencies

| worksheet | driver | affected | rule + quote | encoded? |
|---|---|---|---|---|
| M277E-06 | `source_set` | `greywater_type` (A1 = bath+shower; A2 = +basin; B1 = +washing machine; B2 = +kitchen) | §5 type definitions (quoted above) | nothing — type typed separately; REQ-02 only checks membership |
| M277E-14 | `greywater_type` + `use_category` | `quality_category`: C1 only for Type A + private toilet; else C2 | Table 4 rows; "C1: … greywater of the Type A … toilet flush water in private sector" | REQ-03 (C1 ⇒ Type A), REQ-32 (laundry ⇒ C2); irrigation/public-toilet ⇒ C2 **not** encoded |
| M277E-14 | `quality_category == C2` | Table-4 limits active (turbidity, BOD5, coliforms, E. coli, P. aeruginosa, sampling) | Table 4 | REQ-08/09/14/14E/15 guarded IF C2 ✓; `turbidity_NTU_C1` "no requirement" field is dead |
| M277E-19/20 | `quality_category` | allowed `treatment_method`: C1 {FB,SF,FLB,Stabilisation}; C2 {FB,SF,FLB,MBR}+{UV,UF,RO}; `selected_hygienisation` required for C2 | Table 4 "Exemplary processes" | nothing |
| M277E-20 | `use_category == laundry_private` | `UV_transmission_pct` > 60 recommended | Table 4 note | VR text only |
| M277E-11 | `use_category IN {irrigation_lawn, irrigation_crops}` | `DIN_19650_class_documented` required; `Q_SW_A`/`A`/season visible | §6.2.4 | REQ-24 unguarded (`== true` always) |
| M277E-12 | `building_type == rented_apartment` AND laundry/cleaning use | `drinking_water_option_available` must be true | "In rented apartments the user must also have the possibility to use drinking water for these purposes (BVerwG Az. 8 C 41.09, 2010)." | REQ-30 guarded on building_type only |
| M277E-13 | `building_type == public_commercial` or several households | treatment indispensable; external standard tailoring | §6.1, §6.2.3 | attest booleans |
| M277E-01/05 | `storage_capacity_m3 > 50` | MBO authorisation vs notification | §4.2 | REQ-29 ✓ (but two booleans typed instead of derived) |
| M277E-01/24 | `discharge_into_water_body` | `WHG_permit_present`, AbwV Annex 1 basis, authority coordination | §4.3, §6.4 | REQ-23 ✓ |
| M277E-21 | `inflow_type == pump_station` | `pump_station_capacity` visible; extraneous-water protection | Annex A | nothing |
| M277E-18 | `Q_GW` vs `Q_SW` | Eq. 3 vs Eq. 4 branch; surplus → "Überschuss zur Kanalisation", deficit → top-up | §9.4 | Eq. 3/4 both encoded as identical `min()`; sign of `Q_WB` not used |
| M277E-16 | `irrigation_season_length` | area demand spread over season (60 l/m² / 180 d) | Example §9.2 | not an equation |
| M277E-24 | `owner_or_user_change` | `authority_notification_sent` again | TrinkwV §13(4) | nothing |

## 4. Derived values + inheritance

| Eq. | output ← inputs | consumed by | notes |
|---|---|---|---|
| (1) | `Q_SW` ← Σ Q_SW_P,i·P_i + Σ Q_SW_A,j·A_j | M277E-08,10,18,24 | SUM over one scalar each; **duplicated on M277E-06 and -16**; `Q_SW` field exists on -06 and -16 |
| (2) | `Q_GW` ← Σ Q_GW_P,i·P_i | M277E-08,10,18,24 | duplicated -07/-17; six per-source scalars not referenced by input_symbols (`Q_GW_P` generic) |
| (3)/(4) | `Q_GWT` ← min(Q_GW, Q_SW) | M277E-09,11,19,20,21,24 | duplicated -08/-18 + "Ex. 9.4" copy |
| QWB | `Q_WB` ← Q_GW − Q_SW | M277E-10,11,23,24 | duplicated; REQ-07 re-checks the identity |
| Buffer | `V_buffer` ← Q_GWT · 1 d | REQ-19 | duplicated -09/-21; unit l vs `storage_capacity_m3` m³ |
| worked examples | `Ex. 9.2`, `Ex. 9.3-A1/A2`, `Ex. 9.4`, `Ex. 9.4-WB` | — | literal constants as "equations" (no inputs) — should be test fixtures, not engine rows |
| missing | `greywater_type ← f(source_set)`; `quality_category ← max over uses`; `Q_GW_P_total ← Σ selected sources`; `storage_capacity_m3 ← (pre+post+buffer)/1000`; `MBO_* ← storage ≤/> 50`; annual balance (`V_*_annual`, `drinking_water_savings_rate`) | — | all described, none registered |

Re-typed duplicates: `P` / `max_inhabitants` / `avg_inhabitants`; `A` (-01, -11); `source_set` (-02, -06); `greywater_type` (-02, -06); `quality_category` (-04, -14); `use_category` (-04, -10); `Q_GW_P*` ×7 (-03, -07); `Q_SW_P`/`Q_SW_A` (-05, -15); `Q_SW` (-06, -16); `Q_GW` (-07, -17); `Q_GWT`/`Q_WB` (-08, -18); COD/TN/TP/TS/TOS/SS (-03, -08); Annex-B microbiology ×8 (-03, -09); Table-4 treated-water limits ×7 (-10, -24); `installation_location`, room dims ×4, `inflow_type`, `pump_station_capacity`, `overflow_below_backed_up_water`, booster ×2, `V_buffer`, `installation_frost_free`, backfeed/labelling/separation booleans (-09 vs -21/-22/-23); `discharge_into_water_body` (-01, -04); `MBO_*` (-01, -05); `DIN_19650_class_documented` (-04, -11); `drinking_water_option_available` (-09, -12); `WHG_permit_present`, `handover_certificate_present`, `maintenance_contract_present`, `user_manual_handed_over`, `owner_or_user_change`, `authority_notification_sent` (-11 vs -23/-24); `treatment_method` (-09, -19); `UV_transmission_pct` (-09, -20). **M277E-09 (30 fields) is a near-complete copy of -21/-22/-23** and its title (microbiology) doesn't match its content. Roughly 90 of 198 fields are copies.

## 5. Summary
Counts: **7 table-lookup candidates** (Tables 1–5 + DIN 19650 + MBO threshold) / **8 repeatable groups** / **14 conditionals** / **5 real equations (+17 duplicate/example rows; +6 described, unregistered)**.

Top 5 UX wins:
1. Repeatable **Grauwasserquelle** rows (source ✓, P_i, Q_GW-P,i pre-filled from Table 2 range with a chosen default) that derive `greywater_type` (A1/A2/B1/B2) and Σ → `Q_GW` — replaces json set + 6 scalars + typed type on two worksheets.
2. Repeatable **Verbraucher** rows (application from Table 5 → Q_SW-P, or area+season → Q_SW-A) summing to `Q_SW`, with `quality_category` auto-set to the highest requirement across uses (C2 if any irrigation/laundry/public toilet).
3. `quality_category` drives Table-4 limit block visibility and the allowed `treatment_method`/`selected_hygienisation` list (C1: FB/SF/FLB/Stab; C2: +MBR, +UV/UF/RO) with the UV >60 % hint on laundry.
4. Collapse the ~90 duplicate fields: one owner per symbol (M277E-09 dissolved into -21/-22/-23), inherit `Q_GW`, `Q_SW`, `Q_GWT`, `Q_WB` by reference, and drop the worked-example "equations".
5. Derive `storage_capacity_m3` from the storage rows and `MBO_notification_only`/`MBO_authorisation_required` from the 50 m³ threshold; derive the annual balance fields (`V_*_annual`, savings rate) from Q_WB per period.

Data-quality gaps: Eq. (3)/(4) identical formulas; 5 example rows have empty `input_symbols`; ~40 `-2` duplicate REQ codes (some `warn` vs `block` mismatch e.g. REQ-21 vs REQ-21-2, REQ-28 vs -28-2); `installation_location` enum has 3 values but VR names 4 (in_house, buried_walkable, buried_driveable_car, buried_driveable_lorry — Annex A form); `building_type` enum 4 values vs VR 11 (family_home … training_institution); `sampling_location` VR `{reservoir_or_consumer, none}` vs enum 3 values; units: `total_coliforms_untreated` 1/ml (Table 3) vs `_treated` 1/100 ml (Table 4) — correct but easy to confuse; `Q_GW_P` unit l/(P·d) but symbol table says l/d; `V_buffer` l vs `storage_capacity_m3` m³; REQ-24 and REQ-13 unguarded; `turbidity_NTU_C1` is a "no requirement" placeholder field; M277E-05 titled MBO but holds Q_SW_P/Q_SW_A; M277E-03 titled NASS but holds Q_GW_P×7 and microbiology.
