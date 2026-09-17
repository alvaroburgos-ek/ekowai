/**
 * Client-parameterised regulation-table loader — NO `server-only` so a tsx
 * script with its own postgres client (the Pass3c importer, I-2) can register
 * a standard's DB tables into the eval-layer registry before validating a
 * workbook. The server-side wrapper `regulation-tables.ts` binds these to the
 * global `db`; every app path keeps importing from there.
 */
import { eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { regulationTables, regulationTableRows } from '@/lib/db/schema';
import { registerTables, type RegulationTable, type RegulationRow, type ValueColumn } from '@/lib/eval/regulation-tables';

/** Any drizzle postgres-js client — the app's `db`, a script's own client, or a transaction handle. */
export type RegulationTablesClient = Pick<PostgresJsDatabase<Record<string, unknown>>, 'select'>;

/** Load every registered regulation table (with its rows) for a standard, in
 * the shape the eval-layer registry (`registerTables()`) expects. Returns []
 * when the standard has no tables — callers then keep the TS-constant
 * fallback behavior unchanged (see tab9.ts / tab6-loading.ts). Row queries
 * for the tables run in parallel — each table's rows are independent. */
export async function loadRegulationTablesWith(dbi: RegulationTablesClient, standardCode: string): Promise<RegulationTable[]> {
  const tables = await dbi.select().from(regulationTables).where(eq(regulationTables.standardCode, standardCode));
  if (tables.length === 0) return [];
  return Promise.all(
    tables.map(async (t) => {
      const rows = await dbi.select().from(regulationTableRows).where(eq(regulationTableRows.tableId, t.id)).orderBy(regulationTableRows.orderIndex);
      return {
        standard_code: t.standardCode,
        edition: t.edition,
        table_code: t.tableCode,
        title_de: t.titleDe,
        clause_reference: t.clauseReference,
        page_ref: t.pageRef,
        key_columns: t.keyColumns,
        value_columns: t.valueColumns as ValueColumn[],
        override_policy: t.overridePolicy as RegulationTable['override_policy'],
        override_quote: t.overrideQuote,
        verification_status: t.verificationStatus,
        rows: rows.map<RegulationRow>((r) => ({
          row_key: r.rowKey,
          keys: r.keys as Record<string, string>,
          group_label: r.groupLabel,
          label_de: r.labelDe,
          order_index: r.orderIndex,
          values: r.values as RegulationRow['values'],
          verbatim_quote: r.verbatimQuote,
        })),
      };
    }),
  );
}

/** Load + register in one call. NEVER THROWS — a query failure (seed not
 * applied, schema missing, connectivity) is logged via `console.warn` and
 * swallowed; the registry is left exactly as it was (`registerTables()` never
 * runs on failure), so accessors fall back to their TS constants. See the
 * server wrapper's doc comment for the caller list and the tx rule. */
export async function ensureRegulationTablesLoadedWith(dbi: RegulationTablesClient, standardCode: string): Promise<void> {
  try {
    const tables = await loadRegulationTablesWith(dbi, standardCode);
    if (tables.length === 0) return;
    registerTables(tables);
  } catch (err) {
    console.warn(
      '[regulation-tables] load failed, using TS constants',
      standardCode,
      err instanceof Error ? err.message : err,
    );
  }
}
