/**
 * Plan 3 Task 24 — VSME field configs: every entry parses through the zod
 * contract, every enum column copies the captured prod tokens byte-for-byte
 * (controller resolution (2)), no register column is keyed `id` or shadows a prod
 * symbol of its worksheet (amendment P), every EMITTED rule keys on a driver of its
 * OWN worksheet (nothing is inherited in VSME — pinned: consumer_worksheets is null
 * on all 144 rows), the STAGED refusals (G-1 CR-B08-03, G-3 CR-C09-01) are asserted
 * through the emitter's own guards, the cross-worksheet rules the brief asked for
 * are withheld by the task rule (the emitter would accept them — pinned, so the
 * withholding is visible), and the committed migration equals a fresh emit.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  FIELD_CONFIGS, SECTION_VISIBILITY, STAGED_SECTION_RULES, COMPREHENSIVE_WORKSHEETS,
  OPTION_B, CONSOLIDATED, LEGAL_OTHER, LEGAL_COOPERATIVE, COMPREHENSIVE, CONSOLIDATED_RULE, LEGAL_FORM_OTHER, LEGAL_FORM_COOPERATIVE,
  UNCHANGED_DISCLOSURES, EMPLOYEES_50, CIRCULAR, CODE_OF_CONDUCT, GOVERNANCE_BODY, HIGH_CLIMATE_IMPACT, ROW_BIODIVERSITY, ROW_WATER_STRESS,
  ENERGY_CARRIERS, ENERGY_CARRIER_SYMBOLS,
} from '../field-configs/vsme';
import {
  BASIS_FOR_PREPARATION_TOKENS, BASIS_FOR_REPORTING_TOKENS, LEGAL_FORM_TOKENS, COUNTRY_TOKENS, COUNTRY_LABELS,
  SUSTAINABILITY_ISSUE_TOKENS, HUMAN_RIGHT_TOKENS,
} from '../field-configs/vsme-enums';
import { PROD_QUOTES, PROD_FIELDS, pq } from '../field-configs/vsme-quotes';
import type { PriorSnapshot } from '../field-configs/types';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { parseCondition, parseNumeric } from '@/lib/expr';
import { emitFieldConfigSql, fieldConfigFilesFor, loadPriorSnapshot, producerChain, gateReaders } from '../../../../scripts/regulation-tables/emit-field-configs-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const prior: PriorSnapshot = loadPriorSnapshot(join(ROOT, 'src/lib/eval/field-configs/vsme.prior.json'));
const norm = (s: string) => s.replace(/\r\n/g, '\n');
type Row = { enum_values?: unknown; consumer_worksheets?: string[] | null; data_type?: string; section_code?: string | null };
const priorRow = (key: string) => (prior as unknown as Record<string, Row>)[key];
const enumValues = (key: string): string[] => (priorRow(key).enum_values as Array<{ value: string }>).map((e) => e.value);
const byKey = (ws: string, sym: string) => FIELD_CONFIGS.find((e) => e.worksheet === ws && e.symbol === sym)!;
const registerCfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: byKey(ws, sym).ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const STD = 'VSME';
const rule = (ws: string, sym: string, visible_when: string) => ({ standard: STD, worksheet: ws, symbol: sym, widget: 'scalar' as const, ui_config: null, visible_when, verification_quote: 'q' });
const fieldKeys = Object.keys(prior).filter((k) => k.includes(' ') && !['sections', 'equations', 'gates', '_meta'].includes(k));
const prodSymbols = (ws: string) => fieldKeys.filter((k) => k.startsWith(`${ws} `)).map((k) => k.slice(ws.length + 1));

describe('VSME field configs (Plan 3 Task 24)', () => {
  it('every entry parses through parseFieldConfig; visible_when / row conditions parse; create descriptions carry the rollback selector; no section rule emitted; no register column keyed `id` or shadowing a prod symbol of its worksheet; every quote is prod text (tagged)', () => {
    for (const e of FIELD_CONFIGS) {
      expect(() => parseFieldConfig({ widget: e.widget, uiConfig: e.ui_config ?? null, lookup: e.lookup ?? null, visibleWhen: e.visible_when ?? null }), `${e.worksheet} ${e.symbol}`).not.toThrow();
      if (e.visible_when) expect(parseCondition(e.visible_when), `${e.symbol} visible_when`).not.toBeNull();
      if (e.create) expect(e.create.description.startsWith('Plan 3:'), `${e.symbol} description`).toBe(true);
      expect(e.verification_quote.trim().length, `${e.symbol} quote`).toBeGreaterThan(0);
      expect(e.verification_quote).not.toContain('undefined');
      expect(e.verification_quote, `${e.symbol} quote must be tagged prod text`).toMatch(/\[prod verification_quote \(Para [0-9]+(\([a-z]\))?, VSME-CR-[A-Z0-9-]+\)\]|\[prod worksheet_templates\.title_de \(VSME-[A-Z0-9.]+\) — no paragraph text in prod; vsme-U-1\]|prod field labels \(EV\)/);
      if (e.widget === 'register') {
        const syms = prodSymbols(e.worksheet);
        for (const c of (e.ui_config as RegisterUiConfig).columns) {
          expect(c.key, `${e.symbol}.${c.key}`).not.toBe('id');
          expect(syms, `${e.symbol}.${c.key} shadows a prod symbol of ${e.worksheet}`).not.toContain(c.key);
          if (c.expr) expect(parseNumeric(c.expr).ok, `${e.symbol}.${c.key} expr`).toBe(true);
          if (c.visible_when) expect(parseCondition(c.visible_when), `${e.symbol}.${c.key} visible_when`).not.toBeNull();
        }
      }
    }
    expect(SECTION_VISIBILITY).toEqual([]);
  });

  it('counts: 31 field entries (23 create, 8 update); 7 registers; 2 created boolean drivers; 14 created derived outputs; 8 visibility rules on existing fields, each keyed on a driver of the SAME worksheet', () => {
    expect(FIELD_CONFIGS).toHaveLength(31);
    expect(FIELD_CONFIGS.filter((e) => e.create)).toHaveLength(23);
    expect(FIELD_CONFIGS.filter((e) => !e.create)).toHaveLength(8);
    const registers = FIELD_CONFIGS.filter((e) => e.widget === 'register');
    expect(registers.map((e) => `${e.worksheet} ${e.symbol}`)).toEqual([
      'VSME-B01.100 subsidiaries', 'VSME-B01.200 sites', 'VSME-B02.000 policies', 'VSME-B03.100 energy_carriers',
      'VSME-B07.300 materials', 'VSME-B08.200 employees_by_country', 'VSME-C07.000 human_rights_incidents',
    ]);
    expect(FIELD_CONFIGS.filter((e) => e.widget === 'attestation' && e.create).map((e) => `${e.worksheet} ${e.symbol}`)).toEqual(['VSME-C03.300 high_climate_impact_sector', 'VSME-C09.000 governance_body_exists']);
    expect(FIELD_CONFIGS.filter((e) => e.widget === 'derived')).toHaveLength(14);
    for (const e of FIELD_CONFIGS.filter((x) => x.create)) expect(e.create!.data_type, e.symbol).toBe(e.widget === 'register' ? 'json' : e.widget === 'attestation' ? 'boolean' : 'number');
    const rules = FIELD_CONFIGS.filter((e) => !e.create).map((e) => [e.worksheet, e.symbol, e.visible_when]);
    expect(rules).toEqual([
      ['VSME-B01.000', 'OtherUndertakingsLegalForm', LEGAL_FORM_OTHER],
      ['VSME-B01.000', 'ListOfDisclosuresForWhichNoChangesAreReportedComparedToThePreviousPeriodReporting', UNCHANGED_DISCLOSURES],
      ['VSME-B01.000', 'LinkToPreviousReportContainingDisclosuresThatRemainUnchanged', UNCHANGED_DISCLOSURES],
      ['VSME-B07.000', 'DescriptionOfHowCircularEconomyPrinciplesAreApplied', CIRCULAR],
      ['VSME-C03.300', 'DescriptionOfATransitionPlanForClimateChangeMitigationIncludingAnExplanationOfHowItIsContributingToReduceGhgEmissions', HIGH_CLIMATE_IMPACT],
      ['VSME-C03.300', 'DateOfAdoptionOfTransitionPlanForUndertakingNotHavingAdoptedTransitionPlanYet', HIGH_CLIMATE_IMPACT],
      ['VSME-C06.000', 'TypeOfContentCoveredByTheCodeOfConductOrHumanRightsPolicyForItsOwnWorkforce', CODE_OF_CONDUCT],
      ['VSME-C06.000', 'SpecificationOfOtherTypesOfContentCoveredByTheCodeOfConductOrHumanRightsPolicy', CODE_OF_CONDUCT],
    ]);
    // every driver of an emitted rule is a prod field of the rule's worksheet, or a field this batch creates there
    const created = new Set(FIELD_CONFIGS.filter((e) => e.create).map((e) => `${e.worksheet} ${e.symbol}`));
    for (const e of FIELD_CONFIGS.filter((x) => x.visible_when)) {
      const driver = /^([A-Za-z_][A-Za-z0-9_]*)/.exec(e.visible_when!)![1];
      expect(priorRow(`${e.worksheet} ${driver}`) !== undefined || created.has(`${e.worksheet} ${driver}`), `${e.worksheet} ${e.symbol} ← ${driver}`).toBe(true);
    }
    // the two UPDATEs on prod enums keep prod's enum_values (D-1)
    for (const s of ['ListOfDisclosuresForWhichNoChangesAreReportedComparedToThePreviousPeriodReporting', 'TypeOfContentCoveredByTheCodeOfConductOrHumanRightsPolicyForItsOwnWorkforce']) {
      const e = FIELD_CONFIGS.find((x) => x.symbol === s)!;
      expect(e.widget).toBe('select_one');
      expect(e.enum_values).toBe('keep_prod');
    }
    // the boolean drivers are prod booleans (== true form) and the created drivers are booleans
    expect(priorRow('VSME-B01.000 ReportContainsDisclosuresFromThePreviousReportingPeriodThatRemainUnchanged').data_type).toBe('boolean');
    expect(priorRow('VSME-B07.000 UndertakingAppliesCircularEconomyPrinciples').data_type).toBe('boolean');
    expect(priorRow('VSME-C06.000 UndertakingHasACodeOfConductOrHumanRightsPolicyForItsOwnWorkforce').data_type).toBe('boolean');
    expect(priorRow('VSME-B01.000 UndertakingsLegalForm').data_type).toBe('enum');
  });

  it('enum tokens equal the captured prior byte-for-byte (resolution (2)): sites.country / employees_by_country.country = CountryOfSite (256, identical to CountryOfPrimaryOperations…), policies.issue = SustainabilityIssue… (10), human_rights_incidents.type = TypeOfHumanRight… (6); energy_carriers.carrier = the three prod symbols with their prod labels; the rule literals are prod tokens', () => {
    expect([...COUNTRY_TOKENS]).toEqual(enumValues('VSME-B01.200 CountryOfSite'));
    expect([...COUNTRY_TOKENS]).toEqual(enumValues('VSME-B01.000 CountryOfPrimaryOperationsAndLocationOfSignificantAssets'));
    expect(COUNTRY_TOKENS).toHaveLength(256);
    expect(Object.keys(COUNTRY_LABELS)).toEqual([...COUNTRY_TOKENS]);
    expect([...SUSTAINABILITY_ISSUE_TOKENS]).toEqual(enumValues('VSME-B02.000 SustainabilityIssueAddressedByPracticePolicyAndOrFutureInitiative'));
    expect([...HUMAN_RIGHT_TOKENS]).toEqual(enumValues('VSME-C07.000 TypeOfHumanRightRelatedToTheConfirmedIncident'));
    expect([...BASIS_FOR_PREPARATION_TOKENS]).toEqual(enumValues('VSME-B01.000 BasisForPreparation'));
    expect([...BASIS_FOR_REPORTING_TOKENS]).toEqual(enumValues('VSME-B01.000 BasisForReporting'));
    expect([...LEGAL_FORM_TOKENS]).toEqual(enumValues('VSME-B01.000 UndertakingsLegalForm'));
    const col = (ws: string, reg: string, key: string) => registerCfg(ws, reg).columns.find((c) => c.key === key)!;
    expect(col('VSME-B01.200', 'sites', 'country').options).toEqual([...COUNTRY_TOKENS]);
    expect(col('VSME-B08.200', 'employees_by_country', 'country').options).toEqual([...COUNTRY_TOKENS]);
    expect(col('VSME-B02.000', 'policies', 'issue').options).toEqual([...SUSTAINABILITY_ISSUE_TOKENS]);
    expect(col('VSME-C07.000', 'human_rights_incidents', 'type').options).toEqual([...HUMAN_RIGHT_TOKENS]);
    const carrier = col('VSME-B03.100', 'energy_carriers', 'carrier');
    expect(carrier.options).toEqual([...ENERGY_CARRIERS]);
    for (const c of ENERGY_CARRIERS) {
      expect(priorRow(`VSME-B03.100 ${ENERGY_CARRIER_SYMBOLS[c]}`), ENERGY_CARRIER_SYMBOLS[c]).toBeDefined();
      expect(carrier.option_labels![c]).toBe(PROD_FIELDS[`VSME-B03.100 ${ENERGY_CARRIER_SYMBOLS[c]}`].label_de);
    }
    // the literals of the (emitted and staged) rules are prod tokens
    expect(OPTION_B).toBe('OptionBBasicModuleAndComprehensiveModuleMember');
    expect(CONSOLIDATED).toBe('ConsolidatedMember');
    expect(LEGAL_OTHER).toBe('OtherUndertakingsLegalFormMember');
    expect(LEGAL_COOPERATIVE).toBe('CooperativeMember');
    expect(enumValues('VSME-B01.000 BasisForPreparation')).toContain(OPTION_B);
    expect(enumValues('VSME-B01.000 UndertakingsLegalForm')).toEqual(expect.arrayContaining([LEGAL_OTHER, LEGAL_COOPERATIVE]));
    // the "50 or more employees" threshold IS prod text (CR-B08-03) — the only reason EMPLOYEES_50 may exist at all (resolution (1))
    expect(PROD_QUOTES['VSME-CR-B08-03'].description).toContain('If the undertaking employs 50 or more employees');
    expect(EMPLOYEES_50).toBe('NumberOfEmployees >= 50');
    expect(pq('VSME-CR-B08-03')).toMatch(/\[prod verification_quote \(Para 40, VSME-CR-B08-03\)\]$/);
  });

  it('registers: the sites row conditions (== true form; the bare form parses too), the footers are created derived outputs of the same worksheet, required columns as the brief names them, no lookup / override block', () => {
    const sites = registerCfg('VSME-B01.200', 'sites');
    expect(sites.columns.map((c) => c.key)).toEqual(['country', 'gps', 'address', 'postal_code', 'city', 'in_biodiversity_area', 'near_biodiversity_area', 'area_ha', 'high_water_stress', 'water_withdrawn_m3']);
    expect(sites.columns.filter((c) => c.required).map((c) => c.key)).toEqual(['country', 'address']);
    expect(sites.columns.find((c) => c.key === 'area_ha')!.visible_when).toBe(ROW_BIODIVERSITY);
    expect(sites.columns.find((c) => c.key === 'water_withdrawn_m3')!.visible_when).toBe(ROW_WATER_STRESS);
    expect(parseCondition('in_biodiversity_area OR near_biodiversity_area')).not.toBeNull(); // the brief's bare form
    expect(parseCondition('high_water_stress')).not.toBeNull();
    expect(registerCfg('VSME-B01.100', 'subsidiaries').columns.filter((c) => c.required).map((c) => c.key)).toEqual(['name']);
    expect(registerCfg('VSME-B02.000', 'policies').columns.map((c) => [c.key, c.type])).toEqual([['issue', 'enum'], ['description', 'text'], ['public', 'boolean'], ['target_set', 'boolean'], ['senior_accountable', 'boolean']]);
    expect(registerCfg('VSME-B07.300', 'materials').columns.map((c) => [c.key, c.required ?? false])).toEqual([['name', true], ['weight_t', false], ['volume_m3', false]]);
    expect(registerCfg('VSME-B08.200', 'employees_by_country').columns.map((c) => [c.key, c.required ?? false])).toEqual([['country', true], ['count', true]]);
    expect(registerCfg('VSME-B03.100', 'energy_carriers').columns.map((c) => [c.key, c.required ?? false])).toEqual([['carrier', true], ['mwh', true]]);
    expect(registerCfg('VSME-C07.000', 'human_rights_incidents').columns.map((c) => c.key)).toEqual(['type', 'specification', 'actions']);
    const created = new Set(FIELD_CONFIGS.filter((e) => e.create).map((e) => `${e.worksheet} ${e.symbol}`));
    for (const e of FIELD_CONFIGS.filter((x) => x.widget === 'register')) {
      const ui = e.ui_config as RegisterUiConfig;
      for (const f of ui.footer ?? []) expect(created.has(`${e.worksheet} ${f}`), `${e.symbol} footer ${f}`).toBe(true);
      expect(ui.override).toBeUndefined();
      expect(ui.columns.some((c) => c.type === 'lookup_key' || c.type === 'lookup_value')).toBe(false);
      expect(`${e.worksheet} ${e.create!.section_code}` in prior.sections!, `${e.symbol} section`).toBe(true);
    }
    for (const e of FIELD_CONFIGS.filter((x) => x.create)) expect(e.create!.section_code, e.symbol).toBe(`${e.worksheet}-A`);
  });

  it('nothing is inherited in VSME (consumer_worksheets null on all 144 rows) — so every cross-worksheet rule of the brief is STAGED, not emitted; the emitter itself would accept the section rules (the withholding is the task rule, pinned)', () => {
    expect(fieldKeys).toHaveLength(144);
    for (const k of fieldKeys) expect(priorRow(k).consumer_worksheets, k).toBeNull();
    for (const d of ['BasisForPreparation', 'BasisForReporting', 'UndertakingsLegalForm', 'NumberOfEmployees', 'Turnover']) expect(priorRow(`VSME-B01.000 ${d}`).consumer_worksheets).toBeNull();
    expect(COMPREHENSIVE_WORKSHEETS).toHaveLength(12);
    for (const ws of COMPREHENSIVE_WORKSHEETS) expect(`${ws} ${ws}-A` in prior.sections!, ws).toBe(true);
    expect(STAGED_SECTION_RULES).toHaveLength(14);
    expect(STAGED_SECTION_RULES.slice(0, 12).every((r) => r.visible_when === COMPREHENSIVE)).toBe(true);
    expect(STAGED_SECTION_RULES[12]).toMatchObject({ worksheet: 'VSME-B01.100', section_code: 'VSME-B01.100-A', visible_when: CONSOLIDATED_RULE });
    expect(STAGED_SECTION_RULES[13]).toMatchObject({ worksheet: 'VSME-B02.100', section_code: 'VSME-B02.100-A', visible_when: LEGAL_FORM_COOPERATIVE });
    for (const r of STAGED_SECTION_RULES) expect(parseCondition(r.visible_when), r.worksheet).not.toBeNull();
    // the emitter accepts the 10 section rules whose worksheet carries no gate (C-1 / C-2 / C-3 — withheld by the task rule only: the driver is not inherited)
    const GATED: Record<string, string> = { 'VSME-C01.000': 'VSME-CR-C01-01', 'VSME-C06.000': 'VSME-CR-C06-01', 'VSME-C08.100': 'VSME-CR-C08-01', 'VSME-C09.000': 'VSME-CR-C09-01' };
    const ungated = STAGED_SECTION_RULES.filter((r) => !(r.worksheet in GATED));
    expect(ungated).toHaveLength(10);
    const { up } = emitFieldConfigSql('vsme', [], ungated, prior);
    expect((up.match(/^UPDATE worksheet_sections/gm) ?? []).length).toBe(10);
    // the four C-worksheets with a warn gate: the section hide nulls the gate's symbol ⇒ the gate-aware guard REFUSES (G-4: IF-guard on BasisForPreparation + the follow-up section hides)
    for (const [ws, code] of Object.entries(GATED)) {
      expect(prior.gates![`${ws} ${code}`].severity, code).toBe('warn');
      const r = STAGED_SECTION_RULES.find((x) => x.worksheet === ws)!;
      expect(() => emitFieldConfigSql('vsme', [], [r], prior), ws).toThrow(new RegExp(`read by gate ${code}`));
      const guarded: PriorSnapshot = { ...prior, gates: { ...prior.gates, [`${ws} ${code}`]: { ...prior.gates![`${ws} ${code}`], condition: `IF ${COMPREHENSIVE} THEN ${prior.gates![`${ws} ${code}`].condition}` } } };
      expect((emitFieldConfigSql('vsme', [], [r], guarded).up.match(/^UPDATE worksheet_sections/gm) ?? []).length, `${ws} under the IF guard`).toBe(1);
    }
  });

  it('visibility never lands on a consumed producer or a gate-read symbol: every emitted UPDATE target is consumer-free with no same-worksheet gate reader; the refused targets are asserted through the guards (G-1 CR-B08-03, G-3 CR-C09-01); CR-B07-01 is mis-hosted (G-2)', () => {
    for (const e of FIELD_CONFIGS.filter((x) => x.visible_when)) {
      if (!e.create) {
        const row = priorRow(`${e.worksheet} ${e.symbol}`);
        expect(row, `${e.worksheet} ${e.symbol} captured`).toBeDefined();
        expect(row.consumer_worksheets ?? [], `${e.symbol} consumers`).toEqual([]);
        expect(producerChain(prior, e.worksheet, e.symbol)).toBeNull();
      }
      expect(gateReaders(prior, e.worksheet, e.symbol, e.visible_when!).map((g) => g.code), `${e.symbol} gate readers`).toEqual([]);
    }
    // G-1: EmployeeTurnoverRate ← NumberOfEmployees >= 50 — CR-B08-03 (warn) reads the symbol; the driver is not on B08.300 either
    expect(prior.gates!['VSME-B08.300 VSME-CR-B08-03']).toMatchObject({ condition: 'EmployeeTurnoverRate IS NOT NULL', severity: 'warn', symbols: ['EmployeeTurnoverRate'] });
    expect(gateReaders(prior, 'VSME-B08.300', 'EmployeeTurnoverRate', EMPLOYEES_50).map((g) => g.code)).toEqual(['VSME-CR-B08-03']);
    expect(() => emitFieldConfigSql('vsme', [rule('VSME-B08.300', 'EmployeeTurnoverRate', EMPLOYEES_50)], [], prior)).toThrow(/read by gate VSME-CR-B08-03/);
    expect(priorRow('VSME-B08.300 NumberOfEmployees')).toBeUndefined();
    // the IF-guard exemption would rescue the G-1 hide once CR-B08-03 reads `IF NumberOfEmployees >= 50 THEN EmployeeTurnoverRate IS NOT NULL`
    const guarded1: PriorSnapshot = { ...prior, gates: { ...prior.gates, 'VSME-B08.300 VSME-CR-B08-03': { ...prior.gates!['VSME-B08.300 VSME-CR-B08-03'], condition: `IF ${EMPLOYEES_50} THEN EmployeeTurnoverRate IS NOT NULL` } } };
    expect(gateReaders(guarded1, 'VSME-B08.300', 'EmployeeTurnoverRate', EMPLOYEES_50)).toEqual([]);
    // G-3: GenderDiversityRatioInGovernanceBody ← governance_body_exists == true — CR-C09-01 (warn) reads the symbol
    expect(prior.gates!['VSME-C09.000 VSME-CR-C09-01']).toMatchObject({ condition: 'GenderDiversityRatioInGovernanceBody IS NOT NULL', severity: 'warn' });
    expect(gateReaders(prior, 'VSME-C09.000', 'GenderDiversityRatioInGovernanceBody', GOVERNANCE_BODY).map((g) => g.code)).toEqual(['VSME-CR-C09-01']);
    expect(() => emitFieldConfigSql('vsme', [byKey('VSME-C09.000', 'governance_body_exists'), rule('VSME-C09.000', 'GenderDiversityRatioInGovernanceBody', GOVERNANCE_BODY)], [], prior)).toThrow(/read by gate VSME-CR-C09-01/);
    const guarded3: PriorSnapshot = { ...prior, gates: { ...prior.gates, 'VSME-C09.000 VSME-CR-C09-01': { ...prior.gates!['VSME-C09.000 VSME-CR-C09-01'], condition: `IF ${GOVERNANCE_BODY} THEN GenderDiversityRatioInGovernanceBody IS NOT NULL` } } };
    expect(gateReaders(guarded3, 'VSME-C09.000', 'GenderDiversityRatioInGovernanceBody', GOVERNANCE_BODY)).toEqual([]);
    // G-2: CR-B07-01 (block) is hosted on B01.000 and reads a symbol that exists on B07.000 only — pending on every project
    expect(prior.gates!['VSME-B01.000 VSME-CR-B07-01']).toMatchObject({ condition: 'UndertakingAppliesCircularEconomyPrinciples IS NOT NULL', severity: 'block' });
    expect(priorRow('VSME-B01.000 UndertakingAppliesCircularEconomyPrinciples')).toBeUndefined();
    expect(priorRow('VSME-B07.000 UndertakingAppliesCircularEconomyPrinciples')).toBeDefined();
    expect(Object.keys(prior.gates!).filter((k) => k.startsWith('VSME-B07.000 '))).toEqual([]);
    // the captured equations: EQ-01 … EQ-10 (none of this task's outputs collides)
    expect(Object.keys(prior.equations!)).toHaveLength(10);
    const prodOutputs = new Set(Object.values(prior.equations!).map((e) => e.output_symbol));
    for (const e of FIELD_CONFIGS.filter((x) => x.widget === 'derived')) expect(prodOutputs.has(e.symbol), e.symbol).toBe(false);
    // no gate is unparseable; no self-consumer entries
    for (const [k, g] of Object.entries(prior.gates!)) expect(g.parse_error, k).toBeUndefined();
  });

  it('the committed migration + rollback equal a fresh emit against the committed prior (freshness pin, default refuse mode, no warnings)', () => {
    const { up, down, warnings } = emitFieldConfigSql('vsme', FIELD_CONFIGS, SECTION_VISIBILITY, prior);
    expect(warnings).toEqual([]);
    const files = fieldConfigFilesFor('vsme', '20260917102410');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/^UPDATE fields f SET/gm) ?? []).length).toBe(8);
    expect((up.match(/^INSERT INTO fields/gm) ?? []).length).toBe(23);
    expect((up.match(/^UPDATE worksheet_sections/gm) ?? []).length).toBe(0);
    expect(up).not.toMatch(/^UPDATE fields f SET .*enum_values =/m); // D-1
    expect(up).not.toMatch(/pollutant_register|AmountOfEmissionTo/); // Plan 2a B04.100 untouched
  });
});
