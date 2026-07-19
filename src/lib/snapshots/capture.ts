import 'server-only';

/**
 * Server-side calculation-snapshot capture.
 *
 * Called from `transitionWorksheet` on `submit` and `engineer_approve` events
 * (inside the same transaction, so the snapshot row commits atomically with
 * the status flip + approval_events row).
 *
 * Re-evaluates every whitelisted equation using the existing
 * `evaluateFormula` engine — we do NOT trust the value the engineer stored in
 * the output field, because the engineer may have typed a manual override
 * after the engine produced `manual_required`. Re-running the engine here
 * captures the engine's verdict at submit/approve time, which is exactly
 * what the diff viewer renders.
 *
 * The pure payload builder lives in `./payload.ts` (no `db` import) so unit
 * tests can exercise it without booting env vars.
 */

import { db } from '@/lib/db';

/** The minimal subset of the Drizzle db API the capture path uses. Wider
 * than `typeof db` so a transaction handle satisfies it (Drizzle's `tx`
 * type isn't assignable to `typeof db`, but it implements all the same
 * methods we touch — select / insert with chainable builders). */
type DrizzleClient = {
  select: typeof db.select;
  insert: typeof db.insert;
};
import {
  fields,
  equations,
  complianceRequirements,
  projectParameters,
  worksheetInstances,
  worksheetTemplates,
  calculationSnapshots,
} from '@/lib/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { loadInheritedFields } from '@/lib/db/queries/worksheet';
import { mergeInheritedFields } from '@/lib/eval/merge-inherited-fields';
import {
  buildSnapshotPayload,
  type FieldRow,
  type EquationRow,
  type ComplianceRow,
  type ParameterRow,
  type SnapshotTrigger,
} from './payload';

// Re-export the types so existing callers can `import { ... } from '@/lib/snapshots/capture'`
export type {
  SnapshotParameterValue,
  SnapshotEquationOutput,
  SnapshotComplianceVerdict,
  SnapshotPayload,
  SnapshotTrigger,
} from './payload';
export { buildSnapshotPayload } from './payload';

/**
 * Load the worksheet's fields + equations + compliance + parameters from the
 * DB, mirroring the page-level resolution: own fields + inherited fields,
 * with parameters by field_id (which for inherited fields lives on the
 * origin worksheet's row).
 */
export async function loadCaptureInputs(args: {
  worksheetInstanceId: string;
  txDb?: DrizzleClient;
}): Promise<{
  worksheetCode: string;
  projectId: string;
  fields: FieldRow[];
  equations: EquationRow[];
  complianceRequirements: ComplianceRow[];
  parameters: ParameterRow[];
  ambiguousSymbols: Map<string, string[]>;
} | null> {
  const dbi = args.txDb ?? db;

  const instanceRows = await dbi
    .select({
      id: worksheetInstances.id,
      projectId: worksheetInstances.projectId,
      worksheetTemplateId: worksheetInstances.worksheetTemplateId,
    })
    .from(worksheetInstances)
    .where(eq(worksheetInstances.id, args.worksheetInstanceId))
    .limit(1);
  if (instanceRows.length === 0) return null;
  const inst = instanceRows[0];

  const [tplRow] = await dbi
    .select({ code: worksheetTemplates.code, standardId: worksheetTemplates.standardId })
    .from(worksheetTemplates)
    .where(eq(worksheetTemplates.id, inst.worksheetTemplateId))
    .limit(1);
  if (!tplRow) return null;

  const [ownFields, eqList, crList, inherited] = await Promise.all([
    dbi
      .select()
      .from(fields)
      .where(eq(fields.worksheetTemplateId, inst.worksheetTemplateId)),
    dbi
      .select()
      .from(equations)
      .where(eq(equations.worksheetTemplateId, inst.worksheetTemplateId)),
    dbi
      .select()
      .from(complianceRequirements)
      .where(eq(complianceRequirements.worksheetTemplateId, inst.worksheetTemplateId)),
    loadInheritedFields(inst.worksheetTemplateId, tplRow.standardId, tplRow.code),
  ]);

  const merged = mergeInheritedFields(ownFields, inherited);
  const allFields = merged.fields;
  const fieldIds = allFields.map((f) => f.id);

  const paramRows =
    fieldIds.length === 0
      ? []
      : await dbi
          .select()
          .from(projectParameters)
          .where(
            and(
              eq(projectParameters.projectId, inst.projectId),
              inArray(projectParameters.fieldId, fieldIds),
            ),
          );

  return {
    worksheetCode: tplRow.code,
    projectId: inst.projectId,
    fields: allFields,
    equations: eqList,
    complianceRequirements: crList,
    parameters: paramRows,
    ambiguousSymbols: merged.ambiguousSymbols,
  };
}

/**
 * Capture-and-insert a snapshot row. Intended to run inside the same
 * transaction as the calling action (pass `txDb`) so the snapshot rolls back
 * with the rest of the transition on error.
 *
 * Returns the snapshot id on success, `null` if the worksheet instance isn't
 * loadable (which is a programming error — the caller should have validated
 * existence first).
 */
export async function captureSnapshot(args: {
  worksheetInstanceId: string;
  takenByUserId: string;
  trigger: SnapshotTrigger;
  // Pass the transaction handle when capturing inside an outer transaction
  // so the snapshot lands atomically with the status flip.
  txDb?: DrizzleClient;
}): Promise<string | null> {
  const inputs = await loadCaptureInputs({
    worksheetInstanceId: args.worksheetInstanceId,
    txDb: args.txDb,
  });
  if (!inputs) return null;

  const payload = buildSnapshotPayload({
    fields: inputs.fields,
    equations: inputs.equations,
    complianceRequirements: inputs.complianceRequirements,
    parameters: inputs.parameters,
    worksheetCode: inputs.worksheetCode,
    ambiguousSymbols: inputs.ambiguousSymbols,
  });

  const dbi = args.txDb ?? db;
  const [row] = await dbi
    .insert(calculationSnapshots)
    .values({
      worksheetInstanceId: args.worksheetInstanceId,
      projectId: inputs.projectId,
      takenByUserId: args.takenByUserId,
      trigger: args.trigger,
      parameters: payload.parameters,
      equationOutputs: payload.equationOutputs,
      complianceResults: payload.complianceResults,
    })
    .returning({ id: calculationSnapshots.id });
  return row?.id ?? null;
}
