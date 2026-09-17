import { describe, it, expect } from 'vitest';
import { emitSeedSql, emitSeedSqlFor } from '../regulation-tables/emit-seed-sql';
import { tab6AsTable, tab6AsTablePlan1 } from '@/lib/eval/regulation-tables-seed-a138';

describe('emitSeedSql', () => {
  it('emits idempotent upserts keyed by (standard, edition, table) and (table, row_key)', () => {
    const { up, down } = emitSeedSql([tab6AsTable()]);
    expect(up).toContain("INSERT INTO regulation_tables");
    expect(up).toContain("ON CONFLICT (standard_code, edition, table_code) DO UPDATE");
    expect(up).toContain("ON CONFLICT (table_id, row_key) DO UPDATE");
    expect((up.match(/INSERT INTO regulation_table_rows/g) ?? []).length).toBe(4);
    expect(down).toContain("DELETE FROM regulation_tables WHERE standard_code = 'DWA-A-138-1' AND edition = '2024-10' AND table_code = 'TAB6'");
  });
  it('escapes single quotes in quotes/labels', () => {
    const t = tab6AsTable(); t.rows[0].verbatim_quote = "it's";
    expect(emitSeedSql([t]).up).toContain("'it''s'");
  });
  it('uses row_values, not the reserved `values`, as the row-value column token', () => {
    const { up } = emitSeedSql([tab6AsTable()]);
    expect(up).toContain('row_values');
    expect(up).not.toMatch(/\bvalues\s*=/);
    expect(up).not.toMatch(/,\s*values\s*,/);
  });
  // Plan 3 Task 1: a superseding builder's rollback restores the superseded set instead of deleting everything.
  it('supersedes: up upgrades imported_unverified → md_verified only; down reverts the status, prunes rows/tables the prior set lacks, re-emits the prior set', () => {
    const prior = tab6AsTablePlan1();
    const next = tab6AsTable();
    const extra = { ...tab6AsTablePlan1(), table_code: 'TABX', verification_status: 'imported_unverified' };
    const { up, down } = emitSeedSql([next, extra], { supersedes: [prior] });
    expect(next.verification_status).toBe('md_verified');
    expect(up).toContain("UPDATE regulation_tables SET verification_status = 'md_verified' WHERE standard_code = 'DWA-A-138-1' AND edition = '2024-10' AND table_code = 'TAB6' AND verification_status = 'imported_unverified';");
    expect(up).not.toContain("table_code = 'TABX' AND verification_status"); // unverified tables get no status statement
    // down: status revert (guarded by the status this migration wrote), row prune to the prior row keys, table delete for the new-only table, then the prior upserts verbatim
    expect(down).toContain("UPDATE regulation_tables SET verification_status = 'imported_unverified' WHERE standard_code = 'DWA-A-138-1' AND edition = '2024-10' AND table_code = 'TAB6' AND verification_status = 'md_verified';");
    expect(down).toContain("t.table_code = 'TAB6' AND r.row_key NOT IN ('tier2|thin', 'tier2|thick', 'tier3|thin', 'tier3|thick')");
    expect(down).toContain("DELETE FROM regulation_tables WHERE standard_code = 'DWA-A-138-1' AND edition = '2024-10' AND table_code = 'TABX';");
    expect(down).not.toContain("DELETE FROM regulation_tables WHERE standard_code = 'DWA-A-138-1' AND edition = '2024-10' AND table_code = 'TAB6';");
    const priorUp = emitSeedSql([prior]).up.split('\n').filter((l) => l.startsWith('INSERT') || l.startsWith('SELECT') || l.startsWith('VALUES') || l.startsWith('ON CONFLICT'));
    for (const line of priorUp) expect(down).toContain(line);
    expect(down.indexOf('Re-emit the superseded set')).toBeGreaterThan(down.indexOf("table_code = 'TABX';"));
  });
  it('without supersedes the output is unchanged (no status statement for an imported_unverified table, plain DELETE rollback)', () => {
    const { up, down } = emitSeedSql([tab6AsTablePlan1()]);
    expect(up).not.toContain('verification_status = ');
    expect(down).toBe("BEGIN;\nDELETE FROM regulation_tables WHERE standard_code = 'DWA-A-138-1' AND edition = '2024-10' AND table_code = 'TAB6';\nCOMMIT;\n");
  });
  it('emitSeedSqlFor wires the supersedes builder from SEED_BUILDERS', () => {
    const { down } = emitSeedSqlFor('a138_p3');
    expect(down).toContain('Re-emit the superseded set');
    expect(down).toContain("'Tab. 5 Kurzzeichen D'"); // the Plan-1 synthesised quote comes back on rollback
    expect(emitSeedSqlFor('a138').down).not.toContain('Re-emit');
  });
  it('ends emitted files with a trailing newline', () => {
    const { up, down } = emitSeedSql([tab6AsTable()]);
    expect(up.endsWith('\n')).toBe(true);
    expect(down.endsWith('\n')).toBe(true);
  });
});
