'use server';
import { db } from '@/lib/db';
import {
  worksheetInstances,
  approvalEvents,
  auditLog,
  reportArchives,
  projects,
  orgMembers,
  worksheetTemplates,
  standards,
} from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { ensureRegulationTablesLoaded } from '@/lib/db/queries/regulation-tables';
import {
  nextStatus,
  type WorksheetStatus,
  type TransitionEvent,
} from '@/lib/state-machine';
import { captureSnapshot, type SnapshotTrigger } from '@/lib/snapshots/capture';
import { checkApprovalGate, formatApprovalGateError } from './approval-gate';
import { checkFinalizeGate, formatFinalizeGateError } from './finalize-gate';

export type TransitionInput = {
  instanceId: string;
  eventType: Exclude<TransitionEvent, 'deactivate' | 'reactivate'>;
  comment: string;
};

export type TransitionResult =
  | { ok: true; newStatus: WorksheetStatus }
  | { ok: false; error: string };

export async function transitionWorksheet(
  input: TransitionInput,
): Promise<TransitionResult> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Not authenticated' };
  const userId = auth.user.id;

  const comment = input.comment.trim();
  if (!comment) return { ok: false, error: 'Kommentar erforderlich' };

  // Load instance + verify caller is a member of the owning project's org.
  // `db` runs as postgres and bypasses RLS, so the join is the real check.
  // We resolve orgId here for every transition so the audit_log insert and
  // report_archives insert can pass it explicitly, instead of depending on
  // the audit_log fill-org-id trigger.
  const [instance] = await db
    .select({
      id: worksheetInstances.id,
      projectId: worksheetInstances.projectId,
      status: worksheetInstances.status,
      orgId: projects.orgId,
      standardCode: standards.code,
    })
    .from(worksheetInstances)
    .innerJoin(projects, eq(projects.id, worksheetInstances.projectId))
    .innerJoin(orgMembers, eq(orgMembers.orgId, projects.orgId))
    .innerJoin(worksheetTemplates, eq(worksheetTemplates.id, worksheetInstances.worksheetTemplateId))
    .innerJoin(standards, eq(standards.id, worksheetTemplates.standardId))
    .where(
      and(
        eq(worksheetInstances.id, input.instanceId),
        eq(orgMembers.userId, userId),
      ),
    )
    .limit(1);
  if (!instance) return { ok: false, error: 'Worksheet nicht gefunden' };

  const orgId = instance.orgId;

  // C-1 (final review, guideline-to-tool): register the standard's DB
  // regulation tables into the eval-layer registry BEFORE anything below
  // evaluates worksheet content — the approval gate, and the snapshot capture
  // inside the transaction (`buildSnapshotPayload` → makeTableLookup for
  // derived register columns / lookup_value refills). For a non-A138 standard
  // the registry is empty in a fresh Node process; without this the snapshot
  // only resolved `lookup()` if the same warm process had previously SAVED
  // that standard. MUST stay OUTSIDE `db.transaction` (a global-pool query
  // inside the tx re-creates the Task 10b prod hang). Never throws.
  await ensureRegulationTablesLoaded(instance.standardCode);

  const fromStatus = instance.status as WorksheetStatus;
  const toStatus = nextStatus(fromStatus, input.eventType);
  if (!toStatus) {
    return {
      ok: false,
      error: `Übergang ${input.eventType} aus Status ${fromStatus} nicht erlaubt`,
    };
  }

  // Engineer-approve gate: refuse the transition if any block-severity
  // compliance condition currently returns `fail` or any active
  // is_required field has no value. Runs BEFORE snapshot capture so a
  // refused approval doesn't leave a half-finished snapshot.
  if (input.eventType === 'engineer_approve') {
    const gate = await checkApprovalGate(input.instanceId);
    if (!gate.ok) {
      return { ok: false, error: formatApprovalGateError(gate) };
    }
  }

  // Stage-1 verification gate (SR-1): a worksheet whose used fields are not
  // verified against the printed standard cannot be finalized. Finalize only —
  // draft/submit/approve stay un-gated (owner decision 2026-08-01).
  if (input.eventType === 'finalize') {
    const gate = await checkFinalizeGate(input.instanceId);
    if (!gate.ok) {
      return { ok: false, error: formatFinalizeGateError(gate) };
    }
  }

  // Map the state-machine event to the snapshot trigger. Submit captures the
  // engineer's submitted state; approve captures the reviewer's approved state.
  // Other events (reject, finalize, reopen) do NOT create snapshots — the
  // engineer-facing diff cares about "what was submitted" vs "what was last
  // approved", not the intermediate transitions.
  const snapshotTrigger: SnapshotTrigger | null =
    input.eventType === 'submit'
      ? 'submit_for_review'
      : input.eventType === 'engineer_approve'
        ? 'approve'
        : null;

  try {
    await db.transaction(async (tx) => {
      // Capture the snapshot BEFORE the status flip so that:
      //   - on `submit`, the snapshot reflects the parameters at the moment
      //     the engineer hit "submit" (status still draft).
      //   - on `engineer_approve`, the snapshot freezes the approved version
      //     before the status moves to engineer_approved.
      // Capture failure aborts the whole transition (the transaction rolls
      // back), which is intentional: an unreproducible-later state is worse
      // than a failed submit the engineer can retry.
      let snapshotId: string | null = null;
      if (snapshotTrigger) {
        snapshotId = await captureSnapshot({
          worksheetInstanceId: input.instanceId,
          takenByUserId: userId,
          trigger: snapshotTrigger,
          txDb: tx,
        });
      }

      // Compare-and-set on status: two reviewers can race the same approval
      // out of submitted_for_review. The fromStatus we read on line 67 is from
      // the SELECT BEFORE the transaction; another transition committed in
      // the meantime would otherwise produce two approval_events from the
      // same fromStatus. Restricting the UPDATE to (id, status=fromStatus)
      // makes the second writer's update affect zero rows; we abort the tx.
      const updated = await tx
        .update(worksheetInstances)
        .set({ status: toStatus, updatedAt: new Date() })
        .where(
          and(
            eq(worksheetInstances.id, input.instanceId),
            eq(worksheetInstances.status, fromStatus),
          ),
        )
        .returning({ id: worksheetInstances.id });
      if (updated.length === 0) {
        throw new Error(
          `Worksheet wurde parallel von einem anderen Bearbeiter aus Status ${fromStatus} bewegt. Bitte neu laden.`,
        );
      }

      await tx.insert(approvalEvents).values({
        worksheetInstanceId: input.instanceId,
        eventType: input.eventType,
        fromStatus,
        toStatus,
        actorId: userId,
        actorRole: 'engineer',
        comment,
      });

      await tx.insert(auditLog).values({
        actorId: userId,
        actorRole: 'engineer',
        projectId: instance.projectId,
        orgId,
        tableName: 'worksheet_instances',
        recordId: input.instanceId,
        action: 'transition',
        changes: {
          eventType: input.eventType,
          from: fromStatus,
          to: toStatus,
          comment,
          // Cross-reference the snapshot id in audit_log so a reviewer can
          // navigate from the audit timeline directly to the diff view.
          ...(snapshotId ? { snapshotId } : {}),
        },
      });

      // Archive a PDF snapshot record when an engineer finalizes a worksheet.
      // The actual PDF is generated on-demand by /api/projects/[id]/report/pdf;
      // persisting to Storage is Phase 2. The row here acts as the artifact pointer.
      // calculationId is a NOT NULL legacy column (calculations table was dropped);
      // filePath + sha256 are NOT NULL — placeholder values until Phase 2.
      if (input.eventType === 'finalize' && orgId) {
        await tx.insert(reportArchives).values({
          // Legacy NOT NULL column; calculations table is dropped, no real FK
          calculationId: '00000000-0000-0000-0000-000000000000',
          worksheetInstanceId: input.instanceId,
          approvalEventId: null,
          orgId,
          // File creation deferred to Phase 2 (Storage upload)
          filePath: 'pending',
          sha256: 'pending',
          generatedBy: userId,
        });
      }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: message };
  }

  return { ok: true, newStatus: toStatus };
}
