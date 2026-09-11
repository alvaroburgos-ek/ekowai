/**
 * ensureRegulationTablesLoaded() resilience — unit (DB-free).
 *
 * Fix round 2, IMPORTANT: the regulation_tables/regulation_table_rows schema
 * migration may not be applied yet on a given deployment (code can ship
 * ahead of the owner applying it), so a save (saveWorksheet →
 * ensureRegulationTablesLoaded) must never fail because those tables don't
 * exist / the query errors. This test drives loadRegulationTables' first
 * query to reject and asserts:
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
