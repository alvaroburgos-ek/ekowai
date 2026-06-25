'use server';
/**
 * recomputeB3Co2 — Scope 1 & 2 GHG engine for the VSME B3 worksheet.
 *
 * Reads co2_activity_lines for a project → resolves each emission factor →
 * computes per-line tCO₂e (updates computed_tco2e cache column) → sums by
 * scope → upserts the 3 VSME output fields into project_parameters with
 * source_type='computed' and per-line citation_sources provenance.
 *
 * Mirrored from the saveWorksheet onConflictDoUpdate pattern in worksheet.ts.
 */
import { db } from '@/lib/db';
import {
  co2ActivityLines,
  fields,
  projectParameters,
  standards,
  worksheetTemplates,
} from '@/lib/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { lineCo2eTonnes, sumByScope } from '@/lib/co2/calc';
import { resolveFactor } from '@/lib/co2/emission-factors';

export type Co2Totals = {
  scope1: number;
  scope2Location: number;
  totalLocation: number;
  lineCount: number;
};

/** Citation entry stored per-line in project_parameters.citation_sources. */
type LineCitation = {
  ubaId: string;
  sourceVersion: string;
  kgCo2e: number;
  amount: number;
  unit: string;
  tco2e: number;
};

/** VSME field symbols for the 3 output parameters. */
const OUTPUT_SYMBOLS = {
  scope1: 'GrossScope1GreenhouseGasEmissions',
  scope2Location: 'GrossLocationBasedScope2GreenhouseGasEmissions',
  total: 'TotalGrossLocationBasedScope1AndScope2GHGEmissions',
} as const;

/**
 * Resolve the field IDs for the 3 VSME output symbols.
 * Joins fields → worksheet_templates → standards where standards.code='VSME'.
 * Returns a map of symbol → field ID. Missing symbols are not included (no crash).
 */
async function resolveOutputFieldIds(): Promise<Map<string, string>> {
  const rows = await db
    .select({ id: fields.id, symbol: fields.symbol })
    .from(fields)
    .innerJoin(worksheetTemplates, eq(worksheetTemplates.id, fields.worksheetTemplateId))
    .innerJoin(standards, eq(standards.id, worksheetTemplates.standardId))
    .where(
      and(
        eq(standards.code, 'VSME'),
        inArray(fields.symbol, Object.values(OUTPUT_SYMBOLS)),
      ),
    );

  return new Map(rows.map((r) => [r.symbol, r.id]));
}

/**
 * Compute Scope 1 & 2 GHG totals for a project and persist them to
 * project_parameters with provenance.
 *
 * @param projectId          - UUID of the project
 * @param worksheetInstanceId - UUID of the worksheet instance (used as
 *                              source_worksheet_instance_id in the upsert)
 * @param userId             - UUID of the actor (stored as entered_by)
 */
export async function recomputeB3Co2(
  projectId: string,
  worksheetInstanceId: string,
  userId: string,
): Promise<Co2Totals> {
  // --- 1. Load all activity lines for this project ---
  const lines = await db
    .select()
    .from(co2ActivityLines)
    .where(eq(co2ActivityLines.projectId, projectId));

  // --- 2. Resolve factors + compute per-line tCO₂e ---
  type ComputedLine = {
    id: string;
    scope: string;
    tco2e: number;
    citation: LineCitation;
  };

  const computed: ComputedLine[] = [];

  for (const line of lines) {
    const factor = await resolveFactor(db, line.factorUbaId, line.factorSourceVersion);
    if (!factor) continue; // skip lines whose factor cannot be resolved

    const amount = Number(line.amount);
    const tco2e = lineCo2eTonnes(amount, factor.kgCo2e);

    // Update the cached computed_tco2e on the line
    await db
      .update(co2ActivityLines)
      .set({ computedTco2e: String(tco2e) })
      .where(eq(co2ActivityLines.id, line.id));

    computed.push({
      id: line.id,
      scope: factor.scope,
      tco2e,
      citation: {
        ubaId: factor.ubaId,
        sourceVersion: factor.sourceVersion,
        kgCo2e: factor.kgCo2e,
        amount,
        unit: line.unit,
        tco2e,
      },
    });
  }

  // --- 3. Sum by scope ---
  const scopeTotals = sumByScope(computed.map((c) => ({ scope: c.scope, tco2e: c.tco2e })));
  const scope1 = scopeTotals['Scope 1'] ?? 0;
  const scope2Location = scopeTotals['Scope 2'] ?? 0;
  const totalLocation = scope1 + scope2Location;

  // --- 4. Build per-scope citation arrays ---
  const scope1Citations = computed
    .filter((c) => c.scope === 'Scope 1')
    .map((c) => c.citation);
  const scope2Citations = computed
    .filter((c) => c.scope === 'Scope 2')
    .map((c) => c.citation);
  const allCitations = computed.map((c) => c.citation);

  // --- 5. Resolve output field IDs ---
  const fieldIds = await resolveOutputFieldIds();

  // --- 6. Build parameter rows for the 3 output fields ---
  type ParamRow = {
    projectId: string;
    fieldId: string;
    sourceWorksheetInstanceId: string;
    sourceType: string;
    enteredBy: string;
    valueNumber: string;
    citationSources: unknown;
  };

  const paramRows: ParamRow[] = [];

  const scope1FieldId = fieldIds.get(OUTPUT_SYMBOLS.scope1);
  if (scope1FieldId) {
    paramRows.push({
      projectId,
      fieldId: scope1FieldId,
      sourceWorksheetInstanceId: worksheetInstanceId,
      sourceType: 'computed',
      enteredBy: userId,
      valueNumber: String(scope1),
      citationSources: scope1Citations,
    });
  }

  const scope2FieldId = fieldIds.get(OUTPUT_SYMBOLS.scope2Location);
  if (scope2FieldId) {
    paramRows.push({
      projectId,
      fieldId: scope2FieldId,
      sourceWorksheetInstanceId: worksheetInstanceId,
      sourceType: 'computed',
      enteredBy: userId,
      valueNumber: String(scope2Location),
      citationSources: scope2Citations,
    });
  }

  const totalFieldId = fieldIds.get(OUTPUT_SYMBOLS.total);
  if (totalFieldId) {
    paramRows.push({
      projectId,
      fieldId: totalFieldId,
      sourceWorksheetInstanceId: worksheetInstanceId,
      sourceType: 'computed',
      enteredBy: userId,
      valueNumber: String(totalLocation),
      citationSources: allCitations,
    });
  }

  // --- 7. Upsert in one transaction (mirror of saveWorksheet pattern) ---
  if (paramRows.length > 0) {
    await db.transaction(async (tx) => {
      await tx
        .insert(projectParameters)
        .values(
          paramRows.map((r) => ({
            projectId: r.projectId,
            fieldId: r.fieldId,
            sourceWorksheetInstanceId: r.sourceWorksheetInstanceId,
            sourceType: r.sourceType,
            enteredBy: r.enteredBy,
            valueNumber: r.valueNumber,
            citationSources: r.citationSources,
          })),
        )
        .onConflictDoUpdate({
          target: [projectParameters.projectId, projectParameters.fieldId],
          set: {
            valueNumber: sql`excluded.value_number`,
            sourceType: sql`excluded.source_type`,
            sourceWorksheetInstanceId: sql`excluded.source_worksheet_instance_id`,
            enteredBy: sql`excluded.entered_by`,
            citationSources: sql`excluded.citation_sources`,
            enteredAt: new Date(),
          },
        });
    });
  }

  return {
    scope1,
    scope2Location,
    totalLocation,
    lineCount: computed.length,
  };
}
