/**
 * Task 10b (Plan 2a) — `loadInheritedFields` queries the client it is HANDED.
 *
 * Pins the one-token fix in `worksheet.ts` (`dbi.select` instead of
 * `db.select`): when a caller passes its transaction handle as the 4th
 * argument, the global pool is never touched; without the argument the
 * global `db` is used as before.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { globalDb, makeClient } = vi.hoisted(() => {
  function makeClient() {
    const builder: Record<string, unknown> = {};
    const chain = () => builder;
    builder.from = chain;
    builder.innerJoin = chain;
    builder.where = chain;
    builder.then = (onFulfilled: (rows: never[]) => unknown, onRejected?: (e: unknown) => unknown) =>
      Promise.resolve([] as never[]).then(onFulfilled, onRejected);
    return { select: vi.fn(() => builder), insert: vi.fn(() => builder) };
  }
  return { globalDb: makeClient(), makeClient };
});

vi.mock('@/lib/db', () => ({ db: globalDb }));

import { loadInheritedFields } from '../worksheet';

beforeEach(() => {
  globalDb.select.mockClear();
});

describe('loadInheritedFields client routing', () => {
  it('with a client handed in: queries THAT client once, never the global db', async () => {
    const tx = makeClient();
    const rows = await loadInheritedFields('t', 's', 'c', tx as never);
    expect(rows).toEqual([]);
    expect(tx.select).toHaveBeenCalledTimes(1);
    expect(globalDb.select).not.toHaveBeenCalled();
  });

  it('without the 4th arg: the global db is queried', async () => {
    const rows = await loadInheritedFields('t', 's', 'c');
    expect(rows).toEqual([]);
    expect(globalDb.select).toHaveBeenCalledTimes(1);
  });
});
