# VSME — Inventory (EFRAG Voluntary Sustainability Reporting Standard for non-listed SMEs, Dec 2025 + XBRL taxonomy Feb 2026)

## 0. Sources used
- Transcript: NO TRANSCRIPT (no markdown/text extraction). Sources on disk are PDF/XLSX only: `C:\Users\Ekowai\Desktop\environmental-reporting service\01_Referenz\VSME Standard.pdf`, `VSME-Digital-Template-latest.xlsx`, `VSME-XBRL-Taxonomy-February-2026.zip`. Classification is from the prod dump only; the requirement descriptions quote VSME paragraphs verbatim (e.g. "Para 29: „The undertaking shall disclose its total energy consumption in MWh …“") and are used as the quote source.
- Prod dump: `scratchpad/std/VSME.json` — 40 worksheets (B01.000 … D99.000), 144 fields, 10 equations, 31 requirements. Field symbols are XBRL concept names; worksheet suffixes .100/.200 mirror XBRL "line items" tables.
- Worktree registry: nothing in `selection-fields.ts`; but main already has `src/lib/eval/pollutant-register.ts` behind `pollutant_register` (B04.100, E-PRTR) — a dedicated register outside the config registry.

## 1. Table-lookup candidates
Numeric value tables: NONE — explicitly. VSME prescribes disclosures, not values; every number is reported by the undertaking. Classification enums are large reference lists (NACE 1047, countries 256, 51 disclosure IDs) — "predetermined values" are labels only.

| worksheet | selector | dependent | ref | override? | in transcript? |
|---|---|---|---|---|---|
| B01.000 | `BasisForPreparation` (OptionA basic only / OptionB basic+comprehensive) | applicability of every C-module worksheet (C01…C09) | B1 para 24(a) | none (declaration) | prod quote: "The undertaking shall disclose which of the following options it has selected: OPTION A: Basic Module (only); or OPTION B: Basic Module and Comprehensive Module." |
| B01.000 | `NaceSectorClassificationCodes` (enum 1047) | high-climate-impact sector → C03.300 transition plan applicability (C3) | C3 | — | list only |
| B01.000 | `UndertakingsLegalForm` (enum 5) | `OtherUndertakingsLegalForm` (text) when Other; B02.100 cooperative disclosures when Cooperative | B1 para 24(e), B2 | — | list only |
| B01.000 | `TypeOfNumberOfEmployees` (headcount/FTE) + `EmployeeCountingMethodology` | interpretation of all B8 counts | B1 para 24(e) | — | list only |
| B01.000 | `ReportContainsDisclosuresFromThePreviousReportingPeriodThatRemainUnchanged` | `ListOfDisclosuresForWhichNoChangesAreReported…` (enum 51), `LinkToPreviousReport…` | B1 | — | list only |

## 2. Repeatable-group candidates
The XBRL "line items" worksheets are repeatable tables by construction; prod holds one row each.

