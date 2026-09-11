'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { rateRoles, orgMembers } from '@/lib/db/schema';
import { and, asc, eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import {
  addRateRoleSchema,
  updateRateRoleSchema,
  deactivateRateRoleSchema,
  toNum,
} from '@/lib/offers/margin';

/**
 * Role-based rates (rate_roles) server actions — the cost layer's paid roles
 * (Ingenieur, Freelancer, Praktikant, Coach, …), each with an hourly rate.
 * Auth idiom mirrors offers.ts: `db` runs as postgres and bypasses RLS, so
 * the org_members lookups here ARE the access checks. Writes are gated to
 * org owner/admin (mirrors setOrgRates); reads are org-member.
 */

export type RateRoleView = {
  id: string;
  name: string;
  hourlyRateEur: number;
  active: boolean;
};

export type RateRoleResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

/** Resolve the session user id or throw (mirrors effort.ts). */
async function requireSessionUserId(): Promise<string> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Not authenticated');
  return auth.user.id;
}

function revalidateOverview() {
  // Roles surface in the offer panel + effort log on the project overview.
  revalidatePath('/[locale]/projects/[id]', 'page');
}

/** The session user's role in the org, or null when not a member. */
async function orgRoleOf(userId: string, orgId: string): Promise<string | null> {
  const [member] = await db
    .select({ role: orgMembers.role })
    .from(orgMembers)
    .where(and(eq(orgMembers.userId, userId), eq(orgMembers.orgId, orgId)))
    .limit(1);
  return member?.role ?? null;
}

/** Owner/admin write gate (mirrors how setOrgRates gates). */
async function canManageRates(userId: string, orgId: string): Promise<boolean> {
  const role = await orgRoleOf(userId, orgId);
  return role === 'owner' || role === 'admin';
}

export async function addRateRole(input: {
  orgId: string;
  name: string;
  hourlyRateEur: number;
}): Promise<RateRoleResult> {
  const parsed = addRateRoleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'invalid_input' };
  const userId = await requireSessionUserId();
  if (!(await canManageRates(userId, parsed.data.orgId))) {
    return { ok: false, error: 'forbidden' };
  }

  // Friendly duplicate answer; the unique(org_id, name) constraint backstops
  // the race.
  const [existing] = await db
    .select({ id: rateRoles.id })
    .from(rateRoles)
    .where(
      and(eq(rateRoles.orgId, parsed.data.orgId), eq(rateRoles.name, parsed.data.name)),
    )
    .limit(1);
  if (existing) return { ok: false, error: 'duplicate_name' };

  const [row] = await db
    .insert(rateRoles)
    .values({
      orgId: parsed.data.orgId,
      name: parsed.data.name,
      hourlyRateEur: String(parsed.data.hourlyRateEur),
    })
    .returning({ id: rateRoles.id });

  revalidateOverview();
  return { ok: true, id: row.id };
}

export async function updateRateRole(input: {
  roleId: string;
  name?: string;
  hourlyRateEur?: number;
}): Promise<RateRoleResult> {
  const parsed = updateRateRoleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'invalid_input' };
  const { roleId, name, hourlyRateEur } = parsed.data;

  const [role] = await db
    .select({ orgId: rateRoles.orgId })
    .from(rateRoles)
    .where(eq(rateRoles.id, roleId))
    .limit(1);
  if (!role) return { ok: false, error: 'not_found' };

  const userId = await requireSessionUserId();
  if (!(await canManageRates(userId, role.orgId))) {
    return { ok: false, error: 'forbidden' };
  }

  const patch: Record<string, unknown> = {};
  if (name !== undefined) patch.name = name;
  if (hourlyRateEur !== undefined) patch.hourlyRateEur = String(hourlyRateEur);

  await db.update(rateRoles).set(patch).where(eq(rateRoles.id, roleId));
  revalidateOverview();
  return { ok: true, id: roleId };
}

/**
 * Deactivate a role (active=false). Old effort entries / offer positions keep
 * their link and resolved rate; the role just leaves the pickers.
 */
export async function deactivateRateRole(input: {
  roleId: string;
}): Promise<RateRoleResult> {
  const parsed = deactivateRateRoleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'invalid_input' };

  const [role] = await db
    .select({ orgId: rateRoles.orgId })
    .from(rateRoles)
    .where(eq(rateRoles.id, parsed.data.roleId))
    .limit(1);
  if (!role) return { ok: false, error: 'not_found' };

  const userId = await requireSessionUserId();
  if (!(await canManageRates(userId, role.orgId))) {
    return { ok: false, error: 'forbidden' };
  }

  await db
    .update(rateRoles)
    .set({ active: false })
    .where(eq(rateRoles.id, parsed.data.roleId));
  revalidateOverview();
  return { ok: true, id: parsed.data.roleId };
}

/**
 * List an org's roles (org-member read). Includes deactivated ones with the
 * `active` flag so callers can filter for pickers vs. history display.
 */
export async function listRateRoles(orgId: string): Promise<RateRoleView[]> {
  const userId = await requireSessionUserId();
  if ((await orgRoleOf(userId, orgId)) === null) {
    throw new Error('Forbidden: user is not a member of this org');
  }

  const rows = await db
    .select({
      id: rateRoles.id,
      name: rateRoles.name,
      hourlyRateEur: rateRoles.hourlyRateEur,
      active: rateRoles.active,
    })
    .from(rateRoles)
    .where(eq(rateRoles.orgId, orgId))
    .orderBy(asc(rateRoles.name));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    hourlyRateEur: toNum(r.hourlyRateEur) ?? 0,
    active: r.active,
  }));
}
