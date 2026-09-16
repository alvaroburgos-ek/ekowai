/**
 * Regulation-table access for the generic register engine, with a
 * deploy-before-seed fallback.
 *
 * `resolveRegulationTable` reads the registry first (rows the page/server
 * registered from the DB `regulation_tables`, latest edition) and falls back
 * to the A138 TS seed builders so behaviour is identical while the seed
 * migration is not yet applied. `makeTableLookup` adapts that to the
 * evaluator's `Scope.table` contract (keys matched positionally in
 * `key_columns` order); `makeTableRows` exposes whole tables for the legacy
 * replay's unique-pair matching.
 */
import { getTable, type RegulationRow, type RegulationTable } from './regulation-tables';
import { a138SeedTables } from './regulation-tables-seed-a138';
import type { Scope, Value } from '@/lib/expr';

let seedCache: Map<string, RegulationTable> | null = null; // key `${standard_code}|${table_code}`

function seedTables(): Map<string, RegulationTable> {
  if (!seedCache) {
    seedCache = new Map();
    for (const t of a138SeedTables()) seedCache.set(`${t.standard_code}|${t.table_code}`, t);
  }
  return seedCache;
}

/** Registry (latest edition) first — the form/server registered DB rows there; the TS seed builders are the deploy-before-seed fallback. */
export function resolveRegulationTable(standardCode: string, tableCode: string): RegulationTable | undefined {
  return getTable(standardCode, undefined, tableCode) ?? seedTables().get(`${standardCode}|${tableCode}`);
}

export function makeTableRows(standardCode: string): (tableCode: string) => RegulationRow[] | undefined {
  return (tableCode) => resolveRegulationTable(standardCode, tableCode)?.rows;
}

/** `(code, keys) → row.values`; `undefined` when the table is unknown, the key arity differs, or no row matches. */
export function makeTableLookup(standardCode: string): NonNullable<Scope['table']> {
  return (tableCode, keys) => {
    const t = resolveRegulationTable(standardCode, tableCode);
    if (!t || keys.length !== t.key_columns.length) return undefined;
    const want = keys.map((k) => (k == null ? '' : String(k)));
    const row = t.rows.find((r) => t.key_columns.every((col, i) => String(r.keys[col] ?? '') === want[i]));
    return row ? (row.values as Record<string, Value>) : undefined;
  };
}
