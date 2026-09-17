/**
 * Plan 3 Task 2 — DIN-1989-1 derived-value equations: the emitter accepts every
 * entry, the committed migration equals a fresh emit, and each formula computes
 * the printed rule through the real `evaluateFormula` over rows prepared by the
 * register contract (Tab. 3 / Tab. 4 / Tab. 2 cells refilled from the seeded
 * tables — the TS fallback, no migration applied).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EQUATIONS } from '../equations/din1989_1';
import { FIELD_CONFIGS } from '../field-configs/din1989_1';
import { evaluateFormula, type EvalState } from '../formula';
import { prepareRegisterRows } from '../register-rows';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { makeTableLookup, makeTableRows } from '../regulation-tables-fallback';
import { parseNumeric } from '@/lib/expr';
import { emitEquationsSql, equationFilesFor } from '../../../../scripts/regulation-tables/emit-equations-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const STD = 'DIN-1989-1';
const table = makeTableLookup(STD);
const tableRows = makeTableRows(STD);
const eq = (n: string) => EQUATIONS.find((e) => e.equation_number === n)!;
const rhs = (n: string) => eq(n).formula.replace(/^[A-Za-z_][A-Za-z0-9_]*\s*=\s*/, '');
const cfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: FIELD_CONFIGS.find((f) => f.worksheet === ws && f.symbol === sym)!.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const prep = (ws: string, sym: string, rows: unknown[]) => {
  const c = cfg(ws, sym);
  return prepareRegisterRows({ rows }, c.columns, { table, tableRows }, { overrideFlagKey: c.override?.flag_key, overrideAppliesTo: c.override?.applies_to });
};
const run = (n: string, opts: { inputs?: Array<{ symbol: string; value: number | string | null; unit: string | null }>; registers?: Record<string, ReturnType<typeof prep>> }): EvalState => {
  const e = eq(n);
  return evaluateFormula({ equationId: n, formula: e.formula, inputSymbols: e.input_symbols, outputSymbol: e.output_symbol, inputs: opts.inputs ?? [], registers: opts.registers, tableLookup: table });
};
const computed = (r: EvalState): number => { expect(r.kind).toBe('computed'); return r.kind === 'computed' ? r.value : NaN; };

