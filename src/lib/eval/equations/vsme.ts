/**
 * VSME — Plan 3 Task 24 derived values as DATA for
 * `scripts/regulation-tables/emit-equations-sql.ts vsme` (NEW equation rows only;
 * `ON CONFLICT DO NOTHING`). No transcript exists: every `verification_quote` is
 * prod's own paragraph wording from the compliance_requirements rows (grade EV,
 * `vsme-quotes.ts` → `pq('<CR code>')`), or `null` where prod carries no paragraph
 * text for the derivation (B2 policies, B7 materials, B8 by-country — listed under
 * vsme-U-1; the sentence describing the roll-up is then the prod worksheet title).
 *
 * Single-source: no row here outputs a symbol prod already produces (EQ-01 … EQ-10
 * and the three Plan-2a `AmountOfEmissionTo*` fallbacks on B04.100 are untouched);
 * every output is a `_calc` / count / Σ twin of a typed prod scalar, paired on the
 * sign-off sheet (amendment K), or a new consistency value. No figure is typed into
 * a formula (the only literal is the structural `0` of `if(x IS NULL, 0, x)` /
 * `if(flag, x, 0)`) — pinned.
 *
 * Placement: register-fed rows live on their register's worksheet (the engine sees
 * a register of its own worksheet only) — the brief's B03.000 / B05.000 / B06.000 /
 * B07.400 placements become STAGED consumer edits (vsme-C-4 … C-8). The four
 * B03.300 intensity rows and the B08.200 delta name scalars of OTHER worksheets
 * (B03.200 totals, B01.000 Turnover / NumberOfEmployees) that are not inherited today
 * (`consumer_worksheets` null everywhere): they evaluate `manual_required`
 * ("Fehlende oder leere Eingaben: …" — pinned) until vsme-C-7 / C-9 are ratified — fail-safe, never a
 * phantom value; the save-path materialiser resolves scalar inputs from the
 * worksheet's own fields only (Task 17 trap 1), so those five rows compute on the
 * form / report / PDF after the consumer edit, not on save (amendment D, vsme-I-1).
 *
 * NOT emitted: `EmployeeTurnoverRate` and `RateOfRecordableWorkRelatedAccidents…`
 * (their bases are not in prod text — vsme-F-1); the NACE-driven
 * `high_climate_impact_sector` (vsme-F-2).
 */
import type { EquationEntry, EquationModule } from '../field-configs/types';
import { pq } from '../field-configs/vsme-quotes';

const STD = 'VSME';

