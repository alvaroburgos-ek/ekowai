/**
 * Task 13b (sign-off din276-X-1) — the belt-and-braces emitter lint: a quoted
 * comparison literal that equals a register column key or a worksheet symbol
 * (prior rows + fields created in the batch) is a WARNING on the emitter's
 * return (the CLI prints it to stderr), never a refusal; the SQL is unchanged.
 * Same for the equations emitter against input_symbols / batch outputs.
 */
import { describe, it, expect } from 'vitest';
import { emitFieldConfigSql, quotedLiteralCollisionWarnings, type PriorFieldRow } from '../regulation-tables/emit-field-configs-sql';
import { emitEquationsSql, quotedLiteralCollisionWarnings as equationWarnings } from '../regulation-tables/emit-equations-sql';
import { parseNumeric, parseCondition, quotedComparisonLiterals } from '../../src/lib/expr';

const row = (over: Partial<PriorFieldRow> = {}): PriorFieldRow => ({ enum_values: null, widget: null, ui_config: null, lookup: null, visible_when: null, consumer_worksheets: null, ...over });
const base = { standard: 'S', worksheet: 'S-01', verification_quote: 'q' };
const register = (columns: Array<Record<string, unknown>>) => ({ title: 'T', columns });

describe('quotedComparisonLiterals (expr static walk)', () => {
  it('collects quoted literals in comparison position only — not lookup() codes / column names, not bare idents', () => {
    const p = parseNumeric("if(status == 'rechnung', lookup('TAB4', kg, 'unit'), if(status != 'auftrag', 1, 0)) + count_rows(reg, kind IN {'a', b})");
    expect(p.ok && quotedComparisonLiterals(p.node)).toEqual(['rechnung', 'auftrag', 'a']);
    const c = parseCondition("lookup('T', k, 'c') == 'tok' AND x == bare AND IF y == 'g' THEN z >= 1");
    expect(c && quotedComparisonLiterals(c)).toEqual(['tok', 'g']);
  });
});

