/**
 * Plan 3 Task 23 — ISO-5667-6 derived-value equations: the emitter accepts
 * every entry, the committed migration equals a fresh emit, and each formula
 * computes through the real `evaluateFormula` over rows prepared by the register
 * contract (TS fallback tables, no migration applied). The standard prints no
 * worked example for these counts; the pins are the printed thresholds (30 cm /
 * 30 cm, ≈ 6 samples, 5 flows, 10 %, 5 min) applied to chosen rows, incl. the
 * edge cases: an EMPTY register is never a phantom pass (counts 0, Σ / spread
 * manual), incomplete rows never count.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EQUATIONS } from '../equations/iso5667_6';
import { FIELD_CONFIGS } from '../field-configs/iso5667_6';
import { evaluateFormula, type EvalState } from '../formula';
import { prepareRegisterRows } from '../register-rows';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { makeTableLookup, makeTableRows } from '../regulation-tables-fallback';
import { parseNumeric } from '@/lib/expr';
import { emitEquationsSql, equationFilesFor } from '../../../../scripts/regulation-tables/emit-equations-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const STD = 'ISO-5667-6';
const table = makeTableLookup(STD);
const tableRows = makeTableRows(STD);
const eq = (n: string) => EQUATIONS.find((e) => e.equation_number === n)!;
const rhs = (n: string) => eq(n).formula.replace(/^[A-Za-z_][A-Za-z0-9_]*\s*=\s*/, '');
const cfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: FIELD_CONFIGS.find((f) => f.worksheet === ws && f.symbol === sym)!.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const prep = (ws: string, sym: string, rows: unknown[]) => prepareRegisterRows({ rows }, cfg(ws, sym).columns, { table, tableRows, symbol: () => undefined });
type Input = { symbol: string; value: number | string | null; unit: string | null };
const run = (n: string, opts: { inputs?: Input[]; registers?: Record<string, ReturnType<typeof prep>> }): EvalState => {
  const e = eq(n);
  return evaluateFormula({ equationId: n, formula: e.formula, inputSymbols: e.input_symbols, outputSymbol: e.output_symbol, inputs: opts.inputs ?? [], registers: opts.registers, tableLookup: table });
};
const computed = (r: EvalState): number => { expect(r.kind, JSON.stringify(r)).toBe('computed'); return r.kind === 'computed' ? r.value : NaN; };
const manual = (r: EvalState): string => { expect(r.kind, JSON.stringify(r)).toBe('manual_required'); return r.kind === 'manual_required' ? r.reason : ''; };

