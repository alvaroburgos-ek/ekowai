import { describe, it, expect } from 'vitest';
import { parseFieldConfig } from '../field-config';
import { REGISTER_CONFIGS_FALLBACK, resolveRegisterConfig, withFallbackRegisterEquations, FALLBACK_REGISTER_EQUATIONS, registerFlagKeys } from '../register-configs';
import { validateEngineEligibility } from '../engine-eligibility';

describe('REGISTER_CONFIGS_FALLBACK', () => {
  it('every fallback config passes the Plan-1 zod contract', () => {
    for (const [symbol, ui] of Object.entries(REGISTER_CONFIGS_FALLBACK)) {
      expect(() => parseFieldConfig({ widget: 'register', uiConfig: ui, lookup: null, visibleWhen: null }), symbol).not.toThrow();
    }
  });
  it('A4: surface_inventory keeps its title (Plan 2b relies on it)', () => {
    expect(REGISTER_CONFIGS_FALLBACK.surface_inventory.title).toBe('Flächenverzeichnis');
  });
  it('DB config wins; fallback only while widget IS NULL', () => {
    const db = { title: 'DB', columns: [{ key: 'a', type: 'text', label: 'A' }] };
    expect(resolveRegisterConfig({ symbol: 'surface_inventory', dataType: 'json', widget: 'register', uiConfig: db })?.title).toBe('DB');
    expect(resolveRegisterConfig({ symbol: 'surface_inventory', dataType: 'json', widget: null })?.title).toBe('Flächenverzeichnis');
    expect(resolveRegisterConfig({ symbol: 'surface_inventory', dataType: 'json', widget: 'select_many' })).toBeNull();
    expect(resolveRegisterConfig({ symbol: 'other', dataType: 'json', widget: null })).toBeNull();
  });
  it('A1: registerFlagKeys prefers ui.flags, else the symbol-keyed fallback', () => {
    expect(registerFlagKeys('pollutant_register')).toEqual(['not_applicable']);
    expect(registerFlagKeys('surface_inventory')).toEqual([]);
    expect(registerFlagKeys('surface_inventory', { flags: [{ key: 'estimated', label: 'geschätzt' }, { key: 'x' }] })).toEqual(['estimated', 'x']);
    expect(registerFlagKeys('pollutant_register', { flags: [] })).toEqual([]);
    expect(registerFlagKeys('pollutant_register', {})).toEqual(['not_applicable']);
    expect(REGISTER_CONFIGS_FALLBACK.pollutant_register.flags).toEqual([{ key: 'not_applicable', label: 'Keine meldepflichtigen Schadstoffe' }]);
  });
});

describe('FALLBACK_REGISTER_EQUATIONS', () => {
  it('VSME-B04.100 carries the three per-medium sums, engine-eligible', () => {
    const eqs = FALLBACK_REGISTER_EQUATIONS['VSME-B04.100'];
    expect(eqs.map((e) => e.outputSymbol)).toEqual(['AmountOfEmissionToAir', 'AmountOfEmissionToWater', 'AmountOfEmissionToSoil']);
    for (const e of eqs) expect(validateEngineEligibility(e.formula, e.inputSymbols, new Set(['pollutant_register'])).verified).toBe(true);
  });
  it('withFallbackRegisterEquations appends only missing outputs', () => {
    const own = [{ id: 'x', outputSymbol: 'AmountOfEmissionToAir' }];
    const merged = withFallbackRegisterEquations('VSME-B04.100', own);
    expect(merged.map((e) => e.outputSymbol)).toEqual(['AmountOfEmissionToAir', 'AmountOfEmissionToWater', 'AmountOfEmissionToSoil']);
    expect(withFallbackRegisterEquations('A138-07', own)).toEqual(own);
  });
});
