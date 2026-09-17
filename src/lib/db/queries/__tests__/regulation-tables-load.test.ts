/**
 * I-2 (final review, guideline-to-tool): the client-parameterised loader
 * (`regulation-tables-load.ts`, NO `server-only`) so the Pass3c importer — a
 * tsx script with its own postgres client — can register a standard's DB
 * tables before `validateWorkbook` runs `validateLookupKeysOrder`. The
 * server-only `regulation-tables.ts` wraps it with the global `db`.
 *
 *   (a) maps `regulation_tables` + ordered `regulation_table_rows` into the
 *       registry shape and registers them;
 *   (b) never throws — a failing query warns and leaves the registry untouched;
 *   (c) [] tables ⇒ no registerTables call.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { makeFakeDb } from '@/test-shims/fake-drizzle';
import { clearTables, getTable } from '@/lib/eval/regulation-tables';

afterEach(() => clearTables());

const TABLE = { id: 't1', standardCode: 'X-1', edition: '2026', tableCode: 'TAB1', titleDe: 'Tab. 1', clauseReference: 'Abs. 1', pageRef: '3', keyColumns: ['k'], valueColumns: [{ name: 'v', type: 'number' }], overridePolicy: 'kann', overrideQuote: 'q', verificationStatus: 'imported_unverified' };
const ROW = { tableId: 't1', rowKey: 'a', keys: { k: 'a' }, groupLabel: null, labelDe: 'A', orderIndex: 0, values: { v: 7 }, verbatimQuote: 'Tab. 1: a - 7' };

describe('ensureRegulationTablesLoadedWith(dbi, code)', () => {
  it('registers the mapped tables so getTable() sees them', async () => {
    const { ensureRegulationTablesLoadedWith } = await import('../regulation-tables-load');
    const db = makeFakeDb({ regulation_tables: [TABLE], regulation_table_rows: [ROW] });
    await ensureRegulationTablesLoadedWith(db as never, 'X-1');
    const t = getTable('X-1', undefined, 'TAB1');
    expect(t?.override_policy).toBe('kann');
    expect(t?.rows).toEqual([{ row_key: 'a', keys: { k: 'a' }, group_label: null, label_de: 'A', order_index: 0, values: { v: 7 }, verbatim_quote: 'Tab. 1: a - 7' }]);
    expect(db.log).toEqual(['select:regulation_tables', 'select:regulation_table_rows']);
  });

  it('never throws: a failing query warns and registers nothing', async () => {
    const { ensureRegulationTablesLoadedWith } = await import('../regulation-tables-load');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const bad = { select: () => ({ from: () => ({ where: () => Promise.reject(new Error('relation "regulation_tables" does not exist')) }) }) };
    await expect(ensureRegulationTablesLoadedWith(bad as never, 'X-1')).resolves.toBeUndefined();
    expect(getTable('X-1', undefined, 'TAB1')).toBeUndefined();
    expect(warn).toHaveBeenCalledWith('[regulation-tables] load failed, using TS constants', 'X-1', expect.any(String));
    warn.mockRestore();
  });

  it('[] tables => registry untouched', async () => {
    const { ensureRegulationTablesLoadedWith } = await import('../regulation-tables-load');
    const db = makeFakeDb({ regulation_tables: [] });
    await ensureRegulationTablesLoadedWith(db as never, 'X-1');
    expect(getTable('X-1', undefined, 'TAB1')).toBeUndefined();
    expect(db.log).toEqual(['select:regulation_tables']);
  });
});
