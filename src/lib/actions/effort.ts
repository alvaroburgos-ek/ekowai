'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { effortEntries, profiles, projects, rateRoles } from '@/lib/db/schema';
import { and, asc, desc, eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { userHasProjectAccess } from '@/lib/db/queries/worksheet';
import { parseAddEffortEntry, computeTotalHours } from './effort-core';

export type EffortEntryView = {
  id: string;
  workDate: string;
  /** numeric column — Drizzle returns it as a string */
  hours: string;
  position: string;
  /** Optional paid role (rate_roles) the entry was worked at. */
  roleId: string | null;
  roleName: string | null;
  note: string | null;
  createdAt: Date;
  userName: string | null;
};

/** Active role for the add-row's "Rolle (optional)" select. */
export type EffortRoleOption = {
  id: string;
  name: string;
};

export type ListEffortEntriesResult = {
  entries: EffortEntryView[];
  totalHours: number;
  /** Active paid roles of the project's org, name-sorted. */
  roles: EffortRoleOption[];
};

/** Resolve the session user id or throw (mirrors addCo2Line). */
async function requireSessionUserId(): Promise<string> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Not authenticated');
  return auth.user.id;
}

function revalidateOverview() {
  // Effort log renders on the project overview page.
  revalidatePath('/[locale]/projects/[id]', 'page');
}

/**
 * Add an effort entry for a project.
 * Validation (hours > 0 and <= 24, zod shapes) lives in `effort-core.ts`.
 * `db` runs as postgres and bypasses RLS, so the org-membership join inside
 * `userHasProjectAccess` IS the access check (mirrors addCo2Line).
 */
export async function addEffortEntry(input: {
  projectId: string;
  workDate: string;
  hours: number;
  position: string;
  roleId?: string;
  note?: string;
}): Promise<{ id: string }> {
  const parsed = parseAddEffortEntry(input);
  const userId = await requireSessionUserId();

  if (!(await userHasProjectAccess(parsed.projectId, userId))) {
    throw new Error('Forbidden: user is not a member of this project’s org');
  }

  // A referenced role must be an ACTIVE role of the project's own org —
  // cross-org role ids (guessed or stale) are rejected (mirrors offers.ts).
  if (parsed.roleId !== undefined) {
    const [proj] = await db
      .select({ orgId: projects.orgId })
      .from(projects)
      .where(eq(projects.id, parsed.projectId))
      .limit(1);
    const [role] = await db
      .select({ orgId: rateRoles.orgId, active: rateRoles.active })
      .from(rateRoles)
      .where(eq(rateRoles.id, parsed.roleId))
      .limit(1);
    if (!proj || !role || role.orgId !== proj.orgId || !role.active) {
      throw new Error('Ungültige Rolle für diese Organisation');
    }
  }

  const [row] = await db
    .insert(effortEntries)
    .values({
      projectId: parsed.projectId,
      userId,
      workDate: parsed.workDate,
      hours: String(parsed.hours),
      position: parsed.position,
      roleId: parsed.roleId ?? null,
      note: parsed.note && parsed.note !== '' ? parsed.note : null,
    })
    .returning({ id: effortEntries.id });

  revalidateOverview();
  return { id: row.id };
}

/**
 * Delete an effort entry by id. Any member of the owning project's org may
 * delete (mirrors deleteCo2Line — the simplest existing per-row pattern).
 */
export async function deleteEffortEntry(id: string): Promise<void> {
  const [entry] = await db
    .select({ projectId: effortEntries.projectId })
    .from(effortEntries)
    .where(eq(effortEntries.id, id))
    .limit(1);
  if (!entry) return; // already gone — nothing to delete

  const userId = await requireSessionUserId();
  if (!(await userHasProjectAccess(entry.projectId, userId))) {
    throw new Error('Forbidden: user is not a member of this project’s org');
  }

  await db.delete(effortEntries).where(eq(effortEntries.id, id));
  revalidateOverview();
}

/**
 * List a project's effort entries (newest first) plus the total hours and the
 * org's active paid roles (for the add-row's "Rolle (optional)" select).
 */
export async function listEffortEntries(
  projectId: string,
): Promise<ListEffortEntriesResult> {
  const userId = await requireSessionUserId();
  if (!(await userHasProjectAccess(projectId, userId))) {
    throw new Error('Forbidden: user is not a member of this project’s org');
  }

  const rows = await db
    .select({
      id: effortEntries.id,
      workDate: effortEntries.workDate,
      hours: effortEntries.hours,
      position: effortEntries.position,
      roleId: effortEntries.roleId,
      roleName: rateRoles.name,
      note: effortEntries.note,
      createdAt: effortEntries.createdAt,
      userName: profiles.fullName,
    })
    .from(effortEntries)
    .leftJoin(profiles, eq(profiles.id, effortEntries.userId))
    .leftJoin(rateRoles, eq(rateRoles.id, effortEntries.roleId))
    .where(eq(effortEntries.projectId, projectId))
    .orderBy(desc(effortEntries.workDate), desc(effortEntries.createdAt));

  const [proj] = await db
    .select({ orgId: projects.orgId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  const roles: EffortRoleOption[] = proj
    ? await db
      .select({ id: rateRoles.id, name: rateRoles.name })
      .from(rateRoles)
      .where(and(eq(rateRoles.orgId, proj.orgId), eq(rateRoles.active, true)))
      .orderBy(asc(rateRoles.name))
    : [];

  return { entries: rows, totalHours: computeTotalHours(rows), roles };
}
