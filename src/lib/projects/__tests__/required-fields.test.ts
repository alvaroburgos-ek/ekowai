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
