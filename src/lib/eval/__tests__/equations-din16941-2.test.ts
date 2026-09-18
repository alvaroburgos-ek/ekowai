/**
 * Plan 3 Task 15 — DIN-EN-16941-2 derived-value equations: the emitter accepts
 * every entry, the committed migration equals a fresh emit, and each formula
 * computes through the real `evaluateFormula` over rows prepared by the
 * register contract (TS fallback tables, no migration applied). The standard
 * prints no numeric worked example; every pin is hand-derived from the printed
 * Gl. (1) / Gl. (2) forms, Tab. A.1 (60 / 35 / 15 / 10), §6.1 (min, 50 %),
 * §5.5.2 (2 · D, 20 mm) and the Anhang-D Richtwerte / status bands.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EQUATIONS } from '../equations/din16941_2';
import { FIELD_CONFIGS } from '../field-configs/din16941_2';
import { evaluateFormula, type EvalState } from '../formula';
import { prepareRegisterRows } from '../register-rows';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { makeTableLookup, makeTableRows } from '../regulation-tables-fallback';
import { parseNumeric, type Value } from '@/lib/expr';
import { emitEquationsSql, equationFilesFor } from '../../../../scripts/regulation-tables/emit-equations-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const STD = 'DIN-EN-16941-2';
const W = (n: string) => `DIN-EN-16941-2-0${n}`;
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

// A four-person household: shower 10 l/min · 5 min · 1/(p·d), bath 100 l · 0,2, washbasin 4 l/min · 0,5 min · 3, washing machine 45 l · 0,25 (Tab. A.2 hints 5–15 / 70–200 / 30–60; washbasin has no printed row)
const QUELLEN = [
  { id: '1', quelle: 'dusche', q_or_v: 10, t_x: 5, u_x: 1 },
  { id: '2', quelle: 'badewanne', q_or_v: 100, u_x: 0.2 },
  { id: '3', quelle: 'waschbecken', q_or_v: 4, t_x: 0.5, u_x: 3 },
  { id: '4', quelle: 'waschmaschine', q_or_v: 45, u_x: 0.25 },
];
// WC 6 l · 4/(p·d), urinal 1,5 l · 2, washing machine 45 l · 0,25 (Tab. A.3 hints 3–8 / 1–2 / 30–60)
const BEDARF = [
  { id: '1', bezeichnung: 'WC EG', bedarf: 'wc', v_x: 6, u_x: 4 },
  { id: '2', bezeichnung: 'Urinal', bedarf: 'urinal', v_x: 1.5, u_x: 2 },
  { id: '3', bezeichnung: 'Waschmaschine', bedarf: 'waschmaschine', v_x: 45, u_x: 0.25 },
];

describe('DIN-EN-16941-2 Plan-3 equations', () => {
  it('15 entries, every output has a created field on its worksheet, every RHS parses, single-source (Gl. 1 / 2 keep Y_G / D_G); emitter accepts them', () => {
    expect(EQUATIONS.map((e) => e.equation_number)).toEqual([
      'DIN-EN-16941-2-02-D1', 'DIN-EN-16941-2-02-D2', 'DIN-EN-16941-2-02-D3',
      'DIN-EN-16941-2-03-D1', 'DIN-EN-16941-2-03-D2', 'DIN-EN-16941-2-03-D3', 'DIN-EN-16941-2-03-D4', 'DIN-EN-16941-2-03-D5', 'DIN-EN-16941-2-03-D6', 'DIN-EN-16941-2-03-D7', 'DIN-EN-16941-2-03-D8',
      'DIN-EN-16941-2-04-D1', 'DIN-EN-16941-2-04-D2', 'DIN-EN-16941-2-04-D3', 'DIN-EN-16941-2-04-D4',
    ]);
    const created = new Set(FIELD_CONFIGS.filter((f) => f.create).map((f) => `${f.worksheet} ${f.symbol}`));
    for (const e of EQUATIONS) {
      expect(created.has(`${e.worksheet} ${e.output_symbol}`), `${e.output_symbol} field`).toBe(true);
      expect(e.description.startsWith('Plan 3:')).toBe(true);
      expect(e.verification_quote?.length ?? 0).toBeGreaterThan(0);
      expect(e.verification_quote).not.toContain('undefined');
      expect(parseNumeric(rhs(e.equation_number)).ok, e.equation_number).toBe(true);
      expect(['Y_G', 'D_G', 'bemessungswert_massgebend', 'nennkapazitaet', 'bewertung_status']).not.toContain(e.output_symbol);
    }
    const { warnings } = emitEquationsSql('din16941_2', EQUATIONS);
    expect(warnings).toEqual([]);
  });

  it('the committed migration + rollback equal a fresh emit (freshness pin)', () => {
    const norm = (s: string) => s.replace(/\r\n/g, '\n');
    const { up, down } = emitEquationsSql('din16941_2', EQUATIONS);
    const files = equationFilesFor('din16941_2', '20260917101520');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/ON CONFLICT \(worksheet_template_id, equation_number\) DO NOTHING/g) ?? []).length).toBe(15);
  });

  it('Gl. (1) over rows: Q·t·u for Dusche / Waschbecken (t column visible, required), V·u for Badewanne / Waschmaschine; 4 · (50 + 20 + 6 + 11,25) = 349 l/d; hint badges from Tab. A.2 (none for Waschbecken); a flow-based row without t is incomplete', () => {
    const reg = prep(W('3'), 'grauwasserquellen_16941', QUELLEN);
    expect(reg.diagnostics).toBeUndefined();
    expect(reg.rows.map((r) => r.complete)).toEqual([true, true, true, true]);
    expect(reg.rows.map((r) => r.values.mit_dauer)).toEqual([1, 0, 1, 0]);
    expect(reg.rows.map((r) => r.values.hint)).toEqual(['5 bis 15', '70 bis 200', null, '30 bis 60']);
    expect(reg.rows.map((r) => r.values.ertrag_row)).toEqual([50, 20, 6, 11.25]);
    expect(reg.rows.map((r) => r.values.in_hint)).toEqual([1, 1, null, 1]);
    expect(computed(run('DIN-EN-16941-2-03-D1', { inputs: [num('n', 4, 'p')], registers: { grauwasserquellen_16941: reg } }))).toBe(349);
    expect(computed(run('DIN-EN-16941-2-03-D2', { registers: { grauwasserquellen_16941: reg } }))).toBe(4);
    const noT = prep(W('3'), 'grauwasserquellen_16941', [{ id: '1', quelle: 'dusche', q_or_v: 10, u_x: 1 }, { id: '2', quelle: 'kuechenspuele', q_or_v: 20, t_x: 2, u_x: 1 }]);
    expect(noT.rows.map((r) => r.complete)).toEqual([false, true]);
    expect(noT.rows[1].values.in_hint).toBe(0); // 20 l/min is outside 5 bis 15 — a badge, never a limit (SR-2)
    expect(computed(run('DIN-EN-16941-2-03-D1', { inputs: [num('n', 2, 'p')], registers: { grauwasserquellen_16941: noT } }))).toBe(80); // only the complete row
    expect(run('DIN-EN-16941-2-03-D1', { inputs: [num('n', 4, 'p')], registers: { grauwasserquellen_16941: prep(W('3'), 'grauwasserquellen_16941', []) } }).kind).toBe('manual_required');
    expect(computed(run('DIN-EN-16941-2-03-D2', { registers: { grauwasserquellen_16941: prep(W('3'), 'grauwasserquellen_16941', []) } }))).toBe(0);
  });

  it('Gl. (2) over rows: n · Σ V·u + V_misc — 4 · (24 + 3 + 11,25) + 20 = 173 l/d; the Tab.-A.3 hint fills per row; V_misc missing ⇒ manual_required (as prod Gl. 2)', () => {
    const reg = prep(W('3'), 'bedarfsstellen', BEDARF);
    expect(reg.diagnostics).toBeUndefined();
    expect(reg.rows.map((r) => r.values.hint)).toEqual(['3 bis 8', '1 bis 2', '30 bis 60']);
    expect(reg.rows.map((r) => r.values.bedarf_row)).toEqual([24, 3, 11.25]);
    expect(reg.rows.map((r) => r.values.in_hint)).toEqual([1, 1, 1]);
    expect(computed(run('DIN-EN-16941-2-03-D3', { inputs: [num('n', 4, 'p'), num('V_misc', 20, 'l/d')], registers: { bedarfsstellen: reg } }))).toBe(173);
    expect(run('DIN-EN-16941-2-03-D3', { inputs: [num('n', 4, 'p'), num('V_misc', null, 'l/d')], registers: { bedarfsstellen: reg } }).kind).toBe('manual_required');
    expect(computed(run('DIN-EN-16941-2-03-D4', { registers: { bedarfsstellen: reg } }))).toBe(3);
  });

  it('Tab. A.1 twins (vereinfacht): Y_G = 60 · n; D_G = n · (35 | 15 | 10) by the single-select vorgesehene_nutzung (J-1) — 4 persons: 240 / 140 / 60 / 40 / 40', () => {
    expect(computed(run('DIN-EN-16941-2-03-D5', { inputs: [num('n', 4, 'p')] }))).toBe(240);
    for (const [use, expected] of [['wc_spuelung', 140], ['waesche', 60], ['gartenbewaesserung', 40], ['reinigung', 40]] as const) {
      expect(computed(run('DIN-EN-16941-2-03-D6', { inputs: [num('n', 4, 'p'), num('vorgesehene_nutzung', use)] })), use).toBe(expected);
    }
    expect(run('DIN-EN-16941-2-03-D6', { inputs: [num('n', 4, 'p'), num('vorgesehene_nutzung', null)] }).kind).toBe('manual_required');
  });

  it('§6.1: bemessungswert_massgebend_calc = min(Y_G, D_G) = 173 for 349 / 173; speicher_max_50 = 0,5 · D_G = 86,5 l', () => {
    expect(computed(run('DIN-EN-16941-2-03-D7', { inputs: [num('Y_G', 349, 'l/d'), num('D_G', 173, 'l/d')] }))).toBe(173);
    expect(computed(run('DIN-EN-16941-2-03-D7', { inputs: [num('Y_G', 100, 'l/d'), num('D_G', 173, 'l/d')] }))).toBe(100);
    expect(computed(run('DIN-EN-16941-2-03-D8', { inputs: [num('D_G', 173, 'l/d')] }))).toBe(86.5);
  });

  it('-02: Σ Nennkapazität 1500 + 2500 = 4000 l over two connected tanks, count 2; freier Auslauf A = max(2 · D, 20): D 8 mm → 20 mm, D 25 mm → 50 mm', () => {
    const reg = prep(W('2'), 'speichereinrichtungen', [{ id: '1', bezeichnung: 'Tank 1', werkstoff: 'pe', nennkapazitaet_l: 1500 }, { id: '2', bezeichnung: 'Tank 2', werkstoff: 'pe', nennkapazitaet_l: 2500 }]);
    expect(reg.rows.map((r) => r.complete)).toEqual([true, true]);
    expect(computed(run('DIN-EN-16941-2-02-D1', { registers: { speichereinrichtungen: reg } }))).toBe(4000);
    expect(computed(run('DIN-EN-16941-2-02-D2', { registers: { speichereinrichtungen: reg } }))).toBe(2);
    expect(computed(run('DIN-EN-16941-2-02-D3', { inputs: [num('D_zulauf', 8, 'mm')] }))).toBe(20);
    expect(computed(run('DIN-EN-16941-2-02-D3', { inputs: [num('D_zulauf', 25, 'mm')] }))).toBe(50);
  });

  it('Probenahmen (WC-Spülung column): E. coli 100 / 300 / 2600 vs G 250 → grün / gelb / rot (Tab. D.3 bands < G, G bis 10 G, > 10 G); pH 7 in range → grün; Trübung 12 ≥ 10 → gelb; unmeasured Chlor / Brom ⇒ n. a.; Legionella hidden (N/A) ⇒ 0; counts rot 1 / gelb 1; last sample rot', () => {
    const samples = [
      { id: '1', datum: '2026-09-01', ecoli: 100, enterokokken: 50, coliforme: 500, truebung: 5, ph: 7 },
      { id: '2', datum: '2026-09-08', ecoli: 300, enterokokken: 50, coliforme: 500, truebung: 12, ph: 7 },
      { id: '3', datum: '2026-09-15', ecoli: 2600, enterokokken: 50, coliforme: 500, truebung: 5, ph: 7, rest_chlor: 1, rest_brom: 1 },
    ];
    const reg = prep(W('4'), 'probenahmen', samples, { richtwert_spalte: 'wc_spuelung' });
    expect(reg.diagnostics).toBeUndefined();
    expect(reg.rows.map((r) => r.complete)).toEqual([true, true, true]);
    expect(reg.rows.map((r) => r.values.status_ecoli)).toEqual([1, 2, 3]);
    expect(reg.rows.map((r) => r.values.status_enterokokken)).toEqual([1, 1, 1]); // 50 < 100
    expect(reg.rows.map((r) => r.values.status_legionella)).toEqual([0, 0, 0]); // N/A outside Sprühanwendung
    expect(reg.rows.map((r) => r.values.status_coliforme)).toEqual([1, 1, 1]); // 500 < 1000
    expect(reg.rows.map((r) => r.values.status_truebung)).toEqual([1, 2, 1]);
    expect(reg.rows.map((r) => r.values.status_ph)).toEqual([1, 1, 1]);
    expect(reg.rows.map((r) => r.values.status_chlor)).toEqual([0, 0, 1]); // 1 < 2,0
    expect(reg.rows.map((r) => r.values.status_brom)).toEqual([0, 0, 1]); // 1 < 5,0
    expect(reg.rows.map((r) => r.values.status_max)).toEqual([1, 2, 3]);
    expect(computed(run('DIN-EN-16941-2-04-D1', { registers: { probenahmen: reg } }))).toBe(3);
    expect(computed(run('DIN-EN-16941-2-04-D2', { registers: { probenahmen: reg } }))).toBe(1);
    expect(computed(run('DIN-EN-16941-2-04-D3', { registers: { probenahmen: reg } }))).toBe(1);
    expect(computed(run('DIN-EN-16941-2-04-D4', { registers: { probenahmen: reg } }))).toBe(3);
    expect(computed(run('DIN-EN-16941-2-04-D1', { registers: { probenahmen: prep(W('4'), 'probenahmen', [], { richtwert_spalte: 'wc_spuelung' }) } }))).toBe(0);
    expect(run('DIN-EN-16941-2-04-D4', { registers: { probenahmen: prep(W('4'), 'probenahmen', [], { richtwert_spalte: 'wc_spuelung' }) } }).kind).toBe('manual_required');
  });

  it('Probenahmen (Sprühanwendung column): "Nicht nachweisbar" — 0 KBE grün, any detection rot (J-2); Legionella required and banded against 10; Rest-Brom "0,0" — 0 grün, 0,1 gelb (J-3); Gartenbewässerung: Trübung N/A ⇒ 0, Chlor < 0,5; missing driver ⇒ statuses null, rows incomplete (Legionella pending-visible), Σ over the last row manual_required', () => {
    const sprueh = prep(W('4'), 'probenahmen', [
      { id: '1', datum: '2026-09-01', ecoli: 0, enterokokken: 0, legionella: 5, coliforme: 5, truebung: 5, ph: 7, rest_brom: 0 },
      { id: '2', datum: '2026-09-08', ecoli: 1, enterokokken: 0, legionella: 50, coliforme: 200, truebung: 5, ph: 10, rest_brom: 0.1 },
    ], { richtwert_spalte: 'sprueh' });
    expect(sprueh.rows.map((r) => r.complete)).toEqual([true, true]);
    expect(sprueh.rows.map((r) => r.values.status_ecoli)).toEqual([1, 3]);
    expect(sprueh.rows.map((r) => r.values.status_legionella)).toEqual([1, 2]); // 5 < 10; 50 ≤ 100
    expect(sprueh.rows.map((r) => r.values.status_coliforme)).toEqual([1, 3]); // 5 < 10; 200 > 100
    expect(sprueh.rows.map((r) => r.values.status_ph)).toEqual([1, 2]); // 10 > 9,5
    expect(sprueh.rows.map((r) => r.values.status_brom)).toEqual([1, 2]);
    expect(sprueh.rows.map((r) => r.values.status_max)).toEqual([1, 3]);
    const noLeg = prep(W('4'), 'probenahmen', [{ id: '1', datum: '2026-09-01', ecoli: 0, enterokokken: 0, coliforme: 5, truebung: 5, ph: 7 }], { richtwert_spalte: 'sprueh' });
    expect(noLeg.rows[0].complete).toBe(false); // Legionella is required under Sprühanwendung
    const garten = prep(W('4'), 'probenahmen', [{ id: '1', datum: '2026-09-01', ecoli: 100, enterokokken: 50, coliforme: 500, ph: 7, rest_chlor: 0.6 }], { richtwert_spalte: 'gartenbewaesserung' });
    expect(garten.rows[0].complete).toBe(true); // Trübung hidden (N/A) and not required
    expect(garten.rows[0].values.status_truebung).toBe(0);
    expect(garten.rows[0].values.status_chlor).toBe(2); // 0,6 ≥ 0,5
    expect(garten.rows[0].values.status_max).toBe(2);
    const noDriver = prep(W('4'), 'probenahmen', [{ id: '1', datum: '2026-09-01', ecoli: 100, enterokokken: 50, coliforme: 500, truebung: 5, ph: 7 }], {});
    expect(noDriver.rows[0].values.status_max).toBeNull();
    expect(noDriver.rows[0].complete).toBe(false); // legionella's visible_when is pending without the driver ⇒ visible and required ⇒ the row does not count
    expect(computed(run('DIN-EN-16941-2-04-D2', { registers: { probenahmen: noDriver } }))).toBe(0);
    expect(run('DIN-EN-16941-2-04-D4', { registers: { probenahmen: noDriver } }).kind).toBe('manual_required');
  });
});
