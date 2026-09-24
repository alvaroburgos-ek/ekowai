# Plan 3 — DWA-M-277E (`m277e`) — Task 4 report

- **Status:** DONE_WITH_CONCERNS (every concern is a sign-off block; one is cross-standard infra — m277e-I-1 — and blocks the APPLY of every Plan-3 seed migration, not this task)
- **Model / effort:** Claude Opus 5 (`claude-opus-5[1m]`), effort as dispatched · **CLI:** claude (version not re-checked in this subagent session; the user declines updates) · **Date:** 2026-09-17
- **Branch:** `feat/guideline-to-tool`, worktree `C:\Users\Ekowai\_wt-g2t`, base `43f23dc`
- **Nothing applied to prod.** No `apply-migration`, `drizzle-kit`, `vercel`, or DB write. Prod was read ONLY by `node scripts/regulation-tables/build-prior-snapshot.mjs DWA-M-277E m277e` (read-only tx) and `node scripts/verification/prod-query.mjs --sql "<SELECT …>"` (worksheet titles, `standards.version`, the 22 equation rows with ids/formulas/status, the 63 compliance rows, the units/descriptions of the M277E-01/-05/-18/-21 fields, and the two `information_schema` / count queries behind m277e-I-1). `.env.local` never printed; confirmed gitignored (`git check-ignore .env.local`).
- **SR-1 source:** every seeded value and every cue was read in this session from `C:\Users\Ekowai\Desktop\Guidelines\DWA-M-277E\DWA-M_277E (1).md` (English edition, 1108 lines, LaTeX tables); quote spans were lifted mechanically by line range (a throwaway `gen-quotes.mjs` in the scratchpad), never retyped; the inventory was used for pointers only (its pointers were correct; its counts were not — see §8).

## 1. Counts table

| slug | tables | rows lifted | rows unreadable | registers | select_one | select_many | lookup_fill | field visible_when | section visible_when | equations new | equations staged | sign-off entries | tokens in | minutes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `m277e` | 9 | 38 (38/38 verbatim) | 0 skipped; 1 table kept `imported_unverified` (TABLE4_USES — the row-group header cell is an image, U-1); Tab. 1 fbr/DWA columns + TOS/K/S rows, Tab. 2 nutrient/microbial text rows, Annex B deliberately not seeded (J-2, residue) | 7 (all `create`) | 4 (1 `create` `sievers_statistic` + 3 UPDATE `keep_prod` for the C2 rule) | 0 | 16 (all `create`: 2 text on TABLE3, 6 Sievers, 8 Tab.-4 limits) | 23 (18 UPDATE + 5 on created limit fields) | 0 | 14 | 5 rulings (R-1 Eq. 2, R-2 Eq. 1, R-3 12 duplicate rows, R-4 Buffer, R-5 storage) + 3 derivations (D-1…D-3) + 6 gates (G-1…G-6) | 30 (+8 observations) | ≈ 0.56 M (tool-marker delta 15.00 M → 14.44 M at report time) | ≈ 65 |

Field entries: 51 = 33 `create` (grauwasserquellen, greywater_type_code, Q_GW_rows, total_coliforms_untreated_range, faecal_coliforms_untreated_range, sievers_statistic, Q_GW_P_sievers, COD_sievers, BOD5_sievers, TN_sievers, TP_sievers, TS_sievers, nutzungsarten, verbraucher_sw, bewaesserung_sw, Q_SW_rows, quality_category_code_rows, mbo_authorisation_code, treatment_method_allowed, speicher_277, storage_capacity_calc_m3, turbidity_limit, bod5_limit, o2_sat_min, ph_min_limit, ph_max_limit, total_coliforms_limit, e_coli_limit, p_aeruginosa_limit, ablaufproben_treated, treated_samples_count, treated_samples_fail, bilanzperioden) + 18 UPDATE (visible_when on M277E-10 turbidity_NTU / BOD5 / total_coliforms_treated / e_coli / p_aeruginosa / sampling_location, M277E-12 drinking_water_option_available, M277E-19 selected_hygienisation, M277E-20 membrane_process_selected / uv_disinfection_used, M277E-21 + -09 pump_station_capacity, M277E-11 + -24 WHG_permit_present, M277E-24 turbidity_NTU / total_coliforms_treated / e_coli / p_aeruginosa). Derived-output fields (`widget='derived'`): 9.

## 2. Raw test output

`pnpm test` (after all changes; the whole-suite run preceded the eslint tidy-up of five unused quote constants in `field-configs/m277e.ts` — the focused re-run of the five m277e-related files after that edit is below):
```
 Test Files  258 passed | 1 skipped (259)
      Tests  2487 passed | 1 expected fail | 1 skipped (2489)
   Start at  19:46:44
   Duration  39.67s (transform 11.80s, setup 43.40s, import 89.03s, tests 35.53s, environment 168.04s)
```
(2460 at `43f23dc` → 2487 = +27: seed-m277e 9, field-configs-m277e 6, equations-m277e 9, register-m277e-quellen 3; the shared `regulation-tables-seed-index` / `generated-sql-freshness` / `emit-seed-sql` pins iterate the new slug.)

