'use server';
import { db } from '@/lib/db';
import {
  worksheetInstances,
  approvalEvents,
  auditLog,
  reportArchives,
  projects,
} from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import {
  nextStatus,
  type WorksheetStatus,
  type TransitionEvent,
} from '@/lib/state-machine';
import { captureSnapshot, type SnapshotTrigger } from '@/lib/snapshots/capture';

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

  // Load instance via RLS (returns nothing if not org member)
  const [instance] = await db
    .select()
    .from(worksheetInstances)
    .where(eq(worksheetInstances.id, input.instanceId))
    .limit(1);
  if (!instance) return { ok: false, error: 'Worksheet nicht gefunden' };

  const fromStatus = instance.status as WorksheetStatus;
  const toStatus = nextStatus(fromStatus, input.eventType);
  if (!toStatus) {
    return {
      ok: false,
      error: `Übergang ${input.eventType} aus Status ${fromStatus} nicht erlaubt`,
    };
  }

  // Look up orgId from projects (worksheetInstances has no orgId column)
  let orgId: string | null = null;
  if (input.eventType === 'finalize') {
    const [projRow] = await db
      .select({ orgId: projects.orgId })
      .from(projects)
      .where(eq(projects.id, instance.projectId))
      .limit(1);
    orgId = projRow?.orgId ?? null;
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

      await tx
        .update(worksheetInstances)
        .set({ status: toStatus, updatedAt: new Date() })
        .where(eq(worksheetInstances.id, input.instanceId));

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
