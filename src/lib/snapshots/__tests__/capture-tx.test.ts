/**
 * Task 10b (Plan 2a) — snapshot capture must never mix the caller's
 * transaction with the global connection pool.
 *
 * Prod incident 2026-09-17: "Zur Prüfung einreichen" hung on every worksheet
 * (idle-in-transaction session, wait ClientRead). `transitionWorksheet` runs
 * `captureSnapshot({ txDb: tx })` inside `db.transaction`; `loadCaptureInputs`
 * ran its own selects on `tx` but called `loadInheritedFields(...)`, which
 * queried the GLOBAL `db` — inside a `Promise.all`. With a small pool the
 * global query waits for a connection the open transaction holds → the
 * transition never returns.
 *
 * These tests pin the contract:
 *   (a) `loadInheritedFields` receives the caller's `txDb` as its db client;
 *   (b) no query touches the global `db` while `txDb` is provided;
 *   (c) every load goes through `txDb` — sequentially, one at a time (a
 *       transaction client is a single connection);
 *   (d) without `txDb` the behaviour is unchanged: the global `db` is used
 *       and `loadInheritedFields` gets that same client.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTableName } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Fake Drizzle client: records every query (table + order) and resolves the
// minimal rows `loadCaptureInputs` needs. Chain methods return the same
// builder; awaiting the builder resolves the rows for the `from`/`into` table.
//
// `vi.mock` factories are hoisted above every `const` in this file, so the
// fakes they reference are built inside `vi.hoisted`.
// ---------------------------------------------------------------------------
const { makeFakeClient, ROWS, globalDb, loadInheritedFieldsMock } = vi.hoisted(() => {
  type Rows = Record<string, unknown>[];

  const tableName = (t: unknown): string => {
    try {
      return getTableName(t as Parameters<typeof getTableName>[0]);
    } catch {
      return 'unknown';
    }
  };

  function makeFakeClient(name: string, rowsByTable: Record<string, Rows>) {
    /** Query log in START order and in RESOLVE order, plus the peak number of
     * concurrently in-flight queries — so sequential execution is assertable. */
    const started: string[] = [];
    const resolved: string[] = [];
    let inFlight = 0;
    let maxInFlight = 0;

    const makeBuilder = (kind: 'select' | 'insert') => {
      let table = 'unknown';
      const builder: Record<string, unknown> = {};
      const chain = () => builder;
      builder.from = (t: unknown) => {
        table = tableName(t);
        started.push(`${name}:${kind}:${table}`);
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        return builder;
      };
      builder.innerJoin = chain;
      builder.where = chain;
      builder.limit = chain;
      builder.orderBy = chain;
      builder.values = chain;
      builder.returning = chain;
      // thenable → `await builder` resolves the rows. Resolve on a macrotask
      // so concurrently started queries actually overlap (that is what makes
      // `maxInFlight` meaningful).
      builder.then = (onFulfilled: (rows: Rows) => unknown, onRejected?: (e: unknown) => unknown) =>
        new Promise<Rows>((res) => {
          setTimeout(() => {
            inFlight -= 1;
            resolved.push(`${name}:${kind}:${table}`);
            res(rowsByTable[table] ?? []);
          }, 0);
        }).then(onFulfilled, onRejected);
      return builder;
    };

    const client = {
      select: vi.fn(() => makeBuilder('select')),
      insert: vi.fn((t: unknown) => {
        const b = makeBuilder('insert');
        // insert(table).values(...).returning(...) — record at insert() time.
        (b.from as (t: unknown) => unknown)(t);
        return b;
      }),
    };
    return {
      client,
      started,
      resolved,
      get maxInFlight() {
        return maxInFlight;
      },
    };
  }

  const ROWS: Record<string, Rows> = {
    worksheet_instances: [{ id: 'inst-1', projectId: 'proj-1', worksheetTemplateId: 'tpl-1' }],
    worksheet_templates: [{ code: 'A138-10', standardId: 'std-1', standardCode: 'DWA-A-138-1' }],
    fields: [
      {
        id: 'field-x',
        worksheetTemplateId: 'tpl-1',
        sectionId: null,
        symbol: 'x',
        dataType: 'number',
        labelDe: 'x',
        labelEn: null,
        unit: null,
        isRequired: false,
        enumValues: null,
        validationRules: null,
        clauseReference: null,
        description: null,
        consumerWorksheets: null,
        orderIndex: 0,
        verificationStatus: 'imported_unverified',
        active: true,
        defaultValue: null,
        visibleWhen: null,
      },
    ],
    equations: [],
    compliance_requirements: [],
    worksheet_sections: [],
    project_parameters: [],
    calculation_snapshots: [{ id: 'snap-1' }],
  };

  // The GLOBAL db: a fake client too, so a stray query is an assertion failure
  // (not a thrown proxy error) and we can see exactly which query leaked.
  const globalDb = makeFakeClient('GLOBAL', ROWS);
  const loadInheritedFieldsMock = vi.fn<(...args: unknown[]) => Promise<never[]>>(async () => []);

  return { makeFakeClient, ROWS, globalDb, loadInheritedFieldsMock };
});