Focused re-run after the eslint tidy-up + re-emit (`pnpm vitest run --project unit src/lib/eval/__tests__/field-configs-m277e.test.ts src/lib/eval/__tests__/equations-m277e.test.ts src/lib/eval/__tests__/regulation-tables-seed-m277e.test.ts src/components/worksheet/__tests__/register-m277e-quellen.test.tsx scripts/__tests__/generated-sql-freshness.test.ts`):
```
 Test Files  5 passed (5)
      Tests  32 passed (32)
```

`pnpm -s typecheck` → exit 0 (`TYPECHECK exit=0`). `pnpm -s eslint <10 touched .ts/.tsx files>` → first run 5 `no-unused-vars` warnings (unused quote constants L383/L406/L470/L476/L478 in `field-configs/m277e.ts`) → four dropped, L470 (DIN 19650) added to the `nutzungsarten` cue → second run exit 0, no output; the field-config migration was re-emitted afterwards (freshness pin green in the focused run).

`pnpm vitest run --project integration tests/harness/m277e-verify.integration.test.ts` (embedded PG; run after the module set — no engine change on this task):
```
 Test Files  1 passed (1)
      Tests  50 passed (50)
   Start at  19:46:28
   Duration  6.29s (transform 482ms, setup 0ms, import 4.04s, tests 2.08s, environment 0ms)
```
The harness seeds prod's equations / gates; the new rows are not in it by construction — it proves the branch still enforces every DWA-M-277E block gate both ways.

**TDD evidence.** Seed test written first → RED (`Failed to resolve import "../regulation-tables-seed-m277e"`, "Test Files 1 failed, no tests"); builder written + `SEED_BUILDERS` line → 9/9 GREEN first run; verifier 38/38 first run (spans lifted by line range). Field-config test → RED on two of my pins (rule count 24 vs the actual 23; prod `use_category` / `treatment_method` enum ORDER differs from the printed row order — same strings) → pins corrected (set equality for the driver check, order kept as printed in the tables) → 6/6. Equations test → 9/9 GREEN first run — every worked-example pin (1,375 / 1,625 l/d Ex. 9.3, 875 l/d + C2 Ex. 9.2, type codes 1…4, MBO 50/50.5, Tab.-4 allow-list, 6.375 m³, 3-of-4 failing samples, five annual volumes) held. Render test → RED on de-DE number formatting (`1.000` / `1.375` rendered for 1000 / 1375) → pins re-targeted to the rendered strings → 3/3. Before writing any module, a scratch script through the real `evaluateFormula` + `prepareRegisterRows` (scratchpad `rt-check.ts`, deleted) established the runtime facts encoded against: `if()` short-circuits, `sum_rows`/`max_rows` over an empty register is `manual_required`, `count_rows` with an `IN` condition works, unary minus over a sub-expression works, `lookup()` on two enum scalars computes, row-scope `visible_when` reads worksheet symbols.

## 3. Transcript verification

`pnpm -s tsx scripts/regulation-tables/verify-regulation-tables.ts m277e "C:\Users\Ekowai\Desktop\Guidelines\DWA-M-277E\DWA-M_277E (1).md"` → **`38/38 quotes verbatim`**, exit 0. PASS list (table · rows · span):

- TABLE2 (6): shower, bathtub, hand_washbasin, washing_machine, kitchen_sink, dishwasher — the printed Tab. 2 body L406–L414 as the quote of each transposed source row
- TABLE2_TYPE (4): A1 (L416), A2 (L417), B1 (L418), B2 (L419)
- TABLE3 (4): A1, A2, B1, B2 — L434–L435
- TABLE1_SIEVERS (2): mean, p85 — L360–L372
- TABLE4_LIMITS (2): C1, C2 — L488–L502
- TABLE4_USES (5): toilet_private (L503 fragment after the image cell), irrigation_lawn (L504), irrigation_crops (L505), laundry_private (L506), toilet_public (L507)
- TABLE4_PROCESSES (8): fb, sf, flb, stabilisation, mbr, uv, uf, ro — L508–L509
- TABLE5 (6): toilets … kitchen_dishwasher — L639–L644 (one line each)
- TABLE5_AREA (1): kitchen_garden — L658

Status per table: `md_verified` — TABLE2, TABLE2_TYPE, TABLE3, TABLE1_SIEVERS, TABLE4_LIMITS, TABLE4_PROCESSES, TABLE5, TABLE5_AREA (every seeded row lifted, every cell legible; deliberately unseeded printed cells are J-2 items). `imported_unverified` — TABLE4_USES (U-1: the row-group header cell of the use rows is a mathpix image, L503; the five rows themselves are legible).

## 4. Prior capture / emit commands (re-executable)

