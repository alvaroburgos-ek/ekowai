'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { co2ActivityLines } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { userHasProjectAccess } from '@/lib/db/queries/worksheet';
import { recomputeB3Co2 } from './co2';
import type { Co2Totals } from './co2';

export type { Co2Totals };

const VALID_SCOPES = ['Scope 1', 'Scope 2'] as const;
type Scope = (typeof VALID_SCOPES)[number];

export interface AddCo2LineInput {
  projectId: string;
  worksheetInstanceId: string;
  scope: Scope;
  category: string;
  subcategory: string | null;
  amount: number;
  unit: string;
  factorUbaId: string;
  factorSourceVersion: string;
  /** Optional override — when called from tests/fixtures that bypass auth */
  createdBy?: string;
}

/** Insert a new CO₂ activity line and revalidate the emissions page. */
export async function addCo2Line(
  input: AddCo2LineInput,
): Promise<{ id: string }> {
  if (!VALID_SCOPES.includes(input.scope)) {
    throw new Error(
      `Invalid scope "${input.scope}". Must be one of: ${VALID_SCOPES.join(', ')}`,
    );
  }

  // Resolve the actor; fall back to the caller-supplied createdBy for fixtures.
  let actorId = input.createdBy ?? null;
  if (!actorId) {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error('Not authenticated');
    actorId = auth.user.id;
  }

  // Org-membership guard: the actor must belong to the org that owns this
  // project before we let them write a line into it. `db` runs as postgres and
  // bypasses RLS, so this join IS the access check (mirrors saveWorksheet).
  if (!(await userHasProjectAccess(input.projectId, actorId))) {
    throw new Error('Forbidden: user is not a member of this project’s org');
  }

  const [row] = await db
    .insert(co2ActivityLines)
    .values({
      projectId: input.projectId,
      worksheetInstanceId: input.worksheetInstanceId,
      scope: input.scope,
      category: input.category,
      subcategory: input.subcategory ?? undefined,
      amount: String(input.amount),
      unit: input.unit,
      factorUbaId: input.factorUbaId,
      factorSourceVersion: input.factorSourceVersion,
      createdBy: actorId,
    })
    .returning({ id: co2ActivityLines.id });

  revalidatePath('/[locale]/projects/[id]/vsme/emissions', 'page');

  return { id: row.id };
}

/**
 * Delete a CO₂ activity line by id.
 *
 * @param id        - the line to delete
 * @param actorId   - optional override for fixtures/tests that bypass session
 *                    auth; production callers omit it (actor comes from session)
 */
export async function deleteCo2Line(id: string, actorId?: string): Promise<void> {
  // Find the line's project so we can scope the org-membership check to it.
  const [line] = await db
    .select({ projectId: co2ActivityLines.projectId })
    .from(co2ActivityLines)
    .where(eq(co2ActivityLines.id, id))
    .limit(1);
  if (!line) return; // already gone — nothing to delete

  // Resolve the actor; fall back to the caller-supplied actorId for fixtures.
  let resolvedActor = actorId ?? null;
  if (!resolvedActor) {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error('Not authenticated');
    resolvedActor = auth.user.id;
  }

  // Org-membership guard before delete — must not let a user delete another
  // org's line.
  if (!(await userHasProjectAccess(line.projectId, resolvedActor))) {
    throw new Error('Forbidden: user is not a member of this project’s org');
  }

  await db.delete(co2ActivityLines).where(eq(co2ActivityLines.id, id));
  revalidatePath('/[locale]/projects/[id]/vsme/emissions', 'page');
}

/**
 * Recompute Scope 1 & 2 totals for a project.
 * Wraps `recomputeB3Co2` and always sources the userId from the current session.
 */
export async function recompute(
  projectId: string,
  worksheetInstanceId: string,
): Promise<Co2Totals> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Not authenticated');
  const actorId = auth.user.id;

  const totals = await recomputeB3Co2(projectId, worksheetInstanceId, actorId);
  revalidatePath('/[locale]/projects/[id]/vsme/emissions', 'page');
  return totals;
}
