/**
 * A4 (2026-09-30) — a required field satisfied by an inherited project-wide
 * value is not open. Observed: "Nächster Schritt: FLL-GAR-01 — 1 Pflichtfeld
 * offen" where the open field was `project_name`, offered by the sheet itself
 * as "aus FLLNT-01 … oder überschreiben". One shared rule for the approval
 * gate, the finalize gate and the progress counts.
 */
import { describe, it, expect } from 'vitest';
import {
  countRequiredFields,
  inheritedSymbolSet,
  scopeForInheritance,
  scopeToOwnStandard,
  missingRequiredFields,
  paramHasValue,
  requiredFieldSatisfied,
  type ParameterValueColumns,
  type RequiredFieldRow,
} from '../required-fields';
import { openRequiredCount, summarizeStandardProgress } from '../standard-progress';

const empty: ParameterValueColumns = { valueNumber: null, valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null };
const text = (v: string | null): ParameterValueColumns => ({ ...empty, valueText: v });
const num = (v: number | null): ParameterValueColumns => ({ ...empty, valueNumber: v });

const f = (o: Partial<RequiredFieldRow> & { id: string; symbol: string }): RequiredFieldRow => ({
  labelDe: o.symbol,
  dataType: 'text',
  isRequired: true,
  ...o,
});

describe('paramHasValue — one presence rule', () => {
  it('per data type; "" is no value for text/enum', () => {
    expect(paramHasValue('text', text('x'))).toBe(true);
    expect(paramHasValue('text', text(''))).toBe(false);
    expect(paramHasValue('text', empty)).toBe(false);
    expect(paramHasValue('number', num(0))).toBe(true);
    expect(paramHasValue('enum', { ...empty, valueEnum: '' })).toBe(false);
    expect(paramHasValue('boolean', { ...empty, valueBoolean: false })).toBe(true);
    expect(paramHasValue('date', { ...empty, valueDate: '2026-01-01' })).toBe(true);
    expect(paramHasValue('json', { ...empty, valueJson: { rows: [] } })).toBe(true);
    expect(paramHasValue('unknown', num(1))).toBe(false);
  });
});

describe('inheritedSymbolSet — conflict-free project-wide values', () => {
  it('agreeing occurrences resolve, disagreeing ones resolve nothing, "" / null never count', () => {
    const s = inheritedSymbolSet([
      { symbol: 'project_name', value: 'Forscheln' },
      { symbol: 'project_name', value: 'Forscheln' },
      { symbol: 'A', value: 4 },
      { symbol: 'A', value: '4' }, // number 4 and text "4" agree (gate rule)
      { symbol: 'B', value: 1 },
      { symbol: 'B', value: 2 },
      { symbol: 'C', value: '' },
      { symbol: 'D', value: null },
    ]);
    expect([...s].sort()).toEqual(['A', 'project_name']);
  });
});

describe('requiredFieldSatisfied / missingRequiredFields', () => {
  const rows = [
    f({ id: 'p', symbol: 'project_name' }),
    f({ id: 'k', symbol: 'k_f', dataType: 'number' }),
    f({ id: 'o', symbol: 'optional', isRequired: false }),
    f({ id: 'h', symbol: 'hidden_one' }),
  ];

  it('an inherited project-wide value satisfies a required field without re-typing (A4)', () => {
    const params = new Map<string, ParameterValueColumns>([['k', num(1e-5)]]);
    // Old behaviour: project_name counted as open although FLLNT-01 supplied it.
    expect(missingRequiredFields(rows, params, { hiddenFieldIds: new Set(['h']) })).toEqual([{ symbol: 'project_name', labelDe: 'project_name' }]);
    expect(missingRequiredFields(rows, params, { hiddenFieldIds: new Set(['h']), inheritedSymbols: new Set(['project_name']) })).toEqual([]);
    expect(requiredFieldSatisfied({ symbol: 'project_name', dataType: 'text' }, undefined, new Set(['project_name']))).toBe(true);
    expect(requiredFieldSatisfied({ symbol: 'project_name', dataType: 'text' }, undefined, new Set())).toBe(false);
  });

  it('an own value wins; an own cleared value ("" / null) falls back to the inherited one', () => {
    expect(requiredFieldSatisfied({ symbol: 'project_name', dataType: 'text' }, text('own'), undefined)).toBe(true);
    expect(requiredFieldSatisfied({ symbol: 'project_name', dataType: 'text' }, text(''), new Set(['project_name']))).toBe(true);
    expect(requiredFieldSatisfied({ symbol: 'project_name', dataType: 'text' }, text(null), undefined)).toBe(false);
  });

  it('hidden required fields are never missing; optional fields never are', () => {
    expect(missingRequiredFields(rows, new Map(), { hiddenFieldIds: new Set(['h', 'p', 'k']) })).toEqual([]);
    expect(missingRequiredFields(rows, new Map()).map((m) => m.symbol)).toEqual(['project_name', 'k_f', 'hidden_one']);
  });
});