```
node scripts/regulation-tables/build-prior-snapshot.mjs DWA-M-277E m277e
  → wrote src\lib\eval\field-configs\m277e.prior.json: 198 field rows (109 orphan), 216 coded sections of 216, 22 equations;
    optional columns present: {"fields":{"widget":false,"ui_config":false,"lookup":false,"visible_when":false},"worksheet_sections":{"visible_when":false}}
pnpm -s tsx scripts/regulation-tables/emit-seed-sql.ts m277e
  → wrote seed + rollback for m277e -> scripts/migrations/20260917100400_regulation_tables_seed_m277e.sql scripts/rollback-20260917100400-regulation-tables-seed-m277e.sql
pnpm -s tsx scripts/regulation-tables/emit-field-configs-sql.ts m277e 20260917100410
  → wrote 51 field entries + 0 section entries for m277e -> scripts/migrations/20260917100410_field_configs_m277e.sql scripts/rollback-20260917100410-field-configs-m277e.sql
pnpm -s tsx scripts/regulation-tables/emit-equations-sql.ts m277e 20260917100420
  → wrote 14 equations for m277e -> scripts/migrations/20260917100420_equations_m277e.sql scripts/rollback-20260917100420-equations-m277e.sql
```
All three migrations are byte-pinned against a fresh emit (`generated-sql-freshness.test.ts` auto-pins the seed via `SEED_BUILDERS`; `field-configs-m277e.test.ts` / `equations-m277e.test.ts` pin the other two against the committed `m277e.prior.json`). The seed migration carries 38 row upserts (`ON CONFLICT (table_id, row_key)`) and 8 `verification_status` upgrades (`imported_unverified → md_verified`, never the reverse); its rollback deletes the nine tables (no earlier DWA-M-277E table seed to re-emit — the Plan-1 `20260911120000_selection_configs_DWA_M_277E.sql` touches `fields.source_set` only and is untouched). The field-config rollback restores the 18 UPDATE rows to the captured NULLs and deletes only the 33 `Plan 3:` rows; the equations rollback deletes the 14 `Plan 3:` rows. The emitter guards accepted the module on the first run (no producer-guard refusal — every UPDATE rule sits on a consumer-free symbol of a worksheet whose equations do not read it; the refusals the brief foresaw were planned out before emitting and are m277e-C-3). Apply order (owner, after the schema migration AND after m277e-I-1 is resolved): `20260917100400` → `20260917100410` → `20260917100420`; rollback in reverse. Every file touches `DWA-M-277E` rows only.

## 5. What was encoded

**Tables (9)** — `src/lib/eval/regulation-tables-seed-m277e.ts`, builder `m277eSeedTables()`, edition `'2017-10'` (title page L9/L24 "October 2017" = prod `standards.version`):

| table | keys | values | policy (cue) | rows | status |
|---|---|---|---|---|---|
| TABLE2 | source (= prod `Q_GW_P_<source>` suffixes) | q_gw_p_min/max [l/(P·d)], organic_load, cod_min/max, load_min/max [g/d], ss_min/max, ph_min/max, hydraulic_min/max [l/min], note ("200 l/week" on bathtub) | anhaltswert (L393 — L609) | 6 | md_verified |
| TABLE2_TYPE | greywater_type (= prod A1/A2/B1/B2) | type_code 1–4, q_gw_total_min/max, four membership booleans, definition (§5 sentence) | locked (L383) | 4 | md_verified |
| TABLE3 | greywater_type (A1/A2 read the "Type A" column) | total_/faecal_coliforms min/max [1/ml] + printed exponent strings | anhaltswert (L426) | 4 | md_verified |
| TABLE1_SIEVERS | statistic (mean / p85) | 11 Sievers cells (water_volume, TS/COD/BOD5/TN/TP × mg/l + g/(P·d)) | anhaltswert (L353) | 2 | md_verified |
| TABLE4_LIMITS | quality_category (= prod C1/C2) | treatment_method, turbidity_max, bod5_max, o2_sat_min, ph_min/max, total_coliforms_max, e_coli_max, p_aeruginosa_max (nullable = "-" / "No requirement"), sampling | locked (L446 — L482) | 2 | md_verified |
| TABLE4_USES | use_category (= prod tokens) | c1_allowed, c2_allowed (1/0), min_category_code, min_category, note (laundry L517) | locked (L476 — L478; laundry P-1) | 5 | imported_unverified (U-1) |
| TABLE4_PROCESSES | treatment_method (= prod tokens) | c1_allowed, c2_allowed, stage, label (legend L511–L513) | anhaltswert (L480) | 8 | md_verified |
| TABLE5 | application | q_sw_p [l/(P·d)] | anhaltswert (L632) | 6 | md_verified |
| TABLE5_AREA | use (kitchen_garden) | q_sw_a_l_m2 60, season_d 180, area_example_m2 150 | anhaltswert (L655 — L632; J-3) | 1 | md_verified |

