/**
 * Regulation-table access for the generic register engine, with a
 * deploy-before-seed fallback.
 *
 * `resolveRegulationTable` reads the registry first (rows the page/server
 * registered from the DB `regulation_tables`, latest edition) and falls back
 * to the TS seed builders (every `SEED_BUILDERS` entry of
 * `regulation-tables-seed-index.ts` — slug-driven since Plan 3 Task 0) so
 * behaviour is identical while a standard's seed migration is not yet
 * applied. `makeTableLookup` adapts that to the
 * evaluator's `Scope.table` contract (keys matched positionally in
 * `key_columns` order); `makeTableRows` exposes whole tables for the legacy
 * replay's unique-pair matching.
 *
 * Standard-less resolution (Plan 2a Task 7): callers that do not know the
 * standard (the snapshot builder's unit fixtures, legacy hook callers) pass
 * `undefined`; the table code then resolves only when it is UNIQUE across the
 * registered standards, else across the seeded ones. An ambiguous code
 * resolves to nothing — never to a guessed standard.
 */
import { findTableByCode, getTable, type RegulationRow, type RegulationTable } from './regulation-tables';
import { allSeedTables } from './regulation-tables-seed-index';
import type { Scope, Value } from '@/lib/expr';

let seedCache: Map<string, RegulationTable> | null = null; // key `${standard_code}|${table_code}`

function seedTables(): Map<string, RegulationTable> {
  if (!seedCache) {
    seedCache = new Map();
    for (const t of allSeedTables()) seedCache.set(`${t.standard_code}|${t.table_code}`, t);
  }
  return seedCache;
}

/** Unique seed table for a code across all seeded standards; `undefined` when absent or ambiguous. */
function seedTableByCode(tableCode: string): RegulationTable | undefined {
  let hit: RegulationTable | undefined;
  for (const t of seedTables().values()) {
    if (t.table_code !== tableCode) continue;
    if (hit && hit.standard_code !== t.standard_code) return undefined;
    hit = t;
  }
  return hit;
}

/** Registry (latest edition) first — the form/server registered DB rows there; the TS seed builders are the deploy-before-seed fallback. */
export function resolveRegulationTable(standardCode: string | undefined, tableCode: string): RegulationTable | undefined {
  if (!standardCode) return findTableByCode(tableCode) ?? seedTableByCode(tableCode);
  return getTable(standardCode, undefined, tableCode) ?? seedTables().get(`${standardCode}|${tableCode}`);
}

export function makeTableRows(standardCode: string | undefined): (tableCode: string) => RegulationRow[] | undefined {
  return (tableCode) => resolveRegulationTable(standardCode, tableCode)?.rows;
}

/** `(code, keys) → row.values`; `undefined` when the table is unknown, the key arity differs, or no row matches. */
export function makeTableLookup(standardCode: string | undefined): NonNullable<Scope['table']> {
  return (tableCode, keys) => {
    const t = resolveRegulationTable(standardCode, tableCode);
    if (!t || keys.length !== t.key_columns.length) return undefined;
    const want = keys.map((k) => (k == null ? '' : String(k)));
    const row = t.rows.find((r) => t.key_columns.every((col, i) => String(r.keys[col] ?? '') === want[i]));
    return row ? (row.values as Record<string, Value>) : undefined;
  };
}