describe('DIN-1989-1 Plan-3 equations', () => {
  it('nine entries, every output has a created field, every input is a symbol or register; emitter accepts them', () => {
    expect(EQUATIONS.map((e) => e.equation_number)).toEqual([
      'DIN-1989-1-04-D1', 'DIN-1989-1-04-D2', 'DIN-1989-1-04-D3', 'DIN-1989-1-04-D4', 'DIN-1989-1-04-D5',
      'DIN-1989-1-02-D1', 'DIN-1989-1-02-D2', 'DIN-1989-1-02-D3', 'DIN-1989-1-06-D1',
    ]);
    const created = new Set(FIELD_CONFIGS.filter((f) => f.create).map((f) => `${f.worksheet} ${f.symbol}`));
    for (const e of EQUATIONS) {
      expect(created.has(`${e.worksheet} ${e.output_symbol}`), `${e.output_symbol} field`).toBe(true);
      expect(e.description.startsWith('Plan 3:')).toBe(true);
      expect(e.verification_quote?.length ?? 0).toBeGreaterThan(0);
      expect(parseNumeric(rhs(e.equation_number)).ok, e.equation_number).toBe(true);
    }
    // single-source: no Plan-3 equation outputs a symbol prod already produces (E_R, BW_a, V_n stay owned by Gl. 1–4)
    for (const e of EQUATIONS) expect(['E_R', 'BW_a', 'V_n']).not.toContain(e.output_symbol);
    expect(() => emitEquationsSql('din1989_1', EQUATIONS)).not.toThrow();
  });

  it('the committed migration + rollback equal a fresh emit (freshness pin)', () => {
    const norm = (s: string) => s.replace(/\r\n/g, '\n');
    const { up, down } = emitEquationsSql('din1989_1', EQUATIONS);
    const files = equationFilesFor('din1989_1', '20260917100220');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/ON CONFLICT \(worksheet_template_id, equation_number\) DO NOTHING/g) ?? []).length).toBe(9);
  });

  it('DIN-1989-1-04-D1 sum_a_e: Σ A_A·e with e refilled from Tab. 3 per row (L837–L843); an incomplete row does not count; empty register ⇒ manual_required', () => {
    const reg = prep('DIN-1989-1-04', 'auffangflaechen', [
      { id: '1', label: 'Hauptdach', art: 'geneigtes_hartdach', a_a: 100 },        // 0,8 → 80
      { id: '2', label: 'Garage', art: 'flachdach_bekiest', a_a: 50 },              // 0,6 → 30
      { id: '3', label: 'Gründach', art: 'gruendach_intensiv', a_a: 40 },           // 0,3 → 12
      { id: '4', label: 'ohne Art', a_a: 999 },                                     // incomplete
    ]);
    expect(reg.rows.map((r) => r.values.e)).toEqual([0.8, 0.6, 0.3, null]);
    expect(reg.rows.map((r) => r.complete)).toEqual([true, true, true, false]);
    expect(computed(run('DIN-1989-1-04-D1', { registers: { auffangflaechen: reg } }))).toBeCloseTo(122, 9);
    // an anhaltswert override (footnote a: Saugfähigkeit/Rauheit) keeps the typed e
    const over = prep('DIN-1989-1-04', 'auffangflaechen', [{ id: '1', label: 'rau', art: 'geneigtes_hartdach', a_a: 100, e: 0.7, e_override: true }]);
    expect(over.rows[0].values.e).toBe(0.7);
    expect(computed(run('DIN-1989-1-04-D1', { registers: { auffangflaechen: over } }))).toBeCloseTo(70, 9);
    expect(run('DIN-1989-1-04-D1', { registers: { auffangflaechen: prep('DIN-1989-1-04', 'auffangflaechen', []) } }).kind).toBe('manual_required');
  });

  it('DIN-1989-1-04-D2 bw_person: Σ (P_d + 10 l Waschmaschine) · n · 365 with P_d refilled from Tab. 4 (L881–L883, L892)', () => {
    const reg = prep('DIN-1989-1-04', 'verbraucher', [
      { id: '1', label: 'Wohnen', typ: 'toilette_haushalt', n: 4, waschmaschine: true },   // (24+10)·4·365 = 49640
      { id: '2', label: 'Büro', typ: 'toilette_buero', n: 10 },                            // 12·10·365 = 43800
      { id: '3', label: 'Schule', typ: 'toilette_schule', n: 200, waschmaschine: false },  // 6·200·365 = 438000
    ]);
    expect(reg.rows.map((r) => [r.values.p_d, r.values.p_d_eff, r.values.bw_row])).toEqual([[24, 34, 49640], [12, 12, 43800], [6, 6, 438000]]);
    expect(computed(run('DIN-1989-1-04-D2', { registers: { verbraucher: reg } }))).toBe(49640 + 43800 + 438000);
  });

  it('DIN-1989-1-04-D3 bw_flaeche: Σ A_Bew · BS_a (engineer pick; Tab. 4 bounds per row, L884–L890) and the in-range badge', () => {
    const reg = prep('DIN-1989-1-04', 'bewaesserungsflaechen', [
      { id: '1', label: 'Garten', typ: 'garten', a_bew: 100, bs_a: 60 },                 // 6000, in range (60–60)
      { id: '2', label: 'Wiese leicht', typ: 'gruenland_leicht', a_bew: 500, bs_a: 150 }, // 75000, in range (100–200)
      { id: '3', label: 'Wiese schwer', typ: 'gruenland_schwer', a_bew: 200, bs_a: 160 }, // 32000, OUT of range (80–150) — visible badge, still counted (SR-2 is the engineer's call)
    ]);
    expect(reg.rows.map((r) => [r.values.bs_a_min, r.values.bs_a_max, r.values.bs_in_range, r.values.bw_row])).toEqual([[60, 60, 1, 6000], [100, 200, 1, 75000], [80, 150, 0, 32000]]);
    expect(computed(run('DIN-1989-1-04-D3', { registers: { bewaesserungsflaechen: reg } }))).toBe(6000 + 75000 + 32000);
  });

  it('DIN-1989-1-04-D4 / -D5: total = person + area; Tagesbedarf = total / 365 (L897/L904, L591)', () => {
    const inputs = [{ symbol: 'bw_person', value: 49640, unit: 'l/a' }, { symbol: 'bw_flaeche', value: 6000, unit: 'l/a' }];
    expect(computed(run('DIN-1989-1-04-D4', { inputs }))).toBe(55640);
    expect(computed(run('DIN-1989-1-04-D5', { inputs: [{ symbol: 'bw_a_total', value: 55640, unit: 'l/a' }] }))).toBeCloseTo(55640 / 365, 9);
    const missing = run('DIN-1989-1-04-D4', { inputs: [inputs[0], { symbol: 'bw_flaeche', value: null, unit: 'l/a' }] });
    expect(missing.kind).toBe('manual_required');
  });

  it('DIN-1989-1-02-D1 nennvolumen = mindestwasservolumen + V_n (L783)', () => {
    expect(computed(run('DIN-1989-1-02-D1', { inputs: [{ symbol: 'mindestwasservolumen', value: 300, unit: 'l' }, { symbol: 'V_n', value: 4000, unit: 'l' }] }))).toBe(4300);
  });

  it('DIN-1989-1-02-D2 / -D3: Σ Einzelvolumen and the governing Tab. 2 minimum opening over the tank rows (L493–L496)', () => {
    const reg = prep('DIN-1989-1-02', 'speicher_behaelter', [
      { id: '1', label: 'Erdtank', aufstellung: 'unterirdisch', einzelvolumen_l: 6000, domhoehe_mm: 600, oeffnung_ist_mm: 600 },  // dom_gt450 → 600, ok
      { id: '2', label: 'Kellertank A', aufstellung: 'oberirdisch', einzelvolumen_l: 2000, oeffnung_ist_mm: 200 },               // le3000 → 200, ok
      { id: '3', label: 'Kellertank B', aufstellung: 'oberirdisch', einzelvolumen_l: 3000, oeffnung_ist_mm: 150 },               // le3000 (3000 inclusive) → 200, unterschritten
    ]);
    expect(reg.rows.map((r) => [r.values.groesse_band, r.values.oeffnung_min_mm, r.values.oeffnung_ok, r.complete])).toEqual([
      ['dom_gt450', 600, 1, true], ['le3000', 200, 1, true], ['le3000', 200, 0, true],
    ]);
    expect(computed(run('DIN-1989-1-02-D2', { registers: { speicher_behaelter: reg } }))).toBe(11000);
    expect(computed(run('DIN-1989-1-02-D3', { registers: { speicher_behaelter: reg } }))).toBe(600);
    // a buried tank without Domhöhe cannot pick its Tab. 2 row: the derived cells are null (never a guessed 600)
    const noDom = prep('DIN-1989-1-02', 'speicher_behaelter', [{ id: '1', aufstellung: 'unterirdisch', einzelvolumen_l: 5000 }]);
    expect(noDom.rows[0].values.groesse_band).toBeNull();
    expect(noDom.rows[0].values.oeffnung_min_mm).toBeNull();
    // > 3000 l above ground → 600 (L494); Domhöhe ≤ 450 → 600 (L495)
    const more = prep('DIN-1989-1-02', 'speicher_behaelter', [
      { id: '1', aufstellung: 'oberirdisch', einzelvolumen_l: 3001 }, { id: '2', aufstellung: 'unterirdisch', einzelvolumen_l: 4000, domhoehe_mm: 450 },
    ]);
    expect(more.rows.map((r) => [r.values.groesse_band, r.values.oeffnung_min_mm])).toEqual([['gt3000', 600], ['dom_le450', 600]]);
  });

  it('DIN-1989-1-06-D1 wartungsplan_rows counts the complete Tab. 5 rows; intervals refilled from TAB5', () => {
    const reg = prep('DIN-1989-1-06', 'wartungsplan', [
      { id: '1', anlagenteil: 'filtersysteme' }, { id: '2', anlagenteil: 'abwasserhebeanlage', erledigt_am: '2026-09-17' }, { id: '3' },
    ]);
    expect(reg.rows.map((r) => [r.values.inspektion, r.values.wartung, r.complete])).toEqual([
      ['1 Jahr', '1 Jahr', true], ['1 Monat', '3 Monate (b) / 6 Monate (c) / 1 Jahr (d)', true], [null, null, false],
    ]);
    expect(computed(run('DIN-1989-1-06-D1', { registers: { wartungsplan: reg } }))).toBe(2);
  });
});