describe('progress counts share the rule', () => {
  it('countRequiredFields folds inherited satisfaction into filledRequired', () => {
    const rows = [f({ id: 'p', symbol: 'project_name' }), f({ id: 'k', symbol: 'k_f', dataType: 'number' })];
    expect(countRequiredFields(rows, new Map([['k', num(2)]]))).toEqual({ totalRequired: 2, filledRequired: 1 });
    expect(countRequiredFields(rows, new Map([['k', num(2)]]), { inheritedSymbols: new Set(['project_name']) })).toEqual({ totalRequired: 2, filledRequired: 2 });
  });

  it('summarizeStandardProgress: an inherited-satisfied required field does not keep the sheet on "fill"', () => {
    const base = { titleDe: 'FLL-GAR-01', status: 'draft', totalRequired: 5, filledRequired: 4 };
    expect(openRequiredCount(base)).toBe(1);
    expect(openRequiredCount({ ...base, inheritedRequired: 1 })).toBe(0);
    // Old behaviour: next = { reason: 'fill', missingRequired: 1 } — "1 Pflichtfeld offen".
    expect(summarizeStandardProgress([{ code: 'FLL-GAR-01', ...base }]).next).toMatchObject({ code: 'FLL-GAR-01', reason: 'fill', missingRequired: 1 });
    expect(summarizeStandardProgress([{ code: 'FLL-GAR-01', ...base, inheritedRequired: 1 }]).next).toEqual({ code: 'FLL-GAR-01', titleDe: 'FLL-GAR-01', reason: 'submit' });
  });
});

