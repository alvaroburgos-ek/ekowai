'use server';

import { db } from '@/lib/db';
import { leads, orgMembers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  currentUserIsPlatformEngineer,
  requirePlatformEngineer,
} from '@/lib/auth/platform-engineer';
import { createProjectForOrg } from '@/lib/projects/create-project';
import { addStandardByCodeToProject } from '@/lib/actions/project-standards';
import type { User } from '@supabase/supabase-js';

type ActionResult<T = unknown> = ({ ok: true } & T) | { ok: false; error: string };

/** Resolve the acting platform engineer, or null if not authorized. Mirrors the
 * verification.ts admin convention but returns instead of throwing, so the
 * /leads UI can show an inline error rather than a crash. */
async function actingEngineer(): Promise<User | null> {
  if (!(await currentUserIsPlatformEngineer())) return null;
  return requirePlatformEngineer();
}

function revalidateLeads() {
  revalidatePath('/[locale]/leads', 'page');
}

/** Assign a lead to the current engineer. */
export async function claimLead(leadId: string): Promise<ActionResult> {
  const user = await actingEngineer();
  if (!user) return { ok: false, error: 'not_authorized' };

  await db
    .update(leads)
    .set({ claimedByUserId: user.id, claimedAt: new Date() })
    .where(eq(leads.id, leadId));
  revalidateLeads();
  return { ok: true };
}

/** Release a lead's owner. */
export async function unclaimLead(leadId: string): Promise<ActionResult> {
  const user = await actingEngineer();
  if (!user) return { ok: false, error: 'not_authorized' };

  await db
    .update(leads)
    .set({ claimedByUserId: null, claimedAt: null })
    .where(eq(leads.id, leadId));
  revalidateLeads();
  return { ok: true };
}

/** Move a `new` lead to `contacted`. No-op on other statuses. */
export async function markLeadContacted(leadId: string): Promise<ActionResult> {
  const user = await actingEngineer();
  if (!user) return { ok: false, error: 'not_authorized' };

  await db
    .update(leads)
    .set({ status: 'contacted' })
    .where(eq(leads.id, leadId));
  revalidateLeads();
  return { ok: true };
}

/** Archive (dismiss) a lead. */
export async function archiveLead(leadId: string): Promise<ActionResult> {
  const user = await actingEngineer();
  if (!user) return { ok: false, error: 'not_authorized' };

  await db
    .update(leads)
    .set({ status: 'archived', archivedAt: new Date() })
    .where(eq(leads.id, leadId));
  revalidateLeads();
  return { ok: true };
}

/** Reopen an archived lead back to `new`. */
export async function reopenLead(leadId: string): Promise<ActionResult> {
  const user = await actingEngineer();
  if (!user) return { ok: false, error: 'not_authorized' };

  await db
    .update(leads)
    .set({ status: 'new', archivedAt: null })
    .where(eq(leads.id, leadId));
  revalidateLeads();
  return { ok: true };
}

const convertSchema = z.object({
  name: z.string().trim().min(2).max(200),
  clientName: z.string().trim().max(200).optional(),
  location: z.string().trim().max(200).optional(),
  locale: z.enum(['de', 'en']),
});

export type ConvertLeadInput = z.input<typeof convertSchema>;

/** Create a project from a lead, attach the lead's standard (if any) and mark
 * the lead converted. Transactional in spirit: the project insert + lead update
 * are the durable mutations; standard attachment is best-effort (a stale
 * standard_code from a landing deep-link must not block conversion).
 *
 * `standardAttached`:
 *   'attached'  — lead.standardCode resolved and the standard was added
 *   'not_found' — lead carried a standardCode that no longer exists in the library
 *   'none'      — lead had no standardCode
 */
export async function convertLeadToProject(
  leadId: string,
  input: ConvertLeadInput,
): Promise<
  ActionResult<{ projectId: string; standardAttached: 'attached' | 'not_found' | 'none' }>
> {
  const user = await actingEngineer();
  if (!user) return { ok: false, error: 'not_authorized' };

  const parsed = convertSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'invalid_input' };

  // The acting engineer's org owns the new project (MVP: first membership).
  const [membership] = await db
    .select({ orgId: orgMembers.orgId })
    .from(orgMembers)
    .where(eq(orgMembers.userId, user.id))
    .limit(1);
  if (!membership) return { ok: false, error: 'no_org' };

  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  if (!lead) return { ok: false, error: 'lead_not_found' };
  if (lead.convertedToProjectId) return { ok: false, error: 'already_converted' };

  // Seed a light site profile from the contact details (projects has no
  // contact columns; client_contact is a known site-profile key).
  const contactBits = [lead.email, lead.phone].filter(Boolean).join(' · ');
  const siteProfile: Record<string, unknown> = {};
  if (lead.name) siteProfile.client_contact = lead.name;
  if (contactBits) siteProfile.client_contact_details = contactBits;

  const { id: projectId } = await createProjectForOrg({
    orgId: membership.orgId,
    createdBy: user.id,
    name: parsed.data.name,
    clientName: parsed.data.clientName ?? lead.company ?? undefined,
    location: parsed.data.location,
    siteProfile,
  });

  let standardAttached: 'attached' | 'not_found' | 'none' = 'none';
  if (lead.standardCode) {
    const r = await addStandardByCodeToProject(projectId, lead.standardCode);
    standardAttached = r.ok ? 'attached' : 'not_found';
  }

  await db
    .update(leads)
    .set({
      status: 'converted',
      claimedByUserId: lead.claimedByUserId ?? user.id,
      claimedAt: lead.claimedAt ?? new Date(),
      convertedToProjectId: projectId,
    })
    .where(eq(leads.id, leadId));

  revalidatePath(`/${parsed.data.locale}/projects`);
  revalidateLeads();
  return { ok: true, projectId, standardAttached };
}
