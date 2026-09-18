/**
 * Plan 3 Task 16 — DWA-M-1200-2 derived-value equations: the emitter accepts every
 * entry, the committed migration equals a fresh emit, and each formula computes
 * the printed rule through the real `evaluateFormula` over rows prepared by the
 * register contract (Tab. 3 / §3.3.3 / Anhang C / Tab. B.2 / Tab. 6 / §8.2 cells
 * looked up from the seeded tables — the TS fallback, no migration applied).
 * The Anhang C.2 example (L1830–L1832, L1844–L1846, L1858–L1862) is reproduced.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EQUATIONS, orgFormula } from '../equations/m1200_2';
import { FIELD_CONFIGS, ORGANISMEN, ORG_OUTPUTS } from '../field-configs/m1200_2';
import { evaluateFormula, type EvalState } from '../formula';
import { prepareRegisterRows } from '../register-rows';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { makeTableLookup, makeTableRows } from '../regulation-tables-fallback';
import { parseNumeric, type Value } from '@/lib/expr';
import { emitEquationsSql, equationFilesFor } from '../../../../scripts/regulation-tables/emit-equations-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const STD = 'DWA-M-1200-2';
const table = makeTableLookup(STD);
const tableRows = makeTableRows(STD);
const eq = (n: string) => EQUATIONS.find((e) => e.equation_number === n)!;
const bySym = (s: string) => EQUATIONS.find((e) => e.output_symbol === s)!;
const rhs = (e: { formula: string }) => e.formula.replace(/^[A-Za-z_][A-Za-z0-9_]*\s*=\s*/, '');
const cfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: FIELD_CONFIGS.find((f) => f.worksheet === ws && f.symbol === sym)!.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const klasseScope = (klasse: string | null) => (s: string): Value | undefined => (s === 'wassergueteklasse' ? (klasse as Value) : undefined);
const prep = (ws: string, sym: string, rows: unknown[], symbol?: (s: string) => Value | undefined, overrideFlagKey?: string) => prepareRegisterRows({ rows }, cfg(ws, sym).columns, { table, tableRows, symbol }, overrideFlagKey ? { overrideFlagKey } : {});
const run = (e: { equation_number: string; formula: string; input_symbols: string[]; output_symbol: string }, opts: { klasse?: string | null; registers?: Record<string, ReturnType<typeof prep>> }): EvalState => {
  const inputs = e.input_symbols.includes('wassergueteklasse') ? [{ symbol: 'wassergueteklasse', value: opts.klasse ?? null, unit: null }] : [];
  return evaluateFormula({ equationId: e.equation_number, formula: e.formula, inputSymbols: e.input_symbols, outputSymbol: e.output_symbol, inputs, registers: opts.registers, tableLookup: table });
};
const computed = (r: EvalState): number => { expect(r.kind).toBe('computed'); return r.kind === 'computed' ? r.value : NaN; };

/** 16 paired rows for one organism with an exact sample mean and sample standard deviation (8 at m+d, 8 at m−d; sd = d·√(16/15)). */
const sixteen = (organismus: string, mean: number, sd: number, idFrom = 1): Array<Record<string, unknown>> => {
  const d = sd * Math.sqrt(15 / 16);
  return Array.from({ length: 16 }, (_, i) => ({ id: String(idFrom + i), organismus, date: `2024-01-${String(i + 1).padStart(2, '0')}`, x_i: 10 ** (mean + (i < 8 ? d : -d)), y_i: 1 }));
};
const org = (stem: string, key: string) => bySym(ORG_OUTPUTS.find((d) => d.key === key)!.sym(stem));

