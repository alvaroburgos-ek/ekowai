// Plan 2a Task 8: the VSME-B04.100 register-equation migration carries the three per-medium sum formulas
// byte-identical to the engine's fallback rows (register-configs.ts), and the rollback deletes exactly them.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FALLBACK_REGISTER_EQUATIONS } from '@/lib/eval/register-configs';

const ROOT = join(__dirname, '..', '..');
const MIGRATION = readFileSync(join(ROOT, 'scripts/migrations/20260916110000_vsme_b04_register_equations.sql'), 'utf8');
const ROLLBACK = readFileSync(join(ROOT, 'scripts/rollback-20260916110000-vsme-b04-register-equations.sql'), 'utf8');
const FALLBACK = FALLBACK_REGISTER_EQUATIONS['VSME-B04.100'];

describe('20260916110000_vsme_b04_register_equations.sql', () => {
  it('the fallback set is exactly the three per-medium sums', () => {
    expect(FALLBACK.map((e) => e.equationNumber).sort()).toEqual(['B04.100-air', 'B04.100-soil', 'B04.100-water']);
    expect(FALLBACK.map((e) => e.outputSymbol).sort()).toEqual(['AmountOfEmissionToAir', 'AmountOfEmissionToSoil', 'AmountOfEmissionToWater']);
  });
  for (const e of FALLBACK) {
    it(`${e.outputSymbol}: formula verbatim (dollar-quoted) + equation_number + output_symbol in migration; equation_number in rollback`, () => {
      expect(MIGRATION).toContain(`$q$${e.formula}$q$`);
      expect(MIGRATION).toContain(`'${e.equationNumber}'`);
      expect(MIGRATION).toContain(`'${e.outputSymbol}'`);
      expect(e.formula.startsWith(`${e.outputSymbol} = `)).toBe(true);
      expect(ROLLBACK).toContain(`'${e.equationNumber}'`);
    });
  }
  it('migration is transactional, idempotent, scoped to VSME / VSME-B04.100 and binds the register symbol', () => {
    expect(MIGRATION).toMatch(/^BEGIN;/m);
    expect(MIGRATION).toMatch(/^COMMIT;/m);
    expect((MIGRATION.match(/ON CONFLICT \(worksheet_template_id, equation_number\) DO NOTHING;/g) ?? []).length).toBe(3);
    expect((MIGRATION.match(/ARRAY\['pollutant_register'\]/g) ?? []).length).toBe(3);
    expect((MIGRATION.match(/s\.code = 'VSME' AND wt\.code = 'VSME-B04\.100'/g) ?? []).length).toBe(3);
    expect(MIGRATION).not.toMatch(/UNVERIFIED/);
  });
  it('rollback deletes by (worksheet_template_id, equation_number) within the same scope', () => {
    expect(ROLLBACK).toMatch(/^BEGIN;/m);
    expect(ROLLBACK).toMatch(/^COMMIT;/m);
    expect(ROLLBACK).toMatch(/DELETE FROM equations/);
    expect(ROLLBACK).toMatch(/s\.code = 'VSME' AND wt\.code = 'VSME-B04\.100'/);
    expect(ROLLBACK).toMatch(/equation_number IN \('B04\.100-air', 'B04\.100-water', 'B04\.100-soil'\)/);
  });
});
