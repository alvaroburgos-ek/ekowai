/**
 * I-3 (guideline-to-tool final review): pin every committed generated SQL
 * file against a fresh call of its emitter, so a hand-edit or a stale
 * regeneration drifts loudly in CI instead of silently shipping a migration
 * that doesn't match what `SELECTION_CONFIGS`/`a138SeedTables()` would emit
 * today. Reads the committed files from disk and the entries JSON that
 * drives the selection-config emitters (itself read from disk, not
 * hand-typed here) so this test fails the moment either drifts.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { emitSeedSql } from '../regulation-tables/emit-seed-sql';
import { emitSelectionConfigSql, emitSelectionRollbackSql } from '../regulation-tables/emit-selection-configs-sql';
import { a138SeedTables } from '../../src/lib/eval/regulation-tables-seed-a138';

const ROOT = join(__dirname, '..', '..');
const norm = (s: string): string => s.replace(/\r\n/g, '\n');
const read = (relPath: string): string => norm(readFileSync(join(ROOT, relPath), 'utf8'));

describe('generated-sql freshness — committed files equal a fresh emitter call', () => {
  it('regulation_tables_seed_a138 migration + rollback match emitSeedSql(a138SeedTables())', () => {
    const { up, down } = emitSeedSql(a138SeedTables());
    expect(norm(up)).toBe(read('scripts/migrations/20260911110000_regulation_tables_seed_a138.sql'));
    expect(norm(down)).toBe(read('scripts/rollback-20260911110000-regulation-tables-seed-a138.sql'));
  });

  it('every selection_configs_<STD> migration matches emitSelectionConfigSql(entries) for that standard', () => {
    const entries = JSON.parse(readFileSync(join(ROOT, 'scripts/regulation-tables/selection-config-entries.json'), 'utf8'));
    const perStandard = emitSelectionConfigSql(entries);
    expect(perStandard.size).toBeGreaterThan(0);
    for (const [std, sql] of perStandard) {
      const fileName = `20260911120000_selection_configs_${std.replace(/[^A-Za-z0-9]/g, '_')}.sql`;
      expect(norm(sql)).toBe(read(`scripts/migrations/${fileName}`));
    }
  });

  it('the selection-configs rollback file matches emitSelectionRollbackSql(entries)', () => {
    const entries = JSON.parse(readFileSync(join(ROOT, 'scripts/regulation-tables/selection-config-entries.json'), 'utf8'));
    const rollback = emitSelectionRollbackSql(entries);
    expect(norm(rollback)).toBe(read('scripts/rollback-20260911120000-selection-configs.sql'));
  });

  it('no stray selection_configs migration file exists for a standard the entries JSON no longer touches (e.g. all its entries skipped)', () => {
    const entries = JSON.parse(readFileSync(join(ROOT, 'scripts/regulation-tables/selection-config-entries.json'), 'utf8'));
    const perStandard = emitSelectionConfigSql(entries);
    const { readdirSync } = require('node:fs') as typeof import('node:fs');
    const files = readdirSync(join(ROOT, 'scripts/migrations')).filter((f: string) => f.startsWith('20260911120000_selection_configs_'));
    expect(files.length).toBe(perStandard.size);
  });
});
