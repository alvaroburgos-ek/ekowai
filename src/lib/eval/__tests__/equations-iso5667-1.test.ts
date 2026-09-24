/**
 * Plan 3 Task 28 — ISO-5667-1 derived-value equations: the emitter accepts every entry, the committed
 * migration equals a fresh emit, and each formula computes through the REAL `evaluateFormula` over
 * rows prepared by the register contract (TS fallback tables, no migration applied).
 *
 * The pins that matter:
 *   - `stdev_rows` is the SAMPLE (n − 1) form, which is the divisor the standard PRINTS at §16.4
 *     ("n −1", PDF p.12) — pinned numerically against a hand-checked fixture AND against the
 *     population form, so a silent engine switch (gap G-4) fails this test.
 *   - the printed §16.5 WORKED EXAMPLE (95 %, σ = 20 % of the mean, L = 10 % of the mean ⇒ n ≈ 61) is
 *     reproduced end-to-end: K comes from the seeded §16.4 table, prod equation 3's stored formula
 *     computes 61,4656 and prod equation 2 inverts it back to L = 10.
 *   - edge cases: an EMPTY register is never a phantom pass; a single row makes s `manual_required`
 *     (s is undefined for n = 1); an incomplete row (no x_i) never counts.
 *   - iso5667_1-F-1: a (aspect, method) pair with no S21 row leaves `method_ok` BLANK and any
 *     aggregate over that column goes `manual_required`. Plan 3 final wave A (defect 5) fixed the
 *     SILENCE, not the verdict: the register now reports the missed S21 row on `lookupMisses`
 *     (NOT on the amber `diagnostics` channel — a row the standard does not print is not an
 *     authoring defect) and the aggregate's message cites it. Both are pinned below.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EQUATIONS } from '../equations/iso5667_1';
import { FIELD_CONFIGS } from '../field-configs/iso5667_1';
import { evaluateFormula, type EvalState } from '../formula';
import { prepareRegisterRows } from '../register-rows';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { makeTableLookup, makeTableRows } from '../regulation-tables-fallback';
import { parseNumeric } from '@/lib/expr';
import { emitEquationsSql, equationFilesFor } from '../../../../scripts/regulation-tables/emit-equations-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const STD = 'ISO-5667-1';
const table = makeTableLookup(STD);
const tableRows = makeTableRows(STD);
const eq = (n: string) => EQUATIONS.find((e) => e.equation_number === n)!;
const rhs = (n: string) => eq(n).formula.replace(/^[A-Za-z_][A-Za-z0-9_]*\s*=\s*/, '');
const cfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: FIELD_CONFIGS.find((f) => f.worksheet === ws && f.symbol === sym)!.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const prep = (ws: string, sym: string, rows: unknown[]) => prepareRegisterRows({ rows }, cfg(ws, sym).columns, { table, tableRows, symbol: () => undefined });
type Input = { symbol: string; value: number | string | null; unit: string | null };
const run = (n: string, opts: { inputs?: Input[]; registers?: Record<string, ReturnType<typeof prep>> }): EvalState => {
  const e = eq(n);
  return evaluateFormula({ equationId: n, formula: e.formula, inputSymbols: e.input_symbols, outputSymbol: e.output_symbol, inputs: opts.inputs ?? [], registers: opts.registers, tableLookup: table });
};
const computed = (r: EvalState): number => { expect(r.kind, JSON.stringify(r)).toBe('computed'); return r.kind === 'computed' ? r.value : NaN; };
const manual = (r: EvalState): string => { expect(r.kind, JSON.stringify(r)).toBe('manual_required'); return r.kind === 'manual_required' ? r.reason : ''; };

