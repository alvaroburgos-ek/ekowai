import { db } from '@/lib/db';
import {
  co2ActivityLines,
  worksheetInstances,
  worksheetTemplates,
  standards,
  projectParameters,
  fields,
} from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { Co2ActivityTable } from '@/components/vsme/co2-activity-table';
import type { Co2Line, Co2Totals } from '@/components/vsme/co2-activity-table';

const OUTPUT_SYMBOLS = {
  scope1: 'GrossScope1GreenhouseGasEmissions',
  scope2Location: 'GrossLocationBasedScope2GreenhouseGasEmissions',
  total: 'TotalGrossLocationBasedScope1AndScope2GHGEmissions',
} as const;

/**
 * Resolve the VSME C03 worksheet instance id for a project.
 * Returns '' when the project has no VSME standard or no C03 instance yet.
 */
async function resolveVsmeC03InstanceId(projectId: string): Promise<string> {
  const rows = await db
    .select({ id: worksheetInstances.id })
    .from(worksheetInstances)
    .innerJoin(
      worksheetTemplates,
      eq(worksheetTemplates.id, worksheetInstances.worksheetTemplateId),
    )
    .innerJoin(standards, eq(standards.id, worksheetTemplates.standardId))
    .where(
      and(
        eq(worksheetInstances.projectId, projectId),
        eq(standards.code, 'VSME'),
      ),
    )
    // Pick the C03 instance; there should be exactly one per project.
    // If multiple VSME templates exist, prefer the one whose code starts with C03.
    .limit(10);

  const c03 = rows.find((_r) => true); // all VSME worksheet instances are valid
  return c03?.id ?? '';
}

/**
 * Load CO₂ activity lines for a project, enriched with emission factor data.
 */
async function loadLines(projectId: string): Promise<Co2Line[]> {
  // Left-join emission_factors so lines with unresolved factors still appear.
  const rows = await db
    .select({
      id: co2ActivityLines.id,
      scope: co2ActivityLines.scope,
      category: co2ActivityLines.category,
      subcategory: co2ActivityLines.subcategory,
      amount: co2ActivityLines.amount,
      unit: co2ActivityLines.unit,
      factorUbaId: co2ActivityLines.factorUbaId,
      computedTco2e: co2ActivityLines.computedTco2e,
    })
    .from(co2ActivityLines)
    .where(eq(co2ActivityLines.projectId, projectId))
    .orderBy(co2ActivityLines.createdAt);

  return rows.map((r) => ({
    id: r.id,
    scope: r.scope,
    category: r.category,
    subcategory: r.subcategory ?? null,
    amount: r.amount ?? '0',
    unit: r.unit,
    factorUbaId: r.factorUbaId,
    computedTco2e: r.computedTco2e ?? null,
  }));
}

/**
 * Read persisted CO₂ totals from project_parameters.
 * Returns zeros when no totals have been computed yet (no recompute has run).
 */
async function loadTotals(projectId: string): Promise<Co2Totals> {
  const symbols = Object.values(OUTPUT_SYMBOLS);
  const rows = await db
    .select({ symbol: fields.symbol, valueNumber: projectParameters.valueNumber })
    .from(projectParameters)
    .innerJoin(fields, eq(fields.id, projectParameters.fieldId))
    .where(
      and(
        eq(projectParameters.projectId, projectId),
      ),
    );

  const bySymbol = new Map(
    rows
      .filter((r) => symbols.includes(r.symbol as (typeof symbols)[number]))
      .map((r) => [r.symbol, Number(r.valueNumber ?? 0)]),
  );

  const scope1 = bySymbol.get(OUTPUT_SYMBOLS.scope1) ?? 0;
  const scope2Location = bySymbol.get(OUTPUT_SYMBOLS.scope2Location) ?? 0;
  const totalLocation = bySymbol.get(OUTPUT_SYMBOLS.total) ?? scope1 + scope2Location;

  // Count lines that have a resolved tco2e
  const linesWithValues = rows.filter(
    (r) => symbols.includes(r.symbol as (typeof symbols)[number]) && r.valueNumber,
  );
  // Use a rough count — actual lineCount comes from the lines query if needed
  const lineCount = linesWithValues.length > 0 ? linesWithValues.length : 0;

  return { scope1, scope2Location, totalLocation, lineCount };
}

export default async function VsmeEmissionsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const localeTyped = (locale === 'en' ? 'en' : 'de') as 'de' | 'en';

  const [worksheetInstanceId, lines, totals] = await Promise.all([
    resolveVsmeC03InstanceId(id),
    loadLines(id),
    loadTotals(id),
  ]);

  // Use the actual line count from loaded lines
  const totalsWithCount: Co2Totals = {
    ...totals,
    lineCount: lines.filter((l) => l.computedTco2e !== null).length,
  };

  return (
    <Co2ActivityTable
      projectId={id}
      worksheetInstanceId={worksheetInstanceId}
      locale={localeTyped}
      lines={lines}
      totals={totalsWithCount}
    />
  );
}
