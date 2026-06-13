'use server';
import { db } from '@/lib/db';
import {
  worksheetInstances,
  worksheetTemplates,
  projectParameters,
  fields,
  equations,
  auditLog,
  approvalEvents,
  projects,
  orgMembers,
} from '@/lib/db/schema';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { checkApprovalGate } from './approval-gate';
import { loadInheritedFields, loadProjectParameters } from '@/lib/db/queries/worksheet';
import {
  materializeDerivedOutputs,
  type ReportEquation,
  type ReportField,
  type ReportParameter,
} from '@/lib/eval/evaluate-for-report';

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
            enteredAt: new Date(),
          },
        });

      // ONE batched insert for all audit rows
      await tx.insert(auditLog).values(auditValues);

      await tx
        .update(worksheetInstances)
        .set({ updatedAt: new Date() })
        .where(eq(worksheetInstances.id, instance.id));
    });

    // §C1 — deterministically materialise engine-derived outputs so a produced
    // scalar (A_C, A_C_preliminary, Q_zu, …) always has a real
    // project_parameters row for downstream consumers to inherit, instead of
    // depending on the fragile client write-back happening to fire.
    //
    // Cascade: saving a producer also re-materialises its transitive consumer
    // worksheet instances in the same project, so a scalar that flows by
    // inheritance settles without the engineer having to re-open every
    // consumer. Each touched instance is re-gated (an approved consumer whose
    // derived value now breaks a block-condition is auto-reopened). Runs after
    // the input save commits and is fully isolated — any error here is captured
    // as a warning and can't roll back the engineer's save.
    try {
      const cascadeWarnings = await cascadeMaterializeDerived(
        {
          id: instance.id,
          projectId: instance.projectId,
          worksheetTemplateId: instance.worksheetTemplateId,
          status: instance.status,
        },
        userId,
      );
      warnings.push(...cascadeWarnings);
    } catch (e) {
      warnings.push(
        'Derived-output materialisation failed: ' +
          (e instanceof Error ? e.message : String(e)),
      );
    }
  }

  return { ok: true, saved: savedCount, warnings };
}

/**
 * §C1 — recompute and persist the worksheet's engine-derived OWN number
 * outputs (source_type='derived') from its saved + inherited values, so the
 * single-source scalars are durable for downstream inheritance. Pure compute
 * lives in `materializeDerivedOutputs`; this only loads inputs and UPSERTs the
 * results that actually changed. Returns a warning string, or null on success.
 */