**Registers / selections / lookup_fills / visibility** — `src/lib/eval/field-configs/m277e.ts` (all created fields land in the captured sections B / D):
- `grauwasserquellen` (M277E-06 B): the brief's seven columns — `source` lookup_key TABLE2, `persons`, `q_min` / `q_max` lookup_values, the engineer's `q_gw_p` (SR-2), `in_range` badge, `q_row`; footer `Q_GW_rows`, `greywater_type_code`; note L393. Outputs `greywater_type_code` (1…4) and `Q_GW_rows` created on -06 (§8 discrepancy 1).
- `total_coliforms_untreated_range` / `faecal_coliforms_untreated_range` (M277E-06 B, text lookup_fills on TABLE3 keyed on the own `greywater_type`).
- `sievers_statistic` (M277E-08 B, created select mean / 85percentile, labels L361) + six number lookup_fills (`Q_GW_P_sievers`, `COD_sievers`, `BOD5_sievers`, `TN_sievers`, `TP_sievers`, `TS_sievers`) — the existing measured inputs stay (J-2).
- `nutzungsarten` (M277E-10 B): use_category enum (prod tokens, discriminator) with the Tab.-4 min-category badge, `din_19650_class` text visible for the irrigation uses (reference only — content boundary), `drinking_water_option` boolean visible for laundry (L460), remark. Capture-only; the category derivation is single-sourced on M277E-16.
- `verbraucher_sw` (M277E-16 B): `application` lookup_key TABLE5 → `q_sw_p` lookup_value with the `anhaltswert` override (flag `q_sw_p_override`), `use_category` enum, `persons`, `q_row`, `min_cat` badge; footer `Q_SW_rows`, `quality_category_code_rows`. `bewaesserung_sw` (M277E-16 B): label, `use_category` (the two irrigation tokens), `area_m2`, `q_sw_a` [l/m² per season], `season_d`, the §9.2 example as a reference badge (`q_sw_a_ref`), `q_row = q_sw_a · A / season`, `min_cat` (2). The two registers are the two Σ of Eq. (1).
- `mbo_authorisation_code` (M277E-05 D, derived), `treatment_method_allowed` (M277E-19 D, derived).
- `speicher_277` (M277E-21 B): label, role (pre / post / buffer, L574), volume_l; footer `storage_capacity_calc_m3`.
- Eight Tab.-4 limit lookup_fills on M277E-24 B (role limit, keyed on the inherited `quality_category`; the five C2-only ones carry `visible_when quality_category == 'C2'`), the `ablaufproben_treated` register (date, location reservoir/consumer, seven parameters — the C2-only ones required-but-hidden under C1 — and eight pass badges reading the limit symbols in row scope; footer `treated_samples_count`, `treated_samples_fail`).
- `bilanzperioden` (M277E-18 B): label, days, q_gw, q_sw, derived q_wb / q_gwt / balance badge; footer the five annual volumes.
- Field `visible_when` (23): `quality_category == 'C2'` on M277E-10 turbidity_NTU / BOD5 / total_coliforms_treated / e_coli / p_aeruginosa / sampling_location (from -04), on M277E-19 selected_hygienisation, M277E-20 membrane_process_selected / uv_disinfection_used, M277E-24 turbidity_NTU / total_coliforms_treated / e_coli / p_aeruginosa + the five created C2-only limits (from -14); `building_type == 'rented_apartment'` on M277E-12 drinking_water_option_available (L460); `inflow_type == 'pump_station'` on M277E-21 and -09 pump_station_capacity (Annex A L826–L827); `discharge_into_water_body == true` on M277E-11 and -24 WHG_permit_present (L333). Section rules: none (every B section holds a consumed producer or has no driver in scope). Withheld (C-3): UV_transmission_pct, DIN_19650_class_documented, A, Q_SW_A, irrigation_season_length; never hidden: `turbidity_NTU_C1` (S-1), `source_set` (X-1).

**Equations (14 new)** — `src/lib/eval/equations/m277e.ts`: `M277E-06-D1 greywater_type_code` (nested `count_rows` with `IN` — kitchen ⇒ 4, washing machine ⇒ 3, basin ⇒ 2, else 1; L386–L391) · `M277E-06-D2 Q_GW_rows = sum_rows(grauwasserquellen, q_gw_p * persons)` (Eq. 2) · `M277E-16-D1 Q_SW_rows = sum_rows(verbraucher_sw, q_row) + if(count_rows(bewaesserung_sw) > 0, sum_rows(bewaesserung_sw, q_row), 0)` (Eq. 1) · `M277E-16-D2 quality_category_code_rows` = `max_rows(…, min_cat)` of the Tab.-4 `min_category_code` over BOTH registers (each guarded by `count_rows`; fix round 1 — no literal 2) (L649/L663) · `M277E-05-D1 mbo_authorisation_code = if(storage_capacity_m3 > 50, 1, 0)` (L329) · `M277E-19-D1 treatment_method_allowed` (lookup on TABLE4_PROCESSES by two enum scalars) · `M277E-21-D1 storage_capacity_calc_m3 = sum_rows(speicher_277, volume_l) / 1000` · `M277E-24-D1 treated_samples_fail` / `-D2 treated_samples_count` · `M277E-18-D1…D5` V_GW/V_SW/V_treated/V_surplus/V_topup_annual over `bilanzperioden` (text-only, F-2; output EXISTING consumer-free manual fields, unit m³/a as in prod). None outputs Q_SW / Q_GW / Q_GWT / Q_WB / V_buffer (the prod producers; pinned). Not emitted by design: the brief's `Q_GWT_calc` (prod Eq. (3) IS `min(Q_GW, Q_SW)`) and `V_buffer_calc` (prod Buffer) — single-source (R-3 / R-4); `drinking_water_savings_rate` (F-1).

## 6. Inventory §5 top-wins walk

