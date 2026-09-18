/**
 * Plan 3 Task 20 — ISO-5667-10 derived-value equations: the emitter accepts
 * every entry, the committed migration equals a fresh emit, and each formula
 * computes through the real `evaluateFormula` over rows prepared by the register
 * contract (TS fallback tables, no migration applied). The standard prints no
 * worked example; the pins are the printed FORMS applied to chosen inputs
 * (Fórmula 1: A + 365·k/n; Fórmula 2: A + 52·k/n; Fórmula 3: Vn = Vfinal · (M3n /
 * M3total)) and the printed thresholds (25 / 5 / 0,5 / 0,3 / 50 / 25 / 20 / 5 l).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EQUATIONS } from '../equations/iso5667_10';
import { FIELD_CONFIGS } from '../field-configs/iso5667_10';
import { evaluateFormula, type EvalState } from '../formula';
import { prepareRegisterRows } from '../register-rows';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { makeTableLookup, makeTableRows } from '../regulation-tables-fallback';
import { parseNumeric, type Value } from '@/lib/expr';
import { emitEquationsSql, equationFilesFor } from '../../../../scripts/regulation-tables/emit-equations-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const STD = 'ISO-5667-10';
const table = makeTableLookup(STD);
const tableRows = makeTableRows(STD);
const eq = (n: string) => EQUATIONS.find((e) => e.equation_number === n)!;
const rhs = (n: string) => eq(n).formula.replace(/^[A-Za-z_][A-Za-z0-9_]*\s*=\s*/, '');
const cfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: FIELD_CONFIGS.find((f) => f.worksheet === ws && f.symbol === sym)!.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const scope = (ws: Record<string, Value>) => (s: string): Value | undefined => (s in ws ? ws[s] : undefined);
const prep = (ws: string, sym: string, rows: unknown[], symbols: Record<string, Value> = {}) => prepareRegisterRows({ rows }, cfg(ws, sym).columns, { table, tableRows, symbol: scope(symbols) });
type Input = { symbol: string; value: number | string | null; unit: string | null };
const run = (n: string, opts: { inputs?: Input[]; registers?: Record<string, ReturnType<typeof prep>> }): EvalState => {
  const e = eq(n);
  return evaluateFormula({ equationId: n, formula: e.formula, inputSymbols: e.input_symbols, outputSymbol: e.output_symbol, inputs: opts.inputs ?? [], registers: opts.registers, tableLookup: table });
};
const computed = (r: EvalState): number => { expect(r.kind, JSON.stringify(r)).toBe('computed'); return r.kind === 'computed' ? r.value : NaN; };
const manual = (r: EvalState): string => { expect(r.kind, JSON.stringify(r)).toBe('manual_required'); return r.kind === 'manual_required' ? r.reason : ''; };
const num = (s: string, v: number | string | null, unit: string | null = null): Input => ({ symbol: s, value: v, unit });

