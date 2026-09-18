/**
 * Plan 3 Task 14 — DWA-A-178 derived-value equations: the emitter accepts every
 * entry, the committed migration equals a fresh emit, and each formula computes
 * through the real `evaluateFormula` over rows prepared by the register contract
 * (TS fallback tables, no migration applied). The Arbeitsblatt prints no numeric
 * worked example (Anhang A is a flowchart), so every pin is hand-derived from
 * the printed Gl. (2) / (3) / (5) / (6) / (7) / (8) forms and the printed
 * constants (530, 15 %, 100 m²/ha, Tab. 1 η).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EQUATIONS } from '../equations/a178';
import { FIELD_CONFIGS } from '../field-configs/a178';
import { evaluateFormula, type EvalState } from '../formula';
import { prepareRegisterRows } from '../register-rows';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { makeTableLookup, makeTableRows } from '../regulation-tables-fallback';
import { parseNumeric, type Value } from '@/lib/expr';
import { emitEquationsSql, equationFilesFor } from '../../../../scripts/regulation-tables/emit-equations-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const STD = 'DWA-A-178';
const table = makeTableLookup(STD);
const tableRows = makeTableRows(STD);
const eq = (n: string) => EQUATIONS.find((e) => e.equation_number === n)!;
const rhs = (n: string) => eq(n).formula.replace(/^[A-Za-z_][A-Za-z0-9_]*\s*=\s*/, '');
const cfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: FIELD_CONFIGS.find((f) => f.worksheet === ws && f.symbol === sym)!.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const scope = (ws: Record<string, Value>) => (s: string): Value | undefined => (s in ws ? ws[s] : undefined);
const prep = (ws: string, sym: string, rows: unknown[], symbols: Record<string, Value> = {}) => prepareRegisterRows({ rows }, cfg(ws, sym).columns, { table, tableRows, symbol: scope(symbols) });
type Input = { symbol: string; value: number | string | null; unit: string | null };
const run = (n: string, opts: { inputs?: Input[]; registers?: Record<string, ReturnType<typeof prep>> } = {}): EvalState => {
  const e = eq(n);
  return evaluateFormula({ equationId: n, formula: e.formula, inputSymbols: e.input_symbols, outputSymbol: e.output_symbol, inputs: opts.inputs ?? [], registers: opts.registers, tableLookup: table });
};
const computed = (r: EvalState): number => { expect(r.kind, JSON.stringify(r)).toBe('computed'); return r.kind === 'computed' ? r.value : NaN; };
const num = (s: string, v: number | string | null, unit: string | null = null): Input => ({ symbol: s, value: v, unit });

const TEIL = [
  { id: '1', label: 'Wohngebiet', a_e_b_a_i: 2, b_r_a_i: 530 },
  { id: '2', label: 'Gewerbe', a_e_b_a_i: 1, b_r_a_i: 600, e_0_i: 50 },
];
const PFADE = [
  { id: '1', pfad: 'dr_rbf', vq_m3: 50000 },
  { id: '2', pfad: 'fue', vq_m3: 10000 },
  { id: '3', pfad: 'dr_rrl', vq_m3: 5000 },
];
const ANLAGE: Record<string, Value> = { C_RBFA_zu: 125, eta_VS: 0.2, becken_typ: 'durchlauf', rrl_vorhanden: true, A_F: 1000 };

