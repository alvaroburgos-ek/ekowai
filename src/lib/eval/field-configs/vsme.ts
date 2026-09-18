/**
 * VSME — Plan 3 Task 24 field configs (the seven XBRL line-item tables as registers,
 * the created Comprehensive-module / governance-body / high-climate-impact drivers,
 * the eight same-worksheet visibility rules) as DATA for
 * `scripts/regulation-tables/emit-field-configs-sql.ts vsme`.
 *
 * THIS STANDARD HAS NO TRANSCRIPT. Every `verification_quote` is prod's own text
 * (grade EV): the compliance_requirements rows carrying the VSME paragraph wording
 * (`vsme-quotes.ts`, generated from the read-only full-text capture
 * `vsme.text.prior.json` — `pq('<CR code>')` tags each cue
 * `[prod verification_quote (Para NN, <CR code>)]`), or — where no CR quotes the
 * paragraph — the prod worksheet title / field label, tagged as such and listed
 * under `vsme-U-1` (a text extraction of `VSME Standard.pdf` would replace them).
 * NO value, threshold, list or NACE sector is typed from memory of the standard:
 * every enum column copies the prior's tokens VERBATIM (`vsme-enums.ts`, generated;
 * the source symbol is named per list); the XLSX template
 * (`VSME-Digital-Template-latest.xlsx`) was read for STRUCTURE only (sheet names +
 * the line-item column headers in `xl/sharedStrings.xml` — see the report §3).
 *
 * Prod facts (captured `vsme.prior.json`, 2026-09-18, read-only): 40 worksheets,
 * each with ONE section coded `VSME-<ws>-A`; 144 fields, NONE inherited
 * (`consumer_worksheets` null on every row — pinned); 10 equations (EQ-01 … EQ-10);
 * 31 gates; the Plan-1 columns (widget / ui_config / lookup / visible_when) absent.
 *
 * Placement rule (a262e trap 1 / m277e trap 2): a rule is EMITTED only where its
 * driver lives on the SAME worksheet — nothing is inherited in VSME, so every
 * cross-worksheet rule of the brief goes to a STAGED consumer edit (C-block) instead
 * of an inert `pending` rule (controller instruction for Task 24):
 *   - the Comprehensive-module sections (12 C-worksheets) ← `BasisForPreparation`
 *     (B01.000) → vsme-C-1;  B01.100 subsidiaries ← `BasisForReporting` → vsme-C-2;
 *     B02.100 cooperative fields ← `UndertakingsLegalForm` → vsme-C-3;
 *   - `EmployeeTurnoverRate` ← `NumberOfEmployees >= 50` (B01.000 → B08.300; the
 *     printed "50 or more employees" IS in prod text, CR-B08-03) → vsme-G-1 (the
 *     gate-aware guard also refuses it: CR-B08-03 reads the symbol);
 *   - `GenderDiversityRatioInGovernanceBody` ← `governance_body_exists == true`:
 *     same worksheet, but CR-C09-01 reads the symbol → vsme-G-3 (the driver IS
 *     created here; the hide follows the IF-guard);
 *   - CR-B07-01 (block) is hosted on B01.000 and reads a B07.000 symbol → vsme-G-2.
 * Register-fed outputs live on their register's worksheet (the engine sees a
 * register of its own worksheet only); the brief's B03.000 / B05.000 / B06.000 /
 * B07.400 placements are STAGED consumer edits (vsme-C-4 … C-7) and the scalar ↔
 * column pairs are D-blocks (amendment K); the first-site scalars of B01.200 are
 * superseded by `sites` (vsme-X-2), untouched.
 */
import type { FieldConfigEntry, FieldConfigModule, SectionVisibilityEntry } from './types';
import { pq, PROD_FIELDS, PROD_WORKSHEETS } from './vsme-quotes';
import {
  BASIS_FOR_PREPARATION_TOKENS, BASIS_FOR_REPORTING_TOKENS, LEGAL_FORM_TOKENS,
  COUNTRY_TOKENS, COUNTRY_LABELS, SUSTAINABILITY_ISSUE_TOKENS, SUSTAINABILITY_ISSUE_LABELS,
  HUMAN_RIGHT_TOKENS, HUMAN_RIGHT_LABELS,
} from './vsme-enums';

const STD = 'VSME';
const on = (worksheet: string) => (e: Omit<FieldConfigEntry, 'standard' | 'worksheet'>): FieldConfigEntry => ({ standard: STD, worksheet, ...e });
const B01 = on('VSME-B01.000');
const B01_100 = on('VSME-B01.100');
const B01_200 = on('VSME-B01.200');
const B02 = on('VSME-B02.000');
const B03_100 = on('VSME-B03.100');
const B03_300 = on('VSME-B03.300');
const B07 = on('VSME-B07.000');
const B07_300 = on('VSME-B07.300');
const B08_200 = on('VSME-B08.200');
const C03_300 = on('VSME-C03.300');
const C06 = on('VSME-C06.000');
const C07 = on('VSME-C07.000');
const C09 = on('VSME-C09.000');