describe('ISO-5667-10 Plan-3 equations', () => {
  it('18 entries, every output has a created derived field on its worksheet, every input is a symbol or register of that worksheet; no prod output re-produced; emitter accepts them', () => {
    expect(EQUATIONS.map((e) => e.equation_number)).toEqual([
      'ISO-5667-10-01-D1', 'ISO-5667-10-01-D2', 'ISO-5667-10-02-D1', 'ISO-5667-10-02-D2',
      'ISO-5667-10-03-D1', 'ISO-5667-10-03-D2', 'ISO-5667-10-03-D3', 'ISO-5667-10-03-D4', 'ISO-5667-10-03-D5',
      'ISO-5667-10-05-D1', 'ISO-5667-10-05-D2',
      'ISO-5667-10-06-D1', 'ISO-5667-10-06-D2', 'ISO-5667-10-06-D3', 'ISO-5667-10-06-D4',
      'ISO-5667-10-07-D1', 'ISO-5667-10-07-D2', 'ISO-5667-10-08-D1',
    ]);
    const created = new Set(FIELD_CONFIGS.filter((f) => f.create).map((f) => `${f.worksheet} ${f.symbol}`));
    for (const e of EQUATIONS) {
      expect(created.has(`${e.worksheet} ${e.output_symbol}`), `${e.output_symbol} field`).toBe(true);
      expect(e.description.startsWith('Plan 3:')).toBe(true);
      expect(e.verification_quote?.length ?? 0).toBeGreaterThan(0);
      expect(e.verification_quote).not.toContain('undefined');
      expect(parseNumeric(rhs(e.equation_number)).ok, e.equation_number).toBe(true);
      expect(['sampling_day_k', 'sampling_week_k', 'V_n', 'k', 'A']).not.toContain(e.output_symbol); // equations 1 / 2 / 3 keep their verified rows
    }
    const { warnings } = emitEquationsSql('iso5667_10', EQUATIONS);
    expect(warnings).toEqual([]);
  });

  it('the committed migration + rollback equal a fresh emit (freshness pin)', () => {
    const norm = (s: string) => s.replace(/\r\n/g, '\n');
    const { up, down } = emitEquationsSql('iso5667_10', EQUATIONS);
    const files = equationFilesFor('iso5667_10', '20260917102020');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/ON CONFLICT \(worksheet_template_id, equation_number\) DO NOTHING/g) ?? []).length).toBe(18);
  });

  it('-03: Fórmula (1) rows for n = 30, A = −5 → 7,17 / 19,33 / 31,5 days; Fórmula (2) for n = 12, A = −2 → 2,33 weeks; n = 25 exactly falls to Fórmula (2) (J-1); period 365 / 52; A bound −365/30 = −12,17; A in range 1 / 0 / 0; counts 3 / 1, empty 0, A missing ⇒ manual', () => {
    const rows = [{ id: '1', k: 1 }, { id: '2', k: 2, done: true }, { id: '3', k: 3, done: false }];
    const reg30 = prep('ISO-5667-10-03', 'probenahmetermine', rows, { A: -5, number_of_samples: 30 });
    expect(reg30.rows.map((r) => r.complete)).toEqual([true, true, true]);
    expect(reg30.rows.map((r) => r.values.day_or_week as number)).toEqual([-5 + 365 / 30, -5 + 365 * 2 / 30, -5 + 365 * 3 / 30]);
    expect(reg30.rows[0].values.day_or_week).toBeCloseTo(7.1667, 3);
    expect(reg30.rows[2].values.day_or_week).toBeCloseTo(31.5, 6);
    const reg12 = prep('ISO-5667-10-03', 'probenahmetermine', [{ id: '1', k: 1 }, { id: '2', k: 12 }], { A: -2, number_of_samples: 12 });
    expect(reg12.rows[0].values.day_or_week).toBeCloseTo(-2 + 52 / 12, 6); // 2,333 (week)
    expect(reg12.rows[1].values.day_or_week).toBeCloseTo(50, 6);          // A + 52·n/n = A + 52
    const reg25 = prep('ISO-5667-10-03', 'probenahmetermine', [{ id: '1', k: 1 }], { A: 0, number_of_samples: 25 });
    expect(reg25.rows[0].values.day_or_week).toBeCloseTo(52 / 25, 6);       // "unas 25": n = 25 → Fórmula (2)
    const regNoA = prep('ISO-5667-10-03', 'probenahmetermine', [{ id: '1', k: 1 }], { number_of_samples: 30 });
    expect(regNoA.rows[0].complete).toBe(true);                             // a null derived cell never blocks completeness
    expect(regNoA.rows[0].values.day_or_week).toBeNull();
    expect(computed(run('ISO-5667-10-03-D1', { inputs: [num('number_of_samples', 30)] }))).toBe(365);
    expect(computed(run('ISO-5667-10-03-D1', { inputs: [num('number_of_samples', 12)] }))).toBe(52);
    expect(computed(run('ISO-5667-10-03-D1', { inputs: [num('number_of_samples', 25)] }))).toBe(52);
    expect(computed(run('ISO-5667-10-03-D1', { inputs: [num('number_of_samples', 26)] }))).toBe(365);
    expect(computed(run('ISO-5667-10-03-D2', { inputs: [num('number_of_samples', 30)] }))).toBeCloseTo(-365 / 30, 10);
    expect(computed(run('ISO-5667-10-03-D2', { inputs: [num('number_of_samples', 12)] }))).toBeCloseTo(-52 / 12, 10);
    expect(computed(run('ISO-5667-10-03-D3', { inputs: [num('A', -5), num('number_of_samples', 30)] }))).toBe(1);
    expect(computed(run('ISO-5667-10-03-D3', { inputs: [num('A', -13), num('number_of_samples', 30)] }))).toBe(0);  // below −12,17
    expect(computed(run('ISO-5667-10-03-D3', { inputs: [num('A', 1), num('number_of_samples', 30)] }))).toBe(0);    // above 0
    expect(computed(run('ISO-5667-10-03-D3', { inputs: [num('A', 0), num('number_of_samples', 30)] }))).toBe(1);    // the bound 0 is inclusive as printed ("entre – 365/n y 0")
    expect(manual(run('ISO-5667-10-03-D3', { inputs: [num('A', null), num('number_of_samples', 30)] }))).toMatch(/A/);
    expect(computed(run('ISO-5667-10-03-D4', { registers: { probenahmetermine: reg30 } }))).toBe(3);
    expect(computed(run('ISO-5667-10-03-D5', { registers: { probenahmetermine: reg30 } }))).toBe(1);
    const empty = prep('ISO-5667-10-03', 'probenahmetermine', [], {});
    expect(computed(run('ISO-5667-10-03-D4', { registers: { probenahmetermine: empty } }))).toBe(0);
  });

  it('-06: Fórmula (3) rows Vfinal = 2000 ml, M3total = 1000 m³, M3n = 100 / 300 / 600 → Vn = 200 / 600 / 1200 ml; Σ Vn = 2000 = Vfinal, Σ M3n = 1000; count 3; empty register ⇒ manual; missing V_final ⇒ manual (never a phantom Σ)', () => {
    const rows = [{ id: '1', n: 1, m3_n: 100 }, { id: '2', n: 2, m3_n: 300 }, { id: '3', n: 3, m3_n: 600 }];
    const reg = prep('ISO-5667-10-06', 'flaschen_ctcv', rows, { V_final: 2000, M3_total: 1000 });
    expect(reg.rows.map((r) => r.values.v_n)).toEqual([200, 600, 1200]);
    expect(computed(run('ISO-5667-10-06-D1', { registers: { flaschen_ctcv: reg } }))).toBe(2000);
    expect(computed(run('ISO-5667-10-06-D2', { registers: { flaschen_ctcv: reg } }))).toBe(1000);
    expect(computed(run('ISO-5667-10-06-D3', { registers: { flaschen_ctcv: reg } }))).toBe(3);
    expect(manual(run('ISO-5667-10-06-D1', { registers: { flaschen_ctcv: prep('ISO-5667-10-06', 'flaschen_ctcv', [], {}) } }))).toMatch(/Keine vollständigen Zeilen/);
    expect(manual(run('ISO-5667-10-06-D1', { registers: { flaschen_ctcv: prep('ISO-5667-10-06', 'flaschen_ctcv', rows.slice(0, 1), { M3_total: 1000 }) } }))).toMatch(/v_n/);
    expect(computed(run('ISO-5667-10-06-D3', { registers: { flaschen_ctcv: prep('ISO-5667-10-06', 'flaschen_ctcv', [], {}) } }))).toBe(0);
  });

  it('-06-D4: suction velocity minimum 0,5 m/s for 9 / 11,9 mm (and below 9 — the bore rule itself stays CR-017), 0,3 m/s from 12 mm (NOTA 1)', () => {
    const sv = (d: number) => computed(run('ISO-5667-10-06-D4', { inputs: [num('tube_internal_diameter', d, 'mm')] }));
    expect(sv(9)).toBe(0.5);
    expect(sv(11.9)).toBe(0.5);
    expect(sv(12)).toBe(0.3);
    expect(sv(16)).toBe(0.3);
    expect(sv(8)).toBe(0.5);
    expect(manual(run('ISO-5667-10-06-D4', { inputs: [num('tube_internal_diameter', null, 'mm')] }))).toMatch(/tube_internal_diameter/);
  });

  it('-01: five grabs → count 5 / ok 1; four complete rows (the fifth without a time) → 4 / 0; empty → 0 / 0', () => {
    const five = [{ id: '1', nr: 1, time: '08:00' }, { id: '2', nr: 2, time: '08:05', volume_ml: 200 }, { id: '3', nr: 3, time: '08:10' }, { id: '4', nr: 4, time: '08:20' }, { id: '5', nr: 5, time: '08:30' }];
    const reg5 = prep('ISO-5667-10-01', 'stichproben_qualifiziert', five);
    expect(computed(run('ISO-5667-10-01-D1', { registers: { stichproben_qualifiziert: reg5 } }))).toBe(5);
    expect(computed(run('ISO-5667-10-01-D2', { registers: { stichproben_qualifiziert: reg5 } }))).toBe(1);
    const reg4 = prep('ISO-5667-10-01', 'stichproben_qualifiziert', [...five.slice(0, 4), { id: '5', nr: 5, time: '' }]);
    expect(reg4.rows.map((r) => r.complete)).toEqual([true, true, true, true, false]);
    expect(computed(run('ISO-5667-10-01-D1', { registers: { stichproben_qualifiziert: reg4 } }))).toBe(4);
    expect(computed(run('ISO-5667-10-01-D2', { registers: { stichproben_qualifiziert: reg4 } }))).toBe(0);
    const empty = prep('ISO-5667-10-01', 'stichproben_qualifiziert', []);
    expect(computed(run('ISO-5667-10-01-D1', { registers: { stichproben_qualifiziert: empty } }))).toBe(0);
    expect(computed(run('ISO-5667-10-01-D2', { registers: { stichproben_qualifiziert: empty } }))).toBe(0);
  });

  it('-02: site badges — sewer 4 × D and depth 0,4 → ok; sewer 2 × D → fail; cooling 20 s → fail; wwtp / industrial never counted; a sewer row without the figures fails (never a phantom pass); count 4, fails 2', () => {
    const rows = [
      { id: 'p1', kennung: 'K1', specific_site_type: 'sewer_channel_manhole', restriction_downstream_diameters: 4, sampling_depth_fraction: 0.4, well_mixed: true },
      { id: 'p2', kennung: 'K2', specific_site_type: 'sewer_channel_manhole', restriction_downstream_diameters: 2, sampling_depth_fraction: 0.5 },
      { id: 'p3', kennung: 'K3', specific_site_type: 'cooling_system', cooling_type: 'closed', cooling_runoff_s: 20 },
      { id: 'p4', kennung: 'K4', specific_site_type: 'wwtp', wwtp_objective: 'whole_plant_performance', bypass_assessed: true },
    ];
    const reg = prep('ISO-5667-10-02', 'probenahmestellen', rows);
    expect(reg.rows.map((r) => r.complete)).toEqual([true, true, true, true]);
    expect(reg.rows.map((r) => [r.values.restriction_ok, r.values.depth_ok, r.values.runoff_ok])).toEqual([[1, 1, 1], [0, 1, 1], [1, 1, 0], [1, 1, 1]]);
    expect(computed(run('ISO-5667-10-02-D1', { registers: { probenahmestellen: reg } }))).toBe(4);
    expect(computed(run('ISO-5667-10-02-D2', { registers: { probenahmestellen: reg } }))).toBe(2);
    const blank = prep('ISO-5667-10-02', 'probenahmestellen', [{ id: 'p1', kennung: 'K1', specific_site_type: 'sewer_channel_manhole' }, { id: 'p2', kennung: 'K2', specific_site_type: 'industrial_site' }]);
    expect(blank.rows.map((r) => [r.values.restriction_ok, r.values.depth_ok, r.values.runoff_ok])).toEqual([[0, 0, 1], [1, 1, 1]]);
    expect(computed(run('ISO-5667-10-02-D2', { registers: { probenahmestellen: blank } }))).toBe(1);
    // the printed depth range 1/3 … 1/2 (SR-2): 0,33 is below one third, 1/3 and 0,5 are inside
    const depths = prep('ISO-5667-10-02', 'probenahmestellen', [0.33, 1 / 3, 0.5, 0.51].map((d, i) => ({ id: `d${i}`, kennung: `D${i}`, specific_site_type: 'sewer_channel_manhole', restriction_downstream_diameters: 3, sampling_depth_fraction: d })));
    expect(depths.rows.map((r) => r.values.depth_ok)).toEqual([0, 1, 1, 0]);
    expect(depths.rows.map((r) => r.values.restriction_ok)).toEqual([1, 1, 1, 1]); // 3 × D is inclusive ("al menos tres veces")
  });

  it('-05: CTCV threshold 20 %; flow CV 15 → applicable 1, 25 → 0, 20 → 1 (inclusive "20 % por término medio")', () => {
    expect(computed(run('ISO-5667-10-05-D1', {}))).toBe(20);
    expect(computed(run('ISO-5667-10-05-D2', { inputs: [num('flow_cv_pct', 15, '%')] }))).toBe(1);
    expect(computed(run('ISO-5667-10-05-D2', { inputs: [num('flow_cv_pct', 25, '%')] }))).toBe(0);
    expect(computed(run('ISO-5667-10-05-D2', { inputs: [num('flow_cv_pct', 20, '%')] }))).toBe(1);
  });

  it('-07: vacuum 60 ml ok, vacuum 40 ml fail, peristaltic 30 ml not checkable (no printed minimum, E-1 → 1), inline piston without a volume fails; count 4, fails 2; an unset boolean reads false', () => {
    const rows = [
      { id: '1', label: 'S1', pump_technology: 'vacuum', unit_volume_ml: 60, refrigerated: true },
      { id: '2', label: 'S2', pump_technology: 'vacuum', unit_volume_ml: 40 },
      { id: '3', label: 'S3', pump_technology: 'peristaltic', unit_volume_ml: 30 },
      { id: '4', label: 'S4', pump_technology: 'inline_piston' },
    ];
    const reg = prep('ISO-5667-10-07', 'probenahmegeraete', rows);
    expect(reg.rows.map((r) => [r.values.unit_volume_min, r.values.unit_volume_ok])).toEqual([[50, 1], [50, 0], [null, 1], [25, 0]]);
    expect(reg.diagnostics).toBeUndefined(); // a lookup miss is a null cell, no diagnostic
    expect(computed(run('ISO-5667-10-07-D1', { registers: { probenahmegeraete: reg } }))).toBe(4);
    expect(computed(run('ISO-5667-10-07-D2', { registers: { probenahmegeraete: reg } }))).toBe(2);
    const raw = evaluateFormula({ equationId: 'x', formula: 'x = count_rows(probenahmegeraete, refrigerated == true)', inputSymbols: ['probenahmegeraete'], outputSymbol: 'x', inputs: [], registers: { probenahmegeraete: reg }, tableLookup: table });
    expect(computed(raw)).toBe(1);
  });

  it('-08: collected volume 6 l → mechanical required 1; 5 l → 0 ("> 5 l" strict, "≤5 l" laboratory); missing ⇒ manual', () => {
    expect(computed(run('ISO-5667-10-08-D1', { inputs: [num('collected_volume', 6, 'l')] }))).toBe(1);
    expect(computed(run('ISO-5667-10-08-D1', { inputs: [num('collected_volume', 5, 'l')] }))).toBe(0);
    expect(computed(run('ISO-5667-10-08-D1', { inputs: [num('collected_volume', 5.01, 'l')] }))).toBe(1);
    expect(manual(run('ISO-5667-10-08-D1', { inputs: [num('collected_volume', null, 'l')] }))).toMatch(/collected_volume/);
  });
});