describe('scopeForInheritance + inheritedSymbolSet (DWA-M 820-3 review fix I-e, round 2: only text / date from another standard)', () => {
  // own standard DWA-M 820-3: templates m01 (owner of project_type) and m04; foreign DWA-M 820-1: template t1, FLL-NT: tnt
  const ownTemplates = new Set(['m01', 'm04']);
  const ownTypes = new Map<string, Set<string>>([
    ['project_type', new Set(['enum'])],
    ['project_name', new Set(['text'])],
    ['registration_date', new Set(['date'])],
    ['area_m2', new Set(['number'])],
    ['bim_used', new Set(['boolean'])],
    ['risk_register', new Set(['json'])],
  ]);
  const a4 = (entries: Array<{ symbol: string; value: unknown; templateId: string }>, own = 'm01') =>
    inheritedSymbolSet(scopeForInheritance(entries, ownTemplates, ownTypes).filter((e) => e.templateId !== own) as Array<{ symbol: string; value: string }>);
  it('A4 regression (FLL-GAR-01 project_name "aus FLLNT-01"): a TEXT value of another standard still fills the own field; a DATE too', () => {
    expect(a4([{ symbol: 'project_name', value: 'Forscheln', templateId: 'tnt' }]).has('project_name')).toBe(true);
    expect(a4([{ symbol: 'registration_date', value: '2026-10-06', templateId: 't1' }]).has('registration_date')).toBe(true);
  });
  it('ENUM: M8203-01 project_type is NOT filled by the DWA-M 820-1 token "konzept" — nor by a token that happens to be an own one', () => {
    expect(inheritedSymbolSet([{ symbol: 'project_type', value: 'konzept' }]).has('project_type')).toBe(true); // the unscoped A4 rule
    expect(a4([{ symbol: 'project_type', value: 'konzept', templateId: 't1' }]).has('project_type')).toBe(false);
    expect(a4([{ symbol: 'project_type', value: 'both', templateId: 't1' }]).has('project_type')).toBe(false); // RED with round 1
  });
  it('NUMBER: a foreign numeric value with the own field blank → missing (RED with round 1)', () => {
    expect(a4([{ symbol: 'area_m2', value: 120, templateId: 't1' }]).has('area_m2')).toBe(false);
  });
  it('BOOLEAN and JSON: a foreign value with the own field blank → missing (RED with round 1)', () => {
    expect(a4([{ symbol: 'bim_used', value: true, templateId: 't1' }]).has('bim_used')).toBe(false);
    expect(a4([{ symbol: 'risk_register', value: 'present', templateId: 't1' }]).has('risk_register')).toBe(false);
  });
  it('the own standard decides when it has a value: an own occurrence fills it, a disagreeing foreign one no longer blanks it out', () => {
    const entries = [
      { symbol: 'project_type', value: 'einzelprojekt', templateId: 'm04' },
      { symbol: 'project_type', value: 'projekt', templateId: 't1' },
    ];
    expect(inheritedSymbolSet(entries).has('project_type')).toBe(false); // unscoped: conflict
    expect(a4(entries).has('project_type')).toBe(true);
  });
  it('negative: a symbol the own standard does not define still pools across standards exactly as before', () => {
    const entries = [{ symbol: 'quality_category', value: 'C2', templateId: 't1' }];
    expect(scopeForInheritance(entries, ownTemplates, ownTypes)).toEqual(entries);
    expect(a4(entries).has('quality_category')).toBe(true);
  });
  it('scopeToOwnStandard (the gate fallback form): a foreign occurrence of an own symbol is dropped, other symbols pool', () => {
    const entries = [{ symbol: 'project_type', value: 'projekt', templateId: 't1' }, { symbol: 'quality_category', value: 'C2', templateId: 't1' }];
    expect(scopeToOwnStandard(entries, ownTemplates, new Set(['project_type'])).map((e) => e.symbol)).toEqual(['quality_category']);
  });
});

// M820 flow block 3 item 2 (X10, owner ruling 2026-10-06): the cross-standard carry-over allow-list (src/lib/projects/cross-standard-carry.ts)
describe('A4 (scopeForInheritance) with the allow-list — the required-field check', () => {
  // own standard DWA-M 820-2: template s10; foreign DWA-M 820-1: m06 / m07; another foreign standard: x1
  const ownTemplates = new Set(['s10', 's01']);
  const ownTypes = new Map<string, Set<string>>([
    ['risk_register', new Set(['json'])],
    ['risk_mitigation_plan', new Set(['json'])],
    ['change_orders', new Set(['json'])],
    ['project_name', new Set(['text'])],
  ]);
  const a4 = (entries: Array<{ symbol: string; value: unknown; templateId: string; standardCode?: string }>, ownStandardCode?: string) =>
    inheritedSymbolSet(
      scopeForInheritance(entries, ownTemplates, ownTypes, ownStandardCode ? { ownStandardCode } : undefined)
        .filter((e) => e.templateId !== 's10') as Array<{ symbol: string; value: string }>,
    );
  it('RED before: the 820-1 register (json) on M820-06 counts for an empty 820-2-10 register', () => {
    const e = [
      { symbol: 'risk_register', value: 'present', templateId: 'm06', standardCode: 'DWA-M-820-1' },
      { symbol: 'risk_mitigation_plan', value: 'present', templateId: 'm07', standardCode: 'DWA-M-820-1' },
    ];
    expect([...a4(e, 'DWA-M-820-2')].sort()).toEqual(['risk_mitigation_plan', 'risk_register']);
  });
  it('without the own standard code (old callers) nothing changes: json from another standard never counts', () => {
    expect(a4([{ symbol: 'risk_register', value: 'present', templateId: 'm06', standardCode: 'DWA-M-820-1' }]).has('risk_register')).toBe(false);
  });
  it('a json symbol NOT on the list, or the list symbol from another standard, still needs its own value', () => {
    expect(a4([{ symbol: 'change_orders', value: 'present', templateId: 'm06', standardCode: 'DWA-M-820-1' }], 'DWA-M-820-2').has('change_orders')).toBe(false);
    expect(a4([{ symbol: 'risk_register', value: 'present', templateId: 'x1', standardCode: 'DWA-M-820-3' }], 'DWA-M-820-2').has('risk_register')).toBe(false);
    expect(a4([{ symbol: 'risk_register', value: 'present', templateId: 'x1' }], 'DWA-M-820-2').has('risk_register')).toBe(false);
  });
  it('the reverse direction does not count (820-2 → 820-1)', () => {
    const types = new Map<string, Set<string>>([['risk_register', new Set(['json'])]]);
    const set = inheritedSymbolSet(
      scopeForInheritance([{ symbol: 'risk_register', value: 'present', templateId: 's10', standardCode: 'DWA-M-820-2' }], new Set(['m06']), types, { ownStandardCode: 'DWA-M-820-1' }) as Array<{ symbol: string; value: string }>,
    );
    expect(set.has('risk_register')).toBe(false);
  });
  it('an own 820-2 value still wins (own occurrences first, as before)', () => {
    const e = [
      { symbol: 'risk_register', value: 'present', templateId: 'm06', standardCode: 'DWA-M-820-1' },
      { symbol: 'risk_register', value: 'present', templateId: 's01', standardCode: 'DWA-M-820-2' },
    ];
    const scoped = scopeForInheritance(e, ownTemplates, ownTypes, { ownStandardCode: 'DWA-M-820-2' });
    expect(scoped.map((x) => x.templateId)).toEqual(['s01']);
  });
  it('text / date keep the A4 behaviour (allow-list adds, never removes)', () => {
    expect(a4([{ symbol: 'project_name', value: 'X', templateId: 'm06', standardCode: 'DWA-M-820-1' }], 'DWA-M-820-2').has('project_name')).toBe(true);
  });
});

