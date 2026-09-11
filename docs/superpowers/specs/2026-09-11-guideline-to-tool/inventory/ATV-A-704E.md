# ATV-A-704E — Inventory (surface-inventory pattern)

## 0. Sources used
- **NO TRANSCRIPT.** Only source on disk is the scanned PDF `C:\Users\Ekowai\Desktop\Ciruclar economy, sustanability and water test\ATV A 704E\ATV-A-704E-Operating-Methods-for-Wastewater-Analysis.pdf` ("scanned, no embedded text" per the encoder's `_encode_report.md` in the same folder). Values below are taken from the prod dump (validation_rules, requirement descriptions) and from `_encode_report.md`, which states the IGC-Card numbers were read from the page images; they are NOT verbatim-quoted here and must be re-verified against the PDF before any table is encoded (SR-1).
- Prod dump: `scratchpad/std/ATV-A-704E.json` — 12 worksheets, 91 fields (of which 23 `attest_*` booleans), 6 equations, 30 requirements.

## 1. Table-lookup candidates (category → predetermined values)

| worksheet | selector field | dependent fields filled | guideline table | override allowed? | table in transcript |
|---|---|---|---|---|---|
| ATV-A-704E-08 | `qa_measure` (enum, 9 values present: multiple_determinations / measurement_of_standards / plausibility_checks / equivalency_measurements / parallel_measurements / pipettes / ph_meter_check / heating_thermoblock_check / measuring_device_check) | `qa_minimum_frequency` (text today), `qa_quality_target_pct` | Annex A, IGC-Card 2 Sheet 1 "Recommendations by DWA-WG IG-4.3" | encode report: "manufacturer/legislator frequency takes precedence if defined" (CR-024) — so override = stricter external spec | VALUES NOT IN TRANSCRIPT (encode report lists: random error <10 %; standards after each 10th sample, ≥1×/month; plausibility <20 % (<25 % lower range), 1×/quarter; equivalency/parallel <20 %, 1×/year; pipettes 100–5000 µl <2 %, >1000 µl <1 %; pH-meter <0.2 pH, 1×/month; thermoblock <3 °C, 1×/year) |
| ATV-A-704E-11 | `testing_equipment` (enum, 16 values present) | `monitoring_interval` (enum annually…every_two_weeks — today chosen by hand), tolerance field to show (`pipette_deviation_pct`, `heating_device_deviation`, `photometer_check_done`) | IGC-Card 9 monitoring-frequency table | CR-024 (frequency "at least"; manufacturer precedence) | VALUES NOT IN TRANSCRIPT (intervals said to be in enum notes) |
| ATV-A-704E-11 | `pipette_tested_volume` (VR lists 0.100 / 0.200 / 0.500 / 1.000 / 2.000 / 5.000 ml) | permitted range (0.098–0.102 … 4.950–5.050 ml) and `pipette_deviation_pct` limit (≤2 % up to 0.500 ml, ≤1 % from 1.000 ml) | IGC-Card 9 Sheet 3 | fixed | VALUES NOT IN TRANSCRIPT (CR-025 text carries the 2 %/1 % split) |
| ATV-A-704E-01 | `parameter_name` (enum: settable_substances / bod5 / cod / nh4_n / no3_n / no2_n / p_total / tn / toc) | reference method (DIN 38404/38405/38406/38409, DIN EN 1899 per CR-030), unit, typical working range | §2.2 abbreviation table + Literature | — | VALUES NOT IN TRANSCRIPT |
| ATV-A-704E-03 | `expected_concentration_range` | acceptable measuring-range window "20 % to 80 % interval of the measuring range" (CR-010 description) | §4.2 | "preferably" | text only in CR-010 |
| ATV-A-704E-06 | `sample_type` × `parameter_name` | preservation, `storage_temperature`, `max_storage_time`, `container_material` | IGC-Card 8 (Sampling and preservation) | — | VALUES NOT IN TRANSCRIPT |

## 2. Repeatable-group candidates (one of N)

| worksheet | the thing | member fields | currently modelled | aggregation + consumers |
|---|---|---|---|---|
| ATV-A-704E-09 | **Einzelbestimmung i** in a multiple determination (IGC-Card 3) | `single_result_i`, `deviation_single_pct` | single scalar `single_result_i` + `n_determinations` + `mean_value` | `mean_value` = Σ/n (EQ-01), `n_determinations` = count(rows), max|deviation| ≤ `qa_quality_target_pct` → CR-019 |
| ATV-A-704E-09 | **Verdünnungs-/Aufstockungsversuch** (IGC-Card 5 sheets 1 and 3, one per parameter/date) | `sample_volume`, `total_volume`, `measured_value_diluted_sample`, `calculated_value`; `volume_sample`, `volume_standard`, `concentration_standard`, `NSS`, `measured_value_spiked_sample` | single scalars | per row EQ-03/EQ-04; pass if within target → CR-020/021 |
| ATV-A-704E-10 | **Äquivalenz-/Parallelmessung** (IGC-Card 6/7 rows: date, parameter, operating value, reference value) | `measured_value_operating`, `nominal_value_reference`, `measured_value_reference`, deviations | single scalars | per row EQ-05/06; all ≤ target → CR-022/023 |
| ATV-A-704E-08 | **QS-Maßnahme** (one row per `qa_measure`: frequency, target, count performed) | `qa_measure`, `qa_minimum_frequency`, `qa_quality_target_pct`, `survey_measure_count` | single enum + 3 scalars (only one measure representable) | all measures present → CR-008/CR-014 |
| ATV-A-704E-11 | **Prüfmittel** (IGC-Card 9: one row per instrument) | `testing_equipment`, `monitoring_interval`, last check date, result, tolerance fields | single enum + scalars | every item monitored → CR-024 |
| ATV-A-704E-12 | **Mitarbeiter** (IGC-Card 10) | `employee_qualification`, `instruction_training_record`, date | 2 text fields | all staff documented → CR-018 |
| ATV-A-704E-12 | **Abweichung** (IGC-Card 11) | `deviation_feature`, `deviation_cause`, `deviation_measure`, `deviation_iqc_card_ref`, date, result | 4 fields (one deviation) | none; log |
| ATV-A-704E-01/-03 | **Parameter / Betriebsmethode** (a plant runs several operating methods) | `parameter_name`, `application_mode`, `expected_concentration_range`, `validation_range_coverage_pct`, `method_selected_suitable` | single enum + scalars | each method evaluated → CR-003/009 |

## 3. Conditional dependencies

| worksheet | driver | affected | rule (from prod text; not transcript-verified) | encoded? |
|---|---|---|---|---|
| ATV-A-704E-11 | `pipette_tested_volume` ≤ 0.5 vs ≥ 1.0 ml | `pipette_deviation_pct` limit 2 % vs 1 % | CR-025 "<=2 % for 0.100-0.500 ml; <=1 % for 1.000-5.000 ml" | CR-025 ✓ |
| ATV-A-704E-11 | `testing_equipment` = heating_device_thermoblock | `heating_device_deviation` ≤ 3 °C required | CR-026 "< 3 degC at 100 degC and 148 degC" | CR-026 (not gated by equipment) |
| ATV-A-704E-11 | `testing_equipment` = photometer | `photometer_check_done` annual | CR-027 | attest only |
| ATV-A-704E-11 | `testing_equipment` | `monitoring_interval` | IGC-Card 9 | nothing (enum typed) |
| ATV-A-704E-08 | `qa_measure` | `qa_quality_target_pct`, `qa_minimum_frequency` | IGC-Card 2 Sheet 1 | nothing |
| ATV-A-704E-09/-10 | `qa_quality_target_pct` (from -08) | deviation limits in CR-019/022/023 | cross-worksheet reference | ✓ (uses symbol from WS-08) |
| ATV-A-704E-03 | `application_mode` = parallel_to_reference | ATV-A-704E-10 parallel analysis required (`parallel_analysis_performed`) | §4.1/§4.4 | nothing |
| ATV-A-704E-03 | `expected_concentration_range` vs measuring range | 20–80 % window | CR-010 | attest only |
| ATV-A-704E-05 | `multiple_determination_performed` / `parallel_analysis_performed` / `equivalency_check_performed` | worksheets -09/-10 required | §4.4 | nothing |
| ATV-A-704E-06 | `sampling_method` = automatic | `precipitation_influence`, storage temperature relevant | IGC-Card 8 | nothing |

## 4. Derived values (equations) + inheritance
- EQ-01 `mean_value` ← Σ`single_result_i`/`n_determinations`; EQ-02 `deviation_single_pct` ← 100·(`single_result_i` − `mean_value`)/`mean_value` (both need rows).
- EQ-03 `calculated_value` ← (`total_volume`/`sample_volume`)·`measured_value_diluted_sample` (IGC-Card 5 Sheet 1, verbatim per encode report).
- EQ-04 `NSS` ← (`volume_sample`·`measured_value_original_sample` + `volume_standard`·`concentration_standard`)/(`volume_sample`+`volume_standard`) (IGC-Card 5 Sheet 3).
- EQ-05 `deviation_equivalency_pct`; EQ-06 `deviation_parallel_pct` (IGC-Card 6/7).
- Outputs `mean_value`, `calculated_value`, `NSS`, `deviation_*` are all also plain input fields with VR ">= 0" → re-typable duplicates. `sample_volume` (Sheet 1) and `volume_sample` (Sheet 3) are two symbols for the same physical quantity.
- No consumer_worksheets on the equation outputs; `qa_quality_target_pct` (WS-08) is the only cross-worksheet input. `sample_type`/`sampling_method` duplicate ISO-5667-10 `main_sampling_type`/`composite_mode` and `probennahme_typ` in DWA-M-1200-2 (different enums).

## 5. Summary
Counts: 6 table-lookups (all values unverified — no transcript) / 8 repeatable groups / 10 conditionals / 6 equations.

Top 5 UX wins:
1. IGC-Card 2 as a lookup: pick `qa_measure` → frequency and % target filled; make it a repeatable list so all nine measures exist per plant.
2. IGC-Card 9 as repeatable Prüfmittel rows with interval and tolerance auto-filled from `testing_equipment`, pipette ranges by volume.
3. Multiple determinations as rows (single results) → mean, n and max deviation computed; CR-019 evaluated on the worst row.
4. Dilution / standard-addition / equivalency / parallel as dated rows per parameter with the four IGC formulas computed and compared with the target inherited from WS-08.
5. Replace the 23 `attest_*` booleans of §1–§5 with the concrete evidence rows above (instruction records, deviation log).

Data-quality gaps: no machine-readable transcript (scanned PDF) — every table value above is second-hand; all six equation outputs are editable inputs; `sample_volume` vs `volume_sample` duplicate; `qa_minimum_frequency` is text although a `qa_frequency` enum was defined in the workbook; `successive_supervision_interval`/`max_storage_time` text where enums exist; `iqc_card_module` and `deviation_iqc_card_ref` share one enum but different roles; unit "-" on many numeric fields; 23 attest booleans carry the entire §1–§5 normative text.
