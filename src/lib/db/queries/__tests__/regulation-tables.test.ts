/**
 * ensureRegulationTablesLoaded() resilience — unit (DB-free).
 *
 * Fix round 2, IMPORTANT: the regulation_tables/regulation_table_rows DATA
 * migration (the A138 seed) may not be applied yet on a given deployment
 * (code can ship ahead of the owner applying it), so a save (saveWorksheet →
 * ensureRegulationTablesLoaded) must never fail because that seed data is
 * missing / the query errors. This test drives loadRegulationTables' first
 * query to reject and asserts:
 *
 * C-1 (final review, guideline-to-tool): this resilience guard is a DATA
 * concern — it does NOT mean a build is safe to deploy before the
 * `regulation_tables`/`regulation_table_rows` SCHEMA migration
 * (supabase/migrations/20260911100000_guideline_to_tool_schema.sql). That
 * schema migration also adds `fields.widget/ui_config/lookup/visible_when`,
 * which ordinary (non-try/catch) `db.select().from(fields)` calls elsewhere
 * read — a build ahead of the SCHEMA migration fails on every worksheet
 * read/save. See "Apply order (hard constraint)" in
 * docs/superpowers/guideline-to-tool-playbook.md.
 *   - ensureRegulationTablesLoaded resolves (never throws/rejects).
 *   - console.warn is called with the documented prefix.
 *   - registerTables() is NOT called (registry stays untouched on failure).
 *
 * DB is fully mocked via vi.mock('@/lib/db', ...) — same pattern as
 * src/lib/actions/__tests__/citations-write-lock.test.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const registerTablesMock = vi.fn();

vi.mock('@/lib/eval/regulation-tables', () => ({
  registerTables: registerTablesMock,
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        // loadRegulationTables' first query: db.select().from(regulationTables).where(...)
        where: () => Promise.reject(new Error('relation "regulation_tables" does not exist')),
      }),
    }),
  },
}));

describe('ensureRegulationTablesLoaded — resilience (fix round 2)', () => {
  beforeEach(() => {
    registerTablesMock.mockClear();
  });

  it('never throws when the underlying query fails — warns and leaves the registry untouched', async () => {
    const { ensureRegulationTablesLoaded } = await import('../regulation-tables');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(ensureRegulationTablesLoaded('DWA-A-138-1')).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledWith(
      '[regulation-tables] load failed, using TS constants',
      'DWA-A-138-1',
      expect.any(String),
    );
    expect(registerTablesMock).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});
