# VSME data-completeness audit & remediation (2026-06-26)

Audit of the encoded VSME standard against the authoritative source folder
`C:\Users\Ekowai\Desktop\environmental-reporting service\01_Referenz\` (EFRAG VSME
XBRL taxonomy Feb-2026, VSME Standard PDF, VSME Digital Template). Temperature-0:
every value source-traced, nothing fabricated. **All fixes flow through the seeder
(`scripts/vsme/*`) — never hand-edited tables** — then re-seed local → verify →
re-run prod cutover.

## Baseline (encoded state at audit time)
41 worksheets, 143 datapoints (correct: taxonomy 403 concepts → 143 reportable).
Owners 100% tagged, labels_en + xbrl_element_id 100% present. data_types:
78 number, 37 text, 14 boolean, 13 enum, 1 date.

## Gaps & order (user-set: mechanical → requirements/required → empty worksheets)
| # | Gap | Status |
|---|---|---|
| 1 | 3 enum fields empty (country ×2, NACE) | ✅ DONE |
| 2 | 78 numeric fields missing unit | ✅ DONE |
| 5 | 0 equations (vsme-calculation.xml) | ✅ DONE |
| 3 | only 2 compliance requirements, 0 warnings | ✅ DONE |
| 4 | 0 is_required flags | ✅ DONE |
| 6 | 18 empty worksheets + C03→B03 GHG remap | ✅ DONE |

**ALL GAPS DONE — verified in clean local DB: 40 ws (0 empty), 143 fields, enum_empty=0, units=62, equations=10, CR=31 (9 block/22 warn), required=34, enum_rows=1696. GHG §30 set on B03.200.**

**PROD RE-SEED APPLIED 2026-06-26** (user go) to `vadsmshzebefjreqcicl`: cleared old VSME (data-safe — 0 values entered; pilot PLT-HS-01 had VSME attached but empty) and re-imported the improved library via the tested `importWorkbook` (prepare:false). Prod verified: 40 ws (0 empty), 143 fields, empty_enums=0 (NACE 1047 + country 256×2), 62 units, 10 equations, 31 CR (9 block), 34 required, GHG on VSME-B03.200. VSME re-attached to the pilot (40 fresh instances, new structure). App code unchanged → no redeploy. Committed `1ff23e1`. main not yet updated with the remediation commit (separate, if wanted).

## Gap 1 — enum values (DONE, verified)
- **NaceSectorClassificationCodes** → 1047 members (22 sections + 87 divisions + 287 groups + 651 classes), from the sibling NACE linkbase `nace/2026-02-01/nace-codes-definition.xml` (domain-member arcs) + labels from `nace-codes-label-en.xml`. value=`NACE_<code>`.
- **CountryOfSite** + **CountryOfPrimaryOperationsAndLocationOfSignificantAssets** → 256 ISO-3166 members each. The country domain is referenced by remote URL (not bundled), so sourced from EFRAG's own `VSME-Digital-Template-latest.xlsx` → sheet "Enumeration Lists" (cols Country List / CountryAxis). value=ISO alpha-2; includes retained historical codes (YU, ZR).
- Code: `scripts/vsme/build-workbook.ts` (+`parseNaceEnumRows` sync, `parseCountryEnumRows` async; wired into `buildVsmeRows`/`buildVsmeWorkbook`). Adversarially reviewed (PASS): counts exact vs source, no drops/dups/fabrication, shape matches importer contract, 0 validation errors, no regression to the 10 pre-existing enums, no new tsc errors. Re-seeded local → DB confirms 256/256/1047, 0 empty enums.
- Caveats (non-blocking): label_de = label_en placeholder (no DE source ships; for verify pass); NACE 1047 needs a typeahead/cascading picker in UI (data captured fully); `naceDirFrom` hardcodes `2026-02-01` (pinned to this bundle).
- NOT committed yet; not re-deployed to prod (batch the prod re-cutover after the mechanical gaps).

## Gap 2 — units (DONE, verified)
- 78 numeric fields → **62 carry a unit, 16 intentionally blank** (counts/ratios/rates). Source: PRIMARY = taxonomy `measurementGuidance` UTR tokens in `vsme-label-en.xml` (`[utr:MWh]`,`[utr:tCO2e]→tCO2eq`,`[utr:m3]→m³`,`[utr:kg,t]`,`[utr:ha,sqkm]→ha`); fallback = XBRL itemType + VSME Standard PDF display unit.
- Histogram: m³×12, EUR×11, t×8, tCO2eq×8, ha×5, MWh×4, tCO2eq/EUR×4, hours×4, %×3, kg×3, blank×16. Verified in DB.
- Code: new `scripts/vsme/units.ts` (`buildUnitMap`: guidance→itemType-default→label-override) + `build-workbook.ts` emits `unit` from the map. Round-trips validateWorkbook 0 errors; no regression (enums intact, non-numerics blank, tests pass).
- Adjudicated judgment calls (controller): monetary→**EUR** (reporting-currency default, EU/German deployment; editable); GHG intensity→**tCO2eq/EUR**; training→**hours** (standard prose); waste-mass **kg vs t kept per taxonomy UTR** (EFRAG's own kg/t split reproduced faithfully, not guessed); rates/ratios **blank** (source-indeterminate).

## Gap 5 — equations (DONE, verified)
- `vsme-calculation.xml`: 13 summation relationships → **10 equations emitted, 3 skipped** (2 duplicate flat-vs-nested GHG totals — nested kept; 1 alternative gender decomposition of NumberOfEmployees — contract-type kept, model allows one equation per output_symbol). Nothing references a non-encoded concept. All weights +1.
- Equations: waste mass/volume totals (Σ haz+non-haz), GHG scope sums (Scope1+2, +Scope3, location & market), fossil-fuel revenue total. All 10 parse + evaluate through `src/lib/eval/arithmetic.ts`. Verified in DB.
- Code: new `scripts/vsme/calculations.ts` (parses calc linkbase, gates on the 143-field set, clause refs from vsme-reference.xml) + `build-workbook.ts` §7 wiring. 0 validation errors; no regression (enums/units intact, tests pass).

## Mechanical batch (Gaps 1,2,5) COMPLETE & verified in local DB. Not committed; prod re-seed deferred to end.

## Gap 3 — compliance requirements (DONE, adversarially reviewed)
- From 2 block/0 warn → **31 requirements (9 block, 22 warn)**. Source: VSME Standard PDF, clause-cited per row; gate grammar verified against `src/lib/compliance/evaluate.ts`. New `scripts/vsme/requirements.ts` (curated, every row tied to a paragraph) + `build-workbook.ts` §8 `buildComplianceRows` (skips rows whose symbols are absent).
- **9 block** = unconditional, always-answerable "shall disclose": B1 module-option + basis (24a,c), B3 total energy + Scope1 + Scope2-location (29,30), B6 total water (35), B7 circular-economy Y/N (37), B9 accidents + fatalities (41). Adversarial review (2nd subagent) verified all 9 verbatim against the standard — no over-block, no mis-severity, no fabricated clause, no C-module hard gate.
- **22 warn** (advisory) = derived/count-split unconditional (intensity, waste total, employee splits, accident rate, pay/bargaining) + conditional Basic (B8 turnover-rate ≥50, B11 "in case of") + the 7 **B1 24(e)** registration identifiers (legal form, NACE, balance sheet, turnover, employees, country, geolocation — review's under-blocking fix) + Comprehensive C1/C6/C8/C9 (para-45 module-wide conditional → never block).
- NOT-encodable (documented follow-ups, nothing lost): threshold-gated conditionals (need project-level headcount), "≥1 of N present", cross-field numeric identities (equation layer), conditional narrative "if-yes-describe". Architectural note: all CRs attach to B01.000 via phase → gate fires at B1-approval over project-wide values.

## Gap 4 — is_required flags (DONE, verified)
- **34 of 143 fields → is_required=true**, every one tied to an unconditional Basic-module "shall disclose" (B1 24a/c/e=9, B3 29/30/31=4, B5 33=3, B6 35=2, B7 37/38=5, B8 39 splits=4, B9 41=3, B10 42=4). Conditional/voluntary/Comprehensive(all C)/market-based-Scope2/Scope3/other-gender/volume-duplicates correctly left false — documented auditable boundary.
- Code: `requirements.ts` exports `VSME_REQUIRED_FIELD_SYMBOLS` (34, clause-commented); `build-workbook.ts` emits `required: yes/no` from it. Verified in DB; no regression; 25 tests pass.
- Second pass (Gaps 3,4) COMPLETE & verified.

## Gap 6 — empty worksheets + GHG remap (DONE, verified)
- Root cause: `conceptModuleMap` collapsed full role codes (`B03.200`→`B03`), funneling every `.1xx/.2xx/.3xx` concept onto the `.000` worksheet → 18 empty sibling tabs. Fixed: return FULL role code + `isBetterOwner` tie-break (real B/C over D99 → **Basic over Comprehensive** → lexicographic).
- **C03→B03 GHG remap fixed:** the 8 GHG §30 concepts (Scope1/2/3 + totals) are dual-presented under B03.200 (Basic) and C03.100 (Comprehensive); the Basic-over-Comprehensive rule now lands them on **VSME-B03.200** (their VSME ¶30 home), off C03.000.
- Empty-worksheet handling: **suppress 0-field worksheets** → 40 worksheets (only `VSME-C03.100`, a pure re-presentation/target-axis node, suppressed). co2 recompute UNCHANGED (resolves output symbols by symbol, not worksheet-filter — C1 intact).
- Code: `modules.ts` (full codes + isBetterOwner) + `build-workbook.ts` (assign by full code, suppress empties). 583 tests pass; 0 validation errors.
- ⚠️ **Prod re-seed caveat:** the remap moves fields between worksheet_templates; re-seeding into a populated DB leaves orphan rows. Prod has VSME in the library but NO project uses it yet → safe to `DELETE FROM standards WHERE code='VSME'` (cascade) then re-apply the regenerated seed. Verified locally via clean clear+reseed.

## CO₂ calculator workstream (values/coefficients + commodity-selector UX)
Scope (user): CO₂ calculator only; selector = curated shortlist + full search.

### CO2-A — UBA factor data audit + fix (DONE, adversarially reviewed PASS)
- **Coefficients verified correct** vs UBA source (`uba_liste_ef_für_thg_bilanzierung_v2.1.xlsx`) — broad sample across all sheets, exact match, no value/rounding/unit-base errors.
- **3 real bugs fixed** in `scripts/vsme/import-uba-factors.ts` (+ `schema.ts` `name` column + migration `20260626160000_vsme_emission_factors_name.sql` [renamed off the 138 120000 clash] + tests):
  1. **Units**: 53/281 had empty `unit` (parser read the blank text `Einheit` col) → now decoded from the uba_id 5th segment (01=kWh,02=l,03=kg,04=t,05=m³…) via Technische_Hinweise. 0 missing, 0 conflicts (only fills, never overrides).
  2. **Names**: added `name` = deepest non-integer Level (refrigerants = Industrielle Bezeichnung) → real commodities (Dieselkraftstoff, Erdgas, Deutscher Strommix, R-410A), 0 empty/integer/generic.
  3. **Refrigerants completeness**: parser required numeric GWP AR4 and silently dropped **133** F-Gas-VO/AR5-only blends (R-410A 2088, R-404A, R-407C…). Fallback AR4→F-Gas-VO→AR5 recovers all 133. Source has 243 (110 AR4 + 133 F-Gas); reviewer counted 243 independently.
- **Result: 281 → 414 factors**, all named, all with units, 0 dup. Applied to LOCAL (schema + re-import). Tests pass.
- 🚩 **PROD-affecting (held):** new `name` column migration + re-import 281→414 with name/unit. The `prod-cutover/03-seed-emission-factors.sql` (stale 281-row, no name, ON CONFLICT DO NOTHING) must be regenerated to 414 + DO UPDATE before prod. Cutover docs' "281" counts are stale (→414).

### CO2-C — calc + equations verify (DONE)
- `calc.ts` `lineCo2eTonnes = amount × kgCo2ePerUnit / 1000` (kg→t) correct; `sumByScope` correct.
- `resolveFactor` (uba_id, source_version) → kgCo2e + unit + scope correct. `recomputeB3Co2` sums by **factor.scope** (refrigerants→Scope 1), persists 3 GHG outputs (scope1/scope2-loc/total) to project_parameters with per-line citation provenance — C1 met. Only Scope 1 + Scope 2 location (the mandatory B3 set).
- 10 equation weights all +1 (sums) correct.
- **CONSTRAINT for CO2-B:** the calc trusts `amount` is in the factor's unit → the selector MUST fix the unit to the chosen factor's unit (CO2-A's unit fix enables this) and enter amount in that unit.

### CO2-B — commodity-selector input UX (BUILT; code-verified, live interactive verify pending stable stack)
- New `src/components/vsme/co2-add-activity.tsx`: add-activity form — **curated shortlist** (Diesel, Benzin, Erdgas, Heizöl, Strommix, Fernwärme, R-410A) + **searchable full-414 catalog** (by name/category). Selecting a commodity **auto-attaches its factor**; the **unit is FIXED to the factor's unit** (amount entered in that unit — satisfies the CO2-C constraint); live preview = amount×kgCo2e/1000; Add → addCo2Line; clear/cancel.
- New `co2-shortlist.ts` (7 commodities keyed by uba_id, **no hardcoded coefficients** — looked up from the catalog so values stay source-driven) + `src/lib/db/queries/emission-factors-catalog.ts` (loads 414 named factors). `co2-activity-table.tsx` now renders the form + per-row delete; emissions page loads the catalog.
- **Security hardening (closed the flagged gap):** `addCo2Line`/`deleteCo2Line` now check `userHasProjectAccess(projectId, actor)` before write — no cross-org writes.
- **Verification:** ✅ build passes (compile+types, 39/39 pages); ✅ thorough code review; ✅ all 7 shortlist commodities resolve with correct name/scope/unit/coefficient (Diesel/l/2.6769, Strommix/kWh/0.3716, R-410A/kg/2088…); ✅ pure tests pass (calc, factor parsing); ✅ page rendered 200 earlier. ⚠️ Live interactive click-through + integration tests blocked by an unstable local Supabase stack (auth gateway + DB flapping) — env issue, not code; confirm on a stable stack or the live app.

## CO₂ workstream PROD-affecting (held for go): emission_factors `name` migration (20260626160000) + re-import 281→414 (regenerate prod-cutover/03 seed to 414 + DO UPDATE); the UX is app code (no data migration) → ships with a normal deploy.

## Files changed (seeder only — scripts/vsme/, all DATA tooling, no app runtime code)
`build-workbook.ts`, `modules.ts`, `units.ts` (new), `calculations.ts` (new), `requirements.ts` (new), `__tests__/build-workbook.test.ts`. App is DB-driven → **no redeploy needed**; prod update = data re-seed only (user-gated).