| worksheet | the thing | member fields | currently | aggregation + consumers |
|---|---|---|---|---|
| B01.100 | Subsidiary | NameOfTheSubsidiary, RegisteredAddressOfTheSubsidiary | one row | register; only when BasisForReporting = Consolidated |
| B01.200 | Site | CountryOfSite, GPSLocationOfSite, AddressOfSite, PostalCodeOfSite, CityOfSite | one row | register; drives B05.000 (per-site biodiversity flags/area → "number and area (in hectares) of sites … in or near a biodiversity sensitive area"), B06 (water withdrawn "at sites located in areas of high water-stress" → Σ over flagged sites) |
| B02.000 | Practice / policy / initiative | SustainabilityIssueAddressedBy… (enum 10), …IsPubliclyAvailable, UndertakingHasSetATargetWhichIsRelatedToAPolicy (+ C02 description fields) | one row | register (issue, description, public, target, senior level accountable) |
| B04.100 | Pollutant × medium | pollutant_register (json) + AmountOfEmissionToAir/Water/Soil | dedicated register EXISTS (E-PRTR); the three totals are separate scalars | Σ by medium → the three Amount fields (derive) |
| B05.000 | Site in/near biodiversity area | SiteLocatedIn…, SiteLocatedNear…, AreaOfSiteInBiodiversitySensitiveArea | one row | per site row (see B01.200); count + Σ ha → CR-B05-01 |
| B07.300 → B07.400 | Material | NameOfMaterialUsed, WeightOfMaterialUsed [t], VolumeOfMaterialUsed [m³] | one row; totals TotalMassOfMaterialUsed / TotalVolumeOfMaterialUsed hand-typed | Σ → B07.400 (no equation today) |
| B08.200 | Employees per country | NumberOfEmployeesForCountryOfEmploymentContract | one row ("[line items]") | Σ → NumberOfEmployees (consistency) |
| B03.100 → B03.000 | Energy carrier | EnergyConsumptionFromElectricity / SelfGeneratedElectricity / Fuels [MWh] | 3 fixed scalars | Σ → TotalEnergyConsumption (no equation; CR-B03-01 says the breakdown is "if it can obtain …"-conditional) |
| C07.000 | Human-rights incident | TypeOfHumanRightRelatedToTheConfirmedIncident (enum 6), specification, actions | one row | register |
| C08.000 | Revenue by activity | 7 fixed EUR fields (fixed list, not repeatable) | scalars | EQ-10 Σ fossil |

## 3. Conditional dependencies
| worksheet | driver | affected | rule + quote (prod CR text) | encoded? |
|---|---|---|---|---|
| C01…C09 | BasisForPreparation = OptionA | all Comprehensive-module worksheets not applicable | "Comprehensive-Modul → para 45: bei Auslassung „assumed to not be…" (CR-C01-01 text) | NOT encoded (C-module CRs are warn, unconditional) |
| B08.300 | NumberOfEmployees ≥ 50 | EmployeeTurnoverRate required | "Para 40: „If the undertaking employs 50 or more employees, it shall disclose the employee turnover rate …“ Bedingt (Schwellenwert 50). Der Auslöser (Beschäftigtenzahl) ist nicht im…" | CR-B08-03 warn, threshold NOT in condition |
| B07.000 | UndertakingAppliesCircularEconomyPrinciples = true | DescriptionOfHowCircularEconomyPrinciplesAreApplied | "Para 37: … and, if so, how …" | CR-B07-01 only checks the boolean (and is hosted on B01.000 — see dp-vsme-01-cr-mishosting) |
| B05.000 | SiteLocatedIn/Near… = true | AreaOfSiteInBiodiversitySensitiveArea | B5 para 33 | not encoded |
| B06.000 | site in high water-stress area (needs site flag) | AmountOfWaterWithdrawnAtSitesLocatedInAreasOfHighWaterStress | B6 para 35 "separately present the amount of water withdrawn at sites located in areas of high water-stress" | CR-B06-02 warn, no driver |
| B01.000 | UndertakingsLegalForm = Other / Cooperative | OtherUndertakingsLegalForm; B02.100 | B1/B2 | not encoded |
| B01.000 | BasisForReporting = Consolidated | B01.100 subsidiaries | B1 para 24(c) | not encoded |
| B01.000 | ReportContains…Unchanged = true | list + link fields | B1 | not encoded |
| C06.000 | UndertakingHasACodeOfConduct… = true | TypeOfContentCovered…, Specification… | C6 para 61 | CR-C06-01 boolean only |
| C09.000 | governance body exists (no field) | GenderDiversityRatioInGovernanceBody | "If the undertaking has a governance body in place" | CR-C09-01 warn, no driver |
| B11.000 | convictions/fines occurred | number + amount | "In case of convictions and fines in the reporting period" | CR-B11-01 warn |
| C03.300 | high climate impact sector (NACE) | transition plan or date of adoption | C3 | not encoded |
| B03.300 | Turnover (B01) | GHG intensity = emissions / turnover | "Para 31: … calculated by dividing gross GHG emissions … by turnover …" | CR-B03-04 warn; no equation |