1. Repeatable Grauwasserquelle rows deriving the type and Σ Q_GW → **encoded** (`grauwasserquellen`, TABLE2, `greywater_type_code`, `Q_GW_rows` — the §9.3 examples reproduce 1,375 / 1,625 l/d and A1 / A2); feeding prod's Eq. (2) and the manual `greywater_type` is STAGED (R-1, D-1, C-1).
2. Repeatable Verbraucher rows summing to Q_SW with the highest category → **encoded** (`verbraucher_sw` + `bewaesserung_sw`, TABLE5 / TABLE5_AREA / TABLE4_USES, `Q_SW_rows` = 875 l/d and `quality_category_code_rows` = 2 for the §9.2 example); feeding Eq. (1) / `quality_category` is STAGED (R-2, D-2, C-2).
3. `quality_category` drives the Tab.-4 limit block and the allowed process list → **encoded** for the limits (TABLE4_LIMITS, eight limit fills, 18 C2 visibility rules, the treated-sample register with per-row checks) and as a computed code for the process list (`treatment_method_allowed` over TABLE4_PROCESSES, `selected_hygienisation` / membrane / UV fields hidden under C1); the allow-list gate (G-2) and the limit-symbol gates (G-1) are STAGED; `UV_transmission_pct` visibility is C-3.
4. Collapse the ~90 duplicates → **deferred** (X-2: 72 duplicate symbols listed with a proposed owner each; -09 dissolves into -21/-22/-23; nothing collapsed; `bilanzperioden` supersedes `Q_WB_base` / `Q_WB_irrig`).
5. Derive storage capacity, the MBO flags and the annual balance → **encoded** (`storage_capacity_calc_m3` from `speicher_277`, `mbo_authorisation_code` from the inherited `storage_capacity_m3`, the five annual volumes from `bilanzperioden`); the manual-field replacements are STAGED (R-5, D-3), the savings rate has no printed basis (F-1).

## 7. Files changed

Modified: `src/lib/eval/regulation-tables-seed-index.ts` (`m277e` line), `src/lib/eval/field-configs/index.ts`, `src/lib/eval/equations/index.ts` (m277e lines), `docs/superpowers/specs/2026-09-11-guideline-to-tool/SIGN-OFF-plan-3.md` (+30 blocks, +8 observations), `docs/superpowers/guideline-to-tool-playbook.md` ("Encoding traps (Plan 3 Task 4)" paragraph).
Created: `src/lib/eval/regulation-tables-seed-m277e.ts`, `src/lib/eval/field-configs/m277e.ts`, `src/lib/eval/field-configs/m277e.prior.json` (captured), `src/lib/eval/equations/m277e.ts`, `src/lib/eval/__tests__/regulation-tables-seed-m277e.test.ts`, `src/lib/eval/__tests__/field-configs-m277e.test.ts`, `src/lib/eval/__tests__/equations-m277e.test.ts`, `src/components/worksheet/__tests__/register-m277e-quellen.test.tsx`, `scripts/verification/m277e-STAGED-plan3-rulings.sql`, `scripts/migrations/20260917100400_regulation_tables_seed_m277e.sql` + `scripts/rollback-20260917100400-regulation-tables-seed-m277e.sql`, `scripts/migrations/20260917100410_field_configs_m277e.sql` + `scripts/rollback-20260917100410-field-configs-m277e.sql`, `scripts/migrations/20260917100420_equations_m277e.sql` + `scripts/rollback-20260917100420-equations-m277e.sql`, this report (+ the copy at `.superpowers/sdd/…/task-4-report.md`).
Untouched: every a138 / din1989_1 / a262e file; the Plan-1/2 migrations incl. `20260911120000_selection_configs_DWA_M_277E.sql`; the two older m277e prod migrations (`20260728110000_m277e_tbl2_realign.sql`, `20260801450000_m277e_ecoli_c2_gate.sql`); `scripts/reasoning-map/` (churn from the unit run reverted with `git checkout --` before staging).

## 8. Discrepancies vs the brief (codebase / transcript / reality won)

1. **Register outputs live on the register's worksheet.** The brief put `Q_GW_rows` on M277E-07 and `quality_category_code_rows` on M277E-14 while creating the registers on M277E-06 / -15: an equation reads a register of its own worksheet only, and a `create` never sets `consumer_worksheets`, so those rows would never compute. Built: register + outputs on M277E-06 and M277E-16 (Eq. (1)'s home); the re-points are R-1 / R-2 / C-1 / C-2.
2. **Two Verbraucher registers instead of one** (person-based + area-based = the two Σ of Eq. (1), the DIN-1989-1 precedent): Table 5 prints no area row, a `lookup_key` column cannot carry an "irrigation area" option, and the Tab.-5 override affordance needs the lookup_key. `Q_SW_rows` guards the optional area register with `count_rows` (`sum_rows` over an empty register is `manual_required`).

   **Amendment-O evidence for "Table 5 prints no area row"** (re-executed in the Task-30b absence pass, 2026-09-24, against the SR-1 transcript `C:\Users\Ekowai\Desktop\Guidelines\DWA-M-277E\DWA-M_277E (1).md`; no line-truncating filter used). Table 5 printed whole — two columns, six data rows, every value per capita and day:

   ```
   $ sed -n '634,647p' "/c/Users/Ekowai/Desktop/Guidelines/DWA-M-277E/DWA-M_277E (1).md"
   \begin{table}
   \captionsetup{labelformat=empty}
   \caption{Table 5: Daily water consumption in household according to application (Source: BDEW 2015)}
   \begin{tabular}{|l|l|}
   \hline Consumer & Household consumption in litres per capita and day \\
   \hline Toilets & 33 \\
   \hline Personal hygiene & 44 \\
   \hline Washing machine & 15 \\
   \hline Cleaning/Irrigation & 7 \\
   \hline Cooking/Drinking & 5 \\
   \hline Kitchen/Dishwasher & 7 \\
   \hline
   \end{tabular}
   \end{table}
   exit=0
   ```

   The absence itself — no area-keyed row, no per-area unit, anywhere inside the table span:

   ```
   $ sed -n '634,647p' "/c/Users/Ekowai/Desktop/Guidelines/DWA-M-277E/DWA-M_277E (1).md" \
       | grep -n -iE 'm\^?\{?2|m²|area|per m|/m'
   (no output)
   exit=1
   ```

   **Verdict: the claim HOLDS.** The only per-area figure in the standard (60 l/m² over a 150 m² kitchen garden and a 180-day season) is printed in the §9.2 worked example at L655/L658, *not* in Table 5 — which is exactly why `TABLE5_AREA` is seeded as `anhaltswert` worked-example reference under `m277e-J-3` and not as a Table-5 row.
