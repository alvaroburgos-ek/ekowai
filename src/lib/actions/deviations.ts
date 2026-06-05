'use server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { complianceDeviations, complianceRequirements, projects, orgMembers, worksheetInstances, worksheetTemplates, auditLog } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { revalidateTag } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const CitationSchema = z.object({ id: z.string(), docId: z.string(), page: z.number().nullable().optional(), note: z.string().nullable().optional() });
export const DeviationInputSchema = z.object({
  projectId: z.string().uuid(),
  requirementId: z.string().uuid(),
  justification: z.string().trim().min(10).max(2000),
  basisCitations: z.array(CitationSchema).min(1),
  authorityRef: z.string().trim().max(500).optional(),
});
export type DeviationInput = z.infer<typeof DeviationInputSchema>;
type Result = { ok: true; id: string } | { ok: false; error: string };

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('unauthorized');
  return user;
}

async function authorize(userId: string, projectId: string, requirementId: string): Promise<string | null> {
  const [proj] = await db.select({ orgId: projects.orgId }).from(projects)
    .innerJoin(orgMembers, eq(orgMembers.orgId, projects.orgId))
    .where(and(eq(projects.id, projectId), eq(orgMembers.userId, userId))).limit(1);
  if (!proj) return null;
  const [req] = await db.select({ id: complianceRequirements.id }).from(complianceRequirements)
    .innerJoin(worksheetTemplates, eq(worksheetTemplates.id, complianceRequirements.worksheetTemplateId))
    .innerJoin(worksheetInstances, eq(worksheetInstances.worksheetTemplateId, worksheetTemplates.id))
    .where(and(eq(complianceRequirements.id, requirementId), eq(worksheetInstances.projectId, projectId))).limit(1);
  if (!req) return null;
  return proj.orgId;
}

export async function setDeviation(input: DeviationInput): Promise<Result> {
  let user; try { user = await requireUser(); } catch { return { ok: false, error: 'unauthorized' }; }
  const parsed = DeviationInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'invalid_input' };
  const { projectId, requirementId, justification, basisCitations, authorityRef } = parsed.data;
  const orgId = await authorize(user.id, projectId, requirementId);
  if (!orgId) return { ok: false, error: 'not_found' };
  // Manual set-or-insert: the partial unique index (project_id, requirement_id) WHERE status='active'
  // cannot be targeted by Drizzle's onConflictDoUpdate because the status column is not part of
  // the Drizzle-schema unique() declaration, only a raw DB partial index. We select first, then
  // update-or-insert to keep behaviour identical to an upsert.
  const [existing] = await db.select({ id: complianceDeviations.id })
    .from(complianceDeviations)
    .where(and(
      eq(complianceDeviations.projectId, projectId),
      eq(complianceDeviations.requirementId, requirementId),
      eq(complianceDeviations.status, 'active'),
    ))
    .limit(1);
  let rowId: string;
  if (existing) {
    const [updated] = await db.update(complianceDeviations)
      .set({ justification, basisCitations, authorityRef: authorityRef ?? null, updatedBy: user.id, updatedAt: new Date() })
      .where(eq(complianceDeviations.id, existing.id))
      .returning({ id: complianceDeviations.id });
    rowId = updated.id;
  } else {
    const [inserted] = await db.insert(complianceDeviations)
      .values({ projectId, requirementId, justification, basisCitations, authorityRef: authorityRef ?? null, createdBy: user.id })
      .returning({ id: complianceDeviations.id });
    rowId = inserted.id;
  }
  await db.insert(auditLog).values({ actorId: user.id, actorRole: 'engineer', projectId, orgId, tableName: 'compliance_deviations', recordId: rowId, action: 'deviation_set', changes: { requirementId, justification, basisCitations, authorityRef: authorityRef ?? null } });
  revalidateTag('project-sidebar', 'max');
  return { ok: true, id: rowId };
}

export async function withdrawDeviation(input: { projectId: string; requirementId: string }): Promise<Result> {
  let user; try { user = await requireUser(); } catch { return { ok: false, error: 'unauthorized' }; }
  const orgId = await authorize(user.id, input.projectId, input.requirementId);
  if (!orgId) return { ok: false, error: 'not_found' };
  const [row] = await db.update(complianceDeviations)
    .set({ status: 'withdrawn', withdrawnBy: user.id, withdrawnAt: new Date() })
    .where(and(eq(complianceDeviations.projectId, input.projectId), eq(complianceDeviations.requirementId, input.requirementId), eq(complianceDeviations.status, 'active')))
    .returning({ id: complianceDeviations.id });
  if (!row) return { ok: false, error: 'no_active_deviation' };
  await db.insert(auditLog).values({ actorId: user.id, actorRole: 'engineer', projectId: input.projectId, orgId, tableName: 'compliance_deviations', recordId: row.id, action: 'deviation_withdraw', changes: { requirementId: input.requirementId } });
  revalidateTag('project-sidebar', 'max');
  return { ok: true, id: row.id };
}
