/**
 * Plan 3 Task 8 — FLL-Naturteich derived-value equations: the emitter accepts every
 * entry, the committed migration equals a fresh emit, and each formula computes
 * the printed rule through the real `evaluateFormula` over rows prepared by the
 * register contract (Tab. 7 / 8 / 10 / 11 / 12 / 15 / §10.4.3 cells looked up from
 * the seeded tables — the TS fallback, no migration applied). Enum cells reach the
 * row exprs as strings (controller amendment D). The App.-5 worked examples
 * (L4073–L4080: 600 · 15 · 0.7 = 6300 m²; L4086–L4091: 50 + 45 = 95 m²) and the
 * §10.3.1 example (L2912: 1 % of 30 m² = 0.3 m) are the pinned values.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EQUATIONS } from '../equations/fll_naturteich';
import { FIELD_CONFIGS } from '../field-configs/fll_naturteich';
import { evaluateFormula, type EvalState } from '../formula';
import { prepareRegisterRows } from '../register-rows';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { makeTableLookup, makeTableRows } from '../regulation-tables-fallback';
import { parseNumeric, type Value } from '@/lib/expr';
import { emitEquationsSql, equationFilesFor } from '../../../../scripts/regulation-tables/emit-equations-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const STD = 'FLL-Naturteich';
const table = makeTableLookup(STD);
const tableRows = makeTableRows(STD);
const eq = (n: string) => EQUATIONS.find((e) => e.equation_number === n)!;
const rhs = (n: string) => eq(n).formula.replace(/^[A-Za-z_][A-Za-z0-9_]*\s*=\s*/, '');
const cfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: FIELD_CONFIGS.find((f) => f.worksheet === ws && f.symbol === sym)!.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const prep = (ws: string, sym: string, rows: unknown[], symbol?: (s: string) => Value | undefined) => {
  const c = cfg(ws, sym);
  return prepareRegisterRows({ rows }, c.columns, { table, tableRows, symbol }, { overrideFlagKey: c.override?.flag_key, overrideAppliesTo: c.override?.applies_to });
};
const run = (n: string, registers: Record<string, ReturnType<typeof prep>>): EvalState => {
  const e = eq(n);
  return evaluateFormula({ equationId: n, formula: e.formula, inputSymbols: e.input_symbols, outputSymbol: e.output_symbol, inputs: [], registers, tableLookup: table });
};
const computed = (r: EvalState): number => { expect(r.kind).toBe('computed'); return r.kind === 'computed' ? r.value : NaN; };
const reason = (r: EvalState): string => (r.kind === 'manual_required' ? r.reason : r.kind);