3. **Tab.-4 limits and the treated-sample register on M277E-24, not -14**: M277E-14 holds only `quality_category`; M277E-24 inherits it and already holds the treated-water scalars, so the limit symbols and the register's row-scope checks resolve on one worksheet today.
4. **`TABLE4_LIMITS` is one single-key table** (row per category, value column per parameter) instead of eight `TABLE4_<PARAM>` tables; `TABLE4_USES_MIN` is a column of `TABLE4_USES`.
5. **`Q_GWT_calc` / `V_buffer_calc` NOT emitted** — prod already has `Q_GWT = min(Q_GW, Q_SW)` and `V_buffer = Q_GWT * 1`; the brief's "identical rows" are a deactivation ruling (R-3 / R-4), not a new equation. Equations 14 new (brief: 8 + annual) — the annual set is five (V_GW / V_SW added to the brief's three), plus `treated_samples_count`, `treatment_method_allowed`.
6. **TABLE3 keyed by the prod `greywater_type` tokens** (A1 and A2 both read the "Type A" column) instead of the brief's a/b1/b2 group key — G-A3 equality with the driver.
7. **Prod tokens are upper-case** (`A1…B2`, `C1/C2`) and `use_category` / `treatment_method` enum ORDER differs from the printed row order (same strings).
8. **`mbo_authorisation_code` reads the existing inherited `storage_capacity_m3`** (computes today) rather than the register Σ (which would need C-4 first); the register Σ is a separate created field.
9. **Prod gate count 63, not 88**; prod equation count 22 as the brief said; 72 duplicate symbols (inventory "~90").
10. **Visibility 23 field rules / 0 sections** (brief: 9 / 0): the C2 rule applies to every C2-only scalar on -10 and -24 and to the created limits; five of the brief's rules are C-3; `pump_station_capacity` and `WHG_permit_present` rules on both copies.
11. **Two Tab.-3 text fills and six Sievers fills** created beyond the brief's seven lookup_fills so TABLE3 and TABLE1_SIEVERS have consumers; `sievers_statistic` created as their driver.
12. **Plan-1 `source_set` tokens are German labels** ("Dusche" …), not the brief's snake_case; the register's `source` key uses the prod `Q_GW_P_<source>` suffixes — no dependency between the two (X-1).
13. **Edition** printed (`'2017-10'`) → no numbered edition block.

## 9. Self-review

- Every `verbatim_quote` passes the verifier (38/38); spans were lifted by line range with a throwaway script (no `${`/backtick specials in any span — grepped first); every cue in `field-configs/m277e.ts`, `equations/m277e.ts`, the STAGED file and the 30 sign-off blocks was read from the transcript in this session at the cited line; prod facts (equation ids/formulas/status, gate codes/severities/conditions, enum tokens, section codes, units) come from the in-session capture/queries quoted in §4 and the STAGED header. Two line-number slips caught while writing (A1 definition is L386, not L387; the `nutzungsarten` cue) were corrected before the modules were finalised.
- The emitter guards accepted the module first time because every UPDATE rule was checked against the capture's `consumer_worksheets` and `equations` BEFORE emitting (the test walks every rule through `producerChain`).
- G-A3 pinned: TABLE2_TYPE / TABLE3 keys = prod `greywater_type`; TABLE4_LIMITS = prod `quality_category`; TABLE4_USES / TABLE4_PROCESSES = prod `use_category` / `treatment_method` (as sets); TABLE2 keys = the prod `Q_GW_P_<source>` suffixes; the created select's values = TABLE1_SIEVERS keys; register enum columns = prod token lists.
- Runtime assumptions were tested before encoding, not after (scratch script), which is why the equations test was green first run; the two RED pins in the field-config test and the render test were my miscounts / the de-DE formatter, not encoding defects.
- The `String.replace` `$'` trap was avoided (files written whole; small edits via `node` string replacement of non-`$` text and the Edit tool).
- `git checkout -- scripts/reasoning-map/` run before staging (the unit run churns five files there); `.env.local` confirmed gitignored; one commit; author `alvaro.burgos@ekowai.com` verified before committing.
- Reviewed the unified diff of every modified file; the only non-M277E changes are the three registry lines, the sign-off section and the playbook paragraph.

## 10. Concerns (for the controller)

