'use server';
import { db } from '@/lib/db';
import {
  worksheetInstances,
  projectParameters,
  fields,
  auditLog,
} from '@/lib/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';

type FieldValue =
  | { type: 'number'; value: number | null }
  | { type: 'text'; value: string | null }
  | { type: 'enum'; value: string | null }
  | { type: 'date'; value: string | null }
  | { type: 'boolean'; value: boolean | null }
  | { type: 'json'; value: unknown };

export type SaveWorksheetInput = {
  instanceId: string;
  values: Record<string, FieldValue>;   // by field_id
};

export type SaveWorksheetResult =
  | { ok: true; saved: number; warnings: string[] }
  | { ok: false; error: string };

/** Save user-entered values for a worksheet instance.
 * - Auth: user must be member of the owning org (enforced by RLS).
 * - For each changed field: UPSERT project_parameters + INSERT audit_log.
 * - All in one transaction.
 */
export async function saveWorksheet(
  input: SaveWorksheetInput,
): Promise<SaveWorksheetResult> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Not authenticated' };
  const userId = auth.user.id;

  // Load instance + verify access via RLS (returns nothing if not org member)
  const [instance] = await db
    .select()
    .from(worksheetInstances)
    .where(eq(worksheetInstances.id, input.instanceId))
    .limit(1);
  if (!instance) return { ok: false, error: 'Worksheet not found or no access' };

  const fieldIds = Object.keys(input.values);
  if (fieldIds.length === 0) {
    return { ok: true, saved: 0, warnings: [] };
  }

  // Load field metadata to verify data_type alignment
  const fieldMetas = await db
    .select({ id: fields.id, dataType: fields.dataType })
    .from(fields)
    .where(inArray(fields.id, fieldIds));
  const dataTypeById = new Map(fieldMetas.map((f) => [f.id, f.dataType]));

  // Load existing parameters for diff
  const existing = await db
    .select()
    .from(projectParameters)
    .where(
      and(
        eq(projectParameters.projectId, instance.projectId),
        inArray(projectParameters.fieldId, fieldIds),
      ),
    );
  const existingById = new Map(existing.map((p) => [p.fieldId, p]));

  const warnings: string[] = [];
  let savedCount = 0;

  await db.transaction(async (tx) => {
    for (const fieldId of fieldIds) {
      const expectedType = dataTypeById.get(fieldId);
      const incoming = input.values[fieldId];
      if (!expectedType) {
        warnings.push(`Field ${fieldId} not found — skipped`);
        continue;
      }
      if (expectedType !== incoming.type) {
        warnings.push(
          `Field ${fieldId} expected ${expectedType} but got ${incoming.type} — skipped`,
        );
        continue;
      }

      const valueColumns: {
        valueNumber: string | null;
        valueText: string | null;
        valueEnum: string | null;
        valueDate: string | null;
        valueBoolean: boolean | null;
        valueJson: unknown;
      } = {
        valueNumber: null,
        valueText: null,
        valueEnum: null,
        valueDate: null,
        valueBoolean: null,
        valueJson: null,
      };
      switch (incoming.type) {
        case 'number':
          valueColumns.valueNumber = incoming.value == null ? null : String(incoming.value);
          break;
        case 'text':
          valueColumns.valueText = incoming.value;
          break;
        case 'enum':
          valueColumns.valueEnum = incoming.value;
          break;
        case 'date':
          valueColumns.valueDate = incoming.value;
          break;
        case 'boolean':
          valueColumns.valueBoolean = incoming.value;
          break;
        case 'json':
          valueColumns.valueJson = incoming.value;
          break;
      }

      const prev = existingById.get(fieldId);
      const action = prev ? 'update' : 'insert';

      await tx
        .insert(projectParameters)
        .values({
          projectId: instance.projectId,
          fieldId,
          sourceWorksheetInstanceId: instance.id,
          sourceType: 'entered',
          enteredBy: userId,
          ...valueColumns,
        })
        .onConflictDoUpdate({
          target: [projectParameters.projectId, projectParameters.fieldId],
          set: {
            valueNumber: valueColumns.valueNumber,
            valueText: valueColumns.valueText,
            valueEnum: valueColumns.valueEnum,
            valueDate: valueColumns.valueDate,
            valueBoolean: valueColumns.valueBoolean,
            valueJson: valueColumns.valueJson,
            sourceType: 'entered',
            sourceWorksheetInstanceId: instance.id,
            enteredBy: userId,
            enteredAt: new Date(),
          },
        });

      await tx.insert(auditLog).values({
        actorId: userId,
        actorRole: 'engineer',
        projectId: instance.projectId,
        tableName: 'project_parameters',
        recordId: fieldId,
        action,
        changes: {
          fieldId,
          before: prev ? extractValue(prev, expectedType) : null,
          after: incoming.value,
        },
      });

      savedCount++;
    }

    await tx
      .update(worksheetInstances)
      .set({ updatedAt: new Date() })
      .where(eq(worksheetInstances.id, instance.id));
  });

  return { ok: true, saved: savedCount, warnings };
}

function extractValue(
  p: typeof projectParameters.$inferSelect,
  type: string,
): unknown {
  switch (type) {
    case 'number':
      return p.valueNumber;
    case 'text':
      return p.valueText;
    case 'enum':
      return p.valueEnum;
    case 'date':
      return p.valueDate;
    case 'boolean':
      return p.valueBoolean;
    case 'json':
      return p.valueJson;
    default:
      return null;
  }
}