export const EQUATIONS: EquationEntry[] = [
  // ---- VSME-B01.100: subsidiaries ----
  {
    standard: STD, worksheet: 'VSME-B01.100', equation_number: 'VSME-B01.100-D1',
    formula: 'subsidiaries_count = count_rows(subsidiaries)',
    input_symbols: ['subsidiaries'], output_symbol: 'subsidiaries_count', output_unit: null,
    clause_reference: 'VSME B1 para 24(c)',
    description: 'Plan 3: number of subsidiaries entered in the register (consolidated basis, B1 para 24(c)).',
    verification_quote: pq('VSME-CR-B01-02', 'source_quote'),
  },

  // ---- VSME-B01.200: sites → B5 count / area, B6 water-stress withdrawal ----
  {
    standard: STD, worksheet: 'VSME-B01.200', equation_number: 'VSME-B01.200-D1',
    formula: 'sites_in_or_near_biodiversity = count_rows(sites, in_biodiversity_area == true OR near_biodiversity_area == true)',
    input_symbols: ['sites'], output_symbol: 'sites_in_or_near_biodiversity', output_unit: null,
    clause_reference: 'VSME B5 para 33',
    description: 'Plan 3: number of sites flagged in or near a biodiversity sensitive area (B5 para 33 "the number and area (in hectares) of sites"); an unset box counts as false. Twin of the B05.000 booleans (vsme-D-8 / D-9); inheritance into B05.000 STAGED (vsme-C-5).',
    verification_quote: pq('VSME-CR-B05-01'),
  },
  {
    standard: STD, worksheet: 'VSME-B01.200', equation_number: 'VSME-B01.200-D2',
    formula: 'area_biodiversity_ha = sum_rows(sites, if(in_biodiversity_area == true OR near_biodiversity_area == true, area_ha, 0))',
    input_symbols: ['sites'], output_symbol: 'area_biodiversity_ha', output_unit: 'ha',
    clause_reference: 'VSME B5 para 33',
    description: 'Plan 3: area in hectares of the sites flagged in or near a biodiversity sensitive area (Σ area_ha over the flagged rows; unflagged rows contribute 0). Twin of B05.000 AreaOfSiteInBiodiversitySensitiveArea (vsme-D-10); inheritance STAGED (vsme-C-5). An EMPTY register is manual_required ("Keine vollständigen Zeilen"), never 0; a flagged site WITHOUT its area leaves the Σ open (manual_required naming area_ha), never a silent 0 ha.',
    verification_quote: pq('VSME-CR-B05-01'),
  },
  {
    standard: STD, worksheet: 'VSME-B01.200', equation_number: 'VSME-B01.200-D3',
    formula: 'AmountOfWaterWithdrawnAtSitesLocatedInAreasOfHighWaterStress_calc = sum_rows(sites, if(high_water_stress == true, water_withdrawn_m3, 0))',
    input_symbols: ['sites'], output_symbol: 'AmountOfWaterWithdrawnAtSitesLocatedInAreasOfHighWaterStress_calc', output_unit: 'm³',
    clause_reference: 'VSME B6 para 35',
    description: 'Plan 3: water withdrawn at the sites flagged high water-stress (Σ water_withdrawn_m3 over the flagged rows; other rows contribute 0 — a stored cell of an unflagged row is ignored, the Σ branches on the flag; a flagged site WITHOUT its figure leaves the Σ open — manual_required). Twin of B06.000 AmountOfWaterWithdrawnAtSitesLocatedInAreasOfHighWaterStress (vsme-D-11); inheritance STAGED (vsme-C-6).',
    verification_quote: pq('VSME-CR-B06-01', 'source_quote'),
  },

  // ---- VSME-B02.000: policies ----
  {
    standard: STD, worksheet: 'VSME-B02.000', equation_number: 'VSME-B02.000-D1',
    formula: 'policies_public_count = count_rows(policies, public == true)',
    input_symbols: ['policies'], output_symbol: 'policies_public_count', output_unit: null,
    clause_reference: 'VSME B2',
    description: 'Plan 3: number of practices / policies / initiatives marked publicly available (B2). No paragraph text of B2 exists in prod — vsme-U-1.',
    verification_quote: null,
  },

  // ---- VSME-B03.100: energy carriers → total energy consumption (B3 para 29) ----
  {
    standard: STD, worksheet: 'VSME-B03.100', equation_number: 'VSME-B03.100-D1',
    formula: 'TotalEnergyConsumption_calc = sum_rows(energy_carriers, mwh)',
    input_symbols: ['energy_carriers'], output_symbol: 'TotalEnergyConsumption_calc', output_unit: 'MWh',
    clause_reference: 'VSME B3 para 29',
    description: 'Plan 3: total energy consumption in MWh as the Σ of the carrier rows (B3 para 29 "with a breakdown as per the table below"); computed twin of B03.000 TotalEnergyConsumption (vsme-D-17); inheritance STAGED (vsme-C-4). An EMPTY register is manual_required, never 0.',
    verification_quote: pq('VSME-CR-B03-01', 'source_quote'),
  },

  // ---- VSME-B03.300: GHG intensity = gross GHG emissions / turnover (B3 para 31) — inputs on B03.200 / B01.000, consumer edit STAGED (vsme-C-7) ----
  ...([
    ['D1', 'GHGIntensity_total_location_calc', 'TotalGrossLocationBasedGHGEmissions', 'TotalLocationBasedGreenhouseGasEmissionsIntensityValue'],
    ['D2', 'GHGIntensity_total_market_calc', 'TotalGrossMarketBasedGHGEmissions', 'TotalMarketBasedGreenhouseGasEmissionsIntensityValue'],
    ['D3', 'GHGIntensity_s12_location_calc', 'TotalGrossLocationBasedScope1AndScope2GHGEmissions', 'Scope1AndScope2GreenhouseGasEmissionsIntensityValueLocationBased'],
    ['D4', 'GHGIntensity_s12_market_calc', 'TotalGrossMarketBasedScope1AndScope2GHGEmissions', 'Scope1AndScope2GreenhouseGasEmissionsIntensityValueMarketBased'],
  ] as const).map(([n, out, total, twin]): EquationEntry => ({
    standard: STD, worksheet: 'VSME-B03.300', equation_number: `VSME-B03.300-${n}`,
    formula: `${out} = ${total} / Turnover`,
    input_symbols: [total, 'Turnover'], output_symbol: out, output_unit: 'tCO2eq/EUR',
    clause_reference: 'VSME B3 para 31',
    description: `Plan 3: GHG intensity "calculated by dividing gross GHG emissions … by turnover" (B3 para 31) — ${total} (B03.200, EQ-0x output) over Turnover (B01.000); computed twin of the typed ${twin}. Neither input is inherited into B03.300 today ⇒ manual_required until vsme-C-7 is ratified; Turnover = 0 ⇒ "Division durch Null" (manual_required).`,
    verification_quote: pq('VSME-CR-B03-04'),
  })),

  // ---- VSME-B07.300: materials → totals (B7) ----
  {
    standard: STD, worksheet: 'VSME-B07.300', equation_number: 'VSME-B07.300-D1',
    formula: 'TotalMassOfMaterialUsed_calc = sum_rows(materials, if(weight_t IS NULL, 0, weight_t))',
    input_symbols: ['materials'], output_symbol: 'TotalMassOfMaterialUsed_calc', output_unit: 't',
    clause_reference: 'VSME B7',
    description: 'Plan 3: total annual mass of materials used (Σ weight_t over the rows; a material reported by volume only contributes 0 t); computed twin of B07.400 TotalMassOfMaterialUsed (vsme-D-28); inheritance STAGED (vsme-C-8). No paragraph text of the B7 mass-flow exists in prod — vsme-U-1.',
    verification_quote: null,
  },
  {
    standard: STD, worksheet: 'VSME-B07.300', equation_number: 'VSME-B07.300-D2',
    formula: 'TotalVolumeOfMaterialUsed_calc = sum_rows(materials, if(volume_m3 IS NULL, 0, volume_m3))',
    input_symbols: ['materials'], output_symbol: 'TotalVolumeOfMaterialUsed_calc', output_unit: 'm³',
    clause_reference: 'VSME B7',
    description: 'Plan 3: total annual volume of materials used (Σ volume_m3 over the rows; a material reported by mass only contributes 0 m³); computed twin of B07.400 TotalVolumeOfMaterialUsed (vsme-D-29); inheritance STAGED (vsme-C-8). vsme-U-1.',
    verification_quote: null,
  },

  // ---- VSME-B08.200: employees by country → Σ and the consistency delta (B8 para 39 / B1 para 24(e)) ----
  {
    standard: STD, worksheet: 'VSME-B08.200', equation_number: 'VSME-B08.200-D1',
    formula: 'employees_by_country_sum = sum_rows(employees_by_country, count)',
    input_symbols: ['employees_by_country'], output_symbol: 'employees_by_country_sum', output_unit: null,
    clause_reference: 'VSME B8 para 39',
    description: 'Plan 3: number of employees as the Σ over the countries of employment contract (the third decomposition of NumberOfEmployees beside EQ-01 contract types and B08.100 genders). The country metric is not quoted in prod text — vsme-U-1.',
    verification_quote: null,
  },
  {
    standard: STD, worksheet: 'VSME-B08.200', equation_number: 'VSME-B08.200-D2',
    formula: 'employees_country_delta = NumberOfEmployees - sum_rows(employees_by_country, count)',
    input_symbols: ['NumberOfEmployees', 'employees_by_country'], output_symbol: 'employees_country_delta', output_unit: null,
    clause_reference: 'VSME B1 para 24(e); B8 para 39',
    description: 'Plan 3: consistency check NumberOfEmployees (B01.000, typed / EQ-01) − Σ employees by country (0 = consistent; the Σ is inlined, never chained on -D1 — Task 16 trap 2). NumberOfEmployees is not inherited into B08.200 today ⇒ manual_required until vsme-C-9 is ratified.',
    verification_quote: pq('VSME-CR-B01-07'),
  },
];

/** Type-level pin that this module has the shape the emitter's index expects. */
export const MODULE: EquationModule = { EQUATIONS };
