import { db } from '@/lib/db';
import { deliverables } from '@/lib/db/schema';
import type { DeliverableKind } from './kinds';

export type RecordDeliverableInput = {
  projectId: string;
  standardCode?: string | null;
  kind: DeliverableKind;
  title: string;
  snapshotId?: string | null;
  /** The emitting user (routes have `user.id` in scope after their auth guard). */
  userId: string;
  meta?: Record<string, unknown> | null;
};

/**
 * Record an emitted deliverable in the register (roadmap Stage 10, AGB §3(2)).
 *
 * CONTRACT — never throws outward: the register is bookkeeping, the document
 * is the deliverable. Callers wire this in AFTER a successful buffer build;
 * any failure here (db down, constraint, whatever) is logged and swallowed so
 * a register failure can NEVER break a document emission. Do not "fix" this
 * by rethrowing.
 */
export async function recordDeliverable(input: RecordDeliverableInput): Promise<void> {
  try {
    await db.insert(deliverables).values({
      projectId: input.projectId,
      standardCode: input.standardCode ?? null,
      kind: input.kind,
      title: input.title,
      snapshotId: input.snapshotId ?? null,
      emittedBy: input.userId,
      meta: input.meta ?? null,
    });
  } catch (err) {
    // Swallow by design (see contract above) — log for observability only.
    console.error('[deliverable-register] record failed (emission unaffected)', err);
  }
}
