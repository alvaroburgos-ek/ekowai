import 'server-only';
import { db } from '@/lib/db';
import { projectParameters } from '@/lib/db/schema';
import { and, eq, inArray } from 'drizzle-orm';

export type InputSource = { docId: string; page?: number; note?: string };

export type FieldValue = {
  value: unknown;
  source?: InputSource;
};

export async function readInputsWithSources(
  projectId: string,
  fieldIds: string[],
): Promise<Record<string, FieldValue>> {
  if (fieldIds.length === 0) return {};

  const rows = await db
    .select()
    .from(projectParameters)
    .where(
      and(
        eq(projectParameters.projectId, projectId),
        inArray(projectParameters.fieldId, fieldIds),
      ),
    );

  const out: Record<string, FieldValue> = {};
  for (const r of rows) {
    const value =
      r.valueNumber ?? r.valueText ?? r.valueEnum ?? r.valueDate ?? r.valueBoolean ?? r.valueJson;
    const source =
      r.citationSource && typeof r.citationSource === 'object'
        ? (r.citationSource as InputSource)
        : undefined;
    out[r.fieldId] = { value, source };
  }
  return out;
}