describe('emitFieldConfigSql — quoted-literal collision lint (warning, never a refusal)', () => {
  it('warns when a row expression compares against a quoted literal that is a column key of the same register', () => {
    const ui = register([
      { key: 'status', label: 'S', type: 'enum', options: ['angebot', 'rechnung'] },
      { key: 'rechnung', label: 'R', type: 'number' },
      { key: 'aktuell', label: 'A', type: 'derived', expr: "if(status == 'rechnung', rechnung, 0)" },
    ]);
    const { up, warnings } = emitFieldConfigSql('x', [{ ...base, symbol: 'reg', widget: 'register', ui_config: ui }], [], { 'S-01 reg': row() });
    expect(up).toContain("widget = 'register'"); // still emitted
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/^WARNING S-01 reg\.aktuell: expr compares against the quoted literal 'rechnung', which is also a register column key/);
    expect(warnings[0]).toContain('bare-ident spelling of the same token would resolve to it');
  });
  it('warns when the literal is a symbol of the worksheet — captured prior rows and fields created in the batch; other worksheets do not count', () => {
    const ui = register([
      { key: 'status', label: 'S', type: 'enum', options: ['angebot', 'rechnung'] },
      { key: 'n', label: 'N', type: 'number' },
      { key: 'd', label: 'D', type: 'derived', expr: "if(status == 'angebot', n, 0)", visible_when: "status != 'rechnung'" },
    ]);
    const prior = { 'S-01 reg': row(), 'S-01 angebot': row({ widget: 'scalar' }), 'S-02 rechnung': row() };
    const r1 = emitFieldConfigSql('x', [{ ...base, symbol: 'reg', widget: 'register', ui_config: ui }], [], prior);
    expect(r1.warnings).toEqual([expect.stringMatching(/^WARNING S-01 reg\.d: expr compares against the quoted literal 'angebot', which is also a symbol of S-01/)]);
    // a created field named like the literal counts too (visible_when path), on the same worksheet only
    const create = { section_code: null, label_de: 'L', data_type: 'number' as const, clause_reference: '§1', description: 'Plan 3: x' };
    const r2 = emitFieldConfigSql('x', [
      { ...base, symbol: 'reg', widget: 'register', ui_config: ui },
      { ...base, symbol: 'rechnung', widget: 'scalar', create },
      { ...base, symbol: 'flag', widget: 'scalar', visible_when: "mode == 'rechnung'", create },
    ], [], prior);
    expect(r2.warnings.map((w) => w.split(':')[0])).toEqual(['WARNING S-01 reg.d', 'WARNING S-01 reg.d', 'WARNING S-01 flag']);
    expect(r2.warnings[1]).toContain("visible_when compares against the quoted literal 'rechnung', which is also a symbol of S-01");
  });
  it('a column key AND a worksheet symbol are both named in one line; a section visible_when is linted against the worksheet symbols', () => {
    const ui = register([{ key: 'k', label: 'K', type: 'text' }, { key: 'e', label: 'E', type: 'derived', expr: "if(k == 'k', 1, 0)" }]);
    const r = emitFieldConfigSql('x', [{ ...base, symbol: 'reg', widget: 'register', ui_config: ui }], [{ ...base, section_code: 'S-01.1', visible_when: "typ IN {'k', other}" }], { 'S-01 reg': row(), 'S-01 k': row(), 'S-01 S-01.1': row() });
    expect(r.warnings).toHaveLength(2);
    expect(r.warnings[0]).toContain("'k', which is also a register column key and a symbol of S-01");
    expect(r.warnings[1]).toMatch(/^WARNING section S-01 S-01\.1: visible_when compares against the quoted literal 'k', which is also a symbol of S-01/);
  });
  it('no collision → no warning; bare identifiers are not linted (they are the legacy var-vs-var form, by design)', () => {
    const ui = register([
      { key: 'status', label: 'S', type: 'enum', options: ['angebot', 'rechnung'] },
      { key: 'rechnung_eur', label: 'R', type: 'number' },
      { key: 'a', label: 'A', type: 'derived', expr: "if(status == 'rechnung', rechnung_eur, 0)" },
      { key: 'b', label: 'B', type: 'derived', expr: 'if(status == rechnung_eur, 1, 0)' },
    ]);
    const { warnings } = emitFieldConfigSql('x', [{ ...base, symbol: 'reg', widget: 'register', ui_config: ui, visible_when: "mode == 'x'" }], [], { 'S-01 reg': row(), 'S-01 mode': row() });
    expect(warnings).toEqual([]);
    expect(quotedLiteralCollisionWarnings([], [], {})).toEqual([]);
  });
});

describe('emitEquationsSql — quoted-literal collision lint', () => {
  const e = { standard: 'S', worksheet: 'S-04', equation_number: 'S-04-D1', formula: "n_r = count_rows(reg, status == 'rechnung')", input_symbols: ['reg'], output_symbol: 'n_r', output_unit: null, clause_reference: '§1', description: 'Plan 3: n', verification_quote: 'q' };
  it('warns when the literal is an input symbol or a batch output on the worksheet; the SQL is unchanged', () => {
    expect(emitEquationsSql('x', [e]).warnings).toEqual([]);
    const r = emitEquationsSql('x', [{ ...e, input_symbols: ['reg', 'rechnung'] }]);
    expect(r.up).toContain("'S-04-D1'");
    expect(r.warnings).toEqual([expect.stringMatching(/^WARNING S-04 S-04-D1: formula compares against the quoted literal 'rechnung', which is also an input_symbols member/)]);
    const out = emitEquationsSql('x', [e, { ...e, equation_number: 'S-04-D2', formula: 'rechnung = n_r * 2', input_symbols: ['n_r'], output_symbol: 'rechnung' }]);
    expect(out.warnings).toEqual([expect.stringMatching(/'rechnung', which is also an equation output on S-04/)]);
    expect(equationWarnings([])).toEqual([]);
  });
});
