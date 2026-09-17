import { describe, it, expect } from 'vitest';
import { parseFieldConfig } from '../field-config';
import { REGISTER_CONFIGS_FALLBACK, resolveRegisterConfig, withFallbackRegisterEquations, FALLBACK_REGISTER_EQUATIONS, registerFlagKeys } from '../register-configs';
import { validateEngineEligibility } from '../engine-eligibility';
import { SELECTION_CONFIGS, toDbShape } from '../selection-fields';
import { POLLUTANTS } from '@/lib/vsme/pollutants';

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
    // Plan 2b: the flag carries today's editor label/note + disables_rows (pinned in detail below).
    expect(REGISTER_CONFIGS_FALLBACK.pollutant_register.flags?.map((f) => f.key)).toEqual(['not_applicable']);
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

describe('Plan 2b: resolveRegisterConfig serves the TS selection registers while widget IS NULL', () => {
  it('bewertungskommission_members resolves to its toDbShape ui_config with placement bottom', () => {
    const cfg = resolveRegisterConfig({ symbol: 'bewertungskommission_members', dataType: 'json', widget: null });
    expect(cfg).toEqual({ ...toDbShape('bewertungskommission_members', SELECTION_CONFIGS.bewertungskommission_members).ui_config, placement: 'bottom' });
  });
  it('every register-kind selection config resolves and validates; every checklist-kind one is not a register', () => {
    let registers = 0;
    for (const [symbol, sc] of Object.entries(SELECTION_CONFIGS)) {
      const cfg = resolveRegisterConfig({ symbol, dataType: 'json', widget: null });
      if (sc.kind === 'register') {
        registers++;
        expect(cfg, symbol).not.toBeNull();
        expect(() => parseFieldConfig({ widget: 'register', uiConfig: cfg, lookup: null, visibleWhen: null }), symbol).not.toThrow();
      } else {
        expect(cfg, symbol).toBeNull();
      }
    }
    expect(registers).toBeGreaterThan(0);
  });
  it('a checklist symbol is not a register; a non-null widget still wins over the TS registry', () => {
    expect(resolveRegisterConfig({ symbol: 'applicable_legal_bases', dataType: 'json', widget: null })).toBeNull();
    expect(resolveRegisterConfig({ symbol: 'bewertungskommission_members', dataType: 'json', widget: 'select_many' })).toBeNull();
    expect(resolveRegisterConfig({ symbol: 'bewertungskommission_members', dataType: 'text', widget: null })).toBeNull();
  });
  it('registerFlagKeys prefers ui_config.flags, falls back to the symbol table', () => {
    expect(registerFlagKeys('pollutant_register')).toEqual(['not_applicable']);
    expect(registerFlagKeys('x', { title: 't', columns: [{ key: 'a', type: 'text', label: 'A' }], flags: [{ key: 'done', label: 'Fertig' }] })).toEqual(['done']);
  });
  it('fallback configs carry the Plan 2b display keys and still validate', () => {
    const p = REGISTER_CONFIGS_FALLBACK.pollutant_register;
    expect(p.flags?.[0]).toEqual({ key: 'not_applicable', label: 'Keine berichtspflichtigen Schadstoffemissionen', note: expect.stringContaining('Null-Meldung'), disables_rows: true });
    expect(p.footer).toEqual(['AmountOfEmissionToAir', 'AmountOfEmissionToWater', 'AmountOfEmissionToSoil']);
    expect(p.title).toBe('Schadstoffregister (E-PRTR)');
    const medium = p.columns.find((c) => c.key === 'medium');
    expect(medium?.option_labels).toEqual({ air: 'Luft', water: 'Wasser', soil: 'Boden' });
    const pollutant = p.columns.find((c) => c.key === 'pollutant');
    expect(pollutant?.aria_label).toBe('Schadstoff');
    expect(pollutant?.sort_by_label).toBe(true);
    // SR-1: labels come from the single pollutant source, never retyped.
    expect(pollutant?.option_labels).toEqual(Object.fromEntries(POLLUTANTS.map((x) => [x.value, x.labelEn])));
    expect(p.columns.find((c) => c.key === 'amount_t')?.aria_label).toBe('Menge (t)');
    const s = REGISTER_CONFIGS_FALLBACK.surface_inventory;
    expect(s.footer).toEqual(['A_E_ba', 'A_E_nba', 'A_C']);
    expect(s.columns.find((c) => c.key === 'area_m2')?.aria_label).toBe('Fläche');
    const kind = s.columns.find((c) => c.key === 'kind');
    expect(kind?.display).toBe('badge');
    expect(kind?.value_labels).toEqual({ paved: 'befestigt', unpaved: 'unbefestigt' });
    for (const ui of Object.values(REGISTER_CONFIGS_FALLBACK)) expect(() => parseFieldConfig({ widget: 'register', uiConfig: ui, lookup: null, visibleWhen: null })).not.toThrow();
  });
});
