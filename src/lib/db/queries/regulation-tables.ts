import 'server-only';
import { db } from '@/lib/db';
import { regulationTables, standards, worksheetTemplates } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';

/**
 * Reader for the printed reference tables of a standard.
 *
 * WHY THIS EXISTS. DWA-A 138-1's Tabelle 9 is the one table an engineer can
 * actually use in the Wizard: you pick a surface type and the runoff
 * coefficients fill themselves in. That table is hardcoded in
 * `lib/eval/tab9.ts`. Meanwhile 5 382 rows of printed tables across 35 other
 * standards sit in `regulation_tables` and no code path reads them, so for
 * every other standard the engineer has to already know the value or open the
 * PDF. This module closes that gap for reading; picking a row to fill a field
 * still needs a per-field mapping that does not exist yet.
 */

/** One printed cell, as stored. */
export type RegulationCell = {
  id: string;
  tableId: string | null;
  tableName: string | null;
  rowNumber: number | null;
  parameterLabel: string | null;
  parameterSymbol: string | null;
  variantDimension: string | null;
  variantValue: string | null;
  valueText: string | null;
  valueNumeric: string | null;
  unit: string | null;
  comparison: string | null;
  clauseReference: string | null;
  sourceQuote: string | null;
};

/** A printed table, grouped from its cells, ready to render. */
export type RegulationTable = {
  tableId: string;
  tableName: string;
  clauseReference: string | null;
  /** distinct column axis of this table, in first-seen order; empty if the table has no variant axis */
  variants: string[];
  variantDimension: string | null;
  rows: RegulationCell[];
};

const cellColumns = {
  id: regulationTables.id,
  tableId: regulationTables.tableId,
  tableName: regulationTables.tableName,
  rowNumber: regulationTables.rowNumber,
  parameterLabel: regulationTables.parameterLabel,
  parameterSymbol: regulationTables.parameterSymbol,
  variantDimension: regulationTables.variantDimension,
  variantValue: regulationTables.variantValue,
  valueText: regulationTables.valueText,
  valueNumeric: regulationTables.valueNumeric,
  unit: regulationTables.unit,
  comparison: regulationTables.comparison,
  clauseReference: regulationTables.clauseReference,
  sourceQuote: regulationTables.sourceQuote,
};

/** Group flat cells into printed tables, preserving stored order. */
function group(cells: RegulationCell[]): RegulationTable[] {
  const out = new Map<string, RegulationTable>();
  for (const c of cells) {
    // A cell with neither id nor caption cannot be attributed to a printed
    // table; showing it under an invented heading would misrepresent the source.
    const key = c.tableId ?? c.tableName;
    if (!key) continue;
    let t = out.get(key);
    if (!t) {
      t = {
        tableId: c.tableId ?? key,
        tableName: c.tableName ?? key,
        clauseReference: c.clauseReference,
        variants: [],
        variantDimension: c.variantDimension,
        rows: [],
      };
      out.set(key, t);
    }
    if (c.variantValue && !t.variants.includes(c.variantValue)) t.variants.push(c.variantValue);
    if (!t.variantDimension && c.variantDimension) t.variantDimension = c.variantDimension;
    t.rows.push(c);
  }
  return [...out.values()];
}

/** Every printed table of a standard, by standard id. */
export async function listRegulationTablesByStandardId(
  standardId: string,
): Promise<RegulationTable[]> {
  const cells = await db
    .select(cellColumns)
    .from(regulationTables)
    .where(eq(regulationTables.standardId, standardId))
    .orderBy(asc(regulationTables.tableId), asc(regulationTables.rowNumber));
  return group(cells);
}

/** Every printed table of a standard, by standard code (e.g. 'DWA-A-262E'). */
export async function listRegulationTablesByCode(code: string): Promise<RegulationTable[]> {
  const cells = await db
    .select(cellColumns)
    .from(regulationTables)
    .innerJoin(standards, eq(standards.id, regulationTables.standardId))
    .where(eq(standards.code, code))
    .orderBy(asc(regulationTables.tableId), asc(regulationTables.rowNumber));
  return group(cells);
}

/**
 * Tables of the standard that owns a worksheet template — the lookup the
 * worksheet view needs, since it knows its template, not its standard.
 */
export async function listRegulationTablesForWorksheetTemplate(
  worksheetTemplateId: string,
): Promise<RegulationTable[]> {
  const cells = await db
    .select(cellColumns)
    .from(regulationTables)
    .innerJoin(
      worksheetTemplates,
      eq(worksheetTemplates.standardId, regulationTables.standardId),
    )
    .where(eq(worksheetTemplates.id, worksheetTemplateId))
    .orderBy(asc(regulationTables.tableId), asc(regulationTables.rowNumber));
  return group(cells);
}

/** How many printed tables a standard has, for a badge/count without loading them. */
export async function countRegulationTablesByStandardId(standardId: string): Promise<number> {
  const rows = await db
    .select({ tableId: regulationTables.tableId, tableName: regulationTables.tableName })
    .from(regulationTables)
    .where(eq(regulationTables.standardId, standardId));
  return new Set(rows.map((r) => r.tableId ?? r.tableName).filter(Boolean)).size;
}
