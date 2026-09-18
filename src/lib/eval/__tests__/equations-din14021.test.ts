/**
 * Plan 3 Task 25 — DIN-14021 derived-value equations: the emitter accepts every
 * entry, the committed migration equals a fresh emit, and each formula computes
 * through the real `evaluateFormula` over rows prepared by the register contract
 * (TS fallback CLAIMMAP, no migration applied). The standard prints no worked example
 * for these formulas (its only printed arithmetic is the §6.3.3 NOTE on relative
 * differences — grep in the report); the pins are the printed conditions (R−E>0,
 * 100 %, the CO2-neutral / nachhaltig prohibition, the 6.3 comparative duty) applied
 * to chosen rows, incl. the edge cases: an EMPTY register is never a phantom pass
 * (count 0, fails 0, code 0), a row without a claim type is incomplete and never
 * counts, a null `e` cell is a missing input (never Euler's number).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EQUATIONS } from '../equations/din14021';
import { FIELD_CONFIGS } from '../field-configs/din14021';
import { evaluateFormula, type EvalState } from '../formula';
import { prepareRegisterRows } from '../register-rows';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { makeTableLookup, makeTableRows } from '../regulation-tables-fallback';
import { parseNumeric } from '@/lib/expr';
import { emitEquationsSql, equationFilesFor } from '../../../../scripts/regulation-tables/emit-equations-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const STD = 'DIN-14021';
const table = makeTableLookup(STD);
const tableRows = makeTableRows(STD);
const eq = (n: string) => EQUATIONS.find((e) => e.equation_number === n)!;
const rhs = (n: string) => eq(n).formula.replace(/^[A-Za-z_][A-Za-z0-9_]*\s*=\s*/, '');
const CLAIMS = parseFieldConfig({ widget: 'register', uiConfig: FIELD_CONFIGS.find((f) => f.worksheet === 'DIN-14021-01' && f.symbol === 'claims')!.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const prep = (rows: unknown[]) => prepareRegisterRows({ rows }, CLAIMS.columns, { table, tableRows, symbol: () => undefined });
const run = (n: string, reg: ReturnType<typeof prep>): EvalState => {
  const e = eq(n);
  return evaluateFormula({ equationId: n, formula: e.formula, inputSymbols: e.input_symbols, outputSymbol: e.output_symbol, inputs: [], registers: { claims: reg }, tableLookup: table });
};
const computed = (r: EvalState): number => { expect(r.kind, JSON.stringify(r)).toBe('computed'); return r.kind === 'computed' ? r.value : NaN; };

describe('DIN-14021 Plan-3 equations', () => {
  it('3 entries on -01, every output a created derived field of -01, the only input the claims register; no prod output re-produced (EQ-01 … EQ-03 keep their rows); no figure typed into a formula; emitter accepts them', () => {
    expect(EQUATIONS.map((e) => e.equation_number)).toEqual(['DIN-14021-01-D1', 'DIN-14021-01-D2', 'DIN-14021-01-D3']);
    const created = new Set(FIELD_CONFIGS.filter((f) => f.create).map((f) => `${f.worksheet} ${f.symbol}`));
    for (const e of EQUATIONS) {
      expect(e.worksheet).toBe('DIN-14021-01');
      expect(created.has(`${e.worksheet} ${e.output_symbol}`), `${e.output_symbol} field`).toBe(true);
      expect(e.input_symbols).toEqual(['claims']);
      expect(e.description.startsWith('Plan 3:')).toBe(true);
      expect(e.verification_quote?.length ?? 0).toBeGreaterThan(0);
      expect(e.verification_quote).not.toContain('undefined');
      expect(parseNumeric(rhs(e.equation_number)).ok, e.equation_number).toBe(true);
      expect(['net_recovered_energy_pct', 'recycled_content_pct', 'reduced_resource_use_pct', 'general_requirements_met_code', 'verification_requirements_met_code', 'compliance_verdict_code']).not.toContain(e.output_symbol); // EQ-01 … EQ-03 untouched; the contains()-codes withheld (F-1)
      expect(rhs(e.equation_number).replace(/if\(|, 1, 0\)|== 0|> 0/g, '')).not.toMatch(/\b\d+(\.\d+)?\b/);
      expect(rhs(e.equation_number)).not.toMatch(/AND \(/); // the emitter's legacy CALL regex (Task 21 trap 7)
    }
    expect(rhs('DIN-14021-01-D3')).toBe('if(count_rows(claims) > 0 AND count_rows(claims, type_ok == 0) == 0, 1, 0)'); // inline, never chained on D2 (Task 16 trap 2)
    const { warnings } = emitEquationsSql('din14021', EQUATIONS);
    expect(warnings).toEqual([]);
  });

  it('the committed migration + rollback equal a fresh emit (freshness pin)', () => {
    const norm = (s: string) => s.replace(/\r\n/g, '\n');
    const { up, down } = emitEquationsSql('din14021', EQUATIONS);
    const files = equationFilesFor('din14021', '20260917102520');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/ON CONFLICT \(worksheet_template_id, equation_number\) DO NOTHING/g) ?? []).length).toBe(3);
  });

  it('per-row printed formulas: recovered energy R 100 / E 40 / P 60 → 50 % (L1302); recycled content A 25 / P 100 → X 25 % (L1480); reduced resource I 8 / N 6 → U 25 % (L1570); the cells stay null on rows of another type (the hidden e is never Euler)', () => {
    const reg = prep([
      { id: '1', claim_type: 'recovered_energy', r: 100, e: 40, p: 60 },
      { id: '2', claim_type: 'recycled_content', a_mass: 25, p_mass: 100 },
      { id: '3', claim_type: 'reduced_resource_use', i_res: 8, n_res: 6, comparative: true },
      { id: '4', claim_type: 'compostable' },
    ]);
    expect(reg.diagnostics ?? []).toEqual([]);
    expect(reg.rows.map((r) => r.complete)).toEqual([true, true, true, true]);
    expect(reg.rows[0].values.net_recovered_pct).toBe(50);
    expect(reg.rows[1].values.recycled_pct).toBe(25);
    expect(reg.rows[2].values.reduced_pct).toBe(25);
    expect(reg.rows[3].values.net_recovered_pct).toBeNull();
    expect(reg.rows[3].values.e).toBeNull();
    expect(reg.rows.map((r) => r.values.numeric_block)).toEqual(['recovered_energy', 'recycled_content', 'reduced_resource', 'none']);
    expect(reg.rows.map((r) => r.values.comparative_required)).toEqual([false, false, true, false]);
    expect(reg.rows.map((r) => r.values.type_ok)).toEqual([1, 1, 1, 1]);
    expect(computed(run('DIN-14021-01-D1', reg))).toBe(4);
    expect(computed(run('DIN-14021-01-D2', reg))).toBe(0);
    expect(computed(run('DIN-14021-01-D3', reg))).toBe(1);
  });

  it('the printed checks: R−E<0 and "R / E not entered" fail §7.6.3 a); an unqualified renewable claim needs 100 % (80 % fails, a qualified 80 % passes); an unqualified CO2-neutral / nachhaltig claim fails; a comparative-by-clause type without the comparison fails — D2 counts 7 of 12, D3 reads 0; a row without a claim type is incomplete', () => {
    const reg = prep([
      { id: '1', claim_type: 'recovered_energy', r: 100, e: 40, p: 60 },   // ok
      { id: '2', claim_type: 'recovered_energy', r: 30, e: 40, p: 60 },    // fail: R−E<0
      { id: '3', claim_type: 'recovered_energy' },                          // fail: not entered
      { id: '4', claim_type: 'renewable_material', unqualified: true, renewable_pct: 100 }, // ok
      { id: '5', claim_type: 'renewable_energy', unqualified: true, renewable_pct: 80 },    // fail
      { id: '6', claim_type: 'renewable_energy', unqualified: false, renewable_pct: 80 },   // ok (qualified)
      { id: '7', claim_type: 'renewable_material', unqualified: true },                     // fail: share not entered
      { id: '8', claim_type: 'carbon_neutral', unqualified: true, carbon_footprint: 0 },    // fail: §7.17.3.2
      { id: '9', claim_type: 'sustainable', unqualified: true },                            // fail: §7.16.1
      { id: '10', claim_type: 'extended_life_product', comparative: false },               // fail: §7.5.2.1 → 6.3
      { id: '11', claim_type: 'extended_life_product', comparative: true, comparison_basis: 'own_prior_product', comparison_months: 12 }, // ok
      { id: '12', claim_type: 'recyclable', mobius: true },                                 // ok
      { id: '13', r: 5 },                                                                   // no claim type → incomplete
    ]);
    expect(reg.diagnostics ?? []).toEqual([]);
    expect(reg.rows.map((r) => r.complete)).toEqual([true, true, true, true, true, true, true, true, true, true, true, true, false]);
    expect(reg.rows.map((r) => r.values.type_ok)).toEqual([1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 1, null]);
    expect(reg.rows.map((r) => r.values.recovered_ok).slice(0, 3)).toEqual([1, 0, 0]);
    expect(reg.rows.map((r) => r.values.renewable_ok).slice(3, 7)).toEqual([1, 0, 1, 0]);
    expect(reg.rows.map((r) => r.values.unqualified_ok).slice(7, 9)).toEqual([0, 0]);
    expect(reg.rows.map((r) => r.values.comparative_ok).slice(9, 11)).toEqual([0, 1]);
    expect(reg.rows[1].values.net_recovered_pct).toBe(-20);
    expect(computed(run('DIN-14021-01-D1', reg))).toBe(12);
    expect(computed(run('DIN-14021-01-D2', reg))).toBe(7);
    expect(computed(run('DIN-14021-01-D3', reg))).toBe(0);
  });

  it('an EMPTY register is never a phantom pass: count 0, fails 0, code 0 (computed, never manual); a register with only incomplete rows likewise', () => {
    for (const reg of [prep([]), prep([{ id: 'x' }, { id: 'y', r: 1 }])]) {
      expect(computed(run('DIN-14021-01-D1', reg))).toBe(0);
      expect(computed(run('DIN-14021-01-D2', reg))).toBe(0);
      expect(computed(run('DIN-14021-01-D3', reg))).toBe(0);
    }
  });
});