/** prod section code of a worksheet (every VSME worksheet has exactly one section, `<ws>-A` — captured). */
const sec = (ws: string) => `${ws}-A`;
/** prod label of a field (EV) — the register columns are named after the scalars they twin. */
const label = (ws: string, sym: string): string => {
  const f = PROD_FIELDS[`${ws} ${sym}`];
  if (!f) throw new Error(`no prod field ${ws} ${sym}`);
  return f.label_de ?? sym;
};
const title = (ws: string): string => {
  const w = PROD_WORKSHEETS[ws];
  if (!w) throw new Error(`no prod worksheet ${ws}`);
  return `${w.title_de} [prod worksheet_templates.title_de (${ws}) — no paragraph text in prod; vsme-U-1]`;
};

// ---- drivers (prod tokens as captured; booleans are `== true` in the DSL — playbook trap Task 2 (4)) ----
export const OPTION_B = BASIS_FOR_PREPARATION_TOKENS[1]; // 'OptionBBasicModuleAndComprehensiveModuleMember'
export const CONSOLIDATED = BASIS_FOR_REPORTING_TOKENS[0]; // 'ConsolidatedMember'
export const LEGAL_OTHER = LEGAL_FORM_TOKENS[1]; // 'OtherUndertakingsLegalFormMember'
export const LEGAL_COOPERATIVE = LEGAL_FORM_TOKENS[0]; // 'CooperativeMember'
export const COMPREHENSIVE = `BasisForPreparation == '${OPTION_B}'`; // STAGED only (vsme-C-1) — driver not inherited
export const CONSOLIDATED_RULE = `BasisForReporting == '${CONSOLIDATED}'`; // STAGED only (vsme-C-2)
export const LEGAL_FORM_OTHER = `UndertakingsLegalForm == '${LEGAL_OTHER}'`;
export const LEGAL_FORM_COOPERATIVE = `UndertakingsLegalForm == '${LEGAL_COOPERATIVE}'`; // STAGED only (vsme-C-3)
export const UNCHANGED_DISCLOSURES = 'ReportContainsDisclosuresFromThePreviousReportingPeriodThatRemainUnchanged == true';
export const EMPLOYEES_50 = 'NumberOfEmployees >= 50'; // STAGED only (vsme-G-1) — "50 or more employees" is prod text (CR-B08-03)
export const CIRCULAR = 'UndertakingAppliesCircularEconomyPrinciples == true';
export const CODE_OF_CONDUCT = 'UndertakingHasACodeOfConductOrHumanRightsPolicyForItsOwnWorkforce == true';
export const GOVERNANCE_BODY = 'governance_body_exists == true'; // STAGED only (vsme-G-3)
export const HIGH_CLIMATE_IMPACT = 'high_climate_impact_sector == true';
// row-scope drivers of the sites register (`== true` form; the bare-identifier form parses and computes identically — pinned)
export const ROW_BIODIVERSITY = 'in_biodiversity_area == true OR near_biodiversity_area == true';
export const ROW_WATER_STRESS = 'high_water_stress == true';

/** energy_carriers.carrier — the three prod symbols of B03.100 as tokens, their prod labels as option labels. */
export const ENERGY_CARRIERS = ['electricity', 'self_generated', 'fuels'] as const;
export const ENERGY_CARRIER_SYMBOLS: Record<(typeof ENERGY_CARRIERS)[number], string> = {
  electricity: 'EnergyConsumptionFromElectricity',
  self_generated: 'EnergyConsumptionFromSelfGeneratedElectricity',
  fuels: 'EnergyConsumptionFromFuels',
};
const ENERGY_CARRIER_LABELS = Object.fromEntries(ENERGY_CARRIERS.map((c) => [c, label('VSME-B03.100', ENERGY_CARRIER_SYMBOLS[c])])) as Record<string, string>;

const Q_B01_02 = pq('VSME-CR-B01-02', 'source_quote'); // Para 24(c) individual / consolidated basis (subsidiaries)
const Q_B01_09 = pq('VSME-CR-B01-09'); // Para 24(e) "the geolocation of sites"
const Q_B05_01 = pq('VSME-CR-B05-01'); // Para 33 number and area (ha) of sites in or near a biodiversity sensitive area
const Q_B06_01 = pq('VSME-CR-B06-01', 'source_quote'); // Para 35 total withdrawal + separately at sites in high water-stress areas
const Q_B03_01 = pq('VSME-CR-B03-01', 'source_quote'); // Para 29 total energy consumption with a breakdown
const Q_B08_01 = pq('VSME-CR-B08-01'); // Para 39 number of employees for the following metrics
const Q_B01_03 = pq('VSME-CR-B01-03'); // Para 24(e) legal form
const Q_B07_01 = pq('VSME-CR-B07-01', 'source_quote'); // Para 37 "and, if so, how"
const Q_C06_01 = pq('VSME-CR-C06-01'); // Para 61(a) code of conduct YES/NO
const Q_C09_01 = pq('VSME-CR-C09-01'); // Para 65 "If the undertaking has a governance body in place"
const Q_C01_01 = pq('VSME-CR-C01-01'); // Para 47 / para 45 Comprehensive module
const Q_B01_01 = pq('VSME-CR-B01-01'); // Para 24(a) Option A / Option B

