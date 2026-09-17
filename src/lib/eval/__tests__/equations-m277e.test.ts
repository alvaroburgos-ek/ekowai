/**
 * Plan 3 Task 4 — DWA-M-277E derived-value equations: the emitter accepts every
 * entry, the committed migration equals a fresh emit, and each formula computes
 * the printed rule through the real `evaluateFormula` over rows prepared by the
 * register contract (Tab. 2 / Tab. 5 / Tab. 4 cells looked up from the seeded
 * tables — the TS fallback, no migration applied). Enum cells and enum scalars
 * reach the formulas as strings (controller amendment D). The worked examples
 * of §9.2–§9.4 (L658, L692, L704–L706, L764–L774) are the pinned values.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EQUATIONS } from '../equations/m277e';
import { FIELD_CONFIGS } from '../field-configs/m277e';
import { evaluateFormula, type EvalState } from '../formula';
import { prepareRegisterRows } from '../register-rows';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { makeTableLookup, makeTableRows } from '../regulation-tables-fallback';
import { parseNumeric, type Value } from '@/lib/expr';
import { emitEquationsSql, equationFilesFor } from '../../../../scripts/regulation-tables/emit-equations-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const STD = 'DWA-M-277E';
const table = makeTableLookup(STD);
const tableRows = makeTableRows(STD);
const eq = (n: string) => EQUATIONS.find((e) => e.equation_number === n)!;
const rhs = (n: string) => eq(n).formula.replace(/^[A-Za-z_][A-Za-z0-9_]*\s*=\s*/, '');
const cfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: FIELD_CONFIGS.find((f) => f.worksheet === ws && f.symbol === sym)!.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const prep = (ws: string, sym: string, rows: unknown[], symbol?: (s: string) => Value | undefined) => {
  const c = cfg(ws, sym);
  return prepareRegisterRows({ rows }, c.columns, { table, tableRows, symbol }, { overrideFlagKey: c.override?.flag_key, overrideAppliesTo: c.override?.applies_to });
};
const run = (n: string, opts: { inputs?: Array<{ symbol: string; value: number | string | null; unit: string | null }>; registers?: Record<string, ReturnType<typeof prep>> }): EvalState => {
  const e = eq(n);
  return evaluateFormula({ equationId: n, formula: e.formula, inputSymbols: e.input_symbols, outputSymbol: e.output_symbol, inputs: opts.inputs ?? [], registers: opts.registers, tableLookup: table });
};
const computed = (r: EvalState): number => { expect(r.kind).toBe('computed'); return r.kind === 'computed' ? r.value : NaN; };

