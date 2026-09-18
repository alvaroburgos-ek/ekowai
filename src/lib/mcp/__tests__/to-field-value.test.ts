import { describe, expect, it } from 'vitest';
import { toFieldValue } from '../tools/fields';

/**
 * Coercion is the seam where a language model's loose output meets typed
 * engineering data. A model writes "12,5" or "1.200" as readily as 12.5, and a
 * wrong coercion here lands a value the calculation engine silently mis-reads —
 * so the interesting cases are the ones that must be REJECTED, not the happy path.
 */
describe('toFieldValue — numbers', () => {
  it('passes a real number through unchanged', () => {
    expect(toFieldValue('number', 12.5)).toEqual({ type: 'number', value: 12.5 });
  });

  it('parses a numeric string', () => {
    expect(toFieldValue('number', '80')).toEqual({ type: 'number', value: 80 });
  });

  it('accepts a German decimal comma, which models emit from German prose', () => {
    expect(toFieldValue('number', '12,5')).toEqual({ type: 'number', value: 12.5 });
  });

  it('rejects a value with a unit rather than silently dropping it', () => {
    // "80 m²" must not become 80 — the unit may not be the field's unit.
    expect(() => toFieldValue('number', '80 m²')).toThrow(/keine Zahl/);
  });

  it('rejects prose', () => {
    expect(() => toFieldValue('number', 'etwa achtzig')).toThrow(/keine Zahl/);
  });

  it('maps an empty value to null, not to 0', () => {
    // 0 is a legitimate measurement; "not answered" must stay distinguishable.
    expect(toFieldValue('number', '')).toEqual({ type: 'number', value: null });
    expect(toFieldValue('number', null)).toEqual({ type: 'number', value: null });
  });
});

describe('toFieldValue — booleans', () => {
  it('accepts a real boolean', () => {
    expect(toFieldValue('boolean', true)).toEqual({ type: 'boolean', value: true });
  });

  it.each([
    ['ja', true],
    ['Ja', true],
    ['true', true],
    ['1', true],
    ['nein', false],
    ['false', false],
    ['0', false],
  ])('reads %s as %s', (input, expected) => {
    expect(toFieldValue('boolean', input)).toEqual({ type: 'boolean', value: expected });
  });

  it('rejects an ambiguous answer instead of guessing', () => {
    expect(() => toFieldValue('boolean', 'vielleicht')).toThrow(/kein Ja\/Nein/);
  });
});

describe('toFieldValue — other types', () => {
  it('keeps enum values verbatim so they match the field definition', () => {
    expect(toFieldValue('enum', 'bewachsen')).toEqual({ type: 'enum', value: 'bewachsen' });
  });

  it('keeps dates as the given string', () => {
    expect(toFieldValue('date', '2026-03-01')).toEqual({ type: 'date', value: '2026-03-01' });
  });

  it('stringifies text', () => {
    expect(toFieldValue('text', 'Musterstadt')).toEqual({ type: 'text', value: 'Musterstadt' });
  });

  it('passes json through without stringifying', () => {
    const payload = { a: 1 };
    expect(toFieldValue('json', payload)).toEqual({ type: 'json', value: payload });
  });

  it('falls back to text for an unknown dataType rather than throwing', () => {
    expect(toFieldValue('something-new', 'x')).toEqual({ type: 'text', value: 'x' });
  });

  it('nulls an empty enum/date/text without inventing a value', () => {
    expect(toFieldValue('enum', '')).toEqual({ type: 'enum', value: null });
    expect(toFieldValue('date', null)).toEqual({ type: 'date', value: null });
    expect(toFieldValue('text', undefined)).toEqual({ type: 'text', value: null });
  });
});
