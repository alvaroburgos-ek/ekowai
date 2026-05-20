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

  try {
    await db.transaction(async (tx) => {
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