describe('FLL-Naturteich Plan-3 equations', () => {
  it('eleven register-fed entries; every output is a created field; no prod producer is duplicated; the emitter accepts them', () => {
    expect(EQUATIONS.map((e) => e.equation_number)).toEqual(['FLLNT-06-D1', 'FLLNT-06-D2', 'FLLNT-06-D3', 'FLLNT-06-D4', 'FLLNT-10-D1', 'FLLNT-10-D2', 'FLLNT-11-D1', 'FLLNT-11-D2', 'FLLNT-12-D1', 'FLLNT-04-D1', 'FLLNT-04-D2']);
    const created = new Set(FIELD_CONFIGS.filter((f) => f.create).map((f) => `${f.worksheet} ${f.symbol}`));
    const registers = new Set(FIELD_CONFIGS.filter((f) => f.widget === 'register').map((f) => `${f.worksheet} ${f.symbol}`));
    for (const e of EQUATIONS) {
      expect(created.has(`${e.worksheet} ${e.output_symbol}`), `${e.worksheet} ${e.output_symbol}`).toBe(true);
      expect(e.input_symbols).toHaveLength(1);
      expect(registers.has(`${e.worksheet} ${e.input_symbols[0]}`), `${e.worksheet} ${e.input_symbols[0]} is a register of that worksheet`).toBe(true);
      expect(e.description.startsWith('Plan 3:')).toBe(true);
      expect(e.verification_quote?.length ?? 0).toBeGreaterThan(0);
      expect(parseNumeric(rhs(e.equation_number)).ok, e.equation_number).toBe(true);
    }
    // single-source: the six prod rows (read in-session) output these symbols — none is re-produced here (R-2 / R-3 / R-4 stage the re-points)
    for (const e of EQUATIONS) expect(['pool_underwater_surface', 'filter_50x_rule_met', 'filter_colonized_surface_actual', 'filter_volume_required', 'overflow_edge_length', 'splash_water_tank_volume']).not.toContain(e.output_symbol);
    expect(new Set(EQUATIONS.map((e) => `${e.worksheet} ${e.output_symbol}`)).size).toBe(EQUATIONS.length);
    expect(() => emitEquationsSql('fll_naturteich', EQUATIONS)).not.toThrow();
  });

  it('the committed equations migration + rollback equal a fresh emit (freshness pin)', () => {
    const norm = (s: string) => s.replace(/\r\n/g, '\n');
    const { up, down } = emitEquationsSql('fll_naturteich', EQUATIONS);
    const files = equationFilesFor('fll_naturteich', '20260917100820');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/^INSERT INTO equations/gm) ?? []).length).toBe(11);
  });

  it('FLLNT-06: zones → Σ 80 m², regeneration share 40 / (30 + 40) = 57.14 % (supplementary excluded), underwater 50 + 45 = 95 m² (App. 5 Ex. 2), submerged share 50 %', () => {
    const zonen = prep('FLLNT-06', 'zonen', [
      { label: 'Schwimmen', zone: 'swimming', area_m2: 30, ground_area_m2: 50, wall_area_m2: 45 },          // L4089–L4091
      { label: 'Regeneration A', zone: 'regeneration', area_m2: 20, technique: 'hydrobotanical_submergent' },
      { label: 'Regeneration B', zone: 'regeneration', area_m2: 20, technique: 'hydrobotanical_emersed' },
      { label: 'Weg', zone: 'supplementary', area_m2: 10 },
    ]);
    expect(zonen.rows.every((r) => r.complete)).toBe(true);
    expect(zonen.rows.map((r) => r.values.underwater_m2)).toEqual([95, 0, 0, 0]);
    expect(computed(run('FLLNT-06-D1', { zonen }))).toBe(80);
    expect(computed(run('FLLNT-06-D2', { zonen }))).toBeCloseTo(57.142857, 5);
    expect(computed(run('FLLNT-06-D3', { zonen }))).toBe(95);
    expect(computed(run('FLLNT-06-D4', { zonen }))).toBe(50);
    // the Tab.-1 minimum for type I / II ("> 50%"): 51 / (49 + 51) → 51 passes, 50 does not (strict, as printed)
    const edge = prep('FLLNT-06', 'zonen', [{ label: 's', zone: 'swimming', area_m2: 49 }, { label: 'r', zone: 'regeneration', area_m2: 51, technique: 'hydrobotanical_submergent' }]);
    expect(computed(run('FLLNT-06-D2', { zonen: edge }))).toBe(51);
    // no regeneration row → D4 is undecidable (division by zero), never 0; an empty register → manual_required
    expect(reason(run('FLLNT-06-D4', { zonen: prep('FLLNT-06', 'zonen', [{ label: 's', zone: 'swimming', area_m2: 30 }]) }))).toMatch(/Division durch Null/);
    expect(reason(run('FLLNT-06-D1', { zonen: prep('FLLNT-06', 'zonen', []) }))).toMatch(/Keine vollständigen Zeilen/);
    // an incomplete regeneration row (technique missing) does not count
    const partial = prep('FLLNT-06', 'zonen', [{ label: 's', zone: 'swimming', area_m2: 30 }, { label: 'r', zone: 'regeneration', area_m2: 40 }]);
    expect(partial.rows.map((r) => r.complete)).toEqual([true, false]);
    expect(computed(run('FLLNT-06-D1', { zonen: partial }))).toBe(30);
  });

  it('FLLNT-10: App. 5 Ex. 1 (600 m²/m³ · 15 m² · 0.7 m = 6300 m²) per substrate row; Tab. 10 / 11 / 12 limits per kind; feed-rate violations count Qmax / Qmin as printed', () => {
    const rows = [
      { label: 'Hydro', unit_kind: 'hydrobotanical', hydrobot_type: 'emersed', area_m2: 20, layer_cm: 25, feed_rate: 4 },
      { label: 'Quick', unit_kind: 'substrate_filter', flow_type: 'quick', flow_direction: 'vertical_continuous_overflow', area_m2: 15, layer_cm: 70, grain_class: '8_16', feed_rate: 20 }, // L4073–L4080
      { label: 'Slow', unit_kind: 'substrate_filter', flow_type: 'slow', flow_direction: 'vertical_no_overflow', area_m2: 10, layer_cm: 40, grain_class: '4_8', feed_rate: 9 },              // Qmax 8 → violation
      { label: 'Horizontal', unit_kind: 'substrate_filter', flow_type: 'slow', flow_direction: 'horizontal', area_m2: 10, layer_cm: 40, grain_class: '4_8', feed_rate: 9 },                 // individual verification → not counted
      { label: 'Technik', unit_kind: 'technical', area_m2: 2, colonized_manual_m2: 500 },
    ];
    const fe = prep('FLLNT-10', 'filtereinheiten', rows);
    expect(fe.rows.every((r) => r.complete)).toBe(true);
    expect(fe.rows.map((r) => r.values.layer_min)).toEqual([10, 50, 40, null, 0]);
    expect(fe.rows.map((r) => r.values.layer_ok)).toEqual([1, 1, 1, 1, 1]);
    expect(fe.rows.map((r) => r.values.surface_m2_m3)).toEqual([null, 600, 1200, 1200, null]);
    expect(fe.rows.map((r) => r.values.colonized_m2)).toEqual([0, 6300, 4800, 4800, 500]);
    expect(fe.rows.map((r) => r.values.feed_limit)).toEqual([5, 15, 8, null, 0]);
    expect(fe.rows.map((r) => r.values.feed_ok)).toEqual([1, 1, 0, 1, 1]);
    expect(computed(run('FLLNT-10-D1', { filtereinheiten: fe }))).toBe(16400);
    expect(computed(run('FLLNT-10-D2', { filtereinheiten: fe }))).toBe(1);
    // quick filter under Qmin 15 → violation; hydrobotanical layer outside 10 – 30 cm → layer badge 0; substrate layer under ≥ 50 cm → 0
    const bad = prep('FLLNT-10', 'filtereinheiten', [
      { label: 'q', unit_kind: 'substrate_filter', flow_type: 'quick', flow_direction: 'vertical_no_overflow', area_m2: 15, layer_cm: 45, grain_class: '16_32', feed_rate: 12 },
      { label: 'h', unit_kind: 'hydrobotanical', hydrobot_type: 'emersed', area_m2: 20, layer_cm: 35, feed_rate: 6 },
    ]);
    expect(bad.rows.map((r) => [r.values.layer_ok, r.values.feed_ok])).toEqual([[0, 0], [0, 0]]);
    expect(computed(run('FLLNT-10-D2', { filtereinheiten: bad }))).toBe(2);
    // the 50×-rule: 6300 m² ≥ 50 · 126 m² (L4082–L4083) — checked by the STAGED EQ-01 re-point, the Σ is the input it needs
    expect(6300 / 50).toBe(126);
    // a technical row without the manufacturer value counts 0 (never blocks the Σ); a row without a feed rate is not a violation
    const t = prep('FLLNT-10', 'filtereinheiten', [{ label: 't', unit_kind: 'technical', area_m2: 2 }]);
    expect(t.rows[0].values.colonized_m2).toBe(0);
    expect(t.rows[0].values.feed_ok).toBe(1);
  });

  it('FLLNT-11: Σ edge length (the §10.3.1 example 0.3 m for 30 m²), ±1 mm up to 1 m / ±2 mm above', () => {
    const ue = prep('FLLNT-11', 'ueberlaufeinrichtungen', [
      { label: 'Skimmer', type: 'flexible', edge_length_m: 0.3, tolerance_mm: 1 },   // L2912; ≤ 1 m → ±1 mm → ok
      { label: 'Rinne', type: 'rigid', edge_length_m: 2, tolerance_mm: 2 },          // > 1 m → ±2 mm → ok
      { label: 'Rinne 2', type: 'rigid', edge_length_m: 0.8, tolerance_mm: 1.5 },    // ≤ 1 m → ±1 mm → violation
      { label: 'ohne Messung', type: 'rigid', edge_length_m: 1 },                     // no measurement → not counted
    ]);
    expect(ue.rows.map((r) => [r.values.tol_limit, r.values.tol_ok])).toEqual([[1, 1], [2, 1], [1, 0], [1, 1]]);
    expect(computed(run('FLLNT-11-D1', { ueberlaufeinrichtungen: ue }))).toBeCloseTo(4.1, 9);
    expect(computed(run('FLLNT-11-D2', { ueberlaufeinrichtungen: ue }))).toBe(1);
  });

  it('FLLNT-12: §10.4.3 densities per group; Σ area · density; lilies have no printed range', () => {
    const pl = prep('FLLNT-12', 'plant_species_list', [
      { art: 'Myriophyllum', plant_group: 'submerged', area_m2: 10, density: 8 },
      { art: 'Iris', plant_group: 'marsh_small', area_m2: 5, density: 4 },
      { art: 'Nymphaea', plant_group: 'lilies', area_m2: 4, density: 1 },
      { art: 'Typha', plant_group: 'marsh_medium', area_m2: 2, density: 9 }, // above 5 – 7 → badge 0 (approximate value, never blocks)
    ]);
    expect(pl.rows.every((r) => r.complete)).toBe(true);
    expect(pl.rows.map((r) => [r.values.density_min, r.values.density_max, r.values.in_range, r.values.count])).toEqual([[6, 10, 1, 80], [3, 5, 1, 20], [null, null, 1, 4], [5, 7, 0, 18]]);
    expect(computed(run('FLLNT-12-D1', { plant_species_list: pl }))).toBe(122);
    // a Plan-1 row (art / zone / anzahl only) is incomplete under the typed columns and is not counted
    const legacy = prep('FLLNT-12', 'plant_species_list', [{ art: 'Alt', zone: 'Flachwasser', anzahl: '12' }, { art: 'Neu', plant_group: 'submerged', area_m2: 1, density: 6 }]);
    expect(legacy.rows.map((r) => r.complete)).toEqual([false, true]);
    expect(computed(run('FLLNT-12-D1', { plant_species_list: legacy }))).toBe(6);
  });

  it('FLLNT-04: fill-water rows decide against Tab. 7; swimming rows need natural_pool_type in scope (C-1) for the Tab.-8 P limits', () => {
    const fill = (over: Record<string, number>) => ({ date: '2026-05-01', location: 'fill', ammonium: 0.4, iron: 0.1, p_total: 0.02, hardness: 1.2, conductivity: 800, manganese: 0.01, nitrate: 20, orthophosphate: 0.005, acid_capacity: 2.5, ph: 7.5, ...over });
    const swim = (over: Record<string, number>) => ({ date: '2026-07-01', location: 'swimming', ammonium: 0.2, p_total: 0.02, hardness: 1.2, conductivity: 800, nitrate: 20, nitrite: 0.005, orthophosphate: 0.02, acid_capacity: 2.5, ph: 7.5, ...over });
    const ok = prep('FLLNT-04', 'wasserproben', [fill({})]);
    expect(ok.rows[0].complete).toBe(true);
    expect(ok.rows[0].values.sample_ok).toBe(1);
    expect(computed(run('FLLNT-04-D1', { wasserproben: ok }))).toBe(0);
    expect(computed(run('FLLNT-04-D2', { wasserproben: ok }))).toBe(1);
    const bad = prep('FLLNT-04', 'wasserproben', [fill({ ammonium: 0.6 }), fill({ ph: 5.5 }), fill({ hardness: 0.8 })]);
    expect(bad.rows.map((r) => [r.values.ammonium_ok, r.values.ph_ok, r.values.hardness_ok, r.values.sample_ok])).toEqual([[0, 1, 1, 0], [1, 0, 1, 0], [1, 1, 0, 0]]);
    expect(computed(run('FLLNT-04-D1', { wasserproben: bad }))).toBe(3);
    // swimming row WITHOUT the type in scope: the P checks are null → the count is undecidable (pinned; fll_naturteich-C-1)
    const noType = prep('FLLNT-04', 'wasserproben', [swim({})]);
    expect(noType.rows[0].values.ammonium_ok).toBe(1);
    expect(noType.rows[0].values.p_total_ok).toBeNull();
    expect(reason(run('FLLNT-04-D1', { wasserproben: noType }))).toMatch(/Fehlende Eingabe für count_rows/);
    // with the type in scope: type IV → 0.01 mg/l → p_total 0.02 and orthophosphate 0.02 exceed; type I → 0.03 → ok
    const iv = prep('FLLNT-04', 'wasserproben', [swim({})], (s) => (s === 'natural_pool_type' ? 'type_IV' : undefined));
    expect(iv.rows[0].values.p_total_ok).toBe(0);
    expect(iv.rows[0].values.orthophosphate_ok).toBe(0);
    expect(computed(run('FLLNT-04-D1', { wasserproben: iv }))).toBe(1);
    const i = prep('FLLNT-04', 'wasserproben', [swim({})], (s) => (s === 'natural_pool_type' ? 'type_I' : undefined));
    expect(i.rows[0].values.sample_ok).toBe(1);
    expect(computed(run('FLLNT-04-D1', { wasserproben: i }))).toBe(0);
    // nitrite is a swimming-only parameter (Tab. 8): 0.02 > 0.01 → violation there, never on a fill row
    const nitrite = prep('FLLNT-04', 'wasserproben', [swim({ nitrite: 0.02 })], (s) => (s === 'natural_pool_type' ? 'type_I' : undefined));
    expect(nitrite.rows[0].values.nitrite_ok).toBe(0);
    expect(ok.rows[0].values.nitrite_ok).toBe(1);
  });
});
