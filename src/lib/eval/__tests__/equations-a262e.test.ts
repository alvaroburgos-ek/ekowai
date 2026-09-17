/**
 * Plan 3 Task 3 — DWA-A-262E derived-value equations: the emitter accepts every
 * entry, the committed migration equals a fresh emit, and each formula computes
 * the printed rule through the real `evaluateFormula` over rows prepared by the
 * register contract (TABLE_LIMITS cells looked up from the seeded tables — the
 * TS fallback, no migration applied). Enum cells reach the formulas as strings
 * (controller amendment D).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EQUATIONS } from '../equations/a262e';
import { FIELD_CONFIGS } from '../field-configs/a262e';
import { evaluateFormula, type EvalState } from '../formula';
import { prepareRegisterRows } from '../register-rows';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { makeTableLookup, makeTableRows } from '../regulation-tables-fallback';
import { parseNumeric, type Value } from '@/lib/expr';
import { emitEquationsSql, equationFilesFor } from '../../../../scripts/regulation-tables/emit-equations-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const STD = 'DWA-A-262E';
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
const EZ4 = (s: string) => (s === 'EZ' ? 4 : undefined);

describe('DWA-A-262E Plan-3 equations', () => {
  it('fourteen entries; register outputs are created fields, the four text-only rules output existing consumer-free manual fields; no prod producer is duplicated; emitter accepts them', () => {
    expect(EQUATIONS.map((e) => e.equation_number)).toEqual([
      'A262-10-D1', 'A262-10-D2', 'A262-06-D1', 'A262-06-D2', 'A262-06-D3', 'A262-08-D1', 'A262-08-D2', 'A262-15-D1', 'A262-15-D2',
      'A262-11-D1', 'A262-26-D1', 'A262-26-D2', 'A262-21-D1', 'A262-24-D1',
    ]);
    const created = new Set(FIELD_CONFIGS.filter((f) => f.create).map((f) => `${f.worksheet} ${f.symbol}`));
    const existingOutputs = ['A262-11 A_Fo_min_VFS_KA', 'A262-26 Q_GW_taeglich', 'A262-26 A_Fo_spez_GW', 'A262-21 A_F_CSB_VFG_KomKA', 'A262-24 B_CSB_KomKA'];
    for (const e of EQUATIONS) {
      const key = `${e.worksheet} ${e.output_symbol}`;
      expect(created.has(key) || existingOutputs.includes(key), key).toBe(true);
      expect(e.description.startsWith('Plan 3:')).toBe(true);
      expect(e.verification_quote?.length ?? 0).toBeGreaterThan(0);
      expect(parseNumeric(rhs(e.equation_number)).ok, e.equation_number).toBe(true);
    }
    // single-source: the 18 prod equations (read in-session) output Q_Tr_h_max, Q_S_d_aM, Q_F, Q_R_Tr, Q_F_d_aM, Q_M, Q_T_d_aM, f_red, A_F_CSB_red, A_F_TKN_red, A_ANF, eta_DN, k_fA, U
    const prodOutputs = ['Q_Tr_h_max', 'Q_S_d_aM', 'Q_F', 'Q_R_Tr', 'Q_F_d_aM', 'Q_M', 'Q_T_d_aM', 'f_red', 'A_F_CSB_red', 'A_F_TKN_red', 'A_ANF', 'eta_DN', 'k_fA', 'U'];
    for (const e of EQUATIONS) expect(prodOutputs).not.toContain(e.output_symbol);
    expect(new Set(EQUATIONS.map((e) => `${e.worksheet} ${e.output_symbol}`)).size).toBe(EQUATIONS.length);
    expect(() => emitEquationsSql('a262e', EQUATIONS)).not.toThrow();
  });

  it('the committed migration + rollback equal a fresh emit (freshness pin)', () => {
    const norm = (s: string) => s.replace(/\r\n/g, '\n');
    const { up, down } = emitEquationsSql('a262e', EQUATIONS);
    const files = equationFilesFor('a262e', '20260917100320');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/ON CONFLICT \(worksheet_template_id, equation_number\) DO NOTHING/g) ?? []).length).toBe(14);
  });

  it('A262-10-D1 / -D2 over the Filterstufen register: TABLE_LIMITS cells per (filter_type, size, sewer), A_min = EZ · A_spez, Σ main areas, count of undersized main stages', () => {
    const rows = [
      { id: '1', label: 'Rohabwasserfilter', stage_role: 'primary', filter_type: 'raw_wastewater_filter', system_size: 'small_wwts', sewer: 'combined_sewer', area_m2: 6 },   // Tab. 3 M: 1.5 → 6, ok; excluded from Σ
      { id: '2', label: 'Hauptfilter', stage_role: 'main', filter_type: 'vf_sand_0_2', system_size: 'small_wwts', sewer: 'no_sewer', area_m2: 20 },                       // Tab. 4: 4 → 16, ok
      { id: '3', label: 'Grobsandfilter', stage_role: 'main', filter_type: 'vf_coarse_sand_0_4', system_size: 'municipal_wwtp', sewer: 'combined_sewer', area_m2: 3 },    // Tab. 12 M: 1 → 4, unterschritten
      { id: '4', label: 'Nachreinigung HF', stage_role: 'polishing', filter_type: 'hf_coarse_sand_or_gravel_downstream', system_size: 'municipal_wwtp', sewer: 'combined_sewer', area_m2: 10 }, // no TABLE_LIMITS row (Tab. 16)
    ];
    const reg = prep('A262-10', 'filterstufen', rows, EZ4);
    expect(reg.rows.map((r) => [r.values.sewer_key, r.values.a_spez_min, r.values.a_min_m2, r.values.a_abs_min_m2, r.values.area_ok])).toEqual([
      ['m', 1.5, 6, null, 1], ['tr', 4, 16, 16, 1], ['m', 1, 4, null, 0], ['m', null, null, null, null],
    ]);
    expect(reg.rows.map((r) => r.complete)).toEqual([true, true, true, true]);
    expect(computed(run('A262-10-D1', { registers: { filterstufen: reg } }))).toBe(23); // 20 + 3, primary/polishing excluded
    expect(computed(run('A262-10-D2', { registers: { filterstufen: reg } }))).toBe(1);  // the polishing row is short-circuited by stage_role == 'main'
    // per-row limits read from the seeded tables (Tab. 3 / Tab. 12)
    expect(reg.rows[0].values).toMatchObject({ f_a_f_csb_max: 100, q_f_t_max: 250, q_beschickung_min: 10, h_beschickung_min: 20 });
    expect(reg.rows[2].values).toMatchObject({ q_beschickung_min: 6, h_beschickung_min: 20, f_a_f_csb_max: null });
    // without EZ in scope (A262-10 does not consume it yet, a262e-C-2): Σ still computes, the count is undecidable — never a silent 0
    const noEz = prep('A262-10', 'filterstufen', rows);
    expect(noEz.rows.map((r) => r.values.a_min_m2)).toEqual([null, null, null, null]);
    expect(computed(run('A262-10-D1', { registers: { filterstufen: noEz } }))).toBe(23);
    expect(run('A262-10-D2', { registers: { filterstufen: noEz } }).kind).toBe('manual_required');
    expect(run('A262-10-D1', { registers: { filterstufen: prep('A262-10', 'filterstufen', [], EZ4) } }).kind).toBe('manual_required');
  });

  it('discriminator-driven row cells: row-scope visible_when governs completeness (the editor nulls a hidden cell on the next write); derived limits follow the row keys', () => {
    const reg = prep('A262-10', 'filterstufen', [
      { id: '1', label: 'a', stage_role: 'main', filter_type: 'two_layer_filter_trench', system_size: 'small_wwts', sewer: 'separate_sewer', area_m2: 12, l_rieselr_m: 24, t_sicker_h: 5, a_awf_m2: 9 },
      { id: '2', label: 'b', stage_role: 'main', filter_type: 'vf_lava_sand_0_4', system_size: 'municipal_wwtp', sewer: 'combined_sewer', area_m2: 300, l_rieselr_m: 1, t_sicker_h: 5, a_awf_m2: 100 },
    ], EZ4);
    // stored cells are kept as typed (the contract nulls a hidden cell on the next editor write, not here); the Tab. 8 row prints no t_Sicker, Tab. 14 prints ≥ 4
    expect(reg.rows[0].values).toMatchObject({ l_rieselr_m: 24, t_sicker_min: null, a_spez_min: 3, a_min_m2: 12, area_ok: 1, sewer_key: 'tr' });
    expect(reg.rows[1].values).toMatchObject({ t_sicker_h: 5, t_sicker_min: 4, a_awf_m2: 100, a_spez_min: 3, a_min_m2: 12, area_ok: 1, sewer_key: 'm' });
    expect(reg.rows.map((r) => r.complete)).toEqual([true, true]);
    // the row-scope rules parse and hide by the discriminator: a trench row is complete without t_Sicker, a lava/combined row without Σ L_Rieselr
    const cols = cfg('A262-10', 'filterstufen').columns;
    expect(cols.find((c) => c.key === 't_sicker_h')!.visible_when).toBe("system_size == 'municipal_wwtp'");
    expect(cols.find((c) => c.key === 'l_rieselr_m')!.visible_when).toBe("filter_type == 'two_layer_filter_trench'");
    expect(cols.find((c) => c.key === 'a_awf_m2')!.visible_when).toBe("filter_type == 'vf_lava_sand_0_4' AND sewer == 'combined_sewer'");
  });

  it('A262-06-D1…D3: Σ Q_Dr,RÜB over RÜB rows, Σ Q_Dr,RÜ and Σ Q_krit over RÜ rows (Gl. 6 / Gl. 8); q_krit is hidden on RÜB rows', () => {
    const reg = prep('A262-06', 'ueberlaufbauwerke', [
      { id: '1', label: 'RÜB 1', type: 'rueb', q_dr: 100, q_krit: 999 },
      { id: '2', label: 'RÜ 1', type: 'rue', q_dr: 50, q_krit: 30 },
      { id: '3', label: 'RÜ 2', type: 'rue', q_dr: 20, q_krit: 10 },
    ]);
    // the RÜB row's stale q_krit (hidden by type == 'rue') never enters Σ Q_krit — the formulas branch on the discriminator
    expect(reg.rows.map((r) => [r.values.q_krit, r.complete])).toEqual([[999, true], [30, true], [10, true]]);
    expect(computed(run('A262-06-D1', { registers: { ueberlaufbauwerke: reg } }))).toBe(100);
    expect(computed(run('A262-06-D2', { registers: { ueberlaufbauwerke: reg } }))).toBe(70);
    expect(computed(run('A262-06-D3', { registers: { ueberlaufbauwerke: reg } }))).toBe(40);
  });

  it('A262-08-D1 / -D2: the four-out-of-five rule counts the LAST five complete samples (entry order); a missing BSB5 makes the BSB5 count undecidable', () => {
    const rows = [
      { id: '1', date: '2026-01-01', csb: 100, bsb5: 30 }, { id: '2', date: '2026-02-01', csb: 200, bsb5: 50 },
      { id: '3', date: '2026-03-01', csb: 120, bsb5: 20 }, { id: '4', date: '2026-04-01', csb: 90, bsb5: 10 },
      { id: '5', date: '2026-05-01', csb: 160, bsb5: 45 }, { id: '6', date: '2026-06-01', csb: 140, bsb5: 35 },
      { id: '7', date: '2026-07-01', csb: 130, bsb5: 25 },
    ];
    const reg = prep('A262-08', 'ablaufproben', rows);
    expect(computed(run('A262-08-D1', { registers: { ablaufproben: reg } }))).toBe(4); // 120, 90, 160×, 140, 130
    expect(computed(run('A262-08-D2', { registers: { ablaufproben: reg } }))).toBe(4); // 20, 10, 45×, 35, 25
    const partial = prep('A262-08', 'ablaufproben', rows.map((r, i) => (i === 6 ? { id: r.id, date: r.date, csb: r.csb } : r)));
    expect(computed(run('A262-08-D1', { registers: { ablaufproben: partial } }))).toBe(4);
    expect(run('A262-08-D2', { registers: { ablaufproben: partial } }).kind).toBe('manual_required');
    // fewer than five samples: the count runs over what exists (the gate ≥ 4 is STAGED, a262e-G-9)
    expect(computed(run('A262-08-D1', { registers: { ablaufproben: prep('A262-08', 'ablaufproben', rows.slice(0, 2)) } }))).toBe(1);
  });

  it('A262-15-D1 / -D2: Σ length and the longest infiltration pipe (Tab. 8: l_Rieselr ≥ 6 m/P, L_Rieselr ≤ 18 m)', () => {
    const reg = prep('A262-15', 'rieselrohre', [{ id: '1', length_m: 12 }, { id: '2', length_m: 15, width_m: 0.6 }, { id: '3', length_m: 18 }, { id: '4', label: 'ohne Länge' }]);
    expect(reg.rows.map((r) => r.complete)).toEqual([true, true, true, false]);
    expect(computed(run('A262-15-D1', { registers: { rieselrohre: reg } }))).toBe(45);
    expect(computed(run('A262-15-D2', { registers: { rieselrohre: reg } }))).toBe(18);
  });

  it('scalar rules: A_Fo_min = EZ · A_Fo,spez (L804); Q_GW = EW · Q_Grauwasser (L669); A_Fo,spez,GW = 50 % (L1119); A_F = B_CSB · 1000 / f (L937); B_CSB,KomKA = EZ · B_CSB / 1000', () => {
    expect(computed(run('A262-11-D1', { inputs: [{ symbol: 'EZ', value: 4, unit: 'P' }, { symbol: 'A_Fo_spez_VFS_KA', value: 4, unit: 'm²/EW' }] }))).toBe(16);
    expect(computed(run('A262-26-D1', { inputs: [{ symbol: 'EW_Grauwasser', value: 4, unit: 'EW' }, { symbol: 'Q_Grauwasser', value: 80, unit: 'l/(EW·d)' }] }))).toBe(320);
    expect(computed(run('A262-26-D2', { inputs: [{ symbol: 'A_Fo_spez', value: 4, unit: 'm²/P' }] }))).toBe(2);
    expect(computed(run('A262-21-D1', { inputs: [{ symbol: 'B_CSB_KomKA', value: 4.8, unit: 'kg/d' }, { symbol: 'f_A_F_CSB_VFG_KomKA', value: 20, unit: 'g/(m²·d)' }] }))).toBeCloseTo(240, 9);
    expect(computed(run('A262-24-D1', { inputs: [{ symbol: 'EZ', value: 40, unit: 'P' }, { symbol: 'B_CSB', value: 120, unit: 'g/(EW*d)' }] }))).toBeCloseTo(4.8, 9);
    // a missing input is manual_required (the consumer edits a262e-C-6 are STAGED), never a computed 0
    expect(run('A262-26-D2', { inputs: [{ symbol: 'A_Fo_spez', value: null, unit: 'm²/P' }] }).kind).toBe('manual_required');
  });
});
