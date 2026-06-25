import 'server-only';
import { db } from '@/lib/db';
import { fields, worksheetTemplates, standards, projectParameters } from '@/lib/db/schema';
import { and, eq, isNotNull, or } from 'drizzle-orm';

/** Owner values used across VSME fields. */
export type Owner = 'ekowai_env' | 'client_supplied' | 'general';

/** Summary payload for the VSME Report Overview dashboard. */
export interface VsmeSummary {
  totalFields: number;
  filledFields: number;
  /** Rounded percentage: Math.round(filledFields / totalFields * 100). */
  completionPct: number;
  /** tCO₂e — Scope 1 gross GHG emissions (0 when absent). */
  scope1: number;
  /** tCO₂e — Scope 2 location-based (0 when absent). */
  scope2Location: number;
  /** tCO₂e — Total Scope 1+2 location-based (0 when absent). */
  totalLocation: number;
  ownerSplit: Record<Owner, { total: number; filled: number }>;
}

/** GHG output field symbols → VsmeSummary keys */
const GHG_SYMBOLS: Record<string, keyof Pick<VsmeSummary, 'scope1' | 'scope2Location' | 'totalLocation'>> = {
  GrossScope1GreenhouseGasEmissions: 'scope1',
  GrossLocationBasedScope2GreenhouseGasEmissions: 'scope2Location',
  TotalGrossLocationBasedScope1AndScope2GHGEmissions: 'totalLocation',
};

/**
 * Load a completion + GHG summary for a given project scoped to the VSME
 * standard. A non-existent projectId yields zero counts for filled/GHG values
 * (fields are template-level; project_parameters rows are optional).
 */
export async function loadVsmeSummary(projectId: string): Promise<VsmeSummary> {
  // Fetch all active VSME fields joined with this project's parameters.
  const rows = await db
    .select({
      fieldId: fields.id,
      symbol: fields.symbol,
      owner: fields.owner,
      valueText: projectParameters.valueText,
      valueNumber: projectParameters.valueNumber,
      valueEnum: projectParameters.valueEnum,
      valueDate: projectParameters.valueDate,
      valueBoolean: projectParameters.valueBoolean,
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

  const ownerSplit: Record<Owner, { total: number; filled: number }> = {
    ekowai_env: { total: 0, filled: 0 },
    client_supplied: { total: 0, filled: 0 },
    general: { total: 0, filled: 0 },
  };

  let totalFields = 0;
  let filledFields = 0;

  const ghg: Record<string, number> = {};

  for (const row of rows) {
    totalFields++;
    const ownerKey: Owner = (row.owner as Owner) ?? 'general';
    // Guard against unexpected owner values
    const bucketKey: Owner =
      ownerKey === 'ekowai_env' || ownerKey === 'client_supplied' ? ownerKey : 'general';
    ownerSplit[bucketKey].total++;

    const hasValue =
      row.valueText != null ||
      row.valueNumber != null ||
      row.valueEnum != null ||
      row.valueDate != null ||
      row.valueBoolean != null;

    if (hasValue) {
      filledFields++;
      ownerSplit[bucketKey].filled++;
    }

    // Capture GHG output values
    if (row.symbol in GHG_SYMBOLS && row.valueNumber != null) {
      ghg[row.symbol] = Number(row.valueNumber);
    }
  }

  const completionPct =
    totalFields === 0 ? 0 : Math.round((filledFields / totalFields) * 100);

  return {
    totalFields,
    filledFields,
    completionPct,
    scope1: ghg['GrossScope1GreenhouseGasEmissions'] ?? 0,
    scope2Location: ghg['GrossLocationBasedScope2GreenhouseGasEmissions'] ?? 0,
    totalLocation: ghg['TotalGrossLocationBasedScope1AndScope2GHGEmissions'] ?? 0,
    ownerSplit,
  };
}