vi.mock('@/lib/db', () => ({ db: globalDb.client }));
vi.mock('@/lib/db/queries/worksheet', () => ({
  loadInheritedFields: (...args: unknown[]) => loadInheritedFieldsMock(...args),
}));

import { captureSnapshot } from '../capture';

/** The set of queries `captureSnapshot` issues on ONE client. Instance and
 * template resolve first (everything else keys off them); the remaining
 * loads + the insert are asserted as a set — their relative order is an
 * implementation detail, not part of the contract. */
function expectCaptureQueries(started: readonly string[], client: 'TX' | 'GLOBAL') {
  expect(started.slice(0, 2)).toEqual([
    `${client}:select:worksheet_instances`,
    `${client}:select:worksheet_templates`,
  ]);
  expect(new Set(started.slice(2))).toEqual(
    new Set([
      `${client}:select:fields`,
      `${client}:select:equations`,
      `${client}:select:compliance_requirements`,
      `${client}:select:worksheet_sections`,
      `${client}:select:project_parameters`,
      `${client}:insert:calculation_snapshots`,
    ]),
  );
  expect(started).toHaveLength(8);
}

beforeEach(() => {
  loadInheritedFieldsMock.mockClear();
  globalDb.client.select.mockClear();
  globalDb.client.insert.mockClear();
  globalDb.started.length = 0;
  globalDb.resolved.length = 0;
});

describe('captureSnapshot inside a transaction (txDb provided)', () => {
  it('passes txDb to loadInheritedFields and never touches the global db', async () => {
    const tx = makeFakeClient('TX', ROWS);

    const id = await captureSnapshot({
      worksheetInstanceId: 'inst-1',
      takenByUserId: 'user-1',
      trigger: 'submit_for_review',
      txDb: tx.client as never,
    });
    expect(id).toBe('snap-1');

    // (a) loadInheritedFields got the SAME transaction client as 4th arg.
    expect(loadInheritedFieldsMock).toHaveBeenCalledTimes(1);
    const call = loadInheritedFieldsMock.mock.calls[0] as unknown[];
    expect(call[0]).toBe('tpl-1');
    expect(call[1]).toBe('std-1');
    expect(call[2]).toBe('A138-10');
    expect(call[3]).toBe(tx.client);

    // (b) the global pool was never queried.
    expect(globalDb.client.select).not.toHaveBeenCalled();
    expect(globalDb.client.insert).not.toHaveBeenCalled();
    expect(globalDb.started).toEqual([]);

    // (c) every load + the insert went through txDb.
    expectCaptureQueries(tx.started, 'TX');
  });

  it('runs the loads sequentially on the transaction client (one query in flight at a time)', async () => {
    const tx = makeFakeClient('TX', ROWS);
    await captureSnapshot({
      worksheetInstanceId: 'inst-1',
      takenByUserId: 'user-1',
      trigger: 'submit_for_review',
      txDb: tx.client as never,
    });
    // A transaction handle is ONE connection — queries must not overlap.
    expect(tx.maxInFlight).toBe(1);
    // Started order == resolved order (no interleaving).
    expect(tx.resolved).toEqual(tx.started);
  });
});

describe('captureSnapshot without txDb (global db path)', () => {
  it('uses the global db for its own loads AND hands it to loadInheritedFields', async () => {
    const id = await captureSnapshot({
      worksheetInstanceId: 'inst-1',
      takenByUserId: 'user-1',
      trigger: 'approve',
    });
    expect(id).toBe('snap-1');

    expect(loadInheritedFieldsMock).toHaveBeenCalledTimes(1);
    const call = loadInheritedFieldsMock.mock.calls[0] as unknown[];
    expect(call[3]).toBe(globalDb.client);

    expectCaptureQueries(globalDb.started, 'GLOBAL');
  });
});
