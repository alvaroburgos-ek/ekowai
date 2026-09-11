import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { regulationTables, regulationTableRows } from '@/lib/db/schema';
import { registerTables, type RegulationTable, type RegulationRow, type ValueColumn } from '@/lib/eval/regulation-tables';

/** Load every registered regulation table (with its rows) for a standard, in
 * the shape the eval-layer registry (`registerTables()`) expects. Returns []
 * when the standard has no tables — callers then keep the TS-constant
 * fallback behavior unchanged (see tab9.ts / tab6-loading.ts). Row queries
 * for the tables run in parallel — each table's rows are independent. */
export async function loadRegulationTables(standardCode: string): Promise<RegulationTable[]> {
  const tables = await db.select().from(regulationTables).where(eq(regulationTables.standardCode, standardCode));
  if (tables.length === 0) return [];
  return Promise.all(
    tables.map(async (t) => {
      const rows = await db.select().from(regulationTableRows).where(eq(regulationTableRows.tableId, t.id)).orderBy(regulationTableRows.orderIndex);
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

/** Load + register a standard's regulation tables into the eval-layer
 * registry in one call. Shared by every SERVER-SIDE consumer that needs
 * `tab6Limit()` / `flaechengruppeToTier()` / `getTab9Entries()` /
 * `lookupTab9()` to read DB-backed values — currently `saveWorksheet`
 * (src/lib/actions/worksheet.ts), whose materialize* calls run entirely on
 * the server where the client-only `WorksheetForm` registration never runs.
 * (The worksheet page keeps its own explicit load-then-pass-as-prop path so
 * the client registry stays in sync with what was rendered.) No-op when the
 * loader returns [] — an unregistered standard is functionally identical to
 * an empty registry (TS-constant fallback). */
export async function ensureRegulationTablesLoaded(standardCode: string): Promise<void> {
  const tables = await loadRegulationTables(standardCode);
  if (tables.length === 0) return;
  registerTables(tables);
}
