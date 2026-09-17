// Plan 2a Task 10: the A138-12 visible_when migration carries the two ASM rules that
// LEGACY_VISIBLE_WHEN hardcodes (the fallback retires once the migration is applied);
// the rollback nulls both. WRITTEN NOT APPLIED.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LEGACY_VISIBLE_WHEN } from '@/lib/compliance/visibility';
import { evaluateCondition } from '@/lib/compliance/evaluate';

const ROOT = join(__dirname, '..', '..');
const MIGRATION = readFileSync(join(ROOT, 'scripts/migrations/20260916120000_a138_12_visible_when.sql'), 'utf8');
const ROLLBACK = readFileSync(join(ROOT, 'scripts/rollback-20260916120000-a138-12-visible-when.sql'), 'utf8');

/** Pull the SQL string literal assigned to visible_when for one symbol (unescape doubled quotes). */
function sqlRuleFor(symbol: string): string {
  const statements = MIGRATION.split(';').filter((s) => /UPDATE fields/.test(s));
  const stmt = statements.find((s) => s.includes(`f.symbol = '${symbol}'`));
  if (!stmt) throw new Error(`no UPDATE for ${symbol}`);
  const m = stmt.match(/SET visible_when = '((?:[^']|'')*)'/);
  if (!m) throw new Error(`no visible_when literal for ${symbol}`);
  return m[1].replace(/''/g, "'");
}

const LITERAL: Record<string, string> = {
  soil_bodenart_tab13: "'soil_estimate'",
  a_s_m_provenance: "'manual'",
};

describe('20260916120000_a138_12_visible_when.sql', () => {
  it('is transactional, scoped to DWA-A-138-1, and only fills NULL visible_when', () => {
    expect(MIGRATION).toMatch(/^BEGIN;/m);
    expect(MIGRATION).toMatch(/^COMMIT;/m);
    expect((MIGRATION.match(/s\.code = 'DWA-A-138-1'/g) ?? []).length).toBe(2);
    expect((MIGRATION.match(/f\.visible_when IS NULL/g) ?? []).length).toBe(2);
  });
  for (const [symbol, legacy] of Object.entries(LEGACY_VISIBLE_WHEN)) {
    it(`${symbol}: SQL rule keeps the IS NOT NULL guard + the literal and evaluates identically to the legacy rule`, () => {
      const sqlRule = sqlRuleFor(symbol);
      const literal = LITERAL[symbol];
      expect(literal).toBeDefined();
      expect(sqlRule).toContain('a_s_m_determination_method IS NOT NULL');
      expect(sqlRule).toContain(literal);
      expect(legacy).toContain(literal);
      // `=` (SQL text) and `==` (TS text) are the same DSL operator — same verdict on every method value.
      for (const method of [undefined, null, 'direct', 'manual', 'soil_estimate', 'geometry'] as const) {
        const lookup = (s: string) => (s === 'a_s_m_determination_method' ? method : undefined);
        expect(evaluateCondition(sqlRule, lookup).kind).toBe(evaluateCondition(legacy, lookup).kind);
      }
      expect(ROLLBACK).toContain(`f.symbol = '${symbol}'`);
    });
  }
  it('rollback sets both back to NULL inside a transaction', () => {
    expect(ROLLBACK).toMatch(/^BEGIN;/m);
    expect(ROLLBACK).toMatch(/^COMMIT;/m);
    expect((ROLLBACK.match(/SET visible_when = NULL/g) ?? []).length).toBe(2);
  });
});
