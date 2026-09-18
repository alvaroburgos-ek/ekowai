/**
 * Plan 3 Task 10 — DIN-18130-1 derived-value equations: the emitter accepts
 * every entry, the committed migration equals a fresh emit, and each formula
 * computes the standard's OWN printed examples through the real
 * `evaluateFormula` over rows prepared by the register contract (TS fallback
 * tables, no migration applied): Tab. 9 (§9.2), Tab. 10 (§9.3), Tab. 11 (§9.4),
 * the §9.1 Grenzfälle and the Tab. 2 / Gl. 6 α values.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EQUATIONS } from '../equations/din18130_1';
import { FIELD_CONFIGS } from '../field-configs/din18130_1';
import { evaluateFormula, type EvalState } from '../formula';
import { prepareRegisterRows } from '../register-rows';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { makeTableLookup, makeTableRows } from '../regulation-tables-fallback';
import { parseNumeric, type Value } from '@/lib/expr';
import { emitEquationsSql, equationFilesFor } from '../../../../scripts/regulation-tables/emit-equations-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const STD = 'DIN-18130-1';
const table = makeTableLookup(STD);
const tableRows = makeTableRows(STD);
const eq = (n: string) => EQUATIONS.find((e) => e.equation_number === n)!;
const rhs = (n: string) => eq(n).formula.replace(/^[A-Za-z_][A-Za-z0-9_]*\s*=\s*/, '');
const cfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: FIELD_CONFIGS.find((f) => f.worksheet === ws && f.symbol === sym)!.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
/** Worksheet scope the row exprs read (G-13): gefaelle_typ inherited from -02, geometry of -03. */
const scope = (ws: Record<string, Value>) => (s: string): Value | undefined => (s in ws ? ws[s] : undefined);
const prep = (ws: string, sym: string, rows: unknown[], symbols: Record<string, Value> = {}) => prepareRegisterRows({ rows }, cfg(ws, sym).columns, { table, tableRows, symbol: scope(symbols) });
type Input = { symbol: string; value: number | string | null; unit: string | null };
const run = (n: string, opts: { inputs?: Input[]; registers?: Record<string, ReturnType<typeof prep>> }): EvalState => {
  const e = eq(n);
  return evaluateFormula({ equationId: n, formula: e.formula, inputSymbols: e.input_symbols, outputSymbol: e.output_symbol, inputs: opts.inputs ?? [], registers: opts.registers, tableLookup: table });
};
const computed = (r: EvalState): number => { expect(r.kind, JSON.stringify(r)).toBe('computed'); return r.kind === 'computed' ? r.value : NaN; };
const num = (s: string, v: number | string | null, unit: string | null = null): Input => ({ symbol: s, value: v, unit });

// §9.4 Tab. 11 (L1314–L1357): l = l_0 = 0,05 m (L1245), A = 7,238·10⁻³ m² (L1246), p_o = 20 kN/m², p_u = 0, γ_w = 10 kN/m³ (Druckhöhe 2,0 m, L1320)
const TAB11_WS: Record<string, Value> = { gefaelle_typ: 'konstant', gamma_w: 10, l: 0.05, l_0: 0.05, A: 7.238e-3, a: null };
const TAB11_ROWS = [
  { id: '1', nr: 1, t_s: 76800, h_o: 0.51, h_u: 0.189, p_o: 20, p_u: 0, v_w: 1.25e-5, t_c: 20.5 },
  { id: '2', nr: 2, t_s: 86400, h_o: 0.504, h_u: 0.192, p_o: 20, p_u: 0, v_w: 1.31e-5, t_c: 20.5 },
  { id: '3', nr: 3, t_s: 259200, h_o: 0.277, h_u: 0.257, p_o: 20, p_u: 0, v_w: 3.35e-5, t_c: 20.5 },
];

