import 'server-only';
import { db } from '@/lib/db';
import { calculationSnapshots } from '@/lib/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import type {
  SnapshotPayload,
  SnapshotTrigger,
} from '@/lib/snapshots/payload';

export type SnapshotRow = {
  id: string;
  worksheetInstanceId: string;
  projectId: string;
  takenAt: Date;
  takenByUserId: string | null;
  trigger: SnapshotTrigger;
  payload: SnapshotPayload;
};

function rowToSnapshot(r: typeof calculationSnapshots.$inferSelect): SnapshotRow {
  return {
    id: r.id,
    worksheetInstanceId: r.worksheetInstanceId,
    projectId: r.projectId,
    takenAt: r.takenAt,
    takenByUserId: r.takenByUserId,
    trigger: r.trigger as SnapshotTrigger,
    payload: {
      parameters: r.parameters as SnapshotPayload['parameters'],
      equationOutputs: r.equationOutputs as SnapshotPayload['equationOutputs'],
      complianceResults: r.complianceResults as SnapshotPayload['complianceResults'],
    },
  };
}

/** All snapshots for a worksheet instance, newest first. */
export async function listSnapshotsForInstance(
  worksheetInstanceId: string,
): Promise<SnapshotRow[]> {
  const rows = await db
    .select()
    .from(calculationSnapshots)
    .where(eq(calculationSnapshots.worksheetInstanceId, worksheetInstanceId))
    .orderBy(desc(calculationSnapshots.takenAt));
  return rows.map(rowToSnapshot);
}

/** Fetch one snapshot by id (RLS-scoped to org). Null when not found. */
export async function getSnapshot(id: string): Promise<SnapshotRow | null> {
  const [r] = await db
    .select()
    .from(calculationSnapshots)
    .where(eq(calculationSnapshots.id, id))
    .limit(1);
  return r ? rowToSnapshot(r) : null;
}

/**
 * Resolve the default (from, to) pair for the diff view when the caller
 * didn't specify ids:
 *   - `to`   = most recent `submit_for_review` snapshot (the engineer's
 *              submitted version that the reviewer is looking at)
 *   - `from` = most recent `approve` snapshot prior to `to`, falling back
 *              to the previous `submit_for_review` snapshot when there has
 *              never been an approval yet (first submission).
 *
 * If there are no snapshots at all, returns null. If there is exactly one,
 * returns it as both endpoints (the diff renders all-unchanged in that
 * case — there's nothing to compare yet).
 */
export async function resolveDefaultDiffPair(
  worksheetInstanceId: string,
): Promise<{ from: SnapshotRow; to: SnapshotRow } | null> {
  const all = await listSnapshotsForInstance(worksheetInstanceId);
  if (all.length === 0) return null;

  // Find the most-recent submit_for_review snapshot — that's `to`.
  const latestSubmit = all.find((s) => s.trigger === 'submit_for_review');
  const to = latestSubmit ?? all[0];

  // Snapshots older than `to`.
  const olderThanTo = all.filter((s) => s.takenAt < to.takenAt);

  // Prefer the most-recent approve snapshot older than `to`.
  const latestApproveBefore = olderThanTo.find((s) => s.trigger === 'approve');
  if (latestApproveBefore) return { from: latestApproveBefore, to };

  // Fall back to the previous submit_for_review.
  const previousSubmit = olderThanTo.find((s) => s.trigger === 'submit_for_review');
  if (previousSubmit) return { from: previousSubmit, to };

  // Only one snapshot — return it as both endpoints; the diff renders all-
  // unchanged. Caller can decide whether to show "no prior version" UI.
  return { from: to, to };
}

/** Count snapshots for a worksheet instance — cheap "do we have a prior?" check
 * for the approval bar's "Änderungen seit letzter Version" link. */
export async function countSnapshotsForInstance(
  worksheetInstanceId: string,
): Promise<number> {
  const rows = await db
    .select({ id: calculationSnapshots.id })
    .from(calculationSnapshots)
    .where(eq(calculationSnapshots.worksheetInstanceId, worksheetInstanceId));
  return rows.length;
}

/** All snapshots for an instance with a specific trigger. */
export async function listSnapshotsByTrigger(
  worksheetInstanceId: string,
  trigger: SnapshotTrigger,
): Promise<SnapshotRow[]> {
  const rows = await db
    .select()
    .from(calculationSnapshots)
    .where(
      and(
        eq(calculationSnapshots.worksheetInstanceId, worksheetInstanceId),
        eq(calculationSnapshots.trigger, trigger),
      ),
    )
    .orderBy(desc(calculationSnapshots.takenAt));
  return rows.map(rowToSnapshot);
}