1. **m277e-I-1 (cross-standard, highest):** prod already holds a legacy `regulation_tables` (5,382 rows / 35 standards, columns `variant_value` / `value_text` …). The Plan-1 schema migration's `CREATE TABLE IF NOT EXISTS regulation_tables (standard_code, edition, table_code, …)` is a no-op on prod; every Plan-3 seed INSERT (a138_p3, din1989_1, a262e, m277e — and every later slug) would fail on "column standard_code does not exist", and `ensureRegulationTablesLoaded`'s never-throws fallback would mask it (TS seed served instead). Nothing in this task changes it; it needs a Plan-1-level decision (rename the Plan-1 tables or migrate the legacy one) before ANY seed migration is applied. Re-executable evidence in the sign-off block.
2. **Nothing the registers compute reaches prod's gates yet** — `Q_GW_rows`, `Q_SW_rows`, the codes and the limit fills are visible derived / filled fields; Eq. (1)/(2), `quality_category`, `greywater_type`, REQ-29 and the Tab.-4 gates keep reading the manual inputs until R-1/R-2/D-1…D-3/G-1 are ratified. That is the fail-safe reading of "never a second producer".
3. **Scalar-only equations not materialised** (M277E-05-D1, M277E-19-D1) — hook / report / snapshot / PDF only (amendment D).
4. **TABLE4_USES stays `imported_unverified`** for the image header cell (U-1) — a 1-minute PDF look flips it.
5. **Prod data hygiene surfaced but not touched:** 12 duplicate / literal equation rows (R-3), 13 "-2" duplicate gates with two severity and two condition mismatches (G-5), the `Q_GW_P` symbol table unit "l/d" vs field unit "l/(P*d)" (inventory), 72 duplicate symbols (X-2).
6. **Token/time:** ≈ 0.56 M tokens in, ≈ 65 min wall-clock — in line with Task 3 (0.58 M / 60 min) for a standard with 7 registers and 16 fills; the runtime scratch check before encoding paid for itself (equations green first run).

## 11. Residue (what the guideline demands that the worksheets still do not ask)

Tab. 2 nutrient / microbial load text rows (L412–L413) and the "Characteristics" row (L415) — qualitative, not seeded; Tab. 1 fbr 2005 / DWA 2008 columns, TOS / Potassium / Sulphur (J-2); Annex B (microbiological load per source × author — 9 rows × 4 sources of order-of-magnitude ranges with author codes, no consumer; the -03/-09 microbiology scalars stay manual); the owner/user-change re-notification duty (L343) and the recommissioning cases; the weekly/monthly capacity data (L755) beyond the periods register; the `DIN 19650` suitability class (external — reference only); the backfeed dimensioning references (DIN 1988-300, DVGW W 406, L582 — bare pointers); the "several households" / public-commercial treatment-indispensable rule (L446) as attest booleans only; the drinking-water savings rate (F-1); the Annex A planning-sheet fields (toilets flushing tank/valve/urinal units and litres per flush, L849–L852) — the person-based register covers the demand, not the fixture inventory. Each is on the sign-off sheet or listed here with its line and stays outside this encoding (content-boundary rule).


---

# Fix round 1 (review verdict on `b075143`: APPROVED with items)

- **Commits:** two — (A) `77e2ce2` `fix(plan-1): schema migration renames the LEGACY prod regulation_tables to regulation_tables_legacy_v1 before creating the Plan-1 table (plan1-D-3-1, Task 4 fix round 1)`; (B) see the reply — the m277e minors. Fable trailer on both; `git checkout -- scripts/reasoning-map/` before staging; tree clean after each.
- **Nothing applied to prod.** Prod was read ONLY by `prod-query.mjs` (the legacy table's constraints / indexes / policies / views / child FKs / triggers / RLS flag re-verified, counts 5382 / 35 / 410) and by a throwaway read-only dump of the 13 equation rows staged for deletion (same connection discipline as `prod-query.mjs`, read-only transaction; the script was deleted after the dump; the connection string was never printed).

## A — m277e-I-1 resolved by the Plan-1 amendment `plan1-D-3-1` (SR-4 schema change for the mandate, WRITTEN-NOT-APPLIED)

- `supabase/migrations/20260911100000_guideline_to_tool_schema.sql`: a guarded `DO` block BEFORE `CREATE TABLE IF NOT EXISTS regulation_tables` — if `public.regulation_tables` exists AND has no column `standard_code` (the legacy per-cell shape), it renames the table to `regulation_tables_legacy_v1`, the constraints `regulation_tables_pkey` → `regulation_tables_legacy_v1_pkey` and `regulation_tables_standard_id_fkey` → `regulation_tables_legacy_v1_standard_id_fkey`, and the indexes `regulation_tables_std_idx` / `regulation_tables_table_idx` → `…_legacy_v1_…`; data untouched; idempotent (a re-run sees `standard_code` and does nothing); refuses if both names exist.
- `supabase/migrations/rollback-20260911100000_guideline_to_tool_schema.sql`: refuses (`RAISE EXCEPTION … still holds % rows`) while the Plan-1 `regulation_tables` holds rows; drops the Plan-1 tables only when they have the Plan-1 shape; renames the legacy table, its constraints and indexes back; refuses loudly on a legacy-only DB instead of touching it; then drops the `fields` / `worksheet_sections` columns as before.
- `src/lib/db/schema.ts`: a two-line comment above `regulationTables` only (no model change). `src/lib/db/__tests__/schema-guideline-to-tool.test.ts`: one new case pins guard-before-CREATE, the two constraint renames, and the rollback's refusal-before-DROP + rename-back.
- **Reproduction on embedded Postgres** (`tests/harness/guideline-to-tool-schema-legacy-rename.integration.test.ts`, 3/3): prod's state rebuilt (legacy table with prod's constraint/index names, one row, RLS on) → the Plan-3 seed INSERT fails with "column standard_code" (broken before) → the forward migration runs → tables `regulation_table_rows`, `regulation_tables`, `regulation_tables_legacy_v1`; legacy constraints/indexes renamed; the legacy row intact; the Plan-1 column list as designed; the new table's constraint names do not collide; the same seed INSERT lands (computes after) → a re-run changes nothing → the rollback refuses with "still holds 1 rows" → after the seed row is deleted it drops the Plan-1 tables and restores `regulation_tables` with `regulation_tables_pkey` / `_standard_id_fkey` / `_std_idx` / `_table_idx` and the row → a second rollback refuses ("legacy shape").
- One RED caught on the way: my inline `String.replace` splice turned the `$$` dollar-quote tags into `$` (the `$$` → `$` replacement-pattern rule — the sibling of the a138 `$'` trap); the embedded-PG run reported `syntax error at or near "$"` at the `DO` line, fixed with `sed`, re-run green. Recorded as a playbook trap (round-1 note below).
- Sign-off: `plan1-D-3-1` (rename vs adopt-legacy; the information_schema / count / constraint / index / policy queries; what the rename touches; rollback) appended to `SIGN-OFF-plan-3.md`; `m277e-I-1` now points at it. Playbook apply-order step 1 names the rename.

