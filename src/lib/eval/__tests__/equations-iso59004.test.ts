/**
 * Plan 3 Task 29 — ISO-59004 derived-value equations: the emitter accepts every entry, the committed
 * migration equals a fresh emit, and each formula computes through the REAL `evaluateFormula` over rows
 * prepared by the register contract (TS fallback tables, no migration applied).
 *
 * The pins that matter:
 *   - an EMPTY register is never a phantom pass (every count is 0, never `manual_required`, never 1);
 *   - an INCOMPLETE row (no required key column) never counts;
 *   - iso59004-J-5: the brief's `intermediate_target != ''` PARSES but does NOT evaluate
 *     (`manual_required: Fehlende Eingabe für count_rows(): intermediate_target`), while the emitted
 *     `IS NOT NULL` form computes AND already treats an EMPTY STRING as not set — both behaviours pinned
 *     side by side, so a silent engine change fails this test;
 *   - iso59004-F-1: `contains(...) AND contains(...)` does not parse, and the nested-`if` rewrite that
 *     does parse returns `manual_required` for want of `carriers` — the withheld -04-D1 proven withheld.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EQUATIONS } from '../equations/iso59004';
import { FIELD_CONFIGS, WITHHELD_04_D1_FORMULA, WITHHELD_04_D1_NESTED_FORM } from '../field-configs/iso59004';
import { evaluateFormula, type EvalState } from '../formula';
import { prepareRegisterRows } from '../register-rows';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { makeTableLookup, makeTableRows } from '../regulation-tables-fallback';
import { parseNumeric } from '@/lib/expr';
import { emitEquationsSql, equationFilesFor } from '../../../../scripts/regulation-tables/emit-equations-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const STD = 'ISO-59004';
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

const ACTION_ROWS = [
  { id: 'a1', action: 'refuse', category: 'create_added_value', pilot: true, feasibility_dimensions: 'Technisch', value_creation_model: 'Produkt als Dienstleistung', life_cycle_note: '' },
  { id: 'a2', action: 'rethink', category: 'create_added_value', pilot: false },
  { id: 'a3', action: 'recycle', category: 'value_recovery', pilot: true },
  { id: 'a4', category: 'value_retention', pilot: true }, // incomplete — no `action` (the required column)
];

describe('ISO-59004 Plan-3 equations', () => {
  it('6 entries, every output has a created derived field on its worksheet, every input is that worksheet\'s register, prod produces nothing here, no figure typed; the emitter accepts them', () => {
    expect(EQUATIONS.map((e) => e.equation_number)).toEqual([
      'ISO-59004-05-D1', 'ISO-59004-05-D2', 'ISO-59004-05-D3',
      'ISO-59004-06-D1', 'ISO-59004-06-D2', 'ISO-59004-06-D3',
    ]);
    const created = new Set(FIELD_CONFIGS.filter((f) => f.create).map((f) => `${f.worksheet} ${f.symbol}`));
    for (const e of EQUATIONS) {
      expect(created.has(`${e.worksheet} ${e.output_symbol}`), `${e.output_symbol} field`).toBe(true);
      for (const s of e.input_symbols) expect(created.has(`${e.worksheet} ${s}`), `${e.equation_number} input ${s}`).toBe(true);
      expect(e.description.startsWith('Plan 3:')).toBe(true);
      expect(e.verification_quote?.length ?? 0).toBeGreaterThan(0);
      expect(e.verification_quote).not.toContain('undefined');
      // iso59004-U-2: no watermark artefact ever reaches a stored quote
      expect(e.verification_quote, `${e.equation_number} quote watermark`).not.toMatch(/ (et|oj|Pr|ar oc|ai n|or m) /);
      expect(parseNumeric(rhs(e.equation_number)).ok, e.equation_number).toBe(true);
      expect(rhs(e.equation_number)).not.toMatch(/\b\d+(\.\d+)?\b/); // no figure typed into a formula
      expect(e.output_unit).toBeNull();
    }
    // prod carries ZERO equations for this standard — nothing here can be a replacement
    expect(EQUATIONS.filter((e) => e.output_symbol === 'all_principles_considered_code')).toEqual([]);
    const { warnings } = emitEquationsSql('iso59004', EQUATIONS);
    expect(warnings).toEqual([]);
  });

  it('the committed migration + rollback equal a fresh emit (freshness pin)', () => {
    const norm = (s: string) => s.replace(/\r\n/g, '\n');
    const { up, down } = emitEquationsSql('iso59004', EQUATIONS);
    const files = equationFilesFor('iso59004', '20260917102920');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/ON CONFLICT \(worksheet_template_id, equation_number\) DO NOTHING/g) ?? []).length).toBe(6);
  });

  it('-05: the actions register — 3 complete rows of 4, 2 preliminary (refuse / rethink, §6.1), 2 pilots; the incomplete row never counts and the badge column reads 1 / 0 per row', () => {
    const reg = prep('ISO-59004-05', 'actions', ACTION_ROWS);
    expect(reg.rows.map((r) => r.complete)).toEqual([true, true, true, false]);
    expect(reg.diagnostics ?? []).toEqual([]);
    expect(reg.rows.map((r) => r.values.preliminary)).toEqual([1, 1, 0, null]);
    const registers = { actions: reg };
    expect(computed(run('ISO-59004-05-D1', registers))).toBe(3);
    expect(computed(run('ISO-59004-05-D2', registers))).toBe(2);
    expect(computed(run('ISO-59004-05-D3', registers))).toBe(2);
  });

  it('-06: the goals register — iso59004-J-5, `IS NOT NULL` counts only the rows with a real intermediate target (an empty text does NOT count), while the brief\'s `!= \'\'` does not evaluate at all', () => {
    const rows = [
      { id: 'g1', goal: '2035 klimaneutrale Produktion', intermediate_target: '2030: 50 % Rezyklatanteil', year: 2030, indicator: 'Rezyklatanteil' },
      { id: 'g2', goal: '2040 geschlossene Materialkreislaeufe', intermediate_target: '', year: 2035 },
      { id: 'g3', goal: '2028 Reparaturquote verdoppeln', year: 2028 },
      { id: 'g4', intermediate_target: '2031: 10 %' }, // incomplete — no `goal`
    ];
    const reg = prep('ISO-59004-06', 'goals', rows);
    expect(reg.rows.map((r) => r.complete)).toEqual([true, true, true, false]);
    const registers = { goals: reg };
    expect(computed(run('ISO-59004-06-D1', registers))).toBe(3);
    expect(computed(run('ISO-59004-06-D2', registers))).toBe(1);
    // the brief's form: parses, does NOT evaluate — pinned so a future engine change is visible here
    expect(parseNumeric("count_rows(goals, intermediate_target != '')").ok).toBe(true);
    const briefForm = evaluateFormula({
      equationId: 'probe-J-5', formula: "n = count_rows(goals, intermediate_target != '')",
      inputSymbols: ['goals'], outputSymbol: 'n', inputs: [], registers, tableLookup: table,
    });
    expect(manual(briefForm)).toBe('Fehlende Eingabe für count_rows(): intermediate_target');
    expect(eq('ISO-59004-06-D2').formula).toBe('goals_with_targets = count_rows(goals, intermediate_target IS NOT NULL)');
  });

  it('-06: the indicator register counts its rows; an incomplete row (no indicator) never counts', () => {
    const reg = prep('ISO-59004-06', 'indicators_59004', [
      { id: 'i1', indicator: 'Rezyklatanteil Zufluss', baseline: 12, target: 40 },
      { id: 'i2', indicator: 'Wiederverwendungsquote Abfluss', baseline: 3 },
      { id: 'i3', baseline: 99, target: 100 },
    ]);
    expect(reg.rows.map((r) => r.complete)).toEqual([true, true, false]);
    expect(computed(run('ISO-59004-06-D3', { indicators_59004: reg }))).toBe(2);
  });

  it('EMPTY registers are never a phantom pass: every one of the six outputs is 0, never manual_required, never 1', () => {
    const actions = prep('ISO-59004-05', 'actions', []);
    const goals = prep('ISO-59004-06', 'goals', []);
    const indicators = prep('ISO-59004-06', 'indicators_59004', []);
    const registers = { actions, goals, indicators_59004: indicators };
    for (const n of EQUATIONS.map((e) => e.equation_number)) expect(computed(run(n, registers)), n).toBe(0);
  });

  it('iso59004-F-1: the withheld -04-D1 is proven withheld — the AND-chain does not parse, and the nested-if rewrite that parses returns manual_required for want of `carriers`', () => {
    const strip = (f: string) => f.replace(/^[a-z_]+ = /, '');
    expect(parseNumeric(strip(WITHHELD_04_D1_FORMULA))).toEqual({ ok: false, message: 'Ausdruck erwartet.' });
    expect(parseNumeric(strip(WITHHELD_04_D1_NESTED_FORM)).ok).toBe(true);
    const probe = evaluateFormula({
      equationId: 'probe-F-1', formula: WITHHELD_04_D1_NESTED_FORM,
      inputSymbols: ['principles'], outputSymbol: 'all_principles_considered_code',
      inputs: [{ symbol: 'principles', value: 'systems_thinking', unit: null }], tableLookup: table,
    });
    expect(manual(probe)).toBe('Unbekanntes Symbol "principles" im Ausdruck.');
  });
});
