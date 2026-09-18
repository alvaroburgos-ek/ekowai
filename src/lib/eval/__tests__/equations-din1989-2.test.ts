/**
 * Plan 3 Task 17 — DIN-1989-2 derived-value equations: the emitter accepts every
 * entry, the committed migration equals a fresh emit, and each formula computes
 * the printed rule through the real `evaluateFormula` over rows prepared by the
 * register contract (Tab. 2 / Tab. 3 cells refilled from the seeded tables — the
 * TS fallback, no migration applied). The Trennwirkung rows are pinned against the
 * standard's OWN examples: Anhang A (L775) 10 − 3 / 10 = 0,7; Anhang C
 * (L841–L843) 0,8 / 0,7 / 0,75; Anhang D (L865–L867, L881–L887) 1,0 / 0 / 0,5
 * and 1,0 / 1,0 / 1,0.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EQUATIONS, ETA_C_EXPR, ETA_RUECK_EXPR, ETA_VERW_EXPR } from '../equations/din1989_2';
import { FIELD_CONFIGS } from '../field-configs/din1989_2';
import { evaluateFormula, type EvalState } from '../formula';
import { prepareRegisterRows } from '../register-rows';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { makeTableLookup, makeTableRows } from '../regulation-tables-fallback';
import { parseNumeric } from '@/lib/expr';
import { emitEquationsSql, equationFilesFor } from '../../../../scripts/regulation-tables/emit-equations-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const STD = 'DIN-1989-2';
const table = makeTableLookup(STD);
const tableRows = makeTableRows(STD);
const eq = (n: string) => EQUATIONS.find((e) => e.equation_number === n)!;
const rhs = (n: string) => eq(n).formula.replace(/^[A-Za-z_][A-Za-z0-9_]*\s*=\s*/, '');
const cfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: FIELD_CONFIGS.find((f) => f.worksheet === ws && f.symbol === sym)!.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
/** G-13: row exprs read worksheet scalars (V_pruefmedium_l, Q_Zu_max, einbausystem, filtertyp) through `ctx.symbol`. */
const prep = (ws: string, sym: string, rows: unknown[], symbols: Record<string, number | string | boolean> = {}) => {
  const c = cfg(ws, sym);
  return prepareRegisterRows({ rows }, c.columns, { table, tableRows, symbol: (s) => symbols[s] }, { overrideFlagKey: c.override?.flag_key, overrideAppliesTo: c.override?.applies_to });
};
const run = (n: string, opts: { inputs?: Array<{ symbol: string; value: number | string | null; unit: string | null }>; registers?: Record<string, ReturnType<typeof prep>> }): EvalState => {
  const e = eq(n);
  return evaluateFormula({ equationId: n, formula: e.formula, inputSymbols: e.input_symbols, outputSymbol: e.output_symbol, inputs: opts.inputs ?? [], registers: opts.registers, tableLookup: table });
};
const computed = (r: EvalState): number => { expect(r.kind).toBe('computed'); return r.kind === 'computed' ? r.value : NaN; };
const num = (symbol: string, value: number | string | null, unit: string | null = null) => ({ symbol, value, unit });

/** Three Tab.-3 rows with the found masses split in the printed 0,15 / 0,15 / 0,20 proportions of 1000 l (Σ soll = 500 g). */
const stoffe = (share: { sp: number; verw?: number }, filtertyp: 'typ_a' | 'typ_b' | 'typ_c', V = 1000) => {
  const split = (g: number | undefined) => (g == null ? [undefined, undefined, undefined] : [g * 0.3, g * 0.3, g * 0.4]);
  const sp = split(share.sp); const vw = split(share.verw);
  return prep('DIN-1989-2-03', 'pruefstoffe', [
    { id: '1', stoff: 'ldpe_folie', masse_speicher_g: sp[0], masse_verwurf_g: vw[0] },
    { id: '2', stoff: 'pp_kugeln', masse_speicher_g: sp[1], masse_verwurf_g: vw[1] },
    { id: '3', stoff: 'quarzsand', masse_speicher_g: sp[2], masse_verwurf_g: vw[2] },
  ], { V_pruefmedium_l: V, filtertyp });
};

