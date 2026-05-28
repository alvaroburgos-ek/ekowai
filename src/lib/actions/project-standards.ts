'use server';
import { db } from '@/lib/db';
import { projectStandards, standards, auditLog } from '@/lib/db/schema';
import { and, asc, eq, sql } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { instantiateWorksheetInstancesForStandard } from '@/lib/db/queries/worksheet';
import { revalidatePath } from 'next/cache';

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

export type Layer = 'management' | 'cost' | 'technical';

/** Codes that the recommended structure assigns to each layer when applied. */
export const RECOMMENDED_LAYERS: Record<Layer, string[]> = {
  management: ['DWA-M-820-1', 'DWA-M-820-2', 'DWA-M-820-3'],
  cost: ['DIN-276'],
  technical: [], // every other standard the engineer adds
};

/** Update layer + stage_order for one (project, standard). */
export async function setProjectStandardLayer(
  projectId: string,
  standardId: string,
  layer: Layer | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Not authenticated' };

  await db
    .update(projectStandards)
    .set({ layer })
    .where(
      and(
        eq(projectStandards.projectId, projectId),
        eq(projectStandards.standardId, standardId),
      ),
    );
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

/** Move a standard up or down within its layer, swapping stage_order with the
 * neighbour. NULL stage_orders are recompacted to 1..N first so moves always
 * have a deterministic neighbour. */
export async function moveProjectStandard(
  projectId: string,
  standardId: string,
  direction: 'up' | 'down',
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Not authenticated' };

  await db.transaction(async (tx) => {
    const [target] = await tx
      .select()
      .from(projectStandards)
      .where(
        and(
          eq(projectStandards.projectId, projectId),
          eq(projectStandards.standardId, standardId),
        ),
      )
      .limit(1);
    if (!target) throw new Error('not_found');

    // All siblings in the same layer (including the target)
    const siblings = await tx
      .select()
      .from(projectStandards)
      .where(
        and(
          eq(projectStandards.projectId, projectId),
          eq(projectStandards.status, 'active'),
          target.layer
            ? eq(projectStandards.layer, target.layer)
            : sql`${projectStandards.layer} IS NULL`,
        ),
      )
      .orderBy(
        sql`${projectStandards.stageOrder} ASC NULLS LAST`,
        asc(projectStandards.addedAt),
      );

    // Recompact stage_order to 1..N (so swaps are always well-defined)
    for (let i = 0; i < siblings.length; i++) {
      if (siblings[i].stageOrder !== i + 1) {
        await tx
          .update(projectStandards)
          .set({ stageOrder: i + 1 })
          .where(eq(projectStandards.id, siblings[i].id));
        siblings[i].stageOrder = i + 1;
      }
    }

    const idx = siblings.findIndex((s) => s.id === target.id);
    const neighbourIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (neighbourIdx < 0 || neighbourIdx >= siblings.length) return; // already at the edge

    const neighbour = siblings[neighbourIdx];
    await tx
      .update(projectStandards)
      .set({ stageOrder: neighbour.stageOrder })
      .where(eq(projectStandards.id, target.id));
    await tx
      .update(projectStandards)
      .set({ stageOrder: target.stageOrder })
      .where(eq(projectStandards.id, neighbour.id));
  });

  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

/** Apply the recommended layer structure to a project:
 *   - Add DWA-M-820-1/-2/-3 (management) and DIN-276 (cost) if missing
 *   - Assign layer to every active standard based on the RECOMMENDED_LAYERS map
 *   - Default layer for anything not in the map = 'technical' */
export async function applyRecommendedStructure(
  projectId: string,
): Promise<{ ok: true; added: number } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Not authenticated' };

  let added = 0;

  // 1. Ensure recommended management + cost standards are on the project
  const recommendedCodes = [
    ...RECOMMENDED_LAYERS.management,
    ...RECOMMENDED_LAYERS.cost,
  ];
  const recStds = await db
    .select({ id: standards.id, code: standards.code })
    .from(standards);
  const byCode = new Map(recStds.map((s) => [s.code, s.id]));

  for (const code of recommendedCodes) {
    const sid = byCode.get(code);
    if (!sid) continue;
    const r = await addStandardToProject(projectId, sid);
    if (r.ok) added += r.instantiated > 0 ? 1 : 0;
  }

  // 2. Update layer for all active project_standards
  const activeRows = await db
    .select({ id: projectStandards.id, standardId: projectStandards.standardId, layer: projectStandards.layer })
    .from(projectStandards)
    .innerJoin(standards, eq(standards.id, projectStandards.standardId))
    .where(
      and(
        eq(projectStandards.projectId, projectId),
        eq(projectStandards.status, 'active'),
      ),
    );

  for (const row of activeRows) {
    const stdCode = recStds.find((s) => s.id === row.standardId)?.code;
    if (!stdCode) continue;
    let nextLayer: Layer = 'technical';
    if (RECOMMENDED_LAYERS.management.includes(stdCode)) nextLayer = 'management';
    else if (RECOMMENDED_LAYERS.cost.includes(stdCode)) nextLayer = 'cost';
    if (row.layer !== nextLayer) {
      await db
        .update(projectStandards)
        .set({ layer: nextLayer })
        .where(eq(projectStandards.id, row.id));
    }
  }

  revalidatePath(`/projects/${projectId}`);
  return { ok: true, added };
}

/** Resolve a standard by code and add it to the project. Used by the
 * compliance-suggestion UI when the engineer accepts a suggested alternative
 * standard (e.g. switching from DWA-A-138-1 to DWA-A-178). */
export async function addStandardByCodeToProject(
  projectId: string,
  standardCode: string,
): Promise<{ ok: true; instantiated: number } | { ok: false; error: string }> {
  const [std] = await db
    .select({ id: standards.id })
    .from(standards)
    .where(eq(standards.code, standardCode))
    .limit(1);
  if (!std) return { ok: false, error: 'standard_not_found' };
  return addStandardToProject(projectId, std.id);
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
