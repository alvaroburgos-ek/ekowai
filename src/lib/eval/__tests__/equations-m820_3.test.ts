/**
 * Plan 3 Task 9 — DWA-M-820-3 derived-value equations: the emitter accepts every
 * entry, the committed migration equals a fresh emit, and each template computes
 * through the real `evaluateFormula` over rows prepared by the register contract
 * (the catalogue cells looked up from the seeded tables — the TS fallback, no
 * migration applied). Enum cells / inputs reach the exprs as strings (controller
 * amendment D). Pinned: the Y / P / N / NA counts and shares of a 15-item
 * catalogue, the B.2 split (a Nr.-22 row on M8203-12 is outside Teil 1 and does
 * not count; the same row on M8203-13 does), an incomplete row (no rating) is not
 * rated, an empty register counts 0, a missing `items_total` makes the share
 * `manual_required`, the annex sums over the inherited constants (38 / 155), and
 * the Projektstopp codes over 13 / 54 / 67 enum inputs (any `nicht_erreicht` OR
 * `teilweise_erreicht` → 1 — L307 "nicht oder nur unvollständig erreicht", fix
 * round 1 —, all erreicht / nicht_zutreffend → 0, one unset goal → manual_required).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EQUATIONS, PZ_SYMBOLS, PZ_SYMBOLS_A, PZ_SYMBOLS_B, NICHT_ERREICHT, TEILWEISE_ERREICHT, PROJEKTSTOPP_TRIGGER } from '../equations/m820_3';
import { FIELD_CONFIGS, QE_WORKSHEETS, outputSymbols, registerSymbol } from '../field-configs/m820_3';
import { evaluateFormula, type EvalState } from '../formula';
import { prepareRegisterRows } from '../register-rows';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { makeTableLookup, makeTableRows } from '../regulation-tables-fallback';
import { parseNumeric } from '@/lib/expr';
import { emitEquationsSql, equationFilesFor } from '../../../../scripts/regulation-tables/emit-equations-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const STD = 'DWA-M-820-3';
const table = makeTableLookup(STD);
const tableRows = makeTableRows(STD);
const eq = (n: string) => EQUATIONS.find((e) => e.equation_number === n)!;
const rhs = (n: string) => eq(n).formula.replace(/^[A-Za-z_][A-Za-z0-9_]*\s*=\s*/, '');
const cfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: FIELD_CONFIGS.find((f) => f.worksheet === ws && f.symbol === sym)!.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const prep = (ws: string, sym: string, rows: unknown[]) => prepareRegisterRows({ rows }, cfg(ws, sym).columns, { table, tableRows });
type Scalar = { symbol: string; value: number | string | null };
const run = (n: string, registers: Record<string, ReturnType<typeof prep>>, scalars: Scalar[] = []): EvalState => {
  const e = eq(n);
  return evaluateFormula({ equationId: n, formula: e.formula, inputSymbols: e.input_symbols, outputSymbol: e.output_symbol, inputs: scalars.map((s) => ({ symbol: s.symbol, value: s.value, unit: null })) as never, registers, tableLookup: table });
};
const computed = (r: EvalState): number => { expect(r.kind, r.kind === 'manual_required' ? r.reason : r.kind).toBe('computed'); return r.kind === 'computed' ? r.value : NaN; };
const reason = (r: EvalState): string => (r.kind === 'manual_required' ? r.reason : r.kind);
const W07 = QE_WORKSHEETS[0]; // M8203-07 · QE_A1 · 15 items
const W12 = QE_WORKSHEETS[5]; // M8203-12 · QE_B2 Nr. 1–21
const W13 = QE_WORKSHEETS[6]; // M8203-13 · QE_B2 Nr. 22–40

