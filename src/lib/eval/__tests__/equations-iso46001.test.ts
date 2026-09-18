/**
 * Plan 3 Task 22 — ISO-46001 derived-value equations: the emitter accepts every
 * entry, the committed migration equals a fresh emit, and each formula computes
 * through the real `evaluateFormula` over rows prepared by the register
 * contract. The standard prints the FORMS (Formula (C.1) – (C.5), §3.33) and no
 * worked figures beyond the Annex-B scenarios; the pins are the printed forms
 * on chosen inputs, plus the engine facts the design rests on (an empty
 * register is manual_required for Σ and 0 for counts — never a phantom pass;
 * a zero denominator is "Division durch Null"; an incomplete row never enters
 * a Σ / count; an unset checkbox reads false).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EQUATIONS, WIN_EXPR, WOUT_EXPR, PLANT_RATE_EXPR, PROCESS_RATE_EXPR, RECYCLING_ROWS } from '../equations/iso46001';
import { FIELD_CONFIGS } from '../field-configs/iso46001';
import { evaluateFormula, type EvalState } from '../formula';
import { prepareRegisterRows } from '../register-rows';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { makeTableLookup, makeTableRows } from '../regulation-tables-fallback';
import { parseNumeric, type Value } from '@/lib/expr';
import { emitEquationsSql, equationFilesFor } from '../../../../scripts/regulation-tables/emit-equations-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const STD = 'ISO-46001';
const table = makeTableLookup(STD);
const tableRows = makeTableRows(STD);
const eq = (n: string) => EQUATIONS.find((e) => e.equation_number === n)!;
const rhs = (n: string) => eq(n).formula.replace(/^[A-Za-z_][A-Za-z0-9_]*\s*=\s*/, '');
const cfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: FIELD_CONFIGS.find((f) => f.worksheet === ws && f.symbol === sym)!.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const scope = (ws: Record<string, Value>) => (s: string): Value | undefined => (s in ws ? ws[s] : undefined);
const prep = (ws: string, sym: string, rows: unknown[], symbols: Record<string, Value> = {}) => prepareRegisterRows({ rows }, cfg(ws, sym).columns, { table, tableRows, symbol: scope(symbols) });
const run = (n: string, registers: Record<string, ReturnType<typeof prep>>, inputs: Array<{ symbol: string; value: number | null }> = []): EvalState => {
  const e = eq(n);
  return evaluateFormula({ equationId: n, formula: e.formula, inputSymbols: e.input_symbols, outputSymbol: e.output_symbol, inputs: inputs as never, registers, tableLookup: table });
};
const computed = (r: EvalState): number => { expect(r.kind, JSON.stringify(r)).toBe('computed'); return r.kind === 'computed' ? r.value : NaN; };
const manual = (r: EvalState): string => { expect(r.kind, JSON.stringify(r)).toBe('manual_required'); return r.kind === 'manual_required' ? r.reason : ''; };

/** A balance chart: utility 1000 + rain 200 in; sewer 900 + evaporation 250 out; Rp 300 / Rnp 100 / Wp 500 / Rpp 300. */
const STREAMS = [
  { id: 'a', label: 'Versorger', role: 'wd', volume_m3: 1000, source_kind: 'drinking water', meter_verified_on: '2025-03-01' },
  { id: 'b', label: 'Regenwasser', role: 'r_other_source', volume_m3: 200, source_kind: 'rain water' },
  { id: 'c', label: 'Kanal', role: 'output', volume_m3: 900, output_type: 'sewer_discharge', meter_verified_on: '2024-11-30' },
  { id: 'd', label: 'Kühlturm-Verdunstung', role: 'output', volume_m3: 250, output_type: 'evaporation_drift' },
  { id: 'e', label: 'Rp', role: 'rp', volume_m3: 300 },
  { id: 'f', label: 'Rnp', role: 'rnp', volume_m3: 100 },
  { id: 'g', label: 'Wp', role: 'wp', volume_m3: 500 },
  { id: 'h', label: 'Rpp', role: 'rpp', volume_m3: 300 },
];