describe('ISO-5667-6 Plan-3 equations', () => {
  it('10 entries, every output has a created derived field on its worksheet, every input is the register of that worksheet; no prod output re-produced (l / sampling_depth_below_surface keep their rows); no figure typed into a formula; emitter accepts them', () => {
    expect(EQUATIONS.map((e) => e.equation_number)).toEqual([
      'ISO-5667-6-02-D1', 'ISO-5667-6-02-D2',
      'ISO-5667-6-03-D1', 'ISO-5667-6-03-D2', 'ISO-5667-6-03-D3',
      'ISO-5667-6-04-D1', 'ISO-5667-6-04-D2', 'ISO-5667-6-04-D3',
      'ISO-5667-6-09-D1', 'ISO-5667-6-09-D2',
    ]);
    const created = new Set(FIELD_CONFIGS.filter((f) => f.create).map((f) => `${f.worksheet} ${f.symbol}`));
    for (const e of EQUATIONS) {
      expect(created.has(`${e.worksheet} ${e.output_symbol}`), `${e.output_symbol} field`).toBe(true);
      for (const s of e.input_symbols) expect(created.has(`${e.worksheet} ${s}`), `${e.equation_number} input ${s}`).toBe(true);
      expect(e.description.startsWith('Plan 3:')).toBe(true);
      expect(e.verification_quote?.length ?? 0).toBeGreaterThan(0);
      expect(e.verification_quote).not.toContain('undefined');
      expect(parseNumeric(rhs(e.equation_number)).ok, e.equation_number).toBe(true);
      expect(['l', 'sampling_depth_below_surface', 'l_mixing_calc', 'heterogeneity_flows_count']).not.toContain(e.output_symbol); // A.1 / Eq. 2 untouched (U-1 / D-3); F-1 withheld
      expect(rhs(e.equation_number).replace(/if\(|, 1, 0\)|== 0/g, '')).not.toMatch(/\b\d+(\.\d+)?\b/); // thresholds come from lookup(), never typed (the 1 / 0 verdicts and the badge `== 0` are structural)
    }
    const { warnings } = emitEquationsSql('iso5667_6', EQUATIONS);
    expect(warnings).toEqual([]);
  });

  it('the committed migration + rollback equal a fresh emit (freshness pin)', () => {
    const norm = (s: string) => s.replace(/\r\n/g, '\n');
    const { up, down } = emitEquationsSql('iso5667_6', EQUATIONS);
    const files = equationFilesFor('iso5667_6', '20260917102320');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/ON CONFLICT \(worksheet_template_id, equation_number\) DO NOTHING/g) ?? []).length).toBe(10);
  });

  it('-02: four points — bridge 30/40 ok, under_ice 20/40 fail (surface), bank without depths fail (not entered), boat 35/30 ok (inclusive) — count 4, depth fails 2; a row without kennung is incomplete and never counts; empty register ⇒ 0 / 0 (never a phantom pass, never manual)', () => {
    const rows = [
      { id: 'p1', kennung: 'P1', location_type: 'bridge', bridge_position: 'upstream', bridge_checks: true, depth_below_surface_cm: 30, height_above_bed_cm: 40 },
      { id: 'p2', kennung: 'P2', location_type: 'under_ice', ice_safety: true, depth_below_surface_cm: 20, height_above_bed_cm: 40 },
      { id: 'p3', kennung: 'P3', location_type: 'bank', ppe_high_visibility: true, mixing_relevant: true, mixing_dimension: 'vertical', vertical_mixing_distance: 120 },
      { id: 'p4', kennung: 'P4', location_type: 'boat', depth_below_surface_cm: 35, height_above_bed_cm: 30 },
      { id: 'p5', location_type: 'boat', depth_below_surface_cm: 10, height_above_bed_cm: 10 }, // no kennung → incomplete
    ];
    const reg = prep('ISO-5667-6-02', 'sampling_points_6', rows);
    expect(reg.rows.map((r) => r.complete)).toEqual([true, true, true, true, false]);
    expect(reg.rows.map((r) => r.values.depth_ok)).toEqual([1, 0, 0, 1, 0]);
    expect(reg.rows[2].values.vertical_mixing_distance).toBe(120); // row-scope visible column keeps its cell
    expect(reg.diagnostics ?? []).toEqual([]);
    expect(computed(run('ISO-5667-6-02-D1', { registers: { sampling_points_6: reg } }))).toBe(4);
    expect(computed(run('ISO-5667-6-02-D2', { registers: { sampling_points_6: reg } }))).toBe(2);
    const empty = prep('ISO-5667-6-02', 'sampling_points_6', []);
    expect(computed(run('ISO-5667-6-02-D1', { registers: { sampling_points_6: empty } }))).toBe(0);
    expect(computed(run('ISO-5667-6-02-D2', { registers: { sampling_points_6: empty } }))).toBe(0);
    // the badge boundary is the printed 30 cm read from S7_1 (inclusive): 29,9 fails
    const edge = prep('ISO-5667-6-02', 'sampling_points_6', [{ id: 'e', kennung: 'E', location_type: 'bank', depth_below_surface_cm: 29.9, height_above_bed_cm: 30 }]);
    expect(edge.rows[0].values.depth_ok).toBe(0);
  });

  it('-03: six samples at three flows → count 6, ok 1, spread 7,4 − 6,9 = 0,5; five samples → ok 0; a sample without value is incomplete; empty ⇒ count 0, ok 0, spread manual (never a phantom value)', () => {
    const rows = [
      { id: '1', sample_no: 1, flow: 2, determinant: 'pH', value: 7.1 }, { id: '2', sample_no: 2, flow: 2, determinant: 'pH', value: 7.4 },
      { id: '3', sample_no: 3, flow: 5, determinant: 'pH', value: 6.9 }, { id: '4', sample_no: 4, flow: 5, determinant: 'pH', value: 7.0 },
      { id: '5', sample_no: 5, flow: 9, determinant: 'pH', value: 7.2 }, { id: '6', sample_no: 6, flow: 9, determinant: 'pH', value: 7.3 },
      { id: '7', sample_no: 7, flow: 9, determinant: 'pH' }, // no value → incomplete
    ];
    const reg = prep('ISO-5667-6-03', 'heterogeneity_samples', rows);
    expect(reg.rows.map((r) => r.complete)).toEqual([true, true, true, true, true, true, false]);
    expect(computed(run('ISO-5667-6-03-D1', { registers: { heterogeneity_samples: reg } }))).toBe(6);
    expect(computed(run('ISO-5667-6-03-D2', { registers: { heterogeneity_samples: reg } }))).toBe(1);
    expect(computed(run('ISO-5667-6-03-D3', { registers: { heterogeneity_samples: reg } }))).toBeCloseTo(0.5, 10);
    const five = prep('ISO-5667-6-03', 'heterogeneity_samples', rows.slice(0, 5));
    expect(computed(run('ISO-5667-6-03-D1', { registers: { heterogeneity_samples: five } }))).toBe(5);
    expect(computed(run('ISO-5667-6-03-D2', { registers: { heterogeneity_samples: five } }))).toBe(0);
    const empty = prep('ISO-5667-6-03', 'heterogeneity_samples', []);
    expect(computed(run('ISO-5667-6-03-D1', { registers: { heterogeneity_samples: empty } }))).toBe(0);
    expect(computed(run('ISO-5667-6-03-D2', { registers: { heterogeneity_samples: empty } }))).toBe(0);
    expect(manual(run('ISO-5667-6-03-D3', { registers: { heterogeneity_samples: empty } }))).toMatch(/Keine vollständigen Zeilen/);
  });

  it('-04: five runs → count 5, ok 1; four → ok 0; a run without time is incomplete; the extrapolation twin reads 10 % with no input; empty ⇒ 0 / 0', () => {
    const rows = [1, 2, 3, 4, 5].map((k) => ({ id: `r${k}`, flow: k * 2, method: 'surface_floats', travel_time_min: 60 / k }));
    const reg = prep('ISO-5667-6-04', 'travel_time_runs', rows);
    expect(computed(run('ISO-5667-6-04-D1', { registers: { travel_time_runs: reg } }))).toBe(5);
    expect(computed(run('ISO-5667-6-04-D2', { registers: { travel_time_runs: reg } }))).toBe(1);
    const four = prep('ISO-5667-6-04', 'travel_time_runs', [...rows.slice(0, 4), { id: 'r5', flow: 10, method: 'tracers' }]);
    expect(four.rows.map((r) => r.complete)).toEqual([true, true, true, true, false]);
    expect(computed(run('ISO-5667-6-04-D1', { registers: { travel_time_runs: four } }))).toBe(4);
    expect(computed(run('ISO-5667-6-04-D2', { registers: { travel_time_runs: four } }))).toBe(0);
    expect(computed(run('ISO-5667-6-04-D3', {}))).toBe(10);
    const empty = prep('ISO-5667-6-04', 'travel_time_runs', []);
    expect(computed(run('ISO-5667-6-04-D1', { registers: { travel_time_runs: empty } }))).toBe(0);
    expect(computed(run('ISO-5667-6-04-D2', { registers: { travel_time_runs: empty } }))).toBe(0);
  });

  it('-09: increments 1,5 + 2 + 1 min → Σ 4,5, ok 1; + 0,5 → Σ 5,0, ok 0 (strict "<"); an increment without duration is incomplete; empty ⇒ Σ manual and ok manual (never a phantom pass)', () => {
    const rows = [{ id: '1', time: '08:00', mode: 'direct', duration_min: 1.5 }, { id: '2', time: '08:02', mode: 'direct', duration_min: 2, preservative: true }, { id: '3', mode: 'indirect_dip_flask', duration_min: 1 }, { id: '4', time: '08:05' }];
    const reg = prep('ISO-5667-6-09', 'increments', rows);
    expect(reg.rows.map((r) => r.complete)).toEqual([true, true, true, false]);
    expect(computed(run('ISO-5667-6-09-D1', { registers: { increments: reg } }))).toBeCloseTo(4.5, 10);
    expect(computed(run('ISO-5667-6-09-D2', { registers: { increments: reg } }))).toBe(1);
    const five = prep('ISO-5667-6-09', 'increments', [...rows.slice(0, 3), { id: '4', duration_min: 0.5 }]);
    expect(computed(run('ISO-5667-6-09-D1', { registers: { increments: five } }))).toBeCloseTo(5, 10);
    expect(computed(run('ISO-5667-6-09-D2', { registers: { increments: five } }))).toBe(0);
    const empty = prep('ISO-5667-6-09', 'increments', []);
    expect(manual(run('ISO-5667-6-09-D1', { registers: { increments: empty } }))).toMatch(/Keine vollständigen Zeilen/);
    expect(manual(run('ISO-5667-6-09-D2', { registers: { increments: empty } }))).toMatch(/increments/);
  });
});
