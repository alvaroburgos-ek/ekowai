'use server';
import { db } from '@/lib/db';
import {
  worksheetInstances,
  projectParameters,
  fields,
  auditLog,
  approvalEvents,
  projects,
  orgMembers,
} from '@/lib/db/schema';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { checkApprovalGate } from './approval-gate';
import { materializeSurfaceOutputs } from '@/lib/eval/materialize-surfaces';

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
 * - Auth: user must be a member of the owning project's org. Verified by an
 *   app-level join — `db` uses the postgres role and bypasses RLS.
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

  // Load instance + verify the caller is a member of the owning project's org
  const [instance] = await db
    .select({
      id: worksheetInstances.id,
      projectId: worksheetInstances.projectId,
      worksheetTemplateId: worksheetInstances.worksheetTemplateId,
      status: worksheetInstances.status,
    })
    .from(worksheetInstances)
    .innerJoin(projects, eq(projects.id, worksheetInstances.projectId))
    .innerJoin(orgMembers, eq(orgMembers.orgId, projects.orgId))
    .where(
      and(
        eq(worksheetInstances.id, input.instanceId),
        eq(orgMembers.userId, userId),
      ),
    )
    .limit(1);
  if (!instance) return { ok: false, error: 'Worksheet not found or no access' };

  const fieldIds = Object.keys(input.values);
  if (fieldIds.length === 0) {
    return { ok: true, saved: 0, warnings: [] };
  }

  // Load field metadata — restrict to fields belonging to this instance's
  // worksheet template so callers cannot write values for fields of a
  // different template within the same project.
  const fieldMetas = await db
    .select({ id: fields.id, dataType: fields.dataType })
    .from(fields)
    .where(
      and(
        inArray(fields.id, fieldIds),
        eq(fields.worksheetTemplateId, instance.worksheetTemplateId),
      ),
    );
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

  // Build batched arrays — validated rows only
  type ParameterRow = {
    projectId: string;
    fieldId: string;
    sourceWorksheetInstanceId: string;
    sourceType: string;
    enteredBy: string;
    valueNumber: string | null;
    valueText: string | null;
    valueEnum: string | null;
    valueDate: string | null;
    valueBoolean: boolean | null;
    valueJson: unknown;
  };
  type AuditRow = {
    actorId: string;
    actorRole: string;
    projectId: string;
    tableName: string;
    recordId: string;
    action: string;
    changes: object;
  };

  const parameterValues: ParameterRow[] = [];
  const auditValues: AuditRow[] = [];

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

    parameterValues.push({
      projectId: instance.projectId,
      fieldId,
      sourceWorksheetInstanceId: instance.id,
      sourceType: 'entered',
      enteredBy: userId,
      ...valueColumns,
    });

    auditValues.push({
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
  }

  const savedCount = parameterValues.length;

  if (savedCount > 0) {
    await db.transaction(async (tx) => {
      // Single timestamp for the entire save — all rows written in this call
      // share the same enteredAt so there is no skew from multiple new Date() calls.
      const now = new Date();

      // ONE batched upsert for all parameter rows
      await tx
        .insert(projectParameters)
        .values(parameterValues)
        .onConflictDoUpdate({
          target: [projectParameters.projectId, projectParameters.fieldId],
          set: {
            valueNumber: sql`excluded.value_number`,
            valueText: sql`excluded.value_text`,
            valueEnum: sql`excluded.value_enum`,
            valueDate: sql`excluded.value_date`,
            valueBoolean: sql`excluded.value_boolean`,
            valueJson: sql`excluded.value_json`,
            sourceType: sql`excluded.source_type`,
            sourceWorksheetInstanceId: sql`excluded.source_worksheet_instance_id`,
            enteredBy: sql`excluded.entered_by`,
            enteredAt: now,
          },
        });

      // Materialize derived surface outputs when A138-07's surface_inventory was saved.
      // Runs inside the same transaction so derived rows are always consistent with
      // the entered carrier value.
      //
      // Optimization: first do a cheap indexed lookup — only if the saved batch
      // actually contains a surface_inventory field for this template do we proceed
      // to the full sibling-fields query + materialization.
      const [surfacePresence] = await tx
        .select({ id: fields.id })
        .from(fields)
        .where(
          and(
            inArray(fields.id, fieldIds),
            eq(fields.symbol, 'surface_inventory'),
            eq(fields.worksheetTemplateId, instance.worksheetTemplateId),
          ),
        )
        .limit(1);

      if (surfacePresence) {
        const surfaceFieldId = surfacePresence.id;
        const wsFields = await tx
          .select({ id: fields.id, symbol: fields.symbol })
          .from(fields)
          .where(and(eq(fields.worksheetTemplateId, instance.worksheetTemplateId), eq(fields.active, true)));
        const carrier = input.values[surfaceFieldId]?.type === 'json' ? input.values[surfaceFieldId].value : null;
        const outputs = materializeSurfaceOutputs(carrier);
        const idBySymbol = new Map(wsFields.map((f) => [f.symbol, f.id]));
        const derivedRows = (['A_C', 'C_m', 'A_E_ba', 'A_E_nba'] as const)
          .map((sym) => ({ sym, fieldId: idBySymbol.get(sym) }))
          .filter((x): x is { sym: typeof x.sym; fieldId: string } => x.fieldId != null)
          .map((x) => ({
            projectId: instance.projectId,
            fieldId: x.fieldId,
            valueNumber: outputs[x.sym] == null ? null : String(outputs[x.sym]),
            sourceType: 'derived' as const,
            enteredBy: userId,
            enteredAt: now,
          }));
        if (derivedRows.length > 0) {
          await tx.insert(projectParameters).values(derivedRows).onConflictDoUpdate({
            target: [projectParameters.projectId, projectParameters.fieldId],
            set: {
              valueNumber: sql`excluded.value_number`,
              sourceType: sql`excluded.source_type`,
              enteredBy: sql`excluded.entered_by`,
              enteredAt: now,
            },
          });
        }
      }

      // ONE batched insert for all audit rows
      await tx.insert(auditLog).values(auditValues);

      await tx
        .update(worksheetInstances)
        .set({ updatedAt: new Date() })
        .where(eq(worksheetInstances.id, instance.id));
    });

    // Post-approval revalidation hook. When a save mutates parameters on
    // an already-approved worksheet AND the new values cause any
    // block-severity compliance condition to fail, demote the worksheet
    // back to draft so the approval cannot ship over a fresh violation.
    // Uses the existing `reopen` event (engineer_approved → draft is
    // already legal); actor_role='system' distinguishes it from manual
    // engineer reopens. Runs OUTSIDE the save transaction so any error
    // here can't roll back the parameter write the engineer expects to
    // have succeeded.
    if (instance.status === 'engineer_approved') {
      const gate = await checkApprovalGate(instance.id);
      if (gate.failingBlockConditions.length > 0) {
        const failingCodes = gate.failingBlockConditions
          .map((c) => c.code)
          .join(', ');
        const reopenComment =
          `Auto-reopen: block-severity compliance now failing on changed fields (${failingCodes}).`;
        await db.transaction(async (tx) => {
          const updated = await tx
            .update(worksheetInstances)
            .set({ status: 'draft', updatedAt: new Date() })
            .where(
              and(
                eq(worksheetInstances.id, instance.id),
                eq(worksheetInstances.status, 'engineer_approved'),
              ),
            )
            .returning({ id: worksheetInstances.id });
          // If another writer already demoted/finalized in the meantime,
          // updated[] is empty — skip the event/audit rows (the state
          // has already moved past engineer_approved).
          if (updated.length === 0) return;

          await tx.insert(approvalEvents).values({
            worksheetInstanceId: instance.id,
            eventType: 'reopen',
            fromStatus: 'engineer_approved',
            toStatus: 'draft',
            actorId: userId,
            actorRole: 'system',
            comment: reopenComment,
          });

          await tx.insert(auditLog).values({
            actorId: userId,
            actorRole: 'system',
            projectId: instance.projectId,
            tableName: 'worksheet_instances',
            recordId: instance.id,
            action: 'auto_reopen',
            changes: {
              reason: 'post_approval_compliance_break',
              failingBlockConditions: gate.failingBlockConditions.map((c) => c.code),
            },
          });
        });
        warnings.push(reopenComment);
      }
    }
  }

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