describe('DWA-M-277E Plan-3 equations', () => {
  it('fourteen entries; register outputs are created fields, the five annual rows output existing consumer-free manual fields; no prod producer is duplicated; emitter accepts them', () => {
    expect(EQUATIONS.map((e) => e.equation_number)).toEqual([
      'M277E-06-D1', 'M277E-06-D2', 'M277E-16-D1', 'M277E-16-D2', 'M277E-05-D1', 'M277E-19-D1', 'M277E-21-D1', 'M277E-24-D1', 'M277E-24-D2',
      'M277E-18-D1', 'M277E-18-D2', 'M277E-18-D3', 'M277E-18-D4', 'M277E-18-D5',
    ]);
    const created = new Set(FIELD_CONFIGS.filter((f) => f.create).map((f) => `${f.worksheet} ${f.symbol}`));
    const existingOutputs = ['M277E-18 V_GW_annual', 'M277E-18 V_SW_annual', 'M277E-18 V_treated_annual', 'M277E-18 V_surplus_annual', 'M277E-18 V_topup_annual'];
    for (const e of EQUATIONS) {
      const key = `${e.worksheet} ${e.output_symbol}`;
      expect(created.has(key) || existingOutputs.includes(key), key).toBe(true);
      expect(e.description.startsWith('Plan 3:')).toBe(true);
      expect(e.verification_quote?.length ?? 0).toBeGreaterThan(0);
      expect(parseNumeric(rhs(e.equation_number)).ok, e.equation_number).toBe(true);
    }
    // single-source: the 22 prod rows (read in-session) output Q_SW, Q_GW, Q_GWT, Q_WB, V_buffer — none is re-produced here (Eq. 3/4 = min() already exists; R-3 / R-4 stage the duplicates)
    const prodOutputs = ['Q_SW', 'Q_GW', 'Q_GWT', 'Q_WB', 'V_buffer'];
    for (const e of EQUATIONS) expect(prodOutputs).not.toContain(e.output_symbol);
    expect(new Set(EQUATIONS.map((e) => `${e.worksheet} ${e.output_symbol}`)).size).toBe(EQUATIONS.length);
    expect(() => emitEquationsSql('m277e', EQUATIONS)).not.toThrow();
  });

  it('the committed migration + rollback equal a fresh emit (freshness pin)', () => {
    const norm = (s: string) => s.replace(/\r\n/g, '\n');
    const { up, down } = emitEquationsSql('m277e', EQUATIONS);
    const files = equationFilesFor('m277e', '20260917100420');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/ON CONFLICT \(worksheet_template_id, equation_number\) DO NOTHING/g) ?? []).length).toBe(14);
  });

  it('M277E-06-D1 / -D2 over the Grauwasserquellen register: Tab. 2 ranges per source, the in-range badge, Σ Q_GW = 1,375 (Ex. 9.3 A1) and the type codes 1…4 by membership', () => {
    const a1 = [{ id: '1', source: 'shower', persons: 25, q_gw_p: 40 }, { id: '2', source: 'bathtub', persons: 25, q_gw_p: 15 }]; // L692: 25 · 40 shower + 25 · 15 bathtub
    const reg = prep('M277E-06', 'grauwasserquellen', a1);
    expect(reg.rows.map((r) => [r.values.q_min, r.values.q_max, r.values.in_range, r.values.q_row, r.complete])).toEqual([[10, 50, 1, 1000, true], [0, 30, 1, 375, true]]);
    expect(computed(run('M277E-06-D2', { registers: { grauwasserquellen: reg } }))).toBe(1375); // L693 "Q_GW = 1,375 l/d"
    expect(computed(run('M277E-06-D1', { registers: { grauwasserquellen: reg } }))).toBe(1);    // A1: bathtubs and showers (L386)
    const a2 = prep('M277E-06', 'grauwasserquellen', [...a1, { id: '3', source: 'hand_washbasin', persons: 25, q_gw_p: 10 }]); // L704–L706
    expect(computed(run('M277E-06-D2', { registers: { grauwasserquellen: a2 } }))).toBe(1625); // L706 "Q_GW = 1,625 l/d"
    expect(computed(run('M277E-06-D1', { registers: { grauwasserquellen: a2 } }))).toBe(2);    // A2: + hand washbasins (L387)
    const b1 = prep('M277E-06', 'grauwasserquellen', [...a1, { id: '4', source: 'washing_machine', persons: 25, q_gw_p: 12 }]);
    expect(computed(run('M277E-06-D1', { registers: { grauwasserquellen: b1 } }))).toBe(3);    // B1: + washing machines (L390)
    const b2 = prep('M277E-06', 'grauwasserquellen', [...a1, { id: '5', source: 'dishwasher', persons: 25, q_gw_p: 8 }]);
    expect(computed(run('M277E-06-D1', { registers: { grauwasserquellen: b2 } }))).toBe(4);    // B2: and/or kitchen (L391) — kitchen wins regardless of the washing machine
    // an out-of-range pick is flagged, never blocked (SR-2: the engineer's choice stays visible); a row without a pick is incomplete and does not count
    const odd = prep('M277E-06', 'grauwasserquellen', [{ id: '1', source: 'shower', persons: 10, q_gw_p: 60 }, { id: '2', source: 'kitchen_sink', persons: 10 }]);
    expect(odd.rows.map((r) => [r.values.in_range, r.complete])).toEqual([[0, true], [null, false]]);
    expect(computed(run('M277E-06-D2', { registers: { grauwasserquellen: odd } }))).toBe(600);
    expect(computed(run('M277E-06-D1', { registers: { grauwasserquellen: odd } }))).toBe(1); // the incomplete kitchen row is not counted
    expect(run('M277E-06-D2', { registers: { grauwasserquellen: prep('M277E-06', 'grauwasserquellen', []) } }).kind).toBe('manual_required');
  });

  it('M277E-16-D1 / -D2: Q_SW = 25 · 33 toilet + 60 · 150 / 180 kitchen garden = 875 (Ex. 9.2); the highest category is C2 because of the irrigation (L663); toilets alone stay C1', () => {
    const toilets = [{ id: '1', application: 'toilets', use_category: 'toilet_private', persons: 25 }]; // L658
    const garden = [{ id: 'g', label: 'kitchen garden', use_category: 'irrigation_crops', area_m2: 150, q_sw_a: 60, season_d: 180 }]; // L655 / L658
    const v = prep('M277E-16', 'verbraucher_sw', toilets);
    const b = prep('M277E-16', 'bewaesserung_sw', garden);
    expect(v.rows[0].values).toMatchObject({ q_sw_p: 33, q_row: 825, min_cat: 1 });
    expect(b.rows[0].values).toMatchObject({ q_sw_a_ref: 60, q_row: 50, min_cat: 2 });
    expect(computed(run('M277E-16-D1', { registers: { verbraucher_sw: v, bewaesserung_sw: b } }))).toBe(875); // L659 "Q_SW = 875 l/d"
    expect(computed(run('M277E-16-D2', { registers: { verbraucher_sw: v, bewaesserung_sw: b } }))).toBe(2);   // L663 "C2 due to the irrigation of the kitchen garden"
    const none = prep('M277E-16', 'bewaesserung_sw', []);
    expect(computed(run('M277E-16-D1', { registers: { verbraucher_sw: v, bewaesserung_sw: none } }))).toBe(825);
    expect(computed(run('M277E-16-D2', { registers: { verbraucher_sw: v, bewaesserung_sw: none } }))).toBe(1);  // private toilet flushing only → C1
    // a laundry row (Tab. 4 "-" under C1) lifts the requirement to C2; Tab. 5 washing machine 15 l/(P·d)
    const laundry = prep('M277E-16', 'verbraucher_sw', [...toilets, { id: '2', application: 'washing_machine', use_category: 'laundry_private', persons: 25 }]);
    expect(laundry.rows[1].values).toMatchObject({ q_sw_p: 15, q_row: 375, min_cat: 2 });
    expect(computed(run('M277E-16-D1', { registers: { verbraucher_sw: laundry, bewaesserung_sw: none } }))).toBe(1200);
    expect(computed(run('M277E-16-D2', { registers: { verbraucher_sw: laundry, bewaesserung_sw: none } }))).toBe(2);
    // an overridden Tab.-5 value (anhaltswert) enters the Σ; no person rows at all ⇒ undecidable, never a silent 0
    const over = prep('M277E-16', 'verbraucher_sw', [{ id: '1', application: 'toilets', use_category: 'toilet_private', persons: 10, q_sw_p: 30, q_sw_p_override: true }]);
    expect(over.rows[0].values).toMatchObject({ q_sw_p: 30, q_row: 300 });
    expect(run('M277E-16-D1', { registers: { verbraucher_sw: prep('M277E-16', 'verbraucher_sw', []), bewaesserung_sw: b } }).kind).toBe('manual_required');
    // the category rule reads BOTH registers through max_rows (no literal 2): area-only ⇒ 2 from the irrigation row; both empty ⇒ undecidable
    expect(computed(run('M277E-16-D2', { registers: { verbraucher_sw: prep('M277E-16', 'verbraucher_sw', []), bewaesserung_sw: b } }))).toBe(2);
    expect(run('M277E-16-D2', { registers: { verbraucher_sw: prep('M277E-16', 'verbraucher_sw', []), bewaesserung_sw: none } }).kind).toBe('manual_required');
    expect(eq('M277E-16-D2').formula).not.toMatch(/, 2,/);
  });

  it('M277E-05-D1: MBO code from the 50 m³ threshold (L329) — 50 → 0 (mere notification), 50.5 → 1', () => {
    expect(computed(run('M277E-05-D1', { inputs: [{ symbol: 'storage_capacity_m3', value: 50, unit: 'm^3' }] }))).toBe(0);
    expect(computed(run('M277E-05-D1', { inputs: [{ symbol: 'storage_capacity_m3', value: 50.5, unit: 'm^3' }] }))).toBe(1);
    expect(run('M277E-05-D1', { inputs: [] }).kind).toBe('manual_required');
  });

  it('M277E-19-D1: Tab. 4 process list per category through lookup() on two enum scalars — MBR is 0 under C1 and 1 under C2, Stabilisation the reverse, FB 1 under both', () => {
    const at = (cat: string, method: string) => computed(run('M277E-19-D1', { inputs: [{ symbol: 'quality_category', value: cat, unit: null }, { symbol: 'treatment_method', value: method, unit: null }] }));
    expect([at('C1', 'mbr'), at('C2', 'mbr'), at('C1', 'stabilisation'), at('C2', 'stabilisation'), at('C1', 'fb'), at('C2', 'fb'), at('C1', 'uv'), at('C2', 'ro')]).toEqual([0, 1, 1, 0, 1, 1, 0, 1]);
  });

  it('M277E-21-D1: Σ storage volume in m³ over the Speicher register (1000 = l → m³)', () => {
    const reg = prep('M277E-21', 'speicher_277', [{ id: '1', role: 'pre', volume_l: 4000 }, { id: '2', role: 'post', volume_l: 1500 }, { id: '3', role: 'buffer', volume_l: 875 }, { id: '4', label: 'ohne Volumen', role: 'pre' }]);
    expect(reg.rows.map((r) => r.complete)).toEqual([true, true, true, false]);
    expect(computed(run('M277E-21-D1', { registers: { speicher_277: reg } }))).toBe(6.375);
  });

  it('M277E-24-D1 / -D2 over the treated-sample register: Tab. 4 limits read from the worksheet scope; strict comparators; C1 checks only O2 and pH', () => {
    const limitsC2 = (s: string): Value | undefined => ({ quality_category: 'C2', turbidity_limit: 2, bod5_limit: 5, o2_sat_min: 50, ph_min_limit: 6.5, ph_max_limit: 9.5, total_coliforms_limit: 10000, e_coli_limit: 1000, p_aeruginosa_limit: 100 } as Record<string, Value>)[s];
    const limitsC1 = (s: string): Value | undefined => ({ quality_category: 'C1', o2_sat_min: 50, ph_min_limit: 6.5, ph_max_limit: 9.5 } as Record<string, Value>)[s]; // the C2-only limits are hidden (null) under C1
    const rows = [
      { id: '1', date: '2026-05-01', location: 'reservoir', turbidity_ntu: 1.5, bod5: 3, o2_sat_pct: 80, ph: 7.2, total_coliforms: 500, e_coli: 10, p_aeruginosa: 0 },  // all ok
      { id: '2', date: '2026-06-01', location: 'consumer', turbidity_ntu: 2, bod5: 3, o2_sat_pct: 80, ph: 7.2, total_coliforms: 500, e_coli: 10, p_aeruginosa: 0 },    // turbidity 2 is NOT "< 2 NTU"
      { id: '3', date: '2026-07-01', location: 'consumer', turbidity_ntu: 1, bod5: 3, o2_sat_pct: 50, ph: 9.5, total_coliforms: 500, e_coli: 10, p_aeruginosa: 0 },     // O2 50 is NOT "> 50 %"; pH 9.5 is inside 6.5-9.5
      { id: '4', date: '2026-08-01', location: 'consumer', turbidity_ntu: 1, bod5: 3, o2_sat_pct: 80, ph: 7, total_coliforms: 10000, e_coli: 999, p_aeruginosa: 99 },  // total coliforms 10,000 is NOT "< 10,000"
    ];
    const c2 = prep('M277E-24', 'ablaufproben_treated', rows, limitsC2);
    expect(c2.rows.map((r) => r.values.sample_ok)).toEqual([1, 0, 0, 0]);
    expect(c2.rows.map((r) => [r.values.turbidity_ok, r.values.o2_ok, r.values.ph_ok, r.values.total_coliforms_ok])).toEqual([[1, 1, 1, 1], [0, 1, 1, 1], [1, 0, 1, 1], [1, 1, 1, 0]]);
    expect(computed(run('M277E-24-D1', { registers: { ablaufproben_treated: c2 } }))).toBe(3);
    expect(computed(run('M277E-24-D2', { registers: { ablaufproben_treated: c2 } }))).toBe(4);
    // C1: the C2-only cells are hidden (not part of completeness) and their checks pass by "No requirement"; only row 3 (O2) fails
    const c1 = prep('M277E-24', 'ablaufproben_treated', rows.map((r) => ({ id: r.id, date: r.date, location: r.location, o2_sat_pct: r.o2_sat_pct, ph: r.ph })), limitsC1);
    expect(c1.rows.map((r) => r.complete)).toEqual([true, true, true, true]);
    expect(c1.rows.map((r) => r.values.sample_ok)).toEqual([1, 1, 0, 1]);
    expect(computed(run('M277E-24-D1', { registers: { ablaufproben_treated: c1 } }))).toBe(1);
    // C2 with a missing E. coli cell: the row is incomplete (required + visible) — not counted, not a silent pass
    const partial = prep('M277E-24', 'ablaufproben_treated', [{ ...rows[0], e_coli: null }], limitsC2);
    expect(partial.rows[0].complete).toBe(false);
    expect(computed(run('M277E-24-D2', { registers: { ablaufproben_treated: partial } }))).toBe(0);
  });

  it('M277E-18-D1…D5 over the balance periods: Ex. 9.4 (Q_GW 1,625 / Q_SW 875 → Q_WB +750) for 365 d and a 180-day deficit season', () => {
    const reg = prep('M277E-18', 'bilanzperioden', [
      { id: '1', label: 'Grundperiode', days: 185, q_gw: 1625, q_sw: 875 }, // L764–L774: Q_WB = +750 l/d, Q_GWT = 875
      { id: '2', label: 'Bewässerungssaison', days: 180, q_gw: 1625, q_sw: 2000 },
    ]);
    expect(reg.rows.map((r) => [r.values.q_wb, r.values.q_gwt, r.values.balance])).toEqual([[750, 875, 1], [-375, 1625, -1]]);
    const R = { bilanzperioden: reg };
    expect(computed(run('M277E-18-D1', { registers: R }))).toBeCloseTo((1625 * 185 + 1625 * 180) / 1000, 6);  // V_GW_annual 593.125
    expect(computed(run('M277E-18-D2', { registers: R }))).toBeCloseTo((875 * 185 + 2000 * 180) / 1000, 6);   // V_SW_annual 521.875
    expect(computed(run('M277E-18-D3', { registers: R }))).toBeCloseTo((875 * 185 + 1625 * 180) / 1000, 6);   // V_treated_annual 454.375
    expect(computed(run('M277E-18-D4', { registers: R }))).toBeCloseTo((750 * 185) / 1000, 6);                // V_surplus_annual 138.75
    expect(computed(run('M277E-18-D5', { registers: R }))).toBeCloseTo((375 * 180) / 1000, 6);                // V_topup_annual 67.5 (positive: unary minus over the product)
    expect(run('M277E-18-D4', { registers: { bilanzperioden: prep('M277E-18', 'bilanzperioden', []) } }).kind).toBe('manual_required');
  });
});