## 4. Derived values + inheritance
Equations (10): VSME-EQ-01 `NumberOfEmployees ← Permanent + Temporary`; EQ-02…05 GHG totals (Scope 1 + Scope 2 location/market; + Scope 3); EQ-06/07 waste recycled+disposal (mass/volume); EQ-08/09 hazardous + non-hazardous (mass/volume); EQ-10 fossil revenues ← coal + oil + gas.
Missing derived (documented as computed in CR text but hand-typed): `TotalEnergyConsumption` ← B03.100 Σ; the four GHG intensity values (B03.300) ← totals / Turnover; `TotalMassOfMaterialUsed` / `TotalVolumeOfMaterialUsed` ← Σ B07.300; `RateOfRecordableWorkRelatedAccidents…` ← number / hours-worked basis (basis not in prod — do not invent); `AmountOfEmissionToAir/Water/Soil` ← pollutant_register Σ by medium; `EmployeeTurnoverRate`; B05 count/area ← sites.
Consistency (three decompositions of one total): NumberOfEmployees = Σ contract types (EQ-01) = Σ genders (B08.100) = Σ countries (B08.200) — only the first is an equation.
Re-typed duplicates: `Turnover` (B01) is also the B03.300 denominator (fine if inherited); waste totals `TotalWasteRecycledReusedAndDirectedToDisposalMass` (B07.100) vs `TotalWasteGeneratedMass` (B07.200) — same physical total by two decompositions (kg vs t units!); cross-standard: `TotalAmountOfWaterWithdrawnFromAllSites` / `TotalWaterConsumption` / `WaterDischargeFromUndertakingProductionProcesses` vs ISO-46001 `WD`/`Win`/`Wout` and ISO-59020 `VTWW`/`VTWU`/`VCDW`; `NaceSectorClassificationCodes`, undertaking identity vs ISO-59004 `organization_name`/`organization_type`; energy MWh vs ISO-59020 `EITE_X` (MJ/kWh).

## 5. Summary
Counts: table-lookups 0 numeric (5 classification drivers) / repeatable groups 10 (1 dedicated register live: pollutant_register; 6 XBRL line-item tables modelled as single rows) / conditionals 13 (0 encoded as visibility; 3 partial warns) / equations 10 (+8 missing).

TOP 5 UX wins:
1. Gate the whole Comprehensive module (C01…C09, 9 worksheets) on `BasisForPreparation` — Option-A reporters currently see and get warned on 30+ irrelevant fields.
2. Sites register (B01.200) as the single source for B05 (in/near biodiversity area, ha) and B06 water-stress withdrawal, with count/Σ derived instead of the current one-site scalars.
3. Add the missing roll-up equations the CR texts already describe: TotalEnergyConsumption ← B03.100, GHG intensities ← totals / Turnover, material totals ← B07.300, emission-by-medium ← pollutant_register.
4. Materials, subsidiaries, policies and per-country employee tables as true registers (one row each today) with sums feeding their totals and the employee-total consistency check.
5. Encode the printed thresholds/triggers as conditions: employees ≥ 50 → turnover rate; boolean → description pairs (B7, C6); legal form Other/Cooperative → dependent fields.

Data-quality gaps: NO transcript on disk (PDF/XLSX only) — SR-1 quotes exist only inside CR descriptions; clause_reference is "-" on all 144 fields (dp-vsme-03-sr1-sourcequote-gap); several concepts have `label_de = null` (e.g. OtherUndertakingsLegalFormMember); waste mass in kg (B07.100) vs t (B07.200) — unit inconsistency across two decompositions of one total; CR-B07-01 hosted on B01.000 instead of B07.000; `EmployeeTurnoverRate` and accident rate have no formula basis in prod; some labels are raw camelCase concept names.
