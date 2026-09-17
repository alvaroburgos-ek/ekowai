/**
 * Plan 3 Task 1 — DWA-A-138-1 derived-value equations: the emitter accepts every
 * entry, the committed migration equals a fresh emit, and each formula computes
 * the printed rule through the Plan-2a evaluator (register formulas through the
 * real `evaluateFormula`; the enum-keyed formulas through `evalNumber` with a
 * full scope AND through the real `evaluateFormula` with enum/text inputs —
 * Task 1b closed the a138-I-1 interface gap; the flipped pin is below).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EQUATIONS } from '../equations/a138';
import { FIELD_CONFIGS } from '../field-configs/a138';
import { evaluateFormula } from '../formula';
import { prepareRegisterRows } from '../register-rows';
import { REGISTER_CONFIGS_FALLBACK } from '../register-configs';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { makeTableLookup, makeTableRows } from '../regulation-tables-fallback';
import { evalNumber, parseNumeric, type Scope } from '@/lib/expr';
import { emitEquationsSql, equationFilesFor } from '../../../../scripts/regulation-tables/emit-equations-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const STD = 'DWA-A-138-1';
const table = makeTableLookup(STD);
const tableRows = makeTableRows(STD);
const eq = (n: string) => EQUATIONS.find((e) => e.equation_number === n)!;
const rhs = (n: string) => eq(n).formula.replace(/^[A-Za-z_][A-Za-z0-9_]*\s*=\s*/, '');
const scopeOf = (v: Record<string, unknown>): Scope => ({ symbol: (s) => v[s] as never, table });

