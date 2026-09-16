import { describe, it, expect } from 'vitest';
import { prepareRegisterRows } from '../register-rows';
import { REGISTER_CONFIGS_FALLBACK, registerFlagKeys } from '../register-configs';
import { makeTableLookup, makeTableRows } from '../regulation-tables-fallback';
import { POLLUTANTS } from '@/lib/vsme/pollutants';
import type { RegisterColumn } from '../field-config';

const surface = REGISTER_CONFIGS_FALLBACK.surface_inventory;
const ctx = { table: makeTableLookup('DWA-A-138-1'), tableRows: makeTableRows('DWA-A-138-1') };
const surfaceOpts = { legacyMap: surface.legacy_map, overrideFlagKey: surface.override?.flag_key };

describe('prepareRegisterRows — A138 surface_inventory parity', () => {
  it('typed cells, derived kind + a_c_i, completeness = required columns non-null', () => {
    const reg = prepareRegisterRows({ rows: [
      { id: '1', label: 'Dach', tab9_value: 'schwarzdecke_asphalt', area_m2: 3786.8, c_i: 0.9, c_s: 1.0, coeff_override: false },
      { id: 'bad', label: 'Unbestimmt', tab9_value: null, area_m2: 200, c_i: 0.9, c_s: 1.0, coeff_override: false },
    ] }, surface.columns, ctx, surfaceOpts);
    expect(reg.rows[0].complete).toBe(true);
    expect(reg.rows[0].values).toMatchObject({ area_m2: 3786.8, c_i: 0.9, c_s: 1, kind: 'paved' });
    expect(reg.rows[0].values.a_c_i as number).toBeCloseTo(3408.12, 6);
    expect(reg.rows[1].complete).toBe(false);
    expect(reg.rows[1].values.kind).toBeNull();
  });
  it('replays the legacy surface_type shape exactly like normalizeSurfaceCarrier (asphalt maps, dach does not)', () => {
    const reg = prepareRegisterRows({ rows: [
      { id: 'g', label: 'Gewächshausdach', surface_type: 'dach', area_m2: 3786.8, c_i: 0.9, c_s: 1.0 },
      { id: 'p', label: 'Parkplatz', surface_type: 'asphalt', area_m2: 1575.9, c_i: 0.9, c_s: 1.0 },
    ] }, surface.columns, ctx, surfaceOpts);
    expect(reg.rows[0].values.tab9_value).toBeNull();          // (0.9, 1.0) matches several Tab. 9 rows ⇒ reselection
    expect(reg.rows[0].complete).toBe(false);
    expect(reg.rows[1].values.tab9_value).toBe('schwarzdecke_asphalt');
    expect(reg.rows[1].values.coeff_override).toBe(false);
    expect(reg.rows[1].complete).toBe(true);
  });
  it('an overridden c_i is kept (audited override), a null lookup_value cell is refilled from the table', () => {
    const reg = prepareRegisterRows({ rows: [
      { id: 'r', label: 'Dach', tab9_value: 'schwarzdecke_asphalt', area_m2: 100, c_i: 0.75, c_s: 1.0, coeff_override: true },
      { id: 's', label: 'Rasen', tab9_value: 'park_flach', area_m2: 100, c_i: null, c_s: null, coeff_override: false },
    ] }, surface.columns, ctx, surfaceOpts);
    expect(reg.rows[0].values.c_i).toBe(0.75);
    expect(reg.rows[1].values).toMatchObject({ c_i: 0.1, c_s: 0.2, kind: 'unpaved' });
    expect(reg.rows[1].complete).toBe(true);
  });
  it('pollutant_register: enum options validate, min:0 enforces completeness, flag is read', () => {
    const cols = REGISTER_CONFIGS_FALLBACK.pollutant_register.columns;
    const p = POLLUTANTS[0].value;
    const reg = prepareRegisterRows({ not_applicable: true, rows: [
      { id: 'a', label: 'Kessel', pollutant: p, medium: 'air', amount_t: 1.5 },
      { id: 'b', label: 'x', pollutant: 'NOT-A-POLLUTANT', medium: 'air', amount_t: 1 },
      { id: 'c', label: 'y', pollutant: p, medium: 'water', amount_t: -1 },
    ] }, cols, {}, { flagKeys: registerFlagKeys('pollutant_register') });
    expect(reg.flags).toEqual({ not_applicable: true });
    expect(reg.rows.map((r) => r.complete)).toEqual([true, false, false]);
    expect(reg.rows[1].values.pollutant).toBeNull();
  });
  it('null / non-object carriers give an empty register', () => {
    expect(prepareRegisterRows(null, surface.columns, ctx)).toEqual({ rows: [], flags: {} });
    expect(prepareRegisterRows({ rows: 'x' }, surface.columns, ctx)).toEqual({ rows: [], flags: {} });
  });
});

describe('prepareRegisterRows — controller amendments', () => {
  it('A2: a required column whose visible_when FAILS in row scope is skipped for completeness', () => {
    const cols: RegisterColumn[] = [
      { key: 'tech', type: 'enum', label: 'Technik', required: true, options: ['a', 'b'], discriminator: true },
      { key: 'only_b', type: 'number', label: 'nur b', required: true, visible_when: "tech == 'b'" },
    ];
    const reg = prepareRegisterRows({ rows: [
      { id: '1', tech: 'a', only_b: null },
      { id: '2', tech: 'b', only_b: null },
      { id: '3', tech: null, only_b: null },   // pending ⇒ column kept ⇒ incomplete
    ] }, cols, {});
    expect(reg.rows.map((r) => r.complete)).toEqual([true, false, false]);
  });
  it('A2: visible_when falls back to ctx.symbol for symbols not in the row', () => {
    const cols: RegisterColumn[] = [
      { key: 'x', type: 'number', label: 'x', required: true, visible_when: 'mode == "detail"' },
    ];
    const rows = [{ id: '1', x: null }];
    // The worksheet scope answers only its own symbols (a catch-all would feed the
    // evaluator's var-vs-var rule, which tries a string RHS as a symbol first).
    const ws = (mode: string) => (s: string) => (s === 'mode' ? mode : undefined);
    expect(prepareRegisterRows({ rows }, cols, { symbol: ws('simple') }).rows[0].complete).toBe(true);
    expect(prepareRegisterRows({ rows }, cols, { symbol: ws('detail') }).rows[0].complete).toBe(false);
  });
  it('A3: grid column keeps a plain-object carrier, null otherwise; required grid needs >= 1 cell', () => {
    const cols: RegisterColumn[] = [
      { key: 'label', type: 'text', label: 'L' },
      { key: 'cells', type: 'grid', label: 'Raster', required: true },
    ];
    const carrier = { cells: { r1: { c1: 1 } } };
    const reg = prepareRegisterRows({ rows: [
      { id: '1', label: 'ok', cells: carrier },
      { id: '2', label: 'empty', cells: { cells: {} } },
      { id: '3', label: 'str', cells: 'nope' },
      { id: '4', label: 'arr', cells: [1] },
    ] }, cols, {});
    expect(reg.rows[0].values.cells).toBe(carrier as unknown);
    expect(reg.rows[0].complete).toBe(true);
    expect(reg.rows[1].complete).toBe(false);
    expect(reg.rows[2].values.cells).toBeNull();
    expect(reg.rows[2].complete).toBe(false);
    expect(reg.rows[3].values.cells).toBeNull();
  });
});
