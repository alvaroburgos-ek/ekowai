/**
 * Minimal fake Drizzle client for server-path unit tests (no Postgres).
 *
 * Every builder method returns the same chainable object; awaiting the chain
 * resolves the rows registered for the table passed to `from(...)` /
 * `insert(...)` / `update(...)` (looked up by `getTableName`). Each query is
 * appended to `log` in START order as `<kind>:<table>` so ordering
 * assertions (e.g. "X ran before the transaction opened") are possible.
 * `transaction(fn)` logs `transaction:open`, runs `fn` with the SAME client
 * (the tests here are about ordering, not isolation) and logs
 * `transaction:close`.
 *
 * `rows` may map a table to an array (returned for every query on that table)
 * or to a function `(nth) => rows` for tables queried more than once with
 * different expectations (nth = 0-based call count for that table).
 */
import { getTableName } from 'drizzle-orm';

type Row = Record<string, unknown>;
type Rows = Row[];
export type FakeRows = Record<string, Rows | ((nth: number) => Rows)>;

export type FakeDb = {
  select: (...args: unknown[]) => unknown;
  insert: (t: unknown) => unknown;
  update: (t: unknown) => unknown;
  delete: (t: unknown) => unknown;
  execute: (...args: unknown[]) => Promise<Rows>;
  transaction: <T>(fn: (tx: FakeDb) => Promise<T>) => Promise<T>;
  /** Query log in start order: `select:<table>`, `insert:<table>`, `transaction:open`, `transaction:close`. */
  log: string[];
};

function tableName(t: unknown): string {
  try {
    return getTableName(t as Parameters<typeof getTableName>[0]);
  } catch {
    return 'unknown';
  }
}

export function makeFakeDb(rows: FakeRows): FakeDb {
  const log: string[] = [];
  const counts = new Map<string, number>();
  const rowsFor = (table: string): Rows => {
    const entry = rows[table];
    const nth = counts.get(table) ?? 0;
    counts.set(table, nth + 1);
    if (!entry) return [];
    return typeof entry === 'function' ? entry(nth) : entry;
  };

  const makeBuilder = (kind: string) => {
    let table = 'unknown';
    const builder: Record<string, unknown> = {};
    const chain = () => builder;
    builder.from = (t: unknown) => {
      table = tableName(t);
      log.push(`${kind}:${table}`);
      return builder;
    };
    for (const m of ['innerJoin', 'leftJoin', 'where', 'limit', 'orderBy', 'values', 'returning', 'set', 'onConflictDoNothing', 'onConflictDoUpdate', 'groupBy']) {
      builder[m] = chain;
    }
    builder.then = (onFulfilled: (rows: Rows) => unknown, onRejected?: (e: unknown) => unknown) =>
      Promise.resolve().then(() => rowsFor(table)).then(onFulfilled, onRejected);
    return builder;
  };

  const db: FakeDb = {
    log,
    select: () => makeBuilder('select'),
    insert: (t) => { const b = makeBuilder('insert'); (b.from as (t: unknown) => unknown)(t); return b; },
    update: (t) => { const b = makeBuilder('update'); (b.from as (t: unknown) => unknown)(t); return b; },
    delete: (t) => { const b = makeBuilder('delete'); (b.from as (t: unknown) => unknown)(t); return b; },
    execute: async () => { log.push('execute'); return rowsFor('execute'); },
    transaction: async (fn) => {
      log.push('transaction:open');
      try {
        return await fn(db);
      } finally {
        log.push('transaction:close');
      }
    },
  };
  return db;
}