describe('DWA-A-138-1 Plan-3 equations', () => {
  it('five entries, every output has a created field, every input is a symbol or register; emitter accepts them', () => {
    expect(EQUATIONS.map((e) => e.equation_number)).toEqual(['A138-02-D1', 'A138-05-D1', 'A138-05-D3', 'A138-08-D1', 'A138-26-D1']);
    const created = new Set(FIELD_CONFIGS.filter((f) => f.create).map((f) => `${f.worksheet} ${f.symbol}`));
    for (const e of EQUATIONS) {
      expect(created.has(`${e.worksheet} ${e.output_symbol}`), `${e.output_symbol} field`).toBe(true);
      expect(e.description.startsWith('Plan 3:')).toBe(true);
      expect(e.verification_quote?.length ?? 0).toBeGreaterThan(0);
      expect(parseNumeric(rhs(e.equation_number)).ok, e.equation_number).toBe(true);
    }
    expect(() => emitEquationsSql('a138', EQUATIONS)).not.toThrow();
  });

  it('the committed migration + rollback equal a fresh emit (freshness pin)', () => {
    const norm = (s: string) => s.replace(/\r\n/g, '\n');
    const { up, down } = emitEquationsSql('a138', EQUATIONS);
    const files = equationFilesFor('a138', '20260917100120');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/ON CONFLICT \(worksheet_template_id, equation_number\) DO NOTHING/g) ?? []).length).toBe(5);
  });

  it('A138-02-D1 feasibility_code: 1 when all Tab. 3 column-2 criteria hold, 3 on any column-4 criterion, else 2', () => {
    const f = rhs('A138-02-D1');
    const ok = { gw_clearance: 1.2, contaminated_land_status: 'none', water_protection_zone: 'none', kf_initial_estimate: 2e-6, geotech_hazards: 'none', building_clearance_status: 'met', slope_risk: 'none' };
    expect(evalNumber(f, scopeOf(ok))).toBe(1);
    expect(evalNumber(f, scopeOf({ ...ok, gw_clearance: 1 }))).toBe(1); // ≥ 1 m inclusive (L745)
    expect(evalNumber(f, scopeOf({ ...ok, kf_initial_estimate: 1e-6 }))).toBe(1); // ≥ 1·10⁻⁶ inclusive (L748)
    // column 3 (potenziell möglich)
    expect(evalNumber(f, scopeOf({ ...ok, gw_clearance: 0.8 }))).toBe(2);
    expect(evalNumber(f, scopeOf({ ...ok, kf_initial_estimate: 5e-7 }))).toBe(2);
    expect(evalNumber(f, scopeOf({ ...ok, contaminated_land_status: 'nearby' }))).toBe(2);
    expect(evalNumber(f, scopeOf({ ...ok, water_protection_zone: 'zone_III' }))).toBe(2);
    expect(evalNumber(f, scopeOf({ ...ok, water_protection_zone: 'zone_I' }))).toBe(2); // never auto column 4 (a138-D-1)
    expect(evalNumber(f, scopeOf({ ...ok, geotech_hazards: 'nearby' }))).toBe(2);
    expect(evalNumber(f, scopeOf({ ...ok, building_clearance_status: 'not_met_protection_possible' }))).toBe(2);
    expect(evalNumber(f, scopeOf({ ...ok, slope_risk: 'unlikely' }))).toBe(2);
    // column 4 (nicht möglich) — one criterion suffices, whatever the others say
    expect(evalNumber(f, scopeOf({ ...ok, contaminated_land_status: 'present' }))).toBe(3);
    expect(evalNumber(f, scopeOf({ ...ok, geotech_hazards: 'at_site' }))).toBe(3);
    expect(evalNumber(f, scopeOf({ ...ok, building_clearance_status: 'not_met_no_protection' }))).toBe(3);
    expect(evalNumber(f, scopeOf({ ...ok, slope_risk: 'probable', gw_clearance: 0.5 }))).toBe(3);
    // a missing criterion never yields a code
    expect(() => evalNumber(f, scopeOf({ ...ok, slope_risk: undefined }))).toThrow(/slope_risk/);
  });

  it('A138-08-D1 n_limit: Tab. 8 row by Schutzkategorie and the A_C ≤ 800 m² band (800 inclusive, L1144)', () => {
    const f = rhs('A138-08-D1');
    expect(evalNumber(f, scopeOf({ schutzkategorie: 'gering', A_C: 800 }))).toBe(0.33);
    expect(evalNumber(f, scopeOf({ schutzkategorie: 'gering', A_C: 800.1 }))).toBe(0.5);
    expect(evalNumber(f, scopeOf({ schutzkategorie: 'maessig', A_C: 300 }))).toBe(0.2);
    expect(evalNumber(f, scopeOf({ schutzkategorie: 'maessig', A_C: 2000 }))).toBe(0.33);
    expect(evalNumber(f, scopeOf({ schutzkategorie: 'stark', A_C: 300 }))).toBe(0.2);
    expect(evalNumber(f, scopeOf({ schutzkategorie: 'stark', A_C: 3000 }))).toBe(0.2);
    expect(evalNumber(f, scopeOf({ schutzkategorie: 'sehr_stark', A_C: 3000 }))).toBe(0.1);
    expect(() => evalNumber(f, scopeOf({ schutzkategorie: 'unknown', A_C: 100 }))).toThrow();
  });

  it('a138-I-1 pin (flipped by Task 1b): evaluateFormula passes enum/text inputs as strings, so the select-keyed formulas COMPUTE', () => {
    const e = eq('A138-08-D1');
    const run = (schutzkategorie: string | null, A_C: number | null) =>
      evaluateFormula({ equationId: 'x', formula: e.formula, inputSymbols: e.input_symbols, outputSymbol: e.output_symbol, inputs: [{ symbol: 'schutzkategorie', value: schutzkategorie, unit: null }, { symbol: 'A_C', value: A_C, unit: 'm²' }], tableLookup: table });
    expect(run('gering', 500)).toMatchObject({ kind: 'computed', value: 0.33, substituted: { schutzkategorie: 'gering', A_C: 500 } });
    expect(run('maessig', 2000)).toMatchObject({ kind: 'computed', value: 0.33 });
    expect(run('sehr_stark', 3000)).toMatchObject({ kind: 'computed', value: 0.1 });
    // an unset select is still a visible missing input, never a wrong number
    const unset = run(null, 500);
    expect(unset.kind).toBe('manual_required');
    if (unset.kind === 'manual_required') expect(unset.missing).toEqual(['schutzkategorie']);
    // an unknown token reports the missing Tab. 8 row (manual_required), never a number
    expect(run('unbekannt', 500).kind).toBe('manual_required');

    const d1 = eq('A138-02-D1');
    const feas = (over: Record<string, string | number | null>) => {
      const base: Record<string, string | number | null> = { gw_clearance: 1.2, contaminated_land_status: 'none', water_protection_zone: 'none', kf_initial_estimate: 2e-6, geotech_hazards: 'none', building_clearance_status: 'met', slope_risk: 'none', ...over };
      return evaluateFormula({ equationId: 'y', formula: d1.formula, inputSymbols: d1.input_symbols, outputSymbol: d1.output_symbol, inputs: d1.input_symbols.map((symbol) => ({ symbol, value: base[symbol], unit: null })), tableLookup: table });
    };
    expect(feas({})).toMatchObject({ kind: 'computed', value: 1 });
    expect(feas({ water_protection_zone: 'zone_III' })).toMatchObject({ kind: 'computed', value: 2 });
    expect(feas({ geotech_hazards: 'at_site' })).toMatchObject({ kind: 'computed', value: 3 });
    const missing = feas({ slope_risk: null });
    expect(missing.kind).toBe('manual_required');
    if (missing.kind === 'manual_required') expect(missing.missing).toEqual(['slope_risk']);
  });

  it('A138-05-D1 / -D3: min over complete register rows through the real evaluateFormula; empty register ⇒ manual_required', () => {
    const cfg = (sym: string) => parseFieldConfig({ widget: 'register', uiConfig: FIELD_CONFIGS.find((f) => f.symbol === sym)!.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
    const prep = (sym: string, rows: unknown[]) => prepareRegisterRows({ rows }, cfg(sym).columns, { table, tableRows });
    const sites = prep('kf_test_sites', [
      { id: '1', label: 'S1', method: 'open_end_test', k_f_measured: 3e-5, depth_m: 1.2 },
      { id: '2', label: 'S2', method: 'doppelzylinder_infiltrometer', k_f_measured: 8e-6 },
      { id: '3', label: 'S3 (incomplete)', method: 'open_end_test' },
    ]);
    const d1 = eq('A138-05-D1');
    const s1 = evaluateFormula({ equationId: 'd1', formula: d1.formula, inputSymbols: d1.input_symbols, outputSymbol: d1.output_symbol, inputs: [], registers: { kf_test_sites: sites }, tableLookup: table });
    expect(s1.kind).toBe('computed');
    if (s1.kind === 'computed') expect(s1.value).toBe(8e-6);
    // the lookup_value column refilled from TAB11 for each complete row
    expect(sites.rows.filter((r) => r.complete).map((r) => r.values.f_methode_row)).toEqual([0.8, 0.9]);
    const layers = prep('soil_layers', [
      { id: 'a', label: 'Oberboden', top_m: 0, bottom_m: 0.3, bodenart: 'Mittel-/Feinsand', k_f: 2e-5, is_bbz: true },
      { id: 'b', label: 'Schluff', top_m: 0.3, bottom_m: 1.5, bodenart: 'schluffiger Sand, sandiger Schluff, Schluff', k_f: 4e-7, is_bbz: false },
    ]);
    const d3 = eq('A138-05-D3');
    const s3 = evaluateFormula({ equationId: 'd3', formula: d3.formula, inputSymbols: d3.input_symbols, outputSymbol: d3.output_symbol, inputs: [], registers: { soil_layers: layers }, tableLookup: table });
    expect(s3.kind).toBe('computed');
    if (s3.kind === 'computed') expect(s3.value).toBe(4e-7);
    const empty = evaluateFormula({ equationId: 'd1', formula: d1.formula, inputSymbols: d1.input_symbols, outputSymbol: d1.output_symbol, inputs: [], registers: { kf_test_sites: prep('kf_test_sites', []) }, tableLookup: table });
    expect(empty.kind).toBe('manual_required');
  });

  it('A138-26-D1 A_C_s_flood: Σ area·C_s over the PAVED surface-inventory rows only (Gl. 10 term)', () => {
    const cfg = REGISTER_CONFIGS_FALLBACK.surface_inventory;
    const reg = prepareRegisterRows({ rows: [
      { id: '1', label: 'Dach', tab9_value: 'schwarzdecke_asphalt', area_m2: 100, c_i: 0.9, c_s: 1.0, coeff_override: false },
      { id: '2', label: 'Rasen', tab9_value: 'park_flach', area_m2: 200, c_i: 0.1, c_s: 0.2, coeff_override: false },
      { id: '3', label: 'Kies', tab9_value: 'dach_flach_kies', area_m2: 50, c_i: 0.8, c_s: 0.8, coeff_override: false },
    ] }, cfg.columns, { table, tableRows }, { legacyMap: cfg.legacy_map, overrideFlagKey: cfg.override?.flag_key, overrideAppliesTo: cfg.override?.applies_to });
    const e = eq('A138-26-D1');
    const s = evaluateFormula({ equationId: 'f', formula: e.formula, inputSymbols: e.input_symbols, outputSymbol: e.output_symbol, inputs: [], registers: { surface_inventory: reg }, tableLookup: table });
    expect(s.kind).toBe('computed');
    if (s.kind === 'computed') expect(s.value).toBeCloseTo(100 * 1.0 + 50 * 0.8, 9); // park_flach (unpaved) excluded
  });
});
