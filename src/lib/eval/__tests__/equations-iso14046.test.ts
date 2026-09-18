/**
 * Plan 3 Task 26 — ISO-14046 derived-value equations: the emitter accepts every
 * entry, the committed migration equals a fresh emit, and each formula computes
 * through the real `evaluateFormula` over rows prepared by the register contract.
 * The standard prints no worked example (a principles / requirements document; no
 * table — grep in the report); the pins are chosen rows, incl. the edge cases: an
 * EMPTY register is never a phantom pass (the Σ rows read manual_required, the
 * counts 0, the ≥ 3 verdict 0), an incomplete row never counts, a row of the other
 * direction contributes 0, an unset boolean cell reads false.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EQUATIONS, PANEL_MIN_MEMBERS } from '../equations/iso14046';
import { FIELD_CONFIGS, RESOURCE_TYPES } from '../field-configs/iso14046';
import { Q } from '../regulation-tables-quotes-iso14046';
import { evaluateFormula, type EvalState } from '../formula';
import { prepareRegisterRows } from '../register-rows';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { makeTableLookup, makeTableRows } from '../regulation-tables-fallback';
import { parseNumeric } from '@/lib/expr';
import { emitEquationsSql, equationFilesFor } from '../../../../scripts/regulation-tables/emit-equations-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const STD = 'ISO-14046';
const table = makeTableLookup(STD);
const tableRows = makeTableRows(STD);
const eq = (n: string) => EQUATIONS.find((e) => e.equation_number === n)!;
const rhs = (n: string) => eq(n).formula.replace(/^[A-Za-z_][A-Za-z0-9_]*\s*=\s*/, '');
const cfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: FIELD_CONFIGS.find((f) => f.worksheet === ws && f.symbol === sym)!.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const prep = (ws: string, sym: string, rows: unknown[]) => prepareRegisterRows({ rows }, cfg(ws, sym).columns, { table, tableRows, symbol: () => undefined });
const run = (n: string, registers: Record<string, ReturnType<typeof prep>>): EvalState => {
  const e = eq(n);
  return evaluateFormula({ equationId: n, formula: e.formula, inputSymbols: e.input_symbols, outputSymbol: e.output_symbol, inputs: [], registers, tableLookup: table });
};
const computed = (r: EvalState): number => { expect(r.kind, JSON.stringify(r)).toBe('computed'); return r.kind === 'computed' ? r.value : NaN; };
const manual = (r: EvalState): string => { expect(r.kind, JSON.stringify(r)).toBe('manual_required'); return r.kind === 'manual_required' ? r.reason : ''; };

