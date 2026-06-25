import 'server-only';
import { db } from '@/lib/db';
import {
  fields,
  worksheetTemplates,
  standards,
  projectParameters,
  co2ActivityLines,
  projects,
} from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';

export type VsmeExportField = {
  worksheetCode: string;
  worksheetTitle: string;
  symbol: string;
  xbrlElementId: string | null;
  labelDe: string;
  labelEn: string | null;
  owner: string;
  dataType: string;
  unit: string | null;
  value: string | null;
  citationSources: unknown[];
};

export type VsmeExportCo2Line = {
  scope: string;
  category: string;
  subcategory: string | null;
  amount: string;
  unit: string;
  factorUbaId: string;
  factorSourceVersion: string;
  computedTco2e: string | null;
};

export type VsmeExportData = {
  projectName: string;
  fields: VsmeExportField[];
  co2Lines: VsmeExportCo2Line[];
  totals: {
    scope1: number;
    scope2Location: number;
    totalLocation: number;
  };
};

/** GHG output field symbols → totals keys */
const GHG_SYMBOLS: Record<string, keyof VsmeExportData['totals']> = {
  GrossScope1GreenhouseGasEmissions: 'scope1',
  GrossLocationBasedScope2GreenhouseGasEmissions: 'scope2Location',
  TotalGrossLocationBasedScope1AndScope2GHGEmissions: 'totalLocation',
};

/**
 * Load all data needed to generate a VSME export for the given project.
 *
 * Fields are template-level (all active VSME fields) — a non-existent
 * projectId yields null values for all parameters and an empty co2Lines array.
 */
export async function loadVsmeExportData(projectId: string): Promise<VsmeExportData> {
  // ── 1. All active VSME fields + worksheet + optional project parameter row ──
  const rows = await db
    .select({
      // worksheet
      worksheetCode: worksheetTemplates.code,
      worksheetTitleDe: worksheetTemplates.titleDe,
      // field
      symbol: fields.symbol,
      xbrlElementId: fields.xbrlElementId,
      labelDe: fields.labelDe,
      labelEn: fields.labelEn,
      owner: fields.owner,
      dataType: fields.dataType,
      unit: fields.unit,
      orderIndex: fields.orderIndex,
      // project_parameters (LEFT JOIN → may be null)
      valueNumber: projectParameters.valueNumber,
      valueText: projectParameters.valueText,
      valueEnum: projectParameters.valueEnum,
      valueDate: projectParameters.valueDate,
      valueBoolean: projectParameters.valueBoolean,
      citationSources: projectParameters.citationSources,
    })
    .from(fields)
    .innerJoin(worksheetTemplates, eq(worksheetTemplates.id, fields.worksheetTemplateId))
    .innerJoin(standards, eq(standards.id, worksheetTemplates.standardId))
    .leftJoin(
      projectParameters,
      and(
        eq(projectParameters.projectId, projectId),
        eq(projectParameters.fieldId, fields.id),
      ),
    )
    .where(and(eq(standards.code, 'VSME'), eq(fields.active, true)));

  // ── 2. CO₂ activity lines for this project ──
  const co2Rows = await db
    .select({
      scope: co2ActivityLines.scope,
      category: co2ActivityLines.category,
      subcategory: co2ActivityLines.subcategory,
      amount: co2ActivityLines.amount,
      unit: co2ActivityLines.unit,
      factorUbaId: co2ActivityLines.factorUbaId,
      factorSourceVersion: co2ActivityLines.factorSourceVersion,
      computedTco2e: co2ActivityLines.computedTco2e,
    })
    .from(co2ActivityLines)
    .where(eq(co2ActivityLines.projectId, projectId));

  // ── 3. Project name ──
  const projectRows = await db
    .select({ name: projects.name })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  const projectName = projectRows[0]?.name ?? '';

  // ── 4. Build GHG totals from parameter rows ──
  const totals: VsmeExportData['totals'] = {
    scope1: 0,
    scope2Location: 0,
    totalLocation: 0,
  };

  // ── 5. Map rows → VsmeExportField ──
  const exportFields: VsmeExportField[] = rows.map((row) => {
    // Capture GHG totals from symbol → value_number
    if (row.symbol in GHG_SYMBOLS && row.valueNumber != null) {
      const key = GHG_SYMBOLS[row.symbol];
      totals[key] = Number(row.valueNumber);
    }

    // Coalesce value_* columns to a string representation
    let value: string | null = null;
    if (row.valueText != null) {
      value = row.valueText;
    } else if (row.valueNumber != null) {
      value = String(row.valueNumber);
    } else if (row.valueEnum != null) {
      value = row.valueEnum;
    } else if (row.valueDate != null) {
      value = String(row.valueDate);
    } else if (row.valueBoolean != null) {
      value = String(row.valueBoolean);
    }

    const citationSources: unknown[] = Array.isArray(row.citationSources)
      ? (row.citationSources as unknown[])
      : [];

    return {
      worksheetCode: row.worksheetCode,
      worksheetTitle: row.worksheetTitleDe,
      symbol: row.symbol,
      xbrlElementId: row.xbrlElementId ?? null,
      labelDe: row.labelDe,
      labelEn: row.labelEn ?? null,
      owner: row.owner ?? '',
      dataType: row.dataType,
      unit: row.unit ?? null,
      value,
      citationSources,
    };
  });

  const exportCo2Lines: VsmeExportCo2Line[] = co2Rows.map((row) => ({
    scope: row.scope,
    category: row.category,
    subcategory: row.subcategory ?? null,
    amount: String(row.amount),
    unit: row.unit,
    factorUbaId: row.factorUbaId,
    factorSourceVersion: row.factorSourceVersion,
    computedTco2e: row.computedTco2e != null ? String(row.computedTco2e) : null,
  }));

  return {
    projectName,
    fields: exportFields,
    co2Lines: exportCo2Lines,
    totals,
  };
}
