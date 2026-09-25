/**
 * Regression for the prod submit hang (2026-09-17, project TEST-A138-BESS-Mulde):
 * `transitionWorksheet` runs `captureSnapshot` inside `db.transaction`, and
 * `loadCaptureInputs` used to call `loadInheritedFields()` on the GLOBAL pool
 * while its three sibling selects ran on the `tx` handle. The transaction then
 * waited on a second pooled connection and sat idle-in-transaction forever.
 *
 * Pins: (1) `loadInheritedFields` runs on the client it is given, never on the
 * global `db` when a client is passed; (2) `captureSnapshot({ txDb })` hands
 * that same `txDb` to `loadInheritedFields`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- global pool mock: every select records itself so we can assert it is NOT touched ----
const globalSelect = vi.fn();
vi.mock('@/lib/db', () => ({
  db: {
    select: (...args: unknown[]) => globalSelect(...args),
    insert: vi.fn(),
    transaction: vi.fn(),
  },
}));

/** A minimal Drizzle-like client: each `select()` consumes the next scripted
 * row set; the chain is awaitable at any point (`await q.where(...)`) and
 * `.limit()` resolves too. */
function makeClient(script: unknown[][]) {
  let call = 0;
  const select = vi.fn(() => {
    const rows = script[call++] ?? [];
    type Chain = {
      from: () => Chain; innerJoin: () => Chain; where: () => Chain;
      limit: () => Promise<unknown[]>;
      then: (ok: (v: unknown[]) => unknown, ko?: (e: unknown) => unknown) => Promise<unknown>;
    };
    const chain: Chain = {
      from: () => chain,
      innerJoin: () => chain,
      where: () => chain,
      limit: () => Promise.resolve(rows),
      then: (ok, ko) => Promise.resolve(rows).then(ok, ko),
    };
    return chain;
  });
  const insert = vi.fn(() => ({
    values: () => ({ returning: () => Promise.resolve([{ id: 'snap-1' }]) }),
  }));
  return { select, insert };
}

beforeEach(() => {
  globalSelect.mockReset();
  globalSelect.mockImplementation(() => {
    throw new Error('global db.select must not be used when a client is passed');
  });
});

describe('loadInheritedFields(client)', () => {
  it('runs on the passed client and never touches the global pool', async () => {
    const { loadInheritedFields } = await import('@/lib/db/queries/worksheet');
    const client = makeClient([[{ field: { id: 'f1', symbol: 'A_C' }, originCode: 'A138-07' }]]);
    const rows = await loadInheritedFields('tpl-13', 'std-a138', 'A138-13', client as never);
    expect(client.select).toHaveBeenCalledTimes(1);
    expect(globalSelect).not.toHaveBeenCalled();
    expect(rows).toEqual([{ id: 'f1', symbol: 'A_C', originWorksheetCode: 'A138-07' }]);
  });

  it('defaults to the global pool when no client is passed (page render path)', async () => {
    const { loadInheritedFields } = await import('@/lib/db/queries/worksheet');
    const fallback = makeClient([[]]);
    globalSelect.mockImplementation((...args: unknown[]) => fallback.select(...(args as [])));
    await loadInheritedFields('tpl-13', 'std-a138', 'A138-13');
    expect(globalSelect).toHaveBeenCalledTimes(1);
  });
});

describe('captureSnapshot({ txDb })', () => {
  it('passes the transaction handle through to loadInheritedFields', async () => {
    vi.doMock('@/lib/db/queries/worksheet', () => ({
      loadInheritedFields: vi.fn().mockResolvedValue([]),
    }));
    const worksheetQueries = await import('@/lib/db/queries/worksheet');
    const { captureSnapshot } = await import('../capture');

    const tx = makeClient([
      [{ id: 'inst-1', projectId: 'proj-1', worksheetTemplateId: 'tpl-13' }], // instanceRows (.limit)
      [{ code: 'A138-13', standardId: 'std-a138' }],                          // tplRow (.limit)
      [], // ownFields
      [], // equations
      [], // complianceRequirements
      [], // worksheet_sections (branch Plan 2a Task 10 — visible_when; merged 2026-09-25)
    ]);

    const id = await captureSnapshot({
      worksheetInstanceId: 'inst-1',
      takenByUserId: 'user-1',
      trigger: 'submit_for_review',
      txDb: tx as never,
    });

    expect(id).toBe('snap-1');
    expect(worksheetQueries.loadInheritedFields).toHaveBeenCalledTimes(1);
    const args = (worksheetQueries.loadInheritedFields as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(args.slice(0, 3)).toEqual(['tpl-13', 'std-a138', 'A138-13']);
    expect(args[3]).toBe(tx); // the fix: same client as the sibling selects
    expect(globalSelect).not.toHaveBeenCalled();
    // instance, template, own fields, equations, CRs, sections — all six on the tx handle.
    expect(tx.select).toHaveBeenCalledTimes(6);
    expect(tx.insert).toHaveBeenCalledTimes(1);
  });
});