describe('DWA-A-178 Plan-3 equations', () => {
  it('17 entries, every output has a created field on its worksheet, every RHS parses, single-source; emitter accepts them', () => {
    expect(EQUATIONS.map((e) => e.equation_number)).toEqual([
      'A178-04-D1', 'A178-04-D2', 'A178-04-D3', 'A178-07-D1', 'A178-07-D2', 'A178-07-D3', 'A178-10-D1', 'A178-11-D1',
      'A178-13-D1', 'A178-13-D2', 'A178-13-D3', 'A178-13-D4', 'A178-18-D1', 'A178-18-D2', 'A178-18-D3', 'A178-18-D4', 'A178-18-D5',
    ]);
    const created = new Set(FIELD_CONFIGS.filter((f) => f.create).map((f) => `${f.worksheet} ${f.symbol}`));
    for (const e of EQUATIONS) {
      expect(created.has(`${e.worksheet} ${e.output_symbol}`), `${e.output_symbol} field`).toBe(true);
      expect(e.description.startsWith('Plan 3:')).toBe(true);
      expect(e.verification_quote?.length ?? 0).toBeGreaterThan(0);
      expect(parseNumeric(rhs(e.equation_number)).ok, e.equation_number).toBe(true);
    }
    // no Plan-3 row re-produces a prod output (Gl. 1–13 keep B_RBF_zu, A_F, Q_Dr_RBF, C_RBFA_zu, b_F, B_RBFA_ab, eta_RBF_hyd, eta_F, b_F_im_bereich, emission_eingehalten)
    for (const e of EQUATIONS) expect(['B_RBF_zu', 'A_F', 'Q_Dr_RBF', 'C_RBFA_zu', 'b_F', 'B_RBFA_ab', 'eta_RBF_hyd', 'eta_F', 'b_F_im_bereich', 'emission_eingehalten', 'C_RBF_zu', 'B_RBF_ab', 'V_RBF', 'A_E_b_a']).not.toContain(e.output_symbol);
    const { warnings } = emitEquationsSql('a178', EQUATIONS);
    expect(warnings).toEqual([]);
  });

  it('the committed migration + rollback equal a fresh emit (freshness pin)', () => {
    const norm = (s: string) => s.replace(/\r\n/g, '\n');
    const { up, down } = emitEquationsSql('a178', EQUATIONS);
    const files = equationFilesFor('a178', '20260917101420');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/ON CONFLICT \(worksheet_template_id, equation_number\) DO NOTHING/g) ?? []).length).toBe(17);
  });

  it('Teilflächen (Gl. 2, Trennsystem): 2 ha · 530 + 1 ha · 600 → A_E_b_a_calc = 3 ha, B_RBF_zu_calc = 1660 kg/a, count 2; the e_0 column is hidden and not required', () => {
    const reg = prep('A178-04', 'teilflaechen_178', TEIL, { system_type: 'trenn' });
    expect(reg.rows.map((r) => r.complete)).toEqual([true, true]);
    expect(reg.diagnostics).toBeUndefined();
    expect(reg.rows.map((r) => r.values.b_row)).toEqual([1060, 600]);
    expect(reg.rows.map((r) => r.values.b_r_a_rechenwert)).toEqual([530, 530]);
    expect(reg.rows.map((r) => r.values.abw_rechenwert)).toEqual([0, 1]);
    expect(computed(run('A178-04-D1', { registers: { teilflaechen_178: reg } }))).toBe(3);
    expect(computed(run('A178-04-D2', { registers: { teilflaechen_178: reg } }))).toBe(1660);
    expect(computed(run('A178-04-D3', { registers: { teilflaechen_178: reg } }))).toBe(2);
  });

  it('Teilflächen (Gl. 3, Mischsystem): e_0 in % per row — a row without e_0 is incomplete; 2 ha · 530 · 40 % + 1 ha · 600 · 50 % = 724 kg/a; missing system_type ⇒ Σ manual_required', () => {
    const partial = prep('A178-04', 'teilflaechen_178', TEIL, { system_type: 'misch' });
    expect(partial.rows.map((r) => r.complete)).toEqual([false, true]);
    expect(partial.rows[1].values.b_row).toBe(300);
    expect(computed(run('A178-04-D2', { registers: { teilflaechen_178: partial } }))).toBe(300); // only the complete row counts
    const full = prep('A178-04', 'teilflaechen_178', [{ ...TEIL[0], e_0_i: 40 }, TEIL[1]], { system_type: 'misch' });
    expect(full.rows.map((r) => r.values.b_row)).toEqual([424, 300]);
    expect(computed(run('A178-04-D2', { registers: { teilflaechen_178: full } }))).toBe(724);
    expect(computed(run('A178-04-D1', { registers: { teilflaechen_178: full } }))).toBe(3);
    const noType = prep('A178-04', 'teilflaechen_178', TEIL, {});
    expect(noType.rows.map((r) => r.values.b_row)).toEqual([null, null]);
    expect(run('A178-04-D2', { registers: { teilflaechen_178: noType } }).kind).toBe('manual_required');
    expect(run('A178-04-D1', { registers: { teilflaechen_178: prep('A178-04', 'teilflaechen_178', [], {}) } }).kind).toBe('manual_required');
    expect(computed(run('A178-04-D3', { registers: { teilflaechen_178: prep('A178-04', 'teilflaechen_178', [], {}) } }))).toBe(0);
  });

  it('A178-07 twins: b_krit_tab = 7 (L689), q_Dr_RBF_vorgabe = 0,05 (L767), v_spez_grobstoff_min = 0,5 (L677) — zero-input lookups', () => {
    expect(computed(run('A178-07-D1'))).toBe(7);
    expect(computed(run('A178-07-D2'))).toBe(0.05);
    expect(computed(run('A178-07-D3'))).toBe(0.5);
  });

  it('A178-10-D1 A_F_strasse = 100 m²/ha · A_E_b_a (L782): 3,5 ha → 350 m²; A178-11-D1 V_RBF_calc = V_RR + 15 % · V_FK (L775): 1000 + 0,15 · 400 = 1060 m³', () => {
    expect(computed(run('A178-10-D1', { inputs: [num('A_E_b_a', 3.5, 'ha')] }))).toBe(350);
    expect(run('A178-10-D1', { inputs: [num('A_E_b_a', null, 'ha')] }).kind).toBe('manual_required');
    expect(computed(run('A178-11-D1', { inputs: [num('V_RR', 1000, 'm³'), num('V_FK', 400, 'm³')] }))).toBe(1060);
    expect(run('A178-11-D1', { inputs: [num('V_RR', 1000, 'm³'), num('V_FK', null, 'm³')] }).kind).toBe('manual_required');
  });

  it('Frachtpfade: η per path from Tab. 1 (0,95 / 0,50 / 0,60); Gl. 7 form: (50000·0,95 + 10000·0,50 + 5000·0,60) · 125 · (1 − 0,2) / (1000 · 1000) = 5,55 kg/(m²·a); Gl. 6 (no RRL row) = 5,25; Gl. 5 (drain only) = 4,75', () => {
    const reg = prep('A178-13', 'frachtpfade', PFADE, ANLAGE);
    expect(reg.rows.map((r) => r.complete)).toEqual([true, true, true]);
    expect(reg.diagnostics).toBeUndefined();
    expect(reg.rows.map((r) => r.values.eta_tab1)).toEqual([0.95, 0.5, 0.6]);
    expect(reg.rows.map((r) => r.values.zulaessig)).toEqual([1, 1, 1]);
    const inputs = [num('C_RBFA_zu', 125, 'mg/l'), num('eta_VS', 0.2, '-'), num('A_F', 1000, 'm²')];
    expect(computed(run('A178-13-D1', { inputs, registers: { frachtpfade: reg } }))).toBeCloseTo(5.55, 10); // Gl. 7
    const gl6 = prep('A178-13', 'frachtpfade', PFADE.slice(0, 2), ANLAGE);
    expect(computed(run('A178-13-D1', { inputs, registers: { frachtpfade: gl6 } }))).toBeCloseTo(5.25, 10); // Gl. 6
    const gl5 = prep('A178-13', 'frachtpfade', PFADE.slice(0, 1), ANLAGE);
    expect(computed(run('A178-13-D1', { inputs, registers: { frachtpfade: gl5 } }))).toBeCloseTo(4.75, 10); // Gl. 5
    // identical to the prod Gl. 7 text evaluated with the scalars (single-source parity)
    expect(((50000 * 0.95 + 10000 * 0.5 + 5000 * 0.6) * 125 * (1 - 0.2)) / (1000 * 1000)).toBeCloseTo(5.55, 10);
    expect(run('A178-13-D1', { inputs: [num('C_RBFA_zu', 125, 'mg/l'), num('eta_VS', null, '-'), num('A_F', 1000, 'm²')], registers: { frachtpfade: reg } }).kind).toBe('manual_required');
    expect(run('A178-13-D1', { inputs, registers: { frachtpfade: prep('A178-13', 'frachtpfade', [], ANLAGE) } }).kind).toBe('manual_required');
  });

  it('A178-13-D2 C_RBF_zu_calc = C_RBFA_zu · (1 − η_VS): 125 · 0,8 = 100 mg/l, η_VS = 0 ⇒ C_RBFA_zu (L975); per-path loads b_ab = VQ · C_RBF,zu · (1 − η) / 1000 → 250 + 500 + 200 = 950 kg/a = B_RBF_ab_calc', () => {
    expect(computed(run('A178-13-D2', { inputs: [num('C_RBFA_zu', 125, 'mg/l'), num('eta_VS', 0.2, '-')] }))).toBe(100);
    expect(computed(run('A178-13-D2', { inputs: [num('C_RBFA_zu', 125, 'mg/l'), num('eta_VS', 0, '-')] }))).toBe(125);
    const reg = prep('A178-13', 'frachtpfade', PFADE, ANLAGE);
    expect(reg.rows.map((r) => r.values.b_ab as number)).toEqual([expect.closeTo(250, 9), expect.closeTo(500, 9), expect.closeTo(200, 9)]);
    expect(computed(run('A178-13-D3', { registers: { frachtpfade: reg } }))).toBeCloseTo(950, 9);
    // mass balance: retained + passed = inflow to the RBF: Σ VQ · C_RBF,zu / 1000 = 65000 · 100 / 1000 = 6500 kg/a; retained = b_F · A_F = 5,55 · 1000 = 5550; passed 950
    expect(5550 + 950).toBe(6500);
  });

  it('A178-13-D4 frachtpfade_unzulaessig: Fangfilterbecken without RRL flags the FÜ and RRL rows (2); Durchlauf + RRL flags none; a missing becken_typ makes the count undecidable', () => {
    expect(computed(run('A178-13-D4', { registers: { frachtpfade: prep('A178-13', 'frachtpfade', PFADE, ANLAGE) } }))).toBe(0);
    const fang = prep('A178-13', 'frachtpfade', PFADE, { ...ANLAGE, becken_typ: 'fang', rrl_vorhanden: false });
    expect(fang.rows.map((r) => r.values.zulaessig)).toEqual([1, 0, 0]);
    expect(computed(run('A178-13-D4', { registers: { frachtpfade: fang } }))).toBe(2);
    const noType = prep('A178-13', 'frachtpfade', PFADE, { C_RBFA_zu: 125, eta_VS: 0.2, A_F: 1000 });
    expect(run('A178-13-D4', { registers: { frachtpfade: noType } }).kind).toBe('manual_required');
    expect(computed(run('A178-13-D4', { registers: { frachtpfade: prep('A178-13', 'frachtpfade', [], ANLAGE) } }))).toBe(0);
  });

  it('Iterationen (§6.2.2.4): two steps → count 2, A_F_last / b_F_last from the last complete row, konvergiert 1; empty register → count 0, last manual_required; Betriebsbefunde count', () => {
    const it2 = prep('A178-18', 'iterationen', [{ id: '1', schritt: 1, a_f: 1000, b_f: 8.2 }, { id: '2', schritt: 2, a_f: 1200, h_rr: 0.8, b_f: 6.5, konvergiert: true }]);
    expect(it2.rows.map((r) => r.complete)).toEqual([true, true]);
    expect(computed(run('A178-18-D1', { registers: { iterationen: it2 } }))).toBe(2);
    expect(computed(run('A178-18-D2', { registers: { iterationen: it2 } }))).toBe(1200);
    expect(computed(run('A178-18-D3', { registers: { iterationen: it2 } }))).toBe(6.5);
    expect(computed(run('A178-18-D4', { registers: { iterationen: it2 } }))).toBe(1);
    const none = prep('A178-18', 'iterationen', []);
    expect(computed(run('A178-18-D1', { registers: { iterationen: none } }))).toBe(0);
    expect(run('A178-18-D2', { registers: { iterationen: none } }).kind).toBe('manual_required');
    const bef = prep('A178-18', 'betriebsbefunde', [{ id: '1', befund: 'ueppiger_wuchs', datum: '2026-09-18' }, { id: '2', befund: 'draenablauf_klar' }]);
    expect(bef.rows.map((r) => [r.complete, r.values.bereich, r.values.hinweis])).toEqual([[true, 'Schilf', 'hohe, gleichmäßige Filterbelastung'], [true, 'Ablaufbauwerk', 'funktionstüchtiger Filter mit guter Reinigungsleistung']]);
    expect(computed(run('A178-18-D5', { registers: { betriebsbefunde: bef } }))).toBe(2);
  });
});