async function persistDerivedOutputs(
  instance: { id: string; projectId: string; worksheetTemplateId: string },
  userId: string,
): Promise<string | null> {
  const [tmpl] = await db
    .select({
      code: worksheetTemplates.code,
      standardId: worksheetTemplates.standardId,
    })
    .from(worksheetTemplates)
    .where(eq(worksheetTemplates.id, instance.worksheetTemplateId))
    .limit(1);
  if (!tmpl) return null;

  const [ownFields, eqRows, inherited] = await Promise.all([
    db
      .select({
        id: fields.id,
        symbol: fields.symbol,
        unit: fields.unit,
        dataType: fields.dataType,
      })
      .from(fields)
      .where(
        and(
          eq(fields.worksheetTemplateId, instance.worksheetTemplateId),
          eq(fields.active, true),
        ),
      ),
    db
      .select()
      .from(equations)
      .where(eq(equations.worksheetTemplateId, instance.worksheetTemplateId)),
    loadInheritedFields(instance.worksheetTemplateId, tmpl.standardId, tmpl.code),
  ]);

  const ownNumberFieldIds = new Set(
    ownFields.filter((f) => f.dataType === 'number').map((f) => f.id),
  );
  if (ownNumberFieldIds.size === 0 || eqRows.length === 0) return null;

  const reportFields: ReportField[] = [
    ...ownFields.map((f) => ({ id: f.id, symbol: f.symbol, unit: f.unit, dataType: f.dataType })),
    ...inherited.map((f) => ({ id: f.id, symbol: f.symbol, unit: f.unit, dataType: f.dataType })),
  ];
  const reportEquations: ReportEquation[] = eqRows.map((e) => ({
    id: e.id,
    equationNumber: e.equationNumber,
    formula: e.formula,
    inputSymbols: e.inputSymbols,
    outputSymbol: e.outputSymbol,
    outputUnit: e.outputUnit,
  }));

  const allFieldIds = reportFields.map((f) => f.id);
  const paramMap = await loadProjectParameters(instance.projectId, allFieldIds);
  const reportParams: ReportParameter[] = [...paramMap.values()].map((p) => ({
    fieldId: p.fieldId,
    // value_number is stored as a numeric (string in the driver) — the pure
    // evaluator works on real numbers.
    valueNumber: p.valueNumber == null ? null : Number(p.valueNumber),
    valueText: p.valueText,
    valueEnum: p.valueEnum,
    valueBoolean: p.valueBoolean,
    valueDate: p.valueDate,
    valueJson: p.valueJson,
  }));

  const derived = materializeDerivedOutputs(
    tmpl.code,
    reportEquations,
    reportFields,
    reportParams,
    ownNumberFieldIds,
  );
  if (derived.length === 0) return null;

  // Only write rows whose value actually changes, or whose source must flip to
  // 'derived' (e.g. a row the client wrote back as 'entered').
  const toWrite = derived.filter((d) => {
    const cur = paramMap.get(d.fieldId);
    const curNum = cur?.valueNumber == null ? null : Number(cur.valueNumber);
    return curNum !== d.valueNumber || (cur != null && cur.sourceType !== 'derived');
  });
  if (toWrite.length === 0) return null;

  await db.transaction(async (tx) => {
    await tx
      .insert(projectParameters)
      .values(
        toWrite.map((d) => ({
          projectId: instance.projectId,
          fieldId: d.fieldId,
          sourceWorksheetInstanceId: instance.id,
          sourceType: 'derived',
          enteredBy: userId,
          valueNumber: d.valueNumber == null ? null : String(d.valueNumber),
          valueText: null,
          valueEnum: null,
          valueDate: null,
          valueBoolean: null,
          valueJson: null,
        })),
      )
      .onConflictDoUpdate({
        target: [projectParameters.projectId, projectParameters.fieldId],
        set: {
          valueNumber: sql`excluded.value_number`,
          sourceType: sql`excluded.source_type`,
          sourceWorksheetInstanceId: sql`excluded.source_worksheet_instance_id`,
          enteredBy: sql`excluded.entered_by`,
          enteredAt: new Date(),
        },
      });

    await tx.insert(auditLog).values(
      toWrite.map((d) => ({
        actorId: userId,
        actorRole: 'system',
        projectId: instance.projectId,
        tableName: 'project_parameters',
        recordId: d.fieldId,
        action: 'derive',
        changes: { fieldId: d.fieldId, derivedValue: d.valueNumber },
      })),
    );
  });

  return null;
}

/**
 * Reopen an approved worksheet whose (possibly just-materialised) values now
 * fail a block-severity compliance condition. No-op unless it is currently
 * engineer_approved and a block condition fails. Returns a warning, else null.
 * Extracted so both the saved worksheet and cascaded consumers re-gate
 * identically.
 */
async function reopenIfComplianceBroken(
  inst: { id: string; projectId: string; status: string },
  userId: string,
): Promise<string | null> {
  if (inst.status !== 'engineer_approved') return null;
  const gate = await checkApprovalGate(inst.id);
  if (gate.failingBlockConditions.length === 0) return null;
  const failingCodes = gate.failingBlockConditions.map((c) => c.code).join(', ');
  const reopenComment = `Auto-reopen: block-severity compliance now failing on changed fields (${failingCodes}).`;
  await db.transaction(async (tx) => {
    const updated = await tx
      .update(worksheetInstances)
      .set({ status: 'draft', updatedAt: new Date() })
      .where(
        and(
          eq(worksheetInstances.id, inst.id),
          eq(worksheetInstances.status, 'engineer_approved'),
        ),
      )
      .returning({ id: worksheetInstances.id });
    // If another writer already demoted/finalized in the meantime, skip.
    if (updated.length === 0) return;
    await tx.insert(approvalEvents).values({
      worksheetInstanceId: inst.id,
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
      projectId: inst.projectId,
      tableName: 'worksheet_instances',
      recordId: inst.id,
      action: 'auto_reopen',
      changes: {
        reason: 'post_approval_compliance_break',
        failingBlockConditions: gate.failingBlockConditions.map((c) => c.code),
      },
    });
  });
  return reopenComment;
}

