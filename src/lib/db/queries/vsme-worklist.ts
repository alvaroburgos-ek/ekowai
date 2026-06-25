import 'server-only';
import { db } from '@/lib/db';
import { fields, worksheetTemplates, standards, projectParameters } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';

/** One field row in the VSME worklist, including any project parameter value. */
export interface WorklistRow {
  fieldId: string;
  symbol: string;
  labelDe: string;
  labelEn: string | null;
  owner: string;
  dataType: string;
  valueText: string | null;
  valueNumber: string | null;
  hasValue: boolean;
}

/**
 * Load all active VSME fields joined with project_parameters for the given
 * project. Rows are grouped by `owner` (null owner falls under 'general').
 * A non-existent projectId simply yields null values everywhere — callers
 * can pass any UUID and will receive the template-level field list.
 */
export async function loadWorklist(
  projectId: string,
): Promise<Record<string, WorklistRow[]>> {
  const rows = await db
    .select({
      fieldId: fields.id,
      symbol: fields.symbol,
      labelDe: fields.labelDe,
      labelEn: fields.labelEn,
      owner: fields.owner,
      dataType: fields.dataType,
      orderIndex: fields.orderIndex,
      valueText: projectParameters.valueText,
      valueNumber: projectParameters.valueNumber,
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
    .where(and(eq(standards.code, 'VSME'), eq(fields.active, true)))
    .orderBy(fields.orderIndex);

  // Group by owner; null owner → 'general'
  const grouped: Record<string, WorklistRow[]> = {};
  for (const row of rows) {
    const ownerKey = row.owner ?? 'general';
    if (!grouped[ownerKey]) grouped[ownerKey] = [];
    const hasValue = row.valueText != null || row.valueNumber != null;
    grouped[ownerKey].push({
      fieldId: row.fieldId,
      symbol: row.symbol,
      labelDe: row.labelDe,
      labelEn: row.labelEn ?? null,
      owner: ownerKey,
      dataType: row.dataType,
      valueText: row.valueText ?? null,
      valueNumber: row.valueNumber ?? null,
      hasValue,
    });
  }

  return grouped;
}