export const FIELD_CONFIGS: FieldConfigEntry[] = [
  // ---- VSME-B01.000: same-worksheet visibility (legal form "Other"; the unchanged-disclosures pair) ----
  B01({ symbol: 'OtherUndertakingsLegalForm', widget: 'scalar', ui_config: null, visible_when: LEGAL_FORM_OTHER, verification_quote: `${Q_B01_03} — prod enum token ${LEGAL_OTHER} of UndertakingsLegalForm (label_de null in prod)` }),
  B01({ symbol: 'ListOfDisclosuresForWhichNoChangesAreReportedComparedToThePreviousPeriodReporting', widget: 'select_one', ui_config: null, enum_values: 'keep_prod', visible_when: UNCHANGED_DISCLOSURES, verification_quote: `prod field labels (EV): "${label('VSME-B01.000', 'ReportContainsDisclosuresFromThePreviousReportingPeriodThatRemainUnchanged')}" (boolean driver) → "${label('VSME-B01.000', 'ListOfDisclosuresForWhichNoChangesAreReportedComparedToThePreviousPeriodReporting')}" — no Para text in prod (vsme-U-1); B1` }),
  B01({ symbol: 'LinkToPreviousReportContainingDisclosuresThatRemainUnchanged', widget: 'scalar', ui_config: null, visible_when: UNCHANGED_DISCLOSURES, verification_quote: `prod field labels (EV): "${label('VSME-B01.000', 'ReportContainsDisclosuresFromThePreviousReportingPeriodThatRemainUnchanged')}" (boolean driver) → "${label('VSME-B01.000', 'LinkToPreviousReportContainingDisclosuresThatRemainUnchanged')}" — no Para text in prod (vsme-U-1); B1` }),

  // ---- VSME-B01.100: subsidiaries as N instances (B1 para 24(c)); the register's own visibility ← BasisForReporting is STAGED (vsme-C-2) ----
  B01_100({
    symbol: 'subsidiaries', widget: 'register',
    ui_config: {
      title: 'Subsidiaries (B1 para 24(c))', subtitle: 'one row per subsidiary included in a consolidated report — name and registered address', add_label: '+ subsidiary', placement: 'section',
      columns: [
        { key: 'name', label: label('VSME-B01.100', 'NameOfTheSubsidiary'), type: 'text', required: true, aria_label: 'Name of the subsidiary' },
        { key: 'registered_address', label: label('VSME-B01.100', 'RegisteredAddressOfTheSubsidiary'), type: 'text', aria_label: 'Registered address of the subsidiary' },
      ],
      footer: ['subsidiaries_count'],
      note: 'Meaningful only when the report is prepared on a consolidated basis (BasisForReporting on B01.000 — not inherited here; the rule is STAGED, vsme-C-2). The one-row scalars NameOfTheSubsidiary / RegisteredAddressOfTheSubsidiary stay until ratified (vsme-D-1 / D-2).',
    },
    verification_quote: Q_B01_02,
    create: { section_code: sec('VSME-B01.100'), label_de: 'List of subsidiaries (one row per subsidiary: name, registered address)', data_type: 'json', unit: null, clause_reference: 'VSME B1 para 24(c)',
      description: 'Plan 3: rows per subsidiary (the XBRL line-items table B01.100 as a register); count → subsidiaries_count (VSME-B01.100-D1). The one-row scalars NameOfTheSubsidiary / RegisteredAddressOfTheSubsidiary stay (vsme-D-1 / D-2); visibility under BasisForReporting == ConsolidatedMember is STAGED (vsme-C-2).' },
  }),
  B01_100({
    symbol: 'subsidiaries_count', widget: 'derived', ui_config: null, verification_quote: Q_B01_02,
    create: { section_code: sec('VSME-B01.100'), label_de: 'Number of subsidiaries (from the register)', data_type: 'number', unit: null, clause_reference: 'VSME B1 para 24(c)',
      description: 'Plan 3: output of equation VSME-B01.100-D1 (count_rows over subsidiaries).' },
  }),

  // ---- VSME-B01.200: sites as N instances — drives the B5 biodiversity count / area and the B6 water-stress withdrawal (outputs on this worksheet; C-blocks re-point them) ----
  B01_200({
    symbol: 'sites', widget: 'register',
    ui_config: {
      title: 'Sites (B1 para 24(d))', subtitle: 'one row per site — drives B5 biodiversity flags and B6 water-stress withdrawal', add_label: '+ site', placement: 'section',
      columns: [
        { key: 'country', label: label('VSME-B01.200', 'CountryOfSite'), type: 'enum', options: [...COUNTRY_TOKENS], option_labels: { ...COUNTRY_LABELS }, sort_by_label: true, required: true, aria_label: 'Country of site' },
        { key: 'gps', label: label('VSME-B01.200', 'GPSLocationOfSite'), type: 'text', aria_label: 'GPS location of site' },
        { key: 'address', label: label('VSME-B01.200', 'AddressOfSite'), type: 'text', required: true, aria_label: 'Address of site' },
        { key: 'postal_code', label: label('VSME-B01.200', 'PostalCodeOfSite'), type: 'text', aria_label: 'Postal code of site' },
        { key: 'city', label: label('VSME-B01.200', 'CityOfSite'), type: 'text', aria_label: 'City of site' },
        { key: 'in_biodiversity_area', label: 'in biodiversity-sensitive area', type: 'boolean', aria_label: 'Site located in a biodiversity sensitive area (B5 para 33)' },
        { key: 'near_biodiversity_area', label: 'near biodiversity-sensitive area', type: 'boolean', aria_label: 'Site located near a biodiversity sensitive area (B5 para 33)' },
        { key: 'area_ha', label: 'Area', type: 'number', unit: 'ha', min: 0, visible_when: ROW_BIODIVERSITY, aria_label: 'Area of the site in or near the biodiversity sensitive area in hectares' },
        { key: 'high_water_stress', label: 'high water-stress area', type: 'boolean', aria_label: 'Site located in an area of high water-stress (B6 para 35)' },
        { key: 'water_withdrawn_m3', label: 'Water withdrawn', type: 'number', unit: 'm³', min: 0, visible_when: ROW_WATER_STRESS, aria_label: 'Water withdrawn at this site in cubic metres' },
      ],
      footer: ['sites_in_or_near_biodiversity', 'area_biodiversity_ha', 'AmountOfWaterWithdrawnAtSitesLocatedInAreasOfHighWaterStress_calc'],
      note: 'An unticked box means "not in / near a biodiversity sensitive area" and "not in a high water-stress area" (unset booleans count as false in the row formulas). A ticked flag WITHOUT its figure (area ha / water withdrawn m³) leaves the Σ open (manual_required) — never a silent 0 for a site the paragraph asks the figure of. The one-site scalars CountryOfSite / GPSLocationOfSite / AddressOfSite / PostalCodeOfSite / CityOfSite stay for the first site (vsme-X-2, D-3 … D-7); the B05.000 / B06.000 scalars are the consumers of the three footer values once the consumer edits are ratified (vsme-C-5 / C-6, D-8 … D-11).',
    },
    verification_quote: `${Q_B01_09} — ${Q_B05_01} — ${Q_B06_01}`,
    create: { section_code: sec('VSME-B01.200'), label_de: 'List of sites (one row per site: country, GPS, address, postal code, city, biodiversity flags + area, water-stress flag + withdrawal)', data_type: 'json', unit: null, clause_reference: 'VSME B1 para 24(e); B5 para 33; B6 para 35',
      description: 'Plan 3: rows per site (the XBRL line-items table B01.200 as a register) carrying the per-site B5 flags (in / near a biodiversity sensitive area, area in ha) and the B6 water-stress flag with the water withdrawn; count → sites_in_or_near_biodiversity (VSME-B01.200-D1), Σ ha → area_biodiversity_ha (-D2), Σ m³ at high water-stress sites → AmountOfWaterWithdrawnAtSitesLocatedInAreasOfHighWaterStress_calc (-D3). The first-site scalars stay (vsme-X-2); the B05.000 / B06.000 consumers are STAGED (vsme-C-5 / C-6).' },
  }),
  B01_200({
    symbol: 'sites_in_or_near_biodiversity', widget: 'derived', ui_config: null, verification_quote: Q_B05_01,
    create: { section_code: sec('VSME-B01.200'), label_de: 'Number of sites in or near a biodiversity sensitive area (from the sites register)', data_type: 'number', unit: null, clause_reference: 'VSME B5 para 33',
      description: 'Plan 3: output of equation VSME-B01.200-D1 (count_rows over sites with in_biodiversity_area or near_biodiversity_area ticked); twin of the B05.000 booleans SiteLocatedInABiodiversitySensitiveArea / SiteLocatedNearABiodiversitySensitiveArea (vsme-D-8 / D-9); inheritance into B05.000 STAGED (vsme-C-5).' },
  }),
  B01_200({
    symbol: 'area_biodiversity_ha', widget: 'derived', ui_config: null, verification_quote: Q_B05_01,
    create: { section_code: sec('VSME-B01.200'), label_de: 'Area of sites in or near a biodiversity sensitive area (Σ ha from the sites register)', data_type: 'number', unit: 'ha', clause_reference: 'VSME B5 para 33',
      description: 'Plan 3: output of equation VSME-B01.200-D2 (sum_rows of area_ha over the flagged sites); twin of B05.000 AreaOfSiteInBiodiversitySensitiveArea (vsme-D-10); inheritance STAGED (vsme-C-5).' },
  }),
  B01_200({
    symbol: 'AmountOfWaterWithdrawnAtSitesLocatedInAreasOfHighWaterStress_calc', widget: 'derived', ui_config: null, verification_quote: Q_B06_01,
    create: { section_code: sec('VSME-B01.200'), label_de: 'Water withdrawn at sites located in areas of high water-stress (Σ m³ from the sites register)', data_type: 'number', unit: 'm³', clause_reference: 'VSME B6 para 35',
      description: 'Plan 3: output of equation VSME-B01.200-D3 (sum_rows of water_withdrawn_m3 over the sites flagged high_water_stress); twin of B06.000 AmountOfWaterWithdrawnAtSitesLocatedInAreasOfHighWaterStress (vsme-D-11); inheritance STAGED (vsme-C-6).' },
  }),

  // ---- VSME-B02.000: practices / policies / initiatives as N instances (B2) ----
  B02({
    symbol: 'policies', widget: 'register',
    ui_config: {
      title: 'Practices, policies and future initiatives (B2)', subtitle: 'one row per practice / policy / initiative — sustainability issue addressed, description, public availability, target set, senior-level accountability', add_label: '+ practice / policy', placement: 'section',
      columns: [
        { key: 'issue', label: label('VSME-B02.000', 'SustainabilityIssueAddressedByPracticePolicyAndOrFutureInitiative'), type: 'enum', options: [...SUSTAINABILITY_ISSUE_TOKENS], option_labels: { ...SUSTAINABILITY_ISSUE_LABELS }, required: true, aria_label: 'Sustainability issue addressed' },
        { key: 'description', label: label('VSME-C02.000', 'DescriptionOfPracticesPoliciesAndOrFutureInitiatives'), type: 'text', aria_label: 'Description of the practice, policy or initiative' },
        { key: 'public', label: label('VSME-B02.000', 'PracticePolicyAndOrFutureInitiativeIsPubliclyAvailable'), type: 'boolean', aria_label: 'Publicly available' },
        { key: 'target_set', label: label('VSME-B02.000', 'UndertakingHasSetATargetWhichIsRelatedToAPolicy'), type: 'boolean', aria_label: 'A target related to this policy is set' },
        { key: 'senior_accountable', label: label('VSME-C02.000', 'MostSeniorLevelAccountableForImplementationOfPolicies'), type: 'boolean', aria_label: 'A most senior level accountable for implementation is designated' },
      ],
      footer: ['policies_public_count'],
      note: 'Unticked boxes mean "not publicly available" / "no target" / "no senior level designated". The one-row scalars on B02.000 (issue, public, target) and the C02.000 descriptions stay until ratified (vsme-D-12 … D-16); prod holds ONE stored value on PracticePolicyAndOrFutureInitiativeIsPubliclyAvailable (read-only count 2026-09-18) — its retirement is not data-free.',
    },
    verification_quote: title('VSME-B02.000'),
    create: { section_code: sec('VSME-B02.000'), label_de: 'Practices, policies and/or future initiatives (one row each: issue, description, publicly available, target set, senior level accountable)', data_type: 'json', unit: null, clause_reference: 'VSME B2 (C2)',
      description: 'Plan 3: rows per practice / policy / initiative (the XBRL line-items table B02.000 as a register); publicly available rows → policies_public_count (VSME-B02.000-D1). The one-row scalars stay (vsme-D-12 … D-16). No paragraph text of B2 exists in prod — vsme-U-1.' },
  }),
  B02({
    symbol: 'policies_public_count', widget: 'derived', ui_config: null, verification_quote: title('VSME-B02.000'),
    create: { section_code: sec('VSME-B02.000'), label_de: 'Number of publicly available practices / policies / initiatives (from the register)', data_type: 'number', unit: null, clause_reference: 'VSME B2',
      description: 'Plan 3: output of equation VSME-B02.000-D1 (count_rows over policies with public ticked).' },
  }),

  // ---- VSME-B03.100: energy carriers as rows (B3 para 29 "with a breakdown as per the table below"); the Σ twin of TotalEnergyConsumption (B03.000) lives here (register worksheet) ----
  B03_100({
    symbol: 'energy_carriers', widget: 'register',
    ui_config: {
      title: 'Energy consumption breakdown (B3 para 29)', subtitle: 'one row per energy carrier — the three prod line items as options, consumption in MWh', add_label: '+ energy carrier', placement: 'section',
      columns: [
        { key: 'carrier', label: 'Energy carrier', type: 'enum', options: [...ENERGY_CARRIERS], option_labels: { ...ENERGY_CARRIER_LABELS }, required: true, aria_label: 'Energy carrier (electricity / self-generated electricity / fuels)' },
        { key: 'mwh', label: 'Energy consumption', type: 'number', unit: 'MWh', min: 0, required: true, aria_label: 'Energy consumption of this carrier in MWh' },
      ],
      footer: ['TotalEnergyConsumption_calc'],
      note: 'Σ MWh over the rows → TotalEnergyConsumption_calc (VSME-B03.100-D1), the computed twin of TotalEnergyConsumption on B03.000 (typed today; inheritance STAGED vsme-C-4, pair vsme-D-17). The three scalars EnergyConsumptionFromElectricity / …SelfGeneratedElectricity / …Fuels stay (vsme-D-18 … D-20).',
    },
    verification_quote: Q_B03_01,
    create: { section_code: sec('VSME-B03.100'), label_de: 'Energy consumption by carrier (one row each: carrier, MWh)', data_type: 'json', unit: null, clause_reference: 'VSME B3 para 29',
      description: 'Plan 3: rows per energy carrier (the B03.100 breakdown as a register; options = the three prod symbols EnergyConsumptionFromElectricity / EnergyConsumptionFromSelfGeneratedElectricity / EnergyConsumptionFromFuels); Σ → TotalEnergyConsumption_calc (VSME-B03.100-D1). The three scalars stay (vsme-D-18 … D-20).' },
  }),
  B03_100({
    symbol: 'TotalEnergyConsumption_calc', widget: 'derived', ui_config: null, verification_quote: Q_B03_01,
    create: { section_code: sec('VSME-B03.100'), label_de: 'Total energy consumption (Σ MWh from the energy-carrier register)', data_type: 'number', unit: 'MWh', clause_reference: 'VSME B3 para 29',
      description: 'Plan 3: output of equation VSME-B03.100-D1 (sum_rows of mwh over energy_carriers); computed twin of B03.000 TotalEnergyConsumption (vsme-D-17); inheritance into B03.000 STAGED (vsme-C-4).' },
  }),

  // ---- VSME-B03.300: the four GHG-intensity twins (B3 para 31 "dividing gross GHG emissions … by turnover"); their inputs live on B03.200 / B01.000 and are NOT inherited — the equations are emitted, the consumer edits STAGED (vsme-C-7) ----
  ...([
    ['GHGIntensity_total_location_calc', 'TotalLocationBasedGreenhouseGasEmissionsIntensityValue', 'TotalGrossLocationBasedGHGEmissions', 'D1'],
    ['GHGIntensity_total_market_calc', 'TotalMarketBasedGreenhouseGasEmissionsIntensityValue', 'TotalGrossMarketBasedGHGEmissions', 'D2'],
    ['GHGIntensity_s12_location_calc', 'Scope1AndScope2GreenhouseGasEmissionsIntensityValueLocationBased', 'TotalGrossLocationBasedScope1AndScope2GHGEmissions', 'D3'],
    ['GHGIntensity_s12_market_calc', 'Scope1AndScope2GreenhouseGasEmissionsIntensityValueMarketBased', 'TotalGrossMarketBasedScope1AndScope2GHGEmissions', 'D4'],
  ] as const).map(([sym, twin, total, n]) => B03_300({
    symbol: sym, widget: 'derived', ui_config: null, verification_quote: pq('VSME-CR-B03-04'),
    create: { section_code: sec('VSME-B03.300'), label_de: `${label('VSME-B03.300', twin)} (computed: ${total} / Turnover)`, data_type: 'number', unit: 'tCO2eq/EUR', clause_reference: 'VSME B3 para 31',
      description: `Plan 3: output of equation VSME-B03.300-${n} (${total} / Turnover — the B03.200 total and the B01.000 turnover are not inherited into B03.300 today, so the value is manual_required until the consumer edit vsme-C-7 is ratified); computed twin of the typed ${twin} (vsme-D-${21 + Number(n[1]) - 1}).` },
  })),

  // ---- VSME-B07.000: the "if so, how" description under the circular-economy yes/no (B7 para 37; same worksheet; CR-B07-01 reads the DRIVER only and is mis-hosted on B01.000 — vsme-G-2) ----
  B07({ symbol: 'DescriptionOfHowCircularEconomyPrinciplesAreApplied', widget: 'scalar', ui_config: null, visible_when: CIRCULAR, verification_quote: Q_B07_01 }),

  // ---- VSME-B07.300: materials as rows (B7); the Σ twins of the B07.400 totals live here (register worksheet) ----
  B07_300({
    symbol: 'materials', widget: 'register',
    ui_config: {
      title: 'Materials used (B7)', subtitle: 'one row per relevant material — name, annual mass in t and/or volume in m³', add_label: '+ material', placement: 'section',
      columns: [
        { key: 'name', label: label('VSME-B07.300', 'NameOfMaterialUsed'), type: 'text', required: true, aria_label: 'Name of the material used' },
        { key: 'weight_t', label: label('VSME-B07.300', 'WeightOfMaterialUsed'), type: 'number', unit: 't', min: 0, aria_label: 'Weight of the material used in tonnes' },
        { key: 'volume_m3', label: label('VSME-B07.300', 'VolumeOfMaterialUsed'), type: 'number', unit: 'm³', min: 0, aria_label: 'Volume of the material used in cubic metres' },
      ],
      footer: ['TotalMassOfMaterialUsed_calc', 'TotalVolumeOfMaterialUsed_calc'],
      note: 'A material reported by mass only (or by volume only) leaves the other cell empty — an empty cell counts as 0 in the two Σ (never blocks the row). The one-row scalars NameOfMaterialUsed / WeightOfMaterialUsed / VolumeOfMaterialUsed stay (vsme-D-25 … D-27); the B07.400 totals are the consumers once vsme-C-8 is ratified (vsme-D-28 / D-29).',
    },
    verification_quote: title('VSME-B07.300'),
    create: { section_code: sec('VSME-B07.300'), label_de: 'Materials used (one row each: name, weight t, volume m³)', data_type: 'json', unit: null, clause_reference: 'VSME B7',
      description: 'Plan 3: rows per material (the XBRL line-items table B07.300 as a register); Σ t → TotalMassOfMaterialUsed_calc (VSME-B07.300-D1), Σ m³ → TotalVolumeOfMaterialUsed_calc (-D2). The one-row scalars stay (vsme-D-25 … D-27); the B07.400 consumers are STAGED (vsme-C-8). No paragraph text of B7 materials exists in prod — vsme-U-1.' },
  }),
  B07_300({
    symbol: 'TotalMassOfMaterialUsed_calc', widget: 'derived', ui_config: null, verification_quote: title('VSME-B07.400'),
    create: { section_code: sec('VSME-B07.300'), label_de: 'Total weight of material used (Σ t from the materials register)', data_type: 'number', unit: 't', clause_reference: 'VSME B7',
      description: 'Plan 3: output of equation VSME-B07.300-D1 (sum_rows of weight_t over materials, empty cells as 0); computed twin of B07.400 TotalMassOfMaterialUsed (vsme-D-28); inheritance STAGED (vsme-C-8).' },
  }),
  B07_300({
    symbol: 'TotalVolumeOfMaterialUsed_calc', widget: 'derived', ui_config: null, verification_quote: title('VSME-B07.400'),
    create: { section_code: sec('VSME-B07.300'), label_de: 'Total volume of material used (Σ m³ from the materials register)', data_type: 'number', unit: 'm³', clause_reference: 'VSME B7',
      description: 'Plan 3: output of equation VSME-B07.300-D2 (sum_rows of volume_m3 over materials, empty cells as 0); computed twin of B07.400 TotalVolumeOfMaterialUsed (vsme-D-29); inheritance STAGED (vsme-C-8).' },
  }),

  // ---- VSME-B08.200: employees per country as rows (B8); Σ and the consistency delta against NumberOfEmployees (B01.000 — not inherited; vsme-C-9) ----
  B08_200({
    symbol: 'employees_by_country', widget: 'register',
    ui_config: {
      title: 'Employees by country of employment contract (B8)', subtitle: 'one row per country — headcount / FTE as chosen on B01.000 (TypeOfNumberOfEmployees)', add_label: '+ country', placement: 'section',
      columns: [
        { key: 'country', label: 'Country of employment contract', type: 'enum', options: [...COUNTRY_TOKENS], option_labels: { ...COUNTRY_LABELS }, sort_by_label: true, required: true, aria_label: 'Country of the employment contract' },
        { key: 'count', label: label('VSME-B08.200', 'NumberOfEmployeesForCountryOfEmploymentContract'), type: 'number', min: 0, required: true, aria_label: 'Number of employees with a contract in this country' },
      ],
      footer: ['employees_by_country_sum', 'employees_country_delta'],
      note: 'Σ over the rows → employees_by_country_sum (VSME-B08.200-D1); employees_country_delta = NumberOfEmployees − Σ (VSME-B08.200-D2) is the consistency check against the B01.000 total — manual_required until NumberOfEmployees is inherited here (vsme-C-9). The one-row scalar NumberOfEmployeesForCountryOfEmploymentContract stays (vsme-D-30). Country tokens = prod CountryOfSite (identical to CountryOfPrimaryOperationsAndLocationOfSignificantAssets, pinned).',
    },
    verification_quote: `${Q_B08_01} — ${title('VSME-B08.200')}`,
    create: { section_code: sec('VSME-B08.200'), label_de: 'Employees by country of employment contract (one row each: country, number)', data_type: 'json', unit: null, clause_reference: 'VSME B8 para 39',
      description: 'Plan 3: rows per country (the XBRL line-items table B08.200 as a register); Σ → employees_by_country_sum (VSME-B08.200-D1), NumberOfEmployees − Σ → employees_country_delta (-D2). The one-row scalar stays (vsme-D-30); the inheritance of NumberOfEmployees is STAGED (vsme-C-9). The country metric is not quoted in prod text — vsme-U-1.' },
  }),
  B08_200({
    symbol: 'employees_by_country_sum', widget: 'derived', ui_config: null, verification_quote: `${Q_B08_01} — ${title('VSME-B08.200')}`,
    create: { section_code: sec('VSME-B08.200'), label_de: 'Number of employees (Σ over the countries of employment contract)', data_type: 'number', unit: null, clause_reference: 'VSME B8 para 39',
      description: 'Plan 3: output of equation VSME-B08.200-D1 (sum_rows of count over employees_by_country).' },
  }),
  B08_200({
    symbol: 'employees_country_delta', widget: 'derived', ui_config: null, verification_quote: `${pq('VSME-CR-B01-07')} — ${Q_B08_01}`,
    create: { section_code: sec('VSME-B08.200'), label_de: 'Consistency: NumberOfEmployees (B01.000) − Σ employees by country (0 = consistent)', data_type: 'number', unit: null, clause_reference: 'VSME B1 para 24(e); B8 para 39',
      description: 'Plan 3: output of equation VSME-B08.200-D2 (NumberOfEmployees − sum_rows(employees_by_country, count)); NumberOfEmployees is a B01.000 field (typed, also EQ-01 output) and is not inherited into B08.200 today — the value is manual_required until vsme-C-9 is ratified.' },
  }),

  // ---- VSME-C03.300: transition plan only for high climate impact sectors (C3) — created boolean driver; the NACE-list derivation is vsme-F-2 ----
  C03_300({
    symbol: 'high_climate_impact_sector', widget: 'attestation', ui_config: null, verification_quote: title('VSME-C03.300'),
    create: { section_code: sec('VSME-C03.300'), label_de: 'Undertaking operates in a high climate impact sector (C3)', data_type: 'boolean', unit: null, clause_reference: 'VSME C3',
      description: 'Plan 3: driver of the C3 transition-plan disclosures (DescriptionOfATransitionPlan… / DateOfAdoption…); the derivation from NaceSectorClassificationCodes needs the printed sector list, which is not in prod — vsme-F-2 (engineer attestation until then).' },
  }),
  C03_300({ symbol: 'DescriptionOfATransitionPlanForClimateChangeMitigationIncludingAnExplanationOfHowItIsContributingToReduceGhgEmissions', widget: 'scalar', ui_config: null, visible_when: HIGH_CLIMATE_IMPACT, verification_quote: title('VSME-C03.300') }),
  C03_300({ symbol: 'DateOfAdoptionOfTransitionPlanForUndertakingNotHavingAdoptedTransitionPlanYet', widget: 'scalar', ui_config: null, visible_when: HIGH_CLIMATE_IMPACT, verification_quote: title('VSME-C03.300') }),

  // ---- VSME-C06.000: the code-of-conduct content pair under the YES/NO (C6 para 61(a); same worksheet; CR-C06-01 reads the driver only) ----
  C06({ symbol: 'TypeOfContentCoveredByTheCodeOfConductOrHumanRightsPolicyForItsOwnWorkforce', widget: 'select_one', ui_config: null, enum_values: 'keep_prod', visible_when: CODE_OF_CONDUCT, verification_quote: Q_C06_01 }),
  C06({ symbol: 'SpecificationOfOtherTypesOfContentCoveredByTheCodeOfConductOrHumanRightsPolicy', widget: 'scalar', ui_config: null, visible_when: CODE_OF_CONDUCT, verification_quote: Q_C06_01 }),

  // ---- VSME-C07.000: confirmed human-rights incidents as rows (C7) ----
  C07({
    symbol: 'human_rights_incidents', widget: 'register',
    ui_config: {
      title: 'Confirmed severe negative human rights incidents (C7)', subtitle: 'one row per confirmed incident — type of human right, specification, actions taken', add_label: '+ incident', placement: 'section',
      columns: [
        { key: 'type', label: label('VSME-C07.000', 'TypeOfHumanRightRelatedToTheConfirmedIncident'), type: 'enum', options: [...HUMAN_RIGHT_TOKENS], option_labels: { ...HUMAN_RIGHT_LABELS }, required: true, aria_label: 'Type of human right related to the confirmed incident' },
        { key: 'specification', label: label('VSME-C07.000', 'SpecificationOfOtherHumanRightsRelatedToTheConfirmedIncident'), type: 'text', aria_label: 'Specification of the incident (other human rights, value-chain workers, communities, consumers)' },
        { key: 'actions', label: label('VSME-C07.000', 'DescriptionOfActionsTakeToAddressTheConfirmedIncidents'), type: 'text', aria_label: 'Actions taken to address the confirmed incident' },
      ],
      note: 'Rows are entered only when UndertakingHasConfirmedHumanRightsIncidentsInItsOwnWorkforce / UndertakingIsAwareOfAnyConfirmedIncidents… is yes (no rule emitted — no paragraph text in prod carries the condition, vsme-U-1). The one-row scalars stay (vsme-D-31 … D-33).',
    },
    verification_quote: title('VSME-C07.000'),
    create: { section_code: sec('VSME-C07.000'), label_de: 'Confirmed human rights incidents (one row each: type, specification, actions)', data_type: 'json', unit: null, clause_reference: 'VSME C7',
      description: 'Plan 3: rows per confirmed incident (the XBRL line-items table C07.000 as a register; type tokens = prod TypeOfHumanRightRelatedToTheConfirmedIncident). The one-row scalars stay (vsme-D-31 … D-33). No paragraph text of C7 exists in prod — vsme-U-1.' },
  }),

  // ---- VSME-C09.000: the governance-body driver (C9 para 65) — created; the hide of GenderDiversityRatioInGovernanceBody is refused by the gate-aware guard (CR-C09-01) → vsme-G-3 ----
  C09({
    symbol: 'governance_body_exists', widget: 'attestation', ui_config: null, verification_quote: Q_C09_01,
    create: { section_code: sec('VSME-C09.000'), label_de: 'Undertaking has a governance body in place (C9 para 65)', data_type: 'boolean', unit: null, clause_reference: 'VSME C9 para 65',
      description: 'Plan 3: driver of the C9 gender-diversity disclosure („If the undertaking has a governance body in place …“); the hide of GenderDiversityRatioInGovernanceBody and the IF-guard of CR-C09-01 are STAGED together (vsme-G-3).' },
  }),
];

