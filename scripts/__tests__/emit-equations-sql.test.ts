/**
 * Plan 3 Task 0 — the equations emitter: new rows only (ON CONFLICT DO
 * NOTHING), worksheet resolved by code, `Plan 3:` description as the
 * rollback selector, formulas refused unless they parse and are engine-eligible.
 */
import { describe, it, expect } from 'vitest';
import { emitEquationsSql } from '../regulation-tables/emit-equations-sql';
describe('emitEquationsSql', () => {
  const e = { standard: 'S', worksheet: 'S-04', equation_number: 'S-04-D1', formula: 'BW_a = sum_rows(verbraucher, p_d * n) * 365', input_symbols: ['verbraucher'], output_symbol: 'BW_a', output_unit: 'l/a', clause_reference: '§16.3.7', description: 'Plan 3: Σ …', verification_quote: 'lifted (L905)' };
  it('inserts with worksheet resolved by code and never updates on conflict', () => {
    const { up, down } = emitEquationsSql('x', [e]);
    expect(up).toContain("INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, description, verification_status, verification_quote)");
    expect(up).toContain("SELECT w.id, 'S-04-D1', 'BW_a = sum_rows(verbraucher, p_d * n) * 365', ARRAY['verbraucher']::text[]");
    expect(up).toContain("FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE w.code = 'S-04' AND s.code = 'S'");
    expect(up).toContain('ON CONFLICT (worksheet_template_id, equation_number) DO NOTHING');
    expect(up).toContain("'imported_unverified'");
    expect(down).toContain("DELETE FROM equations e USING worksheet_templates w, standards s WHERE e.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'S' AND w.code = 'S-04' AND e.equation_number = 'S-04-D1' AND e.description LIKE 'Plan 3:%'");
  });
  it('refuses a formula that does not parse or is not engine-eligible, and a description without the Plan 3 prefix', () => {
    expect(() => emitEquationsSql('x', [{ ...e, formula: 'BW_a = sum_rows(' }])).toThrow(/parse/);
    expect(() => emitEquationsSql('x', [{ ...e, formula: 'BW_a = SUM(verbraucher)' }])).toThrow(/eligib/);
    expect(() => emitEquationsSql('x', [{ ...e, description: 'x' }])).toThrow(/Plan 3:/);
  });
});