/**
 * Worksheet instances in the same project that consume a symbol this worksheet
 * produces — resolved from the producer's own fields' `consumer_worksheets`
 * within the same standard.
 */
async function loadConsumerInstances(
  projectId: string,
  producerTemplateId: string,
): Promise<Array<{ id: string; projectId: string; worksheetTemplateId: string; status: string }>> {
  const producerFields = await db
    .select({ consumers: fields.consumerWorksheets })
    .from(fields)
    .where(and(eq(fields.worksheetTemplateId, producerTemplateId), eq(fields.active, true)));
  const codes = [...new Set(producerFields.flatMap((f) => f.consumers ?? []).filter(Boolean))];
  if (codes.length === 0) return [];

  const [tmpl] = await db
    .select({ standardId: worksheetTemplates.standardId })
    .from(worksheetTemplates)
    .where(eq(worksheetTemplates.id, producerTemplateId))
    .limit(1);
  if (!tmpl) return [];

  return db
    .select({
      id: worksheetInstances.id,
      projectId: worksheetInstances.projectId,
      worksheetTemplateId: worksheetInstances.worksheetTemplateId,
      status: worksheetInstances.status,
    })
    .from(worksheetInstances)
    .innerJoin(
      worksheetTemplates,
      eq(worksheetTemplates.id, worksheetInstances.worksheetTemplateId),
    )
    .where(
      and(
        eq(worksheetInstances.projectId, projectId),
        eq(worksheetTemplates.standardId, tmpl.standardId),
        inArray(worksheetTemplates.code, codes),
      ),
    );
}

/**
 * Materialise derived outputs for `root` and its transitive consumer instances
 * in the same project, so a single-source scalar settles by inheritance
 * without the engineer re-opening every consumer. Each touched instance is
 * re-gated (an approved consumer whose derived value now breaks a block
 * condition is auto-reopened). Bounded by a visited set + a hard cap so a
 * pathological consumer graph can't run unbounded.
 */
async function cascadeMaterializeDerived(
  root: { id: string; projectId: string; worksheetTemplateId: string; status: string },
  userId: string,
): Promise<string[]> {
  const warnings: string[] = [];
  const visited = new Set<string>();
  const queue: Array<{ id: string; projectId: string; worksheetTemplateId: string; status: string }> = [root];
  const CAP = 60;
  let processed = 0;

  while (queue.length > 0 && processed < CAP) {
    const inst = queue.shift()!;
    if (visited.has(inst.id)) continue;
    visited.add(inst.id);
    processed++;

    try {
      const w = await persistDerivedOutputs(
        { id: inst.id, projectId: inst.projectId, worksheetTemplateId: inst.worksheetTemplateId },
        userId,
      );
      if (w) warnings.push(w);
    } catch (e) {
      warnings.push(
        `Materialisation failed for ${inst.id}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    const reopenW = await reopenIfComplianceBroken(inst, userId);
    if (reopenW) warnings.push(reopenW);

    const consumers = await loadConsumerInstances(inst.projectId, inst.worksheetTemplateId);
    for (const c of consumers) {
      if (!visited.has(c.id)) queue.push(c);
    }
  }
  if (processed >= CAP) {
    warnings.push(
      `Derived-output cascade hit the ${CAP}-worksheet cap — some consumers may not be refreshed.`,
    );
  }
  return warnings;
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