describe('ISO-14046 Plan-3 equations', () => {
  it('15 entries: 10 on -03 (flows), 1 on -04 (LCI × CF), 1 on -05 (issues), 3 on -07 (panel); every output a created derived field of its own worksheet; the only input the register of that worksheet; no prod output re-produced (EQ-01 stays); the only figure is the printed "tres" (§7.4); emitter accepts them', () => {
    expect(EQUATIONS.map((e) => e.equation_number)).toEqual([
      'ISO-14046-03-D1', 'ISO-14046-03-D2', 'ISO-14046-03-D3', 'ISO-14046-03-D4', 'ISO-14046-03-D5', 'ISO-14046-03-D6', 'ISO-14046-03-D7', 'ISO-14046-03-D8', 'ISO-14046-03-D9', 'ISO-14046-03-D10',
      'ISO-14046-04-D1', 'ISO-14046-05-D1', 'ISO-14046-07-D1', 'ISO-14046-07-D2', 'ISO-14046-07-D3',
    ]);
    const created = new Set(FIELD_CONFIGS.filter((f) => f.create).map((f) => `${f.worksheet} ${f.symbol}`));
    const registerOf: Record<string, string> = { 'ISO-14046-03': 'elementary_flows', 'ISO-14046-04': 'lci_cf_rows', 'ISO-14046-05': 'significant_issues_14046', 'ISO-14046-07': 'review_panel' };
    for (const e of EQUATIONS) {
      expect(created.has(`${e.worksheet} ${e.output_symbol}`), `${e.output_symbol} field`).toBe(true);
      expect(e.input_symbols, e.equation_number).toEqual([registerOf[e.worksheet]]);
      expect(e.description.startsWith('Plan 3:')).toBe(true);
      expect(e.verification_quote?.length ?? 0).toBeGreaterThan(0);
      expect(e.verification_quote).not.toContain('undefined');
      expect(parseNumeric(rhs(e.equation_number)).ok, e.equation_number).toBe(true);
      expect(e.output_symbol).not.toBe('category_indicator_result'); // EQ-01 untouched (R-1)
      expect(['data_quality_complete_code', 'third_party_report_complete_code']).not.toContain(e.output_symbol); // the contains()-codes withheld (F-2)
      expect(rhs(e.equation_number).replace(/if\(|, 1, 0\)|, 0\)|>= 3/g, '')).not.toMatch(/\b\d+(\.\d+)?\b/);
      expect(rhs(e.equation_number)).not.toMatch(/AND \(/); // the emitter's legacy CALL regex (Task 21 trap 7)
    }
    for (const [i, t] of RESOURCE_TYPES.entries()) {
      expect(eq(`ISO-14046-03-D${5 + i}`).output_symbol).toBe(`water_input_${t.value}`);
      expect(rhs(`ISO-14046-03-D${5 + i}`)).toBe(`sum_rows(elementary_flows, if(direction == 'input' AND resource_type == '${t.value}', quantity_m3, 0))`);
    }
    expect(rhs('ISO-14046-03-D3')).toBe("sum_rows(elementary_flows, if(direction == 'input', quantity_m3, 0)) - sum_rows(elementary_flows, if(direction == 'output', quantity_m3, 0))"); // inline, never chained on D1 / D2
    expect(rhs('ISO-14046-07-D3')).toBe('if(count_rows(review_panel) >= 3, 1, 0)');
    expect(PANEL_MIN_MEMBERS).toBe(3);
    expect(Q.L1030).toContain('un panel de revisión constituido por al menos tres miembros'); // the printed "tres" (controller resolution 7)
    expect(rhs('ISO-14046-07-D2')).toBe('count_rows(review_panel, chair == true AND independent == true)');
    const { warnings } = emitEquationsSql('iso14046', EQUATIONS);
    expect(warnings).toEqual([]);
  });

  it('the committed migration + rollback equal a fresh emit (freshness pin)', () => {
    const norm = (s: string) => s.replace(/\r\n/g, '\n');
    const { up, down } = emitEquationsSql('iso14046', EQUATIONS);
    const files = equationFilesFor('iso14046', '20260917102620');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/ON CONFLICT \(worksheet_template_id, equation_number\) DO NOTHING/g) ?? []).length).toBe(15);
  });

  it('flows: inputs 120 m³ groundwater + 30 m³ rainwater, output 50 m³ surface water → Σ in 150, Σ out 50, balance 100, count 3, per type 30 / 120 / 0; a row without quantity or without resource type is incomplete and never counts; a hidden `releases` cell on an input row stores the engine text null', () => {
    const reg = prep('ISO-14046-03', 'elementary_flows', [
      { id: 'f1', unit_process: 'Bewässerung', direction: 'input', quantity_m3: 120, resource_type: 'groundwater', form_of_use: 'evaporation', location: 'Krefeld' },
      { id: 'f2', unit_process: 'Bewässerung', direction: 'input', quantity_m3: 30, resource_type: 'rainwater' },
      { id: 'f3', unit_process: 'Bewässerung', direction: 'output', quantity_m3: 50, resource_type: 'surface_water', releases: 'Nitrat' },
      { id: 'f4', unit_process: 'Reinigung', direction: 'input', resource_type: 'groundwater' },
      { id: 'f5', unit_process: 'Reinigung', direction: 'input', quantity_m3: 10 },
    ]);
    expect(reg.diagnostics ?? []).toEqual([]);
    expect(reg.rows.map((r) => r.complete)).toEqual([true, true, true, false, false]);
    expect(reg.rows.map((r) => r.values.releases)).toEqual(['', '', 'Nitrat', '', '']);
    expect(computed(run('ISO-14046-03-D1', { elementary_flows: reg }))).toBe(150);
    expect(computed(run('ISO-14046-03-D2', { elementary_flows: reg }))).toBe(50);
    expect(computed(run('ISO-14046-03-D3', { elementary_flows: reg }))).toBe(100);
    expect(computed(run('ISO-14046-03-D4', { elementary_flows: reg }))).toBe(3);
    expect(computed(run('ISO-14046-03-D5', { elementary_flows: reg }))).toBe(30); // rainwater
    expect(computed(run('ISO-14046-03-D6', { elementary_flows: reg }))).toBe(0); // surface_water — the 50 m³ is an OUTPUT
    expect(computed(run('ISO-14046-03-D9', { elementary_flows: reg }))).toBe(120); // groundwater
    expect(computed(run('ISO-14046-03-D10', { elementary_flows: reg }))).toBe(0); // fossil_water
    // only inputs: Σ out 0 (computed), balance = Σ in
    const onlyIn = prep('ISO-14046-03', 'elementary_flows', [{ id: 'a', unit_process: 'x', direction: 'input', quantity_m3: 5, resource_type: 'seawater' }]);
    expect(computed(run('ISO-14046-03-D2', { elementary_flows: onlyIn }))).toBe(0);
    expect(computed(run('ISO-14046-03-D3', { elementary_flows: onlyIn }))).toBe(5);
    expect(computed(run('ISO-14046-03-D7', { elementary_flows: onlyIn }))).toBe(5); // seawater
  });

  it('an EMPTY flows register (or one with only incomplete rows) is never a phantom 0: the Σ rows read manual_required ("Keine vollständigen Zeilen"), the count reads 0 (computed)', () => {
    for (const reg of [prep('ISO-14046-03', 'elementary_flows', []), prep('ISO-14046-03', 'elementary_flows', [{ id: 'x' }, { id: 'y', direction: 'input', quantity_m3: 1 }])]) {
      for (const n of ['ISO-14046-03-D1', 'ISO-14046-03-D2', 'ISO-14046-03-D3', 'ISO-14046-03-D5', 'ISO-14046-03-D10']) expect(manual(run(n, { elementary_flows: reg })), n).toContain('Keine vollständigen Zeilen');
      expect(computed(run('ISO-14046-03-D4', { elementary_flows: reg }))).toBe(0);
    }
  });

  it('LCI × CF: rows 100 × 0.5, 40 × 2, 3 × 10 → contributions 50 / 80 / 30, total 160; a row without CF is incomplete (null contribution, never counted); an EMPTY register is manual_required; a per-name Σ computes only with the literal name typed into the formula (F-1 — not emittable over engineer text)', () => {
    const reg = prep('ISO-14046-04', 'lci_cf_rows', [
      { id: 'l1', category: 'escasez', lci_value: 100, cf: 0.5 },
      { id: 'l2', category: 'escasez', lci_value: 40, cf: 2 },
      { id: 'l3', category: 'eutrofización', flow: 'P', lci_value: 3, cf: 10 },
      { id: 'l4', category: 'eutrofización', lci_value: 3 },
    ]);
    expect(reg.rows.map((r) => r.complete)).toEqual([true, true, true, false]);
    expect(reg.rows.map((r) => r.values.contribution)).toEqual([50, 80, 30, null]);
    expect(computed(run('ISO-14046-04-D1', { lci_cf_rows: reg }))).toBe(160);
    expect(manual(run('ISO-14046-04-D1', { lci_cf_rows: prep('ISO-14046-04', 'lci_cf_rows', []) }))).toContain('Keine vollständigen Zeilen');
    const perName = evaluateFormula({ equationId: 'x', formula: "x = sum_rows(lci_cf_rows, if(category == 'escasez', contribution, 0))", inputSymbols: ['lci_cf_rows'], outputSymbol: 'x', inputs: [], registers: { lci_cf_rows: reg }, tableLookup: table });
    expect(perName).toMatchObject({ kind: 'computed', value: 130 });
  });

  it('significant issues: one complete + one row without the issue text → count 1; empty → 0', () => {
    const reg = prep('ISO-14046-05', 'significant_issues_14046', [{ id: 's1', issue: 'Bewässerung', contribution_pct: 60, mechanism: 'escasez' }, { id: 's2', contribution_pct: 10 }]);
    expect(reg.rows.map((r) => r.complete)).toEqual([true, false]);
    expect(computed(run('ISO-14046-05-D1', { significant_issues_14046: reg }))).toBe(1);
    expect(computed(run('ISO-14046-05-D1', { significant_issues_14046: prep('ISO-14046-05', 'significant_issues_14046', []) }))).toBe(0);
  });

  it('review panel: three members with an independent chair → 3 / 1 / 1 (≥ 3 met); two members (chair not independent) + a nameless row → 2 / 0 / 0; empty → 0 / 0 / 0 (never a phantom pass); an unset boolean cell reads false', () => {
    const panel = (rows: unknown[]) => prep('ISO-14046-07', 'review_panel', rows);
    const p3 = panel([{ id: 'p1', name: 'A', independent: true, chair: true }, { id: 'p2', name: 'B', independent: true }, { id: 'p3', name: 'C', affiliation: 'NGO' }]);
    expect(p3.rows.map((r) => r.complete)).toEqual([true, true, true]);
    expect([computed(run('ISO-14046-07-D1', { review_panel: p3 })), computed(run('ISO-14046-07-D2', { review_panel: p3 })), computed(run('ISO-14046-07-D3', { review_panel: p3 }))]).toEqual([3, 1, 1]);
    const p2 = panel([{ id: 'p1', name: 'A', chair: true }, { id: 'p2', name: 'B' }, { id: 'p3' }]);
    expect(p2.rows.map((r) => r.complete)).toEqual([true, true, false]);
    expect([computed(run('ISO-14046-07-D1', { review_panel: p2 })), computed(run('ISO-14046-07-D2', { review_panel: p2 })), computed(run('ISO-14046-07-D3', { review_panel: p2 }))]).toEqual([2, 0, 0]);
    const p0 = panel([]);
    expect([computed(run('ISO-14046-07-D1', { review_panel: p0 })), computed(run('ISO-14046-07-D2', { review_panel: p0 })), computed(run('ISO-14046-07-D3', { review_panel: p0 }))]).toEqual([0, 0, 0]);
  });
});
