// Plan 2a Task 6: the A138-07 register-equation migration carries the six formula strings byte-identical
// to the engine's registry, and the rollback restores every id it touches.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { A138_07_REGISTER_FORMULAS } from '@/lib/eval/rewrites';

const ROOT = join(__dirname, '..', '..');
const MIGRATION = readFileSync(join(ROOT, 'scripts/migrations/20260916100000_a138_07_register_equations.sql'), 'utf8');
const ROLLBACK = readFileSync(join(ROOT, 'scripts/rollback-20260916100000-a138-07-register-equations.sql'), 'utf8');

describe('20260916100000_a138_07_register_equations.sql', () => {
  it('registry lists exactly the six A138-07 producer ids', () => {
    expect(Object.keys(A138_07_REGISTER_FORMULAS).sort()).toEqual([
      'a1380702-0000-4000-8000-000000000002',
      'a1380702-0000-4000-8000-000000000003',
      'a1380702-0000-4000-8000-000000000004',
      'a1380702-0000-4000-8000-000000000005',
      'a1380702-0000-4000-8000-000000000006',
      'b3f8c2e0-7a4d-4f1c-9e08-d5a6b7c8d9e0',
    ]);
  });
  for (const [id, { outputSymbol, formula }] of Object.entries(A138_07_REGISTER_FORMULAS)) {
    it(`${outputSymbol}: formula string verbatim + id present in migration and rollback`, () => {
      expect(MIGRATION).toContain(formula);
      expect(MIGRATION).toContain(`WHERE id = '${id}'`);
      expect(ROLLBACK).toContain(`WHERE id = '${id}'`);
      expect(formula.startsWith(`${outputSymbol} = `)).toBe(true);
    });
  }
  it('migration is transactional and sets input_symbols to the register symbol', () => {
    expect(MIGRATION).toMatch(/^BEGIN;/m);
    expect(MIGRATION).toMatch(/^COMMIT;/m);
    expect((MIGRATION.match(/input_symbols = ARRAY\['surface_inventory'\]/g) ?? []).length).toBe(6);
  });
  it('rollback carries verified prior values (no UNVERIFIED marker)', () => {
    expect(ROLLBACK).not.toMatch(/UNVERIFIED/);
    expect(ROLLBACK).toContain("'A_C_preliminary = Σ_i (A_E,i · C_i)'");
    expect(ROLLBACK).toContain("'C_m = A_C / A_E'");
  });
});