describe('DIN-1989-2 Plan-3 equations', () => {
  it('23 entries, every output has a created field, every input is a symbol or register; single-source; emitter accepts them', () => {
    expect(EQUATIONS.map((e) => e.equation_number)).toEqual([
      'DIN-1989-2-01-D1',
      'DIN-1989-2-02-D1', 'DIN-1989-2-02-D2', 'DIN-1989-2-02-D3', 'DIN-1989-2-02-D4', 'DIN-1989-2-02-D5',
      'DIN-1989-2-03-D1', 'DIN-1989-2-03-D2', 'DIN-1989-2-03-D3', 'DIN-1989-2-03-D4', 'DIN-1989-2-03-D5', 'DIN-1989-2-03-D6', 'DIN-1989-2-03-D7', 'DIN-1989-2-03-D8', 'DIN-1989-2-03-D9',
      'DIN-1989-2-03-D10', 'DIN-1989-2-03-D11', 'DIN-1989-2-03-D12', 'DIN-1989-2-03-D13', 'DIN-1989-2-03-D14', 'DIN-1989-2-03-D15', 'DIN-1989-2-03-D16', 'DIN-1989-2-03-D17',
    ]);
    const created = new Set(FIELD_CONFIGS.filter((f) => f.create).map((f) => `${f.worksheet} ${f.symbol}`));
    for (const e of EQUATIONS) {
      expect(created.has(`${e.worksheet} ${e.output_symbol}`), `${e.output_symbol} field`).toBe(true);
      expect(e.description.startsWith('Plan 3:')).toBe(true);
      expect(e.verification_quote?.length ?? 0).toBeGreaterThan(0);
      expect(e.verification_quote).not.toContain('undefined');
      expect(parseNumeric(rhs(e.equation_number)).ok, e.equation_number).toBe(true);
    }
    // single-source: no Plan-3 equation outputs a symbol prod already produces (Gl. 1 … 9 keep their verified rows)
    const prodOutputs = ['V_Rueck_A', 'V_Rueck_B', 'eta_hydr', 'V_Pruef_leist', 'eta_hyd_bel', 'V_Pruef_trenn', 'eta_Rueck_AB', 'eta_Verw', 'eta_C'];
    for (const e of EQUATIONS) expect(prodOutputs).not.toContain(e.output_symbol);
    // the materialiser cannot resolve inherited scalars (filtertyp / DN on -03): no -03 row names one as an input — the switch lives in visibility
    for (const e of EQUATIONS.filter((x) => x.worksheet === 'DIN-1989-2-03')) expect(e.input_symbols).not.toContain('filtertyp');
    for (const e of EQUATIONS.filter((x) => x.worksheet === 'DIN-1989-2-03')) expect(e.input_symbols).not.toContain('DN');
    // no register-fed twin is chained on another NEW output (the Σ terms are inline)
    const newOutputs = new Set(EQUATIONS.map((e) => e.output_symbol));
    for (const e of EQUATIONS) for (const s of e.input_symbols) expect(newOutputs.has(s), `${e.equation_number} reads new output ${s}`).toBe(false);
    expect(() => emitEquationsSql('din1989_2', EQUATIONS)).not.toThrow();
    expect(emitEquationsSql('din1989_2', EQUATIONS).warnings).toEqual([]);
  });

  it('the committed migration + rollback equal a fresh emit (freshness pin)', () => {
    const norm = (s: string) => s.replace(/\r\n/g, '\n');
    const { up, down } = emitEquationsSql('din1989_2', EQUATIONS);
    const files = equationFilesFor('din1989_2', '20260917101720');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/ON CONFLICT \(worksheet_template_id, equation_number\) DO NOTHING/g) ?? []).length).toBe(23);
  });

  it('DIN-1989-2-01-D1 filtertyp_konsistent_code: 1 when the chosen type equals the Tab.-1 fill, 0 otherwise, manual_required while the fill is empty', () => {
    expect(computed(run('DIN-1989-2-01-D1', { inputs: [num('filtertyp', 'typ_a'), num('filtertyp_tab1', 'typ_a')] }))).toBe(1);
    expect(computed(run('DIN-1989-2-01-D1', { inputs: [num('filtertyp', 'typ_a'), num('filtertyp_tab1', 'typ_b')] }))).toBe(0);
    expect(run('DIN-1989-2-01-D1', { inputs: [num('filtertyp', 'typ_a'), num('filtertyp_tab1', null)] }).kind).toBe('manual_required');
  });

  it('Gl. 1 / Gl. 2 minima (L284 / L320): Q = 5 l/s → 125 l (Typ A, 25 s) and 10 l (Typ B, 2 s)', () => {
    expect(computed(run('DIN-1989-2-02-D1', { inputs: [num('Q', 5, 'l/s')] }))).toBe(125);
    expect(computed(run('DIN-1989-2-02-D2', { inputs: [num('Q', 5, 'l/s')] }))).toBe(10);
    expect(run('DIN-1989-2-02-D1', { inputs: [num('Q', null, 'l/s')] }).kind).toBe('manual_required');
  });

  it('DIN-1989-2-02-D3 … D5 over the Typ-B containers: Σ Volumen, max. Masse (20 kg badge), max. Entnahmetiefe (only entered rows; none ⇒ manual_required)', () => {
    const bh = prep('DIN-1989-2-02', 'behaeltnisse', [
      { id: '1', label: 'A', volumen_l: 30, masse_gefuellt_kg: 18, grifftiefe_cm: 55 },
      { id: '2', label: 'B', volumen_l: 25, masse_gefuellt_kg: 22 },
    ], { einbausystem: 'separat_erdeinbau' });
    expect(bh.rows.map((r) => [r.values.masse_ok, r.values.grifftiefe_ok, r.complete])).toEqual([[1, 1, true], [0, 1, true]]);
    expect(computed(run('DIN-1989-2-02-D3', { registers: { behaeltnisse: bh } }))).toBe(55);
    expect(computed(run('DIN-1989-2-02-D4', { registers: { behaeltnisse: bh } }))).toBe(22);
    expect(computed(run('DIN-1989-2-02-D5', { registers: { behaeltnisse: bh } }))).toBe(55);
    const noDepth = prep('DIN-1989-2-02', 'behaeltnisse', [{ id: '2', label: 'B', volumen_l: 25, masse_gefuellt_kg: 22 }], { einbausystem: 'integriert' });
    expect(run('DIN-1989-2-02-D5', { registers: { behaeltnisse: noDepth } }).kind).toBe('manual_required'); // IS NOT NULL condition — no row qualifies
    expect(computed(run('DIN-1989-2-02-D4', { registers: { behaeltnisse: noDepth } }))).toBe(22);
    // a depth typed while the column is hidden (integriert) stays a stored cell (a262e trap 2) — the badge still reads it; the row is complete
    const hidden = prep('DIN-1989-2-02', 'behaeltnisse', [{ id: '1', label: 'A', volumen_l: 30, masse_gefuellt_kg: 18, grifftiefe_cm: 70 }], { einbausystem: 'integriert' });
    expect(hidden.rows[0].values.grifftiefe_ok).toBe(0);
    expect(run('DIN-1989-2-02-D3', { registers: { behaeltnisse: prep('DIN-1989-2-02', 'behaeltnisse', []) } }).kind).toBe('manual_required');
  });

  it('Gl. 4 / Gl. 6 minima and the printed "≥" as checks (L522 / L615): Q_Zu,max = 5 l/s → 450 l / 900 l; 450 ≥ 450 ⇒ 1; 800 < 900 ⇒ 0', () => {
    expect(computed(run('DIN-1989-2-03-D1', { inputs: [num('Q_Zu_max', 5, 'l/s')] }))).toBe(450);
    expect(computed(run('DIN-1989-2-03-D2', { inputs: [num('Q_Zu_max', 5, 'l/s')] }))).toBe(900);
    expect(computed(run('DIN-1989-2-03-D3', { inputs: [num('V_Pruef_leist', 450, 'l'), num('Q_Zu_max', 5, 'l/s')] }))).toBe(1);
    expect(computed(run('DIN-1989-2-03-D3', { inputs: [num('V_Pruef_leist', 449, 'l'), num('Q_Zu_max', 5, 'l/s')] }))).toBe(0);
    expect(computed(run('DIN-1989-2-03-D4', { inputs: [num('V_Pruef_trenn', 800, 'l'), num('Q_Zu_max', 5, 'l/s')] }))).toBe(0);
    expect(computed(run('DIN-1989-2-03-D4', { inputs: [num('V_Pruef_trenn', 1000, 'l'), num('Q_Zu_max', 5, 'l/s')] }))).toBe(1);
  });

  it('prueflaeufe (Tab. 2, Gl. 3 / Gl. 5): % and t refilled per step, Q_Zu Soll from Q_Zu,max, η per row; p100 / min twins per state; no matching row ⇒ manual_required, never 0', () => {
    const pl = prep('DIN-1989-2-03', 'prueflaeufe', [
      { id: '1', stufe: 'p100', q_zu: 10, q_ab: 2 },                   // unset belastet ⇒ unbelastet → 0,8
      { id: '2', stufe: 'p50', q_zu: 5, q_ab: 0.5 },                    // 0,9
      { id: '3', stufe: 'p100', belastet: true, q_zu: 10, q_ab: 3 },    // 0,7
      { id: '4', stufe: 'p20', belastet: true, q_zu: 2, q_ab: 0.8 },    // 0,6
      { id: '5', stufe: 'p10', belastet: false, q_zu: 1, q_ab: 0.05 },  // 0,95
      { id: '6', stufe: 'p2_5', q_zu: 0.25 },                           // incomplete (no Q_Ab)
    ], { Q_Zu_max: 10 });
    expect(pl.rows.map((r) => [r.values.q_pct, r.values.t_min, r.values.q_soll, r.values.belastet, r.values.eta_row, r.complete])).toEqual([
      [100, 2, 10, false, 0.8, true], [50, 2, 5, false, 0.9, true], [100, 2, 10, true, 0.7, true], [20, 3, 2, true, 0.6, true], [10, 4, 1, false, 0.95, true], [2.5, 8, 0.25, false, null, false],
    ]);
    expect(computed(run('DIN-1989-2-03-D5', { registers: { prueflaeufe: pl } }))).toBe(5);
    expect(computed(run('DIN-1989-2-03-D6', { registers: { prueflaeufe: pl } }))).toBeCloseTo(0.8, 12);
    expect(computed(run('DIN-1989-2-03-D7', { registers: { prueflaeufe: pl } }))).toBeCloseTo(0.7, 12);
    expect(computed(run('DIN-1989-2-03-D8', { registers: { prueflaeufe: pl } }))).toBeCloseTo(0.8, 12);
    expect(computed(run('DIN-1989-2-03-D9', { registers: { prueflaeufe: pl } }))).toBeCloseTo(0.6, 12);
    const onlyP50 = prep('DIN-1989-2-03', 'prueflaeufe', [{ id: '1', stufe: 'p50', q_zu: 5, q_ab: 0.5 }], { Q_Zu_max: 10 });
    expect(run('DIN-1989-2-03-D6', { registers: { prueflaeufe: onlyP50 } }).kind).toBe('manual_required');
    expect(run('DIN-1989-2-03-D7', { registers: { prueflaeufe: onlyP50 } }).kind).toBe('manual_required');
    expect(computed(run('DIN-1989-2-03-D8', { registers: { prueflaeufe: onlyP50 } }))).toBeCloseTo(0.9, 12);
    expect(computed(run('DIN-1989-2-03-D5', { registers: { prueflaeufe: prep('DIN-1989-2-03', 'prueflaeufe', []) } }))).toBe(0);
    // without Q_Zu_max the Soll column is null but the row stays complete (the measured pair is what counts)
    const noQ = prep('DIN-1989-2-03', 'prueflaeufe', [{ id: '1', stufe: 'p50', q_zu: 5, q_ab: 0.5 }]);
    expect(noQ.rows[0].values.q_soll).toBeNull();
    expect(noQ.rows[0].complete).toBe(true);
  });

  it('pruefstoffe (Tab. 3): 1000 l ⇒ Soll 150 / 150 / 200 g (Σ 500 = 0,50 g/l), 15 Stück LDPE, footnote a per row; Σ twins; V missing ⇒ manual_required', () => {
    const reg = stoffe({ sp: 100, verw: 350 }, 'typ_c');
    expect(reg.rows.map((r) => [r.values.konz, r.values.stueck, r.values.masse_soll, r.values.stueck_soll, r.complete])).toEqual([
      [0.15, 15, 150, 15, true], [0.15, null, 150, 0, true], [0.2, null, 200, 0, true],
    ]);
    expect(reg.rows[0].values.fussnote).toBe('a Die LDPE-Folie geht fiktiv mit 10 g/Stück in die Massenbilanz ein.');
    expect(reg.rows[1].values.fussnote).toBeNull();
    expect(computed(run('DIN-1989-2-03-D10', { registers: { pruefstoffe: reg } }))).toBeCloseTo(500, 9);
    expect(computed(run('DIN-1989-2-03-D11', { registers: { pruefstoffe: reg } }))).toBeCloseTo(100, 9);
    expect(computed(run('DIN-1989-2-03-D12', { registers: { pruefstoffe: reg } }))).toBeCloseTo(350, 9);
    // 2000 l doubles every Soll mass and the LDPE count
    const big = stoffe({ sp: 100 }, 'typ_a', 2000);
    expect(big.rows.map((r) => [r.values.masse_soll, r.values.stueck_soll])).toEqual([[300, 30], [300, 0], [400, 0]]);
    expect(computed(run('DIN-1989-2-03-D10', { registers: { pruefstoffe: big } }))).toBeCloseTo(1000, 9);
    const noV = prep('DIN-1989-2-03', 'pruefstoffe', [{ id: '1', stoff: 'ldpe_folie', masse_speicher_g: 45 }], { filtertyp: 'typ_a' });
    expect(noV.rows[0].values.masse_soll).toBeNull();
    expect(run('DIN-1989-2-03-D10', { registers: { pruefstoffe: noV } }).kind).toBe('manual_required');
    expect(run('DIN-1989-2-03-D10', { registers: { pruefstoffe: prep('DIN-1989-2-03', 'pruefstoffe', []) } }).kind).toBe('manual_required');
  });

  it('Anhang A / B (L775, L817): Typ A/B — Σ 10 (scaled 500 g), Sp.verunr 3 (150 g) ⇒ η_Rück = 0,7 ⇒ filtertrennwirkung_code_ab = 1; Verwurf cells empty count 0', () => {
    const reg = stoffe({ sp: 150 }, 'typ_a');
    expect(reg.rows.every((r) => r.complete)).toBe(true);
    expect(reg.rows.map((r) => r.values.masse_verwurf_g)).toEqual([null, null, null]);
    expect(computed(run('DIN-1989-2-03-D12', { registers: { pruefstoffe: reg } }))).toBe(0);
    expect(computed(run('DIN-1989-2-03-D13', { registers: { pruefstoffe: reg } }))).toBeCloseTo(0.7, 12);
    expect(computed(run('DIN-1989-2-03-D16', { registers: { pruefstoffe: reg } }))).toBe(1);
    // just below 0,7 ⇒ 0 (L386 "mindestens 0,7" — inclusive)
    expect(computed(run('DIN-1989-2-03-D16', { registers: { pruefstoffe: stoffe({ sp: 151 }, 'typ_b') } }))).toBe(0);
    expect(computed(run('DIN-1989-2-03-D13', { registers: { pruefstoffe: stoffe({ sp: 0 }, 'typ_b') } }))).toBe(1);
  });

  it('Anhang C (L841–L843): Typ C — Σ 10, Sp.verunr 2, Verwurf 7 ⇒ η_Rück 0,8 · η_Verw 0,7 · η_C 0,75 ⇒ filtertrennwirkung_code_c = 1', () => {
    const reg = stoffe({ sp: 100, verw: 350 }, 'typ_c');
    expect(computed(run('DIN-1989-2-03-D13', { registers: { pruefstoffe: reg } }))).toBeCloseTo(0.8, 12);
    expect(computed(run('DIN-1989-2-03-D14', { registers: { pruefstoffe: reg } }))).toBeCloseTo(0.7, 12);
    expect(computed(run('DIN-1989-2-03-D15', { registers: { pruefstoffe: reg } }))).toBeCloseTo(0.75, 12);
    expect(computed(run('DIN-1989-2-03-D17', { registers: { pruefstoffe: reg } }))).toBe(1);
    expect(rhs('DIN-1989-2-03-D13')).toBe(ETA_RUECK_EXPR);
    expect(rhs('DIN-1989-2-03-D14')).toBe(ETA_VERW_EXPR);
    expect(rhs('DIN-1989-2-03-D15')).toBe(ETA_C_EXPR);
  });

  it('Anhang D (L865–L867, L881–L887): Extrembeispiel 1 (10 / 0 / 0) ⇒ 1,0 · 0 · 0,5 ⇒ code_c 0; Extrembeispiel 2 (10 / 0 / 10) ⇒ 1,0 · 1,0 · 1,0 ⇒ code_c 1', () => {
    const ex1 = stoffe({ sp: 0, verw: 0 }, 'typ_c');
    expect(computed(run('DIN-1989-2-03-D13', { registers: { pruefstoffe: ex1 } }))).toBe(1);
    expect(computed(run('DIN-1989-2-03-D14', { registers: { pruefstoffe: ex1 } }))).toBe(0);
    expect(computed(run('DIN-1989-2-03-D15', { registers: { pruefstoffe: ex1 } }))).toBeCloseTo(0.5, 12);
    expect(computed(run('DIN-1989-2-03-D17', { registers: { pruefstoffe: ex1 } }))).toBe(0);
    const ex2 = stoffe({ sp: 0, verw: 500 }, 'typ_c');
    expect(computed(run('DIN-1989-2-03-D13', { registers: { pruefstoffe: ex2 } }))).toBe(1);
    expect(computed(run('DIN-1989-2-03-D14', { registers: { pruefstoffe: ex2 } }))).toBe(1);
    expect(computed(run('DIN-1989-2-03-D15', { registers: { pruefstoffe: ex2 } }))).toBe(1);
    expect(computed(run('DIN-1989-2-03-D17', { registers: { pruefstoffe: ex2 } }))).toBe(1);
  });
});
