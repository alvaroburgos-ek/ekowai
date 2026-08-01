'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { monitoringEntries, projectDocuments, profiles } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { userHasProjectAccess } from '@/lib/db/queries/worksheet';
import { parseAddMonitoringEntry } from './monitoring-core';

export type MonitoringEntryView = {
  id: string;
  entryDate: string;
  /** One of the six app-side categories (monitoring-core.ts). */
  category: string;
  note: string | null;
  documentId: string | null;
  documentTitle: string | null;
  documentCitationLabel: string | null;
  createdAt: Date;
  userName: string | null;
};

/** Resolve the session user id or throw (mirrors addEffortEntry). */
async function requireSessionUserId(): Promise<string> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Not authenticated');
  return auth.user.id;
}

function revalidateOverview() {
  // The Monitoring-Journal renders on the project overview page.
  revalidatePath('/[locale]/projects/[id]', 'page');
}

/**
 * Add a monitoring-journal entry for a project (documentation only — no
 * parameter values/units; the time-series schema follows with Stage 8).
 * Validation lives in `monitoring-core.ts`. `db` runs as postgres and
 * bypasses RLS, so the org-membership join inside `userHasProjectAccess`
 * IS the access check (mirrors addEffortEntry).
 */
export async function addMonitoringEntry(input: {
  projectId: string;
  entryDate: string;
  category: string;
  note?: string;
  documentId?: string;
}): Promise<{ id: string }> {
  const parsed = parseAddMonitoringEntry(input);
  const userId = await requireSessionUserId();

  if (!(await userHasProjectAccess(parsed.projectId, userId))) {
    throw new Error('Forbidden: user is not a member of this project’s org');
  }

  // A linked document must belong to the same project — never link across.
  if (parsed.documentId) {
    const [doc] = await db
      .select({ projectId: projectDocuments.projectId })
      .from(projectDocuments)
      .where(eq(projectDocuments.id, parsed.documentId))
      .limit(1);
    if (!doc || doc.projectId !== parsed.projectId) {
      throw new Error('Dokument gehört nicht zu diesem Projekt');
    }
  }

  const [row] = await db
    .insert(monitoringEntries)
    .values({
      projectId: parsed.projectId,
      entryDate: parsed.entryDate,
      category: parsed.category,
      note: parsed.note && parsed.note !== '' ? parsed.note : null,
      documentId: parsed.documentId ?? null,
      createdBy: userId,
    })
    .returning({ id: monitoringEntries.id });

  revalidateOverview();
  return { id: row.id };
}

/**
 * Delete a monitoring entry by id. Any member of the owning project's org may
 * delete (mirrors deleteEffortEntry — the simplest existing per-row pattern).
 */
export async function deleteMonitoringEntry(id: string): Promise<void> {
  const [entry] = await db
    .select({ projectId: monitoringEntries.projectId })
    .from(monitoringEntries)
    .where(eq(monitoringEntries.id, id))
    .limit(1);
  if (!entry) return; // already gone — nothing to delete

  const userId = await requireSessionUserId();
  if (!(await userHasProjectAccess(entry.projectId, userId))) {
    throw new Error('Forbidden: user is not a member of this project’s org');
  }

  await db.delete(monitoringEntries).where(eq(monitoringEntries.id, id));
  revalidateOverview();
}

/** List a project's monitoring entries, newest first. */
export async function listMonitoringEntries(
  projectId: string,
): Promise<MonitoringEntryView[]> {
  const userId = await requireSessionUserId();
  if (!(await userHasProjectAccess(projectId, userId))) {
    throw new Error('Forbidden: user is not a member of this project’s org');
  }

  return db
    .select({
      id: monitoringEntries.id,
      entryDate: monitoringEntries.entryDate,
      category: monitoringEntries.category,
      note: monitoringEntries.note,
      documentId: monitoringEntries.documentId,
      documentTitle: projectDocuments.title,
      documentCitationLabel: projectDocuments.citationLabel,
      createdAt: monitoringEntries.createdAt,
      userName: profiles.fullName,
    })
    .from(monitoringEntries)
    .leftJoin(projectDocuments, eq(projectDocuments.id, monitoringEntries.documentId))
    .leftJoin(profiles, eq(profiles.id, monitoringEntries.createdBy))
    .where(eq(monitoringEntries.projectId, projectId))
    .orderBy(desc(monitoringEntries.entryDate), desc(monitoringEntries.createdAt));
}
