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
 * `lookupTab9()` or the generic `makeTableLookup()` (derived register
 * columns, `lookup_value` refills, `lookup_fill`) to read DB-backed values.
 * Callers (C-1, final review): `saveWorksheet` (src/lib/actions/worksheet.ts —
 * materialize* runs on the server), `transitionWorksheet` (BEFORE its
 * transaction — the snapshot capture inside the tx evaluates registers),
 * `checkApprovalGate`, `loadStandardReportData` (Prüfmemo / standard report)
 * and `loadProjectReportData` (project report). The client-only
 * `WorksheetForm` registration never runs on these paths. (The worksheet
 * page keeps its own explicit load-then-pass-as-prop path so the client
 * registry stays in sync with what was rendered.) No-op when the loader
 * returns [] — an unregistered standard is functionally identical to an empty
 * registry (TS-constant fallback). Must be called OUTSIDE any `db.transaction`
 * (it queries the global pool — inside a tx that is the Task 10b hang).
 *
 * NEVER THROWS. Guards against the `regulation_tables`/`regulation_table_rows`
 * DATA migration (the A138 seed,
 * scripts/migrations/20260911110000_regulation_tables_seed_a138.sql) not
 * having been applied yet, or a transient connectivity failure — a query
 * failure here (missing seed data, connectivity) must not break the caller,
 * and `saveWorksheet` in particular must never fail a save because of this.
 * Any error is caught, logged via `console.warn`, and swallowed; the
 * eval-layer registry is left exactly as it was (untouched —
 * `registerTables()` never runs on failure), so accessors fall back to their
 * TS constants, matching pre-Task-6 behavior.
 *
 * C-1 (final review, guideline-to-tool): this does NOT stand in for the
 * `regulation_tables`/`regulation_table_rows` SCHEMA migration
 * (supabase/migrations/20260911100000_guideline_to_tool_schema.sql). If that
 * schema migration itself hasn't been applied, the `db.select().from(...)`
 * calls above still fail cleanly and are still caught by this function's
 * try/catch (a missing relation is just another query failure) — but the
 * SAME schema migration also adds four columns to `fields`
 * (widget/ui_config/lookup/visible_when), and those are read by ordinary,
 * NOT try/catch-wrapped `db.select().from(fields)` calls elsewhere in the
 * codebase. A build that ships ahead of the schema migration is broken for
 * every worksheet read/save, not merely degraded on this table's data. See
 * "Apply order (hard constraint)" in
 * docs/superpowers/guideline-to-tool-playbook.md. */
export async function ensureRegulationTablesLoaded(standardCode: string): Promise<void> {
  try {
    const tables = await loadRegulationTables(standardCode);
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
