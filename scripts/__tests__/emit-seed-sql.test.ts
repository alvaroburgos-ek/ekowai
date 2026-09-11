import { describe, it, expect } from 'vitest';
import { emitSeedSql } from '../regulation-tables/emit-seed-sql';
import { tab6AsTable } from '@/lib/eval/regulation-tables-seed-a138';

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
});
