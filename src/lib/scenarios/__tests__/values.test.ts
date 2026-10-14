import { describe, it, expect } from 'vitest';
import { firstFreeSlot, MAX_ACTIVE_SCENARIOS } from '../types';
import { fmtNum } from '../format';
import { paramToFieldValue, fieldValueToParameter, fieldValueEqual, formatScenarioValue } from '../values';
import { isMissingRelationError } from '../missing-table';
import { toFieldValue } from '@/lib/eval/field-value-coerce';
import { toFieldValue as reexported } from '@/lib/mcp/tools/fields';

describe('slots', () => {
  it('takes the lowest free slot 1..6 and refuses the 7th', () => {
    expect(MAX_ACTIVE_SCENARIOS).toBe(6);
    expect(firstFreeSlot([])).toBe(1);
    expect(firstFreeSlot([1, 2, 4])).toBe(3);
    expect(firstFreeSlot([1, 2, 3, 4, 5, 6])).toBeNull();
  });
});

describe('fmtNum', () => {
  it('formats DE/EN without grouping and small values as powers of ten', () => {
    expect(fmtNum(70.0037505216, 'de')).toBe('70,0038');
    expect(fmtNum(70.0037505216, 'en')).toBe('70.0038');
    expect(fmtNum(10080, 'de')).toBe('10080');
    expect(fmtNum(3e-8, 'de')).toBe('3·10⁻⁸');
    expect(fmtNum(1.5e-5, 'en')).toBe('1.5·10⁻⁵');
    expect(fmtNum(0.0015, 'de')).toBe('0,0015');
    expect(fmtNum(0, 'de')).toBe('0');
    expect(fmtNum(Number.NaN, 'de')).toBe('—');
  });
});

describe('values', () => {
  it('round-trips a number through parameter columns (numeric arrives as string from drizzle)', () => {
    expect(paramToFieldValue('number', { valueNumber: '1e-6', valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null }))
      .toEqual({ type: 'number', value: 1e-6 });
    const p = fieldValueToParameter('f1', { type: 'enum', value: 'geometry' });
    expect(p).toEqual({ fieldId: 'f1', valueNumber: null, valueText: null, valueEnum: 'geometry', valueBoolean: null, valueDate: null, valueJson: null });
  });
  it('compares values with a relative tolerance and null-safety', () => {
    expect(fieldValueEqual({ type: 'number', value: 3e-8 }, { type: 'number', value: 3.0000000000000004e-8 })).toBe(true);
    expect(fieldValueEqual({ type: 'number', value: 1e-6 }, { type: 'number', value: 2e-6 })).toBe(false);
    expect(fieldValueEqual(null, null)).toBe(true);
    expect(fieldValueEqual(null, { type: 'number', value: 1 })).toBe(false);
    expect(fieldValueEqual({ type: 'json', value: { rows: [1] } }, { type: 'json', value: { rows: [1] } })).toBe(true);
  });
  it('formats a case value for badges', () => {
    expect(formatScenarioValue({ type: 'number', value: 1e-5 }, 'de')).toBe('1·10⁻⁵');
    expect(formatScenarioValue({ type: 'boolean', value: true }, 'de')).toBe('Ja');
    expect(formatScenarioValue({ type: 'boolean', value: false }, 'en')).toBe('No');
    expect(formatScenarioValue(null, 'de')).toBe('—');
  });
});

describe('isMissingRelationError', () => {
  it('detects 42P01 directly and through drizzle cause chains', () => {
    expect(isMissingRelationError({ code: '42P01' })).toBe(true);
    expect(isMissingRelationError(Object.assign(new Error('wrapped'), { cause: { code: '42P01' } }))).toBe(true);
    expect(isMissingRelationError({ code: '23505' })).toBe(false);
    expect(isMissingRelationError(null)).toBe(false);
  });
});

describe('toFieldValue move', () => {
  it('is the same function from both paths and parses decimal commas', () => {
    expect(reexported).toBe(toFieldValue);
    expect(toFieldValue('number', '0,3')).toEqual({ type: 'number', value: 0.3 });
    expect(() => toFieldValue('number', 'abc')).toThrow(/keine Zahl/);
  });
});