describe('DIN-18130-1 Plan-3 equations', () => {
  it('eight entries, every output has a created field, every input is a symbol or register; single-source; emitter accepts them', () => {
    expect(EQUATIONS.map((e) => e.equation_number)).toEqual([
      'DIN-18130-1-03-D1', 'DIN-18130-1-03-D2', 'DIN-18130-1-03-D3', 'DIN-18130-1-03-D4', 'DIN-18130-1-03-D5',
      'DIN-18130-1-04-D1', 'DIN-18130-1-04-D2', 'DIN-18130-1-04-D3',
    ]);
    const created = new Set(FIELD_CONFIGS.filter((f) => f.create).map((f) => `${f.worksheet} ${f.symbol}`));
    for (const e of EQUATIONS) {
      expect(created.has(`${e.worksheet} ${e.output_symbol}`), `${e.output_symbol} field`).toBe(true);
      expect(e.description.startsWith('Plan 3:')).toBe(true);
      expect(e.verification_quote?.length ?? 0).toBeGreaterThan(0);
      expect(parseNumeric(rhs(e.equation_number)).ok, e.equation_number).toBe(true);
    }
    // no Plan-3 row re-produces a prod output (Gl. 1–4 / 6–9 keep Q, v, i, k, k_10, h)
    for (const e of EQUATIONS) expect(['Q', 'v', 'i', 'k', 'k_10', 'h', 'k_T', 'alpha']).not.toContain(e.output_symbol);
    expect(() => emitEquationsSql('din18130_1', EQUATIONS)).not.toThrow();
  });

  it('the committed migration + rollback equal a fresh emit (freshness pin)', () => {
    const norm = (s: string) => s.replace(/\r\n/g, '\n');
    const { up, down } = emitEquationsSql('din18130_1', EQUATIONS);
    const files = equationFilesFor('din18130_1', '20260917101020');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/ON CONFLICT \(worksheet_template_id, equation_number\) DO NOTHING/g) ?? []).length).toBe(8);
  });

  it('DIN-18130-1-03-D2 alpha_calc (Gl. 6, L305) reproduces Tab. 2 (L322) and the examples: 0,7485 for T = 21,25 (L1120), 0,762 for T = 20,5 (L1341), 0,771 for T = 20,0 (§9.2)', () => {
    const alpha = (T: number) => computed(run('DIN-18130-1-03-D2', { inputs: [num('T', T, 'degC')] }));
    expect(alpha(5)).toBeCloseTo(1.158, 3);
    expect(alpha(10)).toBeCloseTo(1.0, 6);
    expect(alpha(15)).toBeCloseTo(0.874, 3);
    expect(alpha(20)).toBeCloseTo(0.771, 3);
    expect(alpha(25)).toBeCloseTo(0.686, 3);
    expect(alpha(21.25)).toBeCloseTo(0.7485, 3); // §9.3: "α für T = 0,5 × (20,5 + 22,0)" → 0,7485
    expect(alpha(20.5)).toBeCloseTo(0.762, 3);   // §9.4: "α für T = 0,5 × (19,0 + 22,0)" → 0,762
    // §9.1 prints α = 0,754 for T = 21 °C (L953) = the LINEAR interpolation of Tab. 2 (0,771 − 0,017); the closed form gives 0,753 (din18130_1-J-3)
    expect(alpha(21)).toBeCloseTo(0.753, 3);
    expect(0.771 - (0.771 - 0.686) / 5).toBeCloseTo(0.754, 3);
    expect(run('DIN-18130-1-03-D2', { inputs: [num('T', null, 'degC')] }).kind).toBe('manual_required');
  });

  it('ablesungen rows (Tab. 11, §9.4): h = h_o − h_u + (p_o − p_u)/γ_w = 2,321 / 2,312 / 2,020 m; i = 46,4 / 46,2 / 40,4; k_T = 4,8 / 4,5 / 4,4 ·10⁻¹⁰; k_10 per row 3,66 / 3,43 / 3,35 ·10⁻¹⁰', () => {
    const reg = prep('DIN-18130-1-03', 'ablesungen', TAB11_ROWS, TAB11_WS);
    expect(reg.rows.map((r) => r.complete)).toEqual([true, true, true]);
    expect(reg.diagnostics).toBeUndefined();
    expect(reg.rows.map((r) => r.values.h_row)).toEqual([expect.closeTo(2.321, 3), expect.closeTo(2.312, 3), expect.closeTo(2.02, 3)]);
    expect(reg.rows.map((r) => r.values.i_row)).toEqual([expect.closeTo(46.4, 1), expect.closeTo(46.2, 1), expect.closeTo(40.4, 1)]);
    const kT = reg.rows.map((r) => (r.values.k_row as number) * 1e10);
    expect(kT[0]).toBeCloseTo(4.8, 1);
    expect(kT[1]).toBeCloseTo(4.5, 1);
    expect(kT[2]).toBeCloseTo(4.4, 1);
    expect(reg.rows.map((r) => r.values.alpha_row)).toEqual([expect.closeTo(0.762, 3), expect.closeTo(0.762, 3), expect.closeTo(0.762, 3)]);
    const k10 = reg.rows.map((r) => (r.values.k10_row as number) * 1e10);
    expect(k10[0]).toBeCloseTo(3.66, 1);
    expect(k10[1]).toBeCloseTo(3.43, 1);
    expect(k10[2]).toBeCloseTo(3.35, 1);
    // the veränderlich columns are hidden under konstant: not required for completeness (no h_1/h_2 typed)
    expect(reg.rows[0].values.h_1).toBeNull();
  });

  it('DIN-18130-1-03-D1 / -D3: k_T_mean = mean of the three Tab. 11 readings (4,57·10⁻¹⁰); k_10_calc = k_T_mean · α(20,5) = 3,48·10⁻¹⁰ (L1357); empty register ⇒ manual_required', () => {
    const reg = prep('DIN-18130-1-03', 'ablesungen', TAB11_ROWS, TAB11_WS);
    const kTmean = computed(run('DIN-18130-1-03-D1', { registers: { ablesungen: reg } }));
    expect(kTmean * 1e10).toBeCloseTo((4.8 + 4.5 + 4.4) / 3, 1);
    const alpha = computed(run('DIN-18130-1-03-D2', { inputs: [num('T', 20.5, 'degC')] }));
    const k10 = computed(run('DIN-18130-1-03-D3', { inputs: [num('k_T_mean', kTmean, 'm/s'), num('alpha_calc', alpha)] }));
    expect(k10 * 1e10).toBeCloseTo(3.48, 1); // Tab. 11: "Durchlässigkeitsbeiwert k_10 = 3,48 × 10⁻¹⁰ m/s"
    expect(run('DIN-18130-1-03-D1', { registers: { ablesungen: prep('DIN-18130-1-03', 'ablesungen', [], TAB11_WS) } }).kind).toBe('manual_required');
    // an incomplete row (no T) does not enter the mean
    const partial = prep('DIN-18130-1-03', 'ablesungen', [...TAB11_ROWS, { id: '4', nr: 4, t_s: 1000, h_o: 0.3, h_u: 0.2, p_o: 20, p_u: 0, v_w: 1e-5 }], TAB11_WS);
    expect(partial.rows[3].complete).toBe(false);
    expect(computed(run('DIN-18130-1-03-D1', { registers: { ablesungen: partial } }))).toBeCloseTo(kTmean, 15);
  });

  it('ablesungen rows (Tab. 9, §9.2, konstant): V_w = 520·10⁻⁶ m³, l = 0,20 m, A = 1,54·10⁻² m², h = 0,082 m, t = 300 s → k = 2,745·10⁻⁴ (L1088); k_10 = 2,12·10⁻⁴ at T = 20 °C (L1089)', () => {
    // Tab. 8 (L1074–L1078): h_o = 0,268, h_u = 0,186 (Höhenunterschied 0,082), no pressure (p = 0)
    const reg = prep('DIN-18130-1-03', 'ablesungen', [
      { id: '1', nr: 1, t_s: 300, h_o: 0.268, h_u: 0.186, p_o: 0, p_u: 0, v_w: 520e-6, t_c: 20 },
      { id: '2', nr: 2, t_s: 300, h_o: 0.268, h_u: 0.186, p_o: 0, p_u: 0, v_w: 510e-6, t_c: 20 },
    ], { gefaelle_typ: 'konstant', gamma_w: 10, l: 0.2, l_0: 0.272, A: 1.54e-2, a: null });
    expect(reg.rows.map((r) => (r.values.k_row as number) * 1e4)).toEqual([expect.closeTo(2.745, 3), expect.closeTo(2.693, 2)]); // Versuch 2: 2,6924 computed vs 2,693 printed (rounding inside the printed inputs)
    expect(reg.rows.map((r) => (r.values.k10_row as number) * 1e4)).toEqual([expect.closeTo(2.12, 2), expect.closeTo(2.08, 2)]);
    expect(reg.rows[0].values.i_row).toBeCloseTo(0.082 / 0.2, 9);
  });

  it('ablesungen rows (Tab. 7, §9.1, veränderlich): Gl. 9 with a = 2,43·10⁻⁵ m², l_0 = 0,01985 m, A = 7,85·10⁻³ m², h_1 = 0,655 m; ln(h_1/h_2) = 0,2640 at t = 390 s (L999); D4/D5 give the printed Grenzfälle max. i = 33, min. i = 25 (L918)', () => {
    const ws: Record<string, Value> = { gefaelle_typ: 'veraenderlich', gamma_w: 10, l: 0.01985, l_0: 0.01985, A: 7.85e-3, a: 2.43e-5 };
    const reg = prep('DIN-18130-1-03', 'ablesungen', [
      { id: '1', nr: 1, t_s: 15, h_1: 0.655, h_2: 0.648, t_c: 21 },   // ln = 0,0107 (L974)
      { id: '2', nr: 2, t_s: 390, h_1: 0.655, h_2: 0.503, t_c: 21 },  // ln = 0,2640 (L999)
    ], ws);
    expect(reg.rows.map((r) => r.complete)).toEqual([true, true]);
    expect(Math.log(0.655 / 0.503)).toBeCloseTo(0.264, 3);
    // k = a·l_0/(A·t)·ln(h_1/h_2)
    expect(reg.rows[1].values.k_row).toBeCloseTo((2.43e-5 * 0.01985) / (7.85e-3 * 390) * Math.log(0.655 / 0.503), 12);
    expect(reg.rows[0].values.h_row).toBeNull(); // konstant-only cell (h_o/h_u hidden and untyped) — never a number
    const iMax = computed(run('DIN-18130-1-03-D4', { inputs: [num('gefaelle_typ', 'veraenderlich'), num('l', 0.01985, 'm'), num('l_0', 0.01985, 'm')], registers: { ablesungen: reg } }));
    const iMin = computed(run('DIN-18130-1-03-D5', { inputs: [num('gefaelle_typ', 'veraenderlich'), num('l', 0.01985, 'm'), num('l_0', 0.01985, 'm')], registers: { ablesungen: reg } }));
    expect(iMax).toBeCloseTo(33, 0);   // 0,655 / 0,01985 = 33,0
    expect(iMin).toBeCloseTo(25.3, 1); // 0,503 / 0,01985 = 25,3 → printed "min. i = 25"
    // konstant: both are h/l over the readings (Tab. 11: 46,4 … 40,4)
    const k = prep('DIN-18130-1-03', 'ablesungen', TAB11_ROWS, TAB11_WS);
    const kIn = [num('gefaelle_typ', 'konstant'), num('l', 0.05, 'm'), num('l_0', 0.05, 'm')];
    expect(computed(run('DIN-18130-1-03-D4', { inputs: kIn, registers: { ablesungen: k } }))).toBeCloseTo(46.4, 1);
    expect(computed(run('DIN-18130-1-03-D5', { inputs: kIn, registers: { ablesungen: k } }))).toBeCloseTo(40.4, 1);
  });

  it('DIN-18130-1-04-D1 / -D2 (Tab. 10, §9.3): mean of 3,84 / 3,74 / 3,74 ·10⁻⁹ = 3,77·10⁻⁹ (L1133); count 3; n = e/(1+e) reproduces the printed pairs (Tab. 6, §9.2–§9.4)', () => {
    const reg = prep('DIN-18130-1-04', 'versuche', [
      { id: '1', nr: 1, e: 0.467, rho_d: 1.82, s_ra: 0.88, s_re: 1.0, k_10_run: 3.84e-9 },
      { id: '2', nr: 2, e: 0.424, rho_d: 1.9, k_10_run: 3.74e-9 },
      { id: '3', nr: 3, e: 0.699, k_10_run: 3.74e-9 },
      { id: '4', nr: 4, e: 0.373 }, // incomplete (no k_10)
    ]);
    expect(reg.rows.map((r) => r.complete)).toEqual([true, true, true, false]);
    expect(reg.rows.map((r) => r.values.n_pore_row)).toEqual([expect.closeTo(0.318, 3), expect.closeTo(0.298, 3), expect.closeTo(0.411, 3), expect.closeTo(0.272, 3)]); // 31,8 % · 29,8 % · 0,411 · 27,2 %
    expect(computed(run('DIN-18130-1-04-D1', { registers: { versuche: reg } })) * 1e9).toBeCloseTo(3.77, 2);
    expect(computed(run('DIN-18130-1-04-D2', { registers: { versuche: reg } }))).toBe(3);
    expect(computed(run('DIN-18130-1-04-D2', { registers: { versuche: prep('DIN-18130-1-04', 'versuche', []) } }))).toBe(0);
    // row key `e` shadows the Euler fallback in row scope: a null cell is a missing input, never 2,718
    const noE = prep('DIN-18130-1-04', 'versuche', [{ id: '1', nr: 1, k_10_run: 1e-9 }]);
    expect(noE.rows[0].values.n_pore_row).toBeNull();
  });

  it('DIN-18130-1-04-D3 bereich_code bands k_10 exactly on the printed Tab. 1 bounds (L205–L209): 3,48·10⁻¹⁰ → 1; 3,77·10⁻⁹ → 1; 3,34·10⁻⁸ → 2; 2,1·10⁻⁴ → 4; 1e-6 → 2 (inclusive); 1e-8 → 2; > 1e-2 → 5', () => {
    const code = (k: number) => computed(run('DIN-18130-1-04-D3', { inputs: [num('k_10', k, 'm/s')] }));
    expect(code(3.48e-10)).toBe(1); // §9.4 → sehr schwach durchlässig
    expect(code(3.34e-8)).toBe(2);  // §9.1
    expect(code(3.77e-9)).toBe(1);  // §9.3: unter 10⁻⁸
    expect(code(2.1e-4)).toBe(4);   // §9.2: über 10⁻⁴ bis 10⁻²
    expect(code(1e-8)).toBe(2);
    expect(code(1e-6)).toBe(2);
    expect(code(1.0001e-6)).toBe(3);
    expect(code(1e-4)).toBe(3);
    expect(code(1e-2)).toBe(4);
    expect(code(0.02)).toBe(5);
    expect(run('DIN-18130-1-04-D3', { inputs: [num('k_10', null, 'm/s')] }).kind).toBe('manual_required');
  });
});