describe('ISO-46001 Plan-3 equations', () => {
  it('20 entries (one output each), every register-fed row reads a register of its own worksheet, the one scalar row (-04-D1) binds to existing -04 inputs; no prod output re-produced; no typed figure except the printed × 100; emitter accepts them with no lint warning', () => {
    expect(EQUATIONS).toHaveLength(20);
    expect(EQUATIONS.map((e) => e.equation_number)).toEqual([
      'ISO-46001-01-D1', 'ISO-46001-03-D1', 'ISO-46001-03-D2',
      ...Array.from({ length: 6 }, (_, i) => `ISO-46001-04-D${i + 1}`),
      'ISO-46001-05-D1',
      ...Array.from({ length: 8 }, (_, i) => `ISO-46001-08-D${i + 1}`),
      'ISO-46001-10-D1', 'ISO-46001-10-D2',
    ]);
    const created = new Set(FIELD_CONFIGS.filter((f) => f.create).map((f) => `${f.worksheet} ${f.symbol}`));
    const registers = new Set(FIELD_CONFIGS.filter((f) => f.widget === 'register').map((f) => `${f.worksheet} ${f.symbol}`));
    const PROD_OUTPUTS = ['Win', 'Wout', 'plant_recycling_rate', 'process_recycling_rate', 'water_efficiency_indicator', 'baseline_water_efficiency_indicator'];
    for (const e of EQUATIONS) {
      expect(created.has(`${e.worksheet} ${e.output_symbol}`), `${e.output_symbol} field`).toBe(true);
      expect(e.description.startsWith('Plan 3:')).toBe(true);
      expect(e.verification_quote?.length ?? 0).toBeGreaterThan(0);
      expect(e.verification_quote).not.toContain('undefined');
      expect(parseNumeric(rhs(e.equation_number)).ok, e.equation_number).toBe(true);
      expect(PROD_OUTPUTS).not.toContain(e.output_symbol); // C.1 / C.2b / C.3 / C.5 keep their verified rows (R-1 is STAGED)
      if (e.equation_number === 'ISO-46001-04-D1') {
        expect(e.input_symbols).toEqual(['past_present_water_use', 'business_activity_indicator_value']); // amendment K (3): bind to the existing inputs
        expect(e.description).toContain('nicht serverseitig materialisiert');
      } else {
        expect(e.input_symbols).toHaveLength(1);
        expect(registers.has(`${e.worksheet} ${e.input_symbols[0]}`), `${e.equation_number} register input`).toBe(true);
      }
      // no typed figure: the only constants are the printed "× 100 %" of (C.3) / (C.5) and the 0 of the role switches
      expect(rhs(e.equation_number).replace(/, 0\)|\* 100|== false|== true/g, '')).not.toMatch(/\b\d+\b/);
      expect(e.formula).not.toContain('AND ('); // the emitter's legacy CALL regex reads `AND (` as a call
    }
    expect(rhs('ISO-46001-08-D1')).toBe(WIN_EXPR);
    expect(rhs('ISO-46001-08-D2')).toBe(WOUT_EXPR);
    expect(rhs('ISO-46001-08-D3')).toBe(`${WIN_EXPR} - ${WOUT_EXPR}`); // inlined, never chained on Win_calc / Wout_calc
    expect(rhs('ISO-46001-08-D4')).toBe(PLANT_RATE_EXPR);
    expect(rhs('ISO-46001-08-D5')).toBe(PROCESS_RATE_EXPR);
    expect(rhs('ISO-46001-08-D7')).toBe(`count_rows(water_streams, ${RECYCLING_ROWS})`);
    expect(PLANT_RATE_EXPR).toBe("(sum_rows(water_streams, if(role == 'rp', volume_m3, 0)) + sum_rows(water_streams, if(role == 'rnp', volume_m3, 0))) / (sum_rows(water_streams, if(role == 'rp', volume_m3, 0)) + sum_rows(water_streams, if(role == 'rnp', volume_m3, 0)) + sum_rows(water_streams, if(role == 'wd', volume_m3, 0))) * 100");
    expect(PROCESS_RATE_EXPR).toBe("sum_rows(water_streams, if(role == 'rp', volume_m3, 0)) / (sum_rows(water_streams, if(role == 'wp', volume_m3, 0)) + sum_rows(water_streams, if(role == 'rpp', volume_m3, 0))) * 100");
    for (const e of EQUATIONS) for (const m of e.formula.matchAll(/== '([a-z_]+)'|IN \{([^}]+)\}/g)) for (const tok of (m[1] ? [m[1]] : m[2].split(',').map((s) => s.trim().replace(/'/g, '')))) expect(tok, `${e.equation_number} literal ${tok}`).toBe(tok.toLowerCase()); // never the prod symbols WD / Rp / …
    const { warnings } = emitEquationsSql('iso46001', EQUATIONS);
    expect(warnings).toEqual([]);
  });

  it('the committed migration + rollback equal a fresh emit (freshness pin)', () => {
    const norm = (s: string) => s.replace(/\r\n/g, '\n');
    const { up, down } = emitEquationsSql('iso46001', EQUATIONS);
    const files = equationFilesFor('iso46001', '20260917102220');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/ON CONFLICT \(worksheet_template_id, equation_number\) DO NOTHING/g) ?? []).length).toBe(20);
  });

  it('-08 water balance: Win 1200 / Wout 1150 / difference 50 (C.1 "should total water input exceed total water output"); C.3 = (300 + 100) / (300 + 100 + 1000) × 100 = 28,571 %; C.5 = 300 / (500 + 300) × 100 = 37,5 %; counts 8 / 4 recycling / 6 without a meter check; the row badges name the term', () => {
    const reg = prep('ISO-46001-08', 'water_streams', STREAMS);
    expect(reg.rows.map((r) => r.complete)).toEqual([true, true, true, true, true, true, true, true]);
    expect(reg.diagnostics).toBeUndefined();
    expect(reg.rows.map((r) => r.values.balance_term)).toEqual([1, 1, 2, 2, 3, 3, 3, 3]);
    expect(reg.rows[0].values).toMatchObject({ source_kind: 'drinking water', output_type: null }); // the output class is hidden on an input row
    expect(reg.rows[2].values).toMatchObject({ source_kind: '', output_type: 'sewer_discharge' }); // a hidden TEXT cell stores '' (the engine's text null), a hidden ENUM cell null
    const R = { water_streams: reg };
    expect(computed(run('ISO-46001-08-D1', R))).toBe(1200);
    expect(computed(run('ISO-46001-08-D2', R))).toBe(1150);
    expect(computed(run('ISO-46001-08-D3', R))).toBe(50);
    expect(computed(run('ISO-46001-08-D4', R))).toBeCloseTo(28.5714, 3);
    expect(computed(run('ISO-46001-08-D5', R))).toBe(37.5);
    expect(computed(run('ISO-46001-08-D6', R))).toBe(8);
    expect(computed(run('ISO-46001-08-D7', R))).toBe(4);
    expect(computed(run('ISO-46001-08-D8', R))).toBe(6);
  });

  it('-08 edge cases: an empty register is manual_required for the Σ / rates / difference and 0 for the counts (never a phantom balance); output-only rows give Win 0, difference −900 and "Division durch Null" for both rates; a row without its volume or label is incomplete and never counted or summed; a negative volume (min 0) is incomplete', () => {
    const empty = prep('ISO-46001-08', 'water_streams', []);
    for (const n of ['D1', 'D2', 'D3', 'D4', 'D5']) expect(manual(run(`ISO-46001-08-${n}`, { water_streams: empty }))).toMatch(/Keine vollständigen Zeilen/);
    for (const n of ['D6', 'D7', 'D8']) expect(computed(run(`ISO-46001-08-${n}`, { water_streams: empty }))).toBe(0);
    const onlyOut = prep('ISO-46001-08', 'water_streams', [{ id: 'c', label: 'Kanal', role: 'output', volume_m3: 900 }]);
    expect(computed(run('ISO-46001-08-D1', { water_streams: onlyOut }))).toBe(0);
    expect(computed(run('ISO-46001-08-D3', { water_streams: onlyOut }))).toBe(-900);
    expect(manual(run('ISO-46001-08-D4', { water_streams: onlyOut }))).toMatch(/Division durch Null/);
    expect(manual(run('ISO-46001-08-D5', { water_streams: onlyOut }))).toMatch(/Division durch Null/);
    expect(computed(run('ISO-46001-08-D7', { water_streams: onlyOut }))).toBe(0);
    const inc = prep('ISO-46001-08', 'water_streams', [
      { id: 'a', label: 'Versorger', role: 'wd', volume_m3: 1000 },
      { id: 'x', label: 'ohne Menge', role: 'output' },
      { id: 'y', role: 'output', volume_m3: 5 },
      { id: 'z', label: 'negativ', role: 'wd', volume_m3: -5 },
    ]);
    expect(inc.rows.map((r) => r.complete)).toEqual([true, false, false, false]);
    expect(computed(run('ISO-46001-08-D1', { water_streams: inc }))).toBe(1000);
    expect(computed(run('ISO-46001-08-D2', { water_streams: inc }))).toBe(0);
    expect(computed(run('ISO-46001-08-D6', { water_streams: inc }))).toBe(1);
    expect(computed(run('ISO-46001-08-D8', { water_streams: inc }))).toBe(1);
    // a recycling row without Wp / Rpp: C.3 computes, C.5 divides by zero
    const rpOnly = prep('ISO-46001-08', 'water_streams', [{ id: 'a', label: 'Versorger', role: 'wd', volume_m3: 600 }, { id: 'e', label: 'Rp', role: 'rp', volume_m3: 400 }]);
    expect(computed(run('ISO-46001-08-D4', { water_streams: rpOnly }))).toBe(40);
    expect(manual(run('ISO-46001-08-D5', { water_streams: rpOnly }))).toMatch(/Division durch Null/);
    expect(computed(run('ISO-46001-08-D7', { water_streams: rpOnly }))).toBe(1);
  });

  it('-04: §3.33 scalar 1200 m³ / 40 units = 30 (inputs missing ⇒ manual_required, zero ⇒ Division durch Null); significant uses Σ 1000, largest share 60 %, count 3 (a blank m3_per_a is incomplete; Σ 0 ⇒ Division durch Null; empty ⇒ manual_required / 0); the indicator rows compute §3.33 per row and the baseline difference (null without a baseline); sources count', () => {
    const wei = (a: number | null, b: number | null) => run('ISO-46001-04-D1', {}, [{ symbol: 'past_present_water_use', value: a }, { symbol: 'business_activity_indicator_value', value: b }]);
    expect(computed(wei(1200, 40))).toBe(30);
    expect(manual(wei(1200, 0))).toMatch(/Division durch Null/);
    expect(manual(wei(1200, null))).toMatch(/business_activity_indicator_value/);
    const seu = prep('ISO-46001-04', 'significant_uses', [
      { id: '1', activity: 'Cooling tower', facility: 'KT 1', m3_per_a: 600 },
      { id: '2', activity: 'Production kitchen', m3_per_a: 200 },
      { id: '3', activity: 'Toilet', m3_per_a: 200 },
      { id: '4', activity: 'ohne Menge' },
    ]);
    expect(seu.rows.map((r) => r.complete)).toEqual([true, true, true, false]);
    expect(computed(run('ISO-46001-04-D2', { significant_uses: seu }))).toBe(1000);
    expect(computed(run('ISO-46001-04-D3', { significant_uses: seu }))).toBe(60);
    expect(computed(run('ISO-46001-04-D4', { significant_uses: seu }))).toBe(3);
    const zero = prep('ISO-46001-04', 'significant_uses', [{ id: '1', activity: 'x', m3_per_a: 0 }]);
    expect(manual(run('ISO-46001-04-D3', { significant_uses: zero }))).toMatch(/Division durch Null/);
    const none = prep('ISO-46001-04', 'significant_uses', []);
    expect(manual(run('ISO-46001-04-D2', { significant_uses: none }))).toMatch(/Keine vollständigen Zeilen/);
    expect(manual(run('ISO-46001-04-D3', { significant_uses: none }))).toMatch(/Keine vollständigen Zeilen/);
    expect(computed(run('ISO-46001-04-D4', { significant_uses: none }))).toBe(0);
    const ind = prep('ISO-46001-04', 'indicators_46001', [
      { id: '1', indicator: 'Number of units produced', unit: 'units', period: '2025', activity_value: 40, water_used_m3: 1200, baseline: 35 },
      { id: '2', indicator: 'number of guestrooms', activity_value: 100, water_used_m3: 500 },
      { id: '3', indicator: 'zero', activity_value: 0, water_used_m3: 500 },
    ]);
    expect(ind.rows.map((r) => [r.complete, r.values.value, r.values.delta_vs_baseline])).toEqual([[true, 30, -5], [true, 5, null], [true, null, null]]);
    expect(ind.diagnostics).toBeUndefined();
    expect(computed(run('ISO-46001-04-D6', { indicators_46001: ind }))).toBe(3);
    const src = prep('ISO-46001-04', 'water_sources_46001', [{ id: '1', source: 'Stadtwerke', source_class: 'utility' }, { id: '2', source: 'Zisterne', source_class: 'other_source', kind: 'rain water', m3_per_a: 200 }, { id: '3' }]);
    expect(src.rows.map((r) => r.complete)).toEqual([true, true, false]);
    expect(computed(run('ISO-46001-04-D5', { water_sources_46001: src }))).toBe(2);
  });

  it('-01 / -03 / -05 / -10 counts: parties 2; objectives 2 (a row without its objective text is incomplete); legal requirements 1; targets 1 of 2 (a target without its time frame is incomplete, §6.3); nonconformities 3 with 2 open (an unset "closed" box is open)', () => {
    expect(computed(run('ISO-46001-01-D1', { interested_parties_46001: prep('ISO-46001-01', 'interested_parties_46001', [{ id: '1', party: 'Wasserversorger', requirement: 'Abnahmevertrag' }, { id: '2', party: 'Behörde' }]) }))).toBe(2);
    expect(computed(run('ISO-46001-03-D1', { objectives: prep('ISO-46001-03', 'objectives', [{ id: '1', objective: '−10 % Wasser je Einheit', what: 'Kühlturm-Optimierung', deadline: '2026-12-31' }, { id: '2', objective: 'Leckagen 0' }, { id: '3', what: 'ohne Ziel' }]) }))).toBe(2);
    expect(computed(run('ISO-46001-03-D2', { legal_requirements: prep('ISO-46001-03', 'legal_requirements', [{ id: '1', requirement: 'Wasserentnahmeerlaubnis', source: 'WHG', review_date: '2026-01-15' }]) }))).toBe(1);
    const tg = prep('ISO-46001-05', 'targets', [{ id: '1', target: '5 % weniger Kühlwasser', time_frame: '2026', responsibility: 'Betriebsleitung' }, { id: '2', target: 'ohne Zeitrahmen' }]);
    expect(tg.rows.map((r) => r.complete)).toEqual([true, false]);
    expect(computed(run('ISO-46001-05-D1', { targets: tg }))).toBe(1);
    const nc = prep('ISO-46001-10', 'nonconformities', [{ id: '1', nc: 'Zähler defekt', closed: true }, { id: '2', nc: 'Leckage Halle 2', cause: 'Korrosion', action: 'Leitung ersetzt', effectiveness_reviewed: true }, { id: '3', nc: 'Fehlende Ablesung', closed: false }]);
    expect(computed(run('ISO-46001-10-D1', { nonconformities: nc }))).toBe(3);
    expect(computed(run('ISO-46001-10-D2', { nonconformities: nc }))).toBe(2);
    expect(computed(run('ISO-46001-10-D2', { nonconformities: prep('ISO-46001-10', 'nonconformities', []) }))).toBe(0);
  });
});
