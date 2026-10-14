import { describe, it, expect } from 'vitest';
import { overrideRefusal, coerceOverrideValue, SERVER_MATERIALISED_SYMBOLS, type OverrideFieldMeta } from '../validate-override';

const base = (over: Partial<OverrideFieldMeta>): OverrideFieldMeta => ({
  id: 'f', symbol: 'k_f', labelDe: 'Durchlässigkeitsbeiwert', dataType: 'number', active: true,
  widget: null, uiConfig: null, enumValues: null, validationRules: null, ...over,
});
const A138_11_EQS = [{ id: 'gl6', outputSymbol: 'f_K' }, { id: 'gl5', outputSymbol: 'k_i' }];

describe('overrideRefusal (spec §2: only input fields)', () => {
  it('accepts an engineer input', () => {
    expect(overrideRefusal(base({}), A138_11_EQS, 'entered')).toBeNull();
    expect(overrideRefusal(base({}), A138_11_EQS, null)).toBeNull();
  });
  it('refuses an equation output (k_i = Gl. 5)', () => {
    expect(overrideRefusal(base({ symbol: 'k_i' }), A138_11_EQS, 'derived')).toMatch(/wird berechnet/);
    expect(overrideRefusal(base({ symbol: 'k_i' }), A138_11_EQS, null)).toMatch(/wird berechnet/);
  });
  it('refuses a server-materialised symbol (V_M) and a stored derived row', () => {
    expect(SERVER_MATERIALISED_SYMBOLS).toContain('V_M');
    expect(SERVER_MATERIALISED_SYMBOLS).toContain('A_S_m');
    expect(overrideRefusal(base({ symbol: 'V_M' }), [], null)).toMatch(/vom Werkzeug berechnet/);
    expect(overrideRefusal(base({ symbol: 'q_any' }), [], 'derived')).toMatch(/abgeleiteter Wert/);
  });
  it('refuses lookup_fill and inactive fields', () => {
    expect(overrideRefusal(base({ widget: 'lookup_fill' }), [], null)).toMatch(/Tabelle/);
    expect(overrideRefusal(base({ active: false }), [], null)).toMatch(/deaktiviert/);
  });
});

describe('coerceOverrideValue', () => {
  it('parses numbers incl. exponent and decimal comma, refuses text and empty', () => {
    expect(coerceOverrideValue(base({}), '1e-5')).toEqual({ ok: true, value: { type: 'number', value: 1e-5 } });
    expect(coerceOverrideValue(base({}), '0,3')).toEqual({ ok: true, value: { type: 'number', value: 0.3 } });
    expect(coerceOverrideValue(base({}), 'abc').ok).toBe(false);
    expect(coerceOverrideValue(base({}), '').ok).toBe(false);
    expect(coerceOverrideValue(base({}), null).ok).toBe(false);
  });
  it('applies validation_rules min/max', () => {
    const f = base({ validationRules: { min: 0, max: 1 } });
    expect(coerceOverrideValue(f, 1.5)).toEqual({ ok: false, error: expect.stringMatching(/Maximum 1/) });
    expect(coerceOverrideValue(f, -1)).toEqual({ ok: false, error: expect.stringMatching(/Minimum 0/) });
  });
  it('refuses an invalid enum value and accepts a listed one', () => {
    const f = base({ symbol: 'a_s_m_determination_method', dataType: 'enum', enumValues: [{ value: 'direct' }, { value: 'geometry' }] });
    expect(coerceOverrideValue(f, 'geometry')).toEqual({ ok: true, value: { type: 'enum', value: 'geometry' } });
    const bad = coerceOverrideValue(f, 'magic');
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error).toMatch(/keine zulässige Auswahl \(direct, geometry\)/);
  });
  it('accepts an extensible enum value outside the list', () => {
    const f = base({ dataType: 'enum', enumValues: [{ value: 'a' }], validationRules: { extensible: true } });
    expect(coerceOverrideValue(f, 'custom').ok).toBe(true);
  });
  it('checks register column keys (surface_inventory TS fallback config)', () => {
    const f = base({ symbol: 'surface_inventory', dataType: 'json' });
    expect(coerceOverrideValue(f, { rows: [{ id: 'r1', label: 'Dach', area_m2: 326.2, c_i: 0.9, kind: 'paved' }] }).ok).toBe(true);
    const bad = coerceOverrideValue(f, { rows: [{ area: 1 }] });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error).toMatch(/unbekannte Spalte\(n\) area/);
    expect(coerceOverrideValue(f, '[{"label":"x"}]').ok).toBe(true); // bare array wrapped by toFieldValue
    expect(coerceOverrideValue(f, { notRows: 1 }).ok).toBe(false);
  });
  it('validates dates and text length', () => {
    expect(coerceOverrideValue(base({ dataType: 'date' }), '2026-10-14').ok).toBe(true);
    expect(coerceOverrideValue(base({ dataType: 'date' }), '14.10.2026').ok).toBe(false);
    expect(coerceOverrideValue(base({ dataType: 'text', validationRules: { maxLength: 3 } }), 'abcd').ok).toBe(false);
  });
});