describe('DWA-M-820-3 Plan-3 equations', () => {
  it('115 entries — 9 per QE worksheet from one template (D1–D5 counts, D6–D9 shares) + 3 per annex summary + the overall Projektstopp code; every output is a created field; the emitter accepts them', () => {
    expect(EQUATIONS).toHaveLength(12 * 9 + 7);
    const created = new Set(FIELD_CONFIGS.filter((f) => f.create).map((f) => `${f.worksheet} ${f.symbol}`));
    const registers = new Set(FIELD_CONFIGS.filter((f) => f.widget === 'register').map((f) => `${f.worksheet} ${f.symbol}`));
    for (const e of EQUATIONS) {
      expect(created.has(`${e.worksheet} ${e.output_symbol}`), `${e.worksheet} ${e.output_symbol}`).toBe(true);
      expect(e.description.startsWith('Plan 3:')).toBe(true);
      expect(e.verification_quote?.length ?? 0).toBeGreaterThan(0);
      expect(parseNumeric(rhs(e.equation_number)).ok, e.equation_number).toBe(true);
    }
    for (const w of QE_WORKSHEETS) {
      const o = outputSymbols(w);
      const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => eq(`${w.ws}-D${i}`));
      expect(nums.map((e) => e.output_symbol)).toEqual([o.y, o.p, o.n, o.na, o.rated, o.share_y, o.share_p, o.share_n, o.share_na]);
      for (const e of nums.slice(0, 5)) expect(e.input_symbols).toEqual([registerSymbol(w)]);
      for (const e of nums.slice(5)) expect(e.input_symbols).toEqual([registerSymbol(w), `${w.prefix}_items_total`]);
      expect(registers.has(`${w.ws} ${registerSymbol(w)}`)).toBe(true);
      const cond = w.split ? ' AND in_teil == 1' : '';
      expect(nums[0].formula).toBe(`${o.y} = count_rows(${registerSymbol(w)}, rating == 'y'${cond})`);
      expect(nums[4].formula).toBe(`${o.rated} = count_rows(${registerSymbol(w)}${w.split ? ', in_teil == 1' : ''})`);
      expect(nums[5].formula).toBe(`${o.share_y} = count_rows(${registerSymbol(w)}, rating == 'y'${cond}) * 100 / ${w.prefix}_items_total`);
    }
    // no prod symbol is re-produced: the manual counts, totals, fulfilment rates, verdicts and booleans stay theirs (D-1 / D-2 / F-1 / G-4 staged)
    for (const e of EQUATIONS) expect(/_items_(y|p|n|na|total)$|fulfilment_pct$|_verdict$|^projektstopp_required$|^projektstopp_review_triggered$/.test(e.output_symbol), e.output_symbol).toBe(false);
    expect(new Set(EQUATIONS.map((e) => `${e.worksheet} ${e.output_symbol}`)).size).toBe(EQUATIONS.length);
    expect(PZ_SYMBOLS_A).toHaveLength(13);
    expect(PZ_SYMBOLS_B).toHaveLength(54);
    expect(PZ_SYMBOLS).toHaveLength(67);
    expect(eq('M8203-24-D1').input_symbols).toEqual(PZ_SYMBOLS);
    expect(eq('M8203-22-D1').formula).toBe('gesamt_anhang_a_items_total_calc = qe52_items_total + qe53_items_total + qe54_items_total + qe55_items_total');
    expect(eq('M8203-23-D1').formula).toBe('gesamt_anhang_b_items_total_calc = qe62_items_total + qe63a_items_total + qe63b_items_total + qe64a_items_total + qe64b_items_total + qe65_items_total + qe66_items_total + qe67_items_total');
    expect(() => emitEquationsSql('m820_3', EQUATIONS)).not.toThrow();
  });

  it('the committed equations migration + rollback equal a fresh emit (freshness pin)', () => {
    const { up, down } = emitEquationsSql('m820_3', EQUATIONS);
    const files = equationFilesFor('m820_3', '20260917100920');
    const norm = (s: string) => s.replace(/\r\n/g, '\n');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/^INSERT INTO equations/gm) ?? []).length).toBe(115);
    expect((down.match(/^DELETE FROM equations/gm) ?? []).length).toBe(115);
  });

  it('M8203-07 (A.1, 15 items): counts and shares from the register rows; lookup cells filled from QE_A1; an unrated row is not counted; an empty register counts 0', () => {
    const reg = prep(W07.ws, registerSymbol(W07), [
      { id: 'r1', nr: 'n1', rating: 'y', evidence: 'Zielsetzung §1 des Konzepts' }, { id: 'r2', nr: 'n2', rating: 'y' }, { id: 'r3', nr: 'n3', rating: 'p' },
      { id: 'r4', nr: 'n4', rating: 'n' }, { id: 'r5', nr: 'n5', rating: 'na' }, { id: 'r6', nr: 'n6', rating: 'na' }, { id: 'r7', nr: 'n7', rating: null },
    ]);
    expect(reg.rows.map((r) => r.complete)).toEqual([true, true, true, true, true, true, false]);
    expect(reg.rows[0].values.kriterium).toBe('Ist-Zustand und Zielsetzung formulieren'); // L689
    expect(reg.rows[0].values.hinweise).toBe('Aussagen zu Technik, Ökonomie, Ökologie und Termine');
    expect(reg.rows[6].values.kriterium).toBe('Werkzeuge (Berechnungsmethoden, Softwareeinsatz, Verfahren)'); // L695, filled even on the unrated row
    expect(reg.diagnostics).toBeUndefined();
    const R = { qe52_items: reg };
    expect(computed(run('M8203-07-D1', R))).toBe(2);
    expect(computed(run('M8203-07-D2', R))).toBe(1);
    expect(computed(run('M8203-07-D3', R))).toBe(1);
    expect(computed(run('M8203-07-D4', R))).toBe(2);
    expect(computed(run('M8203-07-D5', R))).toBe(6); // the unrated row is incomplete
    const total = [{ symbol: 'qe52_items_total', value: 15 }];
    expect(computed(run('M8203-07-D6', R, total))).toBeCloseTo(13.333, 3);
    expect(computed(run('M8203-07-D7', R, total))).toBeCloseTo(6.667, 3);
    expect(computed(run('M8203-07-D8', R, total))).toBeCloseTo(6.667, 3);
    expect(computed(run('M8203-07-D9', R, total))).toBeCloseTo(13.333, 3);
    expect(reason(run('M8203-07-D6', R))).toContain('qe52_items_total'); // share needs the printed total
    const empty = { qe52_items: prep(W07.ws, registerSymbol(W07), []) };
    expect(computed(run('M8203-07-D1', empty))).toBe(0);
    expect(computed(run('M8203-07-D5', empty))).toBe(0);
    expect(computed(run('M8203-07-D6', empty, total))).toBe(0);
  });

  it('B.2 split: a Nr.-22 row on M8203-12 (Teil 1, Nr. 1–21) carries in_teil = 0 and is not counted; the same row on M8203-13 (Teil 2) counts; the in_teil badge reads the printed Nr. from QE_B2', () => {
    const rows = [{ id: 'a', nr: 'n1', rating: 'y' }, { id: 'b', nr: 'n21', rating: 'p' }, { id: 'c', nr: 'n22', rating: 'y' }, { id: 'd', nr: 'n40', rating: 'n' }];
    const on12 = prep(W12.ws, registerSymbol(W12), rows);
    const on13 = prep(W13.ws, registerSymbol(W13), rows);
    expect(on12.rows.map((r) => r.values.in_teil)).toEqual([1, 1, 0, 0]);
    expect(on13.rows.map((r) => r.values.in_teil)).toEqual([0, 0, 1, 1]);
    expect(on12.rows[2].values.kriterium).toBe('Schnittstelle zwischen EMSR, Automatisie-rungs- und Maschinentechnik geklärt'); // L833
    expect(computed(run('M8203-12-D1', { qe63a_items: on12 }))).toBe(1);
    expect(computed(run('M8203-12-D2', { qe63a_items: on12 }))).toBe(1);
    expect(computed(run('M8203-12-D5', { qe63a_items: on12 }))).toBe(2);
    expect(computed(run('M8203-13-D1', { qe63b_items: on13 }))).toBe(1);
    expect(computed(run('M8203-13-D3', { qe63b_items: on13 }))).toBe(1);
    expect(computed(run('M8203-13-D5', { qe63b_items: on13 }))).toBe(2);
    expect(computed(run('M8203-12-D6', { qe63a_items: on12 }, [{ symbol: 'qe63a_items_total', value: 21 }]))).toBeCloseTo(4.762, 3);
    expect(computed(run('M8203-13-D6', { qe63b_items: on13 }, [{ symbol: 'qe63b_items_total', value: 19 }]))).toBeCloseTo(5.263, 3);
    // the B.2 lookup_key select groups the printed Leistungsphase headings
    expect(cfg(W12.ws, registerSymbol(W12)).columns[0].lookup).toEqual({ table_code: 'QE_B2', group_by: 'group_label' });
  });

  it('annex sums over the inherited constants (38 / 155); the rated sums need the created outputs in scope (undecidable until C-5)', () => {
    const a = ['qe52_items_total', 'qe53_items_total', 'qe54_items_total', 'qe55_items_total'];
    expect(computed(run('M8203-22-D1', {}, [15, 8, 12, 3].map((v, i) => ({ symbol: a[i], value: v }))))).toBe(38);
    const b = ['qe62_items_total', 'qe63a_items_total', 'qe63b_items_total', 'qe64a_items_total', 'qe64b_items_total', 'qe65_items_total', 'qe66_items_total', 'qe67_items_total'];
    expect(computed(run('M8203-23-D1', {}, [15, 21, 19, 17, 33, 34, 10, 6].map((v, i) => ({ symbol: b[i], value: v }))))).toBe(155);
    expect(reason(run('M8203-22-D2', {}))).toContain('qe52_items_rated');
    expect(computed(run('M8203-22-D2', {}, [3, 4, 5, 6].map((v, i) => ({ symbol: outputSymbols(QE_WORKSHEETS[i]).rated, value: v }))))).toBe(18);
  });

  it('Projektstopp codes: any nicht_erreicht → 1; any teilweise_erreicht → 1 (L307 "nur unvollständig erreicht"); nicht_zutreffend everywhere → 0; one unset goal → manual_required naming it', () => {
    const all = (symbols: readonly string[], overrides: Record<string, string | null> = {}): Scalar[] => symbols.map((s) => ({ symbol: s, value: s in overrides ? overrides[s] : 'erreicht' }));
    expect(computed(run('M8203-22-D3', {}, all(PZ_SYMBOLS_A)))).toBe(0);
    expect(computed(run('M8203-22-D3', {}, all(PZ_SYMBOLS_A, { pz_53_4_status: NICHT_ERREICHT })))).toBe(1);
    expect(computed(run('M8203-22-D3', {}, all(PZ_SYMBOLS_A, { pz_52_1_status: TEILWEISE_ERREICHT })))).toBe(1);
    expect(computed(run('M8203-23-D3', {}, all(PZ_SYMBOLS_B, { pz_64_3_status: TEILWEISE_ERREICHT })))).toBe(1);
    expect(computed(run('M8203-24-D1', {}, all(PZ_SYMBOLS, { pz_67_1_status: TEILWEISE_ERREICHT })))).toBe(1);
    expect(PROJEKTSTOPP_TRIGGER).toBe("IN {'nicht_erreicht', 'teilweise_erreicht'}");
    expect(eq('M8203-24-D1').formula.startsWith("projektstopp_code = if(pz_52_1_status IN {'nicht_erreicht', 'teilweise_erreicht'} OR pz_52_2_status IN {")).toBe(true);
    expect(eq('M8203-22-D3').verification_quote).toBe('Werden Phasenziele nicht oder nur unvollständig erreicht, ist die Prüfung eines Projektstopps erforderlich. Im Rahmen einer Risikoanalyse muss bewertet werden, ob und wie das Projekt fortgeführt werden kann.');
    expect(computed(run('M8203-23-D3', {}, all(PZ_SYMBOLS_B, { pz_67_6_status: NICHT_ERREICHT })))).toBe(1);
    expect(computed(run('M8203-23-D3', {}, PZ_SYMBOLS_B.map((s) => ({ symbol: s, value: 'nicht_zutreffend' }))))).toBe(0);
    expect(computed(run('M8203-24-D1', {}, all(PZ_SYMBOLS)))).toBe(0);
    expect(computed(run('M8203-24-D1', {}, all(PZ_SYMBOLS, { pz_66_9_status: NICHT_ERREICHT })))).toBe(1);
    expect(reason(run('M8203-24-D1', {}, all(PZ_SYMBOLS, { pz_64_12_status: null })))).toContain('pz_64_12_status');
    expect(reason(run('M8203-24-D1', {}, all(PZ_SYMBOLS_A)))).toContain('pz_62_1_status'); // an Anhang-A-only project must set the B goals (nicht_zutreffend)
    expect(NICHT_ERREICHT).toBe('nicht_erreicht');
    expect(TEILWEISE_ERREICHT).toBe('teilweise_erreicht');
  });
});
