/**
 * Plan 3 Task 0 — the slug-driven seed map shared by the emitter CLI and the
 * deploy-before-seed fallback. Pins: A138 keeps its Plan-1 stamp; every entry
 * has a 14-digit ts and a slugFile equal to its key; no two builders seed the
 * same (standard_code, table_code); the fallback resolves every seeded table.
 */
import { describe, it, expect } from 'vitest';
import { SEED_BUILDERS, allSeedTables } from '../regulation-tables-seed-index';
import { a138SeedTables } from '../regulation-tables-seed-a138';
import { resolveRegulationTable } from '../regulation-tables-fallback';

describe('SEED_BUILDERS', () => {
  it('a138 keeps the Plan-1 builder and file stamp', () => {
    expect(SEED_BUILDERS.a138).toEqual({ build: a138SeedTables, ts: '20260911110000', slugFile: 'a138' });
  });
  it('every entry: 14-digit ts, slugFile === key, and no duplicate (standard_code, table_code) across builders', () => {
    const seen = new Map<string, string>();
    for (const [slug, b] of Object.entries(SEED_BUILDERS)) {
      expect(b.ts, slug).toMatch(/^\d{14}$/);
      expect(b.slugFile, slug).toBe(slug);
      for (const t of b.build()) {
        const key = `${t.standard_code}|${t.table_code}`;
        expect(seen.get(key), `${key} seeded by both ${seen.get(key)} and ${slug}`).toBeUndefined();
        seen.set(key, slug);
        expect(t.rows.length, key).toBeGreaterThan(0);
      }
    }
    expect(allSeedTables().length).toBe(seen.size);
  });
  it('the fallback resolves every seeded table by (standard_code, table_code) with no registry entry', () => {
    for (const t of allSeedTables()) expect(resolveRegulationTable(t.standard_code, t.table_code)?.table_code).toBe(t.table_code);
  });
});