// Vault 51_ / 50_ PS-2 (controller decision 2026-10-07): the DWA-M 820-2 project-size answer (820-2-01, enum klein / mittel / gross)
// carries into the optional copies on M820-01 (820-1) and M8203-01 (820-3) — identical symbol, tokens and labels.
describe('A4 (scopeForInheritance) — project_size 820-2 → 820-1 / 820-3 (enum)', () => {
  const enumTypes = new Map<string, Set<string>>([['project_size', new Set(['enum'])]]);
  const a4 = (entries: Array<{ symbol: string; value: unknown; templateId: string; standardCode?: string }>, own: Set<string>, ownStandardCode: string) =>
    inheritedSymbolSet(scopeForInheritance(entries, own, enumTypes, { ownStandardCode }) as Array<{ symbol: string; value: string }>);
  const from820_2 = { symbol: 'project_size', value: 'mittel', templateId: 's01', standardCode: 'DWA-M-820-2' };
  it('RED before: the 820-2-01 answer counts for the copy on M820-01 and on M8203-01', () => {
    expect(a4([from820_2], new Set(['m01']), 'DWA-M-820-1').has('project_size')).toBe(true);
    expect(a4([from820_2], new Set(['c01']), 'DWA-M-820-3').has('project_size')).toBe(true);
  });
  it('not the other way round, and not 820-1 → 820-3 (an enum of an unlisted pair still needs its own value)', () => {
    const from820_1 = { symbol: 'project_size', value: 'klein', templateId: 'm01', standardCode: 'DWA-M-820-1' };
    expect(a4([from820_1], new Set(['s01']), 'DWA-M-820-2').has('project_size')).toBe(false);
    expect(a4([from820_1], new Set(['c01']), 'DWA-M-820-3').has('project_size')).toBe(false);
  });
  it('an own answer on the copy still wins', () => {
    const own = { symbol: 'project_size', value: 'klein', templateId: 'm01', standardCode: 'DWA-M-820-1' };
    expect(scopeForInheritance([from820_2, own], new Set(['m01']), enumTypes, { ownStandardCode: 'DWA-M-820-1' }).map((x) => x.value)).toEqual(['klein']);
  });
});
