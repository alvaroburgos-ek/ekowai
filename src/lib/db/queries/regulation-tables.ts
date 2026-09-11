import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { regulationTables, regulationTableRows } from '@/lib/db/schema';
import type { RegulationTable, RegulationRow, ValueColumn } from '@/lib/eval/regulation-tables';

/** Load every registered regulation table (with its rows) for a standard, in
 * the shape the eval-layer registry (`registerTables()`) expects. Returns []
 * when the standard has no tables — callers then keep the TS-constant
 * fallback behavior unchanged (see tab9.ts / tab6-loading.ts). */
export async function loadRegulationTables(standardCode: string): Promise<RegulationTable[]> {
  const tables = await db.select().from(regulationTables).where(eq(regulationTables.standardCode, standardCode));
  if (tables.length === 0) return [];
  const out: RegulationTable[] = [];
  for (const t of tables) {
    const rows = await db.select().from(regulationTableRows).where(eq(regulationTableRows.tableId, t.id)).orderBy(regulationTableRows.orderIndex);
    out.push({
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
    });
  }
  return out;
}