/**
 * Section rules: NONE emitted. The brief's whole-module gating (every top-level section
 * of the 12 C-worksheets ← BasisForPreparation == OptionB, cue Para 24(a) / CR-C01-01
 * "Comprehensive-Modul → para 45: bei Auslassung „assumed to not be applicable“") and
 * the B01.100 rule (← BasisForReporting == ConsolidatedMember, Para 24(c)) key on
 * B01.000 drivers that NO worksheet inherits (`consumer_worksheets` null everywhere —
 * pinned), so they could not resolve on the form either: STAGED as vsme-C-1 / vsme-C-2
 * (consumer edit + section UPDATEs in one transaction). The cue constants are exported
 * so the STAGED file and the tests read the same strings.
 */
export const SECTION_VISIBILITY: SectionVisibilityEntry[] = [];
export const COMPREHENSIVE_WORKSHEETS = ['VSME-C01.000', 'VSME-C02.000', 'VSME-C03.000', 'VSME-C03.200', 'VSME-C03.300', 'VSME-C04.000', 'VSME-C05.000', 'VSME-C06.000', 'VSME-C07.000', 'VSME-C08.000', 'VSME-C08.100', 'VSME-C09.000'] as const;
export const STAGED_SECTION_RULES: SectionVisibilityEntry[] = [
  ...COMPREHENSIVE_WORKSHEETS.map((ws) => ({ standard: STD, worksheet: ws, section_code: sec(ws), visible_when: COMPREHENSIVE, verification_quote: `${Q_B01_01} — ${Q_C01_01}` })),
  { standard: STD, worksheet: 'VSME-B01.100', section_code: sec('VSME-B01.100'), visible_when: CONSOLIDATED_RULE, verification_quote: Q_B01_02 },
  { standard: STD, worksheet: 'VSME-B02.100', section_code: sec('VSME-B02.100'), visible_when: LEGAL_FORM_COOPERATIVE, verification_quote: `${Q_B01_03} — ${title('VSME-B02.100')}` },
];

/** Type-level pin that this module has the shape the emitter's index expects. */
export const MODULE: FieldConfigModule = { FIELD_CONFIGS, SECTION_VISIBILITY };
