'use server';
import { db } from '@/lib/db';
import { projectStandards, auditLog } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { instantiateWorksheetInstancesForStandard } from '@/lib/db/queries/worksheet';

export async function addStandardToProject(
  projectId: string,
  standardId: string,
): Promise<{ ok: true; instantiated: number } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Not authenticated' };
  const userId = auth.user.id;

  // INSERT … ON CONFLICT DO UPDATE for re-activation of a previously-removed standard
  const [row] = await db
    .insert(projectStandards)
    .values({
      projectId,
      standardId,
      status: 'active',
      addedBy: userId,
    })
    .onConflictDoUpdate({
      target: [projectStandards.projectId, projectStandards.standardId],
      set: {
        status: 'active',
        addedAt: new Date(),
        addedBy: userId,
        removedAt: null,
        removedBy: null,
        removalReason: null,
      },
    })
    .returning();

  // Eagerly create worksheet_instances for each template of this standard
  const instantiated = await instantiateWorksheetInstancesForStandard(projectId, standardId);

  await db.insert(auditLog).values({
    actorId: userId,
    actorRole: 'engineer',
    projectId,
    tableName: 'project_standards',
    recordId: row.id,
    action: 'insert',
    changes: { standardId, instantiated },
  });

  return { ok: true, instantiated };
}

export async function removeStandardFromProject(
  projectId: string,
  standardId: string,
  reason: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Not authenticated' };
  const userId = auth.user.id;

  const trimmed = reason.trim();
  if (!trimmed) return { ok: false, error: 'Removal reason required' };

  const [row] = await db
    .update(projectStandards)
    .set({
      status: 'removed',
      removedAt: new Date(),
      removedBy: userId,
      removalReason: trimmed,
    })
    .where(
      and(
        eq(projectStandards.projectId, projectId),
        eq(projectStandards.standardId, standardId),
      ),
    )
    .returning();

  if (!row) return { ok: false, error: 'Standard not found on project' };

  await db.insert(auditLog).values({
    actorId: userId,
    actorRole: 'engineer',
    projectId,
    tableName: 'project_standards',
    recordId: row.id,
    action: 'update',
    changes: { status: 'removed', reason: trimmed },
  });

  return { ok: true };
}