Raw (commit A state):
```
pnpm vitest run --project integration tests/harness/guideline-to-tool-schema-legacy-rename.integration.test.ts → Tests 3 passed (3)
pnpm vitest run --project unit src/lib/db/__tests__/schema-guideline-to-tool.test.ts → Tests 4 passed (4)
pnpm test → Test Files 258 passed | 1 skipped (259) · Tests 2488 passed | 1 expected fail | 1 skipped (2490) · Duration 40.42s
pnpm -s typecheck → exit 0 · pnpm -s eslint <3 touched files> → exit 0
```

## B — m277e minors

1. **R-3 / R-4 rollbacks are full INSERTs.** `equations` has no `active` column, so the STAGED blocks now embed the 12 + 1 captured rows as `INSERT INTO equations (id, worksheet_template_id, equation_number, formula, formula_latex, input_symbols, output_symbol, output_unit, clause_reference, description, verification_status, audit_status, source_file, source_anchor, source_quote, audit_notes, audited_at, audited_by, verified_by_user_id, verified_at, verification_note, verification_quote) VALUES (…) ON CONFLICT (worksheet_template_id, equation_number) DO NOTHING` — same ids (the Plan-2a rewrite bridge keys on ids), every captured column, the worksheet resolved by code. Captured read-only 2026-09-17 (all 13 `verified_against_standard` / `pending_independent_audit`, `verified_at 2026-09-07T13:43:58.224Z`, Pass-4 provenance notes).
2. **J-2 scope.** The STAGED block and the sign-off block state that ratifying J-2 also ratifies the EXISTENCE of the nine created fields that hang off it (M277E-08 `sievers_statistic` + six `*_sievers` fills; M277E-06 two TABLE3 range fills), and what REJECTED means (their nine `Plan 3:` DELETEs in the field-config rollback + dropping TABLE1_SIEVERS / TABLE3 from the seed).
3. **M277E-16-D2 without the literal 2.** Formula now `quality_category_code_rows = if(count_rows(verbraucher_sw) > 0, if(count_rows(bewaesserung_sw) > 0, max(max_rows(verbraucher_sw, min_cat), max_rows(bewaesserung_sw, min_cat)), max_rows(verbraucher_sw, min_cat)), max_rows(bewaesserung_sw, min_cat))` — one statement of the Table-4 rule (`max_rows` of `min_category_code` over both registers; the `count_rows` guards only skip an empty register, `max_rows` over an empty one being `manual_required`). Pinned: §9.2 example → 2, toilets only → 1, area-only → 2 (from the irrigation row's Tab.-4 code), both empty → `manual_required`, and the formula contains no `, 2,`. `20260917100420` re-emitted; the `quality_category_code_rows` field description aligned and `20260917100410` re-emitted; freshness pins green.
4. **Two honest notes.** (a) `Q_SW_rows` (M277E-16-D1) stays `manual_required` ("Keine vollständigen Zeilen in verbraucher_sw") for an irrigation-ONLY project — the person-based register is the unguarded term of Eq. (1); an engineer with no person-based consumer has no toilets/laundry rows to enter, so the honest reading is "no Q_SW yet", not 0 — if the owner wants the symmetric guard (`if(count_rows(verbraucher_sw) > 0, …, 0) + …`, which yields 0 for two empty registers), it is a one-line change (observation). (b) UPDATE targets and equation outputs on ORPHAN fields: 109 of the 198 captured fields have `section_id IS NULL`; the 18 UPDATE rules on M277E-10 / -11 / -19 / -09 / -24 land on such rows — the UPDATE is scoped by `(worksheet, symbol)`, not by section, and an orphan field is never section-hidden, so each field rule applies exactly as emitted; the five `V_*_annual` outputs on M277E-18 are orphans too — the register materialiser writes them by field id on save regardless of section, and the worksheet renders them in the unsectioned block.

Raw (commit B state): see the reply — verifier 38/38, focused m277e suites, `pnpm test`, typecheck, eslint.

Playbook trap added (round 1): never splice SQL or docs with `String.prototype.replace` and a replacement string containing `$$` / `$'` / backticks under a shell — `$$` collapses to `$` (dollar-quote tags), backticks are command-substituted; write the replacement from a file or use `split/join`.
