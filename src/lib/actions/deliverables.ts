'use server';

import { db } from '@/lib/db';
import { deliverables } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { userHasProjectAccess } from '@/lib/db/queries/worksheet';

export type DeliverableView = {
  id: string;
  /** Stored kind key — German label lives in src/lib/deliverables/kinds.ts. */
  kind: string;
  title: string;
  standardCode: string | null;
  snapshotId: string | null;
  emittedAt: Date;
};

/** Resolve the session user id or throw (mirrors listEffortEntries). */
async function requireSessionUserId(): Promise<string> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Not authenticated');
  return auth.user.id;
}

/**
 * List a project's emitted deliverables, newest first (Leistungsregister,
 * AGB §3(2)). Read-only — rows are written exclusively by the PDF/export
 * routes via recordDeliverable. `db` runs as postgres and bypasses RLS, so
 * the org-membership join inside `userHasProjectAccess` IS the access check
 * (mirrors listEffortEntries).
 */
export async function listDeliverables(projectId: string): Promise<DeliverableView[]> {
  const userId = await requireSessionUserId();
  if (!(await userHasProjectAccess(projectId, userId))) {
    throw new Error('Forbidden: user is not a member of this project’s org');
  }

  return db
    .select({
      id: deliverables.id,
      kind: deliverables.kind,
      title: deliverables.title,
      standardCode: deliverables.standardCode,
      snapshotId: deliverables.snapshotId,
      emittedAt: deliverables.emittedAt,
    })
    .from(deliverables)
    .where(eq(deliverables.projectId, projectId))
    .orderBy(desc(deliverables.emittedAt));
}