describe('ISO-5667-1 Plan-3 equations', () => {
  it('7 entries, every output has a created derived field on its worksheet, every input is that worksheet\'s register, no prod output re-produced (s / L / n keep their rows), no figure typed; emitter accepts them', () => {
    expect(EQUATIONS.map((e) => e.equation_number)).toEqual([
      'ISO-5667-1-02-D1', 'ISO-5667-1-02-D2',
      'ISO-5667-1-05-D1',
      'ISO-5667-1-07-D1', 'ISO-5667-1-07-D2', 'ISO-5667-1-07-D3',
      'ISO-5667-1-08-D1',
    ]);
    const created = new Set(FIELD_CONFIGS.filter((f) => f.create).map((f) => `${f.worksheet} ${f.symbol}`));
    for (const e of EQUATIONS) {
      expect(created.has(`${e.worksheet} ${e.output_symbol}`), `${e.output_symbol} field`).toBe(true);
      for (const s of e.input_symbols) expect(created.has(`${e.worksheet} ${s}`), `${e.equation_number} input ${s}`).toBe(true);
      expect(e.description.startsWith('Plan 3:')).toBe(true);
      expect(e.verification_quote?.length ?? 0).toBeGreaterThan(0);
      expect(e.verification_quote).not.toContain('undefined');
      expect(parseNumeric(rhs(e.equation_number)).ok, e.equation_number).toBe(true);
      // single source: prod equations 1 / 2 / 3 own s, L and n — nothing here re-produces them
      expect(['s', 'L', 'n', 'x_mean', 'K', 'sigma']).not.toContain(e.output_symbol);
      expect(rhs(e.equation_number)).not.toMatch(/\b\d+(\.\d+)?\b/); // no figure typed into a formula
    }
    // iso5667_1-R-1: the brief's `n_required_calc = (2*K*sigma/L)^2` is NOT emitted (prod Gl. 3 owns it)
    expect(EQUATIONS.find((e) => e.output_symbol === 'n_required_calc')).toBeUndefined();
    const { warnings } = emitEquationsSql('iso5667_1', EQUATIONS);
    expect(warnings).toEqual([]);
  });

  it('the committed migration + rollback equal a fresh emit (freshness pin)', () => {
    const norm = (s: string) => s.replace(/\r\n/g, '\n');
    const { up, down } = emitEquationsSql('iso5667_1', EQUATIONS);
    const files = equationFilesFor('iso5667_1', '20260917102820');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/ON CONFLICT \(worksheet_template_id, equation_number\) DO NOTHING/g) ?? []).length).toBe(7);
  });

  it('-07: x̄ / n / s over four results (10 / 20 / 30 / 40) — x̄ = 25, n = 4, s = 12,909944… = the SAMPLE (n − 1) form the standard prints, NOT the population form', () => {
    const rows = [
      { id: 'r1', kennung: 'P-1', datum: '2026-01-05', x_value: 10 },
      { id: 'r2', kennung: 'P-2', datum: '2026-02-05', x_value: 20 },
      { id: 'r3', kennung: 'P-3', datum: '2026-03-05', x_value: 30 },
      { id: 'r4', kennung: 'P-4', datum: '2026-04-05', x_value: 40 },
    ];
    const reg = prep('ISO-5667-1-07', 'historical_results', rows);
    expect(reg.rows.map((r) => r.complete)).toEqual([true, true, true, true]);
    expect(reg.diagnostics ?? []).toEqual([]);
    const registers = { historical_results: reg };
    expect(computed(run('ISO-5667-1-07-D1', { registers }))).toBe(25);
    expect(computed(run('ISO-5667-1-07-D2', { registers }))).toBe(4);
    // Σ(x − x̄)² = 225 + 25 + 25 + 225 = 500; sample: √(500/3) = 12,90994…; population would be √(500/4) = 11,18034…
    const s = computed(run('ISO-5667-1-07-D3', { registers }));
    expect(s).toBeCloseTo(Math.sqrt(500 / 3), 12);
    expect(s).not.toBeCloseTo(Math.sqrt(500 / 4), 6);
  });

  it('-07 edge cases: an EMPTY register is never a phantom pass (n = 0, x̄ / s manual); one row ⇒ s manual ("mindestens 2 vollständige Zeilen"); an incomplete row (x_i missing) never counts', () => {
    const empty = prep('ISO-5667-1-07', 'historical_results', []);
    expect(computed(run('ISO-5667-1-07-D2', { registers: { historical_results: empty } }))).toBe(0);
    expect(manual(run('ISO-5667-1-07-D1', { registers: { historical_results: empty } }))).toContain('Keine vollständigen Zeilen');
    expect(manual(run('ISO-5667-1-07-D3', { registers: { historical_results: empty } }))).toContain('Keine vollständigen Zeilen');

    const one = prep('ISO-5667-1-07', 'historical_results', [{ id: 'r1', kennung: 'P-1', x_value: 10 }]);
    expect(computed(run('ISO-5667-1-07-D1', { registers: { historical_results: one } }))).toBe(10);
    expect(computed(run('ISO-5667-1-07-D2', { registers: { historical_results: one } }))).toBe(1);
    expect(manual(run('ISO-5667-1-07-D3', { registers: { historical_results: one } }))).toBe('stdev_rows(): mindestens 2 vollständige Zeilen erforderlich.');

    // an incomplete row: x_value is the only REQUIRED column — a row without it is skipped everywhere
    const partial = prep('ISO-5667-1-07', 'historical_results', [
      { id: 'r1', kennung: 'P-1', x_value: 10 },
      { id: 'r2', kennung: 'P-2', x_value: 20 },
      { id: 'r3', kennung: 'P-3' },
    ]);
    expect(partial.rows.map((r) => r.complete)).toEqual([true, true, false]);
    expect(computed(run('ISO-5667-1-07-D2', { registers: { historical_results: partial } }))).toBe(2);
    expect(computed(run('ISO-5667-1-07-D1', { registers: { historical_results: partial } }))).toBe(15);
    expect(computed(run('ISO-5667-1-07-D3', { registers: { historical_results: partial } }))).toBeCloseTo(Math.sqrt(50), 12);
  });

  it('the printed §16.5 worked example reproduces end-to-end through the SEEDED K and prod\'s own stored equations 2 / 3: 95 % ⇒ K = 1,96; L = 10, σ = 20 ⇒ n = 61,4656 (printed "n ≈ 61"); the inverse gives L = 10', () => {
    // K from the seeded §16.4 table at the engineer-selected confidence level (SR-2: the level is chosen, never auto-picked)
    const K = table('S16_4_K', ['95'])!.k as number;
    expect(K).toBe(1.96);
    // prod equation 3, formula string captured read-only from prod (id 8b5fc076-c947-447c-aa37-7ebbc3a3a81d)
    const n = computed(evaluateFormula({
      equationId: '3', formula: 'n = (2 * K * sigma / L)^2', inputSymbols: ['K', 'sigma', 'L'], outputSymbol: 'n',
      inputs: [{ symbol: 'K', value: K, unit: null }, { symbol: 'sigma', value: 20, unit: null }, { symbol: 'L', value: 10, unit: null }],
      tableLookup: table,
    }));
    expect(n).toBeCloseTo(61.4656, 10);
    expect(Math.round(n)).toBe(61); // the printed "n ≈ 61"
    // prod equation 2 (id db88161d-3cc3-4541-92bd-4271eba4b0fc) inverts it
    const L = computed(evaluateFormula({
      equationId: '2', formula: 'L = 2 * K * sigma / sqrt(n)', inputSymbols: ['K', 'sigma', 'n'], outputSymbol: 'L',
      inputs: [{ symbol: 'K', value: K, unit: null }, { symbol: 'sigma', value: 20, unit: null }, { symbol: 'n', value: n, unit: null }],
      tableLookup: table,
    }));
    expect(L).toBeCloseTo(10, 10);
    // every seeded K is the printed one
    expect(['99', '98', '95', '90', '80', '68', '50'].map((c) => table('S16_4_K', [c])!.k)).toEqual([2.58, 2.33, 1.96, 1.64, 1.28, 1.0, 0.67]);
  });

  it('-02 / -05 / -08 register counts; the §12.1.2 badge reads the seeded 50 mm; iso5667_1-F-1 (wave A): a pair with no S21 row leaves method_ok BLANK, the register NAMES the missed S21 row on lookupMisses, and the aggregate stays manual_required — now citing why', () => {
    const det = prep('ISO-5667-1-02', 'determinands', [
      { id: 'd1', kennung: 'D-1', parameter: 'Nitrat', variability: 'wide_rapid', target_statistic: 'arithmetic_mean', n_required: 61 },
      { id: 'd2', kennung: 'D-2', parameter: 'CSB', variability: 'stable', target_statistic: 'median', n_required: 12 },
      { id: 'd3', parameter: 'ohne Kennung', n_required: 999 }, // incomplete — never counts
    ]);
    expect(det.rows.map((r) => r.complete)).toEqual([true, true, false]);
    expect(computed(run('ISO-5667-1-02-D1', { registers: { determinands: det } }))).toBe(2);
    expect(computed(run('ISO-5667-1-02-D2', { registers: { determinands: det } }))).toBe(61);

    const sites = prep('ISO-5667-1-05', 'sites_1', [
      { id: 's1', kennung: 'GW-1', situation_type: 'groundwater', well_purged: true, depth_below_ground_m: 12.5 },
      { id: 's2', kennung: 'SW-1', situation_type: 'stormwater', flow_proportional: true },
      { id: 's3', kennung: 'SL-1', situation_type: 'wastewater_sludge', sludge_pipe_dn_mm: 80 },
      { id: 's4', kennung: 'SL-2', situation_type: 'wastewater_sludge', sludge_pipe_dn_mm: 40 },
    ]);
    expect(computed(run('ISO-5667-1-05-D1', { registers: { sites_1: sites } }))).toBe(4);
    // §12.1.2 badge: 80 mm passes, 40 mm fails, a non-sludge row has no diameter ⇒ blank
    expect(sites.rows.map((r) => r.values.sludge_pipe_ok)).toEqual([null, null, 1, 0]);
    expect(sites.diagnostics ?? []).toEqual([]);

    const flow = prep('ISO-5667-1-08', 'flow_measurements', [
      { id: 'f1', kennung: 'Q-1', aspect: 'discharge', method: 'venturi', mode: 'continuous', discharge_measured: 0.12 },
      { id: 'f2', kennung: 'V-1', aspect: 'velocity', method: 'current_meter', mode: 'discrete', velocity_measured: 0.8 },
      { id: 'f3', kennung: 'D-1', aspect: 'direction', method: 'venturi' }, // NOT printed under §21.2 → no S21 row
    ]);
    expect(computed(run('ISO-5667-1-08-D1', { registers: { flow_measurements: flow } }))).toBe(3);
    // F-1: the unprinted pair yields null, NOT 0 — unchanged, and still fail-safe.
    expect(flow.rows.map((r) => r.values.method_ok)).toEqual([1, 1, null]);
    // Plan 3 final wave A (defect 5) UPDATED THIS PIN. It used to assert that the
    // register says NOTHING about the blank (`flow.diagnostics ?? []` → `[]` and a bare
    // `Fehlende Eingabe für count_rows(): method_ok`) — the silence iso5667_1-F-1 was
    // filed against. The register now NAMES the missed S21 row, on its own channel:
    //   - `diagnostics` (the amber authoring-defect warning) stays empty — a table row
    //     the standard does not print is not a misconfiguration;
    //   - `lookupMisses` carries the reason, deduplicated;
    //   - the aggregate's message cites it, so the engineer reads WHY a column they
    //     never fill by hand is undecidable.
    // The VERDICT is deliberately unchanged: still manual_required, never a phantom 0.
    expect(flow.diagnostics ?? []).toEqual([]);
    expect(flow.lookupMisses).toEqual([
      'method_ok: lookup(): keine Zeile in S21 für Schlüssel [direction, venturi] (Spalte valid)',
    ]);
    const counted = evaluateFormula({
      equationId: 'probe-F-1', formula: 'bad = count_rows(flow_measurements, method_ok == 0)',
      inputSymbols: ['flow_measurements'], outputSymbol: 'bad', inputs: [], registers: { flow_measurements: flow }, tableLookup: table,
    });
    expect(counted.kind).toBe('manual_required');
    expect(manual(counted)).toBe(
      'Fehlende Eingabe für count_rows(): method_ok — method_ok: lookup(): keine Zeile in S21 für Schlüssel [direction, venturi] (Spalte valid)',
    );
  });
});