describe('DWA-M-1200-2 Plan-3 equations', () => {
  it('63 entries; every output is a created field of its worksheet; no prod producer duplicated (Gl. 1 / C.2-1 / C.2-2 / C.2-3 outputs); emitter accepts them', () => {
    expect(EQUATIONS).toHaveLength(63);
    expect(EQUATIONS.filter((e) => e.worksheet === 'M12002-05')).toHaveLength(50);
    expect(EQUATIONS.slice(0, 7).map((e) => e.equation_number)).toEqual(['M12002-02-D1', 'M12002-05-D1', 'M12002-05-D2', 'M12002-05-D3', 'M12002-05-D4', 'M12002-05-D5', 'M12002-05-D6']);
    expect(eq('M12002-05-D50').output_symbol).toBe('perzentil_ok_sulfatreduzierer');
    expect(EQUATIONS.slice(-12).map((e) => e.equation_number)).toEqual(['M12002-06-D1', 'M12002-12-D1', 'M12002-12-D2', 'M12002-12-D3', 'M12002-12-D4', 'M12002-12-D5', 'M12002-12-D6', 'M12002-12-D7', 'M12002-13-D1', 'M12002-13-D2', 'M12002-13-D3', 'M12002-15-D1']);
    const created = new Set(FIELD_CONFIGS.filter((f) => f.create).map((f) => `${f.worksheet} ${f.symbol}`));
    for (const e of EQUATIONS) {
      expect(created.has(`${e.worksheet} ${e.output_symbol}`), `${e.worksheet} ${e.output_symbol}`).toBe(true);
      expect(e.description.startsWith('Plan 3:')).toBe(true);
      expect(e.verification_quote?.length ?? 0).toBeGreaterThan(0);
      expect(e.verification_quote).not.toContain('undefined');
      expect(parseNumeric(rhs(e)).ok, e.equation_number).toBe(true);
      expect(['log10_reduktion', 'perzentil_10_log10', 'perzentil_50_log10', 'lrv_i']).not.toContain(e.output_symbol); // the four prod rows stay the only producers (m1200_2-D-4)
    }
    expect(new Set(EQUATIONS.map((e) => `${e.worksheet} ${e.output_symbol}`)).size).toBe(EQUATIONS.length);
    // the per-organism block is generated in ORGANISMEN × ORG_OUTPUTS order and every formula is self-contained (no other new output as input)
    const outputs = new Set(EQUATIONS.map((e) => e.output_symbol));
    for (const e of EQUATIONS) for (const s of e.input_symbols) expect(outputs.has(s), `${e.equation_number} chains on ${s}`).toBe(false);
    expect(eq('M12002-05-D6').formula).toBe(orgFormula('n', 'e_coli', 'log10_e_coli', 'n_ecoli'));
    expect(eq('M12002-05-D14').formula).toBe(orgFormula('perzentil_ok', 'e_coli', 'log10_e_coli', 'perzentil_ok_ecoli'));
    expect(() => emitEquationsSql('m1200_2', EQUATIONS)).not.toThrow();
  });

  it('the committed migration + rollback equal a fresh emit (freshness pin)', () => {
    const norm = (s: string) => s.replace(/\r\n/g, '\n');
    const { up, down } = emitEquationsSql('m1200_2', EQUATIONS);
    const files = equationFilesFor('m1200_2', '20260917101620');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/ON CONFLICT \(worksheet_template_id, equation_number\) DO NOTHING/g) ?? []).length).toBe(63);
  });

  it('the register reproduces the printed Anhang C.2 example rows: x/y pairs (L1830–L1832) → LRV 6,45 / 6,51 / > 7,16 (L1844–L1846); the below-detection pair counts as reached', () => {
    const reg = prep('M12002-05', 'validierungsproben', [
      { id: '1', organismus: 'somatische_coliphagen', date: '2024-01-01', x_i: 8.4e5, y_i: 0.3 },
      { id: '2', organismus: 'somatische_coliphagen', date: '2024-01-02', x_i: 1.6e6, y_i: 0.5 },
      { id: '3', organismus: 'somatische_coliphagen', date: '2024-01-03', x_i: 7.2e5, y_i: 0.05, below_detection: true }, // y_3 < 0,05 → the detection limit entered as y_i (L1819)
      { id: '4', organismus: 'e_coli', date: '2024-01-01', x_i: 1e6, y_i: 100 },
    ], klasseScope('A'));
    expect(reg.rows.map((r) => [r.values.organismus, Number(r.values.lrv_i).toFixed(2), r.values.ziel, r.values.erreicht, r.values.shortfall, r.complete])).toEqual([
      ['somatische_coliphagen', '6.45', 6, 1, 0, true], ['somatische_coliphagen', '6.51', 6, 1, 0, true], ['somatische_coliphagen', '7.16', 6, 1, 0, true], ['e_coli', '4.00', 5, 0, 1, true],
    ]);
    expect(reg.diagnostics).toBeUndefined();
    expect(computed(run(org('somat_coliphagen', 'n'), { registers: { validierungsproben: reg } }))).toBe(3);
    expect(computed(run(org('somat_coliphagen', 'n_erreicht'), { registers: { validierungsproben: reg } }))).toBe(3);
    expect(computed(run(org('ecoli', 'max_unterschreitung'), { registers: { validierungsproben: reg } }))).toBe(1);
    expect(computed(run(eq('M12002-05-D1'), { registers: { validierungsproben: reg } }))).toBe(4);
    // an organism without rows: count 0, the aggregates undecidable (never a silent 0)
    expect(computed(run(org('clostridium', 'n'), { registers: { validierungsproben: reg } }))).toBe(0);
    expect(run(org('clostridium', 'max_unterschreitung'), { registers: { validierungsproben: reg } }).kind).toBe('manual_required');
    expect(run(org('ecoli', 'sd'), { registers: { validierungsproben: reg } }).kind).toBe('manual_required'); // one row: "mindestens 2 vollständige Zeilen"
    // a missing class driver leaves the target null → the row's badge is null and the counts undecidable
    const noClass = prep('M12002-05', 'validierungsproben', [{ id: '1', organismus: 'e_coli', date: '2024-01-01', x_i: 1e6, y_i: 1 }], klasseScope(null));
    expect(noClass.rows[0].values.ziel).toBeNull();
    expect(run(org('ecoli', 'n_erreicht'), { registers: { validierungsproben: noClass } }).kind).toBe('manual_required');
  });

  it('Anhang C.2 statistics (L1858–L1862): 16 pairs with MW 6,58 and SD 0,30 → 10. Perzentil 6,20 (k = 1,282 from GL_C2_1) ≥ Leistungsziel 6,00; median; perzentil_ok by class', () => {
    const reg = prep('M12002-05', 'validierungsproben', sixteen('somatische_coliphagen', 6.58, 0.30), klasseScope('A'));
    const regs = { validierungsproben: reg };
    expect(computed(run(org('somat_coliphagen', 'mw'), { registers: regs }))).toBeCloseTo(6.58, 6);
    expect(computed(run(org('somat_coliphagen', 'sd'), { registers: regs }))).toBeCloseTo(0.30, 6);
    expect(computed(run(org('somat_coliphagen', 'p10'), { registers: regs }))).toBeCloseTo(6.58 - 1.282 * 0.30, 6); // 6.1954 → prints 6,20
    expect(computed(run(org('somat_coliphagen', 'p50'), { registers: regs }))).toBeCloseTo(6.58, 6);
    expect(computed(run(eq('M12002-05-D5'), {}))).toBe(1.282);
    expect(computed(run(org('somat_coliphagen', 'perzentil_ok'), { klasse: 'A', registers: regs }))).toBe(1);   // 6,20 ≥ 6,00
    expect(computed(run(org('somat_coliphagen', 'perzentil_ok'), { klasse: 'B-1', registers: regs }))).toBe(1); // median 6,58 ≥ 6,00
    // a wider spread: p10 below the target while the median still passes → A fails, B-1 / C-1 pass
    const wide = { validierungsproben: prep('M12002-05', 'validierungsproben', sixteen('somatische_coliphagen', 6.4, 0.5), klasseScope('A')) };
    expect(computed(run(org('somat_coliphagen', 'p10'), { registers: wide }))).toBeCloseTo(6.4 - 1.282 * 0.5, 6); // 5.759 < 6
    expect(computed(run(org('somat_coliphagen', 'perzentil_ok'), { klasse: 'A', registers: wide }))).toBe(0);
    expect(computed(run(org('somat_coliphagen', 'perzentil_ok'), { klasse: 'C-1', registers: wide }))).toBe(1);
    expect(run(org('somat_coliphagen', 'perzentil_ok'), { klasse: 'B-2', registers: wide }).kind).toBe('manual_required'); // no ANHANGC1 row (Tab. 3 "－")
  });

  it('§3.3.3 verdict (L681 / L683): 16 pairs, ≥ 15 (A) / ≥ 8 (B-1, C-1) reached, largest shortfall ≤ 1,0 / 2,0 log10; fewer than 16 pairs or a deeper miss fails; B-2 / C-2 / D undecidable', () => {
    const base = sixteen('e_coli', 6.0, 0.2); // every LRV ≈ 5,8 … 6,2 ≥ 5,0
    const all = { validierungsproben: prep('M12002-05', 'validierungsproben', base, klasseScope('A')) };
    expect(computed(run(org('ecoli', 'n'), { registers: all }))).toBe(16);
    expect(computed(run(org('ecoli', 'n_erreicht'), { registers: all }))).toBe(16);
    expect(computed(run(org('ecoli', 'max_unterschreitung'), { registers: all }))).toBe(0);
    expect(computed(run(org('ecoli', 'validierung_ok'), { klasse: 'A', registers: all }))).toBe(1);
    expect(computed(run(eq('M12002-05-D2'), { klasse: 'A' }))).toBe(15);
    expect(computed(run(eq('M12002-05-D3'), { klasse: 'B-1' }))).toBe(2);
    expect(computed(run(eq('M12002-05-D4'), { klasse: 'C-1' }))).toBe(50);
    expect(run(eq('M12002-05-D2'), { klasse: 'D' }).kind).toBe('manual_required');
    // one miss by 0,5 log10 (LRV 4,5): A still passes (15 of 16, shortfall 0,5 ≤ 1,0)
    const oneMiss = { validierungsproben: prep('M12002-05', 'validierungsproben', [...base.slice(0, 15), { id: '16', organismus: 'e_coli', date: '2024-01-16', x_i: 10 ** 4.5, y_i: 1 }], klasseScope('A')) };
    expect(computed(run(org('ecoli', 'n_erreicht'), { registers: oneMiss }))).toBe(15);
    expect(computed(run(org('ecoli', 'max_unterschreitung'), { registers: oneMiss }))).toBeCloseTo(0.5, 6);
    expect(computed(run(org('ecoli', 'validierung_ok'), { klasse: 'A', registers: oneMiss }))).toBe(1);
    // one miss by 1,5 log10: A fails on the shortfall rule, B-1 passes (≤ 2,0)
    const deepMiss = { validierungsproben: prep('M12002-05', 'validierungsproben', [...base.slice(0, 15), { id: '16', organismus: 'e_coli', date: '2024-01-16', x_i: 10 ** 3.5, y_i: 1 }], klasseScope('A')) };
    expect(computed(run(org('ecoli', 'validierung_ok'), { klasse: 'A', registers: deepMiss }))).toBe(0);
    expect(computed(run(org('ecoli', 'validierung_ok'), { klasse: 'B-1', registers: deepMiss }))).toBe(1);
    // two misses: A fails (14 of 16), B-1 / C-1 pass (≥ 8)
    const twoMiss = { validierungsproben: prep('M12002-05', 'validierungsproben', [...base.slice(0, 14), { id: '15', organismus: 'e_coli', date: '2024-01-15', x_i: 10 ** 4.6, y_i: 1 }, { id: '16', organismus: 'e_coli', date: '2024-01-16', x_i: 10 ** 4.7, y_i: 1 }], klasseScope('A')) };
    expect(computed(run(org('ecoli', 'validierung_ok'), { klasse: 'A', registers: twoMiss }))).toBe(0);
    expect(computed(run(org('ecoli', 'validierung_ok'), { klasse: 'C-1', registers: twoMiss }))).toBe(1);
    // 15 pairs only: fails the N = 16 rule for every class
    const fifteen = { validierungsproben: prep('M12002-05', 'validierungsproben', base.slice(0, 15), klasseScope('A')) };
    expect(computed(run(org('ecoli', 'validierung_ok'), { klasse: 'A', registers: fifteen }))).toBe(0);
    expect(computed(run(org('ecoli', 'validierung_ok'), { klasse: 'B-1', registers: fifteen }))).toBe(0);
    expect(run(org('ecoli', 'validierung_ok'), { klasse: 'B-2', registers: all }).kind).toBe('manual_required');
    // the below-detection flag counts as reached even when x_i / y_i falls short (L681 "< 1 KBE bzw. PFU je 100 ml")
    const nwg = { validierungsproben: prep('M12002-05', 'validierungsproben', [...base.slice(0, 15), { id: '16', organismus: 'e_coli', date: '2024-01-16', x_i: 1e3, y_i: 1, below_detection: true }], klasseScope('A')) };
    expect(computed(run(org('ecoli', 'n_erreicht'), { registers: nwg }))).toBe(16);
    expect(computed(run(org('ecoli', 'validierung_ok'), { klasse: 'A', registers: nwg }))).toBe(1);
  });

  it('M12002-02-D1: validation required for A / B-1 / C-1 (1), not for B-2 / C-2 / D (0)', () => {
    for (const [k, v] of [['A', 1], ['B-1', 1], ['B-2', 0], ['C-1', 1], ['C-2', 0], ['D', 0]] as const) expect(computed(run(eq('M12002-02-D1'), { klasse: k })), k).toBe(v);
    expect(run(eq('M12002-02-D1'), { klasse: null }).kind).toBe('manual_required');
  });

  it('M12002-06-D1 over routineproben_1200_2: per-row Tab.-3 value of the class (Legionella strict "<"), share of compliant samples; without the class every row is "kein Wert" → undecidable (m1200_2-C-1)', () => {
    const rows = [{ id: '1', date: '2024-01-01', parameter: 'e_coli', wert: 5 }, { id: '2', date: '2024-01-02', parameter: 'legionella', wert: 1000 }, { id: '3', date: '2024-01-03', parameter: 'e_coli', wert: 12 }, { id: '4', date: '2024-01-04', parameter: 'truebung', wert: 1.5 }];
    const a = prep('M12002-06', 'routineproben_1200_2', rows, klasseScope('A'));
    expect(a.rows.map((r) => [r.values.limit, r.values.relevant, r.values.ok, r.complete])).toEqual([[10, 1, 1, true], [1000, 1, 0, true], [10, 1, 0, true], [2, 1, 1, true]]);
    expect(computed(run(eq('M12002-06-D1'), { registers: { routineproben_1200_2: a } }))).toBeCloseTo(50, 6);
    const d = prep('M12002-06', 'routineproben_1200_2', [{ id: '1', date: '2024-01-01', parameter: 'e_coli', wert: 5000 }, { id: '2', date: '2024-01-02', parameter: 'enterokokken', wert: 50 }, { id: '3', date: '2024-01-03', parameter: 'truebung', wert: 3 }], klasseScope('D'));
    expect(d.rows.map((r) => [r.values.limit, r.values.relevant, r.values.ok])).toEqual([[10000, 1, 1], [null, 0, 0], [null, 0, 0]]); // D prints "-" for Enterokokken and no Trübung
    expect(computed(run(eq('M12002-06-D1'), { registers: { routineproben_1200_2: d } }))).toBe(100);
    const none = prep('M12002-06', 'routineproben_1200_2', rows, klasseScope(null));
    expect(none.rows.every((r) => r.values.relevant === 0 && r.complete)).toBe(true);
    expect(run(eq('M12002-06-D1'), { registers: { routineproben_1200_2: none } }).kind).toBe('manual_required'); // Division durch Null — never 0 or 100
  });

  it('M12002-12-D1 … -D7 over verfahrenskette_stufen: Tab.-B.2 credits per stage (overridable), Σ per organism group, Tab.-6 / Tab.-4 / Tab.-E.1 hints per stage, comparison with the Tab.-3 target of the class', () => {
    const rows = [
      { id: '1', reihenfolge: 1, stufe: 'biologisch' },                                        // L1754: 2 / 2 / 2
      { id: '2', reihenfolge: 2, stufe: 'mbr', credit_viren: 6, credit_protozoen: 6, credit_bakterien: 5, credit_abweichend: true }, // L1756: 6 / 6 / 6 — bacteria overridden to 5 (reference-plant figure); an overridden row is NOT refilled, all three credits are typed
      { id: '3', reihenfolge: 3, stufe: 'uv' },                                                // L1760: 6 / 6 / 6
    ];
    const reg = prep('M12002-12', 'verfahrenskette_stufen', rows, klasseScope('A'), 'credit_abweichend');
    expect(reg.rows.map((r) => [r.values.credit_viren, r.values.credit_protozoen, r.values.credit_bakterien, r.complete])).toEqual([[2, 2, 2, true], [6, 6, 5, true], [6, 6, 6, true]]);
    expect(reg.rows[0].values.erwartbar_viren).toBe('0,5-1');
    expect(reg.rows[0].values.ueberwachung_online).toBeNull();           // Tab. 6 prints no biological-stage row
    expect(reg.rows[0].values.beispiel_e1).toBe('-');                    // Tab. E.1 L2172
    expect(reg.rows[1].values.ueberwachung_online).toBe('pH-Wert, Sauerstoff im Bioreaktor, Transmembrandruck, Durchfluss, Trübung');
    expect(reg.rows[1].values.ueberwachung_periodisch).toBe('Schlammalter, hydraulischer Verweilzeit, Trockensubstanz (TS) im Belebungsbecken');
    expect(String(reg.rows[1].values.validierung_tab4)).toContain('Stufe 1: Analyse historischer Betriebsdaten');
    expect(String(reg.rows[2].values.beispiel_e1)).toContain('UV-Transmission');
    expect(reg.diagnostics).toBeUndefined();
    // engine fact (register-rows.ts refillLookupValues): the override flag stops the refill of EVERY lookup_value cell of that row — a credit left blank on an overridden row is null and its Σ undecidable
    const partial = prep('M12002-12', 'verfahrenskette_stufen', [{ id: '1', reihenfolge: 1, stufe: 'mbr', credit_bakterien: 5, credit_abweichend: true }], klasseScope('A'), 'credit_abweichend');
    expect([partial.rows[0].values.credit_viren, partial.rows[0].values.credit_bakterien]).toEqual([null, 5]);
    expect(run(eq('M12002-12-D1'), { registers: { verfahrenskette_stufen: partial } }).kind).toBe('manual_required');
    const regs = { verfahrenskette_stufen: reg };
    expect(computed(run(eq('M12002-12-D1'), { registers: regs }))).toBe(14);
    expect(computed(run(eq('M12002-12-D2'), { registers: regs }))).toBe(14);
    expect(computed(run(eq('M12002-12-D3'), { registers: regs }))).toBe(13);
    expect(computed(run(eq('M12002-12-D7'), { registers: regs }))).toBe(3);
    expect(computed(run(eq('M12002-12-D4'), { klasse: 'A', registers: regs }))).toBe(1); // 14 ≥ 6,0
    expect(computed(run(eq('M12002-12-D5'), { klasse: 'A', registers: regs }))).toBe(1); // 14 ≥ 4,0
    expect(computed(run(eq('M12002-12-D6'), { klasse: 'A', registers: regs }))).toBe(1); // 13 ≥ 5,0
    const short = { verfahrenskette_stufen: prep('M12002-12', 'verfahrenskette_stufen', [{ id: '1', reihenfolge: 1, stufe: 'biologisch' }, { id: '2', reihenfolge: 2, stufe: 'chlor' }], klasseScope('A')) }; // 2 + 6 viruses, 2 + 0 protozoa, 2 + 6 bacteria
    expect(computed(run(eq('M12002-12-D2'), { registers: short }))).toBe(2);
    expect(computed(run(eq('M12002-12-D5'), { klasse: 'A', registers: short }))).toBe(0); // 2 < 4,0
    expect(run(eq('M12002-12-D5'), { klasse: 'B-2', registers: short }).kind).toBe('manual_required'); // Tab. 3 prints "－" for B-2
  });

  it('M12002-13-D1 … -D3 over betriebsparameter: Tab.-6 row per stage, online / alarm badges, count of non-online parameters, largest alarm delay over the rows that carry one', () => {
    const rows = [
      { id: '1', stufe: 'mf_uf', parameter: 'Trübung Filtrat', messhaeufigkeit: 'online', fenster_max: 0.2, einheit: 'NTU', alarm_verzoegerung_min: 10 },
      { id: '2', stufe: 'mf_uf', parameter: 'Druckhaltetest', messhaeufigkeit: 'taeglich' },
      { id: '3', stufe: 'uv', parameter: 'UV-Intensität', messhaeufigkeit: 'online', alarm_verzoegerung_min: 45 },
    ];
    const reg = prep('M12002-13', 'betriebsparameter', rows);
    expect(reg.rows.map((r) => [r.values.parameter_online, r.values.frequenz_periodisch, r.values.online_ok, r.values.alarm_ok, r.complete])).toEqual([['Trübung', 'Täglich', 1, 1, true], ['Trübung', 'Täglich', 0, 0, true], ['UV-Intensität, UV-Transmission, Durchfluss', null, 1, 0, true]]);
    const regs = { betriebsparameter: reg };
    expect(computed(run(eq('M12002-13-D1'), { registers: regs }))).toBe(3);
    expect(computed(run(eq('M12002-13-D2'), { registers: regs }))).toBe(1);
    expect(computed(run(eq('M12002-13-D3'), { registers: regs }))).toBe(45);
    expect(run(eq('M12002-13-D3'), { registers: { betriebsparameter: prep('M12002-13', 'betriebsparameter', [rows[1]]) } }).kind).toBe('manual_required'); // no row carries a delay
  });

  it('M12002-15-D1 over kostenpositionen: §8.2 ranges as hints per row, Σ of the engineer\'s own figures', () => {
    const reg = prep('M12002-15', 'kostenpositionen', [{ id: '1', stufe: 'mech_bio', kostenkennwert: 1.2, baupreisindex_jahr: 2024 }, { id: '2', stufe: 'uv', kostenkennwert: 0.1 }, { id: '3', stufe: 'sandfiltration', kostenkennwert: 0.18 }]);
    expect(reg.rows.map((r) => [r.values.richtwert_min, r.values.richtwert_max, r.values.im_richtwertbereich, r.complete])).toEqual([[0.7, 1.6, 1, true], [0.03, 0.06, 0, true], [0.15, 0.2, 1, true]]);
    expect(computed(run(eq('M12002-15-D1'), { registers: { kostenpositionen: reg } }))).toBeCloseTo(1.48, 6);
    expect(run(eq('M12002-15-D1'), { registers: { kostenpositionen: prep('M12002-15', 'kostenpositionen', []) } }).kind).toBe('manual_required');
  });

  it('ORGANISMEN × ORG_OUTPUTS: 5 organisms × 9 outputs, symbol stems and TAB3 columns', () => {
    expect(ORGANISMEN.map((o) => [o.token, o.stem, o.col])).toEqual([
      ['e_coli', 'ecoli', 'log10_e_coli'], ['somatische_coliphagen', 'somat_coliphagen', 'log10_somatische_coliphagen'], ['f_spez_coliphagen', 'fspez_coliphagen', 'log10_f_coliphagen'], ['clostridium', 'clostridium', 'log10_clostridium'], ['sulfatreduzierer', 'sulfatreduzierer', 'log10_sulfatreduzierer'],
    ]);
    expect(ORG_OUTPUTS.map((d) => d.key)).toEqual(['n', 'n_erreicht', 'max_unterschreitung', 'mw', 'sd', 'p10', 'p50', 'validierung_ok', 'perzentil_ok']);
  });
});
